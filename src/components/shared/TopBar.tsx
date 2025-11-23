interface TopBarProps {
    width: number;
    height: number;
}

export const TopBar = ({ width, height }: TopBarProps) => (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6 justify-between z-20 relative">
        <div className="font-semibold text-gray-700">Email Builder</div>
        <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
            Size: {width}px × {height}px
        </div>
        <div className="w-20"></div>
    </div>
);

