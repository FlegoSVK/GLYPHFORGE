import { useState, useCallback, useRef, useEffect } from 'react';
import * as opentype from 'opentype.js';
import paper from 'paper';
import { v4 as uuidv4 } from 'uuid';
import { SINGLE_CHARS, CHAR_RECIPES, DiacriticType } from '../constants';
import { db, SavedCharData, Project, LibraryDiacritic } from '../lib/db';
import { captureFontSample, analyzeFontStyle } from '../lib/aiStyleMatch';
import { SVG_DIACRITICS, getDiacriticType, FontStyle } from '../lib/svgDiacritics';

export type CharStatus = 'ok' | 'missing' | 'generated' | 'edited';

export interface CharInfo {
  char: string;
  status: CharStatus;
  glyph?: opentype.Glyph;
  baseGlyph?: opentype.Glyph;
  diacriticGlyph?: opentype.Glyph;
  diacriticSource?: 'standalone' | 'stolen' | 'svg' | 'original' | 'glyph';
  diacriticTransform?: { 
    x: number; 
    y: number; 
    scaleX: number; 
    scaleY: number;
    rotation: number;
    skewX: number;
    skewY: number;
    flipX?: boolean;
    flipY?: boolean;
  };
  baseTransform?: { 
    x: number; 
    y: number; 
    scaleX: number; 
    scaleY: number;
    rotation: number;
    skewX: number;
    skewY: number;
    flipX?: boolean;
    flipY?: boolean;
  };
  advanceWidth?: number;
  svgDiacritic?: { path: string; style: string };
  eraserPaths?: { path: string; size: number }[];
  layerVisibility?: { base: boolean; diacritic: boolean };
  layerOpacity?: { base: number; diacritic: number };
  anomalies?: string[];
  metrics?: {
    lsb: number;
    rsb: number;
    hotspots: { x: number; y: number; intensity: number }[];
    xHeight?: number;
    capHeight?: number;
    isLowercase?: boolean;
  };
  anomalyHighlights?: {
    islands?: string[];
    intersections?: string[];
  };
  isScaledToLowercase?: boolean;
}

function svgPathToCommands(svgPath: string): any[] {
  const commands: any[] = [];
  // Very basic parser for M, L, Q, C, Z
  const tokens = svgPath.match(/[a-df-z]|[-+]?\d*\.?\d+/gi) || [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (!token) break;
    const type = token.toUpperCase();
    if (type === 'M') {
      commands.push({ type: 'M', x: parseFloat(tokens[i+1]), y: parseFloat(tokens[i+2]) });
      i += 3;
    } else if (type === 'L') {
      commands.push({ type: 'L', x: parseFloat(tokens[i+1]), y: parseFloat(tokens[i+2]) });
      i += 3;
    } else if (type === 'Q') {
      commands.push({ type: 'Q', x1: parseFloat(tokens[i+1]), y1: parseFloat(tokens[i+2]), x: parseFloat(tokens[i+3]), y: parseFloat(tokens[i+4]) });
      i += 5;
    } else if (type === 'C') {
      commands.push({ type: 'C', x1: parseFloat(tokens[i+1]), y1: parseFloat(tokens[i+2]), x2: parseFloat(tokens[i+3]), y2: parseFloat(tokens[i+4]), x: parseFloat(tokens[i+5]), y: parseFloat(tokens[i+6]) });
      i += 7;
    } else if (type === 'Z') {
      commands.push({ type: 'Z' });
      i += 1;
    } else {
      i++;
    }
  }
  return commands;
}

function roughenCommands(commands: opentype.PathCommand[], unitsPerEm: number): opentype.PathCommand[] {
  const amount = unitsPerEm * 0.015; // 1.5% of em size
  const noise = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  };
  
  return commands.map(cmd => {
    const newCmd = { ...cmd };
    const displace = (px: number, py: number) => {
      const nx = (noise(px, py) - 0.5) * amount * 2;
      const ny = (noise(px + 100, py + 100) - 0.5) * amount * 2;
      return { x: px + nx, y: py + ny };
    };

    if ('x' in newCmd && 'y' in newCmd) {
      const pt = displace(newCmd.x!, newCmd.y!);
      newCmd.x = pt.x; newCmd.y = pt.y;
    }
    if ('x1' in newCmd && 'y1' in newCmd) {
      const pt = displace(newCmd.x1!, newCmd.y1!);
      newCmd.x1 = pt.x; newCmd.y1 = pt.y;
    }
    if ('x2' in newCmd && 'y2' in newCmd) {
      const pt = displace(newCmd.x2!, newCmd.y2!);
      newCmd.x2 = pt.x; newCmd.y2 = pt.y;
    }
    return newCmd;
  });
}

function expandStroke(pathString: string, radius: number): paper.PathItem {
  const path = new paper.Path(pathString);
  let result: paper.PathItem | null = null;
  
  if (path.segments.length === 0) {
    path.remove();
    return new paper.Path();
  }
  
  path.flatten(radius / 4);
  
  for (let i = 0; i < path.segments.length - 1; i++) {
    const p1 = path.segments[i].point;
    const p2 = path.segments[i+1].point;
    
    const dir = p2.subtract(p1);
    if (dir.length === 0) continue;
    
    const normal = dir.normalize(radius).rotate(90, new paper.Point(0, 0));
    
    const rect = new paper.Path();
    rect.add(p1.add(normal));
    rect.add(p2.add(normal));
    rect.add(p2.subtract(normal));
    rect.add(p1.subtract(normal));
    rect.closed = true;
    
    const circle1 = new paper.Path.Circle(p1, radius);
    const circle2 = new paper.Path.Circle(p2, radius);
    
    let segmentShape = rect.unite(circle1).unite(circle2);
    
    if (!result) {
      result = segmentShape;
    } else {
      const newResult = result.unite(segmentShape);
      result.remove();
      result = newResult;
    }
    rect.remove();
    circle1.remove();
    circle2.remove();
    segmentShape.remove();
  }
  
  if (!result && path.segments.length > 0) {
    result = new paper.Path.Circle(path.segments[0].point, radius);
  }
  
  path.remove();
  return result || new paper.Path();
}

function paperToOpentypeCommands(item: paper.PathItem): opentype.PathCommand[] {
  const commands: opentype.PathCommand[] = [];
  
  const paths = item instanceof paper.CompoundPath ? item.children as paper.Path[] : [item as paper.Path];
  
  for (const path of paths) {
    if (!path.segments || path.segments.length === 0) continue;
    
    const first = path.segments[0];
    commands.push({ type: 'M', x: first.point.x, y: first.point.y });
    
    for (let i = 1; i < path.segments.length; i++) {
      const prev = path.segments[i - 1];
      const curr = path.segments[i];
      
      if (prev.handleOut.isZero() && curr.handleIn.isZero()) {
        commands.push({ type: 'L', x: curr.point.x, y: curr.point.y });
      } else {
        commands.push({
          type: 'C',
          x1: prev.point.x + prev.handleOut.x,
          y1: prev.point.y + prev.handleOut.y,
          x2: curr.point.x + curr.handleIn.x,
          y2: curr.point.y + curr.handleIn.y,
          x: curr.point.x,
          y: curr.point.y
        });
      }
    }
    
    if (path.closed) {
      const prev = path.segments[path.segments.length - 1];
      const curr = path.segments[0];
      if (!prev.handleOut.isZero() || !curr.handleIn.isZero()) {
        commands.push({
          type: 'C',
          x1: prev.point.x + prev.handleOut.x,
          y1: prev.point.y + prev.handleOut.y,
          x2: curr.point.x + curr.handleIn.x,
          y2: curr.point.y + curr.handleIn.y,
          x: curr.point.x,
          y: curr.point.y
        });
      }
      commands.push({ type: 'Z' });
    }
  }
  
  return commands;
}

function stripDotFromGlyph(glyph: opentype.Glyph, font: opentype.Font): opentype.Glyph {
  const commands = [...glyph.path.commands];
  const contours: opentype.PathCommand[][] = [];
  let currentContour: opentype.PathCommand[] = [];
  for (const cmd of commands) {
    currentContour.push(cmd);
    if (cmd.type === 'Z') {
      contours.push(currentContour);
      currentContour = [];
    }
  }
  if (currentContour.length > 0) contours.push(currentContour);

  if (contours.length > 1) {
    // Find the highest contour (the dot). In Y-UP, higher Y is larger.
    let highestY = -Infinity;
    let dotIndex = -1;
    contours.forEach((contour, idx) => {
      const p = new opentype.Path();
      p.commands = contour;
      const box = p.getBoundingBox();
      if (box.y2 > highestY) {
        highestY = box.y2;
        dotIndex = idx;
      }
    });
    if (dotIndex !== -1) {
      const cleanPath = new opentype.Path();
      (cleanPath as any).unitsPerEm = font.unitsPerEm; // Fix scaling in preview
      cleanPath.commands = contours.filter((_, idx) => idx !== dotIndex).flat();
      return new opentype.Glyph({
        name: glyph.name + '_dotless',
        path: cleanPath,
        advanceWidth: glyph.advanceWidth,
        unicode: glyph.unicode
      });
    }
  }
  return glyph;
}

function convertPathToQuadratic(path: opentype.Path): opentype.Path {
  const newPath = new opentype.Path();
  let currentX = 0;
  let currentY = 0;
  
  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      newPath.moveTo(cmd.x, cmd.y);
      currentX = cmd.x;
      currentY = cmd.y;
    } else if (cmd.type === 'L') {
      newPath.lineTo(cmd.x, cmd.y);
      currentX = cmd.x;
      currentY = cmd.y;
    } else if (cmd.type === 'C') {
      // Approximate Cubic to Quadratic bezier
      const cx = -0.25 * currentX + 0.75 * cmd.x1 + 0.75 * cmd.x2 - 0.25 * cmd.x;
      const cy = -0.25 * currentY + 0.75 * cmd.y1 + 0.75 * cmd.y2 - 0.25 * cmd.y;
      newPath.quadraticCurveTo(cx, cy, cmd.x, cmd.y);
      currentX = cmd.x;
      currentY = cmd.y;
    } else if (cmd.type === 'Q') {
      newPath.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
      currentX = cmd.x;
      currentY = cmd.y;
    } else if (cmd.type === 'Z') {
      newPath.close();
    }
  }
  return newPath;
}

