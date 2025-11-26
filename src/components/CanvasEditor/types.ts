// --- CanvasEditor Types & Constants ---

export const CANVAS_WIDTH = 600;
export const PAGE_BG_COLOR = '#f3f4f6';
export const PRIMARY_COLOR = '#3b82f6';
export const SELECTION_COLOR = '#d946ef';
export const ROW_HOVER_COLOR = '#60a5fa';
export const DROP_TARGET_COLOR = '#10b981';
export const COLUMN_GUIDE_COLOR = '#d946ef';
export const REORDER_LINE_COLOR = '#3b82f6';
export const HANDLE_SIZE = 10;
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

export interface CanvasEditorProps {
    /** Initial state for the editor */
    initialState?: Partial<EditorState>;
    /** Callback when state changes */
    onChange?: (state: EditorState) => void;
    /** Custom sample images for the media panel */
    sampleImages?: string[];
    /** Whether to show the sidebar */
    showSidebar?: boolean;
    /** Whether to show the top bar */
    showTopBar?: boolean;
    /** Whether to show zoom controls */
    showZoomControls?: boolean;
    /** Custom class name for the container */
    className?: string;
    /** Custom styles for the container */
    style?: React.CSSProperties;
}

export interface DragInfo {
    active: boolean;
    type: 'element' | 'rowResize' | 'colResize' | 'elementResize' | 'rowReorder';
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
}

