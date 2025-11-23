import React, { useEffect, useRef, useState, useReducer } from 'react';
import {
    Square,
    Circle as CircleIcon,
    Image as ImageIcon,
    Layout,
    Type,
    Palette,
    Play,
    Settings,
    Shapes,
    MousePointer2,
    LayoutGrid,
    Search,
    Triangle,
    Star,
    Hexagon,
    Copy,
    Trash2,
    Plus,
    GripHorizontal,
    Minus,
    ZoomIn,
    Check,
    X,
    Columns as ColumnsIcon,
    Grid3x3,
    PanelLeft,
    Heading,
    AlignLeft,
} from 'lucide-react';

// --- 1. TYPES & CONSTANTS ---
const CANVAS_WIDTH = 600;
const PAGE_BG_COLOR = '#f3f4f6';
const PRIMARY_COLOR = '#3b82f6';
const SELECTION_COLOR = '#d946ef'; // Pink for Element Select/Hover
const ROW_HOVER_COLOR = '#60a5fa'; // Light Blue for Row Hover
const DROP_TARGET_COLOR = '#10b981';
const COLUMN_GUIDE_COLOR = '#d946ef'; // Purple for Column Resize
const REORDER_LINE_COLOR = '#3b82f6';
const HANDLE_SIZE = 10;

// Control Positioning
const RESIZE_HANDLE_HIT_TOLERANCE = 10;
const ADD_BUTTON_OFFSET = 25;
const ADD_BUTTON_HIT_TOLERANCE = 15;

type ElementType =
    | 'rect'
    | 'circle'
    | 'triangle'
    | 'star'
    | 'polygon'
    | 'image'
    | 'text'
    | 'button'
    | 'divider'
    | 'spacer';

interface EditorElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    fill?: string;
    src?: string;
    text?: string;
}

interface EditorRow {
    id: string;
    height: number;
    layout: number[];
    elements: EditorElement[];
    backgroundColor?: string;
}

interface EditorState {
    rows: EditorRow[];
    selectedRowId: string | null;
    selectedElementId: string | null;
    hoveredElementId: string | null;
    hoveredRowId: string | null;
    dragTarget: { rowId: string; colIndex: number } | null;
    reorderTargetIndex: number | null;
    zoom: number;
}

// --- 2. STATE MANAGEMENT ---

type Action =
    | {
          type: 'ADD_OR_UPDATE_ROW_LAYOUT';
          layout: number[];
          index?: number;
          forceAdd?: boolean;
          minHeight?: number;
      }
    | {
          type: 'ADD_SPECIAL_BLOCK';
          blockType: 'freeform' | 'divider' | 'spacer';
      }
    | { type: 'DUPLICATE_ROW'; rowId: string }
    | { type: 'DUPLICATE_SELECTION' }
    | { type: 'SELECT_ROW'; id: string | null }
    | { type: 'SELECT_ELEMENT'; rowId: string; elId: string }
    | { type: 'SET_HOVERED_ELEMENT'; id: string | null }
    | { type: 'SET_HOVERED_ROW'; id: string | null }
    | {
          type: 'SET_DRAG_TARGET';
          target: { rowId: string; colIndex: number } | null;
      }
    | { type: 'SET_REORDER_TARGET'; index: number | null }
    | { type: 'REORDER_ROW'; fromIndex: number; toIndex: number }
    | {
          type: 'ADD_ELEMENT';
          rowId: string;
          elementType: ElementType;
          src?: string;
          x?: number;
          y?: number;
          text?: string;
      }
    | {
          type: 'UPDATE_ELEMENT';
          rowId: string;
          elId: string;
          attrs: Partial<EditorElement>;
      }
    | {
          type: 'MOVE_ELEMENT';
          sourceRowId: string;
          targetRowId: string;
          elementId: string;
          newX: number;
          newY: number;
      }
    | { type: 'UPDATE_ROW_HEIGHT'; rowId: string; height: number }
    | {
          type: 'RESIZE_COLUMN';
          rowId: string;
          dividerIndex: number;
          deltaPct: number;
      }
    | { type: 'DELETE_SELECTION' }
    | { type: 'SET_ZOOM'; zoom: number }
    | { type: 'SET_SELECTION_COLOR'; color: string };

const generateId = () =>
    crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9);

const initialState: EditorState = {
    rows: [
        {
            id: 'row-1',
            height: 200,
            layout: [100],
            elements: [],
            backgroundColor: '#ffffff',
        },
    ],
    selectedRowId: 'row-1',
    selectedElementId: null,
    hoveredElementId: null,
    hoveredRowId: null,
    dragTarget: null,
    reorderTargetIndex: null,
    zoom: 1,
};

