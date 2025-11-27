import { useState } from 'react';
import {
    LayoutGrid,
    Image as ImageIcon,
    Shapes,
    Type,
    MousePointer2,
    Palette,
    Search,
    Square,
    Circle as CircleIcon,
    Triangle,
    Star,
    Hexagon,
    Layout,
    Plus,
    Copy,
    Grid3x3,
    Heading,
    AlignLeft,
} from 'lucide-react';
import { ElementType } from '../../common/stores/types';
import { SAMPLE_IMAGES } from '../../utils/constants';

interface SidebarProps {
    onAddRow: (layout: number[]) => void;
    onAddElement: (type: ElementType, src?: string) => void;
    onAddSpecialBlock: (type: 'freeform' | 'divider' | 'spacer') => void;
}

const DraggableLayoutItem = ({ layout, onClick }: { layout: number[]; onClick: () => void }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('layout', JSON.stringify(layout));
    };
    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onClick={onClick}
            className="w-full h-12 flex bg-gray-100 border border-gray-200 rounded overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all active:cursor-grabbing group"
        >
            {layout.map((pct, i) => (
                <div
                    key={i}
                    style={{ width: `${pct}%` }}
                    className={`h-full flex items-center justify-center relative ${
                        i < layout.length - 1 ? 'border-r border-gray-300' : ''
                    }`}
                >
                    <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {Math.round(pct)}%
                    </span>
                </div>
            ))}
        </div>
    );
};

const ShapeItem = ({ type, icon: Icon, label }: { type: string; icon: any; label?: string }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('type', type);
    };
    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="aspect-square bg-gray-100 rounded-lg flex flex-col items-center justify-center cursor-grab hover:bg-gray-200 text-gray-600"
            title={label}
        >
            <Icon size={28} strokeWidth={1.5} />
        </div>
    );
};

const MediaItem = ({ src }: { src: string }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('type', 'image');
        e.dataTransfer.setData('src', src);
    };
    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="aspect-square rounded-lg overflow-hidden cursor-grab bg-gray-100"
        >
            <img src={src} className="w-full h-full object-cover pointer-events-none" />
        </div>
    );
};

const FreeFormBlock = ({ onClick }: { onClick: () => void }) => (
    <div
        onClick={onClick}
        className="w-full h-20 bg-gray-50 border border-gray-200 rounded flex items-center justify-center cursor-pointer hover:border-blue-400 text-gray-500 hover:text-blue-500 font-medium text-sm transition"
    >
        Free-Form
    </div>
);

const DividerBlock = ({ onClick }: { onClick: () => void }) => (
    <div
        onClick={onClick}
        className="w-full h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center cursor-pointer hover:border-blue-400 px-4"
    >
        <div className="w-full h-px bg-gray-400" />
    </div>
);

const SpacerBlock = ({ onClick }: { onClick: () => void }) => (
    <div
        onClick={onClick}
        className="w-full h-10 bg-gray-50 border border-gray-200 rounded flex items-center justify-center cursor-pointer hover:border-blue-400"
    >
        <div className="w-full border-t border-dashed border-gray-300" />
    </div>
);

