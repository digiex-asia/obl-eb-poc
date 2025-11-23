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

const KonvaEditor = observer(() => {
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

        const type = e.dataTransfer.getData('type');
        const layout = e.dataTransfer.getData('layout');
        const src = e.dataTransfer.getData('src');

        if (layout) {
            store.addOrUpdateRowLayout(JSON.parse(layout), undefined, true);
        } else if (type) {
            const coords = getCanvasCoords(e);
            let currentY = 0;
            let targetRowId = null;
            let dropYInRow = 0;

            for (const row of store.rows) {
                if (
                    coords.logicalY >= currentY &&
                    coords.logicalY <= currentY + row.height
                ) {
                    targetRowId = row.id;
                    dropYInRow = coords.logicalY - currentY;
                    break;
                }
                currentY += row.height;
            }

            if (targetRowId) {
                store.addElement(
                    targetRowId,
                    type as any,
                    src || undefined,
                    coords.paperX,
                    dropYInRow,
                    type === 'text'
                        ? 'Heading'
                        : type === 'button'
                        ? 'Button'
                        : undefined
                );
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        const coords = getCanvasCoords(e);
        let currentY = 0;
        let target = null;

        for (const row of store.rows) {
            const rowTop = currentY;
            const rowBottom = currentY + row.height;
            if (coords.logicalY >= rowTop && coords.logicalY <= rowBottom) {
                let colAccumX = 0;
                for (let i = 0; i < row.layout.length; i++) {
                    const colW = (CANVAS_WIDTH * row.layout[i]) / 100;
                    if (coords.paperX >= colAccumX && coords.paperX < colAccumX + colW) {
                        target = { rowId: row.id, colIndex: i };
                        break;
                    }
                    colAccumX += colW;
                }
                break;
            }
            currentY += row.height;
        }
        store.setDragTarget(target);
    };

    const handleDragLeave = () => {
        store.setDragTarget(null);
    };

    const handleStageClick = (e: any) => {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
            store.selectRow(null);
        }
    };

    let contextMenuY = 0;
    let showContextMenu = false;
    const selectedRowIndex = store.rows.findIndex(
        (r) => r.id === store.selectedRowId
    );
    if (
        store.selectedRowId &&
        selectedRowIndex !== -1 &&
        containerRef.current
    ) {
        let currentY = 40;
        for (let i = 0; i < selectedRowIndex; i++)
            currentY += store.rows[i].height;
        contextMenuY = currentY * store.zoom;
        showContextMenu = true;
    }
    const contextMenuLeft =
        viewportW > 0
            ? viewportW / 2 + (CANVAS_WIDTH * store.zoom) / 2 + 10
            : 0;

    const paperScreenW = CANVAS_WIDTH * store.zoom;
    const paperScreenX = viewportW > 0 ? (viewportW - paperScreenW) / 2 : 0;
    const stageWidth = viewportW || 800;
    const stageHeight = viewportH || 600;
    // Calculate stage center X in logical coordinates (relative to Group)
    // Stage center in screen space is stageWidth/2, convert to Group's coordinate system
    const stageCenterX = (stageWidth / 2 - paperScreenX) / store.zoom;

    // Calculate row Y positions using temporary heights during drag
    const rowPositions = store.rows.reduce((acc, row) => {
        const height = getRowHeight(row.id, row.height);
        const y = acc.length === 0 ? 40 : acc[acc.length - 1].y + getRowHeight(acc[acc.length - 1].id, acc[acc.length - 1].height);
        acc.push({ ...row, y, height });
        return acc;
    }, [] as Array<{ y: number; height: number } & typeof store.rows[0]>);

    return (
        <div className="flex h-screen w-screen overflow-hidden font-sans bg-gray-100 text-gray-900 select-none flex-col">
            <TopBar width={CANVAS_WIDTH} height={totalHeight} />

            <div className="flex-1 flex overflow-hidden relative">
                <Sidebar
                    onAddRow={(layout) => store.addOrUpdateRowLayout(layout)}
                    onAddElement={(type, src) =>
                        store.addElement(store.selectedRowId!, type, src)
                    }
                    onAddSpecialBlock={(type) => store.addSpecialBlock(type)}
                />

                <div
                    ref={containerRef}
                    className="flex-1 bg-gray-200 h-full overflow-auto relative"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div
                        style={{
                            height: totalLogicalHeight * store.zoom,
                            width: '1px',
                            position: 'absolute',
                            zIndex: -1,
                        }}
                    />
                    <div
                        style={{
                            position: 'sticky',
                            top: 0,
                            left: 0,
                            width: stageWidth,
                            height: stageHeight,
                        }}
                    >
                        <Stage
                            ref={stageRef}
                            width={stageWidth}
                            height={stageHeight}
                            onClick={handleStageClick}
                        >
                            <Layer>
                                {/* Background */}
                                <Rect
                                    x={0}
                                    y={0}
                                    width={stageWidth}
                                    height={stageHeight}
                                    fill={PAGE_BG_COLOR}
                                />

                                {/* Transform group for zoom and positioning */}
                                <Group
                                    x={paperScreenX}
                                    y={-scrollY}
                                    scaleX={store.zoom}
                                    scaleY={store.zoom}
                                >
                                    {/* Paper background */}
                                    <Rect
                                        x={0}
                                        y={40}
                                        width={CANVAS_WIDTH}
                                        height={totalHeight}
                                        fill="#ffffff"
                                        shadowBlur={20}
                                        shadowColor="rgba(0,0,0,0.1)"
                                        shadowOffsetY={10}
                                    />

                                    {/* Rows */}
                                    {rowPositions.map((row) => {
                                        const isRowSelected = store.selectedRowId === row.id;
                                        const isRowHovered = store.hoveredRowId === row.id;
                                        const isDragOver = store.dragTarget?.rowId === row.id;

                                        return (
                                            <Group key={row.id}>
                                                {/* Row Background */}
                                                <Rect
                                                    x={0}
                                                    y={row.y}
                                                    width={CANVAS_WIDTH}
                                                    height={row.height}
                                                    {...getFillProps(row.backgroundColor || '#ffffff', CANVAS_WIDTH)}
                                                    onClick={() => store.selectRow(row.id)}
                                                    onMouseEnter={() => store.setHoveredRow(row.id)}
                                                    onMouseLeave={() => store.setHoveredRow(null)}
                                                />

                                                {/* Row Hover/Selection Border */}
                                                {(isRowHovered || isDragOver) && !isRowSelected && (
                                                    <Rect
                                                        x={0}
                                                        y={row.y}
                                                        width={CANVAS_WIDTH}
                                                        height={row.height}
                                                        stroke={ROW_HOVER_COLOR}
                                                        strokeWidth={1.5 / store.zoom}
                                                        listening={false}
                                                    />
                                                )}

                                                {/* Selected Row Border */}
                                                {isRowSelected && (
                                                    <>
                                                        {/* Top border line - extends full viewport width */}
                                                        <Line
                                                            points={[
                                                                (0 - paperScreenX) / store.zoom,
                                                                row.y,
                                                                (stageWidth - paperScreenX) / store.zoom,
                                                                row.y
                                                            ]}
                                                            stroke={PRIMARY_COLOR}
                                                            strokeWidth={1 / store.zoom}
                                                            listening={false}
                                                        />
                                                        {/* Bottom border line - extends full viewport width */}
                                                        <Line
                                                            points={[
                                                                (0 - paperScreenX) / store.zoom,
                                                                row.y + row.height,
                                                                (stageWidth - paperScreenX) / store.zoom,
                                                                row.y + row.height
                                                            ]}
                                                            stroke={PRIMARY_COLOR}
                                                            strokeWidth={1 / store.zoom}
                                                            listening={false}
                                                        />
                                                        {/* Add Row Button Top */}
                                                        <Group
                                                            x={CANVAS_WIDTH / 2}
                                                            y={row.y - ADD_BUTTON_OFFSET / store.zoom}
                                                            onClick={(e) => {
                                                                e.cancelBubble = true;
                                                                const index = store.rows.findIndex(r => r.id === row.id);
                                                                store.addOrUpdateRowLayout([100], index, true);
                                                            }}
                                                        >
                                                            {/* Hit area for easier clicking */}
                                                            <Circle
                                                                radius={10 / store.zoom}
                                                                fill="transparent"
                                                                listening={true}
                                                            />
                                                            <Line
                                                                points={[-7 / store.zoom, 0, 7 / store.zoom, 0]}
                                                                stroke={PRIMARY_COLOR}
                                                                strokeWidth={1.5 / store.zoom}
                                                                listening={false}
                                                            />
                                                            <Line
                                                                points={[0, -7 / store.zoom, 0, 7 / store.zoom]}
                                                                stroke={PRIMARY_COLOR}
                                                                strokeWidth={1.5 / store.zoom}
                                                                listening={false}
                                                            />
                                                        </Group>
                                                        {/* Add Row Button Bottom */}
                                                        <Group
                                                            x={CANVAS_WIDTH / 2}
                                                            y={row.y + row.height + ADD_BUTTON_OFFSET / store.zoom}
                                                            onClick={(e) => {
                                                                e.cancelBubble = true;
                                                                const index = store.rows.findIndex(r => r.id === row.id);
                                                                store.addOrUpdateRowLayout([100], index + 1, true);
                                                            }}
                                                        >
                                                            {/* Hit area for easier clicking */}
                                                            <Circle
                                                                radius={10 / store.zoom}
                                                                fill="transparent"
                                                                listening={true}
                                                            />
                                                            <Line
                                                                points={[-7 / store.zoom, 0, 7 / store.zoom, 0]}
                                                                stroke={PRIMARY_COLOR}
                                                                strokeWidth={1.5 / store.zoom}
                                                                listening={false}
                                                            />
                                                            <Line
                                                                points={[0, -7 / store.zoom, 0, 7 / store.zoom]}
                                                                stroke={PRIMARY_COLOR}
                                                                strokeWidth={1.5 / store.zoom}
                                                                listening={false}
                                                            />
                                                        </Group>
                                                        {/* Resize Handle */}
                                                        <RowResizeHandle
                                                            row={{ ...row, height: row.height }}
                                                            store={store}
                                                            stageCenterX={stageCenterX}
                                                            onHeightChange={(height) => {
                                                                if (height > 0) {
                                                                    setTempHeights(prev => {
                                                                        const newMap = new Map(prev);
                                                                        newMap.set(row.id, height);
                                                                        return newMap;
                                                                    });
                                                                } else {
                                                                    setTempHeights(prev => {
                                                                        const newMap = new Map(prev);
                                                                        newMap.delete(row.id);
                                                                        return newMap;
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                        {/* Row Badge */}
                                                        {(() => {
                                                            const logicalViewportLeft = -paperScreenX / store.zoom;
                                                            const logicalViewportWidth = stageWidth / store.zoom;
                                                            const logicalRightEdge = logicalViewportLeft + logicalViewportWidth;
                                                            const badgeW = 40 / store.zoom;
                                                            const badgeH = 20 / store.zoom;
                                                            const badgeX = logicalRightEdge - badgeW - 20 / store.zoom;
                                                            const badgeY = row.y + row.height - badgeH - 5 / store.zoom;
                                                            return (
                                                                <>
                                                                    <Rect
                                                                        x={badgeX}
                                                                        y={badgeY}
                                                                        width={badgeW}
                                                                        height={badgeH}
                                                                        fill={PRIMARY_COLOR}
                                                                        cornerRadius={4 / store.zoom}
                                                                        listening={false}
                                                                    />
                                                                    <Text
                                                                        x={badgeX + badgeW / 2}
                                                                        y={badgeY + badgeH / 2}
                                                                        text="Row"
                                                                        fontSize={11 / store.zoom}
                                                                        fill="white"
                                                                        align="center"
                                                                        verticalAlign="middle"
                                                                        offsetX={0}
                                                                        offsetY={0}
                                                                        listening={false}
                                                                    />
                                                                </>
                                                            );
                                                        })()}
                                                        {/* Drag Handle (Dots Icon) */}
                                                        {(() => {
                                                            const logicalViewportLeft = -paperScreenX / store.zoom;
                                                            const logicalViewportWidth = stageWidth / store.zoom;
                                                            const logicalRightEdge = logicalViewportLeft + logicalViewportWidth;
                                                            const dragX = logicalRightEdge - 30 / store.zoom;
                                                            const dragY = row.y + row.height / 2;
                                                            const dotSize = 2 / store.zoom;
                                                            const gap = 4 / store.zoom;
                                                            return (
                                                                <Group
                                                                    x={dragX}
                                                                    y={dragY}
                                                                    draggable
                                                                    dragBoundFunc={(pos) => {
                                                                        // Constrain to vertical movement only
                                                                        return { x: dragX, y: pos.y };
                                                                    }}
                                                                    onDragStart={() => {
                                                                        const index = store.rows.findIndex(r => r.id === row.id);
                                                                        if (index !== -1) {
                                                                            // Store initial row index for reordering
                                                                        }
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        const currentY = e.target.y();
                                                                        // Calculate which row index we're over based on row positions
                                                                        let currentYAccum = 0;
                                                                        let newTargetIndex = store.rows.length;
                                                                        for (let i = 0; i < store.rows.length; i++) {
                                                                            const rowH = store.rows[i].height;
                                                                            if (currentY < currentYAccum + rowH / 2) {
                                                                                newTargetIndex = i;
                                                                                break;
                                                                            }
                                                                            currentYAccum += rowH;
                                                                        }
                                                                        store.setReorderTarget(newTargetIndex);
                                                                    }}
                                                                    onDragEnd={() => {
                                                                        const fromIndex = store.rows.findIndex(r => r.id === row.id);
                                                                        const toIndex = store.reorderTargetIndex;
                                                                        if (fromIndex !== -1 && toIndex !== null && toIndex !== fromIndex) {
                                                                            store.reorderRow(fromIndex, toIndex);
                                                                        }
                                                                        store.setReorderTarget(null);
                                                                    }}
                                                                >
                                                                    {[0, 1].map(i =>
                                                                        [0, 1, 2].map(j => (
                                                                            <Circle
                                                                                key={`${i}-${j}`}
                                                                                x={i * gap}
                                                                                y={j * gap - gap}
                                                                                radius={dotSize}
                                                                                fill={PRIMARY_COLOR}
                                                                                listening={false}
                                                                            />
                                                                        ))
                                                                    )}
                                                                </Group>
                                                            );
                                                        })()}
                                                    </>
                                                )}

                                                {/* Drag Target Highlight */}
                                                {isDragOver &&
                                                    store.dragTarget &&
                                                    typeof store.dragTarget.colIndex === 'number' && (
                                                        <Rect
                                                            x={(CANVAS_WIDTH * row.layout.slice(0, store.dragTarget.colIndex).reduce((a, b) => a + b, 0)) / 100}
                                                            y={row.y}
                                                            width={(CANVAS_WIDTH * row.layout[store.dragTarget.colIndex]) / 100}
                                                            height={row.height}
                                                            fill="rgba(59, 130, 246, 0.1)"
                                                            stroke={DROP_TARGET_COLOR}
                                                            strokeWidth={2 / store.zoom}
                                                            listening={false}
                                                        />
                                                    )}

                                                {/* Column Guides */}
                                                {isRowSelected && (
                                                    <>
                                                        {row.layout.map((pct, i) => {
                                                            let colX = 0;
                                                            for (let j = 0; j < i; j++) {
                                                                colX += (CANVAS_WIDTH * row.layout[j]) / 100;
                                                            }
                                                            const colW = (CANVAS_WIDTH * pct) / 100;
                                                            const dividerX = colX + colW;
                                                            return (
                                                                <React.Fragment key={i}>
                                                                    <Rect
                                                                        x={colX}
                                                                        y={row.y}
                                                                        width={colW}
                                                                        height={row.height}
                                                                        stroke="rgba(232, 121, 249, 0.3)"
                                                                        strokeWidth={1 / store.zoom}
                                                                        listening={false}
                                                                    />
                                                                    {/* Percentage Label when resizing */}
                                                                    {isResizingColumn && colW > 30 && (
                                                                        <>
                                                                            <Rect
                                                                                x={colX + colW / 2 - 18 / store.zoom}
                                                                                y={row.y + row.height - 24 / store.zoom}
                                                                                width={36 / store.zoom}
                                                                                height={18 / store.zoom}
                                                                                fill={COLUMN_GUIDE_COLOR}
                                                                                cornerRadius={4 / store.zoom}
                                                                                listening={false}
                                                                            />
                                                                            <Text
                                                                                x={colX + colW / 2}
                                                                                y={row.y + row.height - 24 / store.zoom + 9 / store.zoom}
                                                                                text={`${Math.round(pct)}%`}
                                                                                fontSize={10 / store.zoom}
                                                                                fill="white"
                                                                                align="center"
                                                                                verticalAlign="middle"
                                                                                listening={false}
                                                                            />
                                                                        </>
                                                                    )}
                                                                    {i < row.layout.length - 1 && (
                                                                        <>
                                                                            <Line
                                                                                points={[dividerX, row.y, dividerX, row.y + row.height]}
                                                                                stroke={COLUMN_GUIDE_COLOR}
                                                                                strokeWidth={1 / store.zoom}
                                                                                listening={false}
                                                                            />
                                                                            {/* Column Resize Handle */}
                                                                            <ColumnResizeHandle
                                                                                row={row}
                                                                                dividerIndex={i}
                                                                                dividerX={dividerX}
                                                                                store={store}
                                                                                onResizeStart={() => setIsResizingColumn(true)}
                                                                                onResizeEnd={() => setIsResizingColumn(false)}
                                                                            />
                                                                        </>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </>
                                                )}

                                                {/* Elements */}
                                                {row.elements.map((el) => {
                                                    const isSelected = store.selectedElementId === el.id;
                                                    const isHovered = store.hoveredElementId === el.id;

                                                    if (el.type === 'rect') {
                                                        const fillProps = getFillProps(el.fill || '#6366f1', el.width);
                                                        return (
                                                            <Group key={el.id}>
                                                                <Rect
                                                                    x={el.x}
                                                                    y={row.y + el.y}
                                                                    width={el.width}
                                                                    height={el.height}
                                                                    {...fillProps}
                                                                    cornerRadius={4}
                                                                    stroke={isSelected || isHovered ? SELECTION_COLOR : undefined}
                                                                    strokeWidth={(isSelected || isHovered ? 1 : 0) / store.zoom}
                                                                    draggable
                                                                    onClick={(e) => {
                                                                        e.cancelBubble = true;
                                                                        store.selectElement(row.id, el.id);
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        const newY = e.target.y() - row.y;
                                                                        // Auto-resize row if element is dragged to bottom - use temp height for smooth resizing
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
                                                                            setTempHeights(prev => {
                                                                                const newMap = new Map(prev);
                                                                                newMap.set(row.id, newHeight);
                                                                                return newMap;
                                                                            });
                                                                        }
                                                                    }}
                                                                    onDragEnd={(e) => {
                                                                        const newY = e.target.y() - row.y;
                                                                        store.updateElement(row.id, el.id, {
                                                                            x: e.target.x(),
                                                                            y: newY,
                                                                        });
                                                                        // Clear temp height after update
                                                                        setTimeout(() => {
                                                                            setTempHeights(prev => {
                                                                                const newMap = new Map(prev);
                                                                                newMap.delete(row.id);
                                                                                return newMap;
                                                                            });
                                                                        }, 0);
                                                                    }}
                                                                    onMouseEnter={() => store.setHoveredElement(el.id)}
                                                                    onMouseLeave={() => store.setHoveredElement(null)}
                                                                />
                                                                {isSelected && (
                                                                    <>
                                                                        {/* Interactive Resize handles */}
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tr"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="bl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="br"
                                                                            store={store}
                                                                        />
                                                                    </>
                                                                )}
                                                            </Group>
                                                        );
                                                    } else if (el.type === 'circle') {
                                                        const fillProps = getFillProps(el.fill || '#10b981', el.width);
                                                        return (
                                                            <Group key={el.id}>
                                                                <Circle
                                                                    x={el.x + el.width / 2}
                                                                    y={row.y + el.y + el.height / 2}
                                                                    radius={el.width / 2}
                                                                    {...fillProps}
                                                                    stroke={isSelected || isHovered ? SELECTION_COLOR : undefined}
                                                                    strokeWidth={(isSelected || isHovered ? 1 : 0) / store.zoom}
                                                                    draggable
                                                                    onClick={(e) => {
                                                                        e.cancelBubble = true;
                                                                        store.selectElement(row.id, el.id);
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        const newY = e.target.y() - row.y - el.height / 2;
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
                                                                            store.updateRowHeight(row.id, newHeight);
                                                                        }
                                                                    }}
                                                                    onDragEnd={(e) => {
                                                                        store.updateElement(row.id, el.id, {
                                                                            x: e.target.x() - el.width / 2,
                                                                            y: e.target.y() - row.y - el.height / 2,
                                                                        });
                                                                    }}
                                                                    onMouseEnter={() => store.setHoveredElement(el.id)}
                                                                    onMouseLeave={() => store.setHoveredElement(null)}
                                                                />
                                                                {isSelected && (
                                                                    <>
                                                                        {/* Interactive Resize handles */}
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tr"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="bl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="br"
                                                                            store={store}
                                                                        />
                                                                    </>
                                                                )}
                                                            </Group>
                                                        );
                                                    } else if (el.type === 'text') {
                                                        return (
                                                            <Group key={el.id}>
                                                                <Text
                                                                    x={el.x}
                                                                    y={row.y + el.y}
                                                                    text={el.text || 'Heading Text'}
                                                                    fontSize={16}
                                                                    fill="black"
                                                                    stroke={isSelected || isHovered ? SELECTION_COLOR : undefined}
                                                                    strokeWidth={(isSelected || isHovered ? 1 : 0) / store.zoom}
                                                                    draggable
                                                                    onClick={(e) => {
                                                                        e.cancelBubble = true;
                                                                        store.selectElement(row.id, el.id);
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        const newY = e.target.y() - row.y;
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
                                                                            store.updateRowHeight(row.id, newHeight);
                                                                        }
                                                                    }}
                                                                    onDragEnd={(e) => {
                                                                        store.updateElement(row.id, el.id, {
                                                                            x: e.target.x(),
                                                                            y: e.target.y() - row.y,
                                                                        });
                                                                    }}
                                                                    onMouseEnter={() => store.setHoveredElement(el.id)}
                                                                    onMouseLeave={() => store.setHoveredElement(null)}
                                                                />
                                                                {isSelected && (
                                                                    <>
                                                                        {/* Interactive Resize handles */}
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tr"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="bl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="br"
                                                                            store={store}
                                                                        />
                                                                    </>
                                                                )}
                                                            </Group>
                                                        );
                                                    } else if (el.type === 'button') {
                                                        const fillProps = getFillProps(el.fill || '#3b82f6', el.width);
                                                        return (
                                                            <Group key={el.id}>
                                                                <Rect
                                                                    x={el.x}
                                                                    y={row.y + el.y}
                                                                    width={el.width}
                                                                    height={el.height}
                                                                    {...fillProps}
                                                                    cornerRadius={6}
                                                                    stroke={isSelected || isHovered ? SELECTION_COLOR : undefined}
                                                                    strokeWidth={(isSelected || isHovered ? 1 : 0) / store.zoom}
                                                                    draggable
                                                                    onClick={(e) => {
                                                                        e.cancelBubble = true;
                                                                        store.selectElement(row.id, el.id);
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        const newY = e.target.y() - row.y;
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
                                                                            store.updateRowHeight(row.id, newHeight);
                                                                        }
                                                                    }}
                                                                    onDragEnd={(e) => {
                                                                        const newY = e.target.y() - row.y;
                                                                        store.updateElement(row.id, el.id, {
                                                                            x: e.target.x(),
                                                                            y: newY,
                                                                        });
                                                                        // Clear temp height after update
                                                                        setTimeout(() => {
                                                                            setTempHeights(prev => {
                                                                                const newMap = new Map(prev);
                                                                                newMap.delete(row.id);
                                                                                return newMap;
                                                                            });
                                                                        }, 0);
                                                                    }}
                                                                    onMouseEnter={() => store.setHoveredElement(el.id)}
                                                                    onMouseLeave={() => store.setHoveredElement(null)}
                                                                />
                                                                <Text
                                                                    x={el.x + el.width / 2}
                                                                    y={row.y + el.y + el.height / 2}
                                                                    text={el.text || 'Button'}
                                                                    fontSize={14}
                                                                    fill="white"
                                                                    align="center"
                                                                    verticalAlign="middle"
                                                                    offsetX={el.width / 2}
                                                                    offsetY={7}
                                                                    listening={false}
                                                                />
                                                                {isSelected && (
                                                                    <>
                                                                        {/* Interactive Resize handles */}
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tr"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="bl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="br"
                                                                            store={store}
                                                                        />
                                                                    </>
                                                                )}
                                                            </Group>
                                                        );
                                                    } else if (el.type === 'triangle') {
                                                        const fillProps = getFillProps(el.fill || '#f59e0b', el.width);
                                                        // Triangle: top center, bottom right, bottom left (relative to Group)
                                                        const points = [
                                                            el.width / 2, 0, // top center
                                                            el.width, el.height, // bottom right
                                                            0, el.height, // bottom left
                                                        ];
                                                        return (
                                                            <Group
                                                                key={el.id}
                                                                x={el.x}
                                                                y={row.y + el.y}
                                                                draggable
                                                                onClick={(e) => {
                                                                    e.cancelBubble = true;
                                                                    store.selectElement(row.id, el.id);
                                                                }}
                                                                onDragMove={(e) => {
                                                                    const newY = e.target.y() - row.y;
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
                                                                        store.updateRowHeight(row.id, newHeight);
                                                                    }
                                                                }}
                                                                onDragEnd={(e) => {
                                                                    const newY = e.target.y() - row.y;
                                                                    store.updateElement(row.id, el.id, {
                                                                        x: e.target.x(),
                                                                        y: newY,
                                                                    });
                                                                }}
                                                                onMouseEnter={() => store.setHoveredElement(el.id)}
                                                                onMouseLeave={() => store.setHoveredElement(null)}
                                                            >
                                                                <Line
                                                                    points={points}
                                                                    closed={true}
                                                                    {...fillProps}
                                                                    stroke={isSelected || isHovered ? SELECTION_COLOR : undefined}
                                                                    strokeWidth={(isSelected || isHovered ? 1 : 0) / store.zoom}
                                                                    listening={false}
                                                                />
                                                                {isSelected && (
                                                                    <>
                                                                        {/* Interactive Resize handles */}
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tr"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="bl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="br"
                                                                            store={store}
                                                                        />
                                                                    </>
                                                                )}
                                                            </Group>
                                                        );
                                                    } else if (el.type === 'star') {
                                                        const fillProps = getFillProps(el.fill || '#ec4899', el.width);
                                                        const cx = el.width / 2;
                                                        const cy = el.height / 2;
                                                        const spikes = 5;
                                                        const outerRadius = el.width / 2;
                                                        const innerRadius = el.width / 4;
                                                        let rot = (Math.PI / 2) * 3;
                                                        const step = Math.PI / spikes;
                                                        const points: number[] = [];
                                                        points.push(cx, cy - outerRadius);
                                                        for (let i = 0; i < spikes; i++) {
                                                            const x = cx + Math.cos(rot) * outerRadius;
                                                            const y = cy + Math.sin(rot) * outerRadius;
                                                            points.push(x, y);
                                                            rot += step;
                                                            const x2 = cx + Math.cos(rot) * innerRadius;
                                                            const y2 = cy + Math.sin(rot) * innerRadius;
                                                            points.push(x2, y2);
                                                            rot += step;
                                                        }
                                                        points.push(cx, cy - outerRadius);
                                                        return (
                                                            <Group
                                                                key={el.id}
                                                                x={el.x}
                                                                y={row.y + el.y}
                                                                draggable
                                                                onClick={(e) => {
                                                                    e.cancelBubble = true;
                                                                    store.selectElement(row.id, el.id);
                                                                }}
                                                                onDragMove={(e) => {
                                                                    const newY = e.target.y() - row.y;
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
                                                                        store.updateRowHeight(row.id, newHeight);
                                                                    }
                                                                }}
                                                                onDragEnd={(e) => {
                                                                    const newY = e.target.y() - row.y;
                                                                    store.updateElement(row.id, el.id, {
                                                                        x: e.target.x(),
                                                                        y: newY,
                                                                    });
                                                                }}
                                                                onMouseEnter={() => store.setHoveredElement(el.id)}
                                                                onMouseLeave={() => store.setHoveredElement(null)}
                                                            >
                                                                <Line
                                                                    points={points}
                                                                    closed={true}
                                                                    {...fillProps}
                                                                    stroke={isSelected || isHovered ? SELECTION_COLOR : undefined}
                                                                    strokeWidth={(isSelected || isHovered ? 1 : 0) / store.zoom}
                                                                    listening={false}
                                                                />
                                                                {isSelected && (
                                                                    <>
                                                                        {/* Interactive Resize handles */}
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tr"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="bl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="br"
                                                                            store={store}
                                                                        />
                                                                    </>
                                                                )}
                                                            </Group>
                                                        );
                                                    } else if (el.type === 'polygon') {
                                                        const fillProps = getFillProps(el.fill || '#3b82f6', el.width);
                                                        const centerX = el.width / 2;
                                                        const centerY = el.height / 2;
                                                        const sides = 6;
                                                        const radius = el.width / 2;
                                                        const points: number[] = [];
                                                        for (let i = 0; i <= sides; i++) {
                                                            const angle = (i * 2 * Math.PI) / sides;
                                                            const x = centerX + radius * Math.cos(angle);
                                                            const y = centerY + radius * Math.sin(angle);
                                                            points.push(x, y);
                                                        }
                                                        return (
                                                            <Group
                                                                key={el.id}
                                                                x={el.x}
                                                                y={row.y + el.y}
                                                                draggable
                                                                onClick={(e) => {
                                                                    e.cancelBubble = true;
                                                                    store.selectElement(row.id, el.id);
                                                                }}
                                                                onDragMove={(e) => {
                                                                    const newY = e.target.y() - row.y;
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
                                                                        store.updateRowHeight(row.id, newHeight);
                                                                    }
                                                                }}
                                                                onDragEnd={(e) => {
                                                                    const newY = e.target.y() - row.y;
                                                                    store.updateElement(row.id, el.id, {
                                                                        x: e.target.x(),
                                                                        y: newY,
                                                                    });
                                                                }}
                                                                onMouseEnter={() => store.setHoveredElement(el.id)}
                                                                onMouseLeave={() => store.setHoveredElement(null)}
                                                            >
                                                                <Line
                                                                    points={points}
                                                                    closed={true}
                                                                    {...fillProps}
                                                                    stroke={isSelected || isHovered ? SELECTION_COLOR : undefined}
                                                                    strokeWidth={(isSelected || isHovered ? 1 : 0) / store.zoom}
                                                                    listening={false}
                                                                />
                                                                {isSelected && (
                                                                    <>
                                                                        {/* Interactive Resize handles */}
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="tr"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="bl"
                                                                            store={store}
                                                                        />
                                                                        <ElementResizeHandle
                                                                            el={el}
                                                                            rowY={row.y}
                                                                            rowId={row.id}
                                                                            handle="br"
                                                                            store={store}
                                                                        />
                                                                    </>
                                                                )}
                                                            </Group>
                                                        );
                                                    } else if (el.type === 'image' && el.src) {
                                                        return (
                                                            <ImageElement
                                                                key={el.id}
                                                                el={el}
                                                                rowY={row.y}
                                                                rowId={row.id}
                                                                isSelected={isSelected}
                                                                isHovered={isHovered}
                                                                store={store}
                                                                onRowHeightChange={(rowId, height) => {
                                                                    if (height > 0) {
                                                                        setTempHeights(prev => {
                                                                            const newMap = new Map(prev);
                                                                            newMap.set(rowId, height);
                                                                            return newMap;
                                                                        });
                                                                    } else {
                                                                        setTempHeights(prev => {
                                                                            const newMap = new Map(prev);
                                                                            newMap.delete(rowId);
                                                                            return newMap;
                                                                        });
                                                                    }
                                                                }}
                                                            />
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </Group>
                                        );
                                    })}
                                </Group>
                            </Layer>
                        </Stage>
                    </div>

                    {showContextMenu && (
                        <div
                            className="absolute flex flex-col gap-1 bg-white p-1 rounded-lg shadow-xl border border-gray-200 z-50 animate-in fade-in zoom-in-95 duration-100"
                            style={{ top: contextMenuY, left: contextMenuLeft }}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (store.selectedRowId)
                                        store.duplicateRow(store.selectedRowId);
                                }}
                                className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors group relative"
                                title="Duplicate Block"
                            >
                                <Copy size={18} />
                            </button>

                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowColorPicker(!showColorPicker);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition-colors group relative"
                                    title="Background Color"
                                >
                                    <Palette size={18} />
                                </button>
                                {showColorPicker && (
                                    <ColorPicker
                                        onSelect={(c) => {
                                            store.setSelectionColor(c);
                                            setShowColorPicker(false);
                                        }}
                                        onClose={() => setShowColorPicker(false)}
                                    />
                                )}
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    store.deleteSelection();
                                }}
                                className="p-2 hover:bg-red-50 rounded text-gray-600 hover:text-red-600 transition-colors group relative"
                                title="Delete Row"
                            >
                                <Trash2 size={18} />
                            </button>
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

export default KonvaEditor;