const editorReducer = (state: EditorState, action: Action): EditorState => {
    switch (action.type) {
        case 'SET_ZOOM':
            const newZoom = Math.max(0.1, Math.min(5, action.zoom));
            return { ...state, zoom: newZoom };

        case 'SET_HOVERED_ELEMENT':
            if (state.hoveredElementId === action.id) return state;
            return { ...state, hoveredElementId: action.id };

        case 'SET_HOVERED_ROW':
            if (state.hoveredRowId === action.id) return state;
            return { ...state, hoveredRowId: action.id };

        case 'SET_DRAG_TARGET':
            if (
                state.dragTarget?.rowId === action.target?.rowId &&
                state.dragTarget?.colIndex === action.target?.colIndex
            )
                return state;
            return { ...state, dragTarget: action.target };

        case 'SET_REORDER_TARGET':
            return { ...state, reorderTargetIndex: action.index };

        case 'REORDER_ROW': {
            const { fromIndex, toIndex } = action;
            if (
                fromIndex === toIndex ||
                fromIndex < 0 ||
                fromIndex >= state.rows.length
            )
                return state;
            const newRows = [...state.rows];
            const [movedRow] = newRows.splice(fromIndex, 1);
            const insertIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
            newRows.splice(insertIndex, 0, movedRow);
            return { ...state, rows: newRows, reorderTargetIndex: null };
        }

        case 'SET_SELECTION_COLOR': {
            const { color } = action;
            if (state.selectedElementId && state.selectedRowId) {
                return {
                    ...state,
                    rows: state.rows.map((row) => {
                        if (row.id !== state.selectedRowId) return row;
                        return {
                            ...row,
                            elements: row.elements.map((el) =>
                                el.id === state.selectedElementId
                                    ? { ...el, fill: color }
                                    : el
                            ),
                        };
                    }),
                };
            }
            if (state.selectedRowId) {
                return {
                    ...state,
                    rows: state.rows.map((row) =>
                        row.id === state.selectedRowId
                            ? { ...row, backgroundColor: color }
                            : row
                    ),
                };
            }
            return state;
        }

        case 'ADD_SPECIAL_BLOCK': {
            const { blockType } = action;
            const newRowId = generateId();
            const newRow: EditorRow = {
                id: newRowId,
                height: blockType === 'freeform' ? 300 : 100,
                layout: [100],
                elements: [],
                backgroundColor: '#ffffff',
            };

            if (blockType === 'divider') {
                newRow.elements.push({
                    id: generateId(),
                    type: 'divider',
                    x: 20,
                    y: 45,
                    width: CANVAS_WIDTH - 40,
                    height: 10,
                    fill: '#d1d5db',
                });
                newRow.height = 100;
            } else if (blockType === 'spacer') {
                newRow.elements.push({
                    id: generateId(),
                    type: 'spacer',
                    x: 0,
                    y: 0,
                    width: CANVAS_WIDTH,
                    height: 50,
                    fill: 'transparent',
                });
                newRow.height = 50;
            }

            let insertIndex = state.rows.length;
            if (state.selectedRowId) {
                const selectedIndex = state.rows.findIndex(
                    (r) => r.id === state.selectedRowId
                );
                if (selectedIndex !== -1) insertIndex = selectedIndex + 1;
            }

            const newRows = [...state.rows];
            newRows.splice(insertIndex, 0, newRow);

            return {
                ...state,
                rows: newRows,
                selectedRowId: newRowId,
                selectedElementId:
                    newRow.elements.length > 0 ? newRow.elements[0].id : null,
            };
        }

        case 'ADD_OR_UPDATE_ROW_LAYOUT': {
            if (!action.forceAdd && state.selectedRowId) {
                return {
                    ...state,
                    rows: state.rows.map((row) =>
                        row.id === state.selectedRowId
                            ? { ...row, layout: action.layout }
                            : row
                    ),
                };
            }

            const newRow: EditorRow = {
                id: generateId(),
                height: action.minHeight || 150,
                layout: action.layout,
                elements: [],
                backgroundColor: '#ffffff',
            };

            let newRows = [...state.rows];
            let insertIndex = state.rows.length;

            if (typeof action.index === 'number') {
                insertIndex = action.index;
            } else if (state.selectedRowId && !action.forceAdd) {
                const selectedIndex = state.rows.findIndex(
                    (r) => r.id === state.selectedRowId
                );
                if (selectedIndex !== -1) insertIndex = selectedIndex + 1;
            }

            newRows.splice(insertIndex, 0, newRow);

            return {
                ...state,
                rows: newRows,
                selectedRowId: newRow.id,
                selectedElementId: null,
            };
        }

        case 'DUPLICATE_SELECTION': {
            if (state.selectedElementId && state.selectedRowId) {
                const rowIndex = state.rows.findIndex(
                    (r) => r.id === state.selectedRowId
                );
                if (rowIndex === -1) return state;
                const row = state.rows[rowIndex];
                const element = row.elements.find(
                    (e) => e.id === state.selectedElementId
                );
                if (!element) return state;
                const newElement = {
                    ...element,
                    id: generateId(),
                    x: element.x + 20,
                    y: element.y + 20,
                };
                const newRows = [...state.rows];
                newRows[rowIndex] = {
                    ...row,
                    elements: [...row.elements, newElement],
                };
                return {
                    ...state,
                    rows: newRows,
                    selectedElementId: newElement.id,
                };
            } else if (state.selectedRowId) {
                const index = state.rows.findIndex(
                    (r) => r.id === state.selectedRowId
                );
                if (index === -1) return state;
                const rowToCopy = state.rows[index];
                const newRow: EditorRow = {
                    ...rowToCopy,
                    id: generateId(),
                    elements: rowToCopy.elements.map((el) => ({
                        ...el,
                        id: generateId(),
                    })),
                };
                const newRows = [...state.rows];
                newRows.splice(index + 1, 0, newRow);
                return {
                    ...state,
                    rows: newRows,
                    selectedRowId: newRow.id,
                    selectedElementId: null,
                };
            }
            return state;
        }

        case 'DUPLICATE_ROW': {
            const index = state.rows.findIndex((r) => r.id === action.rowId);
            if (index === -1) return state;
            const rowToCopy = state.rows[index];
            const newRow: EditorRow = {
                ...rowToCopy,
                id: generateId(),
                elements: rowToCopy.elements.map((el) => ({
                    ...el,
                    id: generateId(),
                })),
            };
            const newRows = [...state.rows];
            newRows.splice(index + 1, 0, newRow);
            return {
                ...state,
                rows: newRows,
                selectedRowId: newRow.id,
                selectedElementId: null,
            };
        }

        case 'RESIZE_COLUMN': {
            const { rowId, dividerIndex, deltaPct } = action;
            return {
                ...state,
                rows: state.rows.map((row) => {
                    if (row.id !== rowId) return row;
                    const newLayout = [...row.layout];
                    const currentLeft = newLayout[dividerIndex];
                    const currentRight = newLayout[dividerIndex + 1];
                    let newLeft = currentLeft + deltaPct;
                    let newRight = currentRight - deltaPct;
                    if (newLeft < 5) {
                        const diff = 5 - newLeft;
                        newLeft = 5;
                        newRight -= diff;
                    } else if (newRight < 5) {
                        const diff = 5 - newRight;
                        newRight = 5;
                        newLeft -= diff;
                    }
                    newLayout[dividerIndex] = newLeft;
                    newLayout[dividerIndex + 1] = newRight;
                    return { ...row, layout: newLayout };
                }),
            };
        }

        case 'SELECT_ROW':
            return {
                ...state,
                selectedRowId: action.id,
                selectedElementId: null,
            };

        case 'SELECT_ELEMENT':
            return {
                ...state,
                selectedRowId: action.rowId,
                selectedElementId: action.elId,
            };

        case 'ADD_ELEMENT':
            return {
                ...state,
                rows: state.rows.map((row) => {
                    if (row.id !== action.rowId) return row;

                    let colX = 0;
                    const colRanges = row.layout.map((pct) => {
                        const w = (CANVAS_WIDTH * pct) / 100;
                        const range = {
                            start: colX,
                            end: colX + w,
                            width: w,
                            center: colX + w / 2,
                        };
                        colX += w;
                        return range;
                    });

                    let finalX = 0;
                    let finalY = 20;
                    let finalW = 80;
                    let finalH = 80;
                    if (action.elementType === 'text') {
                        finalW = 120;
                        finalH = 40;
                    }
                    if (action.elementType === 'button') {
                        finalW = 100;
                        finalH = 40;
                    }
                    if (action.elementType === 'divider') {
                        finalW = 200;
                        finalH = 10;
                    }
                    if (action.elementType === 'spacer') {
                        finalW = 100;
                        finalH = 50;
                    }

                    if (
                        typeof action.x === 'number' &&
                        typeof action.y === 'number'
                    ) {
                        const targetCol =
                            colRanges.find(
                                (c) =>
                                    action.x! >= c.start && action.x! <= c.end
                            ) || colRanges[0];
                        if (action.elementType === 'divider')
                            finalW = targetCol.width * 0.9;
                        else if (
                            action.elementType !== 'text' &&
                            action.elementType !== 'button' &&
                            action.elementType !== 'spacer'
                        ) {
                            finalW = Math.min(targetCol.width * 0.8, 150);
                            finalH =
                                action.elementType === 'image'
                                    ? finalW
                                    : finalW;
                        }
                        finalX = action.x - finalW / 2;
                        finalY = action.y - finalH / 2;
                    } else {
                        const occupiedCols = new Set<number>();
                        row.elements.forEach((el) => {
                            const center = el.x + el.width / 2;
                            const colIdx = colRanges.findIndex(
                                (c) => center >= c.start && center < c.end
                            );
                            if (colIdx !== -1) occupiedCols.add(colIdx);
                        });
                        let targetColIndex = colRanges.findIndex(
                            (_, i) => !occupiedCols.has(i)
                        );
                        if (targetColIndex === -1)
                            targetColIndex =
                                row.elements.length % colRanges.length;
                        const targetCol = colRanges[targetColIndex];
                        if (action.elementType === 'divider')
                            finalW = targetCol.width * 0.9;
                        else if (
                            action.elementType !== 'text' &&
                            action.elementType !== 'button' &&
                            action.elementType !== 'spacer'
                        ) {
                            finalW = Math.min(targetCol.width * 0.8, 150);
                            finalH =
                                action.elementType === 'image'
                                    ? finalW
                                    : finalW;
                        }
                        finalX = targetCol.center - finalW / 2;
                        finalY = 20;
                    }

                    const newEl: EditorElement = {
                        id: generateId(),
                        type: action.elementType,
                        x: finalX,
                        y: finalY,
                        width: finalW,
                        height: finalH,
                        fill:
                            action.elementType === 'image'
                                ? undefined
                                : '#94a3b8',
                        src: action.src,
                        text: action.text,
                    };

                    if (action.elementType === 'rect') newEl.fill = '#6366f1';
                    if (action.elementType === 'circle') newEl.fill = '#10b981';
                    if (action.elementType === 'triangle')
                        newEl.fill = '#f59e0b';
                    if (action.elementType === 'star') newEl.fill = '#ec4899';
                    if (action.elementType === 'polygon')
                        newEl.fill = '#3b82f6';
                    if (action.elementType === 'button') newEl.fill = '#3b82f6';
                    if (action.elementType === 'text')
                        newEl.fill = 'transparent';
                    if (action.elementType === 'divider')
                        newEl.fill = '#d1d5db';
                    if (action.elementType === 'spacer')
                        newEl.fill = 'transparent';

                    return { ...row, elements: [...row.elements, newEl] };
                }),
            };

        case 'UPDATE_ELEMENT':
            return {
                ...state,
                rows: state.rows.map((row) => {
                    if (row.id !== action.rowId) return row;
                    const updatedElements = row.elements.map((el) => {
                        if (el.id !== action.elId) return el;
                        return { ...el, ...action.attrs };
                    });
                    const maxBottom = updatedElements.reduce(
                        (max, el) => Math.max(max, el.y + el.height),
                        0
                    );
                    const newHeight = Math.max(150, maxBottom + 40);
                    return {
                        ...row,
                        elements: updatedElements,
                        height: newHeight,
                    };
                }),
            };

        case 'MOVE_ELEMENT': {
            const { sourceRowId, targetRowId, elementId, newX, newY } = action;
            const sourceRow = state.rows.find((r) => r.id === sourceRowId);
            if (!sourceRow) return state;
            const element = sourceRow.elements.find((e) => e.id === elementId);
            if (!element) return state;

            const movedElement = { ...element, x: newX, y: newY };

            return {
                ...state,
                rows: state.rows.map((row) => {
                    if (row.id === sourceRowId) {
                        return {
                            ...row,
                            elements: row.elements.filter(
                                (e) => e.id !== elementId
                            ),
                        };
                    }
                    if (row.id === targetRowId) {
                        const potentialBottom = newY + element.height;
                        const newHeight = Math.max(
                            row.height,
                            potentialBottom + 40,
                            150
                        );
                        return {
                            ...row,
                            height: newHeight,
                            elements: [...row.elements, movedElement],
                        };
                    }
                    return row;
                }),
                selectedRowId: targetRowId,
                selectedElementId: elementId,
            };
        }

        case 'UPDATE_ROW_HEIGHT':
            return {
                ...state,
                rows: state.rows.map((r) =>
                    r.id === action.rowId
                        ? { ...r, height: Math.max(50, action.height) }
                        : r
                ),
            };

        case 'DELETE_SELECTION':
            if (state.selectedElementId && state.selectedRowId) {
                return {
                    ...state,
                    rows: state.rows.map((row) => {
                        if (row.id !== state.selectedRowId) return row;
                        return {
                            ...row,
                            elements: row.elements.filter(
                                (e) => e.id !== state.selectedElementId
                            ),
                        };
                    }),
                    selectedElementId: null,
                };
            } else if (state.selectedRowId) {
                const index = state.rows.findIndex(
                    (r) => r.id === state.selectedRowId
                );
                const newRows = state.rows.filter(
                    (r) => r.id !== state.selectedRowId
                );
                let newSelectedId = null;
                if (newRows.length > 0) {
                    const newIndex = Math.max(0, index - 1);
                    newSelectedId = newRows[newIndex]
                        ? newRows[newIndex].id
                        : newRows[0].id;
                }
                return {
                    ...state,
                    rows: newRows,
                    selectedRowId: newSelectedId,
                    selectedElementId: null,
                };
            }
            return state;

        default:
            return state;
    }
};

// --- 3. CANVAS ENGINE ---

