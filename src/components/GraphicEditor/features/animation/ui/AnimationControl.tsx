const AnimationControl = ({ value, onChange, options, onPreview }: any) => {
  return (
    <div className="space-y-4 pt-4 border-t border-gray-100">
      <div className="grid grid-cols-3 gap-2">
        {options.map((anim: any) => (
          <button
            key={anim.id}
            onMouseEnter={() => onPreview && onPreview(anim.id)}
            onMouseLeave={() => onPreview && onPreview(null)}
            onClick={() => onChange({ ...value, type: anim.id })}
            className={`aspect-square flex flex-col items-center justify-center gap-1 p-1 rounded border text-[10px] text-center transition-all ${value?.type === anim.id ? 'bg-violet-50 border-violet-500 text-violet-700' : 'bg-white border-gray-200 hover:border-violet-300'}`}
          >
            {/* CSS Animation Preview */}
            <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center overflow-hidden mb-1">
              <div
                className={`w-3 h-3 bg-violet-400 rounded-full ${anim.css}`}
              />
            </div>
            {anim.label}
          </button>
        ))}
      </div>
      {value?.type !== 'none' && (
        <div className="space-y-2 bg-gray-50 p-3 rounded-md">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Speed</span>
            <span>{value?.speed}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={value?.speed || 1}
            onChange={e =>
              onChange({ ...value, speed: parseFloat(e.target.value) })
            }
            className="w-full accent-violet-600"
          />
        </div>
      )}
    </div>
  );
};

export default AnimationControl;
