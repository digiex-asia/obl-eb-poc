import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ChevronDown, ChevronRight } from 'lucide-react';
import EditorStore from '../../../common/stores/EditorStore';

interface StoreViewerTabProps {
    store: EditorStore;
}

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    color?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    defaultOpen = false,
    color = 'text-amber-500',
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-gray-800">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-1 py-2 px-3 hover:bg-gray-800 transition-colors"
            >
                {isOpen ? (
                    <ChevronDown size={12} className="text-gray-500" />
                ) : (
                    <ChevronRight size={12} className="text-gray-500" />
                )}
                <span className={`font-semibold uppercase text-[10px] tracking-wider ${color}`}>
                    {title}
                </span>
            </button>
            {isOpen && <div className="px-3 pb-2">{children}</div>}
        </div>
    );
};

const JsonValue: React.FC<{ value: any; depth?: number }> = ({ value, depth = 0 }) => {
    const [expanded, setExpanded] = useState(depth < 2);

    if (value === null) return <span className="text-gray-500">null</span>;
    if (value === undefined) return <span className="text-gray-500">undefined</span>;

    if (typeof value === 'string') {
        const displayValue = value.length > 30 ? `"${value.slice(0, 30)}..."` : `"${value}"`;
        return <span className="text-green-400">{displayValue}</span>;
    }

    if (typeof value === 'number') {
        return <span className="text-blue-400">{value}</span>;
    }

    if (typeof value === 'boolean') {
        return <span className="text-purple-400">{value ? 'true' : 'false'}</span>;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return <span className="text-gray-500">[]</span>;

        return (
            <div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-gray-400 hover:text-white"
                >
                    {expanded ? '▼' : '▶'} Array({value.length})
                </button>
                {expanded && (
                    <div className="ml-3 border-l border-gray-700 pl-2">
                        {value.slice(0, 10).map((item, i) => (
                            <div key={i} className="flex gap-1">
                                <span className="text-gray-600">{i}:</span>
                                <JsonValue value={item} depth={depth + 1} />
                            </div>
                        ))}
                        {value.length > 10 && (
                            <span className="text-gray-500">...{value.length - 10} more</span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length === 0) return <span className="text-gray-500">{'{}'}</span>;

        return (
            <div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-gray-400 hover:text-white"
                >
                    {expanded ? '▼' : '▶'} Object({keys.length})
                </button>
                {expanded && (
                    <div className="ml-3 border-l border-gray-700 pl-2">
                        {keys.slice(0, 15).map((key) => (
                            <div key={key} className="flex gap-1 items-start">
                                <span className="text-cyan-400">{key}:</span>
                                <JsonValue value={value[key]} depth={depth + 1} />
                            </div>
                        ))}
                        {keys.length > 15 && (
                            <span className="text-gray-500">...{keys.length - 15} more</span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return <span className="text-gray-400">{String(value)}</span>;
};

export const StoreViewerTab: React.FC<StoreViewerTabProps> = observer(({ store }) => {
    // Create a snapshot of the store state
    const storeSnapshot = {
        zoom: store.zoom,
        selectedRowId: store.selectedRowId,
        selectedElementId: store.selectedElementId,
        hoveredRowId: store.hoveredRowId,
        hoveredElementId: store.hoveredElementId,
        dragTarget: store.dragTarget,
        rowsCount: store.rows.length,
    };

    return (
        <div className="text-[11px]">
            <CollapsibleSection title="State Overview" defaultOpen color="text-amber-500">
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-gray-400">zoom</span>
                        <span className="text-blue-400">{store.zoom.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">selectedRowId</span>
                        <span className="text-green-400">
                            {store.selectedRowId ? `"${store.selectedRowId.slice(0, 8)}..."` : 'null'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">selectedElementId</span>
                        <span className="text-green-400">
                            {store.selectedElementId
                                ? `"${store.selectedElementId.slice(0, 8)}..."`
                                : 'null'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">hoveredRowId</span>
                        <span className="text-green-400">
                            {store.hoveredRowId ? `"${store.hoveredRowId.slice(0, 8)}..."` : 'null'}
                        </span>
                    </div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title={`Rows (${store.rows.length})`} color="text-cyan-500">
                {store.rows.map((row, index) => (
                    <CollapsibleSection
                        key={row.id}
                        title={`Row ${index}: ${row.id.slice(0, 8)}`}
                        color="text-gray-300"
                    >
                        <JsonValue value={row} />
                    </CollapsibleSection>
                ))}
            </CollapsibleSection>

            <CollapsibleSection title="Drag Target" color="text-fuchsia-500">
                <JsonValue value={store.dragTarget} />
            </CollapsibleSection>

            <CollapsibleSection title="Raw Snapshot" color="text-orange-500">
                <JsonValue value={storeSnapshot} />
            </CollapsibleSection>
        </div>
    );
});