function mergeGlyphs(font: opentype.Font, info: CharInfo, applyStylisticAdaptation: boolean = false, globalShiftX: number = 0): opentype.Glyph | null {
  if (!info.baseGlyph) return null;
  
  // baseGlyph is already stripped of dot if it was 'i' or 'j' during initialization
  let baseCommands = [...info.baseGlyph.path.commands];
  let mergedCommands = baseCommands;
  
  // Apply eraser if any
  if (info.eraserPaths && info.eraserPaths.length > 0) {
    if (typeof window !== 'undefined' && !paper.project) {
      const canvas = document.createElement('canvas');
      paper.setup(canvas);
    } else if (!paper.project) {
      paper.setup(new paper.Size(1000, 1000));
    }
    
    const basePathData = info.baseGlyph.path.toPathData(2);
    let baseItem: paper.PathItem = new paper.CompoundPath(basePathData);
    
    for (const stroke of info.eraserPaths) {
      const eraserItem = expandStroke(stroke.path, stroke.size / 2);
      // Invert Y axis of eraser to match OpenType coordinate system (Y goes up)
      eraserItem.scale(1, -1, new paper.Point(0, 0));
      const newBaseItem = baseItem.subtract(eraserItem);
      baseItem.remove();
      eraserItem.remove();
      baseItem = newBaseItem;
    }
    
    mergedCommands = paperToOpentypeCommands(baseItem);
    baseItem.remove();
  }
  
  // Apply base transform
  const bt = info.baseTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, flipX: false, flipY: false };
  if (bt.x !== 0 || bt.y !== 0 || bt.scaleX !== 1 || bt.scaleY !== 1 || bt.rotation !== 0 || bt.skewX !== 0 || bt.skewY !== 0 || bt.flipX || bt.flipY) {
    const transformBasePoint = (px: number, py: number) => {
      let x = px;
      let y = py;
      if (bt.flipX) x = -x;
      if (bt.flipY) y = -y;
      x *= bt.scaleX;
      y *= bt.scaleY;
      if (bt.skewX) {
        const radX = (bt.skewX * Math.PI) / 180;
        x += y * Math.tan(radX);
      }
      if (bt.skewY) {
        const radY = (bt.skewY * Math.PI) / 180;
        y += x * Math.tan(radY);
      }
      if (bt.rotation) {
        const rad = (bt.rotation * Math.PI) / 180;
        const rx = x * Math.cos(rad) - y * Math.sin(rad);
        const ry = x * Math.sin(rad) + y * Math.cos(rad);
        x = rx;
        y = ry;
      }
      x += bt.x;
      y += bt.y;
      return { x, y };
    };

    mergedCommands = mergedCommands.map(cmd => {
      const newCmd = { ...cmd };
      if ('x' in newCmd && 'y' in newCmd) {
        const pt = transformBasePoint(newCmd.x!, newCmd.y!);
        newCmd.x = pt.x; newCmd.y = pt.y;
      }
      if ('x1' in newCmd && 'y1' in newCmd) {
        const pt = transformBasePoint(newCmd.x1!, newCmd.y1!);
        newCmd.x1 = pt.x; newCmd.y1 = pt.y;
      }
      if ('x2' in newCmd && 'y2' in newCmd) {
        const pt = transformBasePoint(newCmd.x2!, newCmd.y2!);
        newCmd.x2 = pt.x; newCmd.y2 = pt.y;
      }
      return newCmd;
    });
  }
  
  const t = info.diacriticTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, flipX: false, flipY: false };
  
  const transformPoint = (px: number, py: number, isSvg: boolean = false) => {
    // If it's SVG, y is inverted
    let x = px;
    let y = isSvg ? -py : py;

    // Apply flip
    if (t.flipX) x = -x;
    if (t.flipY) y = -y;

    // Apply scale
    x *= t.scaleX;
    y *= t.scaleY;

    // Apply skew
    if (t.skewX) {
      const radX = (t.skewX * Math.PI) / 180;
      x += y * Math.tan(radX);
    }
    if (t.skewY) {
      const radY = (t.skewY * Math.PI) / 180;
      y += x * Math.tan(radY);
    }
    
    // Apply rotation
    if (t.rotation) {
      const rad = (t.rotation * Math.PI) / 180;
      const rx = x * Math.cos(rad) - y * Math.sin(rad);
      const ry = x * Math.sin(rad) + y * Math.cos(rad);
      x = rx;
      y = ry;
    }
    
    // Apply translation
    x += t.x + globalShiftX;
    y += t.y;
    
    return { x, y };
  };

  if (info.svgDiacritic) {
    const svgCommands = svgPathToCommands(info.svgDiacritic.path);
    const transformedSvgCommands = svgCommands.map(cmd => {
      const newCmd = { ...cmd };
      if ('x' in newCmd && 'y' in newCmd) {
        const pt = transformPoint(newCmd.x!, newCmd.y!, true);
        newCmd.x = pt.x;
        newCmd.y = pt.y;
      }
      if ('x1' in newCmd && 'y1' in newCmd) {
        const pt = transformPoint(newCmd.x1!, newCmd.y1!, true);
        newCmd.x1 = pt.x;
        newCmd.y1 = pt.y;
      }
      if ('x2' in newCmd && 'y2' in newCmd) {
        const pt = transformPoint(newCmd.x2!, newCmd.y2!, true);
        newCmd.x2 = pt.x;
        newCmd.y2 = pt.y;
      }
      return newCmd;
    });
    let finalSvgCommands = transformedSvgCommands;
    if (applyStylisticAdaptation) {
      finalSvgCommands = roughenCommands(finalSvgCommands, font.unitsPerEm);
    }
    mergedCommands.push(...finalSvgCommands);
  } else if (info.diacriticGlyph) {
    const diaPath = info.diacriticGlyph.path;
    const transformedCommands = diaPath.commands.map(cmd => {
      const newCmd = { ...cmd };
      if ('x' in newCmd && 'y' in newCmd) {
        const pt = transformPoint(newCmd.x!, newCmd.y!);
        newCmd.x = pt.x;
        newCmd.y = pt.y;
      }
      if ('x1' in newCmd && 'y1' in newCmd) {
        const pt = transformPoint(newCmd.x1!, newCmd.y1!);
        newCmd.x1 = pt.x;
        newCmd.y1 = pt.y;
      }
      if ('x2' in newCmd && 'y2' in newCmd) {
        const pt = transformPoint(newCmd.x2!, newCmd.y2!);
        newCmd.x2 = pt.x;
        newCmd.y2 = pt.y;
      }
      return newCmd;
    });
    
    let finalCommands = transformedCommands;
    if (applyStylisticAdaptation) {
      finalCommands = roughenCommands(finalCommands, font.unitsPerEm);
    }
    mergedCommands.push(...finalCommands);
  }
  
  let finalAdvanceWidth = info.advanceWidth || info.baseGlyph.advanceWidth;

  if (info.isScaledToLowercase) {
    const xHeight = (font as any)?.tables?.os2?.sxHeight || (font?.ascender || 800) * 0.65;
    const capHeight = (font as any)?.tables?.os2?.sCapHeight || (font?.ascender || 800) * 0.9;
    const scale = xHeight / capHeight;
    
    mergedCommands = mergedCommands.map(cmd => {
      const newCmd = { ...cmd };
      if ('x' in newCmd && 'y' in newCmd) {
        newCmd.x! *= scale;
        newCmd.y! *= scale;
      }
      if ('x1' in newCmd && 'y1' in newCmd) {
        newCmd.x1! *= scale;
        newCmd.y1! *= scale;
      }
      if ('x2' in newCmd && 'y2' in newCmd) {
        newCmd.x2! *= scale;
        newCmd.y2! *= scale;
      }
      return newCmd;
    });
    
    if (finalAdvanceWidth) {
      finalAdvanceWidth *= scale;
    }
  }

  const mergedPath = new opentype.Path();
  (mergedPath as any).unitsPerEm = font.unitsPerEm;
  mergedPath.commands = mergedCommands;
  
  const finalPath = font.outlinesFormat === 'truetype' ? convertPathToQuadratic(mergedPath) : mergedPath;
  
  return new opentype.Glyph({
    name: info.char,
    unicode: info.char.charCodeAt(0),
    advanceWidth: finalAdvanceWidth,
    path: finalPath
  });
}

