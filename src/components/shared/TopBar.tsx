import React from 'react';

interface TopBarProps {
    width?: number;
    height?: number;
    title?: string;
    children?: React.ReactNode;
}

export const TopBar = ({ width, height, title = "Email Builder", children }: TopBarProps) => (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6 justify-between z-20 relative">
        <div className="font-semibold text-gray-700 flex items-center gap-4">
            {title}
            {children}
        </div>
        {(width && height) && (
            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                Size: {width}px × {height}px
            </div>
        )}
    </div>
);
