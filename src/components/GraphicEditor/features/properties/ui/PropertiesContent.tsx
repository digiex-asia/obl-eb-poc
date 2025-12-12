import { Film } from 'lucide-react';
import { ANIMATIONS } from '../../../shared/lib/constants';

const PropertiesContent = ({
  element,
  onChange,
  onPreviewAnim,
  onCheckpoint,
}: any) => {
  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">
            Width
          </label>
          <input
            type="number"
            value={Math.round(element.width)}
            onFocus={onCheckpoint}
            onChange={e =>
              onChange(element.id, { width: parseInt(e.target.value) })
            }
            className="w-full p-2 bg-gray-50 rounded border border-gray-200 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase">
            Rotation
          </label>
          <input
            type="number"
            value={Math.round(element.rotation)}
            onFocus={onCheckpoint}
            onChange={e =>
              onChange(element.id, { rotation: parseInt(e.target.value) })
            }
            className="w-full p-2 bg-gray-50 rounded border border-gray-200 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-gray-100">
        <label className="text-[10px] font-bold text-gray-400 uppercase">
          Opacity
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={element.opacity}
          onMouseDown={onCheckpoint}
          onChange={e =>
            onChange(element.id, { opacity: parseFloat(e.target.value) })
          }
          className="w-full accent-violet-600"
        />
      </div>

      {element.type !== 'image' && (
        <div className="space-y-2 pt-4 border-t border-gray-100">
          <label className="text-[10px] font-bold text-gray-400 uppercase">
            Fill Color
          </label>
          <div className="flex gap-2 flex-wrap">
            {[
              '#000000',
              '#ffffff',
              '#ef4444',
              '#f97316',
              '#eab308',
              '#22c55e',
              '#3b82f6',
              '#a855f7',
            ].map(c => (
              <button
                key={c}
                onClick={() => {
                  onCheckpoint();
                  onChange(element.id, { fill: c });
                }}
                className={`w-6 h-6 rounded-full border ${element.fill === c ? 'ring-2 ring-violet-500' : 'border-gray-200'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={element.fill}
              onFocus={onCheckpoint}
              onChange={e => onChange(element.id, { fill: e.target.value })}
              className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden"
            />
          </div>
        </div>
      )}

      <div className="space-y-4 pt-4 border-t border-gray-100">
        <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
          <Film size={12} /> Animation
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ANIMATIONS.map(anim => (
            <button
              key={anim.id}
              onMouseEnter={() =>
                onPreviewAnim({ id: element.id, type: anim.id })
              }
              onMouseLeave={() => onPreviewAnim(null)}
              onClick={() => {
                onCheckpoint();
                onChange(element.id, {}, { type: anim.id });
              }}
              className={`p-2 rounded border text-xs text-center transition-all ${element.animation?.type === anim.id ? 'bg-violet-50 border-violet-500 text-violet-700' : 'bg-white border-gray-200 hover:border-violet-300'}`}
            >
              {anim.label}
            </button>
          ))}
        </div>
        {element.animation?.type !== 'none' && (
          <div className="space-y-2 bg-gray-50 p-3 rounded-md">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Speed</span>
              <span>{element.animation?.speed}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={element.animation?.speed || 1}
              onMouseDown={onCheckpoint}
              onChange={e =>
                onChange(element.id, {}, { speed: parseFloat(e.target.value) })
              }
              className="w-full accent-violet-600"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesContent;
