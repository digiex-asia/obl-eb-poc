import { makeAutoObservable } from 'mobx';
import {
    EditorRow,
    EditorElement,
    ElementType,
    CANVAS_WIDTH,
    generateId,
} from './types';

class EditorStore {
    rows: EditorRow[] = [
        {
            id: 'row-1',
            height: 200,
            layout: [100],
            elements: [],
            backgroundColor: '#ffffff',
        },
    ];
    selectedRowId: string | null = 'row-1';
    selectedElementId: string | null = null;
    hoveredElementId: string | null = null;
    hoveredRowId: string | null = null;
    dragTarget: { rowId: string; colIndex: number } | null = null;
    reorderTargetIndex: number | null = null;
    zoom: number = 1;

    // Element mapping caches for O(1) lookups instead of O(n) filters
    _elementsByRowId = new Map<string, EditorElement[]>();
    _elementsByColumnIndex = new Map<string, EditorElement[]>();
    _elementsByRowAndColumn = new Map<string, EditorElement[]>();
    _elementsVersion = 0;

    constructor() {
        makeAutoObservable(this);
        this._rebuildElementMappings();
    }

    // Helper to determine which column an element belongs to based on its x position
    private _getColumnIndexForElement(
        element: EditorElement,
        row: EditorRow
    ): number {
        const elementCenterX = element.x + element.width / 2;
        let colX = 0;
        for (let i = 0; i < row.layout.length; i++) {
            const colWidth = (CANVAS_WIDTH * row.layout[i]) / 100;
            if (elementCenterX >= colX && elementCenterX < colX + colWidth) {
                return i;
            }
            colX += colWidth;
        }
        // Default to first column if not found
        return 0;
    }

    // Rebuild element mappings for O(1) lookups
    private _rebuildElementMappings() {
        this._elementsByRowId.clear();
        this._elementsByColumnIndex.clear();
        this._elementsByRowAndColumn.clear();
        this._elementsVersion++;

        // Build maps for O(1) lookups
        this.rows.forEach((row) => {
            row.elements.forEach((element) => {
                // Map by row ID
                if (!this._elementsByRowId.has(row.id)) {
                    this._elementsByRowId.set(row.id, []);
                }
                this._elementsByRowId.get(row.id)!.push(element);

                // Map by column index
                const colIndex = this._getColumnIndexForElement(element, row);
                const colKey = `${row.id}-${colIndex}`;
                if (!this._elementsByColumnIndex.has(colKey)) {
                    this._elementsByColumnIndex.set(colKey, []);
                }
                this._elementsByColumnIndex.get(colKey)!.push(element);

                // Map by row and column combination
                const rowColKey = `${row.id}-${colIndex}`;
                if (!this._elementsByRowAndColumn.has(rowColKey)) {
                    this._elementsByRowAndColumn.set(rowColKey, []);
                }
                this._elementsByRowAndColumn.get(rowColKey)!.push(element);
            });
        });
    }

    // Get elements for a specific row and column (most common use case)
    getElementsByRowAndColumn(rowId: string, colIndex: number): EditorElement[] {
        if (!rowId || colIndex < 0) return [];
        const key = `${rowId}-${colIndex}`;
        return this._elementsByRowAndColumn.get(key) || [];
    }

    // Get elements for a specific row
    getElementsByRowId(rowId: string): EditorElement[] {
        if (!rowId) return [];
        return this._elementsByRowId.get(rowId) || [];
    }

    // Get elements for a specific column in a row
    getElementsByColumnIndex(rowId: string, colIndex: number): EditorElement[] {
        if (!rowId || colIndex < 0) return [];
        const key = `${rowId}-${colIndex}`;
        return this._elementsByColumnIndex.get(key) || [];
    }

    // Calculate column bounding box for a specific column in a row
    getColumnBounds(
        rowId: string,
        colIndex: number,
        rowY: number = 0
    ): { x: number; y: number; width: number; height: number } | null {
        const row = this.rows.find((r) => r.id === rowId);
        if (!row || colIndex < 0 || colIndex >= row.layout.length) {
            return null;
        }

        let colX = 0;
        for (let i = 0; i < colIndex; i++) {
            colX += (CANVAS_WIDTH * row.layout[i]) / 100;
        }
        const colWidth = (CANVAS_WIDTH * row.layout[colIndex]) / 100;

        return {
            x: colX,
            y: rowY,
            width: colWidth,
            height: row.height,
        };
    }

    // Get all column bounds for a row
    getColumnBoundsForRow(
        rowId: string,
        rowY: number = 0
    ): Array<{ x: number; y: number; width: number; height: number }> {
        const row = this.rows.find((r) => r.id === rowId);
        if (!row) return [];

        const bounds: Array<{
            x: number;
            y: number;
            width: number;
            height: number;
        }> = [];
        let colX = 0;

        row.layout.forEach((pct) => {
            const colWidth = (CANVAS_WIDTH * pct) / 100;
            bounds.push({
                x: colX,
                y: rowY,
                width: colWidth,
                height: row.height,
            });
            colX += colWidth;
        });

        return bounds;
    }