export const Sidebar = ({ onAddRow, onAddElement, onAddSpecialBlock }: SidebarProps) => {
    const [activeTab, setActiveTab] = useState<'blocks' | 'media' | 'shapes' | 'text' | 'button'>(
        'blocks'
    );
    return (
        <div className="flex h-full bg-white shadow-xl z-10">
            <div className="w-[72px] border-r border-gray-200 flex flex-col h-full overflow-y-auto hide-scrollbar">
                <button
                    onClick={() => setActiveTab('blocks')}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-1 ${
                        activeTab === 'blocks' ? 'bg-gray-100 text-black' : 'text-gray-500'
                    }`}
                >
                    <LayoutGrid size={20} />
                    <span className="text-[10px]">Blocks</span>
                </button>
                <button
                    onClick={() => setActiveTab('media')}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-1 ${
                        activeTab === 'media' ? 'bg-gray-100 text-black' : 'text-gray-500'
                    }`}
                >
                    <ImageIcon size={20} />
                    <span className="text-[10px]">Media</span>
                </button>
                <button
                    onClick={() => setActiveTab('shapes')}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-1 ${
                        activeTab === 'shapes' ? 'bg-gray-100 text-black' : 'text-gray-500'
                    }`}
                >
                    <Shapes size={20} />
                    <span className="text-[10px]">Shapes</span>
                </button>
                <div className="h-px w-8 bg-gray-200 mx-auto my-2" />
                <button
                    onClick={() => setActiveTab('text')}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-1 ${
                        activeTab === 'text' ? 'bg-gray-100 text-black' : 'text-gray-500'
                    }`}
                >
                    <Type size={20} />
                    <span className="text-[10px]">Text</span>
                </button>
                <button
                    onClick={() => setActiveTab('button')}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-1 ${
                        activeTab === 'button' ? 'bg-gray-100 text-black' : 'text-gray-500'
                    }`}
                >
                    <MousePointer2 size={20} />
                    <span className="text-[10px]">Button</span>
                </button>
                <div className="h-px w-8 bg-gray-200 mx-auto my-2" />
                <button className="w-full aspect-square flex flex-col items-center justify-center gap-1 text-gray-500 hover:bg-gray-50">
                    <Palette size={20} />
                    <span className="text-[10px]">Color</span>
                </button>
            </div>
            <div className="w-[280px] h-full bg-white overflow-y-auto p-6">
                {activeTab === 'blocks' && (
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">HTML Block</h1>
                            <p className="text-xs text-gray-500 mb-4">
                                Responsive, editable, and email-safe.
                            </p>
                            <div className="space-y-3">
                                <DraggableLayoutItem
                                    layout={[100]}
                                    onClick={() => onAddRow([100])}
                                />
                                <DraggableLayoutItem
                                    layout={[50, 50]}
                                    onClick={() => onAddRow([50, 50])}
                                />
                                <DraggableLayoutItem
                                    layout={[100 / 3, 100 / 3, 100 / 3]}
                                    onClick={() => onAddRow([100 / 3, 100 / 3, 100 / 3])}
                                />
                                <DraggableLayoutItem
                                    layout={[25, 25, 25, 25]}
                                    onClick={() => onAddRow([25, 25, 25, 25])}
                                />
                                <DraggableLayoutItem
                                    layout={[30, 70]}
                                    onClick={() => onAddRow([30, 70])}
                                />
                                <DraggableLayoutItem
                                    layout={[70, 30]}
                                    onClick={() => onAddRow([70, 30])}
                                />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 mb-2">
                                Free-Form Block
                            </h2>
                            <p className="text-xs text-gray-500 mb-3">
                                Design without limits. Exports as image.
                            </p>
                            <FreeFormBlock onClick={() => onAddSpecialBlock('freeform')} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 mb-2">
                                Spacers & Dividers
                            </h2>
                            <div className="space-y-3">
                                <div
                                    draggable
                                    onDragStart={(e) => e.dataTransfer.setData('type', 'spacer')}
                                >
                                    <SpacerBlock onClick={() => onAddSpecialBlock('spacer')} />
                                </div>
                                <div
                                    draggable
                                    onDragStart={(e) => e.dataTransfer.setData('type', 'divider')}
                                >
                                    <DividerBlock onClick={() => onAddSpecialBlock('divider')} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'media' && (
                    <div className="grid grid-cols-2 gap-3">
                        <h1 className="text-2xl font-bold col-span-2 mb-4">Media</h1>
                        {SAMPLE_IMAGES.map((src, i) => (
                            <div key={i} onClick={() => onAddElement('image', src)}>
                                <MediaItem src={src} />
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 'shapes' && (
                    <div className="flex flex-col h-full">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Add Shapes</h1>
                        <div className="relative mb-4">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                placeholder="Search Library"
                                className="w-full bg-gray-100 rounded-md py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div className="flex gap-4 text-sm font-medium text-gray-500 border-b border-gray-100 pb-2 mb-4">
                            <span className="text-gray-900 border-b-2 border-black pb-2 -mb-2.5">
                                Masks
                            </span>
                            <span className="hover:text-gray-800 cursor-pointer">Lines</span>
                            <span className="hover:text-gray-800 cursor-pointer">Graphics</span>
                            <span className="hover:text-gray-800 cursor-pointer">Symbols</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div onClick={() => onAddElement('rect')}>
                                <ShapeItem type="rect" icon={Square} />
                            </div>
                            <div onClick={() => onAddElement('circle')}>
                                <ShapeItem type="circle" icon={CircleIcon} />
                            </div>
                            <div onClick={() => onAddElement('triangle')}>
                                <ShapeItem type="triangle" icon={Triangle} />
                            </div>
                            <div onClick={() => onAddElement('star')}>
                                <ShapeItem type="star" icon={Star} />
                            </div>
                            <div onClick={() => onAddElement('polygon')}>
                                <ShapeItem type="polygon" icon={Hexagon} />
                            </div>
                            <div onClick={() => onAddElement('rect')}>
                                <ShapeItem type="rect" icon={Layout} />
                            </div>
                            <div onClick={() => onAddElement('rect')}>
                                <ShapeItem type="rect" icon={Plus} />
                            </div>
                            <div onClick={() => onAddElement('rect')}>
                                <ShapeItem type="rect" icon={Copy} />
                            </div>
                            <div onClick={() => onAddElement('rect')}>
                                <ShapeItem type="rect" icon={Grid3x3} />
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'text' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Text</h1>
                        <div className="space-y-3">
                            <div
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('type', 'text')}
                                onClick={() => onAddElement('text')}
                                className="p-4 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:border-blue-400 flex items-center gap-3"
                            >
                                <Heading size={20} /> <span className="font-medium">Heading</span>
                            </div>
                            <div
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('type', 'text')}
                                onClick={() => onAddElement('text')}
                                className="p-4 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:border-blue-400 flex items-center gap-3"
                            >
                                <AlignLeft size={20} />{' '}
                                <span className="font-medium">Paragraph</span>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'button' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Button</h1>
                        <div
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('type', 'button')}
                            onClick={() => onAddElement('button')}
                            className="p-4 bg-blue-500 text-white rounded flex justify-center cursor-pointer shadow-sm hover:bg-blue-600"
                        >
                            Primary Button
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
