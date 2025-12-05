/**
 * Text Layout Engine - Calculates text positioning and rendering
 */

import { TextSpan, DefaultStyle } from '../types';
import { toTitleCase } from './utils';

export interface ContainerProps {
  align: 'left' | 'center' | 'right' | 'justify';
  paragraphSpacing: number;
  listType: 'none' | 'bullet' | 'number';
  listIndent: number;
  defaultStyle: DefaultStyle;
}

export interface LayoutResult {
  lines: any[];
  totalHeight: number;
  charPositions: any[];
  backgrounds: any[];
  decorations: any[];
  listMarkers: any[];
  totalLength: number;
}

export const TextLayoutEngine = {
  getTransformedText: (text: string, transform: string): string => {
    if (!text) return "";
    switch (transform) {
      case 'uppercase': return text.toUpperCase();
      case 'lowercase': return text.toLowerCase();
      case 'capitalize': return toTitleCase(text);
      default: return text;
    }
  },

  measureText: (ctx: CanvasRenderingContext2D, text: string, style: TextSpan) => {
    const fontStyle = style.isItalic ? "italic" : "normal";
    const fontWeight = style.isBold ? "bold" : "normal";
    ctx.font = `${fontStyle} ${fontWeight} ${style.fontSize || 24}px ${style.fontFamily || 'Arial'}`;
    
    const transformedText = TextLayoutEngine.getTransformedText(text, style.textTransform || 'none');
    const metrics = ctx.measureText(transformedText);
    
    const letterSpacing = style.letterSpacing || 0;
    const width = metrics.width + (transformedText.length * letterSpacing);
    const lineHeightMultiplier = style.lineHeight || 1.2;
    const height = (style.fontSize || 24) * lineHeightMultiplier;

    return {
      width: width,
      height: height,
      fontSize: style.fontSize || 24, 
      rawWidth: metrics.width,
      baseline: metrics.actualBoundingBoxAscent || (style.fontSize || 24) * 0.8,
      text: transformedText 
    };
  },

  calculateLayout: (ctx: CanvasRenderingContext2D, valueList: TextSpan[], containerWidth: number, containerProps: ContainerProps): LayoutResult => {
    const { align: defaultAlign, paragraphSpacing, listType, listIndent } = containerProps;
    
    const lines: any[] = [];
    let currentLine: any = { 
      elements: [], width: 0, height: 0, fontSize: 0, 
      startIndex: 0, isHardReturn: false, spaceCount: 0 
    };
    let globalCharIndex = 0;
    const charPositions: any[] = []; 
    const backgrounds: any[] = [];
    const decorations: any[] = [];
    const listMarkers: any[] = [];

    const baseIndent = listType !== 'none' ? 25 + (listIndent || 0) * 20 : 0;
    const effectiveWidth = Math.max(10, containerWidth - baseIndent);

    let lineIndexForList = 1;

    valueList.forEach((span) => {
      const parts = span.text.split(/(\n)/g);
      
      parts.forEach((part) => {
        if (part === '\n') {
          currentLine.endIndex = globalCharIndex;
          currentLine.isHardReturn = true; 
          lines.push(currentLine);
          globalCharIndex += 1; 
          currentLine = { elements: [], width: 0, height: 0, startIndex: globalCharIndex, isHardReturn: false, spaceCount: 0 };
          return;
        }
        
        if (part.length === 0) return;
        
        const words = part.split(/(\s+)/);

        words.forEach(word => {
          if (word.length === 0) return;
          
          const metrics = TextLayoutEngine.measureText(ctx, word, span);
          const isSpace = /^\s+$/.test(word);

          if (!isSpace && currentLine.elements.length > 0 && currentLine.width + metrics.width > effectiveWidth) {
            currentLine.endIndex = globalCharIndex;
            currentLine.isHardReturn = false; 
            lines.push(currentLine);
            currentLine = { elements: [], width: 0, height: 0, startIndex: globalCharIndex, isHardReturn: false, spaceCount: 0 };
          }

          if (isSpace) currentLine.spaceCount++;

          currentLine.elements.push({
            originalText: word,
            renderedText: metrics.text,
            style: span,
            width: metrics.width,
            height: metrics.height,
            fontSize: metrics.fontSize,
            startIndex: globalCharIndex,
            metrics: metrics,
            isSpace: isSpace
          });

          currentLine.width += metrics.width;
          currentLine.height = Math.max(currentLine.height, metrics.height);
          currentLine.fontSize = Math.max(currentLine.fontSize, metrics.fontSize);
          globalCharIndex += word.length;
        });
      });
    });
    
    currentLine.endIndex = globalCharIndex;
    lines.push(currentLine);

    let currentY = 0;
    
    lines.forEach((line, lineIndex) => {
      if (line.height === 0) line.height = 24; 
      if (line.fontSize === 0) line.fontSize = 24;

      const isListItemStart = lineIndex === 0 || (lines[lineIndex - 1] && lines[lineIndex - 1].isHardReturn);

      let startX = baseIndent;
      let extraSpacePerSpace = 0;

      if (defaultAlign === 'center') {
        startX = (containerWidth - line.width) / 2;
      } else if (defaultAlign === 'right') {
        startX = containerWidth - line.width;
      } else if (defaultAlign === 'justify' && !line.isHardReturn && lineIndex !== lines.length - 1) {
        if (line.spaceCount > 0) {
          const remainingSpace = effectiveWidth - line.width;
          extraSpacePerSpace = remainingSpace / line.spaceCount;
        }
      }

      if (listType !== 'none' && isListItemStart && line.elements.length > 0) {
        const firstStyle = line.elements[0].style;
        const markerX = (listIndent || 0) * 20; 
        
        let markerText = "";
        if (listType === 'bullet') markerText = "•";
        if (listType === 'number') markerText = `${lineIndexForList}.`;
        
        listMarkers.push({
          text: markerText,
          x: markerX,
          y: currentY,
          fontSize: firstStyle.fontSize,
          fontFamily: firstStyle.fontFamily,
          color: firstStyle.fill,
          height: line.height
        });
        lineIndexForList++;
      } else if (isListItemStart && line.elements.length === 0) {
        lineIndexForList++;
      }

      let currentX = startX;
      
      line.elements.forEach(el => {
        const letterSpacing = el.style.letterSpacing || 0;
        let wordWidth = el.width;
        
        if (el.isSpace) {
          wordWidth += extraSpacePerSpace;
        }

        if (el.style.backgroundColor) {
          backgrounds.push({
            x: currentX,
            y: currentY,
            width: wordWidth, 
            height: line.height,
            fill: el.style.backgroundColor
          });
        }

        if (el.style.isUnderline) {
          decorations.push({
            type: 'underline',
            x: currentX,
            y: currentY,
            width: wordWidth,
            fontSize: el.fontSize,
            color: el.style.fill
          });
        }
        if (el.style.isStrike) {
          decorations.push({
            type: 'line-through',
            x: currentX,
            y: currentY,
            width: wordWidth,
            fontSize: el.fontSize,
            color: el.style.fill
          });
        }

        const chars = el.originalText.split('');
        const renderedChars = el.renderedText.split(''); 
        let charX = currentX;
        
        const charExtra = el.isSpace ? extraSpacePerSpace / chars.length : 0;

        chars.forEach((char, i) => {
          const rChar = renderedChars[i] || char; 
          const tCharMetrics = TextLayoutEngine.measureText(ctx, rChar, el.style);
          const charWidth = tCharMetrics.rawWidth + letterSpacing + charExtra;

          charPositions.push({
            char: rChar, 
            originalChar: char,
            x: charX,
            y: currentY,
            width: charWidth,
            height: line.height,
            fontSize: el.fontSize,
            index: el.startIndex + i,
            lineIndex: lineIndex,
            style: el.style
          });
          charX += charWidth;
        });

        el.x = currentX;
        el.y = currentY;
        currentX += wordWidth;
      });
      
      line.y = currentY;
      line.x = startX;
      currentY += line.height;
      if (line.isHardReturn) currentY += (paragraphSpacing || 0);
    });

    return { 
      lines, 
      totalHeight: currentY, 
      charPositions,
      backgrounds,
      decorations,
      listMarkers,
      totalLength: globalCharIndex 
    };
  },

  calculateOptimalFontSize: (
    ctx: CanvasRenderingContext2D, 
    valueList: TextSpan[], 
    width: number, 
    height: number, 
    containerProps: ContainerProps
  ): number => {
    if (valueList.length === 0 || valueList.every(v => !v.text)) {
      return containerProps.defaultStyle.fontSize;
    }

    let low = 1;
    let high = 500; 
    let bestSize = 1;
    const tolerance = 0.5;
    let iterations = 0;
    
    while (low <= high && iterations < 50) {
      const mid = (low + high) / 2;
      const tempValueList = valueList.map(v => ({...v, fontSize: mid}));
      const layout = TextLayoutEngine.calculateLayout(ctx, tempValueList, width, containerProps);

      if (layout.totalHeight <= height) {
        bestSize = mid;
        low = mid + tolerance;
      } else {
        high = mid - tolerance;
      }
      iterations++;
    }
    return Math.floor(bestSize);
  },

  getCharIndexFromPos: (x: number, y: number, layout: LayoutResult): number => {
    let line = layout.lines.find((l: any) => y >= l.y && y < l.y + l.height); 
    if (!line) {
      if (y < layout.lines[0]?.y) return 0;
      if (y >= layout.totalHeight) return layout.totalLength;
      let minDist = Infinity;
      layout.lines.forEach((l: any) => {
        const dist = Math.abs(y - (l.y + l.height/2));
        if (dist < minDist) { minDist = dist; line = l; }
      });
    }
    if (!line) return 0;

    const charsInLine = layout.charPositions.filter((c: any) => c.lineIndex === layout.lines.indexOf(line));
    if (charsInLine.length === 0) return line.startIndex; 

    if (x < charsInLine[0].x) return charsInLine[0].index;
    
    const lastChar = charsInLine[charsInLine.length - 1];
    if (x > lastChar.x + lastChar.width) return lastChar.index + 1;

    for (let c of charsInLine) {
      if (x >= c.x && x < c.x + c.width) {
        if (x > c.x + c.width / 2) return c.index + 1;
        return c.index;
      }
    }
    return lastChar.index + 1;
  },
  
  getWordRangeAt: (index: number, layout: LayoutResult): { start: number; end: number } => {
    const char = layout.charPositions.find((c: any) => c.index === index) || layout.charPositions.find((c: any) => c.index === index - 1);
    if (!char) return { start: 0, end: layout.totalLength };
    let start = index;
    for(let i = index - 1; i >= 0; i--) {
      const c = layout.charPositions.find((pos: any) => pos.index === i);
      if (!c || c.char.match(/\s/)) { start = i + 1; break; }
      start = i;
    }
    let end = index;
    for(let i = index; i < layout.totalLength; i++) {
      const c = layout.charPositions.find((pos: any) => pos.index === i);
      if (!c || c.char.match(/\s/)) { end = i; break; }
      end = i + 1;
    }
    return { start, end };
  },

  getLineRangeAt: (index: number, layout: LayoutResult): { start: number; end: number } => {
    const char = layout.charPositions.find((c: any) => c.index === index);
    const lineIndex = char ? char.lineIndex : layout.lines.findIndex((l: any) => index >= l.startIndex && index <= l.endIndex);
    if (lineIndex === -1) return { start: 0, end: layout.totalLength };
    const line = layout.lines[lineIndex];
    return { start: line.startIndex, end: line.endIndex };
  }
};

