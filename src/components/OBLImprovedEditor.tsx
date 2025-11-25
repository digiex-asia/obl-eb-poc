import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Stage, Layer, Rect, Circle, Text, Image as KonvaImage, Line, Group } from 'react-konva';
import EditorStore from '../stores/EditorStore';
import {
    CANVAS_WIDTH,
    PAGE_BG_COLOR,
    PRIMARY_COLOR,
    SELECTION_COLOR,
    ROW_HOVER_COLOR,
    DROP_TARGET_COLOR,
    COLUMN_GUIDE_COLOR,
    HANDLE_SIZE,
    ADD_BUTTON_OFFSET,
} from '../stores/types';
import { Sidebar } from './shared/Sidebar';
import { TopBar } from './shared/TopBar';
import { ZoomControls } from './shared/ZoomControls';
import { ColorPicker } from './shared/ColorPicker';
import { Copy, Trash2, Palette } from 'lucide-react';
import { EditorElement } from '../stores/types';

const store = new EditorStore();

// Helper function to parse gradient strings and return Konva gradient props
const getFillProps = (
    color: string | undefined,
    width: number
): { fill?: string; fillLinearGradientStartPoint?: { x: number; y: number }; fillLinearGradientEndPoint?: { x: number; y: number }; fillLinearGradientColorStops?: (number | string)[] } => {
    if (!color) return { fill: 'transparent' };
    if (color.startsWith('linear-gradient')) {
        const colors = color.match(/#[a-fA-F0-9]{6}/g);
        if (colors && colors.length >= 2) {
            return {
                fillLinearGradientStartPoint: { x: 0, y: 0 },
                fillLinearGradientEndPoint: { x: width, y: 0 },
                fillLinearGradientColorStops: [0, colors[0], 1, colors[1]],
            };
        }
    }
    return { fill: color };
};

// Row resize handle component for smooth resizing
const RowResizeHandle = observer(({
    row,
    store,
    onHeightChange,
    stageCenterX,
}: {
    row: typeof store.rows[0] & { y: number };
    store: EditorStore;
    onHeightChange: (height: number) => void;
    stageCenterX: number;
}) => {
    const initialHeightRef = useRef<number>(row.height);
    const pillHValue = 6 / store.zoom;
    // Group origin should be at row.y + row.height - pillHValue/2 (matching Canvas positioning)
    const initialYRef = useRef<number>(row.y + row.height - pillHValue / 2);
    const [localHeight, setLocalHeight] = useState<number | null>(null);
    const isDraggingRef = useRef(false);

    // Update refs when row changes (but not during drag)
    useEffect(() => {
        if (!isDraggingRef.current) {
            initialHeightRef.current = row.height;
            initialYRef.current = row.y + row.height - pillHValue / 2;
            setLocalHeight(null);
        }
    }, [row.height, row.y, pillHValue]);

    const handleDragStart = (e: any) => {
        isDraggingRef.current = true;
        initialHeightRef.current = row.height;
        // Capture the actual Group Y position at drag start (in logical coordinates)
        initialYRef.current = e.target.y();
        setLocalHeight(row.height);
    };

    const handleDragMove = (e: any) => {
        // Calculate delta from initial position (both in logical coordinates)
        const deltaY = e.target.y() - initialYRef.current;
        const newHeight = Math.max(50, initialHeightRef.current + deltaY);
        setLocalHeight(newHeight);
        onHeightChange(newHeight);
    };

    const handleDragEnd = () => {
        isDraggingRef.current = false;
        if (localHeight !== null) {
            store.updateRowHeight(row.id, localHeight);
            setLocalHeight(null);
            // Clear temp height after a brief delay to allow store update
            setTimeout(() => {
                onHeightChange(0); // Signal to clear
            }, 0);
        }
    };

    const displayHeight = localHeight !== null ? localHeight : row.height;
    const pillW = 30 / store.zoom;
    // In Canvas: pill is drawn at row.height - pillH/2 (top-left corner)
    // So the center is at row.height. Position Group so Rect center aligns with bottom border
    // Group y should be at row.y + displayHeight - pillHValue/2 (so Rect top is at border - pillHValue/2)
    // Then Rect at y=0 will have its top at border - pillHValue/2, center at border
    const displayY = row.y + displayHeight - pillHValue / 2;

    return (
        <Group
            x={stageCenterX}
            y={displayY}
            draggable
            dragBoundFunc={(pos) => {
                // Calculate delta (both pos.y and initialYRef are in logical coordinates)
                const deltaY = pos.y - initialYRef.current;
                const newHeight = Math.max(50, initialHeightRef.current + deltaY);
                // Position Group so Rect center aligns with bottom border, centered on stage
                // stageCenterX is recalculated on each render based on viewport and zoom
                return { x: stageCenterX, y: row.y + newHeight - pillHValue / 2 };
            }}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            <Rect
                x={-pillW / 2}
                y={0}
                width={pillW}
                height={pillHValue}
                fill="white"
                stroke={PRIMARY_COLOR}
                strokeWidth={1 / store.zoom}
                cornerRadius={3 / store.zoom}
            />
        </Group>
    );
});

// Column resize handle component
const ColumnResizeHandle = observer(({
    row,
    dividerIndex,
    dividerX,
    store,
    onResizeStart,
    onResizeEnd,
}: {
    row: typeof store.rows[0] & { y: number; height: number };
    dividerIndex: number;
    dividerX: number;
    store: EditorStore;
    onResizeStart: () => void;
    onResizeEnd: () => void;
}) => {
    const handleW = 6 / store.zoom;
    const handleH = 16 / store.zoom;
    const initialXRef = useRef<number>(dividerX);
    const initialLayoutRef = useRef<number[]>([]);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        if (!isDraggingRef.current) {
            initialXRef.current = dividerX;
        }
    }, [dividerX]);

    const handleDragStart = () => {
        isDraggingRef.current = true;
        initialXRef.current = dividerX;
        initialLayoutRef.current = [...row.layout];
        onResizeStart();
    };

    const handleDragMove = (e: any) => {
        const currentX = e.target.x();
        const deltaX = (currentX - initialXRef.current) / store.zoom;
        const deltaPct = (deltaX / CANVAS_WIDTH) * 100;

        if (Math.abs(deltaPct) > 0.01) {
            // Store handles constraints internally
            store.resizeColumn(row.id, dividerIndex, deltaPct);
            // Update initial position for next calculation (like Canvas does with startX)
            initialXRef.current = currentX;
        }
    };

    const handleDragEnd = () => {
        isDraggingRef.current = false;
        onResizeEnd();
    };

    return (
        <Group
            x={dividerX}
            y={row.y + row.height / 2}
            draggable
            dragBoundFunc={(pos) => {
                // Constrain to horizontal movement only, centered vertically
                return { x: pos.x, y: row.y + row.height / 2 };
            }}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            <Rect
                x={-handleW / 2}
                y={-handleH / 2}
                width={handleW}
                height={handleH}
                fill="white"
                stroke={COLUMN_GUIDE_COLOR}
                strokeWidth={1 / store.zoom}
                cornerRadius={3 / store.zoom}
            />
        </Group>
    );
});

