import React from 'react';
import { Magnet, Grid3X3, Ruler, Move } from 'lucide-react';

interface AlignmentToolbarProps {
    smartGuidesEnabled: boolean;
    onToggleSmartGuides: () => void;
    snappingEnabled: boolean;
    onToggleSnapping: () => void;
    showDistances: boolean;
    onToggleDistances: () => void;
    gridSnapping: boolean;
    onToggleGridSnapping: () => void;
}

export const AlignmentToolbar: React.FC<AlignmentToolbarProps> = ({
    smartGuidesEnabled,
    onToggleSmartGuides,
    snappingEnabled,
    onToggleSnapping,
    showDistances,
    onToggleDistances,
    gridSnapping,
    onToggleGridSnapping,
}) => {
    const ToolButton: React.FC<{
        active: boolean;
        onClick: () => void;
        icon: React.ReactNode;
        label: string;
        shortcut?: string;
    }> = ({ active, onClick, icon, label, shortcut }) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                active
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
            title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    return (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-gray-200 z-40">
            <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                    Align
                </span>
            </div>

            <ToolButton
                active={smartGuidesEnabled}
                onClick={onToggleSmartGuides}
                icon={<Move size={14} />}
                label="Guides"
                shortcut="⌘G"
            />

            <ToolButton
                active={snappingEnabled}
                onClick={onToggleSnapping}
                icon={<Magnet size={14} />}
                label="Snap"
                shortcut="⌘⇧S"
            />

            <ToolButton
                active={showDistances}
                onClick={onToggleDistances}
                icon={<Ruler size={14} />}
                label="Distance"
            />

            <ToolButton
                active={gridSnapping}
                onClick={onToggleGridSnapping}
                icon={<Grid3X3 size={14} />}
                label="Grid"
            />
        </div>
    );
};

