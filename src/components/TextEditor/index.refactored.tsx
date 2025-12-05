/**
 * Canvas Rich Text Editor - Refactored with Plugin System
 * Main component that orchestrates all plugins and core functionality
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { TextElement, DefaultStyle, PluginContext } from './types';
import { STAGE_WIDTH, STAGE_HEIGHT, CLICK_TIMEOUT } from './core/constants';
import { generateId } from './core/utils';
import { useHistory } from './core/history';
import { deleteTextRange, insertTextAt, applyStyleToRange } from './core/textManipulation';
import { TextLayoutEngine } from './core/layoutEngine';
import { pluginRegistry } from './core/pluginSystem';
import { registerAllPlugins } from './plugins';
import { HiddenInput } from './components/HiddenInput';
import { Toolbar } from './Toolbar';
import { Icons } from './components/icons';

// Initial State
const INITIAL_DATA: TextElement[] = [
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
    listType: 'none',
    listIndent: 0,
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

export default function CanvasRichTextEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Register plugins on mount
  useEffect(() => {
    registerAllPlugins();
    return () => {
      pluginRegistry.cleanupAll();
    };
  }, []);
  
  // Use History Hook
  const { 
    state: elements, 
    setState: setElements, 
    undo, redo, canUndo, canRedo 
  } = useHistory<TextElement[]>(INITIAL_DATA);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dragInfo, setDragInfo] = useState<{
    isDragging: boolean;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
    originalWidth?: number;
    originalHeight?: number;
    type: string;
  }>({ isDragging: false, startX: 0, startY: 0, originalX: 0, originalY: 0, type: 'none' });
  
  const selectionRef = useRef({ start: 0, end: 0 });
  const [selection, setSelectionState] = useState({ start: 0, end: 0 });
  const setSelection = (newSel: { start: number; end: number }) => {
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
    const charPos = activeElement._layout.charPositions.find((c: any) => c.index === indexToCheck);
    return charPos ? charPos.style : activeElement.defaultStyle;
  }, [activeElement, selection.end]);

  // Plugin Context
  const pluginContext: PluginContext = useMemo(() => ({
    activeElement,
    currentStyle: currentStyleAtCursor,
    selection: selectionRef.current,
    elements,
    setElements,
    onUpdateStyle: handleStyleUpdate,
    canvasRef
  }), [activeElement, currentStyleAtCursor, elements, selection]);

  // Initialize plugins with context
  useEffect(() => {
    pluginRegistry.initializeAll(pluginContext);
  }, [pluginContext]);

  useEffect(() => {
    if (!isEditing) return;
    const interval = setInterval(() => setBlinkVisible(v => !v), 500);
    return () => clearInterval(interval);
  }, [isEditing]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    
    // Grid Background
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<STAGE_WIDTH; i+=20) { ctx.moveTo(i, 0); ctx.lineTo(i, STAGE_HEIGHT); }
    for(let i=0; i<STAGE_HEIGHT; i+=20) { ctx.moveTo(0, i); ctx.lineTo(STAGE_WIDTH, i); }
    ctx.stroke();

    elements.forEach(el => {
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
      
      let startY = el.y;
      if (el.autoFit) {
        if (el.verticalAlign === 'middle') {
          startY += (el.height - layout.totalHeight) / 2;
        } else if (el.verticalAlign === 'bottom') {
          startY += (el.height - layout.totalHeight);
        }
      }

      ctx.save();
      ctx.translate(el.x, startY);

      // Draw Backgrounds
      layout.backgrounds.forEach((bg: any) => {
        ctx.fillStyle = bg.fill;
        ctx.fillRect(bg.x, bg.y, bg.width, bg.height);
      });

      // Draw Selection
      if (isEditing && selectedId === el.id) {
        const { start, end } = selection;
        if (start !== end) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          ctx.fillStyle = "rgba(59, 130, 246, 0.2)"; 
          layout.charPositions.forEach((charPos: any) => {
            if (charPos.index >= min && charPos.index < max) {
              ctx.fillRect(charPos.x, charPos.y, charPos.width + 0.5, charPos.height);
            }
          });
        }
      }
      
      // Draw List Markers
      layout.listMarkers.forEach((marker: any) => {
        ctx.font = `bold ${marker.fontSize}px ${marker.fontFamily}`;
        ctx.fillStyle = marker.color;
        ctx.fillText(marker.text, marker.x, marker.y + marker.fontSize * 0.9);
      });

      // Draw Text with Shadows
      layout.charPositions.forEach((charPos: any) => {
        const style = charPos.style;
        const fontStyle = style.isItalic ? "italic" : "normal";
        const fontWeight = style.isBold ? "bold" : "normal";
        ctx.font = `${fontStyle} ${fontWeight} ${style.fontSize}px ${style.fontFamily}`;
        
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
        
        ctx.shadowColor = "transparent";
      });

      // Draw Decorations
      layout.decorations.forEach((dec: any) => {
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

      // Cursor
      if (isEditing && selectedId === el.id && blinkVisible) {
        let cursorX = 0, cursorY = 0, cursorHeight = 24;
        const cursorIndex = selection.end; 
        const charPos = layout.charPositions.find((c: any) => c.index === cursorIndex);
        
        if (charPos) {
          cursorX = charPos.x; cursorY = charPos.y; cursorHeight = charPos.height; 
        } else {
          const lastChar = layout.charPositions[layout.charPositions.length - 1];
          if (cursorIndex >= layout.totalLength && lastChar) {
            cursorX = lastChar.x + lastChar.width; cursorY = lastChar.y; cursorHeight = lastChar.height;
          } else if (cursorIndex === 0 && layout.lines.length > 0) {
            cursorX = layout.lines[0].x; cursorY = layout.lines[0].y; cursorHeight = layout.lines[0].height || 24;
          } else {
            let line = layout.lines.find((l: any) => cursorIndex >= l.startIndex && cursorIndex <= l.endIndex);
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

      // Border & Handles
      if (selectedId === el.id) {
        const renderY = startY; 
        const boxHeight = el.autoFit ? el.height : layout.totalHeight;
        
        ctx.save();
        ctx.translate(el.x, renderY);
        ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; 
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(0, 0, el.width, boxHeight);
        ctx.setLineDash([]);
        
        if (!isEditing) {
          ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#3b82f6'; 
          ctx.beginPath(); ctx.arc(el.width, boxHeight / 2, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          
          if (el.autoFit) {
            ctx.beginPath(); ctx.arc(el.width / 2, boxHeight, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(el.width, boxHeight, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); 
          }
        }
        ctx.restore();
      }
    });

  }, [elements, selectedId, isEditing, selection, blinkVisible]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);
    let clickedId: string | null = null;
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
        const boxHeight = el.autoFit ? el.height : layoutH;
        const renderY = el.autoFit ? el.y : 
                       (el.verticalAlign === 'middle' ? el.y + (el.height - layoutH)/2 : 
                        el.verticalAlign === 'bottom' ? el.y + (el.height - layoutH) : el.y);
        
        const hwX = el.x + el.width;
        const hwY = renderY + boxHeight / 2;
        if (Math.sqrt(Math.pow(x - hwX, 2) + Math.pow(y - hwY, 2)) <= 8) {
          clickedId = selectedId;
          actionType = 'resize_width';
        }

        if (!clickedId && el.autoFit) {
          const hhX = el.x + el.width / 2;
          const hhY = renderY + boxHeight;
          if (Math.sqrt(Math.pow(x - hhX, 2) + Math.pow(y - hhY, 2)) <= 8) {
            clickedId = selectedId;
            actionType = 'resize_height';
          }
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

        const hitY = renderY;
        
        if (x >= el.x && x <= el.x + el.width && y >= hitY && y <= hitY + boxHeight) {
          clickedId = el.id;
          if (isEditing && selectedId === el.id) {
            const localX = x - el.x;
            const localY = y - renderY;
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
      if (!el) return;
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

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);
    if (dragInfo.isDragging && activeElement) {
      const dx = x - dragInfo.startX;
      const dy = y - dragInfo.startY;

      if (dragInfo.type === 'move') {
        setElements(elements.map(el => el.id === selectedId ? { ...el, x: dragInfo.originalX + dx, y: dragInfo.originalY + dy } : el));
      } 
      else if (dragInfo.type === 'resize_width') {
        const newWidth = Math.max(50, (dragInfo.originalWidth || 0) + dx);
        const updatedElements = elements.map(el => {
          if (el.id === selectedId) {
            let updatedEl = { ...el, width: newWidth };
            if (el.autoFit) {
              const ctx = canvasRef.current?.getContext('2d');
              if (!ctx) return el;
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
        const dHeight = dragInfo.type === 'resize_corner' ? dy : dy; 
        const dWidth = dragInfo.type === 'resize_corner' ? dx : 0;

        const newHeight = Math.max(50, (dragInfo.originalHeight || 0) + dHeight);
        const newWidth = Math.max(50, (dragInfo.originalWidth || 0) + dWidth);
        
        const updatedElements = elements.map(el => {
          if (el.id === selectedId) {
            let updatedEl = { ...el, height: newHeight, width: newWidth };
            if (el.autoFit) {
              const ctx = canvasRef.current?.getContext('2d');
              if (!ctx) return el;
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

  const handleHiddenInputChange = (newText: string, isPaste = false) => {
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

      let finalEl = { ...el, valueList: newValueList };
      if (finalEl.autoFit) {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return finalEl;
        const containerProps = { align: finalEl.defaultStyle.align, paragraphSpacing: finalEl.defaultStyle.paragraphSpacing, listType: finalEl.listType, listIndent: finalEl.listIndent, defaultStyle: finalEl.defaultStyle };
        const optimalSize = TextLayoutEngine.calculateOptimalFontSize(ctx, finalEl.valueList, finalEl.width, finalEl.height, containerProps);
        finalEl.valueList = finalEl.valueList.map(v => ({...v, fontSize: optimalSize}));
        finalEl.defaultStyle = {...finalEl.defaultStyle, fontSize: optimalSize};
      }
      return finalEl;
    }));
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditing || !activeElement) return;
    const currentSel = selectionRef.current;
    const min = Math.min(currentSel.start, currentSel.end);
    const max = Math.max(currentSel.start, currentSel.end);
    const isRange = min !== max;
    
    const updateWithFit = (updatedEl: TextElement) => {
      if (updatedEl.autoFit) {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return updatedEl;
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

  const handleStyleUpdate = (key: string, val: any) => {
    if (!activeElement) return;
    setElements(elements.map(el => {
      if (el.id !== selectedId) return el;
      
      if (['autoFit', 'paragraphSpacing', 'verticalAlign', 'align', 'listType', 'listIndent'].includes(key)) {
        let newEl = { ...el, [key]: val };
        
        if (['align', 'paragraphSpacing'].includes(key)) {
          newEl.defaultStyle = { ...newEl.defaultStyle, [key]: val };
        }
        
        if (key === 'verticalAlign') newEl.verticalAlign = val;

        if (key === 'autoFit' && val === true) {
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx) return newEl;
          if (!newEl.height || newEl.height < 50) newEl.height = newEl._renderHeight || 100;
          const containerProps = { align: newEl.defaultStyle.align, paragraphSpacing: newEl.defaultStyle.paragraphSpacing, listType: newEl.listType, listIndent: newEl.listIndent, defaultStyle: newEl.defaultStyle };
          const optimalSize = TextLayoutEngine.calculateOptimalFontSize(ctx, newEl.valueList, newEl.width, newEl.height, containerProps);
          newEl.valueList = newEl.valueList.map(v => ({...v, fontSize: optimalSize}));
          newEl.defaultStyle = {...newEl.defaultStyle, fontSize: optimalSize};
        }

        return newEl;
      }
      
      const needsRefit = el.autoFit && ['fontFamily', 'isBold', 'isItalic', 'letterSpacing', 'lineHeight', 'textTransform'].includes(key);

      let updatedEl = { ...el };
      const { start, end } = selectionRef.current;
      
      if (start !== end) {
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        updatedEl.valueList = applyStyleToRange(el.valueList, min, max, key, val);
      } else {
        updatedEl.defaultStyle = { ...el.defaultStyle, [key]: val };
        updatedEl.valueList = updatedEl.valueList.map(v => ({
          ...v,
          [key]: val
        }));
      }

      if (needsRefit) {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return updatedEl;
        const containerProps = { align: updatedEl.defaultStyle.align, paragraphSpacing: updatedEl.defaultStyle.paragraphSpacing, listType: updatedEl.listType, listIndent: updatedEl.listIndent, defaultStyle: updatedEl.defaultStyle };
        const optimalSize = TextLayoutEngine.calculateOptimalFontSize(ctx, updatedEl.valueList, updatedEl.width, updatedEl.height, containerProps);
        updatedEl.valueList = updatedEl.valueList.map(v => ({...v, fontSize: optimalSize}));
        updatedEl.defaultStyle = {...updatedEl.defaultStyle, fontSize: optimalSize};
      }

      return updatedEl;
    }));
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    if (!activeElement) return;
    e.preventDefault();
    const { start, end } = selectionRef.current;
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const plainText = activeFullText.slice(min, max);
    e.clipboardData.setData('text/plain', plainText);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (text) handleHiddenInputChange(text, true);
  };

  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    const isCmd = e.metaKey || e.ctrlKey;
    if (isCmd && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) { const s = redo(); if(s) setElements(s); }
      else { const s = undo(); if(s) setElements(s); }
      return;
    }
    
    // Let plugins handle keyboard shortcuts
    if (isEditing && pluginRegistry.handleKeyDown(e, pluginContext)) {
      return;
    }
    
    if (isEditing && isCmd && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      if (activeElement && activeElement._layout) {
        setSelection({ start: 0, end: activeElement._layout.totalLength });
      }
    }
  };

  const handleAddText = () => {
    const newId = generateId();
    const newEl: TextElement = {
      id: newId, 
      type: "RICH_TEXT", 
      x: STAGE_WIDTH / 2 - 150, 
      y: STAGE_HEIGHT / 2 - 75, 
      width: 300, 
      height: 150, 
      isEditing: false, 
      autoFit: false, 
      verticalAlign: 'top',
      listType: 'none', 
      listIndent: 0,
      defaultStyle: { 
        fontSize: 24, 
        fontFamily: "Arial", 
        fill: "#000000", 
        align: 'center', 
        isBold: false, 
        isItalic: false, 
        isUnderline: false, 
        isStrike: false, 
        backgroundColor: null,
        lineHeight: 1.2,
        letterSpacing: 0,
        paragraphSpacing: 0,
        textTransform: 'none',
        shadow: false
      },
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
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans select-none" onKeyDown={handleGlobalKeyDown as any} tabIndex={0}>
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
        context={pluginContext}
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

