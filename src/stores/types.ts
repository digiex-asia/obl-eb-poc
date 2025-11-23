export const CANVAS_WIDTH = 600;
export const PAGE_BG_COLOR = '#f3f4f6';
export const PRIMARY_COLOR = '#3b82f6';
export const SELECTION_COLOR = '#d946ef';
export const ROW_HOVER_COLOR = '#60a5fa';
export const DROP_TARGET_COLOR = '#10b981';
export const COLUMN_GUIDE_COLOR = '#e879f9';
export const REORDER_LINE_COLOR = '#3b82f6';
export const HANDLE_SIZE = 10;

// Control Positioning
export const RESIZE_HANDLE_HIT_TOLERANCE = 10;
export const ADD_BUTTON_OFFSET = 25;
export const ADD_BUTTON_HIT_TOLERANCE = 15;

export type ElementType =
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

export interface EditorElement {
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

export interface EditorRow {
    id: string;
    height: number;
    layout: number[];
    elements: EditorElement[];
    backgroundColor?: string;
}

export interface EditorState {
    rows: EditorRow[];
    selectedRowId: string | null;
    selectedElementId: string | null;
    hoveredElementId: string | null;
    hoveredRowId: string | null;
    dragTarget: { rowId: string; colIndex: number } | null;
    reorderTargetIndex: number | null;
    zoom: number;
}

export const generateId = () =>
    crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9);