    // Constrain element to column boundaries (similar to inBoundedEl from emailPage.js)
    constrainElementToColumn(
        element: EditorElement,
        rowId: string,
        colIndex: number,
        rowY: number = 0
    ): Partial<EditorElement> {
        const bounds = this.getColumnBounds(rowId, colIndex, rowY);
        if (!bounds) return {};

        const baseX = bounds.x;
        const baseY = bounds.y;
        let newX = element.x;
        let newY = element.y;
        let newWidth = element.width;
        let newHeight = element.height;

        // Resize element if it's too large for the column (maintaining aspect ratio)
        if (element.width > bounds.width) {
            const ratio = bounds.width / element.width;
            newWidth = bounds.width;
            newHeight = element.height * ratio;
        } else if (element.height > bounds.height) {
            const ratio = bounds.height / element.height;
            newHeight = bounds.height;
            newWidth = element.width * ratio;
        }

        // Center the element horizontally within the column if it fits
        if (newWidth <= bounds.width) {
            newX = baseX + (bounds.width - newWidth) / 2;
        } else {
            newX = baseX;
        }

        // Center the element vertically within the column if it fits
        if (newHeight <= bounds.height) {
            newY = baseY + (bounds.height - newHeight) / 2;
        } else {
            newY = baseY;
        }

        // Clamp element position to stay within column boundaries
        if (newX < baseX) {
            newX = baseX;
        }
        if (newX + newWidth > baseX + bounds.width) {
            newX = baseX + bounds.width - newWidth;
        }
        if (newY < baseY) {
            newY = baseY;
        }
        if (newY + newHeight > baseY + bounds.height) {
            newY = baseY + bounds.height - newHeight;
        }

        return {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
        };
    }

    setZoom(zoom: number) {
        this.zoom = Math.max(0.1, Math.min(5, zoom));
    }

    setHoveredElement(id: string | null) {
        if (this.hoveredElementId !== id) {
            this.hoveredElementId = id;
        }
    }

    setHoveredRow(id: string | null) {
        if (this.hoveredRowId !== id) {
            this.hoveredRowId = id;
        }
    }

    setDragTarget(target: { rowId: string; colIndex: number } | null) {
        if (
            this.dragTarget?.rowId !== target?.rowId ||
            this.dragTarget?.colIndex !== target?.colIndex
        ) {
            this.dragTarget = target;
        }
    }

    setReorderTarget(index: number | null) {
        this.reorderTargetIndex = index;
    }

    reorderRow(fromIndex: number, toIndex: number) {
        if (
            fromIndex === toIndex ||
            fromIndex < 0 ||
            fromIndex >= this.rows.length
        ) {
            return;
        }

        const newRows = [...this.rows];
        const [movedRow] = newRows.splice(fromIndex, 1);
        const insertIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
        newRows.splice(insertIndex, 0, movedRow);
        this.rows = newRows;
        this.reorderTargetIndex = null;
    }

    setSelectionColor(color: string) {
        if (this.selectedElementId && this.selectedRowId) {
            const row = this.rows.find((r) => r.id === this.selectedRowId);
            if (row) {
                const element = row.elements.find(
                    (e) => e.id === this.selectedElementId
                );
                if (element) {
                    element.fill = color;
                }
            }
        } else if (this.selectedRowId) {
            const row = this.rows.find((r) => r.id === this.selectedRowId);
            if (row) {
                row.backgroundColor = color;
            }
        }
    }

    addSpecialBlock(blockType: 'freeform' | 'divider' | 'spacer') {
        const newRowId = generateId();
        const newRow: EditorRow = {
            id: newRowId,
            height: blockType === 'freeform' ? 300 : 100,
            layout: [100],
            elements: [],
            backgroundColor: '#ffffff',
        };

        if (blockType === 'divider') {
            newRow.elements = [{
                id: generateId(),
                type: 'divider',
                x: 20,
                y: 45,
                width: CANVAS_WIDTH - 40,
                height: 10,
                fill: '#d1d5db',
            }];
            newRow.height = 100;
        } else if (blockType === 'spacer') {
            newRow.elements = [{
                id: generateId(),
                type: 'spacer',
                x: 0,
                y: 0,
                width: CANVAS_WIDTH,
                height: 50,
                fill: 'transparent',
            }];
            newRow.height = 50;
        }

        let insertIndex = this.rows.length;
        if (this.selectedRowId) {
            const selectedIndex = this.rows.findIndex(
                (r) => r.id === this.selectedRowId
            );
            if (selectedIndex !== -1) insertIndex = selectedIndex + 1;
        }

        const newRows = [...this.rows];
        newRows.splice(insertIndex, 0, newRow);
        this.rows = newRows;
        this.selectedRowId = newRowId;
        this.selectedElementId =
            newRow.elements.length > 0 ? newRow.elements[0].id : null;
        this._rebuildElementMappings();
    }

