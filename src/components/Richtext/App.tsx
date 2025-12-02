import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Grid,
    Type,
    Droplet,
    Move,
    Minus,
    Plus,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Maximize2,
    GitPullRequestClosed,
    Ruler,
    List,
    ListOrdered,
} from 'lucide-react';

// --- Configuration & Constants ---
const FONT_BASE_SIZE = 16;
const PADDING_X = 10;
const PADDING_Y = 10;
const TEXT_COLOR_DEFAULT = '#374151';
const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 500;
const GRID_SIZE = 20;
const BLINK_RATE = 500;
const LIST_INDENT_STEP = 20; // Pixels per list level

const FONT_DEFAULT = 'Inter';
const BASE_FONT = 'sans-serif';
const FONT_FAMILIES = [
    FONT_DEFAULT,
    'Arial',
    'Verdana',
    'Times New Roman',
    'Courier New',
    'Roboto',
    'Lato',
    'Open Sans',
    'Montserrat',
];

const ALIGNMENTS = [
    { key: 'left', icon: AlignLeft },
    { key: 'center', icon: AlignCenter },
    { key: 'right', icon: AlignRight },
    { key: 'justify', icon: AlignJustify },
];
const LINE_HEIGHT_DEFAULT = 1.2;

// --- Helper Functions ---

const getFontString = (style) => {
    const bold = style.bold ? 'bold ' : '';
    const italic = style.italic ? 'italic ' : '';
    const fontSize = style.fontSize || FONT_BASE_SIZE;
    const fontFamily = style.fontFamily || FONT_DEFAULT;
    return `${italic}${bold}${fontSize}px ${fontFamily}, ${BASE_FONT}`;
};

const getLineText = (runs) => {
    if (!runs) return '';
    return runs.map((run) => run.text).join('');
};

const getInitialTextElement = (x, y) => ({
    id: Date.now(),
    type: 'text',
    x: x,
    y: y,
    w: 500,
    h: 150,
    bgColor: 'transparent',
    alignment: 'left',
    lineHeight: 1.0,
    lines: [
        {
            listType: null,
            listLevel: 0,
            runs: [
                {
                    text: 'Te',
                    bold: true,
                    color: '#D45037',
                    fontSize: 50,
                    fontFamily: FONT_DEFAULT,
                    runBgColor: '#0000FF',
                },
                {
                    text: 'st Mismatc',
                    bold: true,
                    color: '#D45037',
                    fontSize: 50,
                    fontFamily: FONT_DEFAULT,
                    runBgColor: 'transparent',
                },
            ],
        },
        {
            listType: 'bullet',
            listLevel: 1,
            runs: [
                {
                    text: 'Bullet point item',
                    bold: false,
                    color: TEXT_COLOR_DEFAULT,
                    fontSize: 18,
                    fontFamily: FONT_DEFAULT,
                    runBgColor: 'transparent',
                },
            ],
        },
    ],
});

// --- Main Component ---

