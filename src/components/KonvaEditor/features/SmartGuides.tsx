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

export interface SnapResult {
    x: number | null;
    y: number | null;
    guides: SnapGuide[];
}

export interface SnapGuide {
    type: 'horizontal' | 'vertical';
    position: number;
    start: number;
    end: number;
    label?: string;
}

interface SmartGuidesProps {
    enabled: boolean;
    guides: SnapGuide[];
    zoom: number;
}

// Calculate snap positions and guides for an element being dragged
export const calculateSnap = (
    element: { x: number; y: number; width: number; height: number },
    rowY: number,
    rows: RowData[],
    currentRowId: string,
    currentElementId: string,
    canvasWidth: number,
    snapThreshold: number = 5
): SnapResult => {
    const guides: SnapGuide[] = [];
    let snapX: number | null = null;
    let snapY: number | null = null;

    // Element bounds in canvas coordinates
    const elLeft = element.x;
    const elRight = element.x + element.width;
    const elTop = rowY + element.y;
    const elBottom = rowY + element.y + element.height;
    const elCenterX = elLeft + element.width / 2;
    const elCenterY = elTop + element.height / 2;

    // Snap to canvas edges and guidelines
    // Left edge
    if (Math.abs(elLeft) < snapThreshold) {
        snapX = 0;
        guides.push({ type: 'vertical', position: 0, start: elTop - 20, end: elBottom + 20 });
    }
    // Right edge
    if (Math.abs(elRight - canvasWidth) < snapThreshold) {
        snapX = canvasWidth - element.width;
        guides.push({ type: 'vertical', position: canvasWidth, start: elTop - 20, end: elBottom + 20 });
    }
    // Center X of canvas (1/2)
    if (Math.abs(elCenterX - canvasWidth / 2) < snapThreshold) {
        snapX = canvasWidth / 2 - element.width / 2;
        guides.push({
            type: 'vertical',
            position: canvasWidth / 2,
            start: elTop - 20,
            end: elBottom + 20,
            label: '1/2',
        });
    }
    // 1/3 guideline
    const oneThird = canvasWidth / 3;
    if (Math.abs(elCenterX - oneThird) < snapThreshold) {
        snapX = oneThird - element.width / 2;
        guides.push({
            type: 'vertical',
            position: oneThird,
            start: elTop - 20,
            end: elBottom + 20,
            label: '1/3',
        });
    }
    if (Math.abs(elLeft - oneThird) < snapThreshold) {
        snapX = oneThird;
        guides.push({ type: 'vertical', position: oneThird, start: elTop - 20, end: elBottom + 20 });
    }
    if (Math.abs(elRight - oneThird) < snapThreshold) {
        snapX = oneThird - element.width;
        guides.push({ type: 'vertical', position: oneThird, start: elTop - 20, end: elBottom + 20 });
    }
    // 2/3 guideline
    const twoThirds = (canvasWidth * 2) / 3;
    if (Math.abs(elCenterX - twoThirds) < snapThreshold) {
        snapX = twoThirds - element.width / 2;
        guides.push({
            type: 'vertical',
            position: twoThirds,
            start: elTop - 20,
            end: elBottom + 20,
            label: '2/3',
        });
    }
    if (Math.abs(elLeft - twoThirds) < snapThreshold) {
        snapX = twoThirds;
        guides.push({ type: 'vertical', position: twoThirds, start: elTop - 20, end: elBottom + 20 });
    }
    if (Math.abs(elRight - twoThirds) < snapThreshold) {
        snapX = twoThirds - element.width;
        guides.push({ type: 'vertical', position: twoThirds, start: elTop - 20, end: elBottom + 20 });
    }

    // Snap to row boundaries
    rows.forEach((row) => {
        const rowTop = row.y;
        const rowBottom = row.y + row.height;
        const rowCenterY = row.y + row.height / 2;

        // Snap to row top
        if (Math.abs(elTop - rowTop) < snapThreshold && snapY === null) {
            snapY = rowTop - rowY;
            guides.push({
                type: 'horizontal',
                position: rowTop,
                start: 0,
                end: canvasWidth,
                label: 'row',
            });
        }
        // Snap to row bottom
        if (Math.abs(elBottom - rowBottom) < snapThreshold && snapY === null) {
            snapY = rowBottom - rowY - element.height;
            guides.push({
                type: 'horizontal',
                position: rowBottom,
                start: 0,
                end: canvasWidth,
                label: 'row',
            });
        }
        // Snap to row center
        if (Math.abs(elCenterY - rowCenterY) < snapThreshold && snapY === null) {
            snapY = rowCenterY - rowY - element.height / 2;
            guides.push({
                type: 'horizontal',
                position: rowCenterY,
                start: 0,
                end: canvasWidth,
                label: '1/2',
            });
        }
    });

    // Snap to other elements
    rows.forEach((row) => {
        row.elements.forEach((other) => {
            if (other.id === currentElementId) return;

            const otherLeft = other.x;
            const otherRight = other.x + other.width;
            const otherTop = row.y + other.y;
            const otherBottom = row.y + other.y + other.height;
            const otherCenterX = otherLeft + other.width / 2;
            const otherCenterY = otherTop + other.height / 2;

            // Vertical snaps (X positions)
            // Left to left
            if (Math.abs(elLeft - otherLeft) < snapThreshold && snapX === null) {
                snapX = otherLeft;
                guides.push({
                    type: 'vertical',
                    position: otherLeft,
                    start: Math.min(elTop, otherTop) - 10,
                    end: Math.max(elBottom, otherBottom) + 10,
                });
            }
            // Right to right
            if (Math.abs(elRight - otherRight) < snapThreshold && snapX === null) {
                snapX = otherRight - element.width;
                guides.push({
                    type: 'vertical',
                    position: otherRight,
                    start: Math.min(elTop, otherTop) - 10,
                    end: Math.max(elBottom, otherBottom) + 10,
                });
            }
            // Left to right (spacing)
            if (Math.abs(elLeft - otherRight) < snapThreshold && snapX === null) {
                snapX = otherRight;
                guides.push({
                    type: 'vertical',
                    position: otherRight,
                    start: Math.min(elTop, otherTop) - 10,
                    end: Math.max(elBottom, otherBottom) + 10,
                });
            }
            // Right to left (spacing)
            if (Math.abs(elRight - otherLeft) < snapThreshold && snapX === null) {
                snapX = otherLeft - element.width;
                guides.push({
                    type: 'vertical',
                    position: otherLeft,
                    start: Math.min(elTop, otherTop) - 10,
                    end: Math.max(elBottom, otherBottom) + 10,
                });
            }
            // Center to center X
            if (Math.abs(elCenterX - otherCenterX) < snapThreshold && snapX === null) {
                snapX = otherCenterX - element.width / 2;
                guides.push({
                    type: 'vertical',
                    position: otherCenterX,
                    start: Math.min(elTop, otherTop) - 10,
                    end: Math.max(elBottom, otherBottom) + 10,
                    label: 'center',
                });
            }

            // Horizontal snaps (Y positions)
            // Top to top
            if (Math.abs(elTop - otherTop) < snapThreshold && snapY === null) {
                snapY = otherTop - rowY;
                guides.push({
                    type: 'horizontal',
                    position: otherTop,
                    start: Math.min(elLeft, otherLeft) - 10,
                    end: Math.max(elRight, otherRight) + 10,
                });
            }
            // Bottom to bottom
            if (Math.abs(elBottom - otherBottom) < snapThreshold && snapY === null) {
                snapY = otherBottom - rowY - element.height;
                guides.push({
                    type: 'horizontal',
                    position: otherBottom,
                    start: Math.min(elLeft, otherLeft) - 10,
                    end: Math.max(elRight, otherRight) + 10,
                });
            }
            // Top to bottom
            if (Math.abs(elTop - otherBottom) < snapThreshold && snapY === null) {
                snapY = otherBottom - rowY;
                guides.push({
                    type: 'horizontal',
                    position: otherBottom,
                    start: Math.min(elLeft, otherLeft) - 10,
                    end: Math.max(elRight, otherRight) + 10,
                });
            }
            // Bottom to top
            if (Math.abs(elBottom - otherTop) < snapThreshold && snapY === null) {
                snapY = otherTop - rowY - element.height;
                guides.push({
                    type: 'horizontal',
                    position: otherTop,
                    start: Math.min(elLeft, otherLeft) - 10,
                    end: Math.max(elRight, otherRight) + 10,
                });
            }
            // Center to center Y
            if (Math.abs(elCenterY - otherCenterY) < snapThreshold && snapY === null) {
                snapY = otherCenterY - rowY - element.height / 2;
                guides.push({
                    type: 'horizontal',
                    position: otherCenterY,
                    start: Math.min(elLeft, otherLeft) - 10,
                    end: Math.max(elRight, otherRight) + 10,
                    label: 'center',
                });
            }
        });
    });

    return { x: snapX, y: snapY, guides };
};