// Element resize handle component
const ElementResizeHandle = observer(({
    el,
    rowY,
    rowId,
    handle,
    store,
}: {
    el: EditorElement;
    rowY: number;
    rowId: string;
    handle: 'tl' | 'tr' | 'bl' | 'br';
    store: EditorStore;
}) => {
    const initialXRef = useRef<number>(el.x);
    const initialYRef = useRef<number>(el.y);
    const initialWRef = useRef<number>(el.width);
    const initialHRef = useRef<number>(el.height);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        if (!isDraggingRef.current) {
            initialXRef.current = el.x;
            initialYRef.current = el.y;
            initialWRef.current = el.width;
            initialHRef.current = el.height;
        }
    }, [el.x, el.y, el.width, el.height]);

    const getHandlePosition = () => {
        switch (handle) {
            case 'tl':
                return { x: el.x, y: rowY + el.y };
            case 'tr':
                return { x: el.x + el.width, y: rowY + el.y };
            case 'bl':
                return { x: el.x, y: rowY + el.y + el.height };
            case 'br':
                return { x: el.x + el.width, y: rowY + el.y + el.height };
        }
    };

    const handleDragStart = () => {
        isDraggingRef.current = true;
        initialXRef.current = el.x;
        initialYRef.current = el.y;
        initialWRef.current = el.width;
        initialHRef.current = el.height;
    };

    const handleDragMove = (e: any) => {
        const handlePos = getHandlePosition();
        const deltaX = (e.target.x() - handlePos.x) / store.zoom;
        const deltaY = (e.target.y() - handlePos.y) / store.zoom;

        let newX = initialXRef.current;
        let newY = initialYRef.current;
        let newW = initialWRef.current;
        let newH = initialHRef.current;

        if (handle === 'br') {
            newW = Math.max(20, initialWRef.current + deltaX);
            newH = Math.max(20, initialHRef.current + deltaY);
        } else if (handle === 'bl') {
            newW = Math.max(20, initialWRef.current - deltaX);
            newH = Math.max(20, initialHRef.current + deltaY);
            newX = initialXRef.current + (initialWRef.current - newW);
        } else if (handle === 'tr') {
            newW = Math.max(20, initialWRef.current + deltaX);
            newH = Math.max(20, initialHRef.current - deltaY);
            newY = initialYRef.current + (initialHRef.current - newH);
        } else if (handle === 'tl') {
            newW = Math.max(20, initialWRef.current - deltaX);
            newH = Math.max(20, initialHRef.current - deltaY);
            newX = initialXRef.current + (initialWRef.current - newW);
            newY = initialYRef.current + (initialHRef.current - newH);
        }

        store.updateElement(rowId, el.id, {
            x: newX,
            y: newY,
            width: newW,
            height: newH,
        });
    };

    const handleDragEnd = () => {
        isDraggingRef.current = false;
    };

    const handlePos = getHandlePosition();

    return (
        <Circle
            x={handlePos.x}
            y={handlePos.y}
            radius={HANDLE_SIZE / 2 / store.zoom}
            fill="white"
            stroke={SELECTION_COLOR}
            strokeWidth={1.5 / store.zoom}
            draggable
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        />
    );
});

