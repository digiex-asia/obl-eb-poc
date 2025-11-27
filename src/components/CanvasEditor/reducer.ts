import { EditorState, EditorRow, EditorElement, ElementType, CANVAS_WIDTH } from './types';

export type Action =
    | { type: 'ADD_OR_UPDATE_ROW_LAYOUT'; layout: number[]; index?: number; forceAdd?: boolean; minHeight?: number }
    | { type: 'ADD_SPECIAL_BLOCK'; blockType: 'freeform' | 'divider' | 'spacer' }
    | { type: 'DUPLICATE_ROW'; rowId: string }
    | { type: 'DUPLICATE_SELECTION' }
    | { type: 'SELECT_ROW'; id: string | null }
    | { type: 'SELECT_ELEMENT'; rowId: string; elId: string }
    | { type: 'SET_HOVERED_ELEMENT'; id: string | null }
    | { type: 'SET_HOVERED_ROW'; id: string | null }
    | { type: 'SET_DRAG_TARGET'; target: { rowId: string; colIndex: number } | null }
    | { type: 'SET_REORDER_TARGET'; index: number | null }
    | { type: 'REORDER_ROW'; fromIndex: number; toIndex: number }
    | { type: 'ADD_ELEMENT'; rowId: string; elementType: ElementType; src?: string; x?: number; y?: number; text?: string }
    | { type: 'UPDATE_ELEMENT'; rowId: string; elId: string; attrs: Partial<EditorElement> }
    | { type: 'MOVE_ELEMENT'; sourceRowId: string; targetRowId: string; elementId: string; newX: number; newY: number }
    | { type: 'UPDATE_ROW_HEIGHT'; rowId: string; height: number }
    | { type: 'RESIZE_COLUMN'; rowId: string; dividerIndex: number; deltaPct: number }
    | { type: 'DELETE_SELECTION' }
    | { type: 'SET_ZOOM'; zoom: number }
    | { type: 'SET_SELECTION_COLOR'; color: string }
    | { type: 'SET_STATE'; state: EditorState };

export const generateId = () =>
    crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);

export const createInitialState = (overrides?: Partial<EditorState>): EditorState => ({
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
    ...overrides,
});

