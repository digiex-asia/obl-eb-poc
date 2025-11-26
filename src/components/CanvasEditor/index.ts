// Main component export
export { default, CanvasEditor, App } from './CanvasEditor';

// Types
export type {
    ElementType,
    EditorElement,
    EditorRow,
    EditorState,
    CanvasEditorProps,
    DragInfo,
} from './types';

// Constants
export {
    CANVAS_WIDTH,
    PAGE_BG_COLOR,
    PRIMARY_COLOR,
    SELECTION_COLOR,
    ROW_HOVER_COLOR,
    DROP_TARGET_COLOR,
    COLUMN_GUIDE_COLOR,
    REORDER_LINE_COLOR,
    HANDLE_SIZE,
    RESIZE_HANDLE_HIT_TOLERANCE,
    ADD_BUTTON_OFFSET,
    ADD_BUTTON_HIT_TOLERANCE,
} from './types';

// State management
export { editorReducer, createInitialState, generateId } from './reducer';
export type { Action } from './reducer';

// Hook for external state management
export { useCanvasEditor } from './useCanvasEditor';
export type { UseCanvasEditorReturn } from './useCanvasEditor';