    addOrUpdateRowLayout(
        layout: number[],
        index?: number,
        forceAdd?: boolean,
        minHeight?: number
    ) {
        if (!forceAdd && this.selectedRowId) {
            const row = this.rows.find((r) => r.id === this.selectedRowId);
            if (row) {
                row.layout = layout;
            }
            return;
        }

        const newRow: EditorRow = {
            id: generateId(),
            height: minHeight || 150,
            layout: layout,
            elements: [],
            backgroundColor: '#ffffff',
        };

        let newRows = [...this.rows];
        let insertIndex = this.rows.length;

        if (typeof index === 'number') {
            insertIndex = index;
        } else if (this.selectedRowId && !forceAdd) {
            const selectedIndex = this.rows.findIndex(
                (r) => r.id === this.selectedRowId
            );
            if (selectedIndex !== -1) insertIndex = selectedIndex + 1;
        }

        newRows.splice(insertIndex, 0, newRow);
        this.rows = newRows;
        this.selectedRowId = newRow.id;
        this.selectedElementId = null;
        this._rebuildElementMappings();
    }

    duplicateSelection() {
        if (this.selectedElementId && this.selectedRowId) {
            const rowIndex = this.rows.findIndex(
                (r) => r.id === this.selectedRowId
            );
            if (rowIndex === -1) return;
            const row = this.rows[rowIndex];
            const element = row.elements.find(
                (e) => e.id === this.selectedElementId
            );
            if (!element) return;
            const newElement = {
                ...element,
                id: generateId(),
                x: element.x + 20,
                y: element.y + 20,
            };
            row.elements = [...row.elements, newElement];
            this.selectedElementId = newElement.id;
            this._rebuildElementMappings();
        } else if (this.selectedRowId) {
            const index = this.rows.findIndex(
                (r) => r.id === this.selectedRowId
            );
            if (index === -1) return;
            const rowToCopy = this.rows[index];
            const newRow: EditorRow = {
                ...rowToCopy,
                id: generateId(),
                elements: rowToCopy.elements.map((el) => ({
                    ...el,
                    id: generateId(),
                })),
            };
            const newRows = [...this.rows];
            newRows.splice(index + 1, 0, newRow);
            this.rows = newRows;
            this.selectedRowId = newRow.id;
            this.selectedElementId = null;
            this._rebuildElementMappings();
        }
    }

    duplicateRow(rowId: string) {
        const index = this.rows.findIndex((r) => r.id === rowId);
        if (index === -1) return;
        const rowToCopy = this.rows[index];
        const newRow: EditorRow = {
            ...rowToCopy,
            id: generateId(),
            elements: rowToCopy.elements.map((el) => ({
                ...el,
                id: generateId(),
            })),
        };
        const newRows = [...this.rows];
        newRows.splice(index + 1, 0, newRow);
        this.rows = newRows;
        this.selectedRowId = newRow.id;
        this.selectedElementId = null;
        this._rebuildElementMappings();
    }

    resizeColumn(rowId: string, dividerIndex: number, deltaPct: number) {
        const row = this.rows.find((r) => r.id === rowId);
        if (!row) return;
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
        row.layout = newLayout;
        this._rebuildElementMappings();
    }

    selectRow(id: string | null) {
        this.selectedRowId = id;
        this.selectedElementId = null;
    }

    selectElement(rowId: string, elId: string) {
        this.selectedRowId = rowId;
        this.selectedElementId = elId;
    }

