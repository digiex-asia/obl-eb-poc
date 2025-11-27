import React from 'react';
import { observer } from 'mobx-react-lite';
import { Group, Line } from 'react-konva';
import { EditorElement } from '../../../common/stores/types';

interface RowData {
    id: string;
    y: number;
    height: number;
    elements: EditorElement[];
}

interface SnapGuidesProps {
    enabled: boolean;
    rows: RowData[];
    selectedElementId: string | null;
    selectedRowId: string | null;
    canvasWidth: number;
    canvasHeight: number;
    zoom: number;
    snapThreshold?: number;
}

interface SnapLine {
    type: 'horizontal' | 'vertical';
    position: number;
    start: number;
    end: number;
}

export const SnapGuides: React.FC<SnapGuidesProps> = observer(({
    enabled,
    rows,
    selectedElementId,
    selectedRowId,
    canvasWidth,
    canvasHeight,
    zoom,
    snapThreshold = 5,
}) => {
    if (!enabled || !selectedElementId || !selectedRowId) return null;

    const selectedRow = rows.find((r) => r.id === selectedRowId);
    if (!selectedRow) return null;

    const selectedElement = selectedRow.elements.find((e) => e.id === selectedElementId);
    if (!selectedElement) return null;

    const snapLines: SnapLine[] = [];
    const strokeWidth = 1 / zoom;

    // Selected element bounds (in canvas coordinates)
    const selLeft = selectedElement.x;
    const selRight = selectedElement.x + selectedElement.width;
    const selTop = selectedRow.y + selectedElement.y;
    const selBottom = selectedRow.y + selectedElement.y + selectedElement.height;
    const selCenterX = selLeft + selectedElement.width / 2;
    const selCenterY = selTop + selectedElement.height / 2;

    // Check alignment with canvas edges
    // Left edge
    if (Math.abs(selLeft) < snapThreshold) {
        snapLines.push({ type: 'vertical', position: 0, start: 0, end: canvasHeight });
    }
    // Right edge
    if (Math.abs(selRight - canvasWidth) < snapThreshold) {
        snapLines.push({ type: 'vertical', position: canvasWidth, start: 0, end: canvasHeight });
    }
    // Center X
    if (Math.abs(selCenterX - canvasWidth / 2) < snapThreshold) {
        snapLines.push({ type: 'vertical', position: canvasWidth / 2, start: 0, end: canvasHeight });
    }

    // Check alignment with other elements
    rows.forEach((row) => {
        row.elements.forEach((el) => {
            if (el.id === selectedElementId) return;

            const elLeft = el.x;
            const elRight = el.x + el.width;
            const elTop = row.y + el.y;
            const elBottom = row.y + el.y + el.height;
            const elCenterX = elLeft + el.width / 2;
            const elCenterY = elTop + el.height / 2;

            // Vertical alignments (X positions)
            // Left to left
            if (Math.abs(selLeft - elLeft) < snapThreshold) {
                snapLines.push({
                    type: 'vertical',
                    position: elLeft,
                    start: Math.min(selTop, elTop),
                    end: Math.max(selBottom, elBottom),
                });
            }
            // Right to right
            if (Math.abs(selRight - elRight) < snapThreshold) {
                snapLines.push({
                    type: 'vertical',
                    position: elRight,
                    start: Math.min(selTop, elTop),
                    end: Math.max(selBottom, elBottom),
                });
            }
            // Left to right
            if (Math.abs(selLeft - elRight) < snapThreshold) {
                snapLines.push({
                    type: 'vertical',
                    position: elRight,
                    start: Math.min(selTop, elTop),
                    end: Math.max(selBottom, elBottom),
                });
            }
            // Right to left
            if (Math.abs(selRight - elLeft) < snapThreshold) {
                snapLines.push({
                    type: 'vertical',
                    position: elLeft,
                    start: Math.min(selTop, elTop),
                    end: Math.max(selBottom, elBottom),
                });
            }
            // Center to center X
            if (Math.abs(selCenterX - elCenterX) < snapThreshold) {
                snapLines.push({
                    type: 'vertical',
                    position: elCenterX,
                    start: Math.min(selTop, elTop),
                    end: Math.max(selBottom, elBottom),
                });
            }

            // Horizontal alignments (Y positions)
            // Top to top
            if (Math.abs(selTop - elTop) < snapThreshold) {
                snapLines.push({
                    type: 'horizontal',
                    position: elTop,
                    start: Math.min(selLeft, elLeft),
                    end: Math.max(selRight, elRight),
                });
            }
            // Bottom to bottom
            if (Math.abs(selBottom - elBottom) < snapThreshold) {
                snapLines.push({
                    type: 'horizontal',
                    position: elBottom,
                    start: Math.min(selLeft, elLeft),
                    end: Math.max(selRight, elRight),
                });
            }
            // Top to bottom
            if (Math.abs(selTop - elBottom) < snapThreshold) {
                snapLines.push({
                    type: 'horizontal',
                    position: elBottom,
                    start: Math.min(selLeft, elLeft),
                    end: Math.max(selRight, elRight),
                });
            }
            // Bottom to top
            if (Math.abs(selBottom - elTop) < snapThreshold) {
                snapLines.push({
                    type: 'horizontal',
                    position: elTop,
                    start: Math.min(selLeft, elLeft),
                    end: Math.max(selRight, elRight),
                });
            }
            // Center to center Y
            if (Math.abs(selCenterY - elCenterY) < snapThreshold) {
                snapLines.push({
                    type: 'horizontal',
                    position: elCenterY,
                    start: Math.min(selLeft, elLeft),
                    end: Math.max(selRight, elRight),
                });
            }
        });
    });

    // Deduplicate lines
    const uniqueLines = snapLines.reduce((acc, line) => {
        const key = `${line.type}-${line.position.toFixed(1)}`;
        if (!acc.has(key)) {
            acc.set(key, line);
        } else {
            // Extend existing line
            const existing = acc.get(key)!;
            existing.start = Math.min(existing.start, line.start);
            existing.end = Math.max(existing.end, line.end);
        }
        return acc;
    }, new Map<string, SnapLine>());

    return (
        <Group listening={false}>
            {Array.from(uniqueLines.values()).map((line, index) => (
                <Line
                    key={index}
                    points={
                        line.type === 'vertical'
                            ? [line.position, line.start, line.position, line.end]
                            : [line.start, line.position, line.end, line.position]
                    }
                    stroke="#ef4444"
                    strokeWidth={strokeWidth}
                    dash={[4 / zoom, 2 / zoom]}
                    listening={false}
                />
            ))}
        </Group>
    );
});