// Image element component to handle image loading
const ImageElement = observer(({
    el,
    rowY,
    rowId,
    isSelected,
    isHovered,
    store,
    onRowHeightChange,
}: {
    el: EditorElement;
    rowY: number;
    rowId: string;
    isSelected: boolean;
    isHovered: boolean;
    store: EditorStore;
    onRowHeightChange: (rowId: string, height: number) => void;
}) => {
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        if (!el.src) return;
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        img.src = el.src;
        img.onload = () => setImage(img);
        img.onerror = () => setImage(null);
    }, [el.src]);

    return (
        <Group>
            {image ? (
                <KonvaImage
                    x={el.x}
                    y={rowY + el.y}
                    width={el.width}
                    height={el.height}
                    image={image}
                    stroke={isSelected || isHovered ? SELECTION_COLOR : undefined}
                    strokeWidth={(isSelected || isHovered ? 1 : 0) / store.zoom}
                    draggable
                    onClick={(e) => {
                        e.cancelBubble = true;
                        store.selectElement(rowId, el.id);
                    }}
                    onDragMove={(e) => {
                        const row = store.rows.find(r => r.id === rowId);
                        if (!row) return;
                        const newY = e.target.y() - rowY;
                        const currentMaxBottom = row.elements.reduce(
                            (max, elem) => {
                                if (elem.id === el.id) {
                                    return Math.max(max, newY + elem.height);
                                }
                                return Math.max(max, elem.y + elem.height);
                            },
                            0
                        );
                        const newHeight = Math.max(150, currentMaxBottom + 40);
                        if (newHeight > row.height) {
                            onRowHeightChange(rowId, newHeight);
                        }
                    }}
                    onDragEnd={(e) => {
                        const newY = e.target.y() - rowY;
                        store.updateElement(rowId, el.id, {
                            x: e.target.x(),
                            y: newY,
                        });
                        // Clear temp height after update
                        setTimeout(() => {
                            onRowHeightChange(rowId, 0);
                        }, 0);
                    }}
                    onMouseEnter={() => store.setHoveredElement(el.id)}
                    onMouseLeave={() => store.setHoveredElement(null)}
                />
            ) : (
                <Rect
                    x={el.x}
                    y={rowY + el.y}
                    width={el.width}
                    height={el.height}
                    fill="#e5e7eb"
                    stroke={isSelected || isHovered ? SELECTION_COLOR : undefined}
                    strokeWidth={(isSelected || isHovered ? 1 : 0) / store.zoom}
                />
            )}
            {isSelected && (
                <>
                    {/* Interactive Resize handles */}
                    <ElementResizeHandle
                        el={el}
                        rowY={rowY}
                        rowId={rowId}
                        handle="tl"
                        store={store}
                    />
                    <ElementResizeHandle
                        el={el}
                        rowY={rowY}
                        rowId={rowId}
                        handle="tr"
                        store={store}
                    />
                    <ElementResizeHandle
                        el={el}
                        rowY={rowY}
                        rowId={rowId}
                        handle="bl"
                        store={store}
                    />
                    <ElementResizeHandle
                        el={el}
                        rowY={rowY}
                        rowId={rowId}
                        handle="br"
                        store={store}
                    />
                </>
            )}
        </Group>
    );
});

