import React from 'react';
import { observer } from 'mobx-react-lite';
import { Group, Rect, Text } from 'react-konva';
import { EditorElement } from '../../../common/stores/types';

interface RowData {
    id: string;
    y: number;
    height: number;
    elements: EditorElement[];
}

interface BoundingBoxesProps {
    enabled: boolean;
    rows: RowData[];
    canvasWidth: number;
    zoom: number;
}

export const BoundingBoxes: React.FC<BoundingBoxesProps> = observer(({
    enabled,
    rows,
    canvasWidth,
    zoom,
}) => {
    if (!enabled) return null;

    const strokeWidth = 1 / zoom;
    const fontSize = 10 / zoom;
    const labelPadding = 2 / zoom;

    return (
        <Group>
            {/* Row bounding boxes */}
            {rows.map((row) => (
                <Group key={`row-bbox-${row.id}`}>
                    {/* Row outline - cyan dashed */}
                    <Rect
                        x={0}
                        y={row.y}
                        width={canvasWidth}
                        height={row.height}
                        stroke="#06b6d4"
                        strokeWidth={strokeWidth}
                        dash={[4 / zoom, 4 / zoom]}
                        listening={false}
                    />
                    {/* Row ID label */}
                    <Rect
                        x={labelPadding}
                        y={row.y + labelPadding}
                        width={60 / zoom}
                        height={14 / zoom}
                        fill="rgba(6, 182, 212, 0.8)"
                        cornerRadius={2 / zoom}
                        listening={false}
                    />
                    <Text
                        x={labelPadding + 4 / zoom}
                        y={row.y + labelPadding + 2 / zoom}
                        text={`R: ${row.id.slice(0, 6)}`}
                        fontSize={fontSize}
                        fill="white"
                        listening={false}
                    />

                    {/* Element bounding boxes */}
                    {row.elements.map((el) => (
                        <Group key={`el-bbox-${el.id}`}>
                            {/* Element outline - magenta dashed */}
                            <Rect
                                x={el.x}
                                y={row.y + el.y}
                                width={el.width}
                                height={el.height}
                                stroke="#d946ef"
                                strokeWidth={strokeWidth}
                                dash={[3 / zoom, 3 / zoom]}
                                listening={false}
                            />
                            {/* Element ID label */}
                            <Rect
                                x={el.x + labelPadding}
                                y={row.y + el.y + labelPadding}
                                width={70 / zoom}
                                height={14 / zoom}
                                fill="rgba(217, 70, 239, 0.8)"
                                cornerRadius={2 / zoom}
                                listening={false}
                            />
                            <Text
                                x={el.x + labelPadding + 4 / zoom}
                                y={row.y + el.y + labelPadding + 2 / zoom}
                                text={`${el.type}: ${el.id.slice(0, 4)}`}
                                fontSize={fontSize}
                                fill="white"
                                listening={false}
                            />
                        </Group>
                    ))}
                </Group>
            ))}
        </Group>
    );
});