function getCleanDiacriticGlyph(font: opentype.Font, sourceChar: string): opentype.Glyph {
  const sourceGlyph = font.charToGlyph(sourceChar);
  
  let baseChar = CHAR_RECIPES[sourceChar]?.base;
  if (!baseChar) {
    const normalized = sourceChar.normalize("NFD");
    if (normalized.length > 1) {
      baseChar = normalized[0];
    } else {
      return sourceGlyph;
    }
  }
  
  const baseGlyph = font.charToGlyph(baseChar);
  
  const sourcePath = sourceGlyph.path;
  const basePath = baseGlyph.path;
  
  // 1. Try TrueType composite extraction if available
  if ((sourceGlyph as any).isComposite && (sourceGlyph as any).components) {
    const baseIndex = font.charToGlyphIndex(baseChar);
    const diacriticComponent = (sourceGlyph as any).components.find((c: any) => c.glyphIndex !== baseIndex);
    if (diacriticComponent) {
      return font.glyphs.get(diacriticComponent.glyphIndex);
    }
  }

  // 2. Try robust path command subtraction
  // We look for the sequence of basePath commands within sourcePath commands
  if (sourcePath.commands.length > basePath.commands.length) {
    const sCmds = sourcePath.commands;
    const bCmds = basePath.commands;
    
    let foundIndex = -1;
    const tolerance = 2; // Allow small coordinate differences

    for (let i = 0; i <= sCmds.length - bCmds.length; i++) {
      let match = true;
      for (let j = 0; j < bCmds.length; j++) {
        const s = sCmds[i + j] as any;
        const b = bCmds[j] as any;
        
        if (s.type !== b.type) {
          match = false;
          break;
        }
        
        // Check coordinates if they exist
        const coords = ['x', 'y', 'x1', 'y1', 'x2', 'y2'];
        for (const prop of coords) {
          if (s[prop] !== undefined && b[prop] !== undefined) {
            if (Math.abs(s[prop] - b[prop]) > tolerance) {
              match = false;
              break;
            }
          }
        }
        if (!match) break;
      }
      
      if (match) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex !== -1) {
      const cleanPath = new opentype.Path();
      (cleanPath as any).unitsPerEm = font.unitsPerEm;
      const before = sCmds.slice(0, foundIndex);
      const after = sCmds.slice(foundIndex + bCmds.length);
      cleanPath.commands = [...before, ...after];
      
      // If the resulting path is empty, something went wrong, fallback
      if (cleanPath.commands.length > 0) {
        return new opentype.Glyph({
          name: `diacritic_from_${sourceChar}`,
          path: cleanPath,
          advanceWidth: sourceGlyph.advanceWidth
        });
      }
    }
  }

  // 3. Heuristic Fallback: Split by contours and keep the one furthest from baseline
  // This is useful for fonts where the base and diacritic are not a simple command sequence
  try {
    const commands = sourcePath.commands;
    const contours: opentype.PathCommand[][] = [];
    let currentContour: opentype.PathCommand[] = [];
    
    for (const cmd of commands) {
      currentContour.push(cmd);
      if (cmd.type === 'Z') {
        contours.push(currentContour);
        currentContour = [];
      }
    }
    if (currentContour.length > 0) contours.push(currentContour);

    if (contours.length > 1) {
      const baseBox = basePath.getBoundingBox();
      const diacriticContours = contours.filter(contour => {
        // A contour is likely a diacritic if it's mostly outside the base bounding box
        // or if it's significantly higher/lower than the base center
        const tempPath = new opentype.Path();
        tempPath.commands = contour;
        const box = tempPath.getBoundingBox();
        
        // For top diacritics (most common)
        if (box.y1 > baseBox.y2 - (baseBox.y2 - baseBox.y1) * 0.2) {
          return true;
        }
        // For ring or other cases, check center distance
        const baseCenterY = (baseBox.y1 + baseBox.y2) / 2;
        const contourCenterY = (box.y1 + box.y2) / 2;
        return Math.abs(contourCenterY - baseCenterY) > (baseBox.y2 - baseBox.y1) * 0.3;
      });

      if (diacriticContours.length > 0 && diacriticContours.length < contours.length) {
        const cleanPath = new opentype.Path();
        (cleanPath as any).unitsPerEm = font.unitsPerEm;
        cleanPath.commands = diacriticContours.flat();
        return new opentype.Glyph({
          name: `diacritic_from_${sourceChar}`,
          path: cleanPath,
          advanceWidth: sourceGlyph.advanceWidth
        });
      }
    }
  } catch (e) {
    console.warn("Contour heuristic failed", e);
  }

  // Final fallback: return source but log warning
  console.warn(`Could not clean diacritic for ${sourceChar}, using full glyph.`);
  return sourceGlyph;
}

function calculateAutoTransform(
  baseGlyph: opentype.Glyph, 
  diacriticType: DiacriticType, 
  diacriticGlyph?: opentype.Glyph,
  isSvg: boolean = false,
  font?: opentype.Font,
  isFlipped: boolean = false
) {
  const baseBox = baseGlyph.getBoundingBox();
  const baseWidth = baseBox.x2 - baseBox.x1;
  const baseXCenter = (baseBox.x1 + baseBox.x2) / 2;
  const baseYTop = baseBox.y2; // Skutočný najvyšší bod základného znaku
  
  // Try to get standard metrics from font if available
  let capHeight = 700;
  let xHeight = 500;
  
  if (font) {
    // Try to derive from actual glyphs for better accuracy than OS/2 table which is often wrong or missing
    const hGlyph = font.charToGlyph('H');
    const xGlyph = font.charToGlyph('x');
    if (hGlyph && hGlyph.unicode !== undefined) {
      const hBox = hGlyph.getBoundingBox();
      if (hBox.y2 > 0) capHeight = hBox.y2;
    }
    if (xGlyph && xGlyph.unicode !== undefined) {
      const xBox = xGlyph.getBoundingBox();
      if (xBox.y2 > 0) xHeight = xBox.y2;
    }

    // Fallback to OS/2 if glyphs didn't give us good values
    if (capHeight === 700 && font.tables?.os2?.sCapHeight) capHeight = font.tables.os2.sCapHeight;
    if (xHeight === 500 && font.tables?.os2?.sxHeight) xHeight = font.tables.os2.sxHeight;
  }

  // Medzera medzi znakom a diakritikou (napr. 6% z výšky veľkého písmena)
  const gap = capHeight * 0.06; 

  let scaleX = 1;
  let scaleY = 1;
  let x = 0;
  let y = 0;

  if (isSvg) {
    const targetHeight = capHeight * 0.25;
    scaleX = scaleY = targetHeight / 100;
    
    if (diacriticType === 'apostrophe') {
      x = baseBox.x2 + gap * 0.5;
      y = baseYTop * 0.95 + 100 * scaleX;
    } else {
      x = baseBox.x1 + (baseWidth - 100 * scaleX) / 2;
      const currentGap = diacriticType === 'caron' ? gap * 0.8 : gap;
      y = baseYTop + currentGap + 100 * scaleY;
    }
  } else if (diacriticGlyph) {
    const diaBox = diacriticGlyph.getBoundingBox();
    const diaXCenter = (diaBox.x1 + diaBox.x2) / 2;

    if (diacriticType === 'apostrophe') {
      // Apostrof (ď, ť, ľ) sa umiestňuje vpravo hore od základného znaku
      x = baseBox.x2 + gap * 0.3 - diaBox.x1;
      y = baseYTop * 0.95 - diaBox.y1;
    } else {
      // Centrované diakritiky
      x = baseXCenter - diaXCenter;
      
      // Mierne menšia medzera pre mäkčeň, aby nevyzeral "odtrhnutý"
      const currentGap = diacriticType === 'caron' ? gap * 0.6 : gap;
      
      if (isFlipped) {
        // Ak otáčame vokáň na mäkčeň, musíme pripočítať horný okraj diakritiky
        y = baseYTop + currentGap + diaBox.y2;
      } else {
        // Štandardné umiestnenie: vrch znaku + medzera - spodok diakritiky
        y = baseYTop + currentGap - diaBox.y1;
      }
    }
  }

  return { x, y, scaleX, scaleY, rotation: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, referenceTop: baseYTop, baseWidth };
}

