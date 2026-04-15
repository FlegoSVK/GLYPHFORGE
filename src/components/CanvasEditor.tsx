import React, { useEffect, useRef, useState } from 'react';
import * as opentype from 'opentype.js';
import { CharInfo } from '../hooks/useFontEditor';
import { cn } from '../lib/utils';

interface CanvasEditorProps {
  font: opentype.Font;
  charInfo: CharInfo;
  onTransformChange: (transform: Partial<{ x: number; y: number; scaleX: number; scaleY: number; rotation: number; skewX: number; skewY: number; flipX: boolean; flipY: boolean }>, target?: 'diacritic' | 'base') => void;
  onEraserChange?: (paths: { path: string; size: number }[]) => void;
  activeTool?: 'select' | 'eraser';
  eraserSize?: number;
  stylisticAdaptation?: boolean;
  globalShiftX?: number;
  showHeatmap?: boolean;
  editTarget?: 'diacritic' | 'base';
}

export function CanvasEditor({ 
  font, charInfo, onTransformChange, onEraserChange, 
  activeTool = 'select', eraserSize = 20, 
  stylisticAdaptation = false,
  globalShiftX = 0,
  showHeatmap = false,
  editTarget = 'diacritic'
}: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 1000 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragDelta, setDragDelta] = useState<{ dx: number, dy: number } | null>(null);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<string | null>(null);
  const [isErasing, setIsErasing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Font metrics
  const unitsPerEm = font.unitsPerEm;
  const ascender = font.ascender;
  const descender = font.descender;

  useEffect(() => {
    const resetView = () => {
      const width = unitsPerEm * 1.5;
      const height = unitsPerEm * 1.5;
      const x = -unitsPerEm * 0.25;
      const y = -ascender - (unitsPerEm * 0.25);
      setViewBox({ x, y, width, height });
    };

    // Center the glyph initially
    resetView();

    window.addEventListener('reset-canvas-view', resetView);
    return () => window.removeEventListener('reset-canvas-view', resetView);
  }, [font, charInfo.char, unitsPerEm, ascender]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(true);
      if (e.code === 'KeyV') { e.preventDefault(); window.dispatchEvent(new CustomEvent('set-tool', { detail: 'select' })); }
      if (e.code === 'KeyE') { e.preventDefault(); window.dispatchEvent(new CustomEvent('set-tool', { detail: 'eraser' })); }
      
      // Arrow keys for nudging
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        const step = e.shiftKey ? 50 : 10;
        const current = editTarget === 'base' 
          ? (charInfo.baseTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 })
          : (charInfo.diacriticTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 });
        
        if (e.code === 'ArrowUp') onTransformChange({ y: current.y + step }, editTarget);
        if (e.code === 'ArrowDown') onTransformChange({ y: current.y - step }, editTarget);
        if (e.code === 'ArrowLeft') onTransformChange({ x: current.x - step }, editTarget);
        if (e.code === 'ArrowRight') onTransformChange({ x: current.x + step }, editTarget);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [charInfo, onTransformChange]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    // Zoom towards center for now
    setViewBox(prev => ({
      x: prev.x - (prev.width * (zoomFactor - 1)) / 2,
      y: prev.y - (prev.height * (zoomFactor - 1)) / 2,
      width: prev.width * zoomFactor,
      height: prev.height * zoomFactor
    }));
  };

  const getSVGPoint = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return { x: 0, y: 0 };
    
    const pt = svg.createSVGPoint();
    if ('touches' in e) {
      pt.x = e.touches[0].clientX;
      pt.y = e.touches[0].clientY;
    } else {
      pt.x = (e as React.MouseEvent).clientX;
      pt.y = (e as React.MouseEvent).clientY;
    }
    const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: cursorPt.x, y: cursorPt.y };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent, target: 'bg' | 'diacritic' | 'base') => {
    const pt = getSVGPoint(e);
    
    if (activeTool === 'eraser') {
      setIsErasing(true);
      setCurrentStroke(`M ${pt.x} ${pt.y}`);
      return;
    }

    if (spacePressed || target === 'bg') {
      setIsPanning(true);
      setPanStart({ x: pt.x, y: pt.y });
    } else if (target === editTarget) {
      setIsDragging(true);
      setDragStart({ x: pt.x, y: pt.y });
      setDragDelta({ dx: 0, dy: 0 });
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getSVGPoint(e);

    if (activeTool === 'eraser') {
      setCursorPos({ x: pt.x, y: pt.y });
    } else {
      setCursorPos(null);
    }

    if (!isDragging && !isPanning && !isErasing) return;
    
    if (isErasing && currentStroke) {
      setCurrentStroke(prev => `${prev} L ${pt.x} ${pt.y}`);
      return;
    }

    if (isPanning) {
      const dx = pt.x - panStart.x;
      const dy = pt.y - panStart.y;
      setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    } else if (isDragging) {
      const dx = pt.x - dragStart.x;
      const dy = pt.y - dragStart.y;
      setDragDelta({ dx, dy });
    }
  };

  const handlePointerLeave = () => {
    setCursorPos(null);
    handlePointerUp();
  };

  const handlePointerUp = () => {
    if (isErasing && currentStroke && onEraserChange) {
      const newPaths = [...(charInfo.eraserPaths || []), { path: currentStroke, size: eraserSize }];
      onEraserChange(newPaths);
      setCurrentStroke(null);
    }
    if (isDragging && dragDelta) {
      const current = editTarget === 'base'
        ? (charInfo.baseTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 })
        : (charInfo.diacriticTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 });
        
      onTransformChange({
        x: current.x + dragDelta.dx,
        y: current.y - dragDelta.dy
      }, editTarget);
    }
    setIsDragging(false);
    setDragDelta(null);
    setIsPanning(false);
    setIsErasing(false);
  };

  // Extract paths
  const getPathD = (glyph: opentype.Glyph) => {
    const path = glyph.getPath(0, 0, unitsPerEm, undefined, font);
    return path.toPathData(2);
  };

  const basePath = charInfo.status === 'ok' && charInfo.glyph 
    ? getPathD(charInfo.glyph) 
    : (charInfo.baseGlyph ? getPathD(charInfo.baseGlyph) : '');
    
  const diacriticPath = charInfo.svgDiacritic 
    ? charInfo.svgDiacritic.path 
    : (charInfo.diacriticGlyph ? getPathD(charInfo.diacriticGlyph) : '');
  const transform = charInfo.diacriticTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 };
  const baseTransform = charInfo.baseTransform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 };

  const currentTransform = { ...transform };
  const currentBaseTransform = { ...baseTransform };

  if (isDragging && dragDelta) {
    if (editTarget === 'diacritic') {
      currentTransform.x += dragDelta.dx;
      currentTransform.y -= dragDelta.dy;
    } else if (editTarget === 'base') {
      currentBaseTransform.x += dragDelta.dx;
      currentBaseTransform.y -= dragDelta.dy;
    }
  }

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full relative ${spacePressed ? 'cursor-grab' : 'cursor-default'} ${isPanning ? 'cursor-grabbing' : ''}`}
      onWheel={handleWheel}
      onMouseDown={(e) => handlePointerDown(e, 'bg')}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerLeave}
      onTouchStart={(e) => handlePointerDown(e, 'bg')}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerLeave}
    >
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="absolute inset-0"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="stylistic-adaptation-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="1" result="blurred" />
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0 1" />
            </feComponentTransfer>
          </filter>

          <mask id="eraser-mask-base">
            <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="white" />
            {charInfo.eraserPaths?.map((stroke, i) => (
              <path key={i} d={stroke.path} fill="none" stroke="black" strokeWidth={stroke.size} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {currentStroke && (
              <path d={currentStroke} fill="none" stroke="black" strokeWidth={eraserSize} strokeLinecap="round" strokeLinejoin="round" />
            )}
          </mask>
        </defs>

        {/* Grid and Metrics */}
        <g className="text-zinc-800/30" strokeWidth={viewBox.width / 1000}>
          {/* Vertical sub-grid */}
          {Array.from({ length: 21 }).map((_, i) => {
            const x = (i - 10) * (unitsPerEm / 5);
            return <line key={`v-${i}`} x1={x} y1={-unitsPerEm*2} x2={x} y2={unitsPerEm*2} stroke="currentColor" />;
          })}
          {/* Horizontal sub-grid */}
          {Array.from({ length: 21 }).map((_, i) => {
            const y = (i - 10) * (unitsPerEm / 5);
            return <line key={`h-${i}`} x1={-unitsPerEm*2} y1={y} x2={unitsPerEm*3} y2={y} stroke="currentColor" />;
          })}
        </g>

        <g className="text-zinc-800" strokeWidth={viewBox.width / 500}>
          <line x1={-unitsPerEm*2} y1={0} x2={unitsPerEm*3} y2={0} stroke="currentColor" /> {/* Baseline */}
          <line x1={0} y1={-unitsPerEm*2} x2={0} y2={unitsPerEm*2} stroke="currentColor" /> {/* Origin Y */}
          <line x1={-unitsPerEm*2} y1={-ascender} x2={unitsPerEm*3} y2={-ascender} stroke="currentColor" strokeDasharray="5,5" /> {/* Ascender */}
          {charInfo.metrics?.xHeight && (
            <line x1={-unitsPerEm*2} y1={-charInfo.metrics.xHeight} x2={unitsPerEm*3} y2={-charInfo.metrics.xHeight} stroke="currentColor" strokeDasharray="2,2" opacity={0.5} />
          )}
          {charInfo.metrics?.capHeight && (
            <line x1={-unitsPerEm*2} y1={-charInfo.metrics.capHeight} x2={unitsPerEm*3} y2={-charInfo.metrics.capHeight} stroke="currentColor" strokeDasharray="2,2" opacity={0.5} />
          )}
          <line x1={-unitsPerEm*2} y1={-descender} x2={unitsPerEm*3} y2={-descender} stroke="currentColor" strokeDasharray="5,5" /> {/* Descender */}
          {/* Advance Width Line */}
          {charInfo.advanceWidth !== undefined && (
            <line x1={charInfo.advanceWidth} y1={-unitsPerEm*2} x2={charInfo.advanceWidth} y2={unitsPerEm*2} stroke="currentColor" strokeDasharray="5,5" />
          )}
        </g>

        {/* Heatmap Overlay */}
        {showHeatmap && (
          <g className="pointer-events-none">
            {/* Target Zone for Diacritics */}
            {charInfo.metrics && (
              <g opacity={0.15}>
                <title>Optimálna výška znaku (malé/veľké)</title>
                <rect 
                  x={0} 
                  y={-(charInfo.metrics.isLowercase ? charInfo.metrics.xHeight! : charInfo.metrics.capHeight!) - 100} 
                  width={charInfo.advanceWidth || 500} 
                  height={200} 
                  fill="#10b981" 
                  rx={20}
                />
                <text 
                  x={(charInfo.advanceWidth || 500) / 2} 
                  y={-(charInfo.metrics.isLowercase ? charInfo.metrics.xHeight! : charInfo.metrics.capHeight!) - 120} 
                  textAnchor="middle" 
                  className="text-[20px] fill-emerald-500 font-bold tracking-wide"
                >
                  OPTIMÁLNA VÝŠKA ({charInfo.metrics.isLowercase ? 'Malé písmená' : 'Veľké písmená'})
                </text>
              </g>
            )}

            {/* Sidebearings visualization */}
            <rect 
              x={-unitsPerEm} 
              y={-unitsPerEm * 1.5} 
              width={unitsPerEm} 
              height={unitsPerEm * 3} 
              fill="rgba(59, 130, 246, 0.03)" 
            />
            
            {/* LSB Indicator */}
            <rect 
              x={0} 
              y={-unitsPerEm * 1.5} 
              width={charInfo.metrics?.lsb || 0} 
              height={unitsPerEm * 3} 
              fill="rgba(59, 130, 246, 0.1)" 
            />
            {charInfo.metrics?.lsb !== undefined && (
              <text x={(charInfo.metrics.lsb) / 2} y={-ascender - 50} textAnchor="middle" className="text-[40px] fill-blue-400 font-mono">
                LSB: {Math.round(charInfo.metrics.lsb)}
              </text>
            )}
            
            {charInfo.advanceWidth !== undefined && (
              <>
                <rect 
                  x={charInfo.advanceWidth} 
                  y={-unitsPerEm * 1.5} 
                  width={unitsPerEm} 
                  height={unitsPerEm * 3} 
                  fill="rgba(59, 130, 246, 0.03)" 
                />
                {/* RSB Indicator */}
                <rect 
                  x={charInfo.advanceWidth - (charInfo.metrics?.rsb || 0)} 
                  y={-unitsPerEm * 1.5} 
                  width={charInfo.metrics?.rsb || 0} 
                  height={unitsPerEm * 3} 
                  fill="rgba(59, 130, 246, 0.1)" 
                />
                {charInfo.metrics?.rsb !== undefined && (
                  <text x={charInfo.advanceWidth - (charInfo.metrics.rsb / 2)} y={-ascender - 50} textAnchor="middle" className="text-[40px] fill-blue-400 font-mono">
                    RSB: {Math.round(charInfo.metrics.rsb)}
                  </text>
                )}
              </>
            )}

            {/* Density Heatmap (Real Hotspots) */}
            <defs>
              <radialGradient id="heatmap-density-grad">
                <stop offset="0%" stopColor="rgba(244, 63, 94, 0.6)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            
            {charInfo.metrics?.hotspots.map((hs, i) => (
              <circle 
                key={i} 
                cx={hs.x} 
                cy={hs.y} 
                r={unitsPerEm * 0.1 * hs.intensity} 
                fill="url(#heatmap-density-grad)" 
              />
            ))}

            {/* If no hotspots but heatmap is on, show some general info */}
            {(!charInfo.metrics?.hotspots || charInfo.metrics.hotspots.length === 0) && (
              <circle cx={(charInfo.advanceWidth || 500) / 2} cy={-ascender / 2} r={unitsPerEm * 0.05} fill="url(#heatmap-density-grad)" opacity={0.2} />
            )}
          </g>
        )}

        {/* Base Glyph */}
        {basePath && (charInfo.layerVisibility?.base ?? true) && (
          <g 
            mask="url(#eraser-mask-base)" 
            style={{ opacity: charInfo.layerOpacity?.base ?? 1 }}
            transform={`translate(${currentBaseTransform.x}, ${-currentBaseTransform.y}) rotate(${currentBaseTransform.rotation || 0}) skewX(${currentBaseTransform.skewX || 0}) skewY(${currentBaseTransform.skewY || 0}) scale(${currentBaseTransform.scaleX * (currentBaseTransform.flipX ? -1 : 1)}, ${currentBaseTransform.scaleY * (currentBaseTransform.flipY ? -1 : 1)})`}
            onMouseDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'base'); }}
            onTouchStart={(e) => { e.stopPropagation(); handlePointerDown(e, 'base'); }}
            className={spacePressed ? 'pointer-events-none' : (editTarget === 'base' ? 'cursor-move' : 'cursor-default')}
          >
            <path 
              d={basePath} 
              fill="currentColor" 
              className={editTarget === 'base' ? "text-zinc-200 hover:text-zinc-100 transition-colors duration-75" : "text-zinc-300"}
            />
            {/* Bounding box for easier grabbing */}
            <path 
              d={basePath} 
              fill="rgba(0,0,0,0)" 
              stroke="rgba(0,0,0,0)"
              strokeWidth={unitsPerEm * 0.2}
              style={{ pointerEvents: editTarget === 'base' ? 'all' : 'none' }}
            />
          </g>
        )}

        {/* Diacritic Glyph */}
        {diacriticPath && (charInfo.layerVisibility?.diacritic ?? true) && (
          <g 
            transform={`translate(${currentTransform.x + globalShiftX}, ${-currentTransform.y}) rotate(${currentTransform.rotation || 0}) skewX(${currentTransform.skewX || 0}) skewY(${currentTransform.skewY || 0}) scale(${currentTransform.scaleX * (currentTransform.flipX ? -1 : 1)}, ${currentTransform.scaleY * (currentTransform.flipY ? -1 : 1)})`}
            onMouseDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'diacritic'); }}
            onTouchStart={(e) => { e.stopPropagation(); handlePointerDown(e, 'diacritic'); }}
            className={spacePressed ? 'pointer-events-none' : (editTarget === 'diacritic' ? 'cursor-move' : 'cursor-default')}
            filter={stylisticAdaptation ? "url(#stylistic-adaptation-filter)" : undefined}
            style={{ opacity: charInfo.layerOpacity?.diacritic ?? 1 }}
          >
            <path 
              d={diacriticPath} 
              fill="currentColor" 
              className={editTarget === 'diacritic' ? "text-indigo-500 hover:text-indigo-400 transition-colors duration-75" : "text-indigo-500/80"}
            />
            {/* Bounding box for easier grabbing */}
            <path 
              d={diacriticPath} 
              fill="rgba(0,0,0,0)" 
              stroke="rgba(0,0,0,0)"
              strokeWidth={unitsPerEm * 0.2}
              style={{ pointerEvents: 'all' }}
            />
          </g>
        )}

        {/* Anomaly Highlights */}
        {showHeatmap && charInfo.anomalyHighlights && (
          <g className="pointer-events-none">
            {charInfo.anomalyHighlights.islands?.map((svg, i) => (
              <g key={`island-${i}`} dangerouslySetInnerHTML={{ __html: svg }} className="fill-rose-500/20 stroke-rose-500 stroke-[2]" />
            ))}
            {charInfo.anomalyHighlights.intersections?.map((svg, i) => (
              <g key={`inter-${i}`} dangerouslySetInnerHTML={{ __html: svg }} className="fill-amber-500/40 stroke-amber-500 stroke-[4]" />
            ))}
          </g>
        )}

        {/* Eraser Cursor Preview */}
        {activeTool === 'eraser' && cursorPos && (
          <circle
            cx={cursorPos.x}
            cy={cursorPos.y}
            r={(eraserSize || 20) / 2}
            fill="rgba(255, 255, 255, 0.2)"
            stroke="rgba(0, 0, 0, 0.5)"
            strokeWidth={viewBox.width / 1000}
            className="pointer-events-none"
          />
        )}
      </svg>
    </div>
  );
}
