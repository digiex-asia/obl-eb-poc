/**
 * Text Layout Engine for Rich Text Rendering
 * Adapted from TextEditor for GraphicEditor use
 */

import type { TextSpan } from '../../shared/model/types';

export interface CharPosition {
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  index: number;
  style: TextSpan;
}

export interface LineInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  startIndex: number;
  endIndex: number;
}

export interface Decoration {
  type: 'underline' | 'line-through';
  x: number;
  y: number;
  width: number;
  fontSize: number;
  color: string;
}

export interface Background {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export interface LayoutResult {
  lines: LineInfo[];
  charPositions: CharPosition[];
  decorations: Decoration[];
  backgrounds: Background[];
  totalHeight: number;
  totalLength: number;
}

export class TextLayoutEngine {
  /**
   * Calculate text layout for rendering
   */
  static calculateLayout(
    ctx: CanvasRenderingContext2D,
    valueList: TextSpan[],
    containerWidth: number,
    options: {
      align?: 'left' | 'center' | 'right' | 'justify';
      lineHeight?: number;
      letterSpacing?: number;
    } = {}
  ): LayoutResult {
    const { align = 'left', lineHeight = 1.2, letterSpacing = 0 } = options;

    const lines: LineInfo[] = [];
    const charPositions: CharPosition[] = [];
    const decorations: Decoration[] = [];
    const backgrounds: Background[] = [];

    let currentY = 0;
    let currentLineChars: CharPosition[] = [];
    let currentLineWidth = 0;
    let currentLineHeight = 0;
    let charIndex = 0;

    // Merge spans into a flat list of characters with their styles
    const chars: Array<{ char: string; style: TextSpan; index: number }> = [];
    valueList.forEach(span => {
      const text = span.text || '';
      for (let i = 0; i < text.length; i++) {
        chars.push({
          char: text[i],
          style: {
            text: text[i], // Required property
            fontSize: span.fontSize || 16,
            fontFamily: span.fontFamily || 'Arial',
            fill: span.fill || '#000000',
            isBold: span.isBold || false,
            isItalic: span.isItalic || false,
            isUnderline: span.isUnderline || false,
            isStrike: span.isStrike || false,
            backgroundColor: span.backgroundColor || null,
            letterSpacing: span.letterSpacing || letterSpacing,
            lineHeight: span.lineHeight || lineHeight,
          },
          index: charIndex++,
        });
      }
    });

    const finishLine = () => {
      if (currentLineChars.length === 0) return;

      // Calculate line metrics
      const lineStartX = 0;
      let lineWidth = currentLineWidth;

      // Apply alignment
      let offsetX = 0;
      if (align === 'center') {
        offsetX = (containerWidth - lineWidth) / 2;
      } else if (align === 'right') {
        offsetX = containerWidth - lineWidth;
      }

      // Update char positions with alignment offset
      currentLineChars.forEach(charPos => {
        charPos.x += offsetX;
      });

      // Add line info
      lines.push({
        x: lineStartX + offsetX,
        y: currentY,
        width: lineWidth,
        height: currentLineHeight,
        startIndex: currentLineChars[0].index,
        endIndex: currentLineChars[currentLineChars.length - 1].index,
      });

      // Move to next line
      currentY += currentLineHeight;
      currentLineChars = [];
      currentLineWidth = 0;
      currentLineHeight = 0;
    };

    let currentX = 0;

    for (let i = 0; i < chars.length; i++) {
      const { char, style, index } = chars[i];
      const fontSize = style.fontSize || 16;
      const fontFamily = style.fontFamily || 'Arial';
      const isBold = style.isBold || false;
      const isItalic = style.isItalic || false;
      const charLetterSpacing = style.letterSpacing || 0;
      const charLineHeight = style.lineHeight || lineHeight;

      // Set font for measurement
      const fontStyle = isItalic ? 'italic' : 'normal';
      const fontWeight = isBold ? 'bold' : 'normal';
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

      const charHeight = fontSize * charLineHeight;
      currentLineHeight = Math.max(currentLineHeight, charHeight);

      // Handle newlines
      if (char === '\n') {
        charPositions.push({
          char,
          x: currentX,
          y: currentY,
          width: 0,
          height: charHeight,
          fontSize,
          index,
          style,
        });
        currentLineChars.push(charPositions[charPositions.length - 1]);
        finishLine();
        currentX = 0;
        continue;
      }

      // Measure character
      const charWidth = ctx.measureText(char).width + charLetterSpacing;

      // Check if we need to wrap
      if (currentX + charWidth > containerWidth && currentLineChars.length > 0) {
        finishLine();
        currentX = 0;
      }

      // Add character position
      const charPos: CharPosition = {
        char,
        x: currentX,
        y: currentY,
        width: charWidth,
        height: charHeight,
        fontSize,
        index,
        style,
      };
      charPositions.push(charPos);
      currentLineChars.push(charPos);

      currentX += charWidth;
      currentLineWidth = currentX;
    }

    // Finish last line
    if (currentLineChars.length > 0) {
      finishLine();
    }

    // Generate decorations (underline, strikethrough) and backgrounds
    charPositions.forEach(charPos => {
      const { style, x, y, width, fontSize } = charPos;

      // Background
      if (style.backgroundColor) {
        backgrounds.push({
          x,
          y,
          width,
          height: charPos.height,
          fill: style.backgroundColor,
        });
      }

      // Decorations
      if (style.isUnderline) {
        decorations.push({
          type: 'underline',
          x,
          y,
          width,
          fontSize,
          color: style.fill || '#000000',
        });
      }
      if (style.isStrike) {
        decorations.push({
          type: 'line-through',
          x,
          y,
          width,
          fontSize,
          color: style.fill || '#000000',
        });
      }
    });

    return {
      lines,
      charPositions,
      decorations,
      backgrounds,
      totalHeight: currentY,
      totalLength: chars.length,
    };
  }

  /**
   * Get character index from mouse position
   */
  static getCharIndexFromPos(
    localX: number,
    localY: number,
    layout: LayoutResult
  ): number {
    if (!layout || layout.charPositions.length === 0) return 0;

    // Find the line
    let lineIndex = -1;
    for (let i = 0; i < layout.lines.length; i++) {
      const line = layout.lines[i];
      if (localY >= line.y && localY <= line.y + line.height) {
        lineIndex = i;
        break;
      }
    }

    // If below all lines, return end
    if (lineIndex === -1) {
      if (localY > layout.lines[layout.lines.length - 1].y) {
        return layout.totalLength;
      }
      lineIndex = 0;
    }

    const line = layout.lines[lineIndex];
    const lineChars = layout.charPositions.filter(
      c => c.index >= line.startIndex && c.index <= line.endIndex
    );

    if (lineChars.length === 0) return line.startIndex;

    // Find closest character
    for (let i = 0; i < lineChars.length; i++) {
      const charPos = lineChars[i];
      if (localX < charPos.x + charPos.width / 2) {
        return charPos.index;
      }
    }

    // After last char in line
    return lineChars[lineChars.length - 1].index + 1;
  }
}