const useCanvasEngine = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    containerRef: React.RefObject<HTMLDivElement>,
    state: EditorState,
    dragInfo: React.MutableRefObject<any>
) => {
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const [imagesLoaded, setImagesLoaded] = useState(0);

    const getOrLoadImage = (src: string) => {
        if (imageCache.current.has(src)) {
            return imageCache.current.get(src)!;
        }
        const img = new Image();
        img.src = src;
        img.crossOrigin = 'Anonymous';
        img.onload = () => setImagesLoaded((n) => n + 1);
        img.onerror = () => console.warn(`Failed: ${src}`);
        imageCache.current.set(src, img);
        return img;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const drawRoundedRect = (
            ctx: CanvasRenderingContext2D,
            x: number,
            y: number,
            w: number,
            h: number,
            r: number
        ) => {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            ctx.closePath();
        };
        const drawStar = (
            ctx: CanvasRenderingContext2D,
            cx: number,
            cy: number,
            spikes: number,
            outerRadius: number,
            innerRadius: number
        ) => {
            let rot = (Math.PI / 2) * 3;
            let x = cx;
            let y = cy;
            const step = Math.PI / spikes;
            ctx.beginPath();
            ctx.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius;
                y = cy + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;
                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }
            ctx.lineTo(cx, cy - outerRadius);
            ctx.closePath();
        };
        const drawPolygon = (
            ctx: CanvasRenderingContext2D,
            centerX: number,
            centerY: number,
            sides: number,
            radius: number
        ) => {
            ctx.beginPath();
            ctx.moveTo(
                centerX + radius * Math.cos(0),
                centerY + radius * Math.sin(0)
            );
            for (let i = 1; i <= sides; i += 1)
                ctx.lineTo(
                    centerX + radius * Math.cos((i * 2 * Math.PI) / sides),
                    centerY + radius * Math.sin((i * 2 * Math.PI) / sides)
                );
            ctx.closePath();
        };
        const drawPlusIcon = (
            ctx: CanvasRenderingContext2D,
            cx: number,
            cy: number,
            size: number,
            color: string
        ) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5 / state.zoom;
            ctx.beginPath();
            ctx.moveTo(cx - size / 2, cy);
            ctx.lineTo(cx + size / 2, cy);
            ctx.moveTo(cx, cy - size / 2);
            ctx.lineTo(cx, cy + size / 2);
            ctx.stroke();
        };
        const drawDotsIcon = (
            ctx: CanvasRenderingContext2D,
            x: number,
            y: number
        ) => {
            ctx.fillStyle = PRIMARY_COLOR;
            const dotSize = 2 / state.zoom;
            const gap = 4 / state.zoom;
            for (let i = 0; i < 2; i++)
                for (let j = 0; j < 3; j++) {
                    ctx.beginPath();
                    ctx.arc(x + i * gap, y + j * gap, dotSize, 0, Math.PI * 2);
                    ctx.fill();
                }
        };
        const drawResizeHandles = (
            ctx: CanvasRenderingContext2D,
            el: EditorElement
        ) => {
            const { x, y, width, height } = el;
            const scaledHandle = HANDLE_SIZE / state.zoom;
            const scaledHalf = scaledHandle / 2;

            // White circle with Pink border (Sample style)
            ctx.fillStyle = 'white';
            ctx.strokeStyle = SELECTION_COLOR;
            ctx.lineWidth = 1.5 / state.zoom;

            const coords = [
                { x: x, y: y },
                { x: x + width, y: y },
                { x: x, y: y + height },
                { x: x + width, y: y + height },
            ];
            coords.forEach((c) => {
                ctx.beginPath();
                ctx.arc(c.x, c.y, scaledHalf, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        };

        // Helper to parse Gradient strings
        const getFillStyle = (
            ctx: CanvasRenderingContext2D,
            x: number,
            y: number,
            w: number,
            h: number,
            color: string | undefined
        ) => {
            if (!color) return 'transparent';
            if (color.startsWith('linear-gradient')) {
                const colors = color.match(/#[a-fA-F0-9]{6}/g);
                if (colors && colors.length >= 2) {
                    const grad = ctx.createLinearGradient(x, y, x + w, y);
                    grad.addColorStop(0, colors[0]);
                    grad.addColorStop(1, colors[1]);
                    return grad;
                }
            }
            return color;
        };

        const render = () => {
            const dpr = window.devicePixelRatio || 1;
            const viewportWidth = container.clientWidth;
            const viewportHeight = container.clientHeight;
            const scrollY = container.scrollTop;

            if (
                canvas.width !== viewportWidth * dpr ||
                canvas.height !== viewportHeight * dpr
            ) {
                canvas.width = viewportWidth * dpr;
                canvas.height = viewportHeight * dpr;
                canvas.style.width = `${viewportWidth}px`;
                canvas.style.height = `${viewportHeight}px`;
                ctx.scale(dpr, dpr);
            }

            ctx.clearRect(0, 0, viewportWidth, viewportHeight);
            ctx.fillStyle = PAGE_BG_COLOR;
            ctx.fillRect(0, 0, viewportWidth, viewportHeight);

            // --- ZOOM TRANSFORM ---
            ctx.save();

            const paperScreenW = CANVAS_WIDTH * state.zoom;
            const paperScreenX = (viewportWidth - paperScreenW) / 2;

            ctx.translate(paperScreenX, -scrollY);
            ctx.scale(state.zoom, state.zoom);

            const paperY = 40;
            const paperHeight = state.rows.reduce(
                (acc, r) => acc + r.height,
                0
            );

            // Global Paper Background
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.1)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 10;
            ctx.fillRect(0, paperY, CANVAS_WIDTH, paperHeight);
            ctx.shadowColor = 'transparent';

            let currentY = paperY;
            const logicalScrollY = scrollY / state.zoom;
            const logicalViewportH = viewportHeight / state.zoom;

            // PASS 1: Draw Content & Elements
            let selectedRowY = 0;
            let selectedRowData: EditorRow | null = null;
            let hoveredRowY = 0;
            let hoveredRowData: EditorRow | null = null;

            let selectedElementRowY = 0;
            let selectedElement: EditorElement | null = null;

            state.rows.forEach((row) => {
                const isRowSelected = state.selectedRowId === row.id;
                const isRowHovered = state.hoveredRowId === row.id;
                const isDragOver = state.dragTarget?.rowId === row.id;

                if (isRowSelected) {
                    selectedRowY = currentY;
                    selectedRowData = row;
                }
                if (isRowHovered && !isRowSelected) {
                    hoveredRowY = currentY;
                    hoveredRowData = row;
                }

                ctx.save();
                ctx.translate(0, currentY);

                // Row Background
                const rowFill = getFillStyle(
                    ctx,
                    0,
                    0,
                    CANVAS_WIDTH,
                    row.height,
                    row.backgroundColor
                );
                ctx.fillStyle = rowFill;
                ctx.fillRect(0, 0, CANVAS_WIDTH, row.height);

                // Row Hover Effect (Light Blue Overlay)
                if ((isRowHovered || isDragOver) && !isRowSelected) {
                    ctx.strokeStyle = ROW_HOVER_COLOR;
                    ctx.lineWidth = 1.5 / state.zoom;
                    ctx.strokeRect(0, 0, CANVAS_WIDTH, row.height);

                    // Side Handles for Hover
                    const dragX = CANVAS_WIDTH + 10 / state.zoom;
                    ctx.fillStyle = ROW_HOVER_COLOR;
                    const dotSize = 2 / state.zoom;
                    const gap = 4 / state.zoom;
                    for (let i = 0; i < 2; i++)
                        for (let j = 0; j < 3; j++) {
                            ctx.beginPath();
                            ctx.arc(
                                dragX + i * gap,
                                row.height / 2 + j * gap - gap,
                                dotSize,
                                0,
                                Math.PI * 2
                            );
                            ctx.fill();
                        }
                    const leftDragX = -(20 / state.zoom);
                    for (let i = 0; i < 2; i++)
                        for (let j = 0; j < 3; j++) {
                            ctx.beginPath();
                            ctx.arc(
                                leftDragX + i * gap,
                                row.height / 2 + j * gap - gap,
                                dotSize,
                                0,
                                Math.PI * 2
                            );
                            ctx.fill();
                        }
                }

                // Draw Drag Target Highlight
                if (
                    isDragOver &&
                    state.dragTarget &&
                    typeof state.dragTarget.colIndex === 'number'
                ) {
                    let colAccumX = 0;
                    for (let i = 0; i < row.layout.length; i++) {
                        const colW = (CANVAS_WIDTH * row.layout[i]) / 100;
                        if (i === state.dragTarget.colIndex) {
                            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
                            ctx.fillRect(colAccumX, 0, colW, row.height);
                            ctx.strokeStyle = DROP_TARGET_COLOR;
                            ctx.lineWidth = 2 / state.zoom;
                            ctx.strokeRect(colAccumX, 0, colW, row.height);
                        }
                        colAccumX += colW;
                    }
                }

                // Grid
                if (isRowSelected) {
                    let colX = 0;
                    const isResizing = dragInfo.current.type === 'colResize';

                    row.layout.forEach((pct, i) => {
                        const w = (CANVAS_WIDTH * pct) / 100;
                        ctx.strokeStyle = 'rgba(232, 121, 249, 0.3)';
                        ctx.setLineDash([]);
                        ctx.lineWidth = 1 / state.zoom;
                        ctx.strokeRect(colX, 0, w, row.height);

                        // Show labels only during resize (Purple Pill)
                        if (isResizing && w > 30) {
                            const labelText = `${Math.round(pct)}%`;
                            const labelW = 36 / state.zoom;
                            const labelH = 18 / state.zoom;
                            const labelX = colX + w / 2 - labelW / 2;
                            const labelY =
                                row.height - (labelH + 4 / state.zoom);

                            ctx.fillStyle = COLUMN_GUIDE_COLOR;
                            ctx.beginPath();
                            drawRoundedRect(
                                ctx,
                                labelX,
                                labelY,
                                labelW,
                                labelH,
                                9 / state.zoom
                            );
                            ctx.fill();

                            ctx.fillStyle = 'white';
                            ctx.font = `${10 / state.zoom}px sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(
                                labelText,
                                colX + w / 2,
                                labelY + labelH / 2
                            );
                        }

                        if (i < row.layout.length - 1) {
                            const dividerX = colX + w;
                            ctx.strokeStyle = COLUMN_GUIDE_COLOR;
                            ctx.beginPath();
                            ctx.moveTo(dividerX, 0);
                            ctx.lineTo(dividerX, row.height);
                            ctx.stroke();
                            const handleH = 16 / state.zoom;
                            const handleW = 6 / state.zoom;
                            ctx.fillStyle = 'white';
                            ctx.strokeStyle = COLUMN_GUIDE_COLOR;
                            ctx.beginPath();
                            drawRoundedRect(
                                ctx,
                                dividerX - handleW / 2,
                                row.height / 2 - handleH / 2,
                                handleW,
                                handleH,
                                3 / state.zoom
                            );
                            ctx.fill();
                            ctx.stroke();
                        }
                        colX += w;
                    });
                }

                // Elements
                row.elements.forEach((el) => {
                    const isElSelected = state.selectedElementId === el.id;

                    if (isElSelected) {
                        selectedElement = el;
                        selectedElementRowY = currentY;
                        return;
                    }

                    const isHovered = state.hoveredElementId === el.id;

                    ctx.save();
                    ctx.translate(el.x, el.y);

                    const elFill = getFillStyle(
                        ctx,
                        0,
                        0,
                        el.width,
                        el.height,
                        el.fill || '#94a3b8'
                    );
                    ctx.fillStyle = elFill;

                    if (el.type === 'rect') {
                        ctx.beginPath();
                        drawRoundedRect(ctx, 0, 0, el.width, el.height, 4);
                        ctx.fill();
                    } else if (el.type === 'circle') {
                        ctx.beginPath();
                        ctx.arc(
                            el.width / 2,
                            el.height / 2,
                            el.width / 2,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();
                    } else if (el.type === 'triangle') {
                        ctx.beginPath();
                        ctx.moveTo(el.width / 2, 0);
                        ctx.lineTo(el.width, el.height);
                        ctx.lineTo(0, el.height);
                        ctx.closePath();
                        ctx.fill();
                    } else if (el.type === 'star') {
                        drawStar(
                            ctx,
                            el.width / 2,
                            el.height / 2,
                            5,
                            el.width / 2,
                            el.width / 4
                        );
                        ctx.fill();
                    } else if (el.type === 'polygon') {
                        drawPolygon(
                            ctx,
                            el.width / 2,
                            el.height / 2,
                            6,
                            el.width / 2
                        );
                        ctx.fill();
                    } else if (el.type === 'image' && el.src) {
                        const img = getOrLoadImage(el.src);
                        if (img.complete && img.naturalWidth > 0)
                            ctx.drawImage(img, 0, 0, el.width, el.height);
                        else {
                            ctx.fillStyle = '#e5e7eb';
                            ctx.fillRect(0, 0, el.width, el.height);
                        }
                    } else if (el.type === 'button') {
                        ctx.beginPath();
                        drawRoundedRect(ctx, 0, 0, el.width, el.height, 6);
                        ctx.fill();
                        ctx.fillStyle = 'white';
                        ctx.font = '14px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(
                            el.text || 'Button',
                            el.width / 2,
                            el.height / 2
                        );
                    } else if (el.type === 'text') {
                        ctx.fillStyle = 'black';
                        ctx.font = '16px sans-serif';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'top';
                        ctx.fillText(el.text || 'Heading Text', 0, 0);
                    } else if (el.type === 'divider') {
                        ctx.fillStyle = el.fill || '#d1d5db';
                        ctx.fillRect(0, el.height / 2 - 1, el.width, 2);
                    } else if (el.type === 'spacer') {
                        if (isHovered) {
                            ctx.fillStyle = 'rgba(0,0,0,0.03)';
                            ctx.strokeStyle = '#e5e7eb';
                            ctx.setLineDash([4, 4]);
                            ctx.strokeRect(0, 0, el.width, el.height);
                            ctx.setLineDash([]);
                        }
                    }

                    // Element Hover (Pink)
                    if (isHovered) {
                        ctx.strokeStyle = SELECTION_COLOR;
                        ctx.lineWidth = 1.5 / state.zoom;
                        ctx.shadowColor = 'transparent';
                        ctx.strokeRect(0, 0, el.width, el.height);
                    }

                    ctx.restore();
                });
                ctx.restore();
                currentY += row.height;
            });

            // Draw Reorder Line if active
            if (state.reorderTargetIndex !== null) {
                let targetY = paperY;
                for (let i = 0; i < state.reorderTargetIndex; i++)
                    targetY += state.rows[i].height;

                ctx.strokeStyle = REORDER_LINE_COLOR;
                ctx.lineWidth = 3 / state.zoom;
                ctx.beginPath();
                ctx.moveTo(0, targetY);
                ctx.lineTo(CANVAS_WIDTH, targetY);
                ctx.stroke();
            }

            // PASS 2: Draw Row Controls ON TOP (Hovered)
            if (hoveredRowData && !selectedRowData) {
                const row = hoveredRowData;
                const logicalViewportLeft = -paperScreenX / state.zoom;
                const logicalViewportWidth = viewportWidth / state.zoom;
                const logicalRightEdge =
                    logicalViewportLeft + logicalViewportWidth;
                const dragX = logicalRightEdge - 30 / state.zoom;

                ctx.save();
                ctx.translate(0, hoveredRowY);

                ctx.strokeStyle = ROW_HOVER_COLOR;
                ctx.lineWidth = 1.5 / state.zoom;
                ctx.strokeRect(0, 0, CANVAS_WIDTH, row.height);

                drawDotsIcon(ctx, dragX, row.height / 2);

                ctx.restore();
            }

            // PASS 3: Draw Selected Row Controls ON TOP (Selected)
            if (selectedRowData && state.selectedRowId) {
                const row = selectedRowData;
                const logicalViewportLeft = -paperScreenX / state.zoom;
                const logicalViewportWidth = viewportWidth / state.zoom;

                ctx.save();
                ctx.translate(0, selectedRowY);

                ctx.strokeStyle = PRIMARY_COLOR;
                ctx.lineWidth = 1 / state.zoom;
                ctx.beginPath();
                ctx.moveTo(logicalViewportLeft, 0);
                ctx.lineTo(logicalViewportLeft + logicalViewportWidth, 0);
                ctx.moveTo(logicalViewportLeft, row.height);
                ctx.lineTo(
                    logicalViewportLeft + logicalViewportWidth,
                    row.height
                );
                ctx.stroke();

                const centerX = CANVAS_WIDTH / 2;
                const iconSize = 14 / state.zoom;
                ctx.fillStyle = 'white';
                drawPlusIcon(
                    ctx,
                    centerX,
                    -ADD_BUTTON_OFFSET / state.zoom,
                    iconSize,
                    PRIMARY_COLOR
                );
                drawPlusIcon(
                    ctx,
                    centerX,
                    row.height + ADD_BUTTON_OFFSET / state.zoom,
                    iconSize,
                    PRIMARY_COLOR
                );

                const pillW = 30 / state.zoom;
                const pillH = 6 / state.zoom;
                ctx.fillStyle = 'white';
                ctx.strokeStyle = PRIMARY_COLOR;
                ctx.lineWidth = 1 / state.zoom;
                ctx.beginPath();
                drawRoundedRect(
                    ctx,
                    centerX - pillW / 2,
                    row.height - pillH / 2,
                    pillW,
                    pillH,
                    3 / state.zoom
                );
                ctx.fill();
                ctx.stroke();

                const badgeW = 40 / state.zoom;
                const badgeH = 20 / state.zoom;
                const logicalRightEdge =
                    logicalViewportLeft + logicalViewportWidth;
                const badgeX = logicalRightEdge - badgeW - 20 / state.zoom;
                const badgeY = row.height - badgeH - 5 / state.zoom;

                ctx.fillStyle = PRIMARY_COLOR;
                ctx.beginPath();
                drawRoundedRect(
                    ctx,
                    badgeX,
                    badgeY,
                    badgeW,
                    badgeH,
                    4 / state.zoom
                );
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = `${11 / state.zoom}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(
                    'Row',
                    badgeX + badgeW / 2,
                    badgeY + 14 / state.zoom
                );

                const dragX = logicalRightEdge - 30 / state.zoom;
                drawDotsIcon(ctx, dragX, row.height / 2);

                ctx.restore();
            }

            // PASS 4: Draw Selected Element LAST (On Top of Everything)
            if (selectedElement && selectedElementRowY) {
                const el = selectedElement;
                ctx.save();
                ctx.translate(0, selectedElementRowY);
                ctx.translate(el.x, el.y);

                const elFill = getFillStyle(
                    ctx,
                    0,
                    0,
                    el.width,
                    el.height,
                    el.fill || '#94a3b8'
                );
                ctx.fillStyle = elFill;

                if (el.type === 'rect') {
                    ctx.beginPath();
                    drawRoundedRect(ctx, 0, 0, el.width, el.height, 4);
                    ctx.fill();
                } else if (el.type === 'circle') {
                    ctx.beginPath();
                    ctx.arc(
                        el.width / 2,
                        el.height / 2,
                        el.width / 2,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                } else if (el.type === 'triangle') {
                    ctx.beginPath();
                    ctx.moveTo(el.width / 2, 0);
                    ctx.lineTo(el.width, el.height);
                    ctx.lineTo(0, el.height);
                    ctx.closePath();
                    ctx.fill();
                } else if (el.type === 'star') {
                    drawStar(
                        ctx,
                        el.width / 2,
                        el.height / 2,
                        5,
                        el.width / 2,
                        el.width / 4
                    );
                    ctx.fill();
                } else if (el.type === 'polygon') {
                    drawPolygon(
                        ctx,
                        el.width / 2,
                        el.height / 2,
                        6,
                        el.width / 2
                    );
                    ctx.fill();
                } else if (el.type === 'image' && el.src) {
                    const img = getOrLoadImage(el.src);
                    if (img.complete && img.naturalWidth > 0)
                        ctx.drawImage(img, 0, 0, el.width, el.height);
                    else {
                        ctx.fillStyle = '#e5e7eb';
                        ctx.fillRect(0, 0, el.width, el.height);
                    }
                } else if (el.type === 'button') {
                    ctx.beginPath();
                    drawRoundedRect(ctx, 0, 0, el.width, el.height, 6);
                    ctx.fill();
                    ctx.fillStyle = 'white';
                    ctx.font = '14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        el.text || 'Button',
                        el.width / 2,
                        el.height / 2
                    );
                } else if (el.type === 'text') {
                    ctx.fillStyle = 'black';
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    ctx.fillText(el.text || 'Heading Text', 0, 0);
                } else if (el.type === 'divider') {
                    ctx.fillStyle = el.fill || '#d1d5db';
                    ctx.fillRect(0, el.height / 2 - 1, el.width, 2);
                } else if (el.type === 'spacer') {
                    ctx.fillStyle = 'rgba(0,0,0,0.05)';
                    ctx.strokeStyle = '#d1d5db';
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(0, 0, el.width, el.height);
                    ctx.setLineDash([]);
                }

                // Pink Selection Box
                ctx.strokeStyle = SELECTION_COLOR;
                ctx.lineWidth = 1.5 / state.zoom;
                ctx.shadowColor = 'transparent';
                ctx.strokeRect(0, 0, el.width, el.height);

                drawResizeHandles(ctx, { ...el, x: 0, y: 0 });

                ctx.restore();
            }

            ctx.restore();
        };

        render();
        container.addEventListener('scroll', render);
        window.addEventListener('resize', render);

        return () => {
            container.removeEventListener('scroll', render);
            window.removeEventListener('resize', render);
        };
    }, [state, canvasRef, containerRef, imagesLoaded]);
};

// --- 4. COLOR PICKER COMPONENT (Unchanged) ---
const COLOR_PRESETS = [
    '#000000',
    '#d97706',
    '#7c3aed',
    '#c2410c',
    '#cbd5e1',
    '#15803d',
    '#334155',
    '#b45309',
    '#7f1d1d',
    '#991b1b',
    '#dc2626',
    '#b91c1c',
];
const SECONDARY_PRESETS = [
    '#7e22ce',
    '#c2410c',
    '#eab308',
    '#0ea5e9',
    '#d8b4fe',
    '#a3e635',
    '#db2777',
    '#1e3a8a',
    '#64748b',
    '#ffffff',
    '#7f1d1d',
    '#78716c',
    '#000000',
];
const GRADIENTS = [
    'linear-gradient(to right, #ef4444, #eab308)',
    'linear-gradient(to right, #f97316, #db2777)',
    'linear-gradient(to right, #a855f7, #3b82f6)',
    'linear-gradient(to right, #10b981, #3b82f6)',
];
const ColorPicker = ({
    onSelect,
    onClose,
}: {
    onSelect: (c: string) => void;
    onClose: () => void;
}) => {
    return (
        <div
            className="absolute left-12 top-0 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 animate-in slide-in-from-left-2"
            onClick={(e) => e.stopPropagation()}
        >
            <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                Primary
            </h3>
            <div className="grid grid-cols-8 gap-1 mb-4">
                {COLOR_PRESETS.map((c) => (
                    <button
                        key={c}
                        onClick={() => onSelect(c)}
                        className="w-6 h-6 rounded-sm border border-gray-100 hover:scale-110 transition"
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>
            <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                Secondary
            </h3>
            <div className="grid grid-cols-8 gap-1 mb-4">
                {SECONDARY_PRESETS.map((c) => (
                    <button
                        key={c}
                        onClick={() => onSelect(c)}
                        className="w-6 h-6 rounded-sm border border-gray-100 hover:scale-110 transition relative"
                        style={{ backgroundColor: c }}
                    >
                        {c === '#ffffff' && (
                            <span className="absolute inset-0 border border-gray-200 rounded-sm" />
                        )}
                    </button>
                ))}
            </div>
            <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                Gradients
            </h3>
            <div className="grid grid-cols-8 gap-1 mb-4">
                {GRADIENTS.map((g, i) => (
                    <button
                        key={i}
                        onClick={() => onSelect(g)}
                        className="w-6 h-6 rounded-sm border border-gray-100 hover:scale-110 transition"
                        style={{ background: g }}
                    />
                ))}
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between items-center">
                <span className="text-xs text-gray-400">Custom</span>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

// --- 5. SIDEBAR COMPONENTS (Unchanged) ---
const DraggableLayoutItem = ({
    layout,
    onClick,
}: {
    layout: number[];
    onClick: () => void;
}) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('layout', JSON.stringify(layout));
    };
    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onClick={onClick}
            className="w-full h-12 flex bg-gray-100 border border-gray-200 rounded overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all active:cursor-grabbing group"
        >
            {layout.map((pct, i) => (
                <div
                    key={i}
                    style={{ width: `${pct}%` }}
                    className={`h-full flex items-center justify-center relative ${
                        i < layout.length - 1 ? 'border-r border-gray-300' : ''
                    }`}
                >
                    <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {Math.round(pct)}%
                    </span>
                </div>
            ))}
        </div>
    );
};
const ShapeItem = ({
    type,
    icon: Icon,
    label,
}: {
    type: string;
    icon: any;
    label?: string;
}) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('type', type);
    };
    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center cursor-grab hover:bg-gray-200 text-gray-600"
            title={label}
        >
            <Icon size={28} strokeWidth={1.5} />
        </div>
    );
};
const MediaItem = ({ src }: { src: string }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('type', 'image');
        e.dataTransfer.setData('src', src);
    };
    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="aspect-square rounded-lg overflow-hidden cursor-grab bg-gray-100"
        >
            <img
                src={src}
                className="w-full h-full object-cover pointer-events-none"
            />
        </div>
    );
};
const SAMPLE_IMAGES = [
    'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&w=200',
    'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=200',
    'https://images.pexels.com/photos/1428277/pexels-photo-1428277.jpeg?auto=compress&cs=tinysrgb&w=200',
    'https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=200',
    'https://images.pexels.com/photos/2693529/pexels-photo-2693529.jpeg?auto=compress&cs=tinysrgb&w=200',
    'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg?auto=compress&cs=tinysrgb&w=200',
    'https://images.pexels.com/photos/8100784/pexels-photo-8100784.jpeg?auto=compress&cs=tinysrgb&w=200',
    'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=200',
    'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?auto=compress&cs=tinysrgb&w=200',
    'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=200',
];

// New Components for Blocks Panel (Unchanged)
const FreeFormBlock = ({ onClick }: { onClick: () => void }) => (
    <div
        onClick={onClick}
        className="w-full h-20 bg-gray-50 border border-gray-200 rounded flex items-center justify-center cursor-pointer hover:border-blue-400 text-gray-500 hover:text-blue-500 font-medium text-sm transition"
    >
        Free-Form
    </div>
);
const DividerBlock = ({ onClick }: { onClick: () => void }) => (
    <div
        onClick={onClick}
        className="w-full h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center cursor-pointer hover:border-blue-400 px-4"
    >
        <div className="w-full h-px bg-gray-400" />
    </div>
);
const SpacerBlock = ({ onClick }: { onClick: () => void }) => (
    <div
        onClick={onClick}
        className="w-full h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center cursor-pointer hover:border-blue-400"
    >
        <div className="w-full border-t border-dashed border-gray-300" />
    </div>
);

const Sidebar = ({ onAddRow, onAddElement, onAddSpecialBlock }: any) => {
    const [activeTab, setActiveTab] = useState<
        'blocks' | 'media' | 'shapes' | 'text' | 'button'
    >('blocks');
    return (
        <div className="flex h-full bg-white shadow-xl z-10">
            <div className="w-[72px] border-r border-gray-200 flex flex-col h-full overflow-y-auto hide-scrollbar">
                <button
                    onClick={() => setActiveTab('blocks')}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-1 ${
                        activeTab === 'blocks'
                            ? 'bg-gray-100 text-black'
                            : 'text-gray-500'
                    }`}
                >
                    <LayoutGrid size={20} />
                    <span className="text-[10px]">Blocks</span>
                </button>
                <button
                    onClick={() => setActiveTab('media')}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-1 ${
                        activeTab === 'media'
                            ? 'bg-gray-100 text-black'
                            : 'text-gray-500'
                    }`}
                >
                    <ImageIcon size={20} />
                    <span className="text-[10px]">Media</span>
                </button>
                <button
                    onClick={() => setActiveTab('shapes')}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-1 ${
                        activeTab === 'shapes'
                            ? 'bg-gray-100 text-black'
                            : 'text-gray-500'
                    }`}
                >
                    <Shapes size={20} />
                    <span className="text-[10px]">Shapes</span>
                </button>
                <div className="h-px w-8 bg-gray-200 mx-auto my-2" />
                <button
                    onClick={() => setActiveTab('text')}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-1 ${
                        activeTab === 'text'
                            ? 'bg-gray-100 text-black'
                            : 'text-gray-500'
                    }`}
                >
                    <Type size={20} />
                    <span className="text-[10px]">Text</span>
                </button>
                <button
                    onClick={() => setActiveTab('button')}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-1 ${
                        activeTab === 'button'
                            ? 'bg-gray-100 text-black'
                            : 'text-gray-500'
                    }`}
                >
                    <MousePointer2 size={20} />
                    <span className="text-[10px]">Button</span>
                </button>
                <div className="h-px w-8 bg-gray-200 mx-auto my-2" />
                <button className="w-full aspect-square flex flex-col items-center justify-center gap-1 text-gray-500 hover:bg-gray-50">
                    <Palette size={20} />
                    <span className="text-[10px]">Color</span>
                </button>
            </div>
            <div className="w-[280px] h-full bg-white overflow-y-auto p-6">
                {activeTab === 'blocks' && (
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">
                                HTML Block
                            </h1>
                            <p className="text-xs text-gray-500 mb-4">
                                Responsive, editable, and email-safe.
                            </p>
                            <div className="space-y-3">
                                <DraggableLayoutItem
                                    layout={[100]}
                                    onClick={() => onAddRow([100])}
                                />
                                <DraggableLayoutItem
                                    layout={[50, 50]}
                                    onClick={() => onAddRow([50, 50])}
                                />
                                <DraggableLayoutItem
                                    layout={[100 / 3, 100 / 3, 100 / 3]}
                                    onClick={() =>
                                        onAddRow([100 / 3, 100 / 3, 100 / 3])
                                    }
                                />
                                <DraggableLayoutItem
                                    layout={[25, 25, 25, 25]}
                                    onClick={() => onAddRow([25, 25, 25, 25])}
                                />
                                <DraggableLayoutItem
                                    layout={[30, 70]}
                                    onClick={() => onAddRow([30, 70])}
                                />
                                <DraggableLayoutItem
                                    layout={[70, 30]}
                                    onClick={() => onAddRow([70, 30])}
                                />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 mb-2">
                                Free-Form Block
                            </h2>
                            <p className="text-xs text-gray-500 mb-3">
                                Design without limits. Exports as image.
                            </p>
                            <FreeFormBlock
                                onClick={() => onAddSpecialBlock('freeform')}
                            />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 mb-2">
                                Spacers & Dividers
                            </h2>
                            <div className="space-y-3">
                                <div
                                    draggable
                                    onDragStart={(e) =>
                                        e.dataTransfer.setData('type', 'spacer')
                                    }
                                >
                                    <SpacerBlock
                                        onClick={() =>
                                            onAddSpecialBlock('spacer')
                                        }
                                    />
                                </div>
                                <div
                                    draggable
                                    onDragStart={(e) =>
                                        e.dataTransfer.setData(
                                            'type',
                                            'divider'
                                        )
                                    }
                                >
                                    <DividerBlock
                                        onClick={() =>
                                            onAddSpecialBlock('divider')
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'media' && (
                    <div className="grid grid-cols-2 gap-3">
                        <h1 className="text-2xl font-bold col-span-2 mb-4">
                            Media
                        </h1>
                        {SAMPLE_IMAGES.map((src, i) => (
                            <div
                                key={i}
                                onClick={() => onAddElement('image', src)}
                            >
                                <MediaItem src={src} />
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 'shapes' && (
                    <div className="flex flex-col h-full">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">
                            Add Shapes
                        </h1>
                        <div className="relative mb-4">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                placeholder="Search Library"
                                className="w-full bg-gray-100 rounded-md py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div className="flex gap-4 text-sm font-medium text-gray-500 border-b border-gray-100 pb-2 mb-4">
                            <span className="text-gray-900 border-b-2 border-black pb-2 -mb-2.5">
                                Masks
                            </span>
                            <span className="hover:text-gray-800 cursor-pointer">
                                Lines
                            </span>
                            <span className="hover:text-gray-800 cursor-pointer">
                                Graphics
                            </span>
                            <span className="hover:text-gray-800 cursor-pointer">
                                Symbols
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div onClick={() => onAddElement('rect')}>
                                <ShapeItem type="rect" icon={Square} />
                            </div>
                            <div onClick={() => onAddElement('circle')}>
                                <ShapeItem type="circle" icon={CircleIcon} />
                            </div>
                            <div onClick={() => onAddElement('triangle')}>
                                <ShapeItem type="triangle" icon={Triangle} />
                            </div>
                            <div onClick={() => onAddElement('star')}>
                                <ShapeItem type="star" icon={Star} />
                            </div>
                            <div onClick={() => onAddElement('polygon')}>
                                <ShapeItem type="polygon" icon={Hexagon} />
                            </div>
                            <div onClick={() => onAddElement('rect')}>
                                <ShapeItem type="rect" icon={Layout} />
                            </div>
                            <div onClick={() => onAddElement('rect')}>
                                <ShapeItem type="rect" icon={Plus} />
                            </div>
                            <div onClick={() => onAddElement('rect')}>
                                <ShapeItem type="rect" icon={Copy} />
                            </div>
                            <div onClick={() => onAddElement('rect')}>
                                <ShapeItem type="rect" icon={Grid3x3} />
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'text' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Text</h1>
                        <div className="space-y-3">
                            <div
                                draggable
                                onDragStart={(e) =>
                                    e.dataTransfer.setData('type', 'text')
                                }
                                onClick={() => onAddElement('text')}
                                className="p-4 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:border-blue-400 flex items-center gap-3"
                            >
                                <Heading size={20} />{' '}
                                <span className="font-medium">Heading</span>
                            </div>
                            <div
                                draggable
                                onDragStart={(e) =>
                                    e.dataTransfer.setData('type', 'text')
                                }
                                onClick={() => onAddElement('text')}
                                className="p-4 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:border-blue-400 flex items-center gap-3"
                            >
                                <AlignLeft size={20} />{' '}
                                <span className="font-medium">Paragraph</span>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'button' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Button</h1>
                        <div
                            draggable
                            onDragStart={(e) =>
                                e.dataTransfer.setData('type', 'button')
                            }
                            onClick={() => onAddElement('button')}
                            className="p-4 bg-blue-500 text-white rounded flex justify-center cursor-pointer shadow-sm hover:bg-blue-600"
                        >
                            Primary Button
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 6. MAIN APP ---

const ZoomControls = ({
    zoom,
    setZoom,
}: {
    zoom: number;
    setZoom: (z: number) => void;
}) => {
    const [inputValue, setInputValue] = useState(
        Math.round(zoom * 100).toString() + '%'
    );
    useEffect(() => {
        setInputValue(Math.round(zoom * 100).toString() + '%');
    }, [zoom]);
    const handleBlur = () => {
        let val = parseFloat(inputValue.replace('%', ''));
        if (isNaN(val)) val = zoom * 100;
        setZoom(val / 100);
    };
    return (
        <div className="fixed bottom-6 right-6 flex items-center bg-white rounded-full shadow-xl border border-gray-200 p-1 z-50">
            <button
                onClick={() => setZoom(zoom - 0.1)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition"
            >
                <Minus size={16} />
            </button>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                className="w-12 text-center text-xs font-medium text-gray-700 outline-none"
            />
            <button
                onClick={() => setZoom(zoom + 0.1)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition"
            >
                <Plus size={16} />
            </button>
        </div>
    );
};

const TopBar = ({ width, height }: { width: number; height: number }) => (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6 justify-between z-20 relative">
        <div className="font-semibold text-gray-700">Email Builder</div>
        <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
            Size: {width}px × {height}px
        </div>
        <div className="w-20"></div>
    </div>
);

const App = () => {
    const [state, dispatch] = useReducer(editorReducer, initialState);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewportW, setViewportW] = useState(0);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const totalHeight = state.rows.reduce((acc, r) => acc + r.height, 0);
    const totalLogicalHeight = Math.max(800, totalHeight + 100) * state.zoom;

    // Use a stable ref for dragInfo to avoid closure stale state in window listeners
    const dragInfo = useRef<{
        active: boolean;
        type:
            | 'element'
            | 'rowResize'
            | 'colResize'
            | 'elementResize'
            | 'rowReorder';
        rowId: string | null;
        elId: string | null;
        dividerIndex?: number;
        handle?: string;
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        initialW: number;
        initialH: number;
        draggedRowIndex?: number;
    }>({
        active: false,
        type: 'element',
        rowId: null,
        elId: null,
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        initialW: 0,
        initialH: 0,
    });

    // Fix for dispatch in hooks
    const dispatchRef = useRef(dispatch);
    useEffect(() => {
        dispatchRef.current = dispatch;
    }, [dispatch]);

    useCanvasEngine(canvasRef, containerRef, state, dragInfo);

    useEffect(() => {
        if (containerRef.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    setViewportW(entry.contentRect.width);
                }
            });
            resizeObserver.observe(containerRef.current);
            return () => resizeObserver.disconnect();
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                dispatch({ type: 'DELETE_SELECTION' });
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                dispatch({ type: 'DUPLICATE_SELECTION' });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                dispatch({
                    type: 'SET_ZOOM',
                    zoom: state.zoom + -e.deltaY * 0.001,
                });
            }
        };
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [state.zoom]);

    const getCanvasCoords = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container)
            return {
                paperX: 0,
                logicalY: 0,
                rawY: 0,
                viewportX: 0,
                viewportWidth: 0,
            };
        const rect = canvas.getBoundingClientRect();
        const viewportWidth = container.clientWidth;
        const paperScreenW = CANVAS_WIDTH * state.zoom;
        const paperScreenX = (viewportWidth - paperScreenW) / 2;
        const scrollY = container.scrollTop;
        const mouseScreenX = e.clientX - rect.left;
        const mouseScreenY = e.clientY - rect.top;
        const logicalX = (mouseScreenX - paperScreenX) / state.zoom;
        const logicalY = (mouseScreenY + scrollY) / state.zoom - 40;
        return {
            paperX: logicalX,
            logicalY: logicalY,
            rawY: (mouseScreenY + scrollY) / state.zoom,
            viewportX: mouseScreenX,
            viewportWidth,
        };
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const rect = canvas.getBoundingClientRect();
        const scrollY = container.scrollTop;
        const paperScreenW = CANVAS_WIDTH * state.zoom;
        const paperScreenX = (container.clientWidth - paperScreenW) / 2;
        const mouseScreenX = e.clientX - rect.left;
        const mouseScreenY = e.clientY - rect.top;
        const logicalX = (mouseScreenX - paperScreenX) / state.zoom;
        const logicalY = (mouseScreenY + scrollY) / state.zoom - 40;

        let currentY = 0;
        let target = null;

        for (const row of state.rows) {
            const rowTop = currentY;
            const rowBottom = currentY + row.height;

            if (logicalY >= rowTop && logicalY <= rowBottom) {
                let colAccumX = 0;
                for (let i = 0; i < row.layout.length; i++) {
                    const colW = (CANVAS_WIDTH * row.layout[i]) / 100;
                    if (logicalX >= colAccumX && logicalX < colAccumX + colW) {
                        target = { rowId: row.id, colIndex: i };
                        break;
                    }
                    colAccumX += colW;
                }
                break;
            }
            currentY += row.height;
        }
        dispatch({ type: 'SET_DRAG_TARGET', target });
    };

    const handleDragLeave = () => {
        dispatch({ type: 'SET_DRAG_TARGET', target: null });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setShowColorPicker(false);
        const coords = getCanvasCoords(e);
        let foundHit = false;
        let currentY = 0;

        const container = containerRef.current;
        const viewportWidth = container ? container.clientWidth : 0;
        const paperScreenW = CANVAS_WIDTH * state.zoom;
        const paperScreenX = (viewportWidth - paperScreenW) / 2;
        const logicalViewportLeft = -paperScreenX / state.zoom;
        const logicalViewportWidth = viewportWidth / state.zoom;
        const logicalRightEdge = logicalViewportLeft + logicalViewportWidth;

        for (let i = 0; i < state.rows.length; i++) {
            const row = state.rows[i];
            const rowTop = currentY;
            const rowBottom = currentY + row.height;

            if (
                coords.logicalY >= rowTop - 25 &&
                coords.logicalY <= rowBottom + 25
            ) {
                if (state.selectedRowId === row.id) {
                    const centerX = CANVAS_WIDTH / 2;
                    if (
                        Math.abs(coords.paperX - centerX) < 30 &&
                        Math.abs(coords.logicalY - rowBottom) < 10
                    ) {
                        dragInfo.current = {
                            active: true,
                            type: 'rowResize',
                            rowId: row.id,
                            elId: null,
                            startX: e.clientX,
                            startY: e.clientY,
                            initialX: 0,
                            initialY: 0,
                            initialH: row.height,
                            initialW: 0,
                        };
                        foundHit = true;
                        break;
                    }
                    if (
                        Math.abs(coords.paperX - centerX) < 20 &&
                        Math.abs(
                            coords.logicalY - (rowTop - ADD_BUTTON_OFFSET)
                        ) < ADD_BUTTON_HIT_TOLERANCE
                    ) {
                        dispatch({
                            type: 'ADD_OR_UPDATE_ROW_LAYOUT',
                            layout: [100],
                            index: i,
                            forceAdd: true,
                        });
                        foundHit = true;
                        break;
                    }
                    if (
                        Math.abs(coords.paperX - centerX) < 20 &&
                        Math.abs(
                            coords.logicalY - (rowBottom + ADD_BUTTON_OFFSET)
                        ) < ADD_BUTTON_HIT_TOLERANCE
                    ) {
                        dispatch({
                            type: 'ADD_OR_UPDATE_ROW_LAYOUT',
                            layout: [100],
                            index: i + 1,
                            forceAdd: true,
                        });
                        foundHit = true;
                        break;
                    }
                    const dragHandleX = logicalRightEdge - 30 / state.zoom;
                    if (
                        Math.abs(coords.paperX - dragHandleX) < 20 &&
                        Math.abs(coords.logicalY - (rowTop + row.height / 2)) <
                            20
                    ) {
                        dragInfo.current = {
                            active: true,
                            type: 'rowReorder',
                            rowId: row.id,
                            elId: null,
                            startX: e.clientX,
                            startY: e.clientY,
                            initialX: 0,
                            initialY: 0,
                            initialH: 0,
                            initialW: 0,
                            draggedRowIndex: i,
                        };
                        dispatch({ type: 'SELECT_ROW', id: row.id });
                        foundHit = true;
                        break;
                    }
                    if (
                        coords.logicalY >= rowTop &&
                        coords.logicalY <= rowBottom
                    ) {
                        let colAccumX = 0;
                        for (let d = 0; d < row.layout.length - 1; d++) {
                            const colW = (CANVAS_WIDTH * row.layout[d]) / 100;
                            const dividerX = colAccumX + colW;
                            if (Math.abs(coords.paperX - dividerX) < 10) {
                                dragInfo.current = {
                                    active: true,
                                    type: 'colResize',
                                    rowId: row.id,
                                    elId: null,
                                    dividerIndex: d,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    initialX: 0,
                                    initialY: 0,
                                    initialH: 0,
                                    initialW: 0,
                                };
                                foundHit = true;
                                break;
                            }
                            colAccumX += colW;
                        }
                        if (foundHit) break;
                    }
                }

                if (coords.logicalY >= rowTop && coords.logicalY <= rowBottom) {
                    const rowLocalY = coords.logicalY - rowTop;
                    if (
                        coords.paperX >= 0 &&
                        coords.paperX <= CANVAS_WIDTH &&
                        !foundHit
                    ) {
                        for (let j = row.elements.length - 1; j >= 0; j--) {
                            const el = row.elements[j];
                            const isSelected =
                                state.selectedElementId === el.id;
                            if (isSelected) {
                                const limit = 10 / state.zoom;
                                const handles = [
                                    { name: 'tl', x: el.x, y: el.y },
                                    { name: 'tr', x: el.x + el.width, y: el.y },
                                    {
                                        name: 'bl',
                                        x: el.x,
                                        y: el.y + el.height,
                                    },
                                    {
                                        name: 'br',
                                        x: el.x + el.width,
                                        y: el.y + el.height,
                                    },
                                ];
                                for (let h of handles) {
                                    if (
                                        Math.abs(coords.paperX - h.x) <=
                                            limit &&
                                        Math.abs(rowLocalY - h.y) <= limit
                                    ) {
                                        dragInfo.current = {
                                            active: true,
                                            type: 'elementResize',
                                            rowId: row.id,
                                            elId: el.id,
                                            handle: h.name,
                                            startX: e.clientX,
                                            startY: e.clientY,
                                            initialX: el.x,
                                            initialY: el.y,
                                            initialW: el.width,
                                            initialH: el.height,
                                        };
                                        foundHit = true;
                                        break;
                                    }
                                }
                                if (foundHit) break;
                            }
                            if (
                                coords.paperX >= el.x &&
                                coords.paperX <= el.x + el.width &&
                                rowLocalY >= el.y &&
                                rowLocalY <= el.y + el.height
                            ) {
                                dispatch({
                                    type: 'SELECT_ELEMENT',
                                    rowId: row.id,
                                    elId: el.id,
                                });
                                dragInfo.current = {
                                    active: true,
                                    type: 'element',
                                    rowId: row.id,
                                    elId: el.id,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    initialX: el.x,
                                    initialY: el.y,
                                    initialH: 0,
                                    initialW: 0,
                                };
                                foundHit = true;
                                break;
                            }
                        }
                    }
                    if (!foundHit) {
                        dispatch({ type: 'SELECT_ROW', id: row.id });
                        foundHit = true;
                        break;
                    }
                }
            }
            currentY += row.height;
        }
        if (!foundHit) dispatch({ type: 'SELECT_ROW', id: null });
    };

    // Global Listeners
    useEffect(() => {
        const handleWindowMouseMove = (e: MouseEvent) => {
            if (dragInfo.current.active) {
                handleMouseMove(e as unknown as React.MouseEvent);
            }
        };
        const handleWindowMouseUp = () => {
            if (dragInfo.current.active) {
                handleMouseUp();
            }
        };
        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [state.zoom]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const coords = getCanvasCoords(e);
        let cursor = 'default';
        if (!dragInfo.current.active) {
            let currentY = 0;
            let foundHover = false;
            for (const row of state.rows) {
                const rowTop = currentY;
                const rowBottom = currentY + row.height;
                if (coords.logicalY >= rowTop && coords.logicalY <= rowBottom) {
                    if (state.hoveredRowId !== row.id)
                        dispatch({ type: 'SET_HOVERED_ROW', id: row.id });
                    foundHover = true;
                }
                const rowLocalY = coords.logicalY - rowTop;
                for (let j = row.elements.length - 1; j >= 0; j--) {
                    const el = row.elements[j];
                    if (
                        coords.paperX >= el.x &&
                        coords.paperX <= el.x + el.width &&
                        rowLocalY >= el.y &&
                        rowLocalY <= el.y + el.height
                    ) {
                        if (state.hoveredElementId !== el.id)
                            dispatch({
                                type: 'SET_HOVERED_ELEMENT',
                                id: el.id,
                            });
                        cursor = 'move';
                        foundHover = true;
                        break;
                    }
                }
                if (state.selectedRowId === row.id) {
                    const centerX = CANVAS_WIDTH / 2;
                    if (
                        Math.abs(coords.paperX - centerX) < 30 &&
                        Math.abs(coords.logicalY - rowBottom) < 10
                    )
                        cursor = 'ns-resize';
                    else if (
                        Math.abs(coords.paperX - centerX) < 20 &&
                        (Math.abs(
                            coords.logicalY - (rowTop - ADD_BUTTON_OFFSET)
                        ) < ADD_BUTTON_HIT_TOLERANCE ||
                            Math.abs(
                                coords.logicalY -
                                    (rowBottom + ADD_BUTTON_OFFSET)
                            ) < ADD_BUTTON_HIT_TOLERANCE)
                    )
                        cursor = 'pointer';
                }
                currentY += row.height;
                if (cursor !== 'default') break;
            }
            if (!foundHover) {
                if (state.hoveredElementId || state.hoveredRowId) {
                    dispatch({ type: 'SET_HOVERED_ELEMENT', id: null });
                    dispatch({ type: 'SET_HOVERED_ROW', id: null });
                }
            }
            if (canvasRef.current) canvasRef.current.style.cursor = cursor;
        }

        if (!dragInfo.current.active) return;
        const {
            type,
            rowId,
            elId,
            dividerIndex,
            handle,
            startX,
            startY,
            initialX,
            initialY,
            initialW,
            initialH,
        } = dragInfo.current;
        const dx = (e.clientX - startX) / state.zoom;
        const dy = (e.clientY - startY) / state.zoom;

        if (type === 'element' && rowId && elId) {
            dispatch({
                type: 'UPDATE_ELEMENT',
                rowId,
                elId,
                attrs: { x: initialX + dx, y: initialY + dy },
            });
        } else if (type === 'elementResize' && rowId && elId && handle) {
            let newX = initialX;
            let newY = initialY;
            let newW = initialW;
            let newH = initialH;
            if (handle === 'br') {
                newW = Math.max(20, initialW + dx);
                newH = Math.max(20, initialH + dy);
            } else if (handle === 'bl') {
                newW = Math.max(20, initialW - dx);
                newH = Math.max(20, initialH + dy);
                newX = initialX + (initialW - newW);
            } else if (handle === 'tr') {
                newW = Math.max(20, initialW + dx);
                newH = Math.max(20, initialH - dy);
                newY = initialY + (initialH - newH);
            } else if (handle === 'tl') {
                newW = Math.max(20, initialW - dx);
                newH = Math.max(20, initialH - dy);
                newX = initialX + (initialW - newW);
                newY = initialY + (initialH - newH);
            }
            dispatch({
                type: 'UPDATE_ELEMENT',
                rowId,
                elId,
                attrs: { x: newX, y: newY, width: newW, height: newH },
            });
        } else if (type === 'rowResize' && rowId) {
            dispatch({
                type: 'UPDATE_ROW_HEIGHT',
                rowId,
                height: initialH + dy,
            });
        } else if (
            type === 'colResize' &&
            rowId &&
            typeof dividerIndex === 'number'
        ) {
            const deltaPct = (dx / CANVAS_WIDTH) * 100;
            if (Math.abs(dx) > 1) {
                dispatch({
                    type: 'RESIZE_COLUMN',
                    rowId,
                    dividerIndex,
                    deltaPct,
                });
                dragInfo.current.startX = e.clientX;
            }
        } else if (type === 'rowReorder') {
            let currentY = 0;
            let newTargetIndex = state.rows.length;
            for (let i = 0; i < state.rows.length; i++) {
                const rowH = state.rows[i].height;
                if (coords.logicalY < currentY + rowH / 2) {
                    newTargetIndex = i;
                    break;
                }
                currentY += rowH;
            }
            dispatch({ type: 'SET_REORDER_TARGET', index: newTargetIndex });
        }
    };

    const handleMouseUp = () => {
        if (
            dragInfo.current.type === 'element' &&
            dragInfo.current.rowId &&
            dragInfo.current.elId
        ) {
            const { rowId, elId } = dragInfo.current;
            const element = state.rows
                .find((r) => r.id === rowId)
                ?.elements.find((e) => e.id === elId);
            if (element) {
                let currentRowStart = 0;
                for (let r of state.rows) {
                    if (r.id === rowId) break;
                    currentRowStart += r.height;
                }
                const absoluteElementY = currentRowStart + element.y;
                let targetRowId = null;
                let targetRowStart = 0;
                for (let r of state.rows) {
                    if (
                        absoluteElementY >= targetRowStart &&
                        absoluteElementY <= targetRowStart + r.height
                    ) {
                        targetRowId = r.id;
                        break;
                    }
                    targetRowStart += r.height;
                }
                if (targetRowId && targetRowId !== rowId) {
                    dispatch({
                        type: 'MOVE_ELEMENT',
                        sourceRowId: rowId,
                        targetRowId: targetRowId,
                        elementId: elId,
                        newX: element.x,
                        newY: absoluteElementY - targetRowStart,
                    });
                }
            }
        } else if (
            dragInfo.current.type === 'rowReorder' &&
            typeof dragInfo.current.draggedRowIndex === 'number' &&
            state.reorderTargetIndex !== null
        ) {
            dispatch({
                type: 'REORDER_ROW',
                fromIndex: dragInfo.current.draggedRowIndex,
                toIndex: state.reorderTargetIndex,
            });
        }
        dragInfo.current.active = false;
        dispatch({ type: 'SET_REORDER_TARGET', index: null });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        dispatch({ type: 'SET_DRAG_TARGET', target: null });

        const type = e.dataTransfer.getData('type');
        const layout = e.dataTransfer.getData('layout');
        const src = e.dataTransfer.getData('src');

        if (layout) {
            dispatch({
                type: 'ADD_OR_UPDATE_ROW_LAYOUT',
                layout: JSON.parse(layout),
                forceAdd: true,
            });
        } else if (type) {
            const coords = getCanvasCoords(e);
            let currentY = 0;
            let targetRowId = null;
            let dropYInRow = 0;

            for (const row of state.rows) {
                if (
                    coords.logicalY >= currentY &&
                    coords.logicalY <= currentY + row.height
                ) {
                    targetRowId = row.id;
                    dropYInRow = coords.logicalY - currentY;
                    break;
                }
                currentY += row.height;
            }

            if (targetRowId) {
                dispatch({
                    type: 'ADD_ELEMENT',
                    rowId: targetRowId,
                    elementType: type as ElementType,
                    src: src || undefined,
                    x: coords.paperX,
                    y: dropYInRow,
                    text:
                        type === 'text'
                            ? 'Heading'
                            : type === 'button'
                            ? 'Button'
                            : undefined,
                });
            }
        }
    };

    let contextMenuY = 0;
    let showContextMenu = false;
    const selectedRowIndex = state.rows.findIndex(
        (r) => r.id === state.selectedRowId
    );
    if (
        state.selectedRowId &&
        selectedRowIndex !== -1 &&
        containerRef.current
    ) {
        let currentY = 40;
        for (let i = 0; i < selectedRowIndex; i++)
            currentY += state.rows[i].height;
        contextMenuY = currentY * state.zoom;
        showContextMenu = true;
    }
    const contextMenuLeft =
        viewportW > 0
            ? viewportW / 2 + (CANVAS_WIDTH * state.zoom) / 2 + 10
            : 0;

    return (
        <div className="flex h-screen w-screen overflow-hidden font-sans bg-gray-100 text-gray-900 select-none flex-col">
            <TopBar width={CANVAS_WIDTH} height={totalHeight} />

            <div className="flex-1 flex overflow-hidden relative">
                <Sidebar
                    onAddRow={(layout) =>
                        dispatch({ type: 'ADD_OR_UPDATE_ROW_LAYOUT', layout })
                    }
                    onAddElement={(type, src) =>
                        dispatch({
                            type: 'ADD_ELEMENT',
                            rowId: state.selectedRowId!,
                            elementType: type,
                            src,
                        })
                    }
                    onAddSpecialBlock={(type) =>
                        dispatch({ type: 'ADD_SPECIAL_BLOCK', blockType: type })
                    }
                />

                <div
                    ref={containerRef}
                    className="flex-1 bg-gray-200 h-full overflow-auto relative"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => dispatch({ type: 'SELECT_ROW', id: null })}
                >
                    <div
                        style={{
                            height: totalLogicalHeight,
                            width: '1px',
                            position: 'absolute',
                            zIndex: -1,
                        }}
                    />
                    <canvas
                        ref={canvasRef}
                        style={{
                            display: 'block',
                            position: 'sticky',
                            top: 0,
                            left: 0,
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer shadow-sm"
                    />

                    {showContextMenu && (
                        <div
                            className="absolute flex flex-col gap-1 bg-white p-1 rounded-lg shadow-xl border border-gray-200 z-50 animate-in fade-in zoom-in-95 duration-100"
                            style={{ top: contextMenuY, left: contextMenuLeft }}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (state.selectedRowId)
                                        dispatch({
                                            type: 'DUPLICATE_ROW',
                                            rowId: state.selectedRowId,
                                        });
                                }}
                                className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors group relative"
                                title="Duplicate Block"
                            >
                                <Copy size={18} />
                            </button>

                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowColorPicker(!showColorPicker);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors group relative"
                                    title="Background Color"
                                >
                                    <Palette size={18} />
                                </button>
                                {showColorPicker && (
                                    <ColorPicker
                                        onSelect={(c) => {
                                            dispatch({
                                                type: 'SET_SELECTION_COLOR',
                                                color: c,
                                            });
                                            setShowColorPicker(false);
                                        }}
                                        onClose={() =>
                                            setShowColorPicker(false)
                                        }
                                    />
                                )}
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch({ type: 'DELETE_SELECTION' });
                                }}
                                className="p-2 hover:bg-red-50 rounded text-gray-600 hover:text-red-600 transition-colors group relative"
                                title="Delete Row"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}

                    <ZoomControls
                        zoom={state.zoom}
                        setZoom={(z) => dispatch({ type: 'SET_ZOOM', zoom: z })}
                    />
                </div>
            </div>
        </div>
    );
};

export default App;
