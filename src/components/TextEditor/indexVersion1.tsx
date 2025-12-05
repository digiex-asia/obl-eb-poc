import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Palette,
  MousePointer2,
  Plus,
  Trash2,
  Maximize,
  MoveVertical, 
  BetweenHorizontalStart, 
  Logs 
} from "lucide-react";

/**
 * --- 1. CONSTANTS & UTILS ---
 */

const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 600;
const CLICK_TIMEOUT = 300; // ms for multi-click detection

// Helper to generate unique IDs
const generateId = () => `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// --- RICH TEXT DATA MANIPULATION HELPERS ---

// Helper: Delete a range of text from the valueList, preserving spans
const deleteTextRange = (valueList, start, end) => {
    if (start >= end) return valueList;
    
    let currentPos = 0;
    const newValueList = [];

    valueList.forEach(span => {
        const spanStart = currentPos;
        const spanLength = span.text.length;
        const spanEnd = spanStart + spanLength;
        currentPos += spanLength;

        // Case 1: Span is completely outside deletion range (Keep it)
        if (spanEnd <= start || spanStart >= end) {
            newValueList.push(span);
            return;
        }

        // Case 2: Span is affected
        const relativeStart = Math.max(0, start - spanStart);
        const relativeEnd = Math.min(spanLength, end - spanStart);

        const newText = span.text.slice(0, relativeStart) + span.text.slice(relativeEnd);
        
        if (newText.length > 0) {
            newValueList.push({ ...span, text: newText });
        }
    });

    // If everything deleted, keep one empty span with default style (fallback)
    if (newValueList.length === 0 && valueList.length > 0) {
        return [{ ...valueList[0], text: "" }];
    } else if (newValueList.length === 0) {
        return [{ text: "", fontSize: 24, fontFamily: 'Arial', fill: '#000000' }];
    }

    return newValueList;
};

// Helper: Insert text at specific index, inheriting style of current span
const insertTextAt = (valueList, index, textToInsert) => {
    let currentPos = 0;
    const newValueList = [];
    let inserted = false;

    // Handle empty list case
    if (valueList.length === 0) {
         return [{ text: textToInsert, fontSize: 24, fontFamily: 'Arial', fill: '#000000' }];
    }

    const totalLength = valueList.reduce((acc, s) => acc + s.text.length, 0);
    // Append to end if index is out of bounds
    if (index >= totalLength) {
        const lastSpan = valueList[valueList.length - 1];
        const newList = [...valueList];
        newList[newList.length - 1] = { ...lastSpan, text: lastSpan.text + textToInsert };
        return newList;
    }

    // Insertion Logic: Prefer style of the character BEFORE the cursor
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

// Helper to apply style to selection range
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
                newValueList.push({
                    ...span,
                    text: span.text.slice(0, relativeStart)
                });
            }

            newValueList.push({
                ...span,
                text: span.text.slice(relativeStart, relativeEnd),
                [styleKey]: styleValue
            });

            if (relativeEnd < spanLength) {
                newValueList.push({
                    ...span,
                    text: span.text.slice(relativeEnd)
                });
            }
        }
        currentPos += spanLength;
    });

    return newValueList.filter(s => s.text.length > 0);
};

// Initial State Mock Data
const INITIAL_DATA = [
  {
    id: "text-1",
    type: "RICH_TEXT",
    x: 50,
    y: 50,
    width: 300,
    isEditing: false,
    autoFit: true,
    defaultStyle: {
      fontSize: 24,
      fontFamily: "Arial",
      fill: "#333333",
      align: "left",
      isBold: false,
      isItalic: false,
      lineHeight: 1.2,
      letterSpacing: 0,
      paragraphSpacing: 10
    },
    valueList: [
      { text: "Hello ", fontSize: 24, fontFamily: "Arial", fill: "#333333" },
      { text: "Canvas", fontSize: 24, fontFamily: "Arial", fill: "#3b82f6", isBold: true },
      { text: " World!", fontSize: 24, fontFamily: "Arial", fill: "#333333" },
    ],
  },
];

/**
 * --- 2. LAYOUT ENGINE (Native) ---
 */
const TextLayoutEngine = {
  measureText: (ctx, text, style) => {
    const fontStyle = style.isItalic ? "italic" : "normal";
    const fontWeight = style.isBold ? "bold" : "normal";
    ctx.font = `${fontStyle} ${fontWeight} ${style.fontSize}px ${style.fontFamily}`;
    const metrics = ctx.measureText(text);
    
    // Width includes letter spacing
    const letterSpacing = style.letterSpacing || 0;
    const width = metrics.width + (text.length * letterSpacing);

    // Height based on font size & line height multiplier
    // Note: We use fontSize for the actual visual height calculation in layout
    // but lineHeight determines the 'stride'
    const lineHeightMultiplier = style.lineHeight || 1.2;
    const height = style.fontSize * lineHeightMultiplier;

    return {
      width: width,
      height: height,
      fontSize: style.fontSize, // Pass specific font size back for rendering baseline
      rawWidth: metrics.width
    };
  },

  calculateLayout: (ctx, valueList, containerWidth, defaultAlign = 'left', defaultParagraphSpacing = 0) => {
    const lines = [];
    let currentLine = { 
        elements: [], 
        width: 0, 
        height: 0, 
        fontSize: 0, // Track max font size in line for alignment
        startIndex: 0, 
        isHardReturn: false 
    };
    let globalCharIndex = 0;
    const charPositions = []; 

    valueList.forEach((span) => {
      // Split retaining newlines
      const parts = span.text.split(/(\n)/g);
      
      parts.forEach((part) => {
        if (part === '\n') {
            currentLine.endIndex = globalCharIndex;
            currentLine.isHardReturn = true; 
            lines.push(currentLine);
            
            globalCharIndex += 1; 
            currentLine = { elements: [], width: 0, height: 0, startIndex: globalCharIndex, isHardReturn: false };
            return;
        }
        
        if (part.length === 0) return;

        const words = part.split(/(\s+)/).filter(p => p.length > 0);

        words.forEach(word => {
            const metrics = TextLayoutEngine.measureText(ctx, word, span);
            
            // Wrap check
            if (currentLine.elements.length > 0 && currentLine.width + metrics.width > containerWidth) {
                currentLine.endIndex = globalCharIndex;
                currentLine.isHardReturn = false; 
                lines.push(currentLine);
                currentLine = { elements: [], width: 0, height: 0, startIndex: globalCharIndex, isHardReturn: false };
            }

            currentLine.elements.push({
                text: word,
                style: span,
                width: metrics.width,
                height: metrics.height,
                fontSize: metrics.fontSize,
                startIndex: globalCharIndex,
                metrics: metrics
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

    // 2. Position Calculation
    let currentY = 0;
    
    lines.forEach((line, lineIndex) => {
      // Fallback if line is empty (use default style from first char logic or generic default)
      if (line.height === 0) line.height = 24; 
      if (line.fontSize === 0) line.fontSize = 24;

      let startX = 0;
      if (defaultAlign === 'center') startX = (containerWidth - line.width) / 2;
      if (defaultAlign === 'right') startX = containerWidth - line.width;

      let currentX = startX;
      
      line.elements.forEach(el => {
        const chars = el.text.split('');
        let charX = currentX;
        const letterSpacing = el.style.letterSpacing || 0;

        chars.forEach((char, i) => {
            const charMetrics = TextLayoutEngine.measureText(ctx, char, el.style);
            const charWidth = charMetrics.rawWidth + letterSpacing;

            charPositions.push({
                char: char,
                x: charX,
                y: currentY,
                width: charWidth,
                height: line.height, // Hit box height uses full line height
                fontSize: el.fontSize, // Store font size for render baseline
                index: el.startIndex + i,
                lineIndex: lineIndex,
                style: el.style
            });
            charX += charWidth;
        });

        el.x = currentX;
        el.y = currentY;
        currentX += el.width;
      });
      
      line.y = currentY;
      line.x = startX;
      
      // Increment Y by line height
      currentY += line.height;

      // Add Paragraph Spacing if hard return
      if (line.isHardReturn) {
          currentY += (defaultParagraphSpacing || 0);
      }
    });

    return { 
        lines, 
        totalHeight: currentY, 
        charPositions,
        totalLength: globalCharIndex 
    };
  },

  getCharIndexFromPos: (x, y, layout) => {
      // Find line strictly containing Y
      let line = layout.lines.find(l => y >= l.y && y < l.y + l.height); 
      
      // If not strict match, check gaps (e.g. click in paragraph spacing)
      if (!line) {
          if (y < layout.lines[0]?.y) return 0; // Above all
          if (y >= layout.totalHeight) return layout.totalLength; // Below all
          
          // Find gap
          for(let i=0; i<layout.lines.length; i++) {
              const current = layout.lines[i];
              const next = layout.lines[i+1];
              // If we are below current line but above next line, map to current line's end
              if (y >= current.y + current.height && (!next || y < next.y)) {
                  line = current;
                  break;
              }
          }
      }

      if (!line) return 0; // Fallback

      const charsInLine = layout.charPositions.filter(c => c.lineIndex === layout.lines.indexOf(line));
      
      if (charsInLine.length === 0) {
          return line.startIndex; 
      }

      if (x < charsInLine[0].x) return charsInLine[0].index;
      
      const lastChar = charsInLine[charsInLine.length - 1];
      if (x > lastChar.x + lastChar.width) {
          return lastChar.index + 1;
      }

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
          if (!c || c.char.match(/\s/)) { 
             start = i + 1; 
             break;
          }
          start = i;
      }
      
      let end = index;
      for(let i = index; i < layout.totalLength; i++) {
          const c = layout.charPositions.find(pos => pos.index === i);
          if (!c || c.char.match(/\s/)) {
             end = i; 
             break;
          }
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
 * --- 3. COMPONENTS ---
 */

const HiddenInput = ({ value, selectionStart, selectionEnd, onChange, onSelect, onKeyDown, onBlur }) => {
  const ref = useRef(null);
  
  useEffect(() => {
    if (ref.current) {
        if (document.activeElement !== ref.current) {
            ref.current.focus({ preventScroll: true });
        }
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
      autoFocus
      style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          opacity: 0, 
          width: '1px', 
          height: '1px', 
          border: 'none', 
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          zIndex: -1 
        }}
    />
  );
};

const Toolbar = ({ activeElement, currentStyle, onUpdateStyle, onAddText, onDelete }) => {
    const btnClass = "p-2 hover:bg-gray-100 rounded text-gray-700 transition";
    const activeClass = "bg-blue-100 text-blue-600";
    
    if (!activeElement) {
        return (
             <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-200 shadow-sm h-14">
                <div className="font-bold text-gray-700 mr-4">Canvas Editor</div>
                <button title="Add New Text Block" onClick={onAddText} className="flex items-center gap-2 bg-pink-600 text-white px-3 py-1.5 rounded hover:bg-pink-700 text-sm font-medium">
                    <Plus size={16} /> Add Text
                </button>
            </div>
        );
    }

    const style = currentStyle || activeElement.defaultStyle;

    return (
        <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-200 shadow-sm h-14">
            <div className="font-bold text-gray-700 mr-4 border-r pr-4">Editor</div>
            
            <select 
                title="Font Family"
                className="border border-gray-300 rounded px-2 py-1 text-sm outline-none cursor-pointer"
                value={style.fontFamily}
                onChange={(e) => onUpdateStyle('fontFamily', e.target.value)}
            >
                {['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New'].map(f => (
                    <option key={f} value={f}>{f}</option>
                ))}
            </select>

            <input 
                title="Font Size"
                type="number" 
                className="w-16 border border-gray-300 rounded px-2 py-1 text-sm outline-none"
                value={style.fontSize}
                onChange={(e) => onUpdateStyle('fontSize', parseInt(e.target.value))}
                min="8" max="72"
            />

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <button title="Bold" className={`${btnClass} ${style.isBold ? activeClass : ''}`} onClick={() => onUpdateStyle('isBold', !style.isBold)}><Bold size={18}/></button>
            <button title="Italic" className={`${btnClass} ${style.isItalic ? activeClass : ''}`} onClick={() => onUpdateStyle('isItalic', !style.isItalic)}><Italic size={18}/></button>
            
            <div className="relative group">
                <button title="Text Color" className={btnClass}><Palette size={18} style={{ color: style.fill }}/></button>
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={style.fill} onChange={(e) => onUpdateStyle('fill', e.target.value)}/>
            </div>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            {/* Spacing Controls */}
            <div className="flex items-center gap-1 border border-gray-200 rounded p-1 mr-2">
                <div title="Letter Spacing (px)" className="flex items-center relative group">
                    <BetweenHorizontalStart size={16} className="text-gray-500 mr-1"/>
                    <input 
                        type="number" 
                        className="w-12 text-xs border-b border-gray-300 outline-none"
                        value={style.letterSpacing || 0}
                        onChange={(e) => onUpdateStyle('letterSpacing', parseFloat(e.target.value))}
                        step="0.5"
                    />
                </div>
                <div title="Line Height (multiplier)" className="flex items-center ml-2 relative group">
                    <MoveVertical size={16} className="text-gray-500 mr-1"/>
                    <input 
                        type="number" 
                        className="w-12 text-xs border-b border-gray-300 outline-none"
                        value={style.lineHeight || 1.2}
                        onChange={(e) => onUpdateStyle('lineHeight', parseFloat(e.target.value))}
                        step="0.1"
                    />
                </div>
                <div title="Paragraph Spacing (px)" className="flex items-center ml-2 relative group">
                    <Logs size={16} className="text-gray-500 mr-1"/>
                    <input 
                        type="number" 
                        className="w-12 text-xs border-b border-gray-300 outline-none"
                        value={activeElement.defaultStyle.paragraphSpacing || 0}
                        onChange={(e) => onUpdateStyle('paragraphSpacing', parseInt(e.target.value))}
                        step="1"
                    />
                </div>
            </div>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <button title="Align Left" className={`${btnClass} ${activeElement.defaultStyle.align === 'left' ? activeClass : ''}`} onClick={() => onUpdateStyle('align', 'left')}><AlignLeft size={18}/></button>
            <button title="Align Center" className={`${btnClass} ${activeElement.defaultStyle.align === 'center' ? activeClass : ''}`} onClick={() => onUpdateStyle('align', 'center')}><AlignCenter size={18}/></button>
            <button title="Align Right" className={`${btnClass} ${activeElement.defaultStyle.align === 'right' ? activeClass : ''}`} onClick={() => onUpdateStyle('align', 'right')}><AlignRight size={18}/></button>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            
            <button 
                title={activeElement.autoFit ? "Disable Auto-Fit" : "Enable Auto-Fit"}
                className={`${btnClass} ${activeElement.autoFit ? activeClass : ''}`} 
                onClick={() => onUpdateStyle('autoFit', !activeElement.autoFit)}
            >
                <Maximize size={18}/>
            </button>

            <div className="flex-1"></div>
            
            <button title="Delete Element" className="p-2 text-red-500 hover:bg-red-50 rounded" onClick={onDelete}>
                <Trash2 size={18} />
            </button>
        </div>
    );
};

/**
 * --- 4. MAIN APP ---
 */
export default function CanvasRichTextEditor() {
    const canvasRef = useRef(null);
    const [elements, setElements] = useState(INITIAL_DATA);
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [dragInfo, setDragInfo] = useState({ isDragging: false, startX: 0, startY: 0, originalX: 0, originalY: 0, type: 'none' });
    
    // Use Ref for selection to avoid stale closures in event handlers
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
        
        // Grid
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<STAGE_WIDTH; i+=20) { ctx.moveTo(i, 0); ctx.lineTo(i, STAGE_HEIGHT); }
        for(let i=0; i<STAGE_HEIGHT; i+=20) { ctx.moveTo(0, i); ctx.lineTo(STAGE_WIDTH, i); }
        ctx.stroke();

        elements.forEach(el => {
            ctx.save();
            ctx.translate(el.x, el.y);
            
            const layout = TextLayoutEngine.calculateLayout(ctx, el.valueList, el.width, el.defaultStyle.align, el.defaultStyle.paragraphSpacing);
            el._renderHeight = layout.totalHeight;
            el._layout = layout; 

            // Highlight
            if (isEditing && selectedId === el.id) {
                const { start, end } = selection;
                if (start !== end) {
                    const min = Math.min(start, end);
                    const max = Math.max(start, end);
                    
                    ctx.fillStyle = "rgba(236, 72, 153, 0.2)"; 
                    
                    layout.charPositions.forEach(charPos => {
                        if (charPos.index >= min && charPos.index < max) {
                            ctx.fillRect(charPos.x, charPos.y, charPos.width + 0.5, charPos.height);
                        }
                    });
                }
            }

            // Text
            layout.charPositions.forEach(charPos => {
                 const style = charPos.style;
                 const fontStyle = style.isItalic ? "italic" : "normal";
                 const fontWeight = style.isBold ? "bold" : "normal";
                 ctx.font = `${fontStyle} ${fontWeight} ${style.fontSize}px ${style.fontFamily}`;
                 ctx.fillStyle = style.fill;
                 // Visual fix: Position text based on its specific Font Size baseline (approx 0.9em), 
                 // NOT the line box height which grows with line spacing.
                 // This ensures first line stays pinned at top.
                 ctx.fillText(charPos.char, charPos.x, charPos.y + charPos.fontSize * 0.9);
            });

            // Cursor
            if (isEditing && selectedId === el.id && blinkVisible) {
                let cursorX = 0;
                let cursorY = 0;
                let cursorHeight = 24;

                const cursorIndex = selection.end; 
                const charPos = layout.charPositions.find(c => c.index === cursorIndex);
                
                if (charPos) {
                    cursorX = charPos.x;
                    cursorY = charPos.y;
                    // Cursor should span full line height (visual preference) or just font size?
                    // Usually line height looks better in rich text
                    cursorHeight = charPos.height; 
                } else {
                    const lastChar = layout.charPositions[layout.charPositions.length - 1];
                    if (cursorIndex >= layout.totalLength && lastChar) {
                        cursorX = lastChar.x + lastChar.width;
                        cursorY = lastChar.y;
                        cursorHeight = lastChar.height;
                    } 
                    else {
                        let line = layout.lines.find(l => cursorIndex >= l.startIndex && cursorIndex <= l.endIndex);
                        if (!line && cursorIndex === layout.totalLength) {
                            line = layout.lines[layout.lines.length - 1];
                        }

                        if (line) {
                            cursorY = line.y;
                            cursorHeight = line.height;
                            if (el.defaultStyle.align === 'center') cursorX = el.width / 2;
                            else if (el.defaultStyle.align === 'right') cursorX = el.width;
                            else cursorX = 0;
                        }
                    }
                }

                console.log('>>>>> cursor: ', {cursorX, cursorY, cursorHeight, selection, charPos, layout});
                ctx.beginPath();
                ctx.moveTo(cursorX, cursorY);
                ctx.lineTo(cursorX, cursorY + cursorHeight);
                ctx.strokeStyle = "#ec4899"; 
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Border
            if (selectedId === el.id) {
                ctx.strokeStyle = '#ec4899'; 
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 5]);
                const boxHeight = el.autoFit ? layout.totalHeight : (el.height || 100);
                ctx.strokeRect(0, 0, el.width, boxHeight);
                ctx.setLineDash([]);
                
                if (!isEditing) {
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = '#ec4899';
                    ctx.beginPath();
                    ctx.arc(el.width, boxHeight / 2, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
            }

            ctx.restore();
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
        clickTracker.current.x = x;
        clickTracker.current.y = y;

        // Resize Check
        if (selectedId && !isEditing) {
            const el = elements.find(e => e.id === selectedId);
            if (el) {
                const boxHeight = el.autoFit && el._renderHeight ? el._renderHeight : (el.height || 100);
                const handleX = el.x + el.width;
                const handleY = el.y + boxHeight / 2;
                if (Math.sqrt(Math.pow(x - handleX, 2) + Math.pow(y - handleY, 2)) <= 10) {
                    clickedId = selectedId;
                    actionType = 'resize';
                }
            }
        }

        if (actionType === 'none') {
            for (let i = elements.length - 1; i >= 0; i--) {
                const el = elements[i];
                const boxHeight = el.autoFit && el._renderHeight ? el._renderHeight : (el.height || 100);
                if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + boxHeight) {
                    clickedId = el.id;
                    
                    if (isEditing && selectedId === el.id) {
                        const localX = x - el.x;
                        const localY = y - el.y;
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
                        
                        console.log('>>>>> handleMouseDown: ', {index, localX, localY, el, layout: el._layout, newSelection});

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
            
            if (!isEditing && actionType === 'text_select') {
               setIsEditing(true);
            }

            setDragInfo({
                isDragging: true,
                startX: x,
                startY: y,
                originalX: el.x,
                originalY: el.y,
                originalWidth: el.width,
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
                setElements(prev => prev.map(el => 
                    el.id === selectedId ? { ...el, x: dragInfo.originalX + dx, y: dragInfo.originalY + dy } : el
                ));
            } 
            else if (dragInfo.type === 'resize') {
                setElements(prev => prev.map(el => 
                    el.id === selectedId ? { ...el, width: Math.max(50, dragInfo.originalWidth + dx) } : el
                ));
            }
            else if (dragInfo.type === 'text_select') {
                const localX = x - activeElement.x;
                const localY = y - activeElement.y;
                const index = TextLayoutEngine.getCharIndexFromPos(localX, localY, activeElement._layout);
                setSelection({ ...selectionRef.current, end: index });
            }
        }
    };

    const handleMouseUp = () => {
        setDragInfo(prev => ({ ...prev, isDragging: false }));
    };

    const handleDoubleClick = (e) => {
        if (!isEditing && selectedId) setIsEditing(true);
    };

    const handleHiddenInputChange = (newText) => {
        const currentSel = selectionRef.current;
        const min = Math.min(currentSel.start, currentSel.end);
        const max = Math.max(currentSel.start, currentSel.end);
        const isRange = min !== max;

        setElements(prev => prev.map(el => {
            if (el.id !== selectedId) return el;

            let newValueList = el.valueList;

            // 1. Delete Range if exists
            if (isRange) {
                newValueList = deleteTextRange(newValueList, min, max);
            }

            // 2. Determine added text
            const lenAfterDelete = activeFullText.length - (max - min);
            const charsAddedCount = newText.length - lenAfterDelete;
            
            if (charsAddedCount > 0) {
                const textToInsert = newText.slice(min, min + charsAddedCount);
                newValueList = insertTextAt(newValueList, min, textToInsert);
                
                const newCursor = min + charsAddedCount;
                setSelection({ start: newCursor, end: newCursor });
            } else {
                // Just a deletion
                setSelection({ start: min, end: min });
            }

            return { ...el, valueList: newValueList };
        }));
    };
    
    const handleKeyDown = (e) => {
        if (!isEditing || !activeElement) return;
        
        const currentSel = selectionRef.current;
        const min = Math.min(currentSel.start, currentSel.end);
        const max = Math.max(currentSel.start, currentSel.end);
        const isRange = min !== max;
        
        let handled = false;

        if (e.key === 'Enter') {
            handled = true;
            e.preventDefault(); 
            
            setElements(prev => prev.map(el => {
                if (el.id !== selectedId) return el;
                
                let list = el.valueList;
                if (isRange) list = deleteTextRange(list, min, max);
                list = insertTextAt(list, min, '\n'); 
                
                return { ...el, valueList: list };
            }));
            
            const newPos = min + 1;
            setSelection({ start: newPos, end: newPos });
        }
        
        else if (e.key === 'Backspace') {
            handled = true;
            e.preventDefault(); 

            let newPos = min;
            setElements(prev => prev.map(el => {
                if (el.id !== selectedId) return el;
                
                let newValueList;
                if (isRange) {
                    newValueList = deleteTextRange(el.valueList, min, max);
                    newPos = min; // Collapse to start of selection
                } else if (min > 0) {
                    // Regular Backspace: delete left char
                    newValueList = deleteTextRange(el.valueList, min - 1, min);
                    newPos = min - 1;
                } else {
                    return el;
                }
                
                return { ...el, valueList: newValueList };
            }));
            setSelection({ start: newPos, end: newPos });
        } 
        
        else if (e.key === 'Delete') {
             handled = true;
             e.preventDefault();

             setElements(prev => prev.map(el => {
                if (el.id !== selectedId) return el;
                
                const totalLen = el._layout ? el._layout.totalLength : 0;
                let newValueList;
                
                if (isRange) {
                    newValueList = deleteTextRange(el.valueList, min, max);
                    setSelection({ start: min, end: min }); // Collapse to start
                } else if (min < totalLen) {
                    // Regular Delete: delete right char
                    newValueList = deleteTextRange(el.valueList, min, min + 1);
                    setSelection({ start: min, end: min }); // Cursor stays in place
                } else {
                    return el;
                }
                
                return { ...el, valueList: newValueList };
             }));
        }
    };

    const handleStyleUpdate = (key, val) => {
        if (!activeElement) return;

        setElements(prev => prev.map(el => {
            if (el.id === selectedId) {
                // If special non-span props
                if (['autoFit', 'paragraphSpacing'].includes(key)) {
                    // paragraphSpacing is on defaultStyle usually, or root element?
                    // We put it on defaultStyle for block-level application
                    return { 
                        ...el, 
                        autoFit: key === 'autoFit' ? val : el.autoFit,
                        defaultStyle: { ...el.defaultStyle, [key]: val }
                    };
                }

                const currentSel = selectionRef.current;
                const min = Math.min(currentSel.start, currentSel.end);
                const max = Math.max(currentSel.start, currentSel.end);

                if (min !== max) {
                    const newValueList = applyStyleToRange(el.valueList, min, max, key, val);
                    return { ...el, valueList: newValueList };
                } 
                else {
                     return { ...el, defaultStyle: { ...el.defaultStyle, [key]: val } };
                }
            }
            return el;
        }));
    };

    const handleAddText = () => {
        const newId = generateId();
        setElements(prev => [...prev, {
            id: newId,
            type: "RICH_TEXT",
            x: STAGE_WIDTH / 2 - 100,
            y: STAGE_HEIGHT / 2 - 25,
            width: 200,
            isEditing: false,
            autoFit: true,
            defaultStyle: { fontSize: 24, fontFamily: "Arial", fill: "#000000", align: 'center', isBold: false, isItalic: false },
            valueList: [{ text: "Double click me", fontSize: 24, fontFamily: "Arial", fill: "#000000" }]
        }]);
        setSelectedId(newId);
    };

    const handleDelete = () => {
        if (selectedId) {
            setElements(prev => prev.filter(e => e.id !== selectedId));
            setSelectedId(null);
            setIsEditing(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans select-none">
            <Toolbar 
                activeElement={activeElement}
                currentStyle={currentStyleAtCursor}
                onUpdateStyle={handleStyleUpdate} 
                onAddText={handleAddText}
                onDelete={handleDelete}
            />

            <div className="flex-1 overflow-auto flex justify-center items-center p-8 bg-gray-100">
                <div className="relative shadow-xl bg-white" style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}>
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
                    onSelect={(s, e) => {
                        if (!dragInfo.isDragging) {
                           setSelection({ start: s, end: e });
                        }
                    }}
                    onBlur={() => { /* keep alive */ }} 
                />
            )}
            
            <div className="bg-gray-200 text-xs p-1 flex gap-4">
                <span>Sel: {selection.start}-{selection.end}</span>
                <span>Mode: {isEditing ? "Edit" : "View"}</span>
            </div>
        </div>
    );
}