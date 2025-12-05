import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

/**
 * --- 1. ICONS (Inline SVGs to prevent dependency errors) ---
 */
const Icon = ({ path, ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    {path}
  </svg>
);

const Icons = {
  Undo2: (props) => <Icon path={<><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></>} {...props} />,
  Redo2: (props) => <Icon path={<><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></>} {...props} />,
  Type: (props) => <Icon path={<><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></>} {...props} />,
  Minus: (props) => <Icon path={<path d="M5 12h14"/>} {...props} />,
  FontIcon: (props) => <Icon path={<><path d="M12 4 4 20"/><path d="m20 20-8-16"/><path d="M6 15h12"/></>} {...props} />,
  Bold: (props) => <Icon path={<><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></>} {...props} />,
  Italic: (props) => <Icon path={<><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></>} {...props} />,
  Underline: (props) => <Icon path={<><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/></>} {...props} />,
  Strikethrough: (props) => <Icon path={<><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></>} {...props} />,
  Palette: (props) => <Icon path={<><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></>} {...props} />,
  Highlighter: (props) => <Icon path={<><path d="m9 11-6 6v3h9l3-3"/><path d="m22 7-4.6 4.6L4.9 14.1c-1.1 1.1-1.1 2.8 0 3.9v0c1.1 1.1 2.8 1.1 3.9 0l2.5-2.5"/><path d="m15 11 1 1"/></>} {...props} />,
  Eclipse: (props) => <Icon path={<><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 1 0 10 10"/></>} {...props} />,
  AlignLeft: (props) => <Icon path={<><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></>} {...props} />,
  AlignCenter: (props) => <Icon path={<><line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="7" y1="12" y2="12"/><line x1="19" x2="5" y1="18" y2="18"/></>} {...props} />,
  AlignRight: (props) => <Icon path={<><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/></>} {...props} />,
  AlignJustify: (props) => <Icon path={<><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></>} {...props} />,
  List: (props) => <Icon path={<><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></>} {...props} />,
  ListOrdered: (props) => <Icon path={<><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></>} {...props} />,
  Indent: (props) => <Icon path={<><polyline points="3 8 7 12 3 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/></>} {...props} />,
  Outdent: (props) => <Icon path={<><polyline points="7 8 3 12 7 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/></>} {...props} />,
  ArrowUpToLine: (props) => <Icon path={<><path d="M5 3h14"/><path d="m18 13-6-6-6 6"/><path d="M12 7v14"/></>} {...props} />,
  BoxSelect: (props) => <Icon path={<><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h1"/><path d="M14 3h1"/><path d="M14 21h1"/><path d="M3 9v1"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M21 14v1"/></>} {...props} />,
  ArrowDownToLine: (props) => <Icon path={<><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></>} {...props} />,
  Maximize: (props) => <Icon path={<><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></>} {...props} />,
  Trash2: (props) => <Icon path={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>} {...props} />,
  Plus: (props) => <Icon path={<><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></>} {...props} />,
  CaseUpper: (props) => <Icon path={<><path d="m3 15 4-8 4 8"/><path d="M4 13h6"/><path d="M15 11h4.5a2.5 2.5 0 0 1 0 5H15V7h4a2.5 2.5 0 0 1 0 5"/></>} {...props} />,
  CaseLower: (props) => <Icon path={<><circle cx="6" cy="15" r="3"/><path d="M9 12v6"/><circle cx="15" cy="15" r="3"/><path d="M18 12v6"/></>} {...props} />,
  MoveHorizontal: (props) => <Icon path={<><polyline points="18 8 22 12 18 16"/><polyline points="6 8 2 12 6 16"/><line x1="2" x2="22" y1="12" y2="12"/></>} {...props} />,
  MoveVertical: (props) => <Icon path={<><polyline points="8 18 12 22 16 18"/><polyline points="8 6 12 2 16 6"/><line x1="12" x2="12" y1="2" y2="22"/></>} {...props} />,
  Pilcrow: (props) => <Icon path={<><path d="M13 4v16"/><path d="M17 4v16"/><path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13"/></>} {...props} />,
};

/**
 * --- 2. CONSTANTS & UTILS ---
 */

const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 600;
const CLICK_TIMEOUT = 300; 

// Helper to generate unique IDs
const generateId = () => `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// Helper for Title Case - Improved to handle spacing better
const toTitleCase = (str) => {
    if (!str) return "";
    return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
};

// --- HISTORY HOOK (Undo/Redo) ---
const useHistory = (initialState) => {
    const [history, setHistory] = useState([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const setState = useCallback((newState) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, currentIndex + 1);
            return [...newHistory, newState];
        });
        setCurrentIndex(prev => prev + 1);
    }, [currentIndex]);

    const undo = useCallback(() => {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setCurrentIndex(newIndex);
            return history[newIndex];
        }
        return null;
    }, [history, currentIndex]);

    const redo = useCallback(() => {
        if (currentIndex < history.length - 1) {
            const newIndex = currentIndex + 1;
            setCurrentIndex(newIndex);
            return history[newIndex];
        }
        return null;
    }, [history, currentIndex]);

    return { 
        state: history[currentIndex], 
        setState, 
        undo, 
        redo,
        canUndo: currentIndex > 0,
        canRedo: currentIndex < history.length - 1
    };
};

// --- RICH TEXT DATA MANIPULATION HELPERS ---

const deleteTextRange = (valueList, start, end) => {
    if (start >= end) return valueList;
    let currentPos = 0;
    const newValueList = [];

    valueList.forEach(span => {
        const spanStart = currentPos;
        const spanLength = span.text.length;
        const spanEnd = spanStart + spanLength;
        currentPos += spanLength;

        if (spanEnd <= start || spanStart >= end) {
            newValueList.push(span);
            return;
        }

        const relativeStart = Math.max(0, start - spanStart);
        const relativeEnd = Math.min(spanLength, end - spanStart);
        const newText = span.text.slice(0, relativeStart) + span.text.slice(relativeEnd);
        
        if (newText.length > 0) {
            newValueList.push({ ...span, text: newText });
        }
    });

    if (newValueList.length === 0 && valueList.length > 0) {
        return [{ ...valueList[0], text: "" }];
    } else if (newValueList.length === 0) {
        return [{ text: "", fontSize: 24, fontFamily: 'Arial', fill: '#000000' }];
    }
    return newValueList;
};

const insertTextAt = (valueList, index, textToInsert) => {
    let currentPos = 0;
    const newValueList = [];
    let inserted = false;

    if (valueList.length === 0) {
         return [{ text: textToInsert, fontSize: 24, fontFamily: 'Arial', fill: '#000000' }];
    }

    const totalLength = valueList.reduce((acc, s) => acc + s.text.length, 0);
    if (index >= totalLength) {
        const lastSpan = valueList[valueList.length - 1];
        const newList = [...valueList];
        newList[newList.length - 1] = { ...lastSpan, text: lastSpan.text + textToInsert };
        return newList;
    }

    valueList.forEach(span => {
        const spanStart = currentPos;
        const spanLength = span.text.length;
        const spanEnd = spanStart + spanLength; 

        if (!inserted) {
            const isInside = index > spanStart && index < spanEnd;
            const isAtStart = index === spanStart && index === 0;
            const isAtEnd = index === spanEnd;

            if (isInside || isAtStart || isAtEnd) {
                const relIndex = index - spanStart;
                const newText = span.text.slice(0, relIndex) + textToInsert + span.text.slice(relIndex);
                newValueList.push({ ...span, text: newText });
                inserted = true;
            } else {
                newValueList.push(span);
            }
        } else {
            newValueList.push(span);
        }
        currentPos += spanLength;
    });

    if (!inserted) {
        const lastSpan = valueList[valueList.length - 1];
        newValueList[newValueList.length - 1] = { ...lastSpan, text: lastSpan.text + textToInsert };
    }

    return newValueList;
};

const applyStyleToRange = (valueList, start, end, styleKey, styleValue) => {
    let currentPos = 0;
    const newValueList = [];

    valueList.forEach((span) => {
        const spanStart = currentPos;
        const spanEnd = currentPos + span.text.length;
        const spanLength = span.text.length;

        if (spanEnd <= start || spanStart >= end) {
            newValueList.push(span);
        } 
        else {
            const relativeStart = Math.max(0, start - spanStart);
            const relativeEnd = Math.min(spanLength, end - spanStart);

            if (relativeStart > 0) {
                newValueList.push({ ...span, text: span.text.slice(0, relativeStart) });
            }

            const newSpan = {
                ...span,
                text: span.text.slice(relativeStart, relativeEnd),
                [styleKey]: styleValue
            };
            
            // Cleanup: if toggling off a boolean or removing a value
            if (styleValue === null || styleValue === false) {
                 // For boolean flags like isBold, we set false.
            }
            
            newValueList.push(newSpan);

            if (relativeEnd < spanLength) {
                newValueList.push({ ...span, text: span.text.slice(relativeEnd) });
            }
        }
        currentPos += spanLength;
    });

    return newValueList.filter(s => s.text.length > 0);
};

// Initial State
const INITIAL_DATA = [
  {
    id: "text-1",
    type: "RICH_TEXT",
    x: 50,
    y: 80,
    width: 400,
    height: 250,
    isEditing: false,
    autoFit: false,
    verticalAlign: 'top', 
    listType: 'none', // 'none' | 'bullet' | 'number'
    listIndent: 0,    // nesting level 0, 1, 2...
    defaultStyle: {
      fontSize: 24,
      fontFamily: "Arial",
      fill: "#333333",
      align: "left",
      isBold: false,
      isItalic: false,
      isUnderline: false,
      isStrike: false,
      backgroundColor: null, 
      lineHeight: 1.2,
      letterSpacing: 0,
      paragraphSpacing: 10,
      textTransform: 'none', 
      shadow: false
    },
    valueList: [
      { text: "Rich Text Editor\n", fontSize: 28, fontFamily: "Arial", fill: "#333333", isBold: true },
      { text: "Features Implemented:\n", fontSize: 20, fontFamily: "Arial", fill: "#666666" },
      { text: "Auto Fit Text\n", fontSize: 20, fontFamily: "Arial", fill: "#333333" },
      { text: "Vertical Align\n", fontSize: 20, fontFamily: "Arial", fill: "#333333" },
      { text: "Nested Lists Support", fontSize: 20, fontFamily: "Arial", fill: "#333333", isUnderline: true },
    ],
  },
];

/**
 * --- 3. LAYOUT ENGINE ---
 */
const TextLayoutEngine = {
  getTransformedText: (text, transform) => {
    if (!text) return "";
    switch (transform) {
        case 'uppercase': return text.toUpperCase();
        case 'lowercase': return text.toLowerCase();
        case 'capitalize': return toTitleCase(text);
        default: return text;
    }
  },

  measureText: (ctx, text, style) => {
    const fontStyle = style.isItalic ? "italic" : "normal";
    const fontWeight = style.isBold ? "bold" : "normal";
    ctx.font = `${fontStyle} ${fontWeight} ${style.fontSize}px ${style.fontFamily}`;
    
    // Crucial: Measure the transformed text to get accurate width
    const transformedText = TextLayoutEngine.getTransformedText(text, style.textTransform);
    const metrics = ctx.measureText(transformedText);
    
    const letterSpacing = style.letterSpacing || 0;
    const width = metrics.width + (transformedText.length * letterSpacing);
    const lineHeightMultiplier = style.lineHeight || 1.2;
    const height = style.fontSize * lineHeightMultiplier;

    return {
      width: width,
      height: height,
      fontSize: style.fontSize, 
      rawWidth: metrics.width,
      baseline: metrics.actualBoundingBoxAscent || style.fontSize * 0.8,
      text: transformedText 
    };
  },

  calculateLayout: (ctx, valueList, containerWidth, containerProps) => {
    const { align: defaultAlign, paragraphSpacing, listType, listIndent } = containerProps;
    
    const lines = [];
    let currentLine = { 
        elements: [], width: 0, height: 0, fontSize: 0, 
        startIndex: 0, isHardReturn: false, spaceCount: 0 
    };
    let globalCharIndex = 0;
    const charPositions = []; 
    const backgrounds = [];
    const decorations = [];
    const listMarkers = [];

    // List Constants
    const baseIndent = listType !== 'none' ? 25 + (listIndent || 0) * 20 : 0;
    const effectiveWidth = Math.max(10, containerWidth - baseIndent);

    let lineIndexForList = 1; // For numbered lists

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

            // Line Wrap Logic (respecting indent)
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

    // Position Calculation & Alignment
    let currentY = 0;
    
    lines.forEach((line, lineIndex) => {
      if (line.height === 0) line.height = 24; 
      if (line.fontSize === 0) line.fontSize = 24;

      // Detect start of a new paragraph for list markers
      const isListItemStart = lineIndex === 0 || (lines[lineIndex - 1] && lines[lineIndex - 1].isHardReturn);

      let startX = baseIndent; // All lines indented in a list item
      let extraSpacePerSpace = 0;

      // Alignment Logic
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

      // Generate List Marker
      if (listType !== 'none' && isListItemStart && line.elements.length > 0) {
          // Find first style to match font
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

        // Draw Backgrounds
        if (el.style.backgroundColor) {
            backgrounds.push({
                x: currentX,
                y: currentY,
                width: wordWidth, 
                height: line.height,
                fill: el.style.backgroundColor
            });
        }

        // Decoration Logic: Support BOTH Underline and Strike
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

        // Characters calculation
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

  calculateOptimalFontSize: (ctx, valueList, width, height, containerProps) => {
      if (valueList.length === 0 || valueList.every(v => !v.text)) return containerProps.defaultStyle.fontSize;

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

  getCharIndexFromPos: (x, y, layout) => {
      let line = layout.lines.find(l => y >= l.y && y < l.y + l.height); 
      if (!line) {
          if (y < layout.lines[0]?.y) return 0;
          if (y >= layout.totalHeight) return layout.totalLength;
          let minDist = Infinity;
          layout.lines.forEach(l => {
              const dist = Math.abs(y - (l.y + l.height/2));
              if (dist < minDist) { minDist = dist; line = l; }
          });
      }
      if (!line) return 0;

      const charsInLine = layout.charPositions.filter(c => c.lineIndex === layout.lines.indexOf(line));
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
  
  getWordRangeAt: (index, layout) => {
      const char = layout.charPositions.find(c => c.index === index) || layout.charPositions.find(c => c.index === index - 1);
      if (!char) return { start: 0, end: layout.totalLength };
      let start = index;
      for(let i = index - 1; i >= 0; i--) {
          const c = layout.charPositions.find(pos => pos.index === i);
          if (!c || c.char.match(/\s/)) { start = i + 1; break; }
          start = i;
      }
      let end = index;
      for(let i = index; i < layout.totalLength; i++) {
          const c = layout.charPositions.find(pos => pos.index === i);
          if (!c || c.char.match(/\s/)) { end = i; break; }
          end = i + 1;
      }
      return { start, end };
  },

  getLineRangeAt: (index, layout) => {
      const char = layout.charPositions.find(c => c.index === index);
      const lineIndex = char ? char.lineIndex : layout.lines.findIndex(l => index >= l.startIndex && index <= l.endIndex);
      if (lineIndex === -1) return { start: 0, end: layout.totalLength };
      const line = layout.lines[lineIndex];
      return { start: line.startIndex, end: line.endIndex };
  }
};

/**
 * --- 4. COMPONENTS ---
 */

const HiddenInput = ({ value, selectionStart, selectionEnd, onChange, onSelect, onKeyDown, onBlur, onPaste, onCopy }) => {
  const ref = useRef(null);
  
  useEffect(() => {
    if (ref.current) {
        if (document.activeElement !== ref.current) ref.current.focus({ preventScroll: true });
        if (ref.current.selectionStart !== selectionStart || ref.current.selectionEnd !== selectionEnd) {
            ref.current.setSelectionRange(selectionStart, selectionEnd);
        }
    }
  }); 

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onSelect={(e) => onSelect(e.target.selectionStart, e.target.selectionEnd)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onPaste={onPaste}
      onCopy={onCopy}
      autoFocus
      style={{ 
          position: 'fixed', top: 0, left: 0, opacity: 0, 
          width: '1px', height: '1px', border: 'none', 
          outline: 'none', resize: 'none', overflow: 'hidden', zIndex: -1 
        }}
    />
  );
};

// --- TOOLTIP & BUTTON ---

const Tooltip = ({ text, shortcut, children }) => {
    if (!text && !shortcut) return children;
    
    return (
        <div className="group relative flex items-center justify-center">
            {children}
            <div className="absolute top-full mt-2 px-2 py-1.5 bg-gray-900 text-white text-[10px] font-medium rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity delay-300 pointer-events-none whitespace-nowrap z-50 flex items-center gap-2 border border-gray-700">
                <span>{text}</span>
                {shortcut && (
                    <span className="text-gray-400 font-mono text-[9px] bg-gray-800 px-1 rounded border border-gray-700">
                        {shortcut}
                    </span>
                )}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-l border-t border-gray-700"></div>
            </div>
        </div>
    );
};

const ToolbarButton = ({ icon: Icon, label, shortcut, onClick, isActive, disabled, color, className = "" }) => (
    <Tooltip text={label} shortcut={shortcut}>
        <button 
            className={`
                p-1.5 rounded-md transition-all duration-200 outline-none
                ${disabled 
                    ? 'opacity-40 cursor-not-allowed text-gray-400' 
                    : isActive 
                        ? 'bg-blue-50 text-blue-600 shadow-inner ring-1 ring-blue-100' 
                        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900 active:bg-gray-200'
                }
                ${className}
            `}
            onClick={onClick}
            disabled={disabled}
        >
            <Icon width={18} height={18} strokeWidth={2} style={color ? { color } : undefined} />
        </button>
    </Tooltip>
);

const ToolbarSeparator = () => <div className="w-px h-5 bg-gray-200 mx-1 self-center" />;

const Toolbar = ({ activeElement, currentStyle, onUpdateStyle, onAddText, onDelete, canUndo, canRedo, onUndo, onRedo }) => {
    
    if (!activeElement) {
        return (
             <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-200 shadow-sm h-14 z-40 relative">
                <div className="flex items-center gap-2 mr-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm flex items-center justify-center text-white font-bold">
                        <Icons.Type width={20} height={20} />
                    </div>
                    <div className="font-bold text-gray-800 tracking-tight">Canvas Editor</div>
                </div>

                <div className="flex items-center gap-1 border-r pr-2 border-gray-200">
                    <ToolbarButton icon={Icons.Undo2} label="Undo" shortcut="⌘Z" onClick={onUndo} disabled={!canUndo} />
                    <ToolbarButton icon={Icons.Redo2} label="Redo" shortcut="⌘⇧Z" onClick={onRedo} disabled={!canRedo} />
                </div>

                <button 
                    onClick={onAddText} 
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md shadow-sm text-sm font-medium transition-colors ml-2"
                >
                    <Icons.Plus width={16} height={16} strokeWidth={2.5} /> 
                    <span>Add Text</span>
                </button>
            </div>
        );
    }

    const style = currentStyle || activeElement.defaultStyle;

    return (
        <div className="flex flex-col w-full bg-white border-b border-gray-200 shadow-sm z-40 sticky top-0">
            {/* Top Row: Core Formatting */}
            <div className="flex items-center gap-1 p-2 overflow-x-auto no-scrollbar">
                <div className="flex gap-0.5">
                    <ToolbarButton icon={Icons.Undo2} label="Undo" shortcut="⌘Z" onClick={onUndo} disabled={!canUndo} />
                    <ToolbarButton icon={Icons.Redo2} label="Redo" shortcut="⌘⇧Z" onClick={onRedo} disabled={!canRedo} />
                </div>
                
                <ToolbarSeparator />

                <div className="flex items-center gap-2">
                    <Tooltip text="Font Family">
                        <div className="relative group">
                             <select 
                                className="appearance-none bg-transparent hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-md px-2 py-1.5 pr-6 text-xs font-medium outline-none cursor-pointer w-28 transition-colors text-gray-700"
                                value={style.fontFamily}
                                onChange={(e) => onUpdateStyle('fontFamily', e.target.value)}
                            >
                                {['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New', 'Impact'].map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <Icons.Minus width={10} height={10} className="rotate-45" />
                            </div>
                        </div>
                    </Tooltip>
                    
                    <Tooltip text="Font Size">
                        <div className="flex items-center border border-gray-200 rounded-md bg-white hover:border-gray-300 transition-colors">
                            <div className="px-2 text-gray-400">
                                <Icons.FontIcon width={12} height={12} />
                            </div>
                            <input 
                                type="number" 
                                className="w-10 py-1.5 text-xs font-medium outline-none bg-transparent text-center text-gray-700"
                                value={style.fontSize}
                                onChange={(e) => onUpdateStyle('fontSize', parseInt(e.target.value))}
                                min="8" max="120"
                                disabled={activeElement.autoFit} 
                                title={activeElement.autoFit ? "Auto-Fit Enabled" : ""}
                            />
                        </div>
                    </Tooltip>
                </div>

                <ToolbarSeparator />

                <div className="flex gap-0.5">
                    <ToolbarButton icon={Icons.Bold} label="Bold" shortcut="⌘B" isActive={style.isBold} onClick={() => onUpdateStyle('isBold', !style.isBold)} />
                    <ToolbarButton icon={Icons.Italic} label="Italic" shortcut="⌘I" isActive={style.isItalic} onClick={() => onUpdateStyle('isItalic', !style.isItalic)} />
                    <ToolbarButton icon={Icons.Underline} label="Underline" shortcut="⌘U" isActive={style.isUnderline} onClick={() => onUpdateStyle('isUnderline', !style.isUnderline)} />
                    <ToolbarButton icon={Icons.Strikethrough} label="Strikethrough" isActive={style.isStrike} onClick={() => onUpdateStyle('isStrike', !style.isStrike)} />
                </div>

                <ToolbarSeparator />

                <div className="flex gap-1">
                    <Tooltip text="Text Color">
                        <div className="relative group p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors">
                            <Icons.Palette width={18} height={18} style={{ color: style.fill }} />
                            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={style.fill} onChange={(e) => onUpdateStyle('fill', e.target.value)}/>
                        </div>
                    </Tooltip>
                    <Tooltip text="Highlight Color">
                        <div className="relative group p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors">
                            <Icons.Highlighter width={18} height={18} className="text-gray-600" />
                            <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white shadow-sm pointer-events-none" style={{ backgroundColor: style.backgroundColor || 'transparent' }}></div>
                            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={style.backgroundColor || '#ffffff'} onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)}/>
                        </div>
                    </Tooltip>
                    <ToolbarButton icon={Icons.Eclipse} label="Drop Shadow" isActive={style.shadow} onClick={() => onUpdateStyle('shadow', !style.shadow)} />
                </div>

                <ToolbarSeparator />

                <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                    <ToolbarButton icon={Icons.AlignLeft} label="Align Left" isActive={activeElement.defaultStyle.align === 'left'} onClick={() => onUpdateStyle('align', 'left')} />
                    <ToolbarButton icon={Icons.AlignCenter} label="Align Center" isActive={activeElement.defaultStyle.align === 'center'} onClick={() => onUpdateStyle('align', 'center')} />
                    <ToolbarButton icon={Icons.AlignRight} label="Align Right" isActive={activeElement.defaultStyle.align === 'right'} onClick={() => onUpdateStyle('align', 'right')} />
                    <ToolbarButton icon={Icons.AlignJustify} label="Justify" isActive={activeElement.defaultStyle.align === 'justify'} onClick={() => onUpdateStyle('align', 'justify')} />
                </div>

                <ToolbarSeparator />
                
                {/* Lists & Indentation */}
                <div className="flex gap-0.5">
                    <ToolbarButton icon={Icons.List} label="Bulleted List" isActive={activeElement.listType === 'bullet'} onClick={() => onUpdateStyle('listType', activeElement.listType === 'bullet' ? 'none' : 'bullet')} />
                    <ToolbarButton icon={Icons.ListOrdered} label="Numbered List" isActive={activeElement.listType === 'number'} onClick={() => onUpdateStyle('listType', activeElement.listType === 'number' ? 'none' : 'number')} />
                    <ToolbarButton icon={Icons.Indent} label="Increase Indent" onClick={() => onUpdateStyle('listIndent', (activeElement.listIndent || 0) + 1)} />
                    <ToolbarButton icon={Icons.Outdent} label="Decrease Indent" disabled={!activeElement.listIndent} onClick={() => onUpdateStyle('listIndent', Math.max(0, (activeElement.listIndent || 0) - 1))} />
                </div>

                <ToolbarSeparator />

                <div className="flex gap-0.5">
                    <ToolbarButton icon={Icons.ArrowUpToLine} label="Align Top" disabled={activeElement.autoFit} isActive={activeElement.verticalAlign === 'top'} onClick={() => onUpdateStyle('verticalAlign', 'top')} />
                    <ToolbarButton icon={Icons.BoxSelect} label="Align Middle" disabled={activeElement.autoFit} isActive={activeElement.verticalAlign === 'middle'} onClick={() => onUpdateStyle('verticalAlign', 'middle')} />
                    <ToolbarButton icon={Icons.ArrowDownToLine} label="Align Bottom" disabled={activeElement.autoFit} isActive={activeElement.verticalAlign === 'bottom'} onClick={() => onUpdateStyle('verticalAlign', 'bottom')} />
                </div>

                <ToolbarSeparator />
                
                <ToolbarButton icon={Icons.Maximize} label={activeElement.autoFit ? "Disable Auto-Fit (Scale)" : "Enable Auto-Fit (Scale)"} isActive={activeElement.autoFit} onClick={() => onUpdateStyle('autoFit', !activeElement.autoFit)} />

                <div className="flex-1"></div>
                <ToolbarButton icon={Icons.Trash2} label="Delete Element" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onDelete} />
            </div>

            {/* Bottom Row: Advanced & Spacing */}
            <div className="flex items-center gap-4 px-3 py-2 border-t bg-gray-50/80 text-xs overflow-x-auto no-scrollbar backdrop-blur-sm">
                
                {/* Text Transform */}
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Casing</span>
                    <div className="flex items-center bg-white border border-gray-200 rounded-md p-0.5 shadow-sm">
                        <ToolbarButton icon={Icons.Type} label="Original Case" isActive={style.textTransform === 'none'} onClick={() => onUpdateStyle('textTransform', 'none')} />
                        <ToolbarButton icon={Icons.CaseUpper} label="Uppercase" isActive={style.textTransform === 'uppercase'} onClick={() => onUpdateStyle('textTransform', 'uppercase')} />
                        <ToolbarButton icon={Icons.CaseLower} label="Lowercase" isActive={style.textTransform === 'lowercase'} onClick={() => onUpdateStyle('textTransform', 'lowercase')} />
                        <Tooltip text="Title Case">
                            <button 
                                className={`p-1.5 rounded w-7 h-7 flex items-center justify-center font-bold text-[10px] transition-colors ${style.textTransform === 'capitalize' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : 'hover:bg-gray-100 text-gray-600'}`} 
                                onClick={() => onUpdateStyle('textTransform', 'capitalize')}
                            >
                                Tt
                            </button>
                        </Tooltip>
                    </div>
                </div>

                <ToolbarSeparator />

                {/* Spacing Controls */}
                <div className="flex items-center gap-4">
                    <Tooltip text="Letter Spacing">
                        <div className="flex items-center gap-1.5 group">
                            <Icons.MoveHorizontal width={14} height={14} className="text-gray-400 group-hover:text-gray-600 transition-colors"/>
                            <input 
                                type="number" 
                                className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                                value={style.letterSpacing || 0} 
                                onChange={(e) => onUpdateStyle('letterSpacing', parseFloat(e.target.value))} 
                                step="0.5"
                            />
                        </div>
                    </Tooltip>
                    
                    <Tooltip text="Line Height">
                        <div className="flex items-center gap-1.5 group">
                            <Icons.MoveVertical width={14} height={14} className="text-gray-400 group-hover:text-gray-600 transition-colors"/>
                            <input 
                                type="number" 
                                className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                                value={style.lineHeight || 1.2} 
                                onChange={(e) => onUpdateStyle('lineHeight', parseFloat(e.target.value))} 
                                step="0.1"
                            />
                        </div>
                    </Tooltip>

                    <Tooltip text="Paragraph Spacing">
                        <div className="flex items-center gap-1.5 group">
                            <Icons.Pilcrow width={14} height={14} className="text-gray-400 group-hover:text-gray-600 transition-colors"/>
                            <input 
                                type="number" 
                                className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                                value={activeElement.defaultStyle.paragraphSpacing || 0} 
                                onChange={(e) => onUpdateStyle('paragraphSpacing', parseInt(e.target.value))} 
                                step="1"
                            />
                        </div>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};

/**
 * --- 5. MAIN APP ---
 */
export default function CanvasRichTextEditor() {
    const canvasRef = useRef(null);
    
    // Use History Hook
    const { 
        state: elements, 
        setState: setElements, 
        undo, redo, canUndo, canRedo 
    } = useHistory(INITIAL_DATA);

    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [dragInfo, setDragInfo] = useState({ isDragging: false, startX: 0, startY: 0, originalX: 0, originalY: 0, type: 'none' });
    
    const selectionRef = useRef({ start: 0, end: 0 });
    const [selection, setSelectionState] = useState({ start: 0, end: 0 });
    const setSelection = (newSel) => {
        selectionRef.current = newSel;
        setSelectionState(newSel);
    };

    const [blinkVisible, setBlinkVisible] = useState(true);
    const clickTracker = useRef({ count: 0, lastTime: 0, x: 0, y: 0 });

    const activeElement = useMemo(() => elements.find(el => el.id === selectedId), [elements, selectedId]);
    const activeFullText = useMemo(() => activeElement ? activeElement.valueList.map(v => v.text).join("") : "", [activeElement]);
    
    const currentStyleAtCursor = useMemo(() => {
        if (!activeElement || !activeElement._layout) return null;
        let indexToCheck = Math.max(0, selection.end - 1);
        const charPos = activeElement._layout.charPositions.find(c => c.index === indexToCheck);
        return charPos ? charPos.style : activeElement.defaultStyle;
    }, [activeElement, selection.end]);

    useEffect(() => {
        if (!isEditing) return;
        const interval = setInterval(() => setBlinkVisible(v => !v), 500);
        return () => clearInterval(interval);
    }, [isEditing]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
        
        // Grid Background
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<STAGE_WIDTH; i+=20) { ctx.moveTo(i, 0); ctx.lineTo(i, STAGE_HEIGHT); }
        for(let i=0; i<STAGE_HEIGHT; i+=20) { ctx.moveTo(0, i); ctx.lineTo(STAGE_WIDTH, i); }
        ctx.stroke();

        elements.forEach(el => {
            // Container Props now passed to layout engine to handle lists and global spacing
            const containerProps = {
                align: el.defaultStyle.align,
                paragraphSpacing: el.defaultStyle.paragraphSpacing,
                listType: el.listType,
                listIndent: el.listIndent,
                defaultStyle: el.defaultStyle
            };

            const layout = TextLayoutEngine.calculateLayout(ctx, el.valueList, el.width, containerProps);
            el._renderHeight = layout.totalHeight;
            el._layout = layout; 
            
            // Vertical Align Calculation
            let startY = el.y;
            // With AutoFit, height is fixed by user, so use el.height. Without, use layout height.
            if (el.autoFit) {
                if (el.verticalAlign === 'middle') {
                    startY += (el.height - layout.totalHeight) / 2;
                } else if (el.verticalAlign === 'bottom') {
                    startY += (el.height - layout.totalHeight);
                }
            }

            ctx.save();
            ctx.translate(el.x, startY);

            // 1. Draw Backgrounds (Highlights)
            layout.backgrounds.forEach(bg => {
                ctx.fillStyle = bg.fill;
                ctx.fillRect(bg.x, bg.y, bg.width, bg.height);
            });

            // 2. Draw Selection
            if (isEditing && selectedId === el.id) {
                const { start, end } = selection;
                if (start !== end) {
                    const min = Math.min(start, end);
                    const max = Math.max(start, end);
                    ctx.fillStyle = "rgba(59, 130, 246, 0.2)"; 
                    layout.charPositions.forEach(charPos => {
                        if (charPos.index >= min && charPos.index < max) {
                            ctx.fillRect(charPos.x, charPos.y, charPos.width + 0.5, charPos.height);
                        }
                    });
                }
            }
            
            // 3. Draw List Markers
            layout.listMarkers.forEach(marker => {
                 ctx.font = `bold ${marker.fontSize}px ${marker.fontFamily}`;
                 ctx.fillStyle = marker.color;
                 ctx.fillText(marker.text, marker.x, marker.y + marker.fontSize * 0.9);
            });

            // 4. Draw Text with Shadows
            layout.charPositions.forEach(charPos => {
                 const style = charPos.style;
                 const fontStyle = style.isItalic ? "italic" : "normal";
                 const fontWeight = style.isBold ? "bold" : "normal";
                 ctx.font = `${fontStyle} ${fontWeight} ${style.fontSize}px ${style.fontFamily}`;
                 
                 // Apply Shadow
                 if (style.shadow) {
                     ctx.shadowColor = "rgba(0,0,0,0.5)";
                     ctx.shadowBlur = 4;
                     ctx.shadowOffsetX = 2;
                     ctx.shadowOffsetY = 2;
                 } else {
                     ctx.shadowColor = "transparent";
                     ctx.shadowBlur = 0;
                     ctx.shadowOffsetX = 0;
                     ctx.shadowOffsetY = 0;
                 }

                 ctx.fillStyle = style.fill;
                 ctx.fillText(charPos.char, charPos.x, charPos.y + charPos.fontSize * 0.9);
                 
                 // Reset shadow for next ops
                 ctx.shadowColor = "transparent";
            });

            // 5. Draw Decorations (Underline/Strike)
            layout.decorations.forEach(dec => {
                ctx.beginPath();
                ctx.strokeStyle = dec.color;
                ctx.lineWidth = Math.max(1, dec.fontSize / 15);
                
                if (dec.type === 'underline') {
                    const y = dec.y + dec.fontSize * 1.05; 
                    ctx.moveTo(dec.x, y);
                    ctx.lineTo(dec.x + dec.width, y);
                } else if (dec.type === 'line-through') {
                    const y = dec.y + dec.fontSize * 0.6;
                    ctx.moveTo(dec.x, y);
                    ctx.lineTo(dec.x + dec.width, y);
                }
                ctx.stroke();
            });

            // 6. Cursor
            if (isEditing && selectedId === el.id && blinkVisible) {
                let cursorX = 0, cursorY = 0, cursorHeight = 24;
                const cursorIndex = selection.end; 
                const charPos = layout.charPositions.find(c => c.index === cursorIndex);
                
                if (charPos) {
                    cursorX = charPos.x; cursorY = charPos.y; cursorHeight = charPos.height; 
                } else {
                    const lastChar = layout.charPositions[layout.charPositions.length - 1];
                    // If cursor is at the very end
                    if (cursorIndex >= layout.totalLength && lastChar) {
                        cursorX = lastChar.x + lastChar.width; cursorY = lastChar.y; cursorHeight = lastChar.height;
                    } else if (cursorIndex === 0 && layout.lines.length > 0) {
                        // Empty or start
                        cursorX = layout.lines[0].x; cursorY = layout.lines[0].y; cursorHeight = layout.lines[0].height || 24;
                    } else {
                         // Fallback for empty lines
                        let line = layout.lines.find(l => cursorIndex >= l.startIndex && cursorIndex <= l.endIndex);
                        if (!line && cursorIndex === layout.totalLength) line = layout.lines[layout.lines.length - 1];
                        if (line) {
                            cursorY = line.y; cursorHeight = line.height;
                            if (el.defaultStyle.align === 'center') cursorX = line.x + line.width / 2; 
                            else if (el.defaultStyle.align === 'right') cursorX = line.x + line.width; 
                            else cursorX = line.x; 
                        }
                    }
                }
                ctx.beginPath(); ctx.moveTo(cursorX, cursorY); ctx.lineTo(cursorX, cursorY + cursorHeight);
                ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.stroke();
            }

            ctx.restore();

            // 7. Border & Handles (Drawn in global space)
            if (selectedId === el.id) {
                const renderY = startY; 
                // Visual Box Height: In autoFit=true, use el.height. In autoFit=false, use content height.
                const boxHeight = el.autoFit ? el.height : layout.totalHeight;
                
                ctx.save();
                ctx.translate(el.x, renderY);
                ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; 
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(0, 0, el.width, boxHeight);
                ctx.setLineDash([]);
                
                // Resize Handle
                if (!isEditing) {
                    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#3b82f6'; 
                    // Width handle
                    ctx.beginPath(); ctx.arc(el.width, boxHeight / 2, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    
                    if (el.autoFit) {
                         // Height handle
                         ctx.beginPath(); ctx.arc(el.width / 2, boxHeight, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                         // Corner handle 
                         ctx.beginPath(); ctx.arc(el.width, boxHeight, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); 
                    }
                }
                ctx.restore();
            }
        });

    }, [elements, selectedId, isEditing, selection, blinkVisible]);

    const getMousePos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseDown = (e) => {
        const { x, y } = getMousePos(e);
        let clickedId = null;
        let actionType = 'none';

        const now = Date.now();
        const dist = Math.sqrt(Math.pow(x - clickTracker.current.x, 2) + Math.pow(y - clickTracker.current.y, 2));
        
        if (now - clickTracker.current.lastTime < CLICK_TIMEOUT && dist < 5) {
            clickTracker.current.count += 1;
        } else {
            clickTracker.current.count = 1;
        }
        clickTracker.current.lastTime = now;
        clickTracker.current.x = x; clickTracker.current.y = y;

        // Check for handles first
        if (selectedId && !isEditing) {
            const el = elements.find(e => e.id === selectedId);
            if (el) {
                const layoutH = el._renderHeight || 20;
                // Visual Box Height check
                const boxHeight = el.autoFit ? el.height : layoutH;
                const renderY = el.autoFit ? el.y : 
                               (el.verticalAlign === 'middle' ? el.y + (el.height - layoutH)/2 : 
                                el.verticalAlign === 'bottom' ? el.y + (el.height - layoutH) : el.y);
                
                // Width Handle
                const hwX = el.x + el.width;
                const hwY = renderY + boxHeight / 2;
                if (Math.sqrt(Math.pow(x - hwX, 2) + Math.pow(y - hwY, 2)) <= 8) {
                    clickedId = selectedId;
                    actionType = 'resize_width';
                }

                // Height Handle / Corner Handle (Only if autoFit)
                if (!clickedId && el.autoFit) {
                     // Bottom handle
                     const hhX = el.x + el.width / 2;
                     const hhY = renderY + boxHeight;
                     if (Math.sqrt(Math.pow(x - hhX, 2) + Math.pow(y - hhY, 2)) <= 8) {
                        clickedId = selectedId;
                        actionType = 'resize_height';
                     }
                     // Corner handle 
                     const hcX = el.x + el.width;
                     const hcY = renderY + boxHeight;
                     if (Math.sqrt(Math.pow(x - hcX, 2) + Math.pow(y - hcY, 2)) <= 8) {
                        clickedId = selectedId;
                        actionType = 'resize_corner'; 
                     }
                }
            }
        }

        if (actionType === 'none') {
            for (let i = elements.length - 1; i >= 0; i--) {
                const el = elements[i];
                const layoutH = el._renderHeight || 20;
                const boxHeight = el.autoFit ? el.height : layoutH;
                
                const renderY = el.autoFit ? el.y : 
                               (el.verticalAlign === 'middle' ? el.y + (el.height - layoutH)/2 : 
                                el.verticalAlign === 'bottom' ? el.y + (el.height - layoutH) : el.y);

                const hitY = renderY; // Simplified
                
                if (x >= el.x && x <= el.x + el.width && y >= hitY && y <= hitY + boxHeight) {
                    clickedId = el.id;
                    if (isEditing && selectedId === el.id) {
                        const localX = x - el.x;
                        const localY = y - renderY; // Relative to drawn text
                        const index = TextLayoutEngine.getCharIndexFromPos(localX, localY, el._layout);
                        let newSelection = { start: index, end: index };
                        
                        if (clickTracker.current.count === 2) {
                             newSelection = TextLayoutEngine.getWordRangeAt(index, el._layout);
                             actionType = 'text_select_locked';
                        } else if (clickTracker.current.count === 3) {
                             newSelection = TextLayoutEngine.getLineRangeAt(index, el._layout);
                             actionType = 'text_select_locked';
                        } else if (clickTracker.current.count >= 4) {
                             newSelection = { start: 0, end: el._layout.totalLength };
                             actionType = 'text_select_locked';
                        } else {
                             actionType = 'text_select';
                        }
                        setSelection(newSelection);
                    } else {
                        actionType = 'move';
                    }
                    break;
                }
            }
        }

        if (clickedId) {
            setSelectedId(clickedId);
            const el = elements.find(e => e.id === clickedId);
            if (!isEditing && actionType === 'text_select') setIsEditing(true);
            setDragInfo({ 
                isDragging: true, 
                startX: x, startY: y, 
                originalX: el.x, originalY: el.y, 
                originalWidth: el.width, originalHeight: el.height,
                type: actionType 
            });
            if (clickedId !== selectedId) setIsEditing(false);
        } else {
            setSelectedId(null);
            setIsEditing(false);
        }
    };

    const handleMouseMove = (e) => {
        const { x, y } = getMousePos(e);
        if (dragInfo.isDragging && activeElement) {
            const dx = x - dragInfo.startX;
            const dy = y - dragInfo.startY;

            if (dragInfo.type === 'move') {
                setElements(elements.map(el => el.id === selectedId ? { ...el, x: dragInfo.originalX + dx, y: dragInfo.originalY + dy } : el));
            } 
            else if (dragInfo.type === 'resize_width') {
                const newWidth = Math.max(50, dragInfo.originalWidth + dx);
                const updatedElements = elements.map(el => {
                    if (el.id === selectedId) {
                        let updatedEl = { ...el, width: newWidth };
                        if (el.autoFit) {
                             const ctx = canvasRef.current.getContext('2d');
                             const containerProps = { align: el.defaultStyle.align, paragraphSpacing: el.defaultStyle.paragraphSpacing, listType: el.listType, listIndent: el.listIndent, defaultStyle: el.defaultStyle };
                             const optimalSize = TextLayoutEngine.calculateOptimalFontSize(ctx, el.valueList, newWidth, el.height, containerProps);
                             updatedEl.valueList = updatedEl.valueList.map(v => ({...v, fontSize: optimalSize}));
                             updatedEl.defaultStyle = {...updatedEl.defaultStyle, fontSize: optimalSize};
                        }
                        return updatedEl;
                    }
                    return el;
                });
                setElements(updatedElements);
            }
            else if (dragInfo.type === 'resize_height' || dragInfo.type === 'resize_corner') {
                 const dHeight = (dragInfo.type === 'resize_corner') ? dy : dy; 
                 const dWidth = (dragInfo.type === 'resize_corner') ? dx : 0;

                 const newHeight = Math.max(50, dragInfo.originalHeight + dHeight);
                 const newWidth = Math.max(50, dragInfo.originalWidth + dWidth);
                 
                 const updatedElements = elements.map(el => {
                    if (el.id === selectedId) {
                        let updatedEl = { ...el, height: newHeight, width: newWidth };
                        if (el.autoFit) {
                             const ctx = canvasRef.current.getContext('2d');
                             const containerProps = { align: el.defaultStyle.align, paragraphSpacing: el.defaultStyle.paragraphSpacing, listType: el.listType, listIndent: el.listIndent, defaultStyle: el.defaultStyle };
                             const optimalSize = TextLayoutEngine.calculateOptimalFontSize(ctx, el.valueList, newWidth, newHeight, containerProps);
                             updatedEl.valueList = updatedEl.valueList.map(v => ({...v, fontSize: optimalSize}));
                             updatedEl.defaultStyle = {...updatedEl.defaultStyle, fontSize: optimalSize};
                        }
                        return updatedEl;
                    }
                    return el;
                 });
                 setElements(updatedElements);
            }
            else if (dragInfo.type === 'text_select') {
                const layoutH = activeElement._renderHeight || 20;
                const renderY = activeElement.autoFit ? activeElement.y : 
                               (activeElement.verticalAlign === 'middle' ? activeElement.y + (activeElement.height - layoutH)/2 : 
                                activeElement.verticalAlign === 'bottom' ? activeElement.y + (activeElement.height - layoutH) : activeElement.y);

                const localX = x - activeElement.x;
                const localY = y - renderY;
                const index = TextLayoutEngine.getCharIndexFromPos(localX, localY, activeElement._layout);
                setSelection({ ...selectionRef.current, end: index });
            }
        }
    };

    const handleMouseUp = () => {
        setDragInfo(prev => ({ ...prev, isDragging: false }));
    };

    const handleDoubleClick = () => {
        if (!isEditing && selectedId) setIsEditing(true);
    };

    // --- LOGIC: Text Mutation ---

    const handleHiddenInputChange = (newText, isPaste = false) => {
        const currentSel = selectionRef.current;
        const min = Math.min(currentSel.start, currentSel.end);
        const max = Math.max(currentSel.start, currentSel.end);
        const isRange = min !== max;

        setElements(elements.map(el => {
            if (el.id !== selectedId) return el;
            let newValueList = el.valueList;
            if (isRange) newValueList = deleteTextRange(newValueList, min, max);

            const lenAfterDelete = activeFullText.length - (max - min);
            const charsAddedCount = newText.length - lenAfterDelete;
            
            const textToInsert = isPaste ? newText : newText.slice(min, min + charsAddedCount);
            
            if (textToInsert.length > 0) {
                newValueList = insertTextAt(newValueList, min, textToInsert);
                const newCursor = min + textToInsert.length;
                setSelection({ start: newCursor, end: newCursor });
            } else {
                setSelection({ start: min, end: min });
            }

            // AUTO-FIT CHECK
            let finalEl = { ...el, valueList: newValueList };
            if (finalEl.autoFit) {
                 const ctx = canvasRef.current.getContext('2d');
                 const containerProps = { align: finalEl.defaultStyle.align, paragraphSpacing: finalEl.defaultStyle.paragraphSpacing, listType: finalEl.listType, listIndent: finalEl.listIndent, defaultStyle: finalEl.defaultStyle };
                 const optimalSize = TextLayoutEngine.calculateOptimalFontSize(ctx, finalEl.valueList, finalEl.width, finalEl.height, containerProps);
                 finalEl.valueList = finalEl.valueList.map(v => ({...v, fontSize: optimalSize}));
                 finalEl.defaultStyle = {...finalEl.defaultStyle, fontSize: optimalSize};
            }
            return finalEl;
        }));
    };
    
    const handleKeyDown = (e) => {
        if (!isEditing || !activeElement) return;
        const currentSel = selectionRef.current;
        const min = Math.min(currentSel.start, currentSel.end);
        const max = Math.max(currentSel.start, currentSel.end);
        const isRange = min !== max;
        
        // Helper to update elements with AutoFit
        const updateWithFit = (updatedEl) => {
             if (updatedEl.autoFit) {
                 const ctx = canvasRef.current.getContext('2d');
                 const containerProps = { align: updatedEl.defaultStyle.align, paragraphSpacing: updatedEl.defaultStyle.paragraphSpacing, listType: updatedEl.listType, listIndent: updatedEl.listIndent, defaultStyle: updatedEl.defaultStyle };
                 const optimalSize = TextLayoutEngine.calculateOptimalFontSize(ctx, updatedEl.valueList, updatedEl.width, updatedEl.height, containerProps);
                 updatedEl.valueList = updatedEl.valueList.map(v => ({...v, fontSize: optimalSize}));
                 updatedEl.defaultStyle = {...updatedEl.defaultStyle, fontSize: optimalSize};
            }
            return updatedEl;
        };

        if (e.key === 'Enter') {
            e.preventDefault(); 
            setElements(elements.map(el => {
                if (el.id !== selectedId) return el;
                let list = el.valueList;
                if (isRange) list = deleteTextRange(list, min, max);
                list = insertTextAt(list, min, '\n'); 
                const newEl = { ...el, valueList: list };
                return updateWithFit(newEl);
            }));
            const newPos = min + 1;
            setSelection({ start: newPos, end: newPos });
        }
        else if (e.key === 'Backspace') {
            e.preventDefault(); 
            let newPos = min;
            setElements(elements.map(el => {
                if (el.id !== selectedId) return el;
                let newValueList;
                if (isRange) {
                    newValueList = deleteTextRange(el.valueList, min, max);
                    newPos = min; 
                } else if (min > 0) {
                    newValueList = deleteTextRange(el.valueList, min - 1, min);
                    newPos = min - 1;
                } else {
                    return el;
                }
                const newEl = { ...el, valueList: newValueList };
                return updateWithFit(newEl);
            }));
            setSelection({ start: newPos, end: newPos });
        } 
        else if (e.key === 'Delete') {
             e.preventDefault();
             setElements(elements.map(el => {
                if (el.id !== selectedId) return el;
                const totalLen = el._layout ? el._layout.totalLength : 0;
                let newValueList;
                if (isRange) {
                    newValueList = deleteTextRange(el.valueList, min, max);
                    setSelection({ start: min, end: min });
                } else if (min < totalLen) {
                    newValueList = deleteTextRange(el.valueList, min, min + 1);
                    setSelection({ start: min, end: min });
                } else {
                    return el;
                }
                const newEl = { ...el, valueList: newValueList };
                return updateWithFit(newEl);
             }));
        }
    };

    const handleStyleUpdate = (key, val) => {
        if (!activeElement) return;
        setElements(elements.map(el => {
            if (el.id === selectedId) {
                // Global props that apply to the container
                if (['autoFit', 'paragraphSpacing', 'verticalAlign', 'align', 'listType', 'listIndent'].includes(key)) {
                    let newEl = { ...el, [key]: val };
                    
                    // Allow prop syncing to defaultStyle if needed for completeness
                    if (['align', 'paragraphSpacing'].includes(key)) {
                         newEl.defaultStyle = { ...newEl.defaultStyle, [key]: val };
                    }
                    
                    if (key === 'verticalAlign') newEl.verticalAlign = val;

                    // When toggling AutoFit, we might want to trigger an immediate fit calc
                    if (key === 'autoFit' && val === true) {
                         const ctx = canvasRef.current.getContext('2d');
                         if (!newEl.height || newEl.height < 50) newEl.height = newEl._renderHeight || 100;
                         const containerProps = { align: newEl.defaultStyle.align, paragraphSpacing: newEl.defaultStyle.paragraphSpacing, listType: newEl.listType, listIndent: newEl.listIndent, defaultStyle: newEl.defaultStyle };
                         const optimalSize = TextLayoutEngine.calculateOptimalFontSize(ctx, newEl.valueList, newEl.width, newEl.height, containerProps);
                         newEl.valueList = newEl.valueList.map(v => ({...v, fontSize: optimalSize}));
                         newEl.defaultStyle = {...newEl.defaultStyle, fontSize: optimalSize};
                    }

                    return newEl;
                }
                
                // Span-level props / Style Props
                const needsRefit = el.autoFit && ['fontFamily', 'isBold', 'isItalic', 'letterSpacing', 'lineHeight', 'textTransform'].includes(key);

                let updatedEl = { ...el };
                const { start, end } = selectionRef.current;
                
                if (start !== end) {
                    // Range Selection: Apply to specific spans
                    const min = Math.min(start, end);
                    const max = Math.max(start, end);
                    updatedEl.valueList = applyStyleToRange(el.valueList, min, max, key, val);
                } else {
                     // No Selection (Caret): Apply Global Style
                     // Update Default Style
                     updatedEl.defaultStyle = { ...el.defaultStyle, [key]: val };
                     
                     // Also apply to ALL existing spans to ensure visual consistency as requested
                     // "Let's apply style for all"
                     updatedEl.valueList = updatedEl.valueList.map(v => ({
                         ...v,
                         [key]: val
                     }));
                }

                if (needsRefit) {
                     const ctx = canvasRef.current.getContext('2d');
                     const containerProps = { align: updatedEl.defaultStyle.align, paragraphSpacing: updatedEl.defaultStyle.paragraphSpacing, listType: updatedEl.listType, listIndent: updatedEl.listIndent, defaultStyle: updatedEl.defaultStyle };
                     const optimalSize = TextLayoutEngine.calculateOptimalFontSize(ctx, updatedEl.valueList, updatedEl.width, updatedEl.height, containerProps);
                     updatedEl.valueList = updatedEl.valueList.map(v => ({...v, fontSize: optimalSize}));
                     updatedEl.defaultStyle = {...updatedEl.defaultStyle, fontSize: optimalSize};
                }

                return updatedEl;
            }
            return el;
        }));
    };

    // ... (Copy/Paste/Keys same as previous)
    
    const handleCopy = (e) => {
        if (!activeElement) return;
        e.preventDefault();
        const { start, end } = selectionRef.current;
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        const plainText = activeFullText.slice(min, max);
        e.clipboardData.setData('text/plain', plainText);
    };

    const handlePaste = (e) => {
        if (!isEditing) return;
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (text) handleHiddenInputChange(text, true);
    };

    const handleGlobalKeyDown = (e) => {
        const isCmd = e.metaKey || e.ctrlKey;
        if (isCmd && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) { const s = redo(); if(s) setElements(s); }
            else { const s = undo(); if(s) setElements(s); }
            return;
        }
        if (isEditing && isCmd && ['b', 'i', 'u', 'a'].includes(e.key.toLowerCase())) {
            e.preventDefault();
            const s = currentStyleAtCursor;
            switch(e.key.toLowerCase()) {
                case 'b': handleStyleUpdate('isBold', !s.isBold); break;
                case 'i': handleStyleUpdate('isItalic', !s.isItalic); break;
                case 'u': handleStyleUpdate('isUnderline', !s.isUnderline); break;
                case 'a': 
                    if (activeElement && activeElement._layout) setSelection({ start: 0, end: activeElement._layout.totalLength });
                    break;
            }
        }
    };

    const handleAddText = () => {
        const newId = generateId();
        const newEl = {
            id: newId, type: "RICH_TEXT", x: STAGE_WIDTH / 2 - 150, y: STAGE_HEIGHT / 2 - 75, width: 300, height: 150, isEditing: false, autoFit: false, verticalAlign: 'top',
            listType: 'none', listIndent: 0,
            defaultStyle: { fontSize: 24, fontFamily: "Arial", fill: "#000000", align: 'center', isBold: false, isItalic: false, isUnderline: false, isStrike: false, backgroundColor: null },
            valueList: [{ text: "Double click to edit", fontSize: 24, fontFamily: "Arial", fill: "#000000" }]
        };
        setElements([...elements, newEl]);
        setSelectedId(newId);
    };

    const handleDelete = () => {
        if (selectedId) {
            setElements(elements.filter(e => e.id !== selectedId));
            setSelectedId(null);
            setIsEditing(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans select-none" onKeyDown={handleGlobalKeyDown} tabIndex={0}>
            <Toolbar 
                activeElement={activeElement}
                currentStyle={currentStyleAtCursor}
                onUpdateStyle={handleStyleUpdate} 
                onAddText={handleAddText}
                onDelete={handleDelete}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={() => { const s = undo(); if(s) setElements(s); }}
                onRedo={() => { const s = redo(); if(s) setElements(s); }}
            />

            <div className="flex-1 overflow-auto flex justify-center items-center p-8 bg-gray-100">
                <div className="relative shadow-2xl bg-white ring-1 ring-gray-900/5" style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}>
                    <canvas 
                        ref={canvasRef}
                        width={STAGE_WIDTH}
                        height={STAGE_HEIGHT}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onDoubleClick={handleDoubleClick}
                        className={isEditing ? "cursor-text" : "cursor-default"}
                    />
                </div>
            </div>

            {isEditing && (
                <HiddenInput 
                    value={activeFullText} 
                    selectionStart={Math.min(selection.start, selection.end)}
                    selectionEnd={Math.max(selection.start, selection.end)}
                    onChange={handleHiddenInputChange}
                    onKeyDown={handleKeyDown}
                    onSelect={(s, e) => { if (!dragInfo.isDragging) setSelection({ start: s, end: e }); }}
                    onPaste={handlePaste}
                    onCopy={handleCopy}
                    onBlur={() => {}} 
                />
            )}
            
            <div className="bg-white border-t border-gray-200 text-xs px-3 py-1.5 flex gap-4 text-gray-500 font-medium z-50 relative">
                <span>Selection: {selection.start} - {selection.end}</span>
                <span>State: {isEditing ? "Editing" : "Idle"}</span>
                <span>Mode: {activeElement?.autoFit ? "Auto-Fit (Scale)" : "Standard"}</span>
            </div>
        </div>
    );
}