const CanvasDesignStageEditor = () => {
    const canvasRef = useRef(null);
    const inputRef = useRef(null);
    const ctxRef = useRef(null);

    // --- State ---
    const [elements, setElements] = useState([
        getInitialTextElement(STAGE_WIDTH / 2 - 250, STAGE_HEIGHT / 2 - 75),
    ]);
    const [selectedId, setSelectedId] = useState(elements[0].id);

    // Style State (applied to new typing or selection)
    const [currentStyle, setCurrentStyle] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        color: TEXT_COLOR_DEFAULT,
        fontSize: FONT_BASE_SIZE,
        fontFamily: FONT_DEFAULT,
        runBgColor: 'transparent',
    });

    const [cursor, setCursor] = useState({ line: 0, charIndex: 0, isVisible: true });
    const [selection, setSelection] = useState(null); // { start: {line, char}, end: {line, char} }

    // UI Mode State
    const [isFocused, setIsFocused] = useState(false); // Edit Mode
    const [isDragging, setIsDragging] = useState(false); // Moving Element
    const [isSelecting, setIsSelecting] = useState(false); // Dragging Text Selection
    const [showGrid, setShowGrid] = useState(false);
    const [showDebug, setShowDebug] = useState(false);

    // Refs for interaction
    const dragOffset = useRef({ x: 0, y: 0 });
    const selectionStartRef = useRef(null);
    const lastBlinkTimeRef = useRef(0);
    const animationFrameRef = useRef();
    const mousePositionRef = useRef({ x: 0, y: 0 });

    const selectedElement = elements.find((el) => el.id === selectedId);

    // --- Utilities ---

    const getContext = useCallback(() => {
        if (!ctxRef.current) {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            ctxRef.current = canvas.getContext('2d');
        }
        return ctxRef.current;
    }, []);

    const getTextRunWidth = useCallback((ctx, text, style) => {
        ctx.font = getFontString(style);
        return ctx.measureText(text).width;
    }, []);

    // Ensure selection start is always before end
    const normalizeSelection = useCallback((sel) => {
        if (!sel) return null;
        const { start, end } = sel;
        if (
            start.line < end.line ||
            (start.line === end.line && start.charIndex <= end.charIndex)
        ) {
            return sel;
        }
        return { start: end, end: start };
    }, []);

    // Merge adjacent identical runs to optimize rendering and state
    const mergeRuns = (runs) => {
        if (runs.length < 2) return runs;
        const merged = [];
        let current = { ...runs[0] };

        for (let i = 1; i < runs.length; i++) {
            const next = runs[i];
            const keys = [
                'bold',
                'italic',
                'underline',
                'strikethrough',
                'color',
                'fontSize',
                'fontFamily',
                'runBgColor',
            ];
            const match = keys.every((k) => current[k] === next[k]);
            if (match) {
                current.text += next.text;
            } else {
                merged.push(current);
                current = { ...next };
            }
        }
        merged.push(current);
        return merged.filter((r) => r.text.length > 0);
    };

    // Calculate list number for a given line index and level
    const getListNumber = (lines, lineIndex, listType, listLevel) => {
        if (listType !== 'numeric' || listLevel === 0) return null;

        let count = 0;
        for (let i = 0; i <= lineIndex; i++) {
            const line = lines[i];
            // Only count items at the same level
            if (line.listType === 'numeric' && line.listLevel === listLevel) {
                count++;
            }
            // Complex numbering logic skipped for simple continuous numbering within level
        }
        return count;
    };

    // Calculate (Line, CharIndex) from mouse (X, Y)
    const getLogicalCharCoordsFromMouse = useCallback(
        (el, mouseX, mouseY, ctx) => {
            let foundLine = el.lines.length - 1;
            let foundCharIndex = getLineText(el.lines[foundLine].runs).length;
            let currentY = el.y + PADDING_Y;

            for (let i = 0; i < el.lines.length; i++) {
                const line = el.lines[i];
                const runs = line.runs || [];

                const maxFontSize = runs.reduce(
                    (max, run) => Math.max(max, run.fontSize || FONT_BASE_SIZE),
                    FONT_BASE_SIZE
                );
                const lineHeightPx = (el.lineHeight || LINE_HEIGHT_DEFAULT) * maxFontSize;

                if (mouseY >= currentY && mouseY <= currentY + lineHeightPx) {
                    foundLine = i;
                    foundCharIndex = getLineText(runs).length;

                    const lineIndent = line.listLevel * LIST_INDENT_STEP;
                    let currentX = el.x + PADDING_X + lineIndent;
                    let charCount = 0;

                    for (const run of runs) {
                        const runWidth = getTextRunWidth(ctx, run.text, run);
                        if (mouseX >= currentX && mouseX <= currentX + runWidth) {
                            let subX = currentX;
                            for (let k = 0; k < run.text.length; k++) {
                                const charW = getTextRunWidth(ctx, run.text[k], run);
                                if (mouseX < subX + charW / 2) {
                                    foundCharIndex = charCount + k;
                                    return { line: foundLine, charIndex: foundCharIndex };
                                }
                                subX += charW;
                            }
                            foundCharIndex = charCount + run.text.length;
                            return { line: foundLine, charIndex: foundCharIndex };
                        }
                        currentX += runWidth;
                        charCount += run.text.length;
                    }
                    break;
                }
                currentY += lineHeightPx;
            }
            return { line: foundLine, charIndex: foundCharIndex };
        },
        [getTextRunWidth]
    );

    // --- Drawing Logic ---

    const drawGrid = (ctx) => {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= STAGE_WIDTH; x += GRID_SIZE) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, STAGE_HEIGHT);
        }
        for (let y = 0; y <= STAGE_HEIGHT; y += GRID_SIZE) {
            ctx.moveTo(0, y);
            ctx.lineTo(STAGE_WIDTH, y);
        }
        ctx.stroke();
    };

    const drawElement = useCallback(
        (ctx, el, isSelected) => {
            const align = el.alignment || 'left';
            const sel = isSelected && selection ? normalizeSelection(selection) : null;

            // Background
            if (el.bgColor && el.bgColor !== 'transparent') {
                ctx.fillStyle = el.bgColor;
                ctx.fillRect(el.x, el.y, el.w, el.h);
            }

            let currentY = el.y + PADDING_Y;
            let cursorCoords = null;

            el.lines.forEach((line, lineIndex) => {
                const runs = line.runs || [];

                // 1. Calculate Line Metrics First
                const maxFontSize = runs.reduce(
                    (max, r) => Math.max(max, r.fontSize || FONT_BASE_SIZE),
                    FONT_BASE_SIZE
                );
                const lineVerticalStride = (el.lineHeight || LINE_HEIGHT_DEFAULT) * maxFontSize;

                let lineWidth = 0;
                runs.forEach((r) => (lineWidth += getTextRunWidth(ctx, r.text, r)));

                const lineIndent = line.listLevel * LIST_INDENT_STEP;

                // 2. Calculate Start X based on alignment
                let startX = el.x + PADDING_X + lineIndent;
                if (align === 'center') startX = el.x + el.w / 2 - (lineWidth + lineIndent) / 2;
                else if (align === 'right') startX = el.x + el.w - PADDING_X - lineWidth;

                // 3. Draw List Marker (Bullet or Number)
                if (line.listLevel > 0) {
                    ctx.fillStyle = TEXT_COLOR_DEFAULT;
                    ctx.textBaseline = 'middle';
                    const markerX = el.x + PADDING_X + (lineIndent - LIST_INDENT_STEP * 0.7);
                    const markerY = currentY + lineVerticalStride / 2;

                    if (line.listType === 'bullet') {
                        ctx.beginPath();
                        ctx.arc(markerX, markerY, Math.max(3, maxFontSize / 8), 0, Math.PI * 2);
                        ctx.fill();
                    } else if (line.listType === 'numeric') {
                        const number = getListNumber(
                            el.lines,
                            lineIndex,
                            line.listType,
                            line.listLevel
                        );
                        ctx.font = `normal ${Math.min(16, maxFontSize)}px ${BASE_FONT}`;
                        ctx.textAlign = 'right';
                        ctx.fillText(`${number}.`, markerX, markerY);
                        ctx.textAlign = 'left'; // Reset alignment
                    }
                }

                let currentX = startX;
                let charOffset = 0; // Tracking logical char index in line

                runs.forEach((run) => {
                    const runFontSize = run.fontSize || FONT_BASE_SIZE;
                    const runHeight = lineVerticalStride;
                    const runWidth = getTextRunWidth(ctx, run.text, run);

                    ctx.textBaseline = 'middle';
                    const textY = currentY + lineVerticalStride / 2;

                    ctx.font = getFontString(run);

                    // A. Run Background
                    if (run.runBgColor && run.runBgColor !== 'transparent') {
                        ctx.fillStyle = run.runBgColor;
                        ctx.fillRect(currentX, currentY, runWidth, runHeight);
                    }

                    // B. Special Test Case (Circle)
                    if (run.text === 'Te' && run.runBgColor === '#0000FF') {
                        ctx.fillStyle = '#4CAF50';
                        ctx.beginPath();
                        ctx.arc(
                            currentX + runWidth / 2,
                            currentY + runHeight / 2,
                            Math.min(runWidth, runHeight) * 0.4,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();
                    }

                    // C. Selection Highlight
                    if (sel) {
                        const lineStart = lineIndex === sel.start.line ? sel.start.charIndex : 0;
                        const lineEnd =
                            lineIndex === sel.end.line
                                ? sel.end.charIndex
                                : getLineText(runs).length;

                        const runStart = charOffset;
                        const runEnd = charOffset + run.text.length;

                        const isLineSelected =
                            lineIndex > sel.start.line && lineIndex < sel.end.line;
                        const isStartLine = lineIndex === sel.start.line;
                        const isEndLine = lineIndex === sel.end.line;

                        let drawHighlight = false;
                        let hX = currentX;
                        let hW = runWidth;

                        if (isLineSelected) {
                            drawHighlight = true;
                        } else if (isStartLine || isEndLine) {
                            const selStartOnLine = isStartLine ? sel.start.charIndex : 0;
                            const selEndOnLine = isEndLine ? sel.end.charIndex : 99999;

                            const overlapStart = Math.max(runStart, selStartOnLine);
                            const overlapEnd = Math.min(runEnd, selEndOnLine);

                            if (overlapStart < overlapEnd) {
                                drawHighlight = true;
                                const offsetStr = run.text.substring(0, overlapStart - runStart);
                                const hlStr = run.text.substring(
                                    overlapStart - runStart,
                                    overlapEnd - runStart
                                );
                                hX = currentX + getTextRunWidth(ctx, offsetStr, run);
                                hW = getTextRunWidth(ctx, hlStr, run);
                            }
                        }

                        if (drawHighlight) {
                            ctx.fillStyle = 'rgba(79, 70, 229, 0.3)';
                            ctx.fillRect(hX, currentY, hW, runHeight);
                        }
                    }

                    // D. Text
                    ctx.fillStyle = run.color || TEXT_COLOR_DEFAULT;
                    ctx.fillText(run.text, currentX, textY);

                    // E. Decorations
                    if (run.underline || run.strikethrough) {
                        ctx.strokeStyle = run.color || TEXT_COLOR_DEFAULT;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        if (run.underline) {
                            ctx.moveTo(currentX, textY + runFontSize / 2 + 2);
                            ctx.lineTo(currentX + runWidth, textY + runFontSize / 2 + 2);
                        }
                        if (run.strikethrough) {
                            ctx.moveTo(currentX, textY);
                            ctx.lineTo(currentX + runWidth, textY);
                        }
                        ctx.stroke();
                    }

                    // F. Cursor Calculation
                    if (isSelected && isFocused && cursor.line === lineIndex) {
                        if (
                            cursor.charIndex >= charOffset &&
                            cursor.charIndex <= charOffset + run.text.length
                        ) {
                            const preStr = run.text.substring(0, cursor.charIndex - charOffset);
                            const cursorOffset = getTextRunWidth(ctx, preStr, run);
                            cursorCoords = {
                                x: currentX + cursorOffset,
                                y: currentY,
                                h: runHeight,
                            };
                        }
                    }

                    currentX += runWidth;
                    charOffset += run.text.length;
                });

                // G. Cursor Fallback (Empty Line)
                if (isSelected && isFocused && cursor.line === lineIndex && runs.length === 0) {
                    cursorCoords = {
                        x: startX,
                        y: currentY,
                        h: lineVerticalStride,
                    };
                }

                currentY += lineVerticalStride;
            });

            // 4. Draw Cursor (Finally)
            if (cursorCoords && isFocused && cursor.isVisible) {
                ctx.fillStyle = TEXT_COLOR_DEFAULT;
                ctx.fillRect(cursorCoords.x, cursorCoords.y + 2, 2, cursorCoords.h - 4);
            }

            // 5. Draw Selection Border
            if (isSelected) {
                ctx.strokeStyle = 'rgba(79, 70, 229, 1)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(el.x, el.y, el.w, el.h);
                ctx.setLineDash([]);
            }

            // 6. Debug Info
            if (isSelected && showDebug) {
                ctx.fillStyle = 'blue';
                ctx.font = '10px monospace';
                ctx.fillText(`W:${Math.round(el.w)} H:${Math.round(el.h)}`, el.x, el.y - 5);
            }
        },
        [
            cursor,
            isFocused,
            selection,
            normalizeSelection,
            showDebug,
            getTextRunWidth,
            selectedElement,
        ]
    );

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = getContext();
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);

        // Canvas BG
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

        if (showGrid) drawGrid(ctx);

        elements.forEach((el) => drawElement(ctx, el, el.id === selectedId));

        if (showDebug) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = 'black';
            ctx.font = '12px sans-serif';
            ctx.fillText(
                `Pos: ${Math.round(mousePositionRef.current.x)},${Math.round(mousePositionRef.current.y)}`,
                10,
                canvas.height - 10
            );
            ctx.restore();
        }

        ctx.restore();
    }, [elements, selectedId, showGrid, showDebug, drawElement, getContext]);

    // --- Interaction Logic ---

    // 1. Text Modification (Type, Delete, Newline)
    const modifyText = useCallback(
        (action, char) => {
            if (!selectedElement) return;

            setElements((prev) =>
                prev.map((el) => {
                    if (el.id !== selectedId) return el;

                    let newLines = JSON.parse(JSON.stringify(el.lines));
                    let newCursor = { ...cursor };
                    let targetLineIndex = newCursor.line;
                    let targetLine = newLines[targetLineIndex];
                    let runs = targetLine.runs;

                    // A. Handle Selection Deletion
                    if (selection) {
                        // Simplified selection deletion logic
                        const sel = normalizeSelection(selection);
                        const { start, end } = sel;

                        let startLine = newLines[start.line];
                        let endLine = newLines[end.line];

                        let currentRuns = startLine.runs;
                        let charCount = 0;
                        let newStartRuns = [];
                        for (let r of currentRuns) {
                            if (charCount + r.text.length <= start.charIndex) {
                                newStartRuns.push(r);
                            } else if (charCount < start.charIndex) {
                                newStartRuns.push({
                                    ...r,
                                    text: r.text.substring(0, start.charIndex - charCount),
                                });
                            }
                            charCount += r.text.length;
                        }

                        currentRuns = endLine.runs;
                        charCount = 0;
                        let newEndRuns = [];
                        for (let r of currentRuns) {
                            let rStart = charCount;
                            let rEnd = charCount + r.text.length;

                            if (rStart >= end.charIndex) {
                                newEndRuns.push(r);
                            } else if (rEnd > end.charIndex) {
                                newEndRuns.push({
                                    ...r,
                                    text: r.text.substring(end.charIndex - rStart),
                                });
                            }
                            charCount += r.text.length;
                        }

                        newLines.splice(start.line, end.line - start.line + 1, {
                            listType: startLine.listType,
                            listLevel: startLine.listLevel,
                            runs: [...newStartRuns, ...newEndRuns],
                        });

                        newCursor = {
                            line: start.line,
                            charIndex: start.charIndex,
                            isVisible: true,
                        };
                        setSelection(null);

                        if (
                            action === 'deleteSelection' ||
                            action === 'delete' ||
                            action === 'backspace'
                        ) {
                            return { ...el, lines: newLines };
                        }

                        targetLineIndex = newCursor.line;
                        targetLine = newLines[targetLineIndex];
                        runs = targetLine.runs;
                    }

                    // B. Handle Normal Typing / Keys

                    if (action === 'insert') {
                        let inserted = false;
                        let count = 0;
                        for (let i = 0; i < runs.length; i++) {
                            const r = runs[i];
                            if (
                                newCursor.charIndex >= count &&
                                newCursor.charIndex <= count + r.text.length
                            ) {
                                const match = [
                                    'bold',
                                    'italic',
                                    'underline',
                                    'strikethrough',
                                    'color',
                                    'fontSize',
                                    'fontFamily',
                                    'runBgColor',
                                ].every((k) => r[k] === currentStyle[k]);

                                if (match) {
                                    const offset = newCursor.charIndex - count;
                                    r.text = r.text.slice(0, offset) + char + r.text.slice(offset);
                                    inserted = true;
                                } else {
                                    const offset = newCursor.charIndex - count;
                                    const pre = r.text.slice(0, offset);
                                    const post = r.text.slice(offset);
                                    const newRun = { ...currentStyle, text: char };

                                    const replacements = [];
                                    if (pre) replacements.push({ ...r, text: pre });
                                    replacements.push(newRun);
                                    if (post) replacements.push({ ...r, text: post });

                                    runs.splice(i, 1, ...replacements);
                                    inserted = true;
                                }
                                break;
                            }
                            count += r.text.length;
                        }
                        if (!inserted) runs.push({ ...currentStyle, text: char });
                        newCursor.charIndex++;
                    } else if (action === 'delete') {
                        // Backspace logic
                        const lineLength = getLineText(runs).length;

                        if (
                            newCursor.charIndex === 0 &&
                            lineLength === 0 &&
                            targetLine.listLevel > 0
                        ) {
                            targetLine.listType = null;
                            targetLine.listLevel = 0;
                        } else if (newCursor.charIndex === 0 && targetLine.listLevel > 0) {
                            targetLine.listLevel = Math.max(0, targetLine.listLevel - 1);
                        } else if (newCursor.charIndex > 0) {
                            let count = 0;
                            for (let i = 0; i < runs.length; i++) {
                                const r = runs[i];
                                if (
                                    newCursor.charIndex > count &&
                                    newCursor.charIndex <= count + r.text.length
                                ) {
                                    const offset = newCursor.charIndex - count - 1;
                                    r.text = r.text.slice(0, offset) + r.text.slice(offset + 1);
                                    if (!r.text) runs.splice(i, 1);
                                    break;
                                }
                                count += r.text.length;
                            }
                            newCursor.charIndex--;
                        } else if (newCursor.line > 0 && newCursor.charIndex === 0) {
                            const prevLine = newLines[targetLineIndex - 1];
                            const prevLen = getLineText(prevLine.runs).length;
                            prevLine.runs = [...prevLine.runs, ...runs];
                            newLines.splice(targetLineIndex, 1);
                            newCursor.line--;
                            newCursor.charIndex = prevLen;
                        }
                    } else if (action === 'newline') {
                        const runs1 = [];
                        const runs2 = [];
                        let curChar = 0;
                        for (let r of runs) {
                            let start = curChar;
                            let end = curChar + r.text.length;

                            if (end <= newCursor.charIndex) {
                                runs1.push(r);
                            } else if (start >= newCursor.charIndex) {
                                runs2.push(r);
                            } else {
                                const off = newCursor.charIndex - start;
                                runs1.push({ ...r, text: r.text.substring(0, off) });
                                runs2.push({ ...r, text: r.text.substring(off) });
                            }
                            curChar += r.text.length;
                        }

                        targetLine.runs = runs1;

                        // List Enter Logic
                        if (targetLine.listLevel > 0) {
                            if (getLineText(runs1).length === 0 && runs2.length === 0) {
                                targetLine.listType = null;
                                targetLine.listLevel = 0;
                                newCursor.charIndex = 0;
                            } else {
                                newLines.splice(targetLineIndex + 1, 0, {
                                    listType: targetLine.listType,
                                    listLevel: targetLine.listLevel,
                                    runs: runs2,
                                });
                                newCursor.line++;
                                newCursor.charIndex = 0;
                            }
                        } else {
                            newLines.splice(targetLineIndex + 1, 0, {
                                listType: null,
                                listLevel: 0,
                                runs: runs2,
                            });
                            newCursor.line++;
                            newCursor.charIndex = 0;
                        }
                    }

                    // Cleanup
                    newLines.forEach((l) => (l.runs = mergeRuns(l.runs)));
                    setCursor(newCursor);
                    return { ...el, lines: newLines };
                })
            );
        },
        [selectedId, selectedElement, selection, cursor, currentStyle, normalizeSelection]
    );

    // 2. Apply Styles to Selection
    const applyStyleToSelection = (newProps) => {
        if (!selectedElement || !selection) {
            // No selection, just update toolbar/typing style
            setCurrentStyle((prev) => ({ ...prev, ...newProps }));
            if (selectedElement && isFocused) inputRef.current.focus();
            return;
        }

        const sel = normalizeSelection(selection);

        setElements((prev) =>
            prev.map((el) => {
                if (el.id !== selectedId) return el;

                const newLines = JSON.parse(JSON.stringify(el.lines));

                for (let i = sel.start.line; i <= sel.end.line; i++) {
                    const line = newLines[i];
                    const startChar = i === sel.start.line ? sel.start.charIndex : 0;
                    const endChar =
                        i === sel.end.line ? sel.end.charIndex : getLineText(line.runs).length;

                    if (startChar >= endChar) continue;

                    let charCount = 0;
                    let newRuns = [];

                    for (const run of line.runs) {
                        const rStart = charCount;
                        const rEnd = charCount + run.text.length;

                        // Intersection
                        const intStart = Math.max(rStart, startChar);
                        const intEnd = Math.min(rEnd, endChar);

                        if (intStart < intEnd) {
                            // Split 3 ways
                            const preLen = intStart - rStart;
                            const midLen = intEnd - intStart;

                            if (preLen > 0)
                                newRuns.push({ ...run, text: run.text.substr(0, preLen) });

                            // Modified Middle
                            newRuns.push({
                                ...run,
                                ...newProps, // Apply new styles
                                text: run.text.substr(preLen, midLen),
                            });

                            if (preLen + midLen < run.text.length) {
                                newRuns.push({ ...run, text: run.text.substr(preLen + midLen) });
                            }
                        } else {
                            newRuns.push(run);
                        }
                        charCount += run.text.length;
                    }
                    line.runs = mergeRuns(newRuns);
                }
                return { ...el, lines: newLines };
            })
        );

        // Update current style to match what we just applied
        setCurrentStyle((prev) => ({ ...prev, ...newProps }));
        inputRef.current.focus();
    };

    // 3. List Toggles and Indentation
    const toggleList = (type) => {
        if (!selectedElement) return;

        setElements((prev) =>
            prev.map((el) => {
                if (el.id !== selectedId) return el;

                let newLines = JSON.parse(JSON.stringify(el.lines));
                const currentLine = newLines[cursor.line];

                if (currentLine.listType === type) {
                    // Turn off
                    currentLine.listType = null;
                    currentLine.listLevel = 0;
                } else {
                    // Turn on/switch
                    currentLine.listType = type;
                    currentLine.listLevel = Math.max(1, currentLine.listLevel);
                }
                return { ...el, lines: newLines.map((l) => ({ ...l, runs: mergeRuns(l.runs) })) };
            })
        );
    };

    const changeListLevel = (delta) => {
        if (!selectedElement) return;

        setElements((prev) =>
            prev.map((el) => {
                if (el.id !== selectedId) return el;

                let newLines = JSON.parse(JSON.stringify(el.lines));
                const currentLine = newLines[cursor.line];

                if (currentLine.listLevel === 0 && delta > 0) {
                    // If not a list, only promote if turning it into a list
                    currentLine.listType = 'bullet'; // Default to bullet list on indent
                }
                if (currentLine.listLevel === 0 && delta <= 0) return el; // Cannot demote non-list

                currentLine.listLevel = Math.max(0, currentLine.listLevel + delta);

                // Ensure level doesn't jump too high (max of previous line + 1)
                if (delta > 0 && cursor.line > 0) {
                    const prevLevel = newLines[cursor.line - 1].listLevel;
                    currentLine.listLevel = Math.min(prevLevel + 1, currentLine.listLevel);
                }

                return { ...el, lines: newLines };
            })
        );
    };

    // --- Handlers ---

    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / (rect.width / STAGE_WIDTH);
        const my = (e.clientY - rect.top) / (rect.height / STAGE_HEIGHT);
        const ctx = getContext();

        let clicked = elements
            .slice()
            .reverse()
            .find((el) => mx >= el.x && mx <= el.x + el.w && my >= el.y && my <= el.y + el.h);

        if (clicked) {
            setSelectedId(clicked.id);
            if (isFocused && clicked.id === selectedId) {
                const coords = getLogicalCharCoordsFromMouse(clicked, mx, my, ctx);
                setCursor({ ...coords, isVisible: true });
                setSelection(null);
                selectionStartRef.current = coords;
                setIsSelecting(false);
            } else {
                setIsDragging(true);
                dragOffset.current = { x: mx - clicked.x, y: my - clicked.y };
                setIsFocused(false);
                setSelection(null);
            }
        } else {
            setSelectedId(null);
            setIsFocused(false);
            setSelection(null);
        }
        draw();
    };

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / (rect.width / STAGE_WIDTH);
        const my = (e.clientY - rect.top) / (rect.height / STAGE_HEIGHT);
        mousePositionRef.current = { x: mx, y: my };

        if (isDragging && selectedElement) {
            const newX = Math.max(0, mx - dragOffset.current.x);
            const newY = Math.max(0, my - dragOffset.current.y);
            const snappedX = showGrid ? Math.round(newX / GRID_SIZE) * GRID_SIZE : newX;
            const snappedY = showGrid ? Math.round(newY / GRID_SIZE) * GRID_SIZE : newY;

            setElements((prev) =>
                prev.map((el) => (el.id === selectedId ? { ...el, x: snappedX, y: snappedY } : el))
            );
            draw();
        } else if (selectionStartRef.current && selectedElement && isFocused) {
            const ctx = getContext();
            const currCoords = getLogicalCharCoordsFromMouse(selectedElement, mx, my, ctx);

            if (
                !isSelecting &&
                (currCoords.line !== selectionStartRef.current.line ||
                    currCoords.charIndex !== selectionStartRef.current.charIndex)
            ) {
                setIsSelecting(true);
            }

            if (isSelecting || selectionStartRef.current) {
                setSelection({ start: selectionStartRef.current, end: currCoords });
                setCursor({ ...currCoords, isVisible: true });
                draw();
            }
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsSelecting(false);
        selectionStartRef.current = null;
    };

    const handleDoubleClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / (rect.width / STAGE_WIDTH);
        const my = (e.clientY - rect.top) / (rect.height / STAGE_HEIGHT);

        let clicked = elements
            .slice()
            .reverse()
            .find((el) => mx >= el.x && mx <= el.x + el.w && my >= el.y && my <= el.y + el.h);

        if (clicked) {
            setIsFocused(true);
            setSelectedId(clicked.id);
            const ctx = getContext();
            const coords = getLogicalCharCoordsFromMouse(clicked, mx, my, ctx);
            setCursor({ ...coords, isVisible: true });
            inputRef.current.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (!isFocused || !selectedElement) return;

        // --- Arrow Key Navigation ---
        if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            const getLineLen = (idx) => getLineText(selectedElement.lines[idx].runs).length;
            let newPos = { ...cursor };

            if (e.key === 'ArrowLeft') {
                if (newPos.charIndex > 0) {
                    newPos.charIndex--;
                } else if (newPos.line > 0) {
                    newPos.line--;
                    newPos.charIndex = getLineLen(newPos.line);
                }
            } else if (e.key === 'ArrowRight') {
                const currentLen = getLineLen(newPos.line);
                if (newPos.charIndex < currentLen) {
                    newPos.charIndex++;
                } else if (newPos.line < selectedElement.lines.length - 1) {
                    newPos.line++;
                    newPos.charIndex = 0;
                }
            } else if (e.key === 'ArrowUp') {
                if (newPos.line > 0) {
                    newPos.line--;
                    // Preserve X position approximation
                    newPos.charIndex = Math.min(newPos.charIndex, getLineLen(newPos.line));
                }
            } else if (e.key === 'ArrowDown') {
                if (newPos.line < selectedElement.lines.length - 1) {
                    newPos.line++;
                    // Preserve X position approximation
                    newPos.charIndex = Math.min(newPos.charIndex, getLineLen(newPos.line));
                }
            }

            // Update Cursor
            setCursor({ ...newPos, isVisible: true });
            lastBlinkTimeRef.current = performance.now();

            // Handle Selection vs Movement (Shift Key)
            if (e.shiftKey) {
                setSelection((prev) => {
                    const anchor =
                        (prev && prev.start.line !== cursor.line) ||
                        prev.start.charIndex !== cursor.charIndex
                            ? prev.start
                            : cursor;
                    return { start: anchor, end: newPos };
                });
                setIsSelecting(true);
            } else {
                setSelection(null);
                setIsSelecting(false);
            }
            return;
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                changeListLevel(-1);
            } else {
                changeListLevel(1);
            }
            return;
        }

        if (e.key === 'Backspace') {
            e.preventDefault();
            modifyText('delete');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            modifyText('newline');
        } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
            modifyText('insert', e.key);
        }
    };

    // --- Init & Render Loop ---
    useEffect(() => {
        const resize = () => {
            if (!canvasRef.current) return;
            const dpr = window.devicePixelRatio || 1;
            canvasRef.current.width = STAGE_WIDTH * dpr;
            canvasRef.current.height = STAGE_HEIGHT * dpr;
            canvasRef.current.style.width = `${STAGE_WIDTH}px`;
            canvasRef.current.style.height = `${STAGE_HEIGHT}px`;
            draw();
        };
        window.addEventListener('resize', resize);
        resize();

        const loop = (time) => {
            if (time - lastBlinkTimeRef.current > BLINK_RATE) {
                setCursor((prev) => ({ ...prev, isVisible: !prev.isVisible }));
                lastBlinkTimeRef.current = time;
                draw();
            }
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameRef.current);
        };
    }, [draw]);

    // Force redraw when certain states change directly
    useEffect(() => {
        draw();
    }, [cursor, selection, elements, showGrid, showDebug, draw]);

    // --- JSX ---
    return (
        <div className="w-full h-full min-h-screen bg-gray-100 flex flex-col items-center p-4">
            {/* Toolbar */}
            <div className="w-full max-w-6xl shadow-xl rounded-xl bg-white mb-4 p-2 flex gap-2 flex-wrap justify-center border-b border-gray-200">
                <div className="flex gap-1 border-r pr-2">
                    <button
                        className={`p-2 rounded ${currentStyle.bold ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'}`}
                        onClick={() => applyStyleToSelection({ bold: !currentStyle.bold })}
                    >
                        <Bold size={18} />
                    </button>
                    <button
                        className={`p-2 rounded ${currentStyle.italic ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'}`}
                        onClick={() => applyStyleToSelection({ italic: !currentStyle.italic })}
                    >
                        <Italic size={18} />
                    </button>
                    <button
                        className={`p-2 rounded ${currentStyle.underline ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'}`}
                        onClick={() =>
                            applyStyleToSelection({ underline: !currentStyle.underline })
                        }
                    >
                        <Underline size={18} />
                    </button>
                </div>
                <div className="flex gap-2 border-r pr-2 items-center">
                    <select
                        value={currentStyle.fontFamily}
                        onChange={(e) => applyStyleToSelection({ fontFamily: e.target.value })}
                        className="border rounded p-1 text-sm"
                    >
                        {FONT_FAMILIES.map((f) => (
                            <option key={f} value={f}>
                                {f}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        value={currentStyle.fontSize}
                        onChange={(e) =>
                            applyStyleToSelection({ fontSize: parseInt(e.target.value) || 16 })
                        }
                        className="border rounded p-1 w-16 text-sm"
                    />
                </div>
                <div className="flex gap-1 border-r pr-2">
                    <button
                        className="p-2 hover:bg-gray-100 rounded"
                        onClick={() => toggleList('bullet')}
                    >
                        <List size={18} />
                    </button>
                    <button
                        className="p-2 hover:bg-gray-100 rounded"
                        onClick={() => toggleList('numeric')}
                    >
                        <ListOrdered size={18} />
                    </button>
                </div>
                <div className="flex gap-2 items-center">
                    <input
                        type="color"
                        value={currentStyle.color}
                        onChange={(e) => applyStyleToSelection({ color: e.target.value })}
                        title="Text Color"
                    />
                    <input
                        type="color"
                        value={
                            currentStyle.runBgColor === 'transparent'
                                ? '#ffffff'
                                : currentStyle.runBgColor
                        }
                        onChange={(e) => applyStyleToSelection({ runBgColor: e.target.value })}
                        title="Highlight"
                    />
                </div>
            </div>

            <div className="flex w-full max-w-6xl h-full shadow-2xl rounded-xl overflow-hidden bg-white">
                {/* Sidebar */}
                <div className="w-16 bg-gray-900 flex flex-col items-center py-4 gap-4">
                    <button
                        className="text-white p-2 hover:bg-gray-700 rounded"
                        onClick={() => {
                            const newEl = getInitialTextElement(50, 50);
                            setElements((prev) => [...prev, newEl]);
                            setSelectedId(newEl.id);
                        }}
                    >
                        <Type />
                    </button>
                    <button
                        className={`text-white p-2 rounded ${showGrid ? 'bg-green-600' : 'hover:bg-gray-700'}`}
                        onClick={() => setShowGrid(!showGrid)}
                    >
                        <Grid />
                    </button>
                    <button
                        className={`text-white p-2 rounded ${showDebug ? 'bg-red-600' : 'hover:bg-gray-700'}`}
                        onClick={() => setShowDebug(!showDebug)}
                    >
                        <Ruler />
                    </button>
                </div>

                {/* Stage */}
                <div className="flex-1 bg-gray-50 flex justify-center items-center overflow-auto p-8">
                    <div
                        className="relative shadow-lg bg-white"
                        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
                    >
                        <canvas
                            ref={canvasRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onDoubleClick={handleDoubleClick}
                            className="cursor-text"
                        />
                        <input
                            ref={inputRef}
                            type="text"
                            className="opacity-0 absolute -top-96"
                            onKeyDown={handleKeyDown}
                            autoComplete="off"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CanvasDesignStageEditor;
