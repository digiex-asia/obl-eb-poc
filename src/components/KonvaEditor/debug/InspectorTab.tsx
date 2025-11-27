import React from 'react';
import { observer } from 'mobx-react-lite';
import EditorStore from '../../../common/stores/EditorStore';

interface InspectorTabProps {
    store: EditorStore;
}

const PropertyRow: React.FC<{ label: string; value: string | number | undefined | null }> = ({
    label,
    value,
}) => (
    <div className="flex justify-between py-1 border-b border-gray-800">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-mono">{value ?? '-'}</span>
    </div>
);

export const InspectorTab: React.FC<InspectorTabProps> = observer(({ store }) => {
    const selectedRow = store.rows.find((r) => r.id === store.selectedRowId);
    const selectedElement = selectedRow?.elements.find((e) => e.id === store.selectedElementId);

    return (
        <div className="p-3">
            {/* Selection Info */}
            <div className="mb-4">
                <h3 className="text-amber-500 font-semibold mb-2 uppercase text-[10px] tracking-wider">
                    Selection
                </h3>
                <PropertyRow label="Row ID" value={store.selectedRowId?.slice(0, 8) || 'None'} />
                <PropertyRow
                    label="Element ID"
                    value={store.selectedElementId?.slice(0, 8) || 'None'}
                />
            </div>

            {/* Selected Row Info */}
            {selectedRow && (
                <div className="mb-4">
                    <h3 className="text-cyan-500 font-semibold mb-2 uppercase text-[10px] tracking-wider">
                        Row
                    </h3>
                    <PropertyRow label="ID" value={selectedRow.id.slice(0, 12)} />
                    <PropertyRow label="Height" value={`${selectedRow.height}px`} />
                    <PropertyRow label="Layout" value={selectedRow.layout.join(' / ')} />
                    <PropertyRow label="Elements" value={selectedRow.elements.length} />
                    <PropertyRow
                        label="Background"
                        value={selectedRow.backgroundColor || 'default'}
                    />
                </div>
            )}

            {/* Selected Element Info */}
            {selectedElement && (
                <div className="mb-4">
                    <h3 className="text-fuchsia-500 font-semibold mb-2 uppercase text-[10px] tracking-wider">
                        Element
                    </h3>
                    <PropertyRow label="ID" value={selectedElement.id.slice(0, 12)} />
                    <PropertyRow label="Type" value={selectedElement.type} />
                    <PropertyRow label="X" value={`${Math.round(selectedElement.x)}px`} />
                    <PropertyRow label="Y" value={`${Math.round(selectedElement.y)}px`} />
                    <PropertyRow label="Width" value={`${Math.round(selectedElement.width)}px`} />
                    <PropertyRow label="Height" value={`${Math.round(selectedElement.height)}px`} />

                    {/* Type-specific properties */}
                    {selectedElement.type === 'image' && selectedElement.src && (
                        <div className="mt-2">
                            <span className="text-gray-400 text-[10px]">Source:</span>
                            <div className="text-[10px] text-gray-300 break-all mt-1 bg-gray-800 p-1 rounded">
                                {selectedElement.src.length > 50
                                    ? `${selectedElement.src.slice(0, 50)}...`
                                    : selectedElement.src}
                            </div>
                        </div>
                    )}

                    {selectedElement.type === 'text' && selectedElement.text && (
                        <div className="mt-2">
                            <span className="text-gray-400 text-[10px]">Text:</span>
                            <div className="text-[10px] text-gray-300 break-all mt-1 bg-gray-800 p-1 rounded">
                                {selectedElement.text}
                            </div>
                        </div>
                    )}

                    {selectedElement.fill && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-gray-400">Fill:</span>
                            <div
                                className="w-4 h-4 rounded border border-gray-600"
                                style={{ backgroundColor: selectedElement.fill }}
                            />
                            <span className="text-white font-mono text-[10px]">
                                {selectedElement.fill}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* No Selection */}
            {!selectedRow && !selectedElement && (
                <div className="text-gray-500 text-center py-8">
                    Select a row or element to inspect
                </div>
            )}
        </div>
    );
});

