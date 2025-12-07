import { Copy, Trash2 } from 'lucide-react';

const ContextMenu = ({ contextMenu, onDuplicate, onDelete, onDeleteAudio }: any) => {
  if (!contextMenu.visible) return null;

  return (
    <div
      className="absolute bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[150px] z-50 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      {contextMenu.type === 'element' ? (
        <>
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={() => {
              if (contextMenu.elementId) onDuplicate(contextMenu.elementId);
            }}
          >
            <Copy size={14} /> Duplicate
          </button>
          <button
            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            onClick={() => {
              if (contextMenu.elementId) onDelete(contextMenu.elementId);
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </>
      ) : (
        <button
          className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
          onClick={() => {
            if (contextMenu.elementId) onDeleteAudio(contextMenu.elementId);
          }}
        >
          <Trash2 size={14} /> Delete Clip
        </button>
      )}
    </div>
  );
};

export default ContextMenu;
