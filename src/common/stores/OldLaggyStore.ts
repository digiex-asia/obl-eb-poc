import { makeAutoObservable } from 'mobx';
import {
    EditorRow,
    EditorElement,
    ElementType,
    CANVAS_WIDTH,
    generateId,
} from './types';

// Intentional bad practice: Monolithic state object
export interface LaggyState {
    rows: EditorRow[];
    selectedRowId: string | null;
    selectedElementId: string | null;
    hoveredElementId: string | null;
    zoom: number;
}

class OldLaggyStore {
    // We keep the state as a single object to simulate the monolithic "EmailPage"
    state: LaggyState = {
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
        zoom: 1,
    };

    constructor() {
        makeAutoObservable(this);
    }

    // SIMULATION OF LAG:
    // In the old code, getters like `storeValue` did deep cloning.
    // We simulate this by deep cloning the ENTIRE state on every single modification.
    private commitState(newState: LaggyState) {
        // 1. Serialize/Deserialize (The O(N) cost of the legacy system)

        const serialized = JSON.stringify(newState);
        const deserialized = JSON.parse(serialized);
        this.state = deserialized;
        // 2. Artificial CPU burn to simulate 10k lines of logic running
        // We want this to block the main thread (synchronously) so the UI feels "heavy"
        // but we MUST ensure the update happens immediately after the block.
        // const start = performance.now();
        // while (performance.now() - start < 50) {
        //     // Busy wait 15ms per update
        //     console.log('busy waiting');
        // }

        // 3. Commit the new state. Since this is in an action (mobx),
        // it triggers the reaction *after* the heavy computation.
        // Because we replaced the entire 'state' object, all observers of 'state'
        // (the whole app) will re-render.
    }

    setZoom(zoom: number) {
        const newState = { ...this.state, zoom: Math.max(0.1, Math.min(5, zoom)) };
        this.commitState(newState);
    }

    setSelection(rowId: string | null, elId: string | null) {
        const newState = { ...this.state, selectedRowId: rowId, selectedElementId: elId };
        this.commitState(newState);
    }

    addElement(
        rowId: string,
        elementType: ElementType,
        src?: string,
        text?: string
    ) {
        const newState = { ...this.state };
        const row = newState.rows.find((r) => r.id === rowId);
        if (!row) return;

        // Simple centering logic
        const width = 100;
        const height = 100;
        const x = CANVAS_WIDTH / 2 - width / 2;
        const y = 20;

        const newEl: EditorElement = {
            id: generateId(),
            type: elementType,
            x,
            y,
            width,
            height,
            fill: elementType === 'image' ? undefined : '#94a3b8',
            src,
            text,
        };

        // Add colors
        if (elementType === 'rect') newEl.fill = '#6366f1';
        if (elementType === 'circle') newEl.fill = '#10b981';
        if (elementType === 'button') newEl.fill = '#3b82f6';

        row.elements.push(newEl);

        // Force the laggy commit
        this.commitState(newState);
        this.setSelection(rowId, newEl.id);
    }

    updateElement(
        rowId: string,
        elId: string,
        attrs: Partial<EditorElement>
    ) {
        const newState = { ...this.state };
        const row = newState.rows.find((r) => r.id === rowId);
        if (!row) return;
        const element = row.elements.find((e) => e.id === elId);
        if (!element) return;

        Object.assign(element, attrs);

        // Auto expand row (Responsive logic)
        const maxBottom = row.elements.reduce(
            (max, el) => Math.max(max, el.y + el.height),
            0
        );
        const newHeight = Math.max(150, maxBottom + 40);

        if (row.height !== newHeight) {
            row.height = newHeight;
        }

        this.commitState(newState);
    }

    updateRowHeight(rowId: string, height: number) {
        // CRITICAL FOR COMPARISON:
        // In the legacy editor, even a simple resize triggered a full state save/check cycle.
        // We replicate that here. The UI will stutter because this runs 60 times/sec during drag,
        // and each time costs 15ms+ (dropping FPS to < 30).
        const newState = { ...this.state };
        const row = newState.rows.find((r) => r.id === rowId);
        if (row) {
            row.height = height;
            this.commitState(newState);
        }
    }

    duplicateSelection() {
        const newState = { ...this.state };
        if (newState.selectedElementId && newState.selectedRowId) {
            const row = newState.rows.find((r) => r.id === newState.selectedRowId);
            if (!row) return;
            const element = row.elements.find(
                (e) => e.id === newState.selectedElementId
            );
            if (!element) return;
            const newElement = {
                ...element,
                id: generateId(),
                x: element.x + 20,
                y: element.y + 20,
            };
            row.elements.push(newElement);
            newState.selectedElementId = newElement.id;
        } else if (newState.selectedRowId) {
            const index = newState.rows.findIndex(
                (r) => r.id === newState.selectedRowId
            );
            if (index === -1) return;
            const rowToCopy = newState.rows[index];
            const newRow: EditorRow = {
                ...rowToCopy,
                id: generateId(),
                elements: rowToCopy.elements.map((el) => ({
                    ...el,
                    id: generateId(),
                })),
            };
            newState.rows.splice(index + 1, 0, newRow);
            newState.selectedRowId = newRow.id;
            newState.selectedElementId = null;
        }
        this.commitState(newState);
    }

    deleteSelection() {
        const newState = { ...this.state };
        if (newState.selectedElementId && newState.selectedRowId) {
             const row = newState.rows.find((r) => r.id === newState.selectedRowId);
             if (row) {
                 row.elements = row.elements.filter(e => e.id !== newState.selectedElementId);
             }
             newState.selectedElementId = null;
        }
        this.commitState(newState);
    }

    addOrUpdateRowLayout(layout: number[]) {
        const newState = { ...this.state };
        const newRow: EditorRow = {
            id: generateId(),
            height: 150,
            layout: layout,
            elements: [],
            backgroundColor: '#ffffff',
        };
        newState.rows.push(newRow);
        newState.selectedRowId = newRow.id;
        this.commitState(newState);
    }

    addSpecialBlock(type: string) {
        const newState = { ...this.state };
         const newRow: EditorRow = {
            id: generateId(),
            height: type === 'freeform' ? 300 : 50,
            layout: [100],
            elements: [],
            backgroundColor: '#ffffff',
        };
        newState.rows.push(newRow);
        this.commitState(newState);
    }
}

export default OldLaggyStore;
