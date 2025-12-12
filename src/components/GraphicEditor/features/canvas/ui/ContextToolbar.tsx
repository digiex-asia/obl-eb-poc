import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  ArrowUpFromLine,
  ArrowDownFromLine,
  FlipHorizontal,
  FlipVertical,
  Group,
  Ungroup,
  Copy,
  Trash2,
} from 'lucide-react';
import type { Page, DesignElement } from '../../../shared/model/types';
import type { Action } from '../../../shared/model/store';

const IconButton = ({ icon: Icon, onClick, active, title, className = '' }: any) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-2 rounded hover:bg-gray-100 transition-colors ${active ? 'bg-violet-100 text-violet-600' : 'text-gray-600'} ${className}`}
  >
    <Icon size={16} />
  </button>
);

interface ContextToolbarProps {
  selectedIds: string[];
  page: Page | undefined;
  dispatch: React.Dispatch<Action>;
}

const ContextToolbar = ({ selectedIds, page, dispatch }: ContextToolbarProps) => {
  if (!page || selectedIds.length === 0) return null;

  const elements = page.elements.filter(e => selectedIds.includes(e.id));
  if (elements.length === 0) return null;

  const firstEl = elements[0];
  const update = (attrs: Partial<DesignElement>) => {
    dispatch({ type: 'CAPTURE_CHECKPOINT' });
    selectedIds.forEach(id => {
      dispatch({ type: 'UPDATE_ELEMENT', id, attrs });
    });
  };

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-200 max-w-[90vw] overflow-x-auto">
      {/* Alignment */}
      <div className="flex bg-gray-50 rounded p-1">
        <IconButton
          icon={AlignLeft}
          onClick={() => dispatch({ type: 'ALIGN_ELEMENTS', alignType: 'left' })}
          title="Align Left"
        />
        <IconButton
          icon={AlignCenter}
          onClick={() => dispatch({ type: 'ALIGN_ELEMENTS', alignType: 'center' })}
          title="Align Center"
        />
        <IconButton
          icon={AlignRight}
          onClick={() => dispatch({ type: 'ALIGN_ELEMENTS', alignType: 'right' })}
          title="Align Right"
        />
      </div>
      <div className="w-px h-6 bg-gray-200" />

      {/* Vertical Alignment */}
      <div className="flex bg-gray-50 rounded p-1">
        <IconButton
          icon={ArrowUpFromLine}
          onClick={() => dispatch({ type: 'ALIGN_ELEMENTS', alignType: 'top' })}
          title="Align Top"
        />
        <IconButton
          icon={AlignVerticalJustifyCenter}
          onClick={() => dispatch({ type: 'ALIGN_ELEMENTS', alignType: 'middle' })}
          title="Align Middle"
        />
        <IconButton
          icon={ArrowDownFromLine}
          onClick={() => dispatch({ type: 'ALIGN_ELEMENTS', alignType: 'bottom' })}
          title="Align Bottom"
        />
      </div>
      <div className="w-px h-6 bg-gray-200" />

      {/* Flip for images */}
      {elements.some(e => e.type === 'image') && (
        <>
          <div className="flex bg-gray-50 rounded p-1">
            <IconButton
              icon={FlipHorizontal}
              onClick={() => update({ flipX: !firstEl.flipX })}
              active={firstEl.flipX}
              title="Flip Horizontal"
            />
            <IconButton
              icon={FlipVertical}
              onClick={() => update({ flipY: !firstEl.flipY })}
              active={firstEl.flipY}
              title="Flip Vertical"
            />
          </div>
          <div className="w-px h-6 bg-gray-200" />
        </>
      )}

      {/* Color picker for non-images */}
      {elements.some(e => e.type !== 'image') && (
        <>
          <div className="flex gap-1">
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
                onClick={() => update({ fill: c })}
                className={`w-6 h-6 rounded-full border ${firstEl.fill === c ? 'ring-2 ring-violet-500' : 'border-gray-200'}`}
                style={{ backgroundColor: c }}
                title={`Set color to ${c}`}
              />
            ))}
          </div>
          <div className="w-px h-6 bg-gray-200" />
        </>
      )}

      {/* Stroke width */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 border rounded flex items-center justify-center text-[10px] font-bold bg-gray-50">
          {firstEl.strokeWidth || 0}
        </div>
        <input
          type="range"
          min="0"
          max="10"
          className="w-20 accent-violet-600"
          value={firstEl.strokeWidth || 0}
          onChange={e =>
            update({
              strokeWidth: parseInt(e.target.value),
              stroke:
                (firstEl.stroke === 'transparent' || !firstEl.stroke) ? '#000000' : firstEl.stroke,
            })
          }
          title="Stroke Width"
        />
      </div>
      <div className="w-px h-6 bg-gray-200" />

      {/* Group/Ungroup */}
      <IconButton
        icon={Group}
        onClick={() => dispatch({ type: 'GROUP_ELEMENTS' })}
        title="Group (Cmd+G)"
      />
      <IconButton
        icon={Ungroup}
        onClick={() => dispatch({ type: 'UNGROUP_ELEMENTS' })}
        title="Ungroup (Cmd+Shift+G)"
      />

      {/* Copy/Delete */}
      <IconButton
        icon={Copy}
        onClick={() => dispatch({ type: 'DUPLICATE_ELEMENT' })}
        title="Duplicate (Cmd+D)"
      />
      <IconButton
        icon={Trash2}
        onClick={() => dispatch({ type: 'DELETE_ELEMENT' })}
        className="text-red-500 hover:bg-red-50"
        title="Delete"
      />
    </div>
  );
};

export default ContextToolbar;