// Smart Guides visual component
export const SmartGuides: React.FC<SmartGuidesProps> = observer(({ enabled, guides, zoom }) => {
    if (!enabled || guides.length === 0) return null;

    const strokeWidth = 1 / zoom;
    const fontSize = 9 / zoom;

    return (
        <Group listening={false}>
            {guides.map((guide, index) => (
                <Group key={index}>
                    <Line
                        points={
                            guide.type === 'vertical'
                                ? [guide.position, guide.start, guide.position, guide.end]
                                : [guide.start, guide.position, guide.end, guide.position]
                        }
                        stroke="#ff3366"
                        strokeWidth={strokeWidth}
                        dash={[6 / zoom, 3 / zoom]}
                        listening={false}
                    />
                    {guide.label && (
                        <>
                            <Rect
                                x={
                                    guide.type === 'vertical'
                                        ? guide.position - 20 / zoom
                                        : (guide.start + guide.end) / 2 - 20 / zoom
                                }
                                y={
                                    guide.type === 'vertical'
                                        ? (guide.start + guide.end) / 2 - 8 / zoom
                                        : guide.position - 8 / zoom
                                }
                                width={40 / zoom}
                                height={14 / zoom}
                                fill="rgba(255, 51, 102, 0.9)"
                                cornerRadius={2 / zoom}
                                listening={false}
                            />
                            <Text
                                x={
                                    guide.type === 'vertical'
                                        ? guide.position - 20 / zoom
                                        : (guide.start + guide.end) / 2 - 20 / zoom
                                }
                                y={
                                    guide.type === 'vertical'
                                        ? (guide.start + guide.end) / 2 - 6 / zoom
                                        : guide.position - 6 / zoom
                                }
                                width={40 / zoom}
                                text={guide.label}
                                fontSize={fontSize}
                                fill="white"
                                align="center"
                                listening={false}
                            />
                        </>
                    )}
                </Group>
            ))}
        </Group>
    );
});

