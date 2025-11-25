import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import EditorStore from '../common/stores/EditorStore';
import { CANVAS_WIDTH } from '../common/stores/types';
import { Sidebar } from './shared/Sidebar';
import { TopBar } from './shared/TopBar';
import { ZoomControls } from './shared/ZoomControls';
import { ColorPicker } from './shared/ColorPicker';
import { Copy, Trash2, Palette } from 'lucide-react';

const store = new EditorStore();

const SkiaEditor = observer(() => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [viewportW, setViewportW] = useState(0);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const totalHeight = store.rows.reduce((acc, r) => acc + r.height, 0);
    const totalLogicalHeight = Math.max(800, totalHeight + 100) * store.zoom;

    useEffect(() => {
        if (containerRef.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    setViewportW(entry.contentRect.width);
                }
            });
            resizeObserver.observe(containerRef.current);
            return () => resizeObserver.disconnect();
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

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        store.setDragTarget(null);

        const type = e.dataTransfer.getData('type');
        const layout = e.dataTransfer.getData('layout');
        const src = e.dataTransfer.getData('src');

        if (layout) {
            store.addOrUpdateRowLayout(JSON.parse(layout), undefined, true);
        } else if (type && store.selectedRowId) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = (e.clientX - rect.left - rect.width / 2 + CANVAS_WIDTH * store.zoom / 2) / store.zoom;
            const y = (e.clientY - rect.top) / store.zoom;
            store.addElement(
                store.selectedRowId,
                type as any,
                src || undefined,
                x,
                y,
                type === 'text' ? 'Heading' : type === 'button' ? 'Button' : undefined
            );
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDragLeave = () => {
        store.setDragTarget(null);
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

    return (
        <div className="flex h-screen w-screen overflow-hidden font-sans bg-gray-100 text-gray-900 select-none flex-col">
            <TopBar width={CANVAS_WIDTH} height={totalHeight} />

            <div className="flex-1 flex overflow-hidden relative">
                <Sidebar
                    onAddRow={(layout) =>
                        store.addOrUpdateRowLayout(layout)
                    }
                    onAddElement={(type, src) =>
                        store.addElement(store.selectedRowId!, type, src)
                    }
                    onAddSpecialBlock={(type) =>
                        store.addSpecialBlock(type)
                    }
                />

                <div
                    ref={containerRef}
                    className="flex-1 bg-gray-200 h-full overflow-auto relative"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => store.selectRow(null)}
                >
                    <div
                        style={{
                            height: totalLogicalHeight,
                            width: '1px',
                            position: 'absolute',
                            zIndex: -1,
                        }}
                    />
                    <canvas
                        ref={canvasRef}
                        style={{
                            display: 'block',
                            position: 'sticky',
                            top: 0,
                            left: 0,
                        }}
                        className="cursor-pointer shadow-sm"
                    />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400 text-center">
                        <p className="text-lg font-semibold mb-2">Skia Implementation</p>
                        <p className="text-sm">Skia rendering will be implemented here</p>
                        <p className="text-xs mt-2">Using MobX for state management</p>
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
                                        onClose={() =>
                                            setShowColorPicker(false)
                                        }
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

export default SkiaEditor;