const OBLImprovedEditor = observer(() => {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<any>(null);
    const [viewportW, setViewportW] = useState(0);
    const [viewportH, setViewportH] = useState(0);
    const [scrollY, setScrollY] = useState(0);
    const [showColorPicker, setShowColorPicker] = useState(false);
    // Track temporary heights during drag for smooth resizing
    const [tempHeights, setTempHeights] = useState<Map<string, number>>(new Map());
    // Track column resizing state
    const [isResizingColumn, setIsResizingColumn] = useState(false);

    const getRowHeight = (rowId: string, defaultHeight: number) => {
        return tempHeights.get(rowId) ?? defaultHeight;
    };

    const totalHeight = store.rows.reduce((acc, r) => acc + getRowHeight(r.id, r.height), 0);
    const totalLogicalHeight = Math.max(800, totalHeight + 100);

    useEffect(() => {
        if (containerRef.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    setViewportW(entry.contentRect.width);
                    setViewportH(entry.contentRect.height);
                }
            });
            resizeObserver.observe(containerRef.current);

            const handleScroll = () => {
                if (containerRef.current) {
                    setScrollY(containerRef.current.scrollTop);
                }
            };
            containerRef.current.addEventListener('scroll', handleScroll);

            return () => {
                resizeObserver.disconnect();
                containerRef.current?.removeEventListener('scroll', handleScroll);
            };
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                store.deleteSelection();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                store.duplicateSelection();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                store.setZoom(store.zoom + -e.deltaY * 0.001);
            }
        };
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [store.zoom]);

    const getCanvasCoords = (e: React.MouseEvent | React.DragEvent) => {
        const container = containerRef.current;
        if (!container) return { paperX: 0, logicalY: 0 };
        const rect = container.getBoundingClientRect();
        const viewportWidth = container.clientWidth;
        const paperScreenW = CANVAS_WIDTH * store.zoom;
        const paperScreenX = (viewportWidth - paperScreenW) / 2;
        const mouseScreenX = e.clientX - rect.left;
        const mouseScreenY = e.clientY - rect.top;
        const logicalX = (mouseScreenX - paperScreenX) / store.zoom;
        const logicalY = (mouseScreenY + scrollY) / store.zoom - 40;
        return {
            paperX: logicalX,
            logicalY: logicalY,
        };
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        store.setDragTarget(null);

        const type = e.dataTransfer.getData('type') as any;
        const src = e.dataTransfer.getData('src');
        const layoutStr = e.dataTransfer.getData('layout');

        if (layoutStr) {
            const layout = JSON.parse(layoutStr);
            // Find drop position
            const { logicalY } = getCanvasCoords(e);

            let currentY = 40;
            let insertIndex = store.rows.length;

            for (let i = 0; i < store.rows.length; i++) {
                const row = store.rows[i];
                const rowH = getRowHeight(row.id, row.height);
                if (logicalY < currentY + rowH / 2) {
                    insertIndex = i;
                    break;
                }
                currentY += rowH;
            }

            store.addOrUpdateRowLayout(layout, insertIndex, true);
            return;
        }

        if (type) {
            const { paperX, logicalY } = getCanvasCoords(e);
            // Find target row
            let currentY = 40;
            const targetRow = store.rows.find(r => {
                const rowH = getRowHeight(r.id, r.height);
                const match = logicalY >= currentY && logicalY <= currentY + rowH;
                currentY += rowH;
                return match;
            });

            if (targetRow) {
                // Calculate relative Y in row
                const rowStartY = currentY - getRowHeight(targetRow.id, targetRow.height);
                const relativeY = logicalY - rowStartY;

                store.addElement(targetRow.id, type, src || undefined, paperX, relativeY);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        const { paperX, logicalY } = getCanvasCoords(e);

        // Highlight target row or insertion point
        let currentY = 40;
        let found = false;

        for (let i = 0; i < store.rows.length; i++) {
            const row = store.rows[i];
            const rowH = getRowHeight(row.id, row.height);

            if (logicalY >= currentY && logicalY <= currentY + rowH) {
                // Inside a row
                let colX = 0;
                const colIndex = row.layout.findIndex(pct => {
                    const w = (CANVAS_WIDTH * pct) / 100;
                    const match = paperX >= colX && paperX <= colX + w;
                    colX += w;
                    return match;
                });

                if (colIndex !== -1) {
                    store.setDragTarget({ rowId: row.id, colIndex });
                    found = true;
                }
                break;
            }
            currentY += rowH;
        }

        if (!found) store.setDragTarget(null);
    };

    return (
        <div className="flex h-full flex-col bg-gray-100">
            <TopBar width={CANVAS_WIDTH} height={totalHeight} title="Optimized Editor (Fast)" />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar
                    onAddRow={(layout) => store.addOrUpdateRowLayout(layout)}
                    onAddElement={(type, src) => {
                        if (store.selectedRowId) {
                            store.addElement(store.selectedRowId, type, src);
                        } else {
                            alert('Please select a row first');
                        }
                    }}
                    onAddSpecialBlock={(type) => store.addSpecialBlock(type)}
                />
                <div
                    ref={containerRef}
                    className="flex-1 relative overflow-scroll bg-gray-200 flex justify-center p-8"
                    onClick={() => store.selectRow(null)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <Stage
                        ref={stageRef}
                        width={Math.max(viewportW, CANVAS_WIDTH + 100)}
                        height={Math.max(viewportH, totalLogicalHeight * store.zoom + 100)}
                        scaleX={store.zoom}
                        scaleY={store.zoom}
                        onMouseDown={(e) => {
                            if (e.target === e.target.getStage()) {
                                store.selectRow(null);
                            }
                        }}
                    >
                        <Layer>
                            <Rect
                                x={(viewportW / store.zoom - CANVAS_WIDTH) / 2}
                                y={40}
                                width={CANVAS_WIDTH}
                                height={totalHeight}
                                fill="white"
                                shadowColor="black"
                                shadowBlur={20}
                                shadowOpacity={0.1}
                                onClick={() => store.selectRow(null)}
                            />

                            {/* Render Rows */}
                            {(() => {
                                let currentY = 40;
                                return store.rows.map((row, rowIndex) => {
                                    const isSelected = store.selectedRowId === row.id;
                                    const isHovered = store.hoveredRowId === row.id;
                                    const height = getRowHeight(row.id, row.height);
                                    const rowY = currentY;
                                    currentY += height;

                                    const stageCenterX = (viewportW / store.zoom - CANVAS_WIDTH) / 2;

                                    return (
                                        <Group
                                            key={row.id}
                                            x={stageCenterX}
                                            y={rowY}
                                        >
                                            {/* Row Background */}
                                            <Rect
                                                width={CANVAS_WIDTH}
                                                height={height}
                                                fill={row.backgroundColor}
                                                stroke={isSelected ? SELECTION_COLOR : isHovered ? ROW_HOVER_COLOR : undefined}
                                                strokeWidth={(isSelected ? 2 : isHovered ? 1 : 0) / store.zoom}
                                                onClick={(e) => {
                                                    e.cancelBubble = true;
                                                    store.selectRow(row.id);
                                                }}
                                                onMouseEnter={() => store.setHoveredRow(row.id)}
                                                onMouseLeave={() => store.setHoveredRow(null)}
                                            />

                                            {/* Column Guides */}
                                            {row.layout.length > 1 && (isSelected || isResizingColumn) && (() => {
                                                let colX = 0;
                                                return row.layout.slice(0, -1).map((pct, i) => {
                                                    const w = (CANVAS_WIDTH * pct) / 100;
                                                    colX += w;
                                                    return (
                                                        <React.Fragment key={i}>
                                                            <Line
                                                                points={[colX, 0, colX, height]}
                                                                stroke={COLUMN_GUIDE_COLOR}
                                                                strokeWidth={1 / store.zoom}
                                                                dash={[4 / store.zoom, 4 / store.zoom]}
                                                            />
                                                            {isSelected && !isResizingColumn && (
                                                                <ColumnResizeHandle
                                                                    row={{ ...row, y: rowY, height }}
                                                                    dividerIndex={i}
                                                                    dividerX={colX}
                                                                    store={store}
                                                                    onResizeStart={() => setIsResizingColumn(true)}
                                                                    onResizeEnd={() => setIsResizingColumn(false)}
                                                                />
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                });
                                            })()}

                                            {/* Elements */}
                                            {row.elements.map((el) => {
                                                const isElSelected = store.selectedElementId === el.id;
                                                const isElHovered = store.hoveredElementId === el.id;

                                                if (el.type === 'text') {
                                                    return (
                                                        <Group
                                                            key={el.id}
                                                            x={el.x}
                                                            y={el.y}
                                                            draggable
                                                            onClick={(e) => {
                                                                e.cancelBubble = true;
                                                                store.selectElement(row.id, el.id);
                                                            }}
                                                            onDragEnd={(e) => {
                                                                store.updateElement(row.id, el.id, {
                                                                    x: e.target.x(),
                                                                    y: e.target.y(),
                                                                });
                                                            }}
                                                        >
                                                            <Text
                                                                text={el.text || 'Double click to edit'}
                                                                fontSize={16}
                                                                fill="#333"
                                                                width={el.width}
                                                                padding={10}
                                                            />
                                                            {(isElSelected || isElHovered) && (
                                                                <Rect
                                                                    width={el.width}
                                                                    height={el.height}
                                                                    stroke={SELECTION_COLOR}
                                                                    strokeWidth={1 / store.zoom}
                                                                />
                                                            )}
                                                        </Group>
                                                    );
                                                }

                                                if (el.type === 'image') {
                                                    return (
                                                        <ImageElement
                                                            key={el.id}
                                                            el={el}
                                                            rowY={0} // Relative to group
                                                            rowId={row.id}
                                                            isSelected={isElSelected}
                                                            isHovered={!!isElHovered}
                                                            store={store}
                                                            onRowHeightChange={(rid, h) => {
                                                                if (h === 0) {
                                                                    const newMap = new Map(tempHeights);
                                                                    newMap.delete(rid);
                                                                    setTempHeights(newMap);
                                                                } else {
                                                                    setTempHeights(new Map(tempHeights).set(rid, h));
                                                                }
                                                            }}
                                                        />
                                                    );
                                                }

                                                const fillProps = getFillProps(el.fill, el.width);

                                                return (
                                                    <Group
                                                        key={el.id}
                                                        x={el.x}
                                                        y={el.y}
                                                        draggable
                                                        onClick={(e) => {
                                                            e.cancelBubble = true;
                                                            store.selectElement(row.id, el.id);
                                                        }}
                                                        onDragEnd={(e) => {
                                                            store.updateElement(row.id, el.id, {
                                                                x: e.target.x(),
                                                                y: e.target.y(),
                                                            });
                                                        }}
                                                        onMouseEnter={() => store.setHoveredElement(el.id)}
                                                        onMouseLeave={() => store.setHoveredElement(null)}
                                                    >
                                                        {el.type === 'rect' && (
                                                            <Rect
                                                                width={el.width}
                                                                height={el.height}
                                                                {...fillProps}
                                                                stroke={isElSelected || isElHovered ? SELECTION_COLOR : undefined}
                                                                strokeWidth={(isElSelected || isElHovered ? 1 : 0) / store.zoom}
                                                                cornerRadius={4}
                                                            />
                                                        )}
                                                        {el.type === 'circle' && (
                                                            <Circle
                                                                x={el.width / 2}
                                                                y={el.height / 2}
                                                                radius={el.width / 2}
                                                                {...fillProps}
                                                                stroke={isElSelected || isElHovered ? SELECTION_COLOR : undefined}
                                                                strokeWidth={(isElSelected || isElHovered ? 1 : 0) / store.zoom}
                                                            />
                                                        )}
                                                        {el.type === 'button' && (
                                                            <Group>
                                                                <Rect
                                                                    width={el.width}
                                                                    height={el.height}
                                                                    fill={PRIMARY_COLOR}
                                                                    cornerRadius={6}
                                                                    shadowColor="black"
                                                                    shadowBlur={5}
                                                                    shadowOpacity={0.1}
                                                                    shadowOffset={{ x: 0, y: 2 }}
                                                                />
                                                                <Text
                                                                    text="Button"
                                                                    width={el.width}
                                                                    height={el.height}
                                                                    align="center"
                                                                    verticalAlign="middle"
                                                                    fill="white"
                                                                    fontSize={14}
                                                                    fontStyle="bold"
                                                                />
                                                                {(isElSelected || isElHovered) && (
                                                                    <Rect
                                                                        width={el.width}
                                                                        height={el.height}
                                                                        stroke={SELECTION_COLOR}
                                                                        strokeWidth={1 / store.zoom}
                                                                        cornerRadius={6}
                                                                    />
                                                                )}
                                                            </Group>
                                                        )}

                                                        {isElSelected && (
                                                            <>
                                                                <ElementResizeHandle
                                                                    el={el}
                                                                    rowY={0}
                                                                    rowId={row.id}
                                                                    handle="tl"
                                                                    store={store}
                                                                />
                                                                <ElementResizeHandle
                                                                    el={el}
                                                                    rowY={0}
                                                                    rowId={row.id}
                                                                    handle="tr"
                                                                    store={store}
                                                                />
                                                                <ElementResizeHandle
                                                                    el={el}
                                                                    rowY={0}
                                                                    rowId={row.id}
                                                                    handle="bl"
                                                                    store={store}
                                                                />
                                                                <ElementResizeHandle
                                                                    el={el}
                                                                    rowY={0}
                                                                    rowId={row.id}
                                                                    handle="br"
                                                                    store={store}
                                                                />
                                                            </>
                                                        )}
                                                    </Group>
                                                );
                                            })}

                                            {/* Row Resize Handle (Bottom) */}
                                            {isSelected && (
                                                <RowResizeHandle
                                                    row={{ ...row, y: rowY }}
                                                    store={store}
                                                    stageCenterX={CANVAS_WIDTH / 2}
                                                    onHeightChange={(h) => {
                                                        if (h === 0) {
                                                            const newMap = new Map(tempHeights);
                                                            newMap.delete(row.id);
                                                            setTempHeights(newMap);
                                                        } else {
                                                            setTempHeights(new Map(tempHeights).set(row.id, h));
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Group>
                                    );
                                });
                            })()}
                        </Layer>
                    </Stage>

                    {/* Absolute positioned controls that don't need to be on canvas */}
                    {store.selectedElementId && (
                        <div className="absolute top-20 right-8 flex flex-col gap-2 bg-white p-2 rounded shadow-lg border border-gray-200">
                            <div className="text-xs font-bold text-gray-500 mb-1">Actions</div>
                            <button
                                onClick={() => store.duplicateSelection()}
                                className="p-2 hover:bg-blue-50 rounded text-gray-600 hover:text-blue-600 transition-colors group relative"
                                title="Duplicate"
                            >
                                <Copy size={18} />
                            </button>
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className={`p-2 hover:bg-purple-50 rounded transition-colors group relative ${showColorPicker ? 'bg-purple-50 text-purple-600' : 'text-gray-600'}`}
                                title="Color"
                            >
                                <Palette size={18} />
                            </button>
                            <button
                                onClick={() => store.deleteSelection()}
                                className="p-2 hover:bg-red-50 rounded text-gray-600 hover:text-red-600 transition-colors group relative"
                                title="Delete"
                            >
                                <Trash2 size={18} />
                            </button>

                            {showColorPicker && (
                                <div className="absolute right-full top-0 mr-2">
                                    <ColorPicker
                                        color={
                                            store.selectedRowId && !store.selectedElementId
                                                ? store.rows.find(r => r.id === store.selectedRowId)?.backgroundColor || '#ffffff'
                                                : store.rows
                                                    .find(r => r.id === store.selectedRowId)
                                                    ?.elements.find(e => e.id === store.selectedElementId)?.fill || '#000000'
                                        }
                                        onChange={(color) => store.setSelectionColor(color)}
                                        onClose={() => setShowColorPicker(false)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {store.selectedRowId && !store.selectedElementId && (
                        <div className="absolute top-20 right-8 flex flex-col gap-2 bg-white p-2 rounded shadow-lg border border-gray-200">
                            <div className="text-xs font-bold text-gray-500 mb-1">Row Actions</div>
                            <button
                                onClick={() => store.duplicateSelection()}
                                className="p-2 hover:bg-blue-50 rounded text-gray-600 hover:text-blue-600 transition-colors group relative"
                                title="Duplicate Row"
                            >
                                <Copy size={18} />
                            </button>
                             <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className={`p-2 hover:bg-purple-50 rounded transition-colors group relative ${showColorPicker ? 'bg-purple-50 text-purple-600' : 'text-gray-600'}`}
                                title="Background Color"
                            >
                                <Palette size={18} />
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete this row?')) {
                                        store.deleteSelection();
                                    }
                                }}
                                className="p-2 hover:bg-red-50 rounded text-gray-600 hover:text-red-600 transition-colors group relative"
                                title="Delete Row"
                            >
                                <Trash2 size={18} />
                            </button>

                             {showColorPicker && (
                                <div className="absolute right-full top-0 mr-2">
                                    <ColorPicker
                                        color={store.rows.find(r => r.id === store.selectedRowId)?.backgroundColor || '#ffffff'}
                                        onChange={(color) => store.setSelectionColor(color)}
                                        onClose={() => setShowColorPicker(false)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <ZoomControls
                        zoom={store.zoom}
                        setZoom={(z) => store.setZoom(z)}
                    />
                </div>
            </div>
        </div>
    );
});

export default OBLImprovedEditor;

