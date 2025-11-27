import React from 'react';
import { Bug } from 'lucide-react';

interface TopBarProps {
    width?: number;
    height?: number;
    title?: string;
    children?: React.ReactNode;
    debugMode?: boolean;
    onDebugModeChange?: (enabled: boolean) => void;
}

export const TopBar = ({
    width,
    height,
    title = 'Email Builder',
    children,
    debugMode = false,
    onDebugModeChange,
}: TopBarProps) => (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6 justify-between z-20 relative">
        <div className="font-semibold text-gray-700 flex items-center gap-4">
            {title}
            {children}
        </div>
        <div className="flex items-center gap-4">
            {/* Debug Mode Toggle */}
            {onDebugModeChange && (
                <button
                    onClick={() => onDebugModeChange(!debugMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        debugMode
                            ? 'bg-amber-100 text-amber-700 border border-amber-300'
                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                    }`}
                    title={debugMode ? 'Disable Debug Mode' : 'Enable Debug Mode'}
                >
                    <Bug size={14} className={debugMode ? 'text-amber-600' : ''} />
                    <span>Debug</span>
                    <div
                        className={`w-8 h-4 rounded-full relative transition-colors ${
                            debugMode ? 'bg-amber-500' : 'bg-gray-300'
                        }`}
                    >
                        <div
                            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                                debugMode ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                        />
                    </div>
                </button>
            )}
            {width && height && (
                <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                    Size: {width}px × {height}px
                </div>
            )}
        </div>
    </div>
);