export const editorReducer = (state: EditorState, action: Action): EditorState => {
    switch (action.type) {
        case 'SET_STATE':
            return action.state;

        case 'SET_ZOOM':
            return { ...state, zoom: Math.max(0.1, Math.min(5, action.zoom)) };

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
            if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= state.rows.length) return state;
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
                                el.id === state.selectedElementId ? { ...el, fill: color } : el
                            ),
                        };
                    }),
                };
            }
            if (state.selectedRowId) {
                return {
                    ...state,
                    rows: state.rows.map((row) =>
                        row.id === state.selectedRowId ? { ...row, backgroundColor: color } : row
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
                const selectedIndex = state.rows.findIndex((r) => r.id === state.selectedRowId);
                if (selectedIndex !== -1) insertIndex = selectedIndex + 1;
            }

            const newRows = [...state.rows];
            newRows.splice(insertIndex, 0, newRow);

            return {
                ...state,
                rows: newRows,
                selectedRowId: newRowId,
                selectedElementId: newRow.elements.length > 0 ? newRow.elements[0].id : null,
            };
        }

        case 'ADD_OR_UPDATE_ROW_LAYOUT': {
            if (!action.forceAdd && state.selectedRowId) {
                return {
                    ...state,
                    rows: state.rows.map((row) =>
                        row.id === state.selectedRowId ? { ...row, layout: action.layout } : row
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
                const selectedIndex = state.rows.findIndex((r) => r.id === state.selectedRowId);
                if (selectedIndex !== -1) insertIndex = selectedIndex + 1;
            }

            newRows.splice(insertIndex, 0, newRow);

            return { ...state, rows: newRows, selectedRowId: newRow.id, selectedElementId: null };
        }

        case 'DUPLICATE_SELECTION': {
            if (state.selectedElementId && state.selectedRowId) {
                const rowIndex = state.rows.findIndex((r) => r.id === state.selectedRowId);
                if (rowIndex === -1) return state;
                const row = state.rows[rowIndex];
                const element = row.elements.find((e) => e.id === state.selectedElementId);
                if (!element) return state;
                const newElement = { ...element, id: generateId(), x: element.x + 20, y: element.y + 20 };
                const newRows = [...state.rows];
                newRows[rowIndex] = { ...row, elements: [...row.elements, newElement] };
                return { ...state, rows: newRows, selectedElementId: newElement.id };
            } else if (state.selectedRowId) {
                const index = state.rows.findIndex((r) => r.id === state.selectedRowId);
                if (index === -1) return state;
                const rowToCopy = state.rows[index];
                const newRow: EditorRow = {
                    ...rowToCopy,
                    id: generateId(),
                    elements: rowToCopy.elements.map((el) => ({ ...el, id: generateId() })),
                };
                const newRows = [...state.rows];
                newRows.splice(index + 1, 0, newRow);
                return { ...state, rows: newRows, selectedRowId: newRow.id, selectedElementId: null };
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
                elements: rowToCopy.elements.map((el) => ({ ...el, id: generateId() })),
            };
            const newRows = [...state.rows];
            newRows.splice(index + 1, 0, newRow);
            return { ...state, rows: newRows, selectedRowId: newRow.id, selectedElementId: null };
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
            return { ...state, selectedRowId: action.id, selectedElementId: null };

        case 'SELECT_ELEMENT':
            return { ...state, selectedRowId: action.rowId, selectedElementId: action.elId };

        case 'ADD_ELEMENT':
            return {
                ...state,
                rows: state.rows.map((row) => {
                    if (row.id !== action.rowId) return row;

                    let colX = 0;
                    const colRanges = row.layout.map((pct) => {
                        const w = (CANVAS_WIDTH * pct) / 100;
                        const range = { start: colX, end: colX + w, width: w, center: colX + w / 2 };
                        colX += w;
                        return range;
                    });

                    let finalX = 0;
                    let finalY = 20;
                    let finalW = 80;
                    let finalH = 80;
                    if (action.elementType === 'text') { finalW = 120; finalH = 40; }
                    if (action.elementType === 'button') { finalW = 100; finalH = 40; }
                    if (action.elementType === 'divider') { finalW = 200; finalH = 10; }
                    if (action.elementType === 'spacer') { finalW = 100; finalH = 50; }

                    if (typeof action.x === 'number' && typeof action.y === 'number') {
                        const targetCol = colRanges.find((c) => action.x! >= c.start && action.x! <= c.end) || colRanges[0];
                        if (action.elementType === 'divider') finalW = targetCol.width * 0.9;
                        else if (action.elementType !== 'text' && action.elementType !== 'button' && action.elementType !== 'spacer') {
                            finalW = Math.min(targetCol.width * 0.8, 150);
                            finalH = action.elementType === 'image' ? finalW : finalW;
                        }
                        finalX = action.x - finalW / 2;
                        finalY = action.y - finalH / 2;
                    } else {
                        const occupiedCols = new Set<number>();
                        row.elements.forEach((el) => {
                            const center = el.x + el.width / 2;
                            const colIdx = colRanges.findIndex((c) => center >= c.start && center < c.end);
                            if (colIdx !== -1) occupiedCols.add(colIdx);
                        });
                        let targetColIndex = colRanges.findIndex((_, i) => !occupiedCols.has(i));
                        if (targetColIndex === -1) targetColIndex = row.elements.length % colRanges.length;
                        const targetCol = colRanges[targetColIndex];
                        if (action.elementType === 'divider') finalW = targetCol.width * 0.9;
                        else if (action.elementType !== 'text' && action.elementType !== 'button' && action.elementType !== 'spacer') {
                            finalW = Math.min(targetCol.width * 0.8, 150);
                            finalH = action.elementType === 'image' ? finalW : finalW;
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
                        fill: action.elementType === 'image' ? undefined : '#94a3b8',
                        src: action.src,
                        text: action.text,
                    };

                    if (action.elementType === 'rect') newEl.fill = '#6366f1';
                    if (action.elementType === 'circle') newEl.fill = '#10b981';
                    if (action.elementType === 'triangle') newEl.fill = '#f59e0b';
                    if (action.elementType === 'star') newEl.fill = '#ec4899';
                    if (action.elementType === 'polygon') newEl.fill = '#3b82f6';
                    if (action.elementType === 'button') newEl.fill = '#3b82f6';
                    if (action.elementType === 'text') newEl.fill = 'transparent';
                    if (action.elementType === 'divider') newEl.fill = '#d1d5db';
                    if (action.elementType === 'spacer') newEl.fill = 'transparent';

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
                    const maxBottom = updatedElements.reduce((max, el) => Math.max(max, el.y + el.height), 0);
                    const newHeight = Math.max(150, maxBottom + 40);
                    return { ...row, elements: updatedElements, height: newHeight };
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
                        return { ...row, elements: row.elements.filter((e) => e.id !== elementId) };
                    }
                    if (row.id === targetRowId) {
                        const potentialBottom = newY + element.height;
                        const newHeight = Math.max(row.height, potentialBottom + 40, 150);
                        return { ...row, height: newHeight, elements: [...row.elements, movedElement] };
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
                rows: state.rows.map((r) => (r.id === action.rowId ? { ...r, height: Math.max(50, action.height) } : r)),
            };

        case 'DELETE_SELECTION':
            if (state.selectedElementId && state.selectedRowId) {
                return {
                    ...state,
                    rows: state.rows.map((row) => {
                        if (row.id !== state.selectedRowId) return row;
                        return { ...row, elements: row.elements.filter((e) => e.id !== state.selectedElementId) };
                    }),
                    selectedElementId: null,
                };
            } else if (state.selectedRowId) {
                const index = state.rows.findIndex((r) => r.id === state.selectedRowId);
                const newRows = state.rows.filter((r) => r.id !== state.selectedRowId);
                let newSelectedId = null;
                if (newRows.length > 0) {
                    const newIndex = Math.max(0, index - 1);
                    newSelectedId = newRows[newIndex] ? newRows[newIndex].id : newRows[0].id;
                }
                return { ...state, rows: newRows, selectedRowId: newSelectedId, selectedElementId: null };
            }
            return state;

        default:
            return state;
    }
};


