import { X } from 'lucide-react';
import { COLOR_PRESETS, SECONDARY_PRESETS, GRADIENTS } from '../../utils/constants';

interface ColorPickerProps {
    onSelect: (c: string) => void;
    onClose: () => void;
}

export const ColorPicker = ({ onSelect, onClose }: ColorPickerProps) => {
    return (
        <div
            className="absolute left-12 top-0 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 animate-in slide-in-from-left-2"
            onClick={(e) => e.stopPropagation()}
        >
            <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                Primary
            </h3>
            <div className="grid grid-cols-8 gap-1 mb-4">
                {COLOR_PRESETS.map((c) => (
                    <button
                        key={c}
                        onClick={() => onSelect(c)}
                        className="w-6 h-6 rounded-sm border border-gray-100 hover:scale-110 transition"
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>
            <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                Secondary
            </h3>
            <div className="grid grid-cols-8 gap-1 mb-4">
                {SECONDARY_PRESETS.map((c) => (
                    <button
                        key={c}
                        onClick={() => onSelect(c)}
                        className="w-6 h-6 rounded-sm border border-gray-100 hover:scale-110 transition relative"
                        style={{ backgroundColor: c }}
                    >
                        {c === '#ffffff' && (
                            <span className="absolute inset-0 border border-gray-200 rounded-sm" />
                        )}
                    </button>
                ))}
            </div>
            <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                Gradients
            </h3>
            <div className="grid grid-cols-8 gap-1 mb-4 max-h-48 overflow-y-auto pr-1">
                {GRADIENTS.map((g, i) => (
                    <button
                        key={i}
                        onClick={() => onSelect(g)}
                        className="w-6 h-6 rounded-sm border border-gray-100 hover:scale-110 transition"
                        style={{ background: g }}
                        title={g}
                    />
                ))}
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between items-center">
                <span className="text-xs text-gray-400">Custom</span>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

