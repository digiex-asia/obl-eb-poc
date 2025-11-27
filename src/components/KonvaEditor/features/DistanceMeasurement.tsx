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

interface DistanceMeasurementProps {
    enabled: boolean;
    rows: RowData[];
    selectedElementId: string | null;
    selectedRowId: string | null;
    canvasWidth: number;
    zoom: number;
}

interface DistanceLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    distance: number;
    isHorizontal: boolean;
}

export const DistanceMeasurement: React.FC<DistanceMeasurementProps> = observer(
    ({ enabled, rows, selectedElementId, selectedRowId, canvasWidth, zoom }) => {
        if (!enabled || !selectedElementId || !selectedRowId) return null;

        const selectedRow = rows.find((r) => r.id === selectedRowId);
        if (!selectedRow) return null;

        const selectedElement = selectedRow.elements.find((e) => e.id === selectedElementId);
        if (!selectedElement) return null;

        const strokeWidth = 1 / zoom;
        const fontSize = 9 / zoom;
        const arrowSize = 4 / zoom;

        // Element bounds
        const selLeft = selectedElement.x;
        const selRight = selectedElement.x + selectedElement.width;
        const selTop = selectedRow.y + selectedElement.y;
        const selBottom = selectedRow.y + selectedElement.y + selectedElement.height;
        const selCenterX = selLeft + selectedElement.width / 2;
        const selCenterY = selTop + selectedElement.height / 2;

        const distances: DistanceLine[] = [];

        // Distance to canvas left edge
        if (selLeft > 10) {
            distances.push({
                x1: 0,
                y1: selCenterY,
                x2: selLeft,
                y2: selCenterY,
                distance: Math.round(selLeft),
                isHorizontal: true,
            });
        }

        // Distance to canvas right edge
        if (canvasWidth - selRight > 10) {
            distances.push({
                x1: selRight,
                y1: selCenterY,
                x2: canvasWidth,
                y2: selCenterY,
                distance: Math.round(canvasWidth - selRight),
                isHorizontal: true,
            });
        }

        // Distance to row top
        if (selectedElement.y > 10) {
            distances.push({
                x1: selCenterX,
                y1: selectedRow.y,
                x2: selCenterX,
                y2: selTop,
                distance: Math.round(selectedElement.y),
                isHorizontal: false,
            });
        }

        // Distance to row bottom
        const distanceToBottom = selectedRow.height - selectedElement.y - selectedElement.height;
        if (distanceToBottom > 10) {
            distances.push({
                x1: selCenterX,
                y1: selBottom,
                x2: selCenterX,
                y2: selectedRow.y + selectedRow.height,
                distance: Math.round(distanceToBottom),
                isHorizontal: false,
            });
        }

        const renderDistanceLine = (line: DistanceLine, index: number) => {
            const midX = (line.x1 + line.x2) / 2;
            const midY = (line.y1 + line.y2) / 2;
            const labelWidth = 32 / zoom;
            const labelHeight = 14 / zoom;

            return (
                <Group key={index} listening={false}>
                    {/* Main line */}
                    <Line
                        points={[line.x1, line.y1, line.x2, line.y2]}
                        stroke="#ff6b35"
                        strokeWidth={strokeWidth}
                        dash={[4 / zoom, 2 / zoom]}
                    />
                    {/* End caps */}
                    {line.isHorizontal ? (
                        <>
                            <Line
                                points={[line.x1, line.y1 - arrowSize, line.x1, line.y1 + arrowSize]}
                                stroke="#ff6b35"
                                strokeWidth={strokeWidth}
                            />
                            <Line
                                points={[line.x2, line.y2 - arrowSize, line.x2, line.y2 + arrowSize]}
                                stroke="#ff6b35"
                                strokeWidth={strokeWidth}
                            />
                        </>
                    ) : (
                        <>
                            <Line
                                points={[line.x1 - arrowSize, line.y1, line.x1 + arrowSize, line.y1]}
                                stroke="#ff6b35"
                                strokeWidth={strokeWidth}
                            />
                            <Line
                                points={[line.x2 - arrowSize, line.y2, line.x2 + arrowSize, line.y2]}
                                stroke="#ff6b35"
                                strokeWidth={strokeWidth}
                            />
                        </>
                    )}
                    {/* Label */}
                    <Rect
                        x={midX - labelWidth / 2}
                        y={midY - labelHeight / 2}
                        width={labelWidth}
                        height={labelHeight}
                        fill="rgba(255, 107, 53, 0.95)"
                        cornerRadius={2 / zoom}
                    />
                    <Text
                        x={midX - labelWidth / 2}
                        y={midY - labelHeight / 2 + 2 / zoom}
                        width={labelWidth}
                        text={`${line.distance}`}
                        fontSize={fontSize}
                        fill="white"
                        align="center"
                    />
                </Group>
            );
        };

        return <Group listening={false}>{distances.map(renderDistanceLine)}</Group>;
    }
);

