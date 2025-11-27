import React from 'react';
import { observer } from 'mobx-react-lite';
import { Group, Line, Rect, Text } from 'react-konva';
import { EditorElement } from '../../../common/stores/types';

interface RowData {
    id: string;
    y: number;
    height: number;
    elements: EditorElement[];
}

interface DistanceIndicatorsProps {
    enabled: boolean;
    rows: RowData[];
    selectedElementId: string | null;
    selectedRowId: string | null;
    canvasWidth: number;
    zoom: number;
}

interface DistanceLabel {
    x: number;
    y: number;
    distance: number;
    direction: 'left' | 'right' | 'top' | 'bottom';
}

export const DistanceIndicators: React.FC<DistanceIndicatorsProps> = observer(({
    enabled,
    rows,
    selectedElementId,
    selectedRowId,
    canvasWidth,
    zoom,
}) => {
    if (!enabled || !selectedElementId || !selectedRowId) return null;

    const selectedRow = rows.find((r) => r.id === selectedRowId);
    if (!selectedRow) return null;

    const selectedElement = selectedRow.elements.find((e) => e.id === selectedElementId);
    if (!selectedElement) return null;

    const strokeWidth = 1 / zoom;
    const fontSize = 9 / zoom;
    const labelPadding = 2 / zoom;
    const arrowSize = 4 / zoom;

    // Selected element bounds
    const selLeft = selectedElement.x;
    const selRight = selectedElement.x + selectedElement.width;
    const selTop = selectedRow.y + selectedElement.y;
    const selBottom = selectedRow.y + selectedElement.y + selectedElement.height;
    const selCenterY = selTop + selectedElement.height / 2;
    const selCenterX = selLeft + selectedElement.width / 2;

    // Distance to canvas edges
    const distanceLeft = selLeft;
    const distanceRight = canvasWidth - selRight;
    const distanceTop = selectedElement.y; // Distance within row
    const distanceBottom = selectedRow.height - selectedElement.y - selectedElement.height;

    const renderDistanceLine = (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        distance: number,
        isHorizontal: boolean
    ) => {
        if (distance <= 0) return null;

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const labelWidth = 30 / zoom;
        const labelHeight = 14 / zoom;

        return (
            <Group listening={false}>
                {/* Main line */}
                <Line
                    points={[x1, y1, x2, y2]}
                    stroke="#f97316"
                    strokeWidth={strokeWidth}
                    listening={false}
                />
                {/* Start arrow */}
                {isHorizontal ? (
                    <>
                        <Line
                            points={[x1, y1 - arrowSize, x1, y1 + arrowSize]}
                            stroke="#f97316"
                            strokeWidth={strokeWidth}
                            listening={false}
                        />
                        <Line
                            points={[x2, y2 - arrowSize, x2, y2 + arrowSize]}
                            stroke="#f97316"
                            strokeWidth={strokeWidth}
                            listening={false}
                        />
                    </>
                ) : (
                    <>
                        <Line
                            points={[x1 - arrowSize, y1, x1 + arrowSize, y1]}
                            stroke="#f97316"
                            strokeWidth={strokeWidth}
                            listening={false}
                        />
                        <Line
                            points={[x2 - arrowSize, y2, x2 + arrowSize, y2]}
                            stroke="#f97316"
                            strokeWidth={strokeWidth}
                            listening={false}
                        />
                    </>
                )}
                {/* Label background */}
                <Rect
                    x={midX - labelWidth / 2}
                    y={midY - labelHeight / 2}
                    width={labelWidth}
                    height={labelHeight}
                    fill="rgba(249, 115, 22, 0.9)"
                    cornerRadius={2 / zoom}
                    listening={false}
                />
                {/* Label text */}
                <Text
                    x={midX - labelWidth / 2}
                    y={midY - labelHeight / 2 + labelPadding}
                    width={labelWidth}
                    height={labelHeight}
                    text={`${Math.round(distance)}`}
                    fontSize={fontSize}
                    fill="white"
                    align="center"
                    listening={false}
                />
            </Group>
        );
    };

    return (
        <Group listening={false}>
            {/* Distance to left edge */}
            {distanceLeft > 5 &&
                renderDistanceLine(0, selCenterY, selLeft, selCenterY, distanceLeft, true)}

            {/* Distance to right edge */}
            {distanceRight > 5 &&
                renderDistanceLine(selRight, selCenterY, canvasWidth, selCenterY, distanceRight, true)}

            {/* Distance to top of row */}
            {distanceTop > 5 &&
                renderDistanceLine(
                    selCenterX,
                    selectedRow.y,
                    selCenterX,
                    selTop,
                    distanceTop,
                    false
                )}

            {/* Distance to bottom of row */}
            {distanceBottom > 5 &&
                renderDistanceLine(
                    selCenterX,
                    selBottom,
                    selCenterX,
                    selectedRow.y + selectedRow.height,
                    distanceBottom,
                    false
                )}
        </Group>
    );
});
