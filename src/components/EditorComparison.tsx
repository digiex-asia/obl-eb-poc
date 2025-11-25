import React, { useState } from 'react';
import OBLOldEditor from './OBLOldEditor';
import OBLImprovedEditor from './OBLImprovedEditor';
import { History, Zap } from 'lucide-react';

const EditorComparison = () => {
    // Default to showing the improved editor
    const [mode, setMode] = useState<'legacy' | 'improved'>('improved');

    return (
        <div className="flex flex-col h-screen">
            <div className="bg-white border-b border-gray-200 p-2 flex justify-center gap-4 shadow-sm z-50">
                <button
                    onClick={() => setMode('legacy')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        mode === 'legacy'
                            ? 'bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-2'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    <History size={18} />
                    <div>
                        <div className="font-bold">Legacy Implementation</div>
                        <div className="text-[10px] opacity-75">Monolithic Store, Deep Clones</div>
                    </div>
                </button>
                <button
                    onClick={() => setMode('improved')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        mode === 'improved'
                            ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-2'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    <Zap size={18} />
                    <div>
                        <div className="font-bold">Improved Implementation</div>
                        <div className="text-[10px] opacity-75">MobX Observables, React Memo</div>
                    </div>
                </button>
            </div>

            <div className="flex-1 relative overflow-hidden">
                {mode === 'legacy' ? (
                    <OBLOldEditor onSwitchBack={() => setMode('improved')} />
                ) : (
                    <OBLImprovedEditor />
                )}
            </div>
        </div>
    );
};

export default EditorComparison;

