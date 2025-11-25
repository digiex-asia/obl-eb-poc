import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Stage, Layer, Rect, Circle, Text, Image as KonvaImage, Group } from 'react-konva';
import OldLaggyStore, { LaggyState } from '../stores/OldLaggyStore';
import {
    CANVAS_WIDTH,
    SELECTION_COLOR,
    HANDLE_SIZE,
    EditorRow,
    EditorElement,
} from '../stores/types';
import { Sidebar } from './shared/Sidebar';
import { TopBar } from './shared/TopBar';
import { ZoomControls } from './shared/ZoomControls';
import { Zap, Copy } from 'lucide-react';

// Intentional bad practice: Creating a new store instance inside the module scope
// but we will use it in the component.
const store = new OldLaggyStore();

// Bad Practice Component: Takes the WHOLE state as props to force re-renders
// whenever ANYTHING changes in the store.
const LaggyRow = ({
    row,
    fullState, // PASSING THE FULL STATE DOWN!
    onSelect,
    onChangeHeight
}: {
    row: EditorRow;
    fullState: LaggyState;
    onSelect: (id: string) => void;
    onChangeHeight: (id: string, h: number) => void;
}) => {
    // Simulate expensive render logic
    const start = performance.now();
    while (performance.now() - start < 2) {
        // Busy wait 2ms per row render
    }

    const isSelected = fullState.selectedRowId === row.id;

    return (
        <Group y={row.y} onClick={() => onSelect(row.id)}>
            {/* Background */}
            <Rect
                width={CANVAS_WIDTH}
                height={row.height}
                fill={row.backgroundColor}
                stroke={isSelected ? SELECTION_COLOR : undefined}
                strokeWidth={isSelected ? 2 : 0}
            />

            {/* Elements - Passing full state again! */}
            {row.elements.map((el) => (
                <LaggyElement
                    key={el.id}
                    element={el}
                    rowId={row.id}
                    fullState={fullState} // Prop drilling the massive object
                />
            ))}

            {/* Resize Handle */}
            <Rect
                x={CANVAS_WIDTH / 2 - 20}
                y={row.height - 10}
                width={40}
                height={10}
                fill="#ccc"
                draggable
                onDragMove={(e) => {
                    // In the bad editor, we commit state on every drag move!
                    // This triggers the deep clone + 15ms delay in the store
                    onChangeHeight(row.id, e.target.y() + 5);
                }}
            />
        </Group>
    );
};

const LaggyElement = ({
    element,
    rowId,
    fullState
}: {
    element: EditorElement;
    rowId: string;
    fullState: LaggyState;
}) => {
    const isSelected = fullState.selectedElementId === element.id;

    // Inline object creation to break potential memoization
    const dragBoundFunc = (pos: any) => ({ x: pos.x, y: pos.y });

    return (
        <Group
            x={element.x}
            y={element.y}
            draggable
            dragBoundFunc={dragBoundFunc}
            onDragMove={(e) => {
                store.updateElement(rowId, element.id, {
                    x: e.target.x(),
                    y: e.target.y(),
                });
            }}
            onDragEnd={(e) => {
                store.updateElement(rowId, element.id, {
                    x: e.target.x(),
                    y: e.target.y(),
                });
            }}
            onClick={(e) => {
                e.cancelBubble = true;
                store.setSelection(rowId, element.id);
            }}
        >
            <Rect
                width={element.width}
                height={element.height}
                fill={element.fill}
                stroke={isSelected ? SELECTION_COLOR : undefined}
                strokeWidth={isSelected ? 2 : 0}
            />
            {/* Text simulation */}
            {element.type === 'text' && (
                <Text text={element.text || 'Text'} padding={5} />
            )}
            {/* Handles - rendering them unconditionally but hidden creates more nodes */}
            {isSelected && (
                <Circle
                    x={element.width}
                    y={element.height}
                    radius={5}
                    fill="blue"
                    draggable
                    onDragMove={(e) => {
                        const newW = e.target.x();
                        const newH = e.target.y();
                        // Trigger heavy update loop
                        store.updateElement(rowId, element.id, {
                            width: Math.max(10, newW),
                            height: Math.max(10, newH)
                        });
                    }}
                />
            )}
        </Group>
    );
};