export function useFontEditor() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [font, setFont] = useState<opentype.Font | null>(null);
  const [slaveFonts, setSlaveFonts] = useState<{ font: opentype.Font, name: string, buffer: ArrayBuffer }[]>([]);
  const [fontBuffer, setFontBuffer] = useState<ArrayBuffer | null>(null);
  const [fontName, setFontName] = useState<string>('');
  const [chars, setChars] = useState<Record<string, CharInfo>>({});
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  
  // History state
  const [past, setPast] = useState<Record<string, CharInfo>[]>([]);
  const [future, setFuture] = useState<Record<string, CharInfo>[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [isBatchApplying, setIsBatchApplying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingChar, setExportingChar] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [libraryDiacritics, setLibraryDiacritics] = useState<LibraryDiacritic[]>([]);

  const loadLibrary = useCallback(async () => {
    const data = await db.getLibraryDiacritics();
    setLibraryDiacritics(data);
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Autosave
  useEffect(() => {
    if (!projectId || !fontBuffer || !hasUnsavedChanges) return;

    const timeoutId = setTimeout(async () => {
      const charsData: Record<string, SavedCharData> = {};
      for (const [char, info] of Object.entries(chars)) {
        if (info.status !== 'ok') {
          charsData[char] = {
            status: info.status,
            diacriticTransform: info.diacriticTransform,
            baseTransform: info.baseTransform,
            advanceWidth: info.advanceWidth,
            svgDiacritic: info.svgDiacritic,
            eraserPaths: info.eraserPaths
          };
        }
      }

      await db.saveProject({
        id: projectId,
        name: fontName,
        lastModified: Date.now(),
        fontBuffer,
        charsData
      });
      setHasUnsavedChanges(false);
    }, 1000); // Autosave after 1 second of inactivity

    return () => clearTimeout(timeoutId);
  }, [chars, projectId, fontBuffer, fontName, hasUnsavedChanges]);

  const saveHistory = useCallback((newChars: Record<string, CharInfo>) => {
    setPast(prev => [...prev, chars]);
    setFuture([]);
    setChars(newChars);
    setHasUnsavedChanges(true);
  }, [chars]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setPast(newPast);
    setFuture(prev => [chars, ...prev]);
    setChars(previous);
    setHasUnsavedChanges(true);
  }, [past, chars]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast(prev => [...prev, chars]);
    setFuture(newFuture);
    setChars(next);
    setHasUnsavedChanges(true);
  }, [future, chars]);

  const parseFont = (buffer: ArrayBuffer): opentype.Font => {
    try {
      return opentype.parse(buffer);
    } catch (parseErr: any) {
      if (parseErr.message && parseErr.message.includes("compression")) {
        throw new Error("Nepodarilo sa načítať font: Súbor pravdepodobne nie je platný font (môže ísť o obrázok alebo iný formát).");
      }
      
      const view = new DataView(buffer);
      if (buffer.byteLength >= 4) {
        const sig = view.getUint32(0, false);
        if (sig === 0x774F4632) { // 'wOF2'
          throw new Error("Formát WOFF2 nie je plne podporovaný. Prosím, prekonvertujte font na TTF alebo OTF.");
        }
      }
      
      console.warn("Initial parse failed, attempting to find font signature...", parseErr);
      let offset = -1;
      for (let i = 0; i < buffer.byteLength - 4; i++) {
        const sig = view.getUint32(i, false);
        if (sig === 0x00010000 || sig === 0x4F54544F || sig === 0x74727565) {
          offset = i;
          break;
        }
      }
      
      if (offset > 0) {
        return opentype.parse(buffer.slice(offset));
      } else {
        throw new Error(`Nepodporovaný formát fontu alebo poškodený súbor. Pôvodná chyba: ${parseErr.message || parseErr}`);
      }
    }
  };

  const loadFontFromBuffer = useCallback(async (buffer: ArrayBuffer, name: string, savedCharsData?: Record<string, SavedCharData>, existingProjectId?: string) => {
    try {
      const loadedFont = parseFont(buffer);

      setFont(loadedFont);
      setFontBuffer(buffer);
      setFontName(name);
      
      const newChars: Record<string, CharInfo> = {};
      
      for (const char of SINGLE_CHARS) {
        const glyphIndex = loadedFont.charToGlyphIndex(char);
        const hasGlyph = glyphIndex > 0;
        
        const recipe = CHAR_RECIPES[char];
        let baseGlyph: opentype.Glyph | undefined;
        let diacriticGlyph: opentype.Glyph | undefined;
        let initialTransform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, flipX: false, flipY: false };
        let advanceWidth: number | undefined;

        let diacriticSource: CharInfo['diacriticSource'] = 'original';

        if (recipe) {
          const baseIndex = loadedFont.charToGlyphIndex(recipe.base);
          if (baseIndex > 0) {
            let baseGlyphRaw = loadedFont.charToGlyph(recipe.base);
            baseGlyph = (char !== recipe.base && (recipe.base === 'i' || recipe.base === 'j')) ? stripDotFromGlyph(baseGlyphRaw, loadedFont) : baseGlyphRaw;
            advanceWidth = baseGlyph.advanceWidth;
            
            // Try to find a diacritic glyph from the font
            // 1. Try standalone diacritic names first
            const standaloneNames: Record<DiacriticType, string[]> = {
              acute: ['acute', 'uni00B4', 'uni02CA'],
              caron: ['caron', 'uni02C7', 'uni02C7'],
              diaeresis: ['dieresis', 'uni00A8', 'uni02D8'],
              circumflex: ['circumflex', 'uni005E', 'uni02C6'],
              ring: ['ring', 'uni02DA', 'uni00B0'],
              apostrophe: ['quoteright', 'uni2019', 'uni0027']
            };

            const candidates = standaloneNames[recipe.diacriticType] || [];
            for (const name of candidates) {
              if (loadedFont.glyphNames && typeof (loadedFont.glyphNames as any).nameToGlyphIndex === 'function') {
                const idx = (loadedFont.glyphNames as any).nameToGlyphIndex(name);
                if (idx > 0) {
                  diacriticGlyph = loadedFont.glyphs.get(idx);
                  diacriticSource = 'standalone';
                  break;
                }
              }
            }

            // 2. If not found, try to find by character code if possible
            if (!diacriticGlyph) {
               const charCodes: Record<DiacriticType, string> = {
                 acute: '\u00B4',
                 caron: '\u02C7',
                 diaeresis: '\u00A8',
                 circumflex: '\u005E',
                 ring: '\u02DA',
                 apostrophe: '\u2019'
               };
               const code = charCodes[recipe.diacriticType];
               if (code && loadedFont.charToGlyphIndex(code) > 0) {
                 diacriticGlyph = loadedFont.charToGlyph(code);
                 diacriticSource = 'standalone';
               }
            }

            // 3. Fallback to stealing from other characters
            if (!diacriticGlyph) {
              let sourcesToTry = [...recipe.defaultSource];
              // If uppercase, also try lowercase sources
              if (char === char.toUpperCase()) {
                sourcesToTry = [...sourcesToTry, ...recipe.defaultSource.map(s => s.toLowerCase())];
              }
              for (const source of sourcesToTry) {
                const sourceIndex = loadedFont.charToGlyphIndex(source);
                if (sourceIndex > 0) {
                  diacriticGlyph = getCleanDiacriticGlyph(loadedFont, source);
                  diacriticSource = 'stolen';
                  break;
                }
              }
            }

            // 4. Fallback to alternative diacritics (e.g. circumflex for caron with flipY)
            if (!diacriticGlyph) {
              if (recipe.diacriticType === 'caron') {
                const circumflexSources = ['ô', 'Â', 'Ê', 'Î', 'Ô', 'Û', 'â', 'ê', 'î', 'û'];
                for (const source of circumflexSources) {
                  if (loadedFont.charToGlyphIndex(source) > 0) {
                    diacriticGlyph = getCleanDiacriticGlyph(loadedFont, source);
                    if (diacriticGlyph) {
                      diacriticSource = 'stolen';
                      initialTransform.flipY = true;
                      break;
                    }
                  }
                }
              }
            }
            
            if (diacriticGlyph) {
              try {
                const autoTransform = calculateAutoTransform(baseGlyph, recipe.diacriticType, diacriticGlyph, false, loadedFont, initialTransform.flipY);
                initialTransform = { ...autoTransform, flipY: initialTransform.flipY };
              } catch (e) {
                console.warn("Could not calculate bounding box for auto-placement", e);
              }
            }
          }
        }

        // Default to generated composite if recipe exists and we have components
        const shouldBeComposite = recipe && baseGlyph && diacriticGlyph;

        if (hasGlyph && (!savedCharsData || !savedCharsData[char] || savedCharsData[char].status === 'ok')) {
          newChars[char] = {
            char,
            status: 'ok',
            glyph: loadedFont.charToGlyph(char),
            baseGlyph,
            diacriticGlyph,
            diacriticSource: 'original',
            diacriticTransform: initialTransform,
            advanceWidth: loadedFont.charToGlyph(char).advanceWidth
          };
        } else if (shouldBeComposite && (!savedCharsData || !savedCharsData[char])) {
          newChars[char] = {
            char,
            status: 'generated',
            glyph: loadedFont.charToGlyph(char),
            baseGlyph,
            diacriticGlyph,
            diacriticSource,
            diacriticTransform: initialTransform,
            advanceWidth: advanceWidth || loadedFont.charToGlyph(char).advanceWidth
          };
        } else {
          let status: CharStatus = (recipe && baseGlyph && diacriticGlyph) ? 'generated' : 'missing';

          // Apply saved data if exists
          let baseTransform: CharInfo['baseTransform'] = undefined;
          if (savedCharsData && savedCharsData[char]) {
            status = savedCharsData[char].status;
            if (savedCharsData[char].diacriticTransform) {
              initialTransform = { ...initialTransform, ...savedCharsData[char].diacriticTransform };
            }
            if (savedCharsData[char].baseTransform) {
              baseTransform = savedCharsData[char].baseTransform;
            }
            if (savedCharsData[char].advanceWidth !== undefined) {
              advanceWidth = savedCharsData[char].advanceWidth;
            }
            if (savedCharsData[char].svgDiacritic) {
              newChars[char] = {
                char,
                status,
                baseGlyph,
                diacriticGlyph,
                diacriticTransform: initialTransform,
                baseTransform,
                advanceWidth,
                svgDiacritic: savedCharsData[char].svgDiacritic,
                eraserPaths: savedCharsData[char].eraserPaths
              };
              continue;
            }
          }

          newChars[char] = {
            char,
            status,
            baseGlyph,
            diacriticGlyph,
            diacriticTransform: initialTransform,
            baseTransform,
            advanceWidth,
            eraserPaths: savedCharsData && savedCharsData[char] ? savedCharsData[char].eraserPaths : undefined
          };
        }
      }
      
      setChars(newChars);
      setSelectedChar(SINGLE_CHARS[0]);
      setPast([]);
      setFuture([]);
      setHasUnsavedChanges(false);

      if (existingProjectId) {
        setProjectId(existingProjectId);
      } else {
        const newId = uuidv4();
        setProjectId(newId);
        // Initial save
        const charsData: Record<string, SavedCharData> = {};
        for (const [char, info] of Object.entries(newChars)) {
          if (info.status !== 'ok') {
            charsData[char] = {
              status: info.status,
              diacriticTransform: info.diacriticTransform,
              advanceWidth: info.advanceWidth,
              svgDiacritic: info.svgDiacritic,
              eraserPaths: info.eraserPaths
            };
          }
        }
        await db.saveProject({
          id: newId,
          name,
          lastModified: Date.now(),
          fontBuffer: buffer,
          charsData
        });
      }
    } catch (err: any) {
      console.error("Failed to load font", err);
      alert(`Nepodarilo sa načítať font: ${err.message || 'Neznáma chyba'}. Uistite sa, že ide o platný súbor TTF, OTF alebo UFONT.`);
    }
  }, []);

  const loadFonts = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    // First file is Master
    const masterFile = files[0];
    const masterBuffer = await masterFile.arrayBuffer();
    await loadFontFromBuffer(masterBuffer, masterFile.name);

    // Others are Slaves
    if (files.length > 1) {
      const slaves: { font: opentype.Font, name: string, buffer: ArrayBuffer }[] = [];
      for (let i = 1; i < files.length; i++) {
        const buffer = await files[i].arrayBuffer();
        try {
          const f = parseFont(buffer);
          slaves.push({ font: f, name: files[i].name, buffer });
        } catch (e) {
          console.error(`Failed to parse slave font ${files[i].name}`, e);
        }
      }
      setSlaveFonts(slaves);
    }
  }, [loadFontFromBuffer]);

  const runBatchApply = useCallback(async () => {
    if (!font || slaveFonts.length === 0) return;
    setIsBatchApplying(true);
    
    try {
      const getWeight = (f: opentype.Font, name: string) => {
        if (f.tables.os2?.usWeightClass) return f.tables.os2.usWeightClass;
        const n = name.toLowerCase();
        if (n.includes('thin') || n.includes('100')) return 100;
        if (n.includes('extralight') || n.includes('200')) return 200;
        if (n.includes('light') || n.includes('300')) return 300;
        if (n.includes('medium') || n.includes('500')) return 500;
        if (n.includes('semibold') || n.includes('600')) return 600;
        if (n.includes('bold') || n.includes('700')) return 700;
        if (n.includes('extrabold') || n.includes('800')) return 800;
        if (n.includes('black') || n.includes('900')) return 900;
        return 400; // Regular
      };

      const masterWeight = getWeight(font, fontName);
      
      for (const slave of slaveFonts) {
        const slaveWeight = getWeight(slave.font, slave.name);
        
        // AI-inspired heuristic for weight-based scaling
        // We adjust the scale factor based on the relative weight difference
        const weightDiff = slaveWeight - masterWeight;
        // For every 100 units of weight difference, we increase scale by ~5-7%
        const scaleFactor = 1 + (weightDiff / 100) * 0.06; 

        const exportData: Record<string, any> = {};
        for (const [char, info] of Object.entries(chars)) {
          if (info.status === 'edited' || info.status === 'generated') {
            const transform = { ...info.diacriticTransform! };
            
            // Apply weight-based scaling
            transform.scaleX *= scaleFactor;
            transform.scaleY *= scaleFactor;
            
            // Also slightly adjust Y position if it's a bold font (bold often needs higher diacritics)
            if (weightDiff > 0) {
              transform.y += (weightDiff / 100) * 5; 
            }

            exportData[char] = {
              transform,
              advanceWidth: info.advanceWidth,
              svgDiacritic: info.svgDiacritic
            };
          }
        }
        
        // Export each slave font with its diacritics
        // In a real app, we'd probably save these to the project or export as a ZIP
        // For now, let's just download them
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slave.name.replace(/\.[^/.]+$/, "")}_diacritics_batch.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      
      alert(`Hromadné nasadenie dokončené pre ${slaveFonts.length} rezov.`);
    } catch (e) {
      console.error(e);
      alert("Chyba pri hromadnom nasadení.");
    } finally {
      setIsBatchApplying(false);
    }
  }, [font, slaveFonts, chars]);

  const loadProject = useCallback(async (id: string) => {
    const project = await db.getProject(id);
    if (project) {
      await loadFontFromBuffer(project.fontBuffer, project.name, project.charsData, project.id);
    }
  }, [loadFontFromBuffer]);

  const closeProject = useCallback(() => {
    setFont(null);
    setSlaveFonts([]);
    setFontBuffer(null);
    setFontName('');
    setChars({});
    setSelectedChar(null);
    setProjectId(null);
    setPast([]);
    setFuture([]);
    setHasUnsavedChanges(false);
  }, []);

  function detectAnomalies(char: string, info: CharInfo) {
    const anomalies: string[] = [];
    if (info.glyph && info.glyph.advanceWidth === 0) {
      anomalies.push('Nulová šírka znaku');
    }
    if (info.glyph && info.glyph.path.commands.length === 0) {
      anomalies.push('Prázdny glyf');
    }
    
    // Run shape analysis
    const { anomalies: shapeAnomalies, metrics, anomalyHighlights } = analyzeShape(info);
    const allAnomalies = [...anomalies, ...shapeAnomalies];
    
    // Only update if changed to avoid loops
    const hasAnomalyChange = JSON.stringify(allAnomalies) !== JSON.stringify(info.anomalies);
    const hasMetricChange = JSON.stringify(metrics) !== JSON.stringify(info.metrics);
    const hasHighlightChange = JSON.stringify(anomalyHighlights) !== JSON.stringify(info.anomalyHighlights);

    if (hasAnomalyChange || hasMetricChange || hasHighlightChange) {
      updateCharProperty(char, { anomalies: allAnomalies, metrics, anomalyHighlights });
    }
  }

  function analyzeShape(info: CharInfo): { anomalies: string[], metrics: CharInfo['metrics'], anomalyHighlights: CharInfo['anomalyHighlights'] } {
    if (!info.glyph) return { anomalies: [], metrics: undefined, anomalyHighlights: undefined };
    
    const anomalies: string[] = [];
    let metrics: CharInfo['metrics'] = undefined;
    let anomalyHighlights: CharInfo['anomalyHighlights'] = { islands: [], intersections: [] };
    
    try {
      // Create a temporary project for paper.js operations
      const scope = new paper.PaperScope();
      scope.setup(new paper.Size(1000, 1000));
      
      const pathData = info.glyph.path.toPathData(2);
      if (!pathData) return { anomalies: [], metrics: undefined, anomalyHighlights: undefined };

      const item = scope.project.activeLayer.importSVG(`<path d="${pathData}" />`);
      if (!item) return { anomalies: [], metrics: undefined, anomalyHighlights: undefined };

      // Flatten to get actual paths
      const paths: paper.Path[] = [];
      if (item instanceof scope.CompoundPath) {
        paths.push(...(item.children as paper.Path[]));
      } else if (item instanceof scope.Path) {
        paths.push(item);
      } else if (item instanceof scope.Group) {
        item.children.forEach(child => {
          if (child instanceof scope.Path) paths.push(child);
          else if (child instanceof scope.CompoundPath) paths.push(...(child.children as paper.Path[]));
        });
      }

      if (paths.length === 0) return { anomalies: [], metrics: undefined, anomalyHighlights: undefined };

      // Total area
      let totalArea = 0;
      paths.forEach(p => totalArea += Math.abs(p.area));

      const areaThreshold = totalArea * 0.005;
      let hasIslands = false;
      paths.forEach(p => {
        if (Math.abs(p.area) < areaThreshold && Math.abs(p.area) > 0.1) {
          hasIslands = true;
          anomalyHighlights?.islands?.push(p.exportSVG({ asString: true }) as string);
        }
      });

      if (hasIslands) anomalies.push('Malé izolované časti');

      let isComplex = false;
      paths.forEach(p => {
        const intersections = p.getIntersections(p);
        if (intersections.length > p.segments.length) {
          isComplex = true;
          // Add small circles around intersections for highlighting
          intersections.slice(0, 20).forEach(inter => {
            const circle = new scope.Path.Circle(inter.point, 10);
            anomalyHighlights?.intersections?.push(circle.exportSVG({ asString: true }) as string);
          });
        }
      });

      if (isComplex) anomalies.push('Prekrývajúce sa alebo zložité cesty');

      const bounds = item.bounds;
      
      // Separate base and diacritic analysis if possible
      let baseBounds = bounds;
      let diacriticBounds = null;
      
      if (paths.length > 1) {
        // Heuristic: the largest path or the one closest to baseline is the base
        const sortedByArea = [...paths].sort((a, b) => Math.abs(b.area) - Math.abs(a.area));
        const mainPath = sortedByArea[0];
        baseBounds = mainPath.bounds;
        
        // Other paths are likely diacritics
        const otherPaths = paths.filter(p => p !== mainPath);
        if (otherPaths.length > 0) {
          const diacriticItem = new scope.Group(otherPaths.map(p => p.clone()));
          diacriticBounds = diacriticItem.bounds;
          
          // Check for overlap between base and diacritic
          let overlaps = false;
          otherPaths.forEach(p => {
            if (mainPath.intersects(p) || mainPath.contains(p.bounds.center)) {
              overlaps = true;
            }
          });
          if (overlaps) {
            anomalies.push('Diakritika sa prekrýva so základným znakom');
          }
        }
      }

      const lsb = baseBounds.left;
      const rsb = (info.advanceWidth || info.glyph.advanceWidth) - baseBounds.right;

      // Check for vertical alignment issues
      const isLowercase = info.char === info.char.toLowerCase() && info.char !== info.char.toUpperCase();
      const fontMetrics = {
        ascender: font?.ascender || 800,
        descender: font?.descender || -200,
        xHeight: (font as any)?.tables?.os2?.sxHeight || (font?.ascender || 800) * 0.65,
        capHeight: (font as any)?.tables?.os2?.sCapHeight || (font?.ascender || 800) * 0.9
      };

      const baseTop = -baseBounds.top; // Convert SVG y to font y
      const targetHeight = isLowercase ? fontMetrics.xHeight : fontMetrics.capHeight;
      
      // If it's a lowercase letter with ascender (b, d, f, h, k, l, t)
      const hasAscender = /[bdfhklit]/.test(info.char.toLowerCase());
      const expectedTop = hasAscender ? fontMetrics.ascender : targetHeight;

      if (Math.abs(baseTop - expectedTop) > 100) {
        anomalies.push(isLowercase ? 'Malé písmeno má nesprávnu výšku (chová sa ako veľké)' : 'Veľké písmeno má nesprávnu výšku');
      }

      if (lsb < -50 || rsb < -50) {
        anomalies.push('Príliš úzke bočné medzery (presah)');
      }

      // Calculate hotspots (density)
      const hotspots: { x: number; y: number; intensity: number }[] = [];
      
      // Find points where paths are close to each other
      // For simplicity, let's use path segment points and check their proximity to other paths
      paths.forEach((p1, i) => {
        p1.segments.forEach(seg => {
          const pt = seg.point;
          paths.forEach((p2, j) => {
            if (i === j) return;
            const nearest = p2.getNearestPoint(pt);
            const dist = pt.getDistance(nearest);
            if (dist < 30 && dist > 0) {
              hotspots.push({ x: pt.x, y: pt.y, intensity: 1 - (dist / 30) });
            }
          });
        });
      });

      metrics = {
        lsb,
        rsb,
        hotspots: hotspots.slice(0, 10), // Limit to top 10 for performance
        xHeight: fontMetrics.xHeight,
        capHeight: fontMetrics.capHeight,
        isLowercase
      };

    } catch (e) {
      console.error('Error in analyzeShape:', e);
    }
    
    return { anomalies, metrics, anomalyHighlights };
  }

  function cleanGlyphPaths(char: string) {
    const info = chars[char];
    if (!info || !info.glyph) return;

    try {
      const scope = new paper.PaperScope();
      scope.setup(new paper.Size(1000, 1000));
      
      const pathData = info.glyph.path.toPathData(2);
      const item = scope.project.activeLayer.importSVG(`<path d="${pathData}" />`);
      
      if (item) {
        // Unite all paths to merge overlaps
        let united: any = item;
        if (item instanceof scope.Group || item instanceof scope.CompoundPath) {
          const children = [...item.children];
          if (children.length > 1) {
            united = children[0];
            for (let i = 1; i < children.length; i++) {
              if (typeof (united as any).unite === 'function') {
                united = (united as any).unite(children[i]);
              }
            }
          }
        }

        const newPathData = united.exportSVG({ asString: true }) as string;
        // Extract d attribute from exported SVG
        const match = newPathData.match(/d="([^"]+)"/);
        if (match && match[1]) {
          const newCommands = svgPathToCommands(match[1]);
          const newGlyph = new opentype.Glyph({
            name: info.glyph.name,
            unicode: info.glyph.unicode,
            unicodes: info.glyph.unicodes,
            advanceWidth: info.glyph.advanceWidth,
            path: new opentype.Path()
          });
          newGlyph.path.commands = newCommands;
          
          updateCharProperty(char, { glyph: newGlyph });
        }
      }
    } catch (e) {
      console.error('Error in cleanGlyphPaths:', e);
    }
  }

  const updateCharTransform = useCallback((char: string, transform: Partial<{ x: number; y: number; scaleX: number; scaleY: number; rotation: number; skewX: number; skewY: number; flipX: boolean; flipY: boolean }>, target: 'diacritic' | 'base' = 'diacritic') => {
    const transformKey = target === 'base' ? 'baseTransform' : 'diacriticTransform';
    const currentTransform = chars[char][transformKey] || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, flipX: false, flipY: false };
    
    const newChars = {
      ...chars,
      [char]: {
        ...chars[char],
        status: chars[char].status === 'missing' ? 'missing' : 'edited' as CharStatus,
        [transformKey]: {
          ...currentTransform,
          ...transform
        }
      }
    };
    saveHistory(newChars);
    detectAnomalies(char, newChars[char]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars, saveHistory]);

  const updateCharProperty = useCallback((char: string, property: Partial<CharInfo>) => {
    const newChars = {
      ...chars,
      [char]: {
        ...chars[char],
        ...property
      }
    };
    saveHistory(newChars);
    detectAnomalies(char, newChars[char]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars, saveHistory]);

  const updateAdvanceWidth = useCallback((char: string, width: number) => {
    const newChars = {
      ...chars,
      [char]: {
        ...chars[char],
        status: chars[char].status === 'missing' ? 'missing' : 'edited' as CharStatus,
        advanceWidth: width
      }
    };
    saveHistory(newChars);
  }, [chars, saveHistory]);

  const updateEraserPaths = useCallback((char: string, paths: { path: string; size: number }[]) => {
    const newChars = {
      ...chars,
      [char]: {
        ...chars[char],
        status: chars[char].status === 'missing' ? 'missing' : 'edited' as CharStatus,
        eraserPaths: paths
      }
    };
    saveHistory(newChars);
  }, [chars, saveHistory]);

  const scaleToLowercase = useCallback((char: string) => {
    const info = chars[char];
    if (!info) return;

    const newChars = {
      ...chars,
      [char]: {
        ...info,
        status: info.status === 'missing' ? 'missing' : 'edited' as CharStatus,
        isScaledToLowercase: !info.isScaledToLowercase
      }
    };
    saveHistory(newChars);
  }, [chars, saveHistory]);

  const applySvgStyle = useCallback((style: FontStyle | 'auto' | 'original', char: string) => {
    if (!font) return;
    const info = chars[char];
    if (!info) return;

    if (style === 'original') {
      const newChars = { ...chars };
      newChars[char] = {
        ...info,
        svgDiacritic: undefined,
        status: font.charToGlyphIndex(char) > 0 ? 'ok' : (info.baseGlyph && info.diacriticGlyph ? 'generated' : 'missing')
      };
      saveHistory(newChars);
      return;
    }

    if (style === 'auto') {
      const newChars = { ...chars };
      newChars[char] = {
        ...info,
        svgDiacritic: undefined,
        status: (info.baseGlyph && info.diacriticGlyph) ? 'edited' : 'missing'
      };
      saveHistory(newChars);
      return;
    }

    const diacriticType = getDiacriticType(char);
    if (diacriticType && info.baseGlyph) {
      const svgPath = SVG_DIACRITICS[style][diacriticType];
      const autoTransform = calculateAutoTransform(info.baseGlyph, diacriticType, undefined, true);
      
      const newChars = { ...chars };
      newChars[char] = {
        ...info,
        status: 'edited',
        diacriticSource: 'svg',
        svgDiacritic: { path: svgPath, style },
        diacriticTransform: autoTransform
      };
      saveHistory(newChars);
    }
  }, [chars, font, saveHistory]);

  const exportJSON = useCallback(() => {
    if (!font) return;
    
    const exportData: Record<string, any> = {};
    for (const [char, info] of Object.entries(chars)) {
      if (info.status === 'edited' || info.status === 'generated') {
        exportData[char] = {
          transform: info.diacriticTransform,
          baseTransform: info.baseTransform,
          advanceWidth: info.advanceWidth,
          svgDiacritic: info.svgDiacritic,
          eraserPaths: info.eraserPaths
        };
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fontName.replace(/\.[^/.]+$/, "")}_diacritics.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chars, font, fontName]);

  const importJSON = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const newChars = { ...chars };
        for (const [char, info] of Object.entries(data)) {
          const parsedInfo = info as any;
          if (newChars[char] && (newChars[char].status === 'generated' || newChars[char].status === 'edited' || newChars[char].status === 'missing')) {
            newChars[char] = {
              ...newChars[char],
              status: 'edited',
              diacriticTransform: parsedInfo.transform || newChars[char].diacriticTransform,
              baseTransform: parsedInfo.baseTransform || newChars[char].baseTransform,
              advanceWidth: parsedInfo.advanceWidth || newChars[char].advanceWidth,
              svgDiacritic: parsedInfo.svgDiacritic || newChars[char].svgDiacritic,
              eraserPaths: parsedInfo.eraserPaths || newChars[char].eraserPaths
            };
          }
        }
        saveHistory(newChars);
      } catch (err) {
        console.error("Failed to parse JSON", err);
        alert("Neplatný JSON súbor.");
      }
    };
    reader.readAsText(file);
  }, [chars, saveHistory]);

  const exportFont = useCallback(async (applyStylisticAdaptation: boolean = false, globalShiftX: number = 0) => {
    if (!font) return;
    
    setIsExporting(true);
    setExportProgress(0);
    
    // Yield to let UI show the overlay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      const glyphSet = font.glyphs as any;
      const originalGlyphs = { ...glyphSet.glyphs };
      const originalLength = glyphSet.length;
      
      const originalMaxpNumGlyphs = font.tables.maxp ? font.tables.maxp.numGlyphs : undefined;
      const originalPostNumGlyphs = font.tables.post ? font.tables.post.numberOfGlyphs : undefined;
      const originalPostNames = font.tables.post && font.tables.post.names ? [...font.tables.post.names] : undefined;
      
      const entries = Object.entries(chars);
      let processed = 0;

      const STANDARD_GLYPH_NAMES: Record<string, string> = {
        'á': 'aacute', 'ä': 'adieresis', 'č': 'ccaron', 'ď': 'dcaron', 'é': 'eacute', 'ě': 'ecaron',
        'í': 'iacute', 'ĺ': 'lacute', 'ľ': 'lcaron', 'ň': 'ncaron', 'ó': 'oacute', 'ô': 'ocircumflex',
        'ŕ': 'racute', 'ř': 'rcaron', 'š': 'scaron', 'ť': 'tcaron', 'ú': 'uacute', 'ů': 'uring',
        'ý': 'yacute', 'ž': 'zcaron',
        'Á': 'Aacute', 'Ä': 'Adieresis', 'Č': 'Ccaron', 'Ď': 'Dcaron', 'É': 'Eacute', 'Ě': 'Ecaron',
        'Í': 'Iacute', 'Ĺ': 'Lacute', 'Ľ': 'Lcaron', 'Ň': 'Ncaron', 'Ó': 'Oacute', 'Ô': 'Ocircumflex',
        'Ŕ': 'Racute', 'Ř': 'Rcaron', 'Š': 'Scaron', 'Ť': 'Tcaron', 'Ú': 'Uacute', 'Ů': 'Uring',
        'Ý': 'Yacute', 'Ž': 'Zcaron'
      };

      for (const [char, info] of entries) {
        setExportingChar(char);
        if (info.status === 'generated' || info.status === 'edited') {
          const charCode = char.charCodeAt(0);
          const hexCode = charCode.toString(16).toUpperCase().padStart(4, '0');
          const standardName = STANDARD_GLYPH_NAMES[char] || `uni${hexCode}`;
          const glyphIndex = font.charToGlyphIndex(char);
          const mergedGlyph = mergeGlyphs(font, info, applyStylisticAdaptation, globalShiftX);
          
          if (mergedGlyph) {
            let createNew = false;

            if (glyphIndex > 0) {
              const originalGlyph = font.glyphs.get(glyphIndex);
              if (originalGlyph) {
                // Check if this glyph is shared with other characters (e.g. all-caps font mapping 'ž' and 'Ž' to same glyph)
                const otherUnicodes = (originalGlyph.unicodes || []).filter((u: number) => u !== charCode);
                
                if (otherUnicodes.length > 0) {
                  // Glyph is shared! We must decouple it to avoid overwriting the other characters.
                  originalGlyph.unicodes = otherUnicodes;
                  if (originalGlyph.unicode === charCode) {
                    originalGlyph.unicode = otherUnicodes[0];
                  }
                  createNew = true;
                } else {
                  // Glyph is exclusively ours, we can safely overwrite it
                  mergedGlyph.index = glyphIndex;
                  mergedGlyph.name = originalGlyph.name || standardName;
                  mergedGlyph.unicode = charCode;
                  mergedGlyph.unicodes = [charCode];
                  glyphSet.glyphs[glyphIndex] = mergedGlyph;
                }
              } else {
                createNew = true;
              }
            } else {
              createNew = true;
            }

            if (createNew) {
              // Add new glyph
              const newIndex = glyphSet.length;
              mergedGlyph.index = newIndex;
              mergedGlyph.name = standardName;
              mergedGlyph.unicode = charCode;
              mergedGlyph.unicodes = [charCode];
              
              glyphSet.glyphs[newIndex] = mergedGlyph;
              glyphSet.length++;
              
              if (font.tables.post && font.tables.post.names) {
                font.tables.post.names.push(mergedGlyph.name);
              }
            }
          }
        }
        processed++;
        // Yield on every single character to ensure UI stays responsive
        setExportProgress(Math.round((processed / entries.length) * 50)); 
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      setExportingChar(null);

      if (font.tables.maxp) {
        font.tables.maxp.numGlyphs = glyphSet.length;
      }
      if (font.tables.post) {
        font.tables.post.numberOfGlyphs = glyphSet.length;
      }

      setExportProgress(50);
      // Give browser a solid chunk of time to paint the 50% progress before the heavy synchronous toArrayBuffer
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise(resolve => setTimeout(resolve, 100));

      // toArrayBuffer is synchronous and heavy. It will block the thread, but we yielded before it.
      const buffer = font.toArrayBuffer();
      
      setExportProgress(80);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Restore original glyphs and tables
      glyphSet.glyphs = originalGlyphs;
      glyphSet.length = originalLength;
      
      if (font.tables.maxp && originalMaxpNumGlyphs !== undefined) {
        font.tables.maxp.numGlyphs = originalMaxpNumGlyphs;
      }
      if (font.tables.post && originalPostNumGlyphs !== undefined) {
        font.tables.post.numberOfGlyphs = originalPostNumGlyphs;
      }
      if (font.tables.post && originalPostNames !== undefined) {
        font.tables.post.names = originalPostNames;
      }

      const blob = new Blob([buffer], { type: 'font/ttf' });
      
      // Save used diacritics to library (avoiding duplicates by path)
      const existingPaths = new Set(libraryDiacritics.map(d => d.path));
      let libraryProcessed = 0;
      for (const [char, info] of entries) {
        if (info.status === 'generated' || info.status === 'edited') {
          let path: string | undefined;
          if (info.svgDiacritic) {
            path = info.svgDiacritic.path;
          } else if (info.diacriticGlyph) {
            path = info.diacriticGlyph.getPath(0, 0, font.unitsPerEm, undefined, font).toPathData(2);
          }
          
          if (path && !existingPaths.has(path)) {
            await db.saveToLibrary({ name: `Diakritika z ${char}`, path });
            existingPaths.add(path);
          }
        }
        libraryProcessed++;
        if (libraryProcessed % 10 === 0) {
          setExportProgress(80 + Math.round((libraryProcessed / entries.length) * 20)); // Last 20% is saving library
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      loadLibrary();
      setExportProgress(100);
      await new Promise(resolve => setTimeout(resolve, 100));

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fontName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
      alert("Nepodarilo sa exportovať font. Pozrite si konzolu pre viac detailov.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [font, fontName, chars, libraryDiacritics, loadLibrary]);

  const batchUpdateChars = useCallback((updates: Record<string, Partial<CharInfo>>) => {
    const newChars = { ...chars };
    let changed = false;
    for (const [char, update] of Object.entries(updates)) {
      if (newChars[char]) {
        newChars[char] = { ...newChars[char], ...update };
        changed = true;
      }
    }
    if (changed) {
      saveHistory(newChars);
    }
  }, [chars, saveHistory]);

  const batchScaleToLowercase = useCallback(() => {
    const targetChars = ['ľ', 'š', 'č', 'ť', 'ž', 'ň', 'ď', 'ě', 'ř', 'ô', 'ů', 'ä'];
    const updates: Record<string, Partial<CharInfo>> = {};
    
    targetChars.forEach(char => {
      const info = chars[char];
      if (info) {
        updates[char] = {
          status: info.status === 'missing' ? 'missing' : 'edited' as CharStatus,
          isScaledToLowercase: true
        };
      }
    });
    
    if (Object.keys(updates).length > 0) {
      batchUpdateChars(updates);
    }
  }, [chars, batchUpdateChars]);

  const batchCleanGlyphs = useCallback(() => {
    Object.keys(chars).forEach(char => {
      const info = chars[char];
      if (info.anomalies && (info.anomalies.includes('Malé izolované časti') || info.anomalies.includes('Prekrývajúce sa alebo zložité cesty'))) {
        cleanGlyphPaths(char);
      }
    });
  }, [chars, cleanGlyphPaths]);

  const batchGenerateMissing = useCallback(() => {
    const updates: Record<string, Partial<CharInfo>> = {};
    let changed = false;

    Object.entries(chars).forEach(([char, info]) => {
      if (info.status === 'missing' && info.baseGlyph) {
        let diacriticGlyph = info.diacriticGlyph;
        
        // If no diacritic glyph, try to find it in the font
        if (!diacriticGlyph && font) {
          const diacriticType = getDiacriticType(char);
          if (diacriticType) {
            // Map diacritic type to common glyph names
            const nameMap: Record<string, string> = {
              acute: 'acute',
              caron: 'caron',
              ring: 'ring',
              diaeresis: 'dieresis',
              circumflex: 'circumflex',
              apostrophe: 'caron' // fallback
            };
            const name = nameMap[diacriticType];
            if (name) {
              try {
                diacriticGlyph = font.nameToGlyph(name);
              } catch (e) {
                // Ignore
              }
            }
            
            // Fallback: try to find diacritic from corresponding lowercase char
            if (!diacriticGlyph) {
              const lowerChar = char.toLowerCase();
              if (chars[lowerChar] && chars[lowerChar].diacriticGlyph) {
                diacriticGlyph = chars[lowerChar].diacriticGlyph;
              }
            }
          }
        }

        if (diacriticGlyph) {
          const diacriticType = getDiacriticType(char);
          if (diacriticType) {
            const autoTransform = calculateAutoTransform(info.baseGlyph, diacriticType, diacriticGlyph, false, font, info.diacriticTransform?.flipY);
            if (info.diacriticTransform?.flipY) autoTransform.flipY = true;
            if (info.diacriticTransform?.flipX) autoTransform.flipX = true;
            
            updates[char] = {
              status: 'generated',
              diacriticGlyph: diacriticGlyph,
              diacriticTransform: autoTransform
            };
            changed = true;
          }
        }
      }
    });

    if (changed) {
      batchUpdateChars(updates);
    }
  }, [chars, batchUpdateChars, font]);

  const autoFixAll = useCallback(() => {
    const updates: Record<string, Partial<CharInfo>> = {};
    let changed = false;

    Object.keys(chars).forEach(char => {
      const info = chars[char];
      let currentStatus = info.status;
      let currentAdvance = info.advanceWidth;
      let currentTransform = info.diacriticTransform;
      let currentSvg = info.svgDiacritic;
      let currentGlyph = info.glyph;
      let charChanged = false;

      // 1. Doplniť chýbajúce (Generate missing)
      if (currentStatus === 'missing' && info.baseGlyph) {
        const diacriticType = getDiacriticType(char);
        if (diacriticType) {
          if (info.diacriticGlyph) {
            const autoTransform = calculateAutoTransform(info.baseGlyph, diacriticType, info.diacriticGlyph, false, font || undefined, info.diacriticTransform?.flipY);
            if (info.diacriticTransform?.flipY) autoTransform.flipY = true;
            if (info.diacriticTransform?.flipX) autoTransform.flipX = true;
            currentTransform = autoTransform;
            currentStatus = 'generated';
            charChanged = true;
          } else {
            // Fallback to SVG diacritic if no glyph is available in font
            const style: FontStyle = 'sans-serif'; // Default style
            const svgPath = SVG_DIACRITICS[style][diacriticType];
            const autoTransform = calculateAutoTransform(info.baseGlyph, diacriticType, undefined, true, font || undefined);
            currentTransform = autoTransform;
            currentSvg = { path: svgPath, style };
            currentStatus = 'edited';
            charChanged = true;
          }
        }
      }

      // 2. Zložiť všetky znaky (Compose all)
      if (currentStatus === 'generated' && info.baseGlyph && info.diacriticGlyph) {
        currentStatus = 'edited';
        currentSvg = undefined;
        charChanged = true;
      }

      // 3. Vyčistiť všetky (Clean glyphs)
      if (info.anomalies && (info.anomalies.includes('Malé izolované časti') || info.anomalies.includes('Prekrývajúce sa alebo zložité cesty'))) {
        if (currentGlyph) {
          try {
            const scope = new paper.PaperScope();
            scope.setup(new paper.Size(1000, 1000));
            const pathData = currentGlyph.path.toPathData(2);
            const item = scope.project.activeLayer.importSVG(`<path d="${pathData}" />`);
            if (item) {
              let united: any = item;
              if (item instanceof scope.Group || item instanceof scope.CompoundPath) {
                const children = [...item.children];
                if (children.length > 1) {
                  united = children[0];
                  for (let i = 1; i < children.length; i++) {
                    if (typeof (united as any).unite === 'function') {
                      united = (united as any).unite(children[i]);
                    }
                  }
                }
              }
              const newPathData = united.exportSVG({ asString: true }) as string;
              const match = newPathData.match(/d="([^"]+)"/);
              if (match && match[1]) {
                const newCommands = svgPathToCommands(match[1]);
                const newGlyph = new opentype.Glyph({
                  name: currentGlyph.name,
                  unicode: currentGlyph.unicode,
                  unicodes: currentGlyph.unicodes,
                  advanceWidth: currentGlyph.advanceWidth,
                  path: new opentype.Path()
                });
                newGlyph.path.commands = newCommands;
                currentGlyph = newGlyph;
                charChanged = true;
              }
            }
          } catch (e) {
            console.error('Error in cleanGlyphPaths during autoFixAll:', e);
          }
        }
      }

      // 4. Opraviť medzery (Fix side bearings)
      if ((currentStatus === 'edited' || currentStatus === 'generated') && info.baseGlyph) {
        if (currentAdvance !== info.baseGlyph.advanceWidth) {
          currentAdvance = info.baseGlyph.advanceWidth;
          charChanged = true;
        }
      }

      if (charChanged) {
        updates[char] = {
          status: currentStatus,
          advanceWidth: currentAdvance,
          diacriticTransform: currentTransform,
          svgDiacritic: currentSvg,
          glyph: currentGlyph
        };
        changed = true;
      }
    });

    if (changed) {
      batchUpdateChars(updates);
    }
  }, [chars, batchUpdateChars]);

  const applySourceToAll = useCallback((sourceChar: string) => {
    if (!font) return;
    const sourceInfo = chars[sourceChar];
    if (!sourceInfo) return;

    const diacriticType = getDiacriticType(sourceChar);
    if (!diacriticType) return;

    const newChars = { ...chars };
    let changed = false;

    for (const char of SINGLE_CHARS) {
      if (char === sourceChar) continue;
      
      const targetType = getDiacriticType(char);
      if (!targetType || targetType !== diacriticType) continue;

      const recipe = CHAR_RECIPES[char];
      if (!recipe) continue;

      const info = newChars[char];
      
      if (sourceInfo.svgDiacritic) {
        const style = sourceInfo.svgDiacritic.style as FontStyle | 'custom';
        if (info.baseGlyph) {
          const svgPath = style === 'custom' ? sourceInfo.svgDiacritic.path : SVG_DIACRITICS[style as FontStyle][diacriticType];
          const autoTransform = calculateAutoTransform(info.baseGlyph, diacriticType, undefined, true, font);
          
          if (sourceInfo.diacriticTransform?.flipY) autoTransform.flipY = true;
          if (sourceInfo.diacriticTransform?.flipX) autoTransform.flipX = true;

          newChars[char] = {
            ...info,
            status: 'edited',
            diacriticSource: 'svg',
            svgDiacritic: { path: svgPath, style: style as string },
            diacriticTransform: autoTransform
          };
          changed = true;
        }
      } else if (sourceInfo.diacriticGlyph) {
        if (info.baseGlyph) {
          const autoTransform = calculateAutoTransform(info.baseGlyph, diacriticType, sourceInfo.diacriticGlyph, false, font, sourceInfo.diacriticTransform?.flipY);
          
          // If the source has a flipped transform (e.g. caron from circumflex), carry over the flip
          if (sourceInfo.diacriticTransform?.flipY) {
            autoTransform.flipY = true;
          }
          if (sourceInfo.diacriticTransform?.flipX) {
            autoTransform.flipX = true;
          }

          newChars[char] = {
            ...info,
            svgDiacritic: undefined,
            status: 'edited',
            diacriticSource: sourceInfo.diacriticSource || 'glyph',
            diacriticGlyph: sourceInfo.diacriticGlyph,
            diacriticTransform: autoTransform
          };
          changed = true;
        }
      } else if (sourceInfo.status === 'ok' && sourceInfo.diacriticSource === 'original') {
         if (font.charToGlyphIndex(char) > 0) {
           newChars[char] = {
             ...info,
             svgDiacritic: undefined,
             status: 'ok',
             diacriticSource: 'original'
           };
           changed = true;
         }
      }
    }

    if (changed) {
      saveHistory(newChars);
    }
  }, [chars, font, saveHistory]);

  const applyTransformToAll = useCallback((sourceChar: string) => {
    const sourceInfo = chars[sourceChar];
    if (!sourceInfo || !sourceInfo.diacriticTransform || !sourceInfo.baseGlyph) return;

    const diacriticType = getDiacriticType(sourceChar);
    if (!diacriticType) return;

    const sourceAuto = calculateAutoTransform(
      sourceInfo.baseGlyph, 
      diacriticType, 
      sourceInfo.diacriticGlyph, 
      !!sourceInfo.svgDiacritic,
      font,
      sourceInfo.diacriticTransform?.flipY
    );

    const offsetX = sourceInfo.diacriticTransform.x - sourceAuto.x;
    const offsetY = sourceInfo.diacriticTransform.y - sourceAuto.y;
    
    // Calculate proportional offsets based on reference height (capHeight vs xHeight)
    // and reference width (baseWidth)
    const relOffsetX = offsetX / (sourceAuto.baseWidth || 500);
    const relOffsetY = offsetY / (sourceAuto.referenceTop || 700);
    
    const relScaleX = sourceInfo.diacriticTransform.scaleX / (sourceAuto.scaleX || 1);
    const relScaleY = sourceInfo.diacriticTransform.scaleY / (sourceAuto.scaleY || 1);

    const newChars = { ...chars };
    let changed = false;

    for (const char of SINGLE_CHARS) {
      if (char === sourceChar) continue;
      const targetInfo = newChars[char];
      if (!targetInfo || !targetInfo.baseGlyph) continue;

      const targetType = getDiacriticType(char);
      if (!targetType || targetType !== diacriticType) continue;

      const targetAuto = calculateAutoTransform(
        targetInfo.baseGlyph, 
        targetType, 
        targetInfo.diacriticGlyph, 
        !!targetInfo.svgDiacritic,
        font,
        targetInfo.diacriticTransform?.flipY
      );

      // Apply proportional offsets
      const adjustedOffsetX = relOffsetX * (targetAuto.baseWidth || 500);
      const adjustedOffsetY = relOffsetY * (targetAuto.referenceTop || 700);

      newChars[char] = {
        ...targetInfo,
        status: targetInfo.status === 'ok' ? 'edited' : targetInfo.status,
        diacriticTransform: {
          x: targetAuto.x + adjustedOffsetX,
          y: targetAuto.y + adjustedOffsetY,
          scaleX: targetAuto.scaleX * relScaleX,
          scaleY: targetAuto.scaleY * relScaleY,
          rotation: sourceInfo.diacriticTransform.rotation,
          skewX: sourceInfo.diacriticTransform.skewX,
          skewY: sourceInfo.diacriticTransform.skewY,
          flipX: sourceInfo.diacriticTransform.flipX,
          flipY: sourceInfo.diacriticTransform.flipY
        }
      };
      changed = true;
    }

    if (changed) {
      saveHistory(newChars);
    }
  }, [chars, saveHistory]);

  const applyLibraryDiacritic = useCallback((diacritic: LibraryDiacritic, char: string) => {
    if (!font) return;
    const info = chars[char];
    if (!info) return;

    const diacriticType = getDiacriticType(char);
    const autoTransform = info.baseGlyph 
      ? calculateAutoTransform(info.baseGlyph, diacriticType || 'acute', undefined, true, font) 
      : { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, referenceTop: 700, baseWidth: 500 };

    const newChars = { ...chars };
    newChars[char] = {
      ...info,
      status: 'edited',
      diacriticSource: 'svg',
      svgDiacritic: { path: diacritic.path, style: 'custom' },
      diacriticTransform: autoTransform
    };
    saveHistory(newChars);
  }, [chars, font, saveHistory]);

  const saveCurrentDiacriticToLibrary = useCallback(async (name: string) => {
    try {
      if (!selectedChar || !chars[selectedChar]) return;
      const info = chars[selectedChar];
      
      let path = '';
      let type: 'svg' | 'glyph' = 'svg';
      if (info.svgDiacritic) {
        path = info.svgDiacritic.path;
        type = 'svg';
      } else if (info.diacriticGlyph && font) {
        path = info.diacriticGlyph.getPath(0, 0, font.unitsPerEm, undefined, font).toPathData(2);
        type = 'glyph';
      } else {
        console.warn("No diacritic to save");
        return;
      }
      
      await db.saveToLibrary({
        name,
        path,
        type
      });
      // Immediately reload library to update UI
      await loadLibrary();
    } catch (error) {
      console.error("Error saving diacritic to library:", error);
      alert("Chyba pri ukladaní diakritiky: " + (error instanceof Error ? error.message : String(error)));
    }
  }, [selectedChar, chars, font, loadLibrary]);

  const applyOtherDiacriticFromFont = useCallback((diacriticName: string, char: string) => {
    if (!font) return;
    const info = chars[char];
    
    // Try to get glyph by name first, fallback to iterating if nameToGlyph is not available
    let diacriticGlyph = null;
    if (typeof font.nameToGlyph === 'function') {
      try {
        diacriticGlyph = font.nameToGlyph(diacriticName);
      } catch (e) {
        // Ignore error
      }
    }
    
    if (!diacriticGlyph) {
      // Fallback: search in glyphs
      for (let i = 0; i < font.glyphs.length; i++) {
        const g = font.glyphs.get(i);
        if (g.name === diacriticName) {
          diacriticGlyph = g;
          break;
        }
      }
    }

    if (!info || !diacriticGlyph) return;

    const autoTransform = info.baseGlyph 
      ? calculateAutoTransform(info.baseGlyph, 'acute', diacriticGlyph, false, font) 
      : { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, referenceTop: 700, baseWidth: 500 };

    const newChars = { ...chars };
    newChars[char] = {
      ...info,
      status: 'edited',
      diacriticSource: 'glyph',
      diacriticGlyph: diacriticGlyph,
      diacriticTransform: autoTransform
    };
    saveHistory(newChars);
  }, [chars, font, saveHistory]);

  const applyDiacriticFromChar = useCallback((sourceChar: string, targetChar: string) => {
    const sourceInfo = chars[sourceChar];
    const targetInfo = chars[targetChar];
    if (!sourceInfo || !sourceInfo.diacriticGlyph || !targetInfo) return;

    const diacriticType = getDiacriticType(sourceChar) || 'acute';
    const autoTransform = targetInfo.baseGlyph 
      ? calculateAutoTransform(targetInfo.baseGlyph, diacriticType, sourceInfo.diacriticGlyph, false, font || undefined, sourceInfo.diacriticTransform?.flipY) 
      : { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, flipX: false, flipY: false, referenceTop: 700, baseWidth: 500 };
    
    if (sourceInfo.diacriticTransform?.flipY) autoTransform.flipY = true;
    if (sourceInfo.diacriticTransform?.flipX) autoTransform.flipX = true;

    const newChars = { ...chars };
    newChars[targetChar] = {
      ...targetInfo,
      status: 'edited',
      diacriticSource: 'glyph',
      diacriticGlyph: sourceInfo.diacriticGlyph,
      diacriticTransform: autoTransform
    };
    saveHistory(newChars);
  }, [chars, saveHistory]);

  const fixSideBearings = useCallback((char?: string) => {
    const newChars = { ...chars };
    let changed = false;

    if (char) {
      const info = newChars[char];
      if (info && info.baseGlyph) {
        info.advanceWidth = info.baseGlyph.advanceWidth;
        changed = true;
      }
    } else {
      Object.keys(newChars).forEach(c => {
        const info = newChars[c];
        if ((info.status === 'edited' || info.status === 'generated') && info.baseGlyph) {
          info.advanceWidth = info.baseGlyph.advanceWidth;
          changed = true;
        }
      });
    }

    if (changed) {
      saveHistory(newChars);
    }
  }, [chars, saveHistory]);

  const deleteLibraryDiacritic = useCallback(async (id: string) => {
    await db.deleteFromLibrary(id);
    loadLibrary();
  }, [loadLibrary]);

  const deleteProject = useCallback(async (id: string, e: React.MouseEvent, onDeleted: () => Promise<void>) => {
    e.stopPropagation();
    await db.deleteProject(id);
    await onDeleted();
  }, []);

  return {
    font,
    slaveFonts,
    fontName,
    chars,
    selectedChar,
    setSelectedChar,
    loadFont: loadFonts,
    loadProject,
    deleteProject,
    closeProject,
    updateCharTransform,
    updateAdvanceWidth,
    updateEraserPaths,
    scaleToLowercase,
    updateCharProperty,
    batchUpdateChars,
    batchScaleToLowercase,
    exportJSON,
    importJSON,
    exportFont,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    hasUnsavedChanges,
    isBatchApplying,
    isExporting,
    exportingChar,
    exportProgress,
    applySvgStyle,
    applySourceToAll,
    applyTransformToAll,
    runBatchApply,
    autoFixAll,
    cleanGlyphPaths,
    batchGenerateMissing,
    batchCleanGlyphs,
    libraryDiacritics,
    applyLibraryDiacritic,
    applyOtherDiacriticFromFont,
    applyDiacriticFromChar,
    fixSideBearings,
    saveCurrentDiacriticToLibrary,
    deleteLibraryDiacritic
  };
}