    addElement(
        rowId: string,
        elementType: ElementType,
        src?: string,
        x?: number,
        y?: number,
        text?: string
    ) {
        const row = this.rows.find((r) => r.id === rowId);
        if (!row) return;

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
        if (elementType === 'text') {
            finalW = 120;
            finalH = 40;
        }
        if (elementType === 'button') {
            finalW = 100;
            finalH = 40;
        }
        if (elementType === 'divider') {
            finalW = 200;
            finalH = 10;
        }
        if (elementType === 'spacer') {
            finalW = 100;
            finalH = 50;
        }

        if (typeof x === 'number' && typeof y === 'number') {
            const targetCol =
                colRanges.find((c) => x >= c.start && x <= c.end) ||
                colRanges[0];
            if (elementType === 'divider') finalW = targetCol.width * 0.9;
            else if (
                elementType !== 'text' &&
                elementType !== 'button' &&
                elementType !== 'spacer'
            ) {
                finalW = Math.min(targetCol.width * 0.8, 150);
                finalH =
                    elementType === 'image' ? finalW : finalW;
            }
            finalX = x - finalW / 2;
            finalY = y - finalH / 2;
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
                targetColIndex = row.elements.length % colRanges.length;
            const targetCol = colRanges[targetColIndex];
            if (elementType === 'divider') finalW = targetCol.width * 0.9;
            else if (
                elementType !== 'text' &&
                elementType !== 'button' &&
                elementType !== 'spacer'
            ) {
                finalW = Math.min(targetCol.width * 0.8, 150);
                finalH = elementType === 'image' ? finalW : finalW;
            }
            finalX = targetCol.center - finalW / 2;
            finalY = 20;
        }

        const newEl: EditorElement = {
            id: generateId(),
            type: elementType,
            x: finalX,
            y: finalY,
            width: finalW,
            height: finalH,
            fill:
                elementType === 'image' ? undefined : '#94a3b8',
            src: src,
            text: text,
        };

        if (elementType === 'rect') newEl.fill = '#6366f1';
        if (elementType === 'circle') newEl.fill = '#10b981';
        if (elementType === 'triangle') newEl.fill = '#f59e0b';
        if (elementType === 'star') newEl.fill = '#ec4899';
        if (elementType === 'polygon') newEl.fill = '#3b82f6';
        if (elementType === 'button') newEl.fill = '#3b82f6';
        if (elementType === 'text') newEl.fill = 'transparent';
        if (elementType === 'divider') newEl.fill = '#d1d5db';
        if (elementType === 'spacer') newEl.fill = 'transparent';

        row.elements = [...row.elements, newEl];

        // Apply constraints to ensure element fits within its column
        const colIndex = this._getColumnIndexForElement(newEl, row);
        const constrained = this.constrainElementToColumn(
            newEl,
            rowId,
            colIndex,
            0
        );
        Object.assign(newEl, constrained);

        this._rebuildElementMappings();
    }

    updateElement(
        rowId: string,
        elId: string,
        attrs: Partial<EditorElement>
    ) {
        const row = this.rows.find((r) => r.id === rowId);
        if (!row) return;
        const element = row.elements.find((e) => e.id === elId);
        if (!element) return;

        // Apply updates
        Object.assign(element, attrs);

        // Determine which column this element belongs to and apply constraints
        const colIndex = this._getColumnIndexForElement(element, row);
        const constrained = this.constrainElementToColumn(
            element,
            rowId,
            colIndex,
            0
        );
        Object.assign(element, constrained);

        const maxBottom = row.elements.reduce(
            (max, el) => Math.max(max, el.y + el.height),
            0
        );
        row.height = Math.max(150, maxBottom + 40);
        this._rebuildElementMappings();
    }

    moveElement(
        sourceRowId: string,
        targetRowId: string,
        elementId: string,
        newX: number,
        newY: number
    ) {
        const sourceRow = this.rows.find((r) => r.id === sourceRowId);
        if (!sourceRow) return;
        const element = sourceRow.elements.find((e) => e.id === elementId);
        if (!element) return;

        const movedElement = { ...element, x: newX, y: newY };

        sourceRow.elements = sourceRow.elements.filter(
            (e) => e.id !== elementId
        );

        const targetRow = this.rows.find((r) => r.id === targetRowId);
        if (targetRow) {
            const potentialBottom = newY + element.height;
            targetRow.height = Math.max(
                targetRow.height,
                potentialBottom + 40,
                150
            );
            targetRow.elements = [...targetRow.elements, movedElement];
        }

        this.selectedRowId = targetRowId;
        this.selectedElementId = elementId;
        this._rebuildElementMappings();
    }

    updateRowHeight(rowId: string, height: number) {
        const row = this.rows.find((r) => r.id === rowId);
        if (row) {
            row.height = Math.max(50, height);
        }
    }

    deleteSelection() {
        if (this.selectedElementId && this.selectedRowId) {
            const row = this.rows.find((r) => r.id === this.selectedRowId);
            if (row) {
            row.elements = row.elements.filter(
                (e) => e.id !== this.selectedElementId
            );
            this._rebuildElementMappings();
            }
            this.selectedElementId = null;
        } else if (this.selectedRowId) {
            const index = this.rows.findIndex(
                (r) => r.id === this.selectedRowId
            );
            const newRows = this.rows.filter(
                (r) => r.id !== this.selectedRowId
            );
            let newSelectedId = null;
            if (newRows.length > 0) {
                const newIndex = Math.max(0, index - 1);
                newSelectedId = newRows[newIndex]
                    ? newRows[newIndex].id
                    : newRows[0].id;
            }
            this.rows = newRows;
            this.selectedRowId = newSelectedId;
            this.selectedElementId = null;
            this._rebuildElementMappings();
        }
    }
}

export default EditorStore;