const OBLOldEditor = observer(({ onSwitchBack }: { onSwitchBack: () => void }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewportW, setViewportW] = useState(0);
    const [viewportH, setViewportH] = useState(0);

    // Calculate layout positions manually in render (expensive)
    let currentY = 50;
    const rowsWithY = store.state.rows.map(row => {
        const r = { ...row, y: currentY };
        currentY += row.height;
        return r;
    });

    // Calculate total height for canvas based on content, ensuring it expands
    const totalContentHeight = currentY + 100; // + padding

    useEffect(() => {
        if (containerRef.current) {
            setViewportW(containerRef.current.offsetWidth);
            setViewportH(containerRef.current.offsetHeight);
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

    return (
        <div className="flex h-full flex-col bg-gray-100">
            <div className="bg-red-100 p-2 text-center text-red-800 text-sm font-bold border-b border-red-200">
                ⚠️ LEGACY SIMULATION MODE: Simulating OBL Old Editor Lag (Deep Clones + Monolithic State)
            </div>

            <TopBar title="Legacy Editor (Slow)">
                <button
                    onClick={onSwitchBack}
                    className="ml-4 flex items-center gap-2 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                >
                    <Zap size={16} />
                    Switch to Optimized
                </button>
            </TopBar>

            <div className="flex flex-1 overflow-hidden">
                <Sidebar
                    onAddRow={(layout) => store.addOrUpdateRowLayout(layout)}
                    onAddElement={(type, src) => {
                        if (store.state.selectedRowId) {
                            store.addElement(store.state.selectedRowId, type, src);
                        } else {
                            alert('Please select a row first');
                        }
                    }}
                    onAddSpecialBlock={(type) => store.addSpecialBlock(type)}
                />

                <div
                    ref={containerRef}
                    className="flex-1 relative overflow-scroll bg-gray-200 flex justify-center p-8"
                >
                    <Stage
                        width={Math.max(viewportW, CANVAS_WIDTH + 100)}
                        height={Math.max(viewportH, totalContentHeight * store.state.zoom)}
                        scaleX={store.state.zoom}
                        scaleY={store.state.zoom}
                    >
                        <Layer>
                            <Rect
                                y={0}
                                width={CANVAS_WIDTH}
                                height={currentY}
                                fill="white"
                                shadowColor="black"
                                shadowBlur={20}
                                shadowOpacity={0.1}
                                x={(viewportW - CANVAS_WIDTH * store.state.zoom) / 2 / store.state.zoom}
                            />

                            <Group x={(viewportW - CANVAS_WIDTH * store.state.zoom) / 2 / store.state.zoom}>
                                {rowsWithY.map(row => (
                                    <LaggyRow
                                        key={row.id}
                                        row={row}
                                        fullState={store.state} // PASSING FULL STATE
                                        onSelect={(id) => store.setSelection(id, null)}
                                        onChangeHeight={(id, h) => store.updateRowHeight(id, h)}
                                    />
                                ))}
                            </Group>
                        </Layer>
                    </Stage>

                    {/* Duplicate Row Action (Floating) */}
                    {store.state.selectedRowId && !store.state.selectedElementId && (
                        <div className="absolute top-20 right-8 flex flex-col gap-2 bg-white p-2 rounded shadow-lg border border-gray-200">
                             <div className="text-xs font-bold text-gray-500 mb-1">Row Actions</div>
                             <button
                                onClick={() => store.duplicateSelection()}
                                className="p-2 hover:bg-blue-50 rounded text-gray-600 hover:text-blue-600 transition-colors group relative"
                                title="Duplicate Row"
                            >
                                <Copy size={18} />
                            </button>
                        </div>
                    )}
                </div>

                <ZoomControls
                    zoom={store.state.zoom}
                    setZoom={(z) => store.setZoom(z)}
                />
            </div>
        </div>
    );
});

export default OBLOldEditor;
