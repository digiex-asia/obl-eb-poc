import { useReducer, useCallback, useEffect } from 'react';
import { EditorState, CanvasEditorProps } from './types';
import { editorReducer, createInitialState, Action } from './reducer';

export interface UseCanvasEditorReturn {
    state: EditorState;
    dispatch: React.Dispatch<Action>;
    // Convenience methods
    addRow: (layout: number[], options?: { index?: number; forceAdd?: boolean; minHeight?: number }) => void;
    addElement: (rowId: string, type: string, options?: { src?: string; x?: number; y?: number; text?: string }) => void;
    selectRow: (id: string | null) => void;
    selectElement: (rowId: string, elId: string) => void;
    deleteSelection: () => void;
    duplicateSelection: () => void;
    setZoom: (zoom: number) => void;
    updateElement: (rowId: string, elId: string, attrs: Partial<EditorState['rows'][0]['elements'][0]>) => void;
    getState: () => EditorState;
    setState: (state: EditorState) => void;
}

export function useCanvasEditor(props?: Pick<CanvasEditorProps, 'initialState' | 'onChange'>): UseCanvasEditorReturn {
    const [state, dispatch] = useReducer(editorReducer, createInitialState(props?.initialState));

    // Call onChange whenever state changes
    useEffect(() => {
        props?.onChange?.(state);
    }, [state, props?.onChange]);

    const addRow = useCallback(
        (layout: number[], options?: { index?: number; forceAdd?: boolean; minHeight?: number }) => {
            dispatch({
                type: 'ADD_OR_UPDATE_ROW_LAYOUT',
                layout,
                index: options?.index,
                forceAdd: options?.forceAdd,
                minHeight: options?.minHeight,
            });
        },
        []
    );

    const addElement = useCallback(
        (rowId: string, type: string, options?: { src?: string; x?: number; y?: number; text?: string }) => {
            dispatch({
                type: 'ADD_ELEMENT',
                rowId,
                elementType: type as any,
                src: options?.src,
                x: options?.x,
                y: options?.y,
                text: options?.text,
            });
        },
        []
    );

    const selectRow = useCallback((id: string | null) => {
        dispatch({ type: 'SELECT_ROW', id });
    }, []);

    const selectElement = useCallback((rowId: string, elId: string) => {
        dispatch({ type: 'SELECT_ELEMENT', rowId, elId });
    }, []);

    const deleteSelection = useCallback(() => {
        dispatch({ type: 'DELETE_SELECTION' });
    }, []);

    const duplicateSelection = useCallback(() => {
        dispatch({ type: 'DUPLICATE_SELECTION' });
    }, []);

    const setZoom = useCallback((zoom: number) => {
        dispatch({ type: 'SET_ZOOM', zoom });
    }, []);

    const updateElement = useCallback(
        (rowId: string, elId: string, attrs: Partial<EditorState['rows'][0]['elements'][0]>) => {
            dispatch({ type: 'UPDATE_ELEMENT', rowId, elId, attrs });
        },
        []
    );

    const getState = useCallback(() => state, [state]);

    const setState = useCallback((newState: EditorState) => {
        dispatch({ type: 'SET_STATE', state: newState });
    }, []);

    return {
        state,
        dispatch,
        addRow,
        addElement,
        selectRow,
        selectElement,
        deleteSelection,
        duplicateSelection,
        setZoom,
        updateElement,
        getState,
        setState,
    };
}

