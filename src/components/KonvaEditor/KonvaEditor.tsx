import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Stage, Layer, Rect, Circle, Text, Image as KonvaImage, Line, Group } from 'react-konva';
import Konva from 'konva';
import EditorStore from '../../common/stores/EditorStore';
import { DebugHighlighter } from '../../utils/DebugKonva';
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
} from '../../common/stores/types';
import { Sidebar } from '../shared/Sidebar';
import { TopBar } from '../shared/TopBar';
import { ZoomControls } from '../shared/ZoomControls';
import { ColorPicker } from '../shared/ColorPicker';
import { Copy, Trash2, Palette } from 'lucide-react';
import { EditorElement } from '../../common/stores/types';
import {
    FPSCounter,
    BoundingBoxes,
    GridOverlay,
    DebugPanel,
    SnapGuides,
    DistanceIndicators,
    type DebugEvent,
} from './debug';
import {
    SmartGuides,
    calculateSnap,
    DistanceMeasurement,
    AlignmentToolbar,
    type SnapGuide,
} from './features';

const store = new EditorStore();

// Helper function to parse gradient strings and return Konva gradient props
const getFillProps = (
    color: string | undefined,
    width: number
): {
    fill?: string;
    fillLinearGradientStartPoint?: { x: number; y: number };
    fillLinearGradientEndPoint?: { x: number; y: number };
    fillLinearGradientColorStops?: (number | string)[];
} => {
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
const RowResizeHandle = observer(
    ({
        row,
        store,
        onHeightChange,
    }: {
        row: (typeof store.rows)[0] & { y: number };
        store: EditorStore;
        onHeightChange: (height: number) => void;
    }) => {
        const groupRef = useRef<Konva.Group>(null);
        const initialHeightRef = useRef<number>(row.height);
        const pillHValue = 6 / store.zoom;
        // Group origin should be at row.y + row.height - pillHValue/2 (matching Canvas positioning)
        const initialYRef = useRef<number>(row.y + row.height - pillHValue / 2);
        const [localHeight, setLocalHeight] = useState<number | null>(null);
        const isDraggingRef = useRef(false);

        // Pill X position: center of paper (matching CanvasEditor behavior)
        const pillCenterX = CANVAS_WIDTH / 2 + 15;

        // Move pill to top when row is selected (on mount)
        useEffect(() => {
            if (groupRef.current) {
                groupRef.current.moveToTop();
            }
        }, []);

        // Update refs when row changes (but not during drag)
        useEffect(() => {
            if (!isDraggingRef.current) {
                initialHeightRef.current = row.height;
                initialYRef.current = row.y + row.height - pillHValue / 2;
                setLocalHeight(null);
            }
        }, [row.height, row.y, pillHValue]);

        const handleDragStart = (e: any) => {
            // Move to top when starting drag for resize
            if (groupRef.current) {
                groupRef.current.moveToTop();
            }
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
                ref={groupRef}
                x={pillCenterX}
                y={displayY}
                draggable
                dragBoundFunc={(pos) => {
                    // Calculate delta (both pos.y and initialYRef are in logical coordinates)
                    const deltaY = pos.y - initialYRef.current;
                    const newHeight = Math.max(50, initialHeightRef.current + deltaY);
                    // Keep X fixed at center of paper, only allow Y movement
                    console.log('PILL X CENTER', pillCenterX);
                    return {
                        x: pillCenterX,
                        y: row.y + newHeight - pillHValue / 2,
                    };
                }}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
            >
                <Rect
                    x={-pillW + 600 / 2}
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
    }
);

// Column resize handle component
const ColumnResizeHandle = observer(
    ({
        row,
        dividerIndex,
        dividerX,
        store,
        onResizeStart,
        onResizeEnd,
    }: {
        row: (typeof store.rows)[0] & { y: number; height: number };
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
    }
);

// Element resize handle component
const ElementResizeHandle = observer(
    ({
        el,
        rowY,
        rowId,
        handle,
        store,
        relativeToGroup = false,
    }: {
        el: EditorElement;
        rowY: number;
        rowId: string;
        handle: 'tl' | 'tr' | 'bl' | 'br';
        store: EditorStore;
        relativeToGroup?: boolean;
    }) => {
        const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
        const startElRef = useRef<{ x: number; y: number; w: number; h: number }>({
            x: 0,
            y: 0,
            w: 0,
            h: 0,
        });

        const getHandlePosition = () => {
            // If inside a positioned Group, use relative coordinates (0 to width/height)
            if (relativeToGroup) {
                switch (handle) {
                    case 'tl':
                        return { x: 0, y: 0 };
                    case 'tr':
                        return { x: el.width, y: 0 };
                    case 'bl':
                        return { x: 0, y: el.height };
                    case 'br':
                        return { x: el.width, y: el.height };
                }
            }
            // Otherwise use absolute coordinates
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

        const handleDragStart = (e: any) => {
            // Store starting positions
            startPosRef.current = { x: e.target.x(), y: e.target.y() };
            startElRef.current = { x: el.x, y: el.y, w: el.width, h: el.height };
        };

        const handleDragMove = (e: any) => {
            // Calculate delta from start position (in logical coordinates)
            const deltaX = e.target.x() - startPosRef.current.x;
            const deltaY = e.target.y() - startPosRef.current.y;

            let newX = startElRef.current.x;
            let newY = startElRef.current.y;
            let newW = startElRef.current.w;
            let newH = startElRef.current.h;

            if (handle === 'br') {
                newW = Math.max(20, startElRef.current.w + deltaX);
                newH = Math.max(20, startElRef.current.h + deltaY);
            } else if (handle === 'bl') {
                const dw = startElRef.current.w - deltaX;
                newW = Math.max(20, dw);
                newH = Math.max(20, startElRef.current.h + deltaY);
                newX = startElRef.current.x + startElRef.current.w - newW;
            } else if (handle === 'tr') {
                newW = Math.max(20, startElRef.current.w + deltaX);
                const dh = startElRef.current.h - deltaY;
                newH = Math.max(20, dh);
                newY = startElRef.current.y + startElRef.current.h - newH;
            } else if (handle === 'tl') {
                const dw = startElRef.current.w - deltaX;
                const dh = startElRef.current.h - deltaY;
                newW = Math.max(20, dw);
                newH = Math.max(20, dh);
                newX = startElRef.current.x + startElRef.current.w - newW;
                newY = startElRef.current.y + startElRef.current.h - newH;
            }

            store.updateElement(rowId, el.id, {
                x: newX,
                y: newY,
                width: newW,
                height: newH,
            });
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
                dragBoundFunc={(pos) => pos}
            />
        );
    }
);

// Image element component to handle image loading
const ImageElement = observer(
    ({
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
                            const row = store.rows.find((r) => r.id === rowId);
                            if (!row) return;
                            const newY = e.target.y() - rowY;
                            const currentMaxBottom = row.elements.reduce((max, elem) => {
                                if (elem.id === el.id) {
                                    return Math.max(max, newY + elem.height);
                                }
                                return Math.max(max, elem.y + elem.height);
                            }, 0);
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
    }
);

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
    // Debug mode state (controls ruler and other debug features)
    const [debugMode, setDebugMode] = useState(false);
    // Ruler enabled follows debug mode
    const rulerEnabled = debugMode;
    const [mouseCanvasPos, setMouseCanvasPos] = useState<{
        x: number;
        y: number;
        screenX: number;
        screenY: number;
    } | null>(null);
    // Debug panel options
    const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
    const [showGrid, setShowGrid] = useState(false);
    // Event logger
    const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
    const eventIdRef = useRef(0);

    const logDebugEvent = (
        type: string,
        x?: number,
        y?: number,
        target?: string,
        details?: string
    ) => {
        if (!debugMode) return;
        setDebugEvents((prev) => {
            const newEvent: DebugEvent = {
                id: eventIdRef.current++,
                timestamp: Date.now(),
                type,
                x,
                y,
                target,
                details,
            };
            const updated = [...prev, newEvent];
            // Keep only last 100 events
            return updated.slice(-100);
        });
    };

    const clearDebugEvents = () => setDebugEvents([]);

    // Smart Guides & Snapping features (Figma-like)
    const [smartGuidesEnabled, setSmartGuidesEnabled] = useState(true);
    const [snappingEnabled, setSnappingEnabled] = useState(true);
    const [showDistances, setShowDistances] = useState(false);
    const [gridSnapping, setGridSnapping] = useState(false);
    const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

    // Snapping helper - calculates snapped position and updates guides
    const handleElementDragWithSnap = (
        element: { x: number; y: number; width: number; height: number },
        rowY: number,
        rowId: string,
        elementId: string,
        rowPositions: Array<{ id: string; y: number; height: number; elements: EditorElement[] }>
    ) => {
        if (!snappingEnabled && !smartGuidesEnabled) {
            setActiveGuides([]);
            return { x: element.x, y: element.y };
        }

        const snapResult = calculateSnap(
            element,
            rowY,
            rowPositions,
            rowId,
            elementId,
            CANVAS_WIDTH,
            gridSnapping ? 10 : 5
        );

        // Apply grid snapping if enabled
        let finalX = snapResult.x !== null ? snapResult.x : element.x;
        let finalY = snapResult.y !== null ? snapResult.y : element.y;

        if (gridSnapping && snapResult.x === null) {
            finalX = Math.round(element.x / 10) * 10;
        }
        if (gridSnapping && snapResult.y === null) {
            finalY = Math.round(element.y / 10) * 10;
        }

        // Update guides for visualization
        if (smartGuidesEnabled) {
            setActiveGuides(snapResult.guides);
        }

        return { x: snappingEnabled ? finalX : element.x, y: snappingEnabled ? finalY : element.y };
    };

    const clearSnapGuides = () => setActiveGuides([]);

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

        console.log('E', e);

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
                if (coords.logicalY >= currentY && coords.logicalY <= currentY + row.height) {
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
                    type === 'text' ? 'Heading' : type === 'button' ? 'Button' : undefined
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
    const selectedRowIndex = store.rows.findIndex((r) => r.id === store.selectedRowId);
    if (store.selectedRowId && selectedRowIndex !== -1 && containerRef.current) {
        let currentY = 40;
        for (let i = 0; i < selectedRowIndex; i++) currentY += store.rows[i].height;
        contextMenuY = currentY * store.zoom;
        showContextMenu = true;
    }
    const contextMenuLeft =
        viewportW > 0 ? viewportW / 2 + (CANVAS_WIDTH * store.zoom) / 2 + 10 : 0;

    const paperScreenW = CANVAS_WIDTH * store.zoom;
    const paperScreenX = viewportW > 0 ? (viewportW - paperScreenW) / 2 : 0;
    const stageWidth = viewportW || 800;
    const stageHeight = viewportH || 600;

    // Ruler size constant
    const RULER_SIZE = 24;

    // Handle mouse move for ruler coordinate tracking
    const handleMouseMove = () => {
        if (!rulerEnabled) return;

        const stage = stageRef.current;
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        // Convert screen position to canvas logical coordinates
        const canvasX = (pointer.x - paperScreenX) / store.zoom;
        const canvasY = (pointer.y + scrollY) / store.zoom;

        setMouseCanvasPos({
            x: Math.round(canvasX),
            y: Math.round(canvasY),
            screenX: pointer.x,
            screenY: pointer.y,
        });
    };

    const handleMouseLeave = () => {
        setMouseCanvasPos(null);
    };

    // Calculate row Y positions using temporary heights during drag
    const rowPositions = store.rows.reduce(
        (acc, row) => {
            const height = getRowHeight(row.id, row.height);
            const y =
                acc.length === 0
                    ? 40
                    : acc[acc.length - 1].y +
                      getRowHeight(acc[acc.length - 1].id, acc[acc.length - 1].height);
            acc.push({ ...row, y, height });
            return acc;
        },
        [] as Array<{ y: number; height: number } & (typeof store.rows)[0]>
    );

    return (
        <div className="flex h-screen w-screen overflow-hidden font-sans bg-gray-100 text-gray-900 select-none flex-col">
            <TopBar
                width={CANVAS_WIDTH}
                height={totalHeight}
                debugMode={debugMode}
                onDebugModeChange={setDebugMode}
            />

            <div className="flex-1 flex overflow-hidden relative">
                <Sidebar
                    onAddRow={(layout) => store.addOrUpdateRowLayout(layout)}
                    onAddElement={(type, src) => store.addElement(store.selectedRowId!, type, src)}
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
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
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
                                        fill="#00ffff"
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
                                                    {...getFillProps(
                                                        row.backgroundColor || '#00ffff',
                                                        CANVAS_WIDTH
                                                    )}
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
                                                                (stageWidth - paperScreenX) /
                                                                    store.zoom,
                                                                row.y,
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
                                                                (stageWidth - paperScreenX) /
                                                                    store.zoom,
                                                                row.y + row.height,
                                                            ]}
                                                            stroke={PRIMARY_COLOR}
                                                            strokeWidth={1 / store.zoom}
                                                            listening={false}
                                                        />
                                                        {/* Add Row Button Top */}
                                                        <Group
                                                            x={CANVAS_WIDTH / 2}
                                                            y={
                                                                row.y -
                                                                ADD_BUTTON_OFFSET / store.zoom
                                                            }
                                                            onClick={(e) => {
                                                                e.cancelBubble = true;
                                                                const index = store.rows.findIndex(
                                                                    (r) => r.id === row.id
                                                                );
                                                                store.addOrUpdateRowLayout(
                                                                    [100],
                                                                    index,
                                                                    true
                                                                );
                                                            }}
                                                        >
                                                            {/* Hit area for easier clicking */}
                                                            <Circle
                                                                radius={10 / store.zoom}
                                                                fill="transparent"
                                                                listening={true}
                                                            />
                                                            <Line
                                                                points={[
                                                                    -7 / store.zoom,
                                                                    0,
                                                                    7 / store.zoom,
                                                                    0,
                                                                ]}
                                                                stroke={PRIMARY_COLOR}
                                                                strokeWidth={1.5 / store.zoom}
                                                                listening={false}
                                                            />
                                                            <Line
                                                                points={[
                                                                    0,
                                                                    -7 / store.zoom,
                                                                    0,
                                                                    7 / store.zoom,
                                                                ]}
                                                                stroke={PRIMARY_COLOR}
                                                                strokeWidth={1.5 / store.zoom}
                                                                listening={false}
                                                            />
                                                        </Group>
                                                        {/* Add Row Button Bottom */}
                                                        <Group
                                                            x={CANVAS_WIDTH / 2}
                                                            y={
                                                                row.y +
                                                                row.height +
                                                                ADD_BUTTON_OFFSET / store.zoom
                                                            }
                                                            onClick={(e) => {
                                                                e.cancelBubble = true;
                                                                const index = store.rows.findIndex(
                                                                    (r) => r.id === row.id
                                                                );
                                                                store.addOrUpdateRowLayout(
                                                                    [100],
                                                                    index + 1,
                                                                    true
                                                                );
                                                            }}
                                                        >
                                                            {/* Hit area for easier clicking */}
                                                            <Circle
                                                                radius={10 / store.zoom}
                                                                fill="transparent"
                                                                listening={true}
                                                            />
                                                            <Line
                                                                points={[
                                                                    -7 / store.zoom,
                                                                    0,
                                                                    7 / store.zoom,
                                                                    0,
                                                                ]}
                                                                stroke={PRIMARY_COLOR}
                                                                strokeWidth={1.5 / store.zoom}
                                                                listening={false}
                                                            />
                                                            <Line
                                                                points={[
                                                                    0,
                                                                    -7 / store.zoom,
                                                                    0,
                                                                    7 / store.zoom,
                                                                ]}
                                                                stroke={PRIMARY_COLOR}
                                                                strokeWidth={1.5 / store.zoom}
                                                                listening={false}
                                                            />
                                                        </Group>
                                                        {/* Row Badge */}
                                                        {(() => {
                                                            const logicalViewportLeft =
                                                                -paperScreenX / store.zoom;
                                                            const logicalViewportWidth =
                                                                stageWidth / store.zoom;
                                                            const logicalRightEdge =
                                                                logicalViewportLeft +
                                                                logicalViewportWidth;
                                                            const badgeW = 40 / store.zoom;
                                                            const badgeH = 20 / store.zoom;
                                                            const badgeX =
                                                                logicalRightEdge -
                                                                badgeW -
                                                                20 / store.zoom;
                                                            const badgeY =
                                                                row.y +
                                                                row.height -
                                                                badgeH -
                                                                5 / store.zoom;
                                                            return (
                                                                <>
                                                                    <Rect
                                                                        x={badgeX}
                                                                        y={badgeY}
                                                                        width={badgeW}
                                                                        height={badgeH}
                                                                        fill={PRIMARY_COLOR}
                                                                        cornerRadius={
                                                                            4 / store.zoom
                                                                        }
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
                                                            const logicalViewportLeft =
                                                                -paperScreenX / store.zoom;
                                                            const logicalViewportWidth =
                                                                stageWidth / store.zoom;
                                                            const logicalRightEdge =
                                                                logicalViewportLeft +
                                                                logicalViewportWidth;
                                                            const dragX =
                                                                logicalRightEdge - 30 / store.zoom;
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
                                                                        return {
                                                                            x: dragX,
                                                                            y: pos.y,
                                                                        };
                                                                    }}
                                                                    onDragStart={() => {
                                                                        const index =
                                                                            store.rows.findIndex(
                                                                                (r) =>
                                                                                    r.id === row.id
                                                                            );
                                                                        if (index !== -1) {
                                                                            // Store initial row index for reordering
                                                                        }
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        const currentY =
                                                                            e.target.y();
                                                                        // Calculate which row index we're over based on row positions
                                                                        let currentYAccum = 0;
                                                                        let newTargetIndex =
                                                                            store.rows.length;
                                                                        for (
                                                                            let i = 0;
                                                                            i < store.rows.length;
                                                                            i++
                                                                        ) {
                                                                            const rowH =
                                                                                store.rows[i]
                                                                                    .height;
                                                                            if (
                                                                                currentY <
                                                                                currentYAccum +
                                                                                    rowH / 2
                                                                            ) {
                                                                                newTargetIndex = i;
                                                                                break;
                                                                            }
                                                                            currentYAccum += rowH;
                                                                        }
                                                                        store.setReorderTarget(
                                                                            newTargetIndex
                                                                        );
                                                                    }}
                                                                    onDragEnd={() => {
                                                                        const fromIndex =
                                                                            store.rows.findIndex(
                                                                                (r) =>
                                                                                    r.id === row.id
                                                                            );
                                                                        const toIndex =
                                                                            store.reorderTargetIndex;
                                                                        if (
                                                                            fromIndex !== -1 &&
                                                                            toIndex !== null &&
                                                                            toIndex !== fromIndex
                                                                        ) {
                                                                            store.reorderRow(
                                                                                fromIndex,
                                                                                toIndex
                                                                            );
                                                                        }
                                                                        store.setReorderTarget(
                                                                            null
                                                                        );
                                                                    }}
                                                                >
                                                                    {[0, 1].map((i) =>
                                                                        [0, 1, 2].map((j) => (
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
                                                    typeof store.dragTarget.colIndex ===
                                                        'number' && (
                                                        <Rect
                                                            x={
                                                                (CANVAS_WIDTH *
                                                                    row.layout
                                                                        .slice(
                                                                            0,
                                                                            store.dragTarget
                                                                                .colIndex
                                                                        )
                                                                        .reduce(
                                                                            (a, b) => a + b,
                                                                            0
                                                                        )) /
                                                                100
                                                            }
                                                            y={row.y}
                                                            width={
                                                                (CANVAS_WIDTH *
                                                                    row.layout[
                                                                        store.dragTarget.colIndex
                                                                    ]) /
                                                                100
                                                            }
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
                                                                colX +=
                                                                    (CANVAS_WIDTH * row.layout[j]) /
                                                                    100;
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
                                                                    {isResizingColumn &&
                                                                        colW > 30 && (
                                                                            <>
                                                                                <Rect
                                                                                    x={
                                                                                        colX +
                                                                                        colW / 2 -
                                                                                        18 /
                                                                                            store.zoom
                                                                                    }
                                                                                    y={
                                                                                        row.y +
                                                                                        row.height -
                                                                                        24 /
                                                                                            store.zoom
                                                                                    }
                                                                                    width={
                                                                                        36 /
                                                                                        store.zoom
                                                                                    }
                                                                                    height={
                                                                                        18 /
                                                                                        store.zoom
                                                                                    }
                                                                                    fill={
                                                                                        COLUMN_GUIDE_COLOR
                                                                                    }
                                                                                    cornerRadius={
                                                                                        4 /
                                                                                        store.zoom
                                                                                    }
                                                                                    listening={
                                                                                        false
                                                                                    }
                                                                                />
                                                                                <Text
                                                                                    x={
                                                                                        colX +
                                                                                        colW / 2
                                                                                    }
                                                                                    y={
                                                                                        row.y +
                                                                                        row.height -
                                                                                        24 /
                                                                                            store.zoom +
                                                                                        9 /
                                                                                            store.zoom
                                                                                    }
                                                                                    text={`${Math.round(
                                                                                        pct
                                                                                    )}%`}
                                                                                    fontSize={
                                                                                        10 /
                                                                                        store.zoom
                                                                                    }
                                                                                    fill="white"
                                                                                    align="center"
                                                                                    verticalAlign="middle"
                                                                                    listening={
                                                                                        false
                                                                                    }
                                                                                />
                                                                            </>
                                                                        )}
                                                                    {i < row.layout.length - 1 && (
                                                                        <>
                                                                            <Line
                                                                                points={[
                                                                                    dividerX,
                                                                                    row.y,
                                                                                    dividerX,
                                                                                    row.y +
                                                                                        row.height,
                                                                                ]}
                                                                                stroke={
                                                                                    COLUMN_GUIDE_COLOR
                                                                                }
                                                                                strokeWidth={
                                                                                    1 / store.zoom
                                                                                }
                                                                                listening={false}
                                                                            />
                                                                            {/* Column Resize Handle */}
                                                                            <ColumnResizeHandle
                                                                                row={row}
                                                                                dividerIndex={i}
                                                                                dividerX={dividerX}
                                                                                store={store}
                                                                                onResizeStart={() =>
                                                                                    setIsResizingColumn(
                                                                                        true
                                                                                    )
                                                                                }
                                                                                onResizeEnd={() =>
                                                                                    setIsResizingColumn(
                                                                                        false
                                                                                    )
                                                                                }
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
                                                    const isSelected =
                                                        store.selectedElementId === el.id;
                                                    const isHovered =
                                                        store.hoveredElementId === el.id;

                                                    if (el.type === 'rect') {
                                                        const fillProps = getFillProps(
                                                            el.fill || '#6366f1',
                                                            el.width
                                                        );
                                                        return (
                                                            <Group key={el.id}>
                                                                <Rect
                                                                    x={el.x}
                                                                    y={row.y + el.y}
                                                                    width={el.width}
                                                                    height={el.height}
                                                                    {...fillProps}
                                                                    cornerRadius={4}
                                                                    stroke={
                                                                        isSelected || isHovered
                                                                            ? SELECTION_COLOR
                                                                            : undefined
                                                                    }
                                                                    strokeWidth={
                                                                        (isSelected || isHovered
                                                                            ? 1
                                                                            : 0) / store.zoom
                                                                    }
                                                                    draggable
                                                                    onClick={(e) => {
                                                                        e.cancelBubble = true;
                                                                        store.selectElement(
                                                                            row.id,
                                                                            el.id
                                                                        );
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        // Calculate raw position from drag
                                                                        const rawX = e.target.x();
                                                                        const rawY = e.target.y() - row.y;

                                                                        // Apply snapping
                                                                        const snapped = handleElementDragWithSnap(
                                                                            { x: rawX, y: rawY, width: el.width, height: el.height },
                                                                            row.y,
                                                                            row.id,
                                                                            el.id,
                                                                            rowPositions
                                                                        );

                                                                        // Auto-resize row if element is dragged to bottom
                                                                        // Use current displayed height (temp or original)
                                                                        const currentRowHeight = getRowHeight(row.id, row.height);
                                                                        const currentMaxBottom = row.elements.reduce(
                                                                            (max, elem) => {
                                                                                if (elem.id === el.id) {
                                                                                    return Math.max(max, snapped.y + elem.height);
                                                                                }
                                                                                return Math.max(max, elem.y + elem.height);
                                                                            },
                                                                            0
                                                                        );
                                                                        const newHeight = Math.max(150, currentMaxBottom + 40);
                                                                        // Update temp height if new height differs from current
                                                                        if (newHeight !== currentRowHeight) {
                                                                            setTempHeights((prev) => {
                                                                                const newMap = new Map(prev);
                                                                                newMap.set(row.id, newHeight);
                                                                                return newMap;
                                                                            });
                                                                        }
                                                                    }}
                                                                    onDragEnd={(e) => {
                                                                        // Calculate final position with snapping
                                                                        const rawX = e.target.x();
                                                                        const rawY = e.target.y() - row.y;
                                                                        const snapped = handleElementDragWithSnap(
                                                                            { x: rawX, y: rawY, width: el.width, height: el.height },
                                                                            row.y,
                                                                            row.id,
                                                                            el.id,
                                                                            rowPositions
                                                                        );

                                                                        store.updateElement(row.id, el.id, {
                                                                            x: snapped.x,
                                                                            y: snapped.y,
                                                                        });

                                                                        // Clear temp height and guides after update
                                                                        clearSnapGuides();
                                                                        setTimeout(() => {
                                                                            setTempHeights((prev) => {
                                                                                const newMap = new Map(prev);
                                                                                newMap.delete(row.id);
                                                                                return newMap;
                                                                            }
                                                                            );
                                                                        }, 0);
                                                                    }}
                                                                    onMouseEnter={() =>
                                                                        store.setHoveredElement(
                                                                            el.id
                                                                        )
                                                                    }
                                                                    onMouseLeave={() =>
                                                                        store.setHoveredElement(
                                                                            null
                                                                        )
                                                                    }
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
                                                        const fillProps = getFillProps(
                                                            el.fill || '#10b981',
                                                            el.width
                                                        );
                                                        return (
                                                            <Group key={el.id}>
                                                                <Circle
                                                                    x={el.x + el.width / 2}
                                                                    y={row.y + el.y + el.height / 2}
                                                                    radius={el.width / 2}
                                                                    {...fillProps}
                                                                    stroke={
                                                                        isSelected || isHovered
                                                                            ? SELECTION_COLOR
                                                                            : undefined
                                                                    }
                                                                    strokeWidth={
                                                                        (isSelected || isHovered
                                                                            ? 1
                                                                            : 0) / store.zoom
                                                                    }
                                                                    draggable
                                                                    onClick={(e) => {
                                                                        e.cancelBubble = true;
                                                                        store.selectElement(
                                                                            row.id,
                                                                            el.id
                                                                        );
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        // Calculate raw position from drag
                                                                        const rawX = e.target.x() - el.width / 2;
                                                                        const rawY = e.target.y() - row.y - el.height / 2;

                                                                        // Apply snapping
                                                                        const snapped = handleElementDragWithSnap(
                                                                            { x: rawX, y: rawY, width: el.width, height: el.height },
                                                                            row.y,
                                                                            row.id,
                                                                            el.id,
                                                                            rowPositions
                                                                        );

                                                                        // Auto-expand row if needed
                                                                        // Use current displayed height (temp or original)
                                                                        const currentRowHeight = getRowHeight(row.id, row.height);
                                                                        const currentMaxBottom = row.elements.reduce(
                                                                            (max, elem) => {
                                                                                if (elem.id === el.id) {
                                                                                    return Math.max(max, snapped.y + elem.height);
                                                                                }
                                                                                return Math.max(max, elem.y + elem.height);
                                                                            },
                                                                            0
                                                                        );
                                                                        const newHeight = Math.max(150, currentMaxBottom + 40);
                                                                        // Update temp height if new height differs from current
                                                                        if (newHeight !== currentRowHeight) {
                                                                            setTempHeights((prev) => {
                                                                                const newMap = new Map(prev);
                                                                                newMap.set(row.id, newHeight);
                                                                                return newMap;
                                                                            });
                                                                        }
                                                                    }}
                                                                    onDragEnd={(e) => {
                                                                        // Calculate final position with snapping
                                                                        const rawX = e.target.x() - el.width / 2;
                                                                        const rawY = e.target.y() - row.y - el.height / 2;
                                                                        const snapped = handleElementDragWithSnap(
                                                                            { x: rawX, y: rawY, width: el.width, height: el.height },
                                                                            row.y,
                                                                            row.id,
                                                                            el.id,
                                                                            rowPositions
                                                                        );

                                                                        store.updateElement(row.id, el.id, {
                                                                            x: snapped.x,
                                                                            y: snapped.y,
                                                                        });

                                                                        // Clear guides and temp height after drag ends
                                                                        clearSnapGuides();
                                                                        setTimeout(() => {
                                                                            setTempHeights((prev) => {
                                                                                const newMap = new Map(prev);
                                                                                newMap.delete(row.id);
                                                                                return newMap;
                                                                            });
                                                                        }, 0);
                                                                    }}
                                                                    onMouseEnter={() =>
                                                                        store.setHoveredElement(
                                                                            el.id
                                                                        )
                                                                    }
                                                                    onMouseLeave={() =>
                                                                        store.setHoveredElement(
                                                                            null
                                                                        )
                                                                    }
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
                                                                    stroke={
                                                                        isSelected || isHovered
                                                                            ? SELECTION_COLOR
                                                                            : undefined
                                                                    }
                                                                    strokeWidth={
                                                                        (isSelected || isHovered
                                                                            ? 1
                                                                            : 0) / store.zoom
                                                                    }
                                                                    draggable
                                                                    onClick={(e) => {
                                                                        e.cancelBubble = true;
                                                                        store.selectElement(
                                                                            row.id,
                                                                            el.id
                                                                        );
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        const newY =
                                                                            e.target.y() - row.y;
                                                                        const currentMaxBottom =
                                                                            row.elements.reduce(
                                                                                (max, elem) => {
                                                                                    if (
                                                                                        elem.id ===
                                                                                        el.id
                                                                                    ) {
                                                                                        return Math.max(
                                                                                            max,
                                                                                            newY +
                                                                                                elem.height
                                                                                        );
                                                                                    }
                                                                                    return Math.max(
                                                                                        max,
                                                                                        elem.y +
                                                                                            elem.height
                                                                                    );
                                                                                },
                                                                                0
                                                                            );
                                                                        const newHeight = Math.max(
                                                                            150,
                                                                            currentMaxBottom + 40
                                                                        );
                                                                        if (
                                                                            newHeight > row.height
                                                                        ) {
                                                                            store.updateRowHeight(
                                                                                row.id,
                                                                                newHeight
                                                                            );
                                                                        }
                                                                    }}
                                                                    onDragEnd={(e) => {
                                                                        store.updateElement(
                                                                            row.id,
                                                                            el.id,
                                                                            {
                                                                                x: e.target.x(),
                                                                                y:
                                                                                    e.target.y() -
                                                                                    row.y,
                                                                            }
                                                                        );
                                                                    }}
                                                                    onMouseEnter={() =>
                                                                        store.setHoveredElement(
                                                                            el.id
                                                                        )
                                                                    }
                                                                    onMouseLeave={() =>
                                                                        store.setHoveredElement(
                                                                            null
                                                                        )
                                                                    }
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
                                                        const fillProps = getFillProps(
                                                            el.fill || '#3b82f6',
                                                            el.width
                                                        );
                                                        return (
                                                            <Group key={el.id}>
                                                                <Rect
                                                                    x={el.x}
                                                                    y={row.y + el.y}
                                                                    width={el.width}
                                                                    height={el.height}
                                                                    {...fillProps}
                                                                    cornerRadius={6}
                                                                    stroke={
                                                                        isSelected || isHovered
                                                                            ? SELECTION_COLOR
                                                                            : undefined
                                                                    }
                                                                    strokeWidth={
                                                                        (isSelected || isHovered
                                                                            ? 1
                                                                            : 0) / store.zoom
                                                                    }
                                                                    draggable
                                                                    onClick={(e) => {
                                                                        e.cancelBubble = true;
                                                                        store.selectElement(
                                                                            row.id,
                                                                            el.id
                                                                        );
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        const newY =
                                                                            e.target.y() - row.y;
                                                                        const currentMaxBottom =
                                                                            row.elements.reduce(
                                                                                (max, elem) => {
                                                                                    if (
                                                                                        elem.id ===
                                                                                        el.id
                                                                                    ) {
                                                                                        return Math.max(
                                                                                            max,
                                                                                            newY +
                                                                                                elem.height
                                                                                        );
                                                                                    }
                                                                                    return Math.max(
                                                                                        max,
                                                                                        elem.y +
                                                                                            elem.height
                                                                                    );
                                                                                },
                                                                                0
                                                                            );
                                                                        const newHeight = Math.max(
                                                                            150,
                                                                            currentMaxBottom + 40
                                                                        );
                                                                        if (
                                                                            newHeight > row.height
                                                                        ) {
                                                                            store.updateRowHeight(
                                                                                row.id,
                                                                                newHeight
                                                                            );
                                                                        }
                                                                    }}
                                                                    onDragEnd={(e) => {
                                                                        const newY =
                                                                            e.target.y() - row.y;
                                                                        store.updateElement(
                                                                            row.id,
                                                                            el.id,
                                                                            {
                                                                                x: e.target.x(),
                                                                                y: newY,
                                                                            }
                                                                        );
                                                                        // Clear temp height after update
                                                                        setTimeout(() => {
                                                                            setTempHeights(
                                                                                (prev) => {
                                                                                    const newMap =
                                                                                        new Map(
                                                                                            prev
                                                                                        );
                                                                                    newMap.delete(
                                                                                        row.id
                                                                                    );
                                                                                    return newMap;
                                                                                }
                                                                            );
                                                                        }, 0);
                                                                    }}
                                                                    onMouseEnter={() =>
                                                                        store.setHoveredElement(
                                                                            el.id
                                                                        )
                                                                    }
                                                                    onMouseLeave={() =>
                                                                        store.setHoveredElement(
                                                                            null
                                                                        )
                                                                    }
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
                                                        const fillProps = getFillProps(
                                                            el.fill || '#f59e0b',
                                                            el.width
                                                        );
                                                        // Triangle: top center, bottom right, bottom left (relative to Group)
                                                        const points = [
                                                            el.width / 2,
                                                            0, // top center
                                                            el.width,
                                                            el.height, // bottom right
                                                            0,
                                                            el.height, // bottom left
                                                        ];
                                                        return (
                                                            <Group key={el.id}>
                                                                {/* Shape group - positioned and draggable */}
                                                                <Group
                                                                    x={el.x}
                                                                    y={row.y + el.y}
                                                                    draggable
                                                                    onClick={(e) => {
                                                                        e.cancelBubble = true;
                                                                        store.selectElement(
                                                                            row.id,
                                                                            el.id
                                                                        );
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        const newY =
                                                                            e.target.y() - row.y;
                                                                        const currentMaxBottom =
                                                                            row.elements.reduce(
                                                                                (max, elem) => {
                                                                                    if (
                                                                                        elem.id ===
                                                                                        el.id
                                                                                    ) {
                                                                                        return Math.max(
                                                                                            max,
                                                                                            newY +
                                                                                                elem.height
                                                                                        );
                                                                                    }
                                                                                    return Math.max(
                                                                                        max,
                                                                                        elem.y +
                                                                                            elem.height
                                                                                    );
                                                                                },
                                                                                0
                                                                            );
                                                                        const newHeight = Math.max(
                                                                            150,
                                                                            currentMaxBottom + 40
                                                                        );
                                                                        if (newHeight > row.height) {
                                                                            store.updateRowHeight(
                                                                                row.id,
                                                                                newHeight
                                                                            );
                                                                        }
                                                                    }}
                                                                    onDragEnd={(e) => {
                                                                        const newY =
                                                                            e.target.y() - row.y;
                                                                        store.updateElement(
                                                                            row.id,
                                                                            el.id,
                                                                            {
                                                                                x: e.target.x(),
                                                                                y: newY,
                                                                            }
                                                                        );
                                                                    }}
                                                                    onMouseEnter={() =>
                                                                        store.setHoveredElement(el.id)
                                                                    }
                                                                    onMouseLeave={() =>
                                                                        store.setHoveredElement(null)
                                                                    }
                                                                >
                                                                    {/* Transparent hit area for click/drag detection */}
                                                                    <Rect
                                                                        x={0}
                                                                        y={0}
                                                                        width={el.width}
                                                                        height={el.height}
                                                                        fill="transparent"
                                                                    />
                                                                    <Line
                                                                        points={points}
                                                                        closed={true}
                                                                        {...fillProps}
                                                                        stroke={
                                                                            isSelected || isHovered
                                                                                ? SELECTION_COLOR
                                                                                : undefined
                                                                        }
                                                                        strokeWidth={
                                                                            (isSelected || isHovered
                                                                                ? 1
                                                                                : 0) / store.zoom
                                                                        }
                                                                        listening={false}
                                                                    />
                                                                </Group>
                                                                {/* Resize handles - outside positioned group, use absolute coords */}
                                                                {isSelected && (
                                                                    <>
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
                                                        const fillProps = getFillProps(
                                                            el.fill || '#ec4899',
                                                            el.width
                                                        );
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
                                                            const x =
                                                                cx + Math.cos(rot) * outerRadius;
                                                            const y =
                                                                cy + Math.sin(rot) * outerRadius;
                                                            points.push(x, y);
                                                            rot += step;
                                                            const x2 =
                                                                cx + Math.cos(rot) * innerRadius;
                                                            const y2 =
                                                                cy + Math.sin(rot) * innerRadius;
                                                            points.push(x2, y2);
                                                            rot += step;
                                                        }
                                                        points.push(cx, cy - outerRadius);
                                                        return (
                                                            <Group key={el.id}>
                                                                {/* Shape group - positioned and draggable */}
                                                                <Group
                                                                    x={el.x}
                                                                    y={row.y + el.y}
                                                                    draggable
                                                                    onClick={(e) => {
                                                                        e.cancelBubble = true;
                                                                        store.selectElement(
                                                                            row.id,
                                                                            el.id
                                                                        );
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        const newY =
                                                                            e.target.y() - row.y;
                                                                        const currentMaxBottom =
                                                                            row.elements.reduce(
                                                                                (max, elem) => {
                                                                                    if (
                                                                                        elem.id ===
                                                                                        el.id
                                                                                    ) {
                                                                                        return Math.max(
                                                                                            max,
                                                                                            newY +
                                                                                                elem.height
                                                                                        );
                                                                                    }
                                                                                    return Math.max(
                                                                                        max,
                                                                                        elem.y +
                                                                                            elem.height
                                                                                    );
                                                                                },
                                                                                0
                                                                            );
                                                                        const newHeight = Math.max(
                                                                            150,
                                                                            currentMaxBottom + 40
                                                                        );
                                                                        if (newHeight > row.height) {
                                                                            store.updateRowHeight(
                                                                                row.id,
                                                                                newHeight
                                                                            );
                                                                        }
                                                                    }}
                                                                    onDragEnd={(e) => {
                                                                        const newY =
                                                                            e.target.y() - row.y;
                                                                        store.updateElement(
                                                                            row.id,
                                                                            el.id,
                                                                            {
                                                                                x: e.target.x(),
                                                                                y: newY,
                                                                            }
                                                                        );
                                                                    }}
                                                                    onMouseEnter={() =>
                                                                        store.setHoveredElement(el.id)
                                                                    }
                                                                    onMouseLeave={() =>
                                                                        store.setHoveredElement(null)
                                                                    }
                                                                >
                                                                    {/* Transparent hit area for click/drag detection */}
                                                                    <Rect
                                                                        x={0}
                                                                        y={0}
                                                                        width={el.width}
                                                                        height={el.height}
                                                                        fill="transparent"
                                                                    />
                                                                    <Line
                                                                        points={points}
                                                                        closed={true}
                                                                        {...fillProps}
                                                                        stroke={
                                                                            isSelected || isHovered
                                                                                ? SELECTION_COLOR
                                                                                : undefined
                                                                        }
                                                                    strokeWidth={
                                                                        (isSelected || isHovered
                                                                            ? 1
                                                                            : 0) / store.zoom
                                                                    }
                                                                    listening={false}
                                                                />
                                                                </Group>
                                                                {/* Resize handles - outside positioned group, use absolute coords */}
                                                                {isSelected && (
                                                                    <>
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
                                                        const fillProps = getFillProps(
                                                            el.fill || '#3b82f6',
                                                            el.width
                                                        );
                                                        const centerX = el.width / 2;
                                                        const centerY = el.height / 2;
                                                        const sides = 6;
                                                        const radius = el.width / 2;
                                                        const points: number[] = [];
                                                        for (let i = 0; i <= sides; i++) {
                                                            const angle = (i * 2 * Math.PI) / sides;
                                                            const x =
                                                                centerX + radius * Math.cos(angle);
                                                            const y =
                                                                centerY + radius * Math.sin(angle);
                                                            points.push(x, y);
                                                        }
                                                        return (
                                                            <Group key={el.id}>
                                                                {/* Shape group - positioned and draggable */}
                                                                <Group
                                                                    x={el.x}
                                                                    y={row.y + el.y}
                                                                    draggable
                                                                    onClick={(e) => {
                                                                        e.cancelBubble = true;
                                                                        store.selectElement(
                                                                            row.id,
                                                                            el.id
                                                                        );
                                                                    }}
                                                                    onDragMove={(e) => {
                                                                        const newY =
                                                                            e.target.y() - row.y;
                                                                        const currentMaxBottom =
                                                                            row.elements.reduce(
                                                                                (max, elem) => {
                                                                                    if (
                                                                                        elem.id ===
                                                                                        el.id
                                                                                    ) {
                                                                                        return Math.max(
                                                                                            max,
                                                                                            newY +
                                                                                                elem.height
                                                                                        );
                                                                                    }
                                                                                    return Math.max(
                                                                                        max,
                                                                                        elem.y +
                                                                                            elem.height
                                                                                    );
                                                                                },
                                                                                0
                                                                            );
                                                                        const newHeight = Math.max(
                                                                            150,
                                                                            currentMaxBottom + 40
                                                                        );
                                                                        if (newHeight > row.height) {
                                                                            store.updateRowHeight(
                                                                                row.id,
                                                                                newHeight
                                                                            );
                                                                        }
                                                                    }}
                                                                    onDragEnd={(e) => {
                                                                        const newY =
                                                                            e.target.y() - row.y;
                                                                        store.updateElement(
                                                                            row.id,
                                                                            el.id,
                                                                            {
                                                                                x: e.target.x(),
                                                                                y: newY,
                                                                            }
                                                                        );
                                                                    }}
                                                                    onMouseEnter={() =>
                                                                        store.setHoveredElement(el.id)
                                                                    }
                                                                    onMouseLeave={() =>
                                                                        store.setHoveredElement(null)
                                                                    }
                                                                >
                                                                    {/* Transparent hit area for click/drag detection */}
                                                                    <Rect
                                                                        x={0}
                                                                        y={0}
                                                                        width={el.width}
                                                                        height={el.height}
                                                                        fill="transparent"
                                                                    />
                                                                    <Line
                                                                        points={points}
                                                                        closed={true}
                                                                        {...fillProps}
                                                                        stroke={
                                                                            isSelected || isHovered
                                                                                ? SELECTION_COLOR
                                                                                : undefined
                                                                        }
                                                                        strokeWidth={
                                                                            (isSelected || isHovered
                                                                                ? 1
                                                                                : 0) / store.zoom
                                                                        }
                                                                        listening={false}
                                                                    />
                                                                </Group>
                                                                {/* Resize handles - outside positioned group, use absolute coords */}
                                                                {isSelected && (
                                                                    <>
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
                                                                onRowHeightChange={(
                                                                    rowId,
                                                                    height
                                                                ) => {
                                                                    if (height > 0) {
                                                                        setTempHeights((prev) => {
                                                                            const newMap = new Map(
                                                                                prev
                                                                            );
                                                                            newMap.set(
                                                                                rowId,
                                                                                height
                                                                            );
                                                                            return newMap;
                                                                        });
                                                                    } else {
                                                                        setTempHeights((prev) => {
                                                                            const newMap = new Map(
                                                                                prev
                                                                            );
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

                                    {/* Row Resize Handle - rendered AFTER all rows to be on top */}
                                    {(() => {
                                        const selectedRow = rowPositions.find(
                                            (r) => r.id === store.selectedRowId
                                        );
                                        if (!selectedRow) return null;
                                        return (
                                            <RowResizeHandle
                                                row={selectedRow}
                                                store={store}
                                                onHeightChange={(height) => {
                                                    if (height > 0) {
                                                        setTempHeights((prev) => {
                                                            const newMap = new Map(prev);
                                                            newMap.set(selectedRow.id, height);
                                                            return newMap;
                                                        });
                                                    } else {
                                                        setTempHeights((prev) => {
                                                            const newMap = new Map(prev);
                                                            newMap.delete(selectedRow.id);
                                                            return newMap;
                                                        });
                                                    }
                                                }}
                                            />
                                        );
                                    })()}

                                    {/* Debug: Grid Overlay */}
                                    <GridOverlay
                                        enabled={debugMode && showGrid}
                                        canvasWidth={CANVAS_WIDTH}
                                        canvasHeight={totalHeight + 100}
                                        gridSpacing={50}
                                        zoom={store.zoom}
                                    />

                                    {/* Debug: Bounding Boxes */}
                                    <BoundingBoxes
                                        enabled={debugMode && showBoundingBoxes}
                                        rows={rowPositions}
                                        canvasWidth={CANVAS_WIDTH}
                                        zoom={store.zoom}
                                    />

                                    {/* Debug: Snap Guides */}
                                    <SnapGuides
                                        enabled={debugMode}
                                        rows={rowPositions}
                                        selectedElementId={store.selectedElementId}
                                        selectedRowId={store.selectedRowId}
                                        canvasWidth={CANVAS_WIDTH}
                                        canvasHeight={totalHeight + 100}
                                        zoom={store.zoom}
                                    />

                                    {/* Debug: Distance Indicators */}
                                    <DistanceIndicators
                                        enabled={debugMode}
                                        rows={rowPositions}
                                        selectedElementId={store.selectedElementId}
                                        selectedRowId={store.selectedRowId}
                                        canvasWidth={CANVAS_WIDTH}
                                        zoom={store.zoom}
                                    />

                                    {/* Smart Guides (Figma-like alignment guides) */}
                                    <SmartGuides
                                        enabled={smartGuidesEnabled}
                                        guides={activeGuides}
                                        zoom={store.zoom}
                                    />

                                    {/* Distance Measurement (Figma-like spacing display) */}
                                    <DistanceMeasurement
                                        enabled={showDistances}
                                        rows={rowPositions}
                                        selectedElementId={store.selectedElementId}
                                        selectedRowId={store.selectedRowId}
                                        canvasWidth={CANVAS_WIDTH}
                                        zoom={store.zoom}
                                    />
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

                    {/* Rulers */}
                    {rulerEnabled && (
                        <>
                            {/* Horizontal Ruler (Top) */}
                            <div
                                className="absolute bg-gray-800 text-white text-xs select-none"
                                style={{
                                    top: 0,
                                    left: RULER_SIZE,
                                    width: stageWidth - RULER_SIZE,
                                    height: RULER_SIZE,
                                    overflow: 'hidden',
                                    zIndex: 100,
                                }}
                            >
                                <svg width={stageWidth - RULER_SIZE} height={RULER_SIZE}>
                                    {/* Generate tick marks based on canvas coordinates */}
                                    {(() => {
                                        const ticks = [];
                                        const startX =
                                            -Math.floor(paperScreenX / store.zoom / 50) * 50;
                                        const endX =
                                            startX +
                                            Math.ceil(stageWidth / store.zoom / 50) * 50 +
                                            100;

                                        for (let x = startX; x <= endX; x += 10) {
                                            const screenX = paperScreenX + x * store.zoom;
                                            if (screenX < RULER_SIZE || screenX > stageWidth)
                                                continue;

                                            const isMajor = x % 100 === 0;
                                            const isMedium = x % 50 === 0;
                                            const tickHeight = isMajor ? 16 : isMedium ? 10 : 5;

                                            ticks.push(
                                                <g key={x}>
                                                    <line
                                                        x1={screenX - RULER_SIZE}
                                                        y1={RULER_SIZE}
                                                        x2={screenX - RULER_SIZE}
                                                        y2={RULER_SIZE - tickHeight}
                                                        stroke="#9ca3af"
                                                        strokeWidth={1}
                                                    />
                                                    {isMajor && (
                                                        <text
                                                            x={screenX - RULER_SIZE + 2}
                                                            y={10}
                                                            fill="#e5e7eb"
                                                            fontSize={9}
                                                        >
                                                            {x}
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        }
                                        return ticks;
                                    })()}
                                    {/* Mouse position indicator */}
                                    {mouseCanvasPos && (
                                        <line
                                            x1={mouseCanvasPos.screenX - RULER_SIZE}
                                            y1={0}
                                            x2={mouseCanvasPos.screenX - RULER_SIZE}
                                            y2={RULER_SIZE}
                                            stroke="#ef4444"
                                            strokeWidth={1}
                                        />
                                    )}
                                </svg>
                            </div>

                            {/* Vertical Ruler (Left) */}
                            <div
                                className="absolute bg-gray-800 text-white text-xs select-none"
                                style={{
                                    top: RULER_SIZE,
                                    left: 0,
                                    width: RULER_SIZE,
                                    height: stageHeight - RULER_SIZE,
                                    overflow: 'hidden',
                                    zIndex: 100,
                                }}
                            >
                                <svg width={RULER_SIZE} height={stageHeight - RULER_SIZE}>
                                    {/* Generate tick marks based on canvas coordinates */}
                                    {(() => {
                                        const ticks = [];
                                        const startY = Math.floor(scrollY / store.zoom / 50) * 50;
                                        const endY =
                                            startY +
                                            Math.ceil(stageHeight / store.zoom / 50) * 50 +
                                            100;

                                        for (let y = startY; y <= endY; y += 10) {
                                            const screenY = y * store.zoom - scrollY;
                                            if (screenY < 0 || screenY > stageHeight) continue;

                                            const isMajor = y % 100 === 0;
                                            const isMedium = y % 50 === 0;
                                            const tickWidth = isMajor ? 16 : isMedium ? 10 : 5;

                                            ticks.push(
                                                <g key={y}>
                                                    <line
                                                        x1={RULER_SIZE}
                                                        y1={screenY}
                                                        x2={RULER_SIZE - tickWidth}
                                                        y2={screenY}
                                                        stroke="#9ca3af"
                                                        strokeWidth={1}
                                                    />
                                                    {isMajor && (
                                                        <text
                                                            x={2}
                                                            y={screenY + 10}
                                                            fill="#e5e7eb"
                                                            fontSize={9}
                                                        >
                                                            {y}
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        }
                                        return ticks;
                                    })()}
                                    {/* Mouse position indicator */}
                                    {mouseCanvasPos && (
                                        <line
                                            x1={0}
                                            y1={mouseCanvasPos.screenY}
                                            x2={RULER_SIZE}
                                            y2={mouseCanvasPos.screenY}
                                            stroke="#ef4444"
                                            strokeWidth={1}
                                        />
                                    )}
                                </svg>
                            </div>

                            {/* Corner box */}
                            <div
                                className="absolute bg-gray-900"
                                style={{
                                    top: 0,
                                    left: 0,
                                    width: RULER_SIZE,
                                    height: RULER_SIZE,
                                    zIndex: 101,
                                }}
                            />

                            {/* Coordinate Hint following mouse */}
                            {mouseCanvasPos && (
                                <div
                                    className="absolute pointer-events-none bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap"
                                    style={{
                                        left: mouseCanvasPos.screenX + 15,
                                        top: mouseCanvasPos.screenY + 15,
                                        zIndex: 200,
                                    }}
                                >
                                    <span className="text-red-400">x:</span> {mouseCanvasPos.x}
                                    <span className="ml-2 text-green-400">y:</span>{' '}
                                    {mouseCanvasPos.y}
                                </div>
                            )}
                        </>
                    )}

                    {/* Alignment Toolbar (Figma-like) */}
                    <AlignmentToolbar
                        smartGuidesEnabled={smartGuidesEnabled}
                        onToggleSmartGuides={() => setSmartGuidesEnabled(!smartGuidesEnabled)}
                        snappingEnabled={snappingEnabled}
                        onToggleSnapping={() => setSnappingEnabled(!snappingEnabled)}
                        showDistances={showDistances}
                        onToggleDistances={() => setShowDistances(!showDistances)}
                        gridSnapping={gridSnapping}
                        onToggleGridSnapping={() => setGridSnapping(!gridSnapping)}
                    />

                    <ZoomControls zoom={store.zoom} setZoom={(z) => store.setZoom(z)} />

                    {/* Debug: FPS Counter */}
                    <FPSCounter enabled={debugMode} />

                    {/* Debug: Panel */}
                    <DebugPanel
                        enabled={debugMode}
                        store={store}
                        stageRef={stageRef}
                        viewportW={viewportW}
                        viewportH={viewportH}
                        scrollY={scrollY}
                        events={debugEvents}
                        onClearEvents={clearDebugEvents}
                        showBoundingBoxes={showBoundingBoxes}
                        onToggleBoundingBoxes={() => setShowBoundingBoxes(!showBoundingBoxes)}
                        showGrid={showGrid}
                        onToggleGrid={() => setShowGrid(!showGrid)}
                    />
                </div>
            </div>
        </div>
    );
});

export default KonvaEditor;
