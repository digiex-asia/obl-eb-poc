import { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';

interface ZoomControlsProps {
    zoom: number;
    setZoom: (z: number) => void;
}

export const ZoomControls = ({ zoom, setZoom }: ZoomControlsProps) => {
    const [inputValue, setInputValue] = useState(
        Math.round(zoom * 100).toString() + '%'
    );
    useEffect(() => {
        setInputValue(Math.round(zoom * 100).toString() + '%');
    }, [zoom]);
    const handleBlur = () => {
        let val = parseFloat(inputValue.replace('%', ''));
        if (isNaN(val)) val = zoom * 100;
        setZoom(val / 100);
    };
    return (
        <div className="fixed bottom-6 right-6 flex items-center bg-white rounded-full shadow-xl border border-gray-200 p-1 z-50">
            <button
                onClick={() => setZoom(zoom - 0.1)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition"
            >
                <Minus size={16} />
            </button>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                className="w-12 text-center text-xs font-medium text-gray-700 outline-none"
            />
            <button
                onClick={() => setZoom(zoom + 0.1)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition"
            >
                <Plus size={16} />
            </button>
        </div>
    );
};

