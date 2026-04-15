import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as opentype from 'opentype.js';
import { CharInfo } from '../hooks/useFontEditor';

interface TextTesterProps {
  font: opentype.Font;
  chars: Record<string, CharInfo>;
  stylisticAdaptation: boolean;
  sizeFilter: 'all' | 'heading' | 'body' | 'micro';
  wrapText: boolean;
  globalShiftX?: number;
  selectedChar?: string;
  activeDragTransform?: { x: number, y: number } | null;
  activeDragTarget?: 'diacritic' | 'base' | null;
}

const DIACRITICS_TEXT = "Á Ä Č Ď É Ě Í Ĺ Ľ Ň Ó Ô Ŕ Ř Š Ť Ú Ů Ý Ž á ä č ď é ě í ĺ ľ ň ó ô ŕ ř š ť ú ů ý ž";
const TEST_TEXT = "Vypoj kŕdeľ šťastných dravcov zmäteným hučaním.";

export const TextTester = React.memo(({ font, chars, stylisticAdaptation, sizeFilter, wrapText, globalShiftX = 0, selectedChar, activeDragTransform, activeDragTarget }: TextTesterProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Debounce the chars update for the preview to keep it smooth during slider dragging
  const [debouncedChars, setDebouncedChars] = useState(chars);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        setContainerWidth((prev) => {
          // Only update if the width change is significant to avoid infinite loops with scrollbars
          if (Math.abs(prev - newWidth) > 15) {
            return newWidth;
          }
          return prev;
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedChars(chars);
    }, 50); // Small debounce to keep UI responsive
    return () => clearTimeout(handler);
  }, [chars]);

  const renderText = (text: string, fontSize: number) => {
    const scale = fontSize / font.unitsPerEm;
    const lineHeight = (font.ascender - font.descender) * scale * 1.2;
    const maxWidth = wrapText ? Math.max(200, containerWidth - 64) : Infinity;
    
    let currentX = 0;
    let currentY = font.ascender * scale;
    
    const elements: React.ReactNode[] = [];
    const spaceAdvance = font.charToGlyph(' ').advanceWidth * scale;

    const words = text.split(' ');

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      let wordWidth = 0;
      const wordGlyphs: { basePath: string, diacriticPath: string, transform: any, baseTransform: any, advance: number, char: string, eraserPaths?: { path: string, size: number }[], isScaledToLowercase?: boolean, hasOverlap?: boolean }[] = [];

      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const info = debouncedChars[char];
        let advance = 0;
        let basePath = '';
        let diacriticPath = '';
        let transform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, flipX: false, flipY: false };
        let baseTransform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0, flipX: false, flipY: false };
        
        let isScaledToLowercase = false;
        let hasOverlap = false;

        if (info && (info.status === 'edited' || info.status === 'generated' || info.status === 'ok')) {
          advance = (info.advanceWidth !== undefined ? info.advanceWidth : (info.glyph?.advanceWidth || info.baseGlyph?.advanceWidth || 0)) * scale;
          const getPathD = (glyph: opentype.Glyph) => glyph.getPath(0, 0, font.unitsPerEm, undefined, font).toPathData(2);
          basePath = info.status === 'ok' && info.glyph ? getPathD(info.glyph) : (info.baseGlyph ? getPathD(info.baseGlyph) : '');
          diacriticPath = info.svgDiacritic ? info.svgDiacritic.path : (info.diacriticGlyph ? getPathD(info.diacriticGlyph) : '');
          if (info.diacriticTransform) transform = { ...transform, ...info.diacriticTransform };
          if (info.baseTransform) baseTransform = { ...baseTransform, ...info.baseTransform };
          
          // Apply active drag transform if this char is being dragged
          if (char === selectedChar && activeDragTransform) {
            if (activeDragTarget === 'diacritic') {
              transform.x = activeDragTransform.x;
              transform.y = activeDragTransform.y;
            } else if (activeDragTarget === 'base') {
              baseTransform.x = activeDragTransform.x;
              baseTransform.y = activeDragTransform.y;
            }
          }
          
          isScaledToLowercase = !!info.isScaledToLowercase;
          hasOverlap = !!info.anomalies?.includes('Diakritika sa prekrýva so základným znakom');
        } else {
          const glyph = font.charToGlyph(char);
          advance = glyph.advanceWidth * scale;
          basePath = glyph.getPath(0, 0, font.unitsPerEm, undefined, font).toPathData(2);
        }
        
        if (isScaledToLowercase) {
          const xHeight = (font as any)?.tables?.os2?.sxHeight || (font?.ascender || 800) * 0.65;
          const capHeight = (font as any)?.tables?.os2?.sCapHeight || (font?.ascender || 800) * 0.9;
          const lowerScale = xHeight / capHeight;
          advance *= lowerScale;
        }

        wordGlyphs.push({ basePath, diacriticPath, transform, baseTransform, advance, char, eraserPaths: info?.eraserPaths, isScaledToLowercase, hasOverlap });
        wordWidth += advance;
      }

      if (wrapText && currentX + wordWidth > maxWidth && currentX > 0) {
        currentX = 0;
        currentY += lineHeight;
      }

      wordGlyphs.forEach((g, idx) => {
        const maskId = g.eraserPaths && g.eraserPaths.length > 0 ? `mask-${g.char}` : null;
        const isSelected = g.char === selectedChar;
        
        let finalScale = scale;
        if (g.isScaledToLowercase) {
          const xHeight = (font as any)?.tables?.os2?.sxHeight || (font?.ascender || 800) * 0.65;
          const capHeight = (font as any)?.tables?.os2?.sCapHeight || (font?.ascender || 800) * 0.9;
          finalScale *= (xHeight / capHeight);
        }

        elements.push(
          <g key={`${w}-${idx}`} transform={`translate(${currentX}, ${currentY}) scale(${finalScale})`}>
            {g.hasOverlap && (
              <rect 
                x={0} 
                y={-font.ascender} 
                width={g.advance / finalScale} 
                height={font.ascender - font.descender} 
                fill="rgba(244, 63, 94, 0.2)" 
              />
            )}
            {g.basePath && (
              <g transform={`translate(${g.baseTransform.x}, ${-g.baseTransform.y}) rotate(${g.baseTransform.rotation || 0}) skewX(${g.baseTransform.skewX || 0}) skewY(${g.baseTransform.skewY || 0}) scale(${g.baseTransform.scaleX * (g.baseTransform.flipX ? -1 : 1)}, ${g.baseTransform.scaleY * (g.baseTransform.flipY ? -1 : 1)})`}>
                <path d={g.basePath} fill={isSelected ? "#6366f1" : "currentColor"} mask={maskId ? `url(#${maskId})` : undefined} />
              </g>
            )}
            {g.diacriticPath && (
              <g 
                transform={`translate(${g.transform.x + globalShiftX}, ${-g.transform.y}) rotate(${g.transform.rotation || 0}) skewX(${g.transform.skewX || 0}) skewY(${g.transform.skewY || 0}) scale(${g.transform.scaleX * (g.transform.flipX ? -1 : 1)}, ${g.transform.scaleY * (g.transform.flipY ? -1 : 1)})`}
                filter={stylisticAdaptation ? "url(#stylistic-adaptation-filter)" : undefined}
              >
                <path d={g.diacriticPath} fill={isSelected ? "#6366f1" : "currentColor"} />
              </g>
            )}
          </g>
        );
        currentX += g.advance;
      });

      currentX += spaceAdvance;
    }

    return { 
      elements, 
      totalWidth: wrapText ? maxWidth : currentX, 
      totalHeight: currentY + Math.abs(font.descender * scale) 
    };
  };

  const renderFullPreview = (fontSize: number) => {
    const diacritics = renderText(DIACRITICS_TEXT, fontSize);
    const test = renderText(TEST_TEXT, fontSize);
    
    return {
      elements: (
        <>
          <g>{diacritics.elements}</g>
          <g transform={`translate(0, ${diacritics.totalHeight + 20})`}>{test.elements}</g>
        </>
      ),
      totalWidth: Math.max(diacritics.totalWidth, test.totalWidth),
      totalHeight: diacritics.totalHeight + 20 + test.totalHeight
    };
  };

  const largeText = useMemo(() => renderFullPreview(64), [font, debouncedChars, stylisticAdaptation, wrapText, containerWidth, selectedChar]);
  const mediumText = useMemo(() => renderFullPreview(24), [font, debouncedChars, stylisticAdaptation, wrapText, containerWidth, selectedChar]);
  const smallText = useMemo(() => renderFullPreview(12), [font, debouncedChars, stylisticAdaptation, wrapText, containerWidth, selectedChar]);

  const showHeading = sizeFilter === 'all' || sizeFilter === 'heading';
  const showBody = sizeFilter === 'all' || sizeFilter === 'body';
  const showMicro = sizeFilter === 'all' || sizeFilter === 'micro';

  const maxTextWidth = Math.max(
    showHeading ? largeText.totalWidth : 0,
    showBody ? mediumText.totalWidth : 0,
    showMicro ? smallText.totalWidth : 0
  ) + 100;

  const totalHeight = (showHeading ? largeText.totalHeight + 60 : 0) +
                      (showBody ? mediumText.totalHeight + 60 : 0) +
                      (showMicro ? smallText.totalHeight + 60 : 0) + 40;

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto bg-zinc-950 p-8 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
      <svg 
        width={maxTextWidth} 
        height={totalHeight} 
        className="text-zinc-200"
        style={{ minWidth: '100%' }}
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

          {Object.entries(debouncedChars).map(([char, info]) => {
            if (!info.eraserPaths || info.eraserPaths.length === 0) return null;
            return (
              <mask key={`mask-${char}`} id={`mask-${char}`}>
                <rect x="-2000" y="-2000" width="6000" height="6000" fill="white" />
                {info.eraserPaths.map((stroke, i) => (
                  <path key={i} d={stroke.path} fill="none" stroke="black" strokeWidth={stroke.size} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </mask>
            );
          })}
        </defs>
        
        {showHeading && (
          <g transform="translate(0, 20)">
            <g transform="translate(0, 0)">
              {largeText.elements}
            </g>
          </g>
        )}

        {showBody && (
          <g transform={`translate(0, ${showHeading ? largeText.totalHeight + 40 : 20})`}>
            <g transform="translate(0, 0)">
              {mediumText.elements}
            </g>
          </g>
        )}

        {showMicro && (
          <g transform={`translate(0, ${(showHeading ? largeText.totalHeight + 40 : 0) + (showBody ? mediumText.totalHeight + 40 : 0) + 20})`}>
            <g transform="translate(0, 0)">
              {smallText.elements}
            </g>
          </g>
        )}
      </svg>
    </div>
  );
});
