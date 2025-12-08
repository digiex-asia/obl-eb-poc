import { Layers, Undo2, Redo2, Film, Save, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

const Header = ({
  past,
  future,
  zoom,
  isExporting,
  exportProgress,
  onUndo,
  onRedo,
  onExportVideo,
  onExportJSON,
  saveIndicator,
  createTemplateBtn,
  openTemplateBtn,
}: any & {
  saveIndicator?: ReactNode;
  createTemplateBtn?: ReactNode;
  openTemplateBtn?: ReactNode;
}) => {
  return (
    <div className="h-10 bg-violet-600 text-white flex items-center justify-between px-5 shadow-sm z-40 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="font-bold text-base tracking-tight flex items-center gap-2">
          <Layers className="text-white" size={20} /> Graphic FSD
        </div>
        <div className="h-5 w-px bg-white/20" />
        <div className="flex gap-4 text-xs font-medium text-white/90">
          <button
            className="hover:text-white flex items-center gap-1 opacity-80 hover:opacity-100 disabled:opacity-30"
            onClick={onUndo}
            disabled={past.length === 0}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} /> Undo
          </button>
          <button
            className="hover:text-white flex items-center gap-1 opacity-80 hover:opacity-100 disabled:opacity-30"
            onClick={onRedo}
            disabled={future.length === 0}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={14} /> Redo
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Save Indicator - shows template name and save status */}
        {saveIndicator || (
          <div className="text-xs bg-white/10 px-3 py-1 rounded-full">
            Untitled Design
          </div>
        )}
        <div className="text-xs bg-white/10 px-3 py-1 rounded-full font-mono">
          {Math.round(zoom * 100)}%
        </div>
        {/* Template Management Buttons */}
        {openTemplateBtn}
        {createTemplateBtn}
        {/* EXPORT BUTTONS */}
        <button
          onClick={onExportVideo}
          disabled={isExporting}
          className={`px-3 py-1 bg-violet-800 text-white rounded font-bold text-xs hover:bg-violet-900 flex items-center gap-2 ${isExporting ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isExporting ? (
            <>
              <Loader2 size={14} className="animate-spin" />{' '}
              {Math.round(exportProgress * 100)}%
            </>
          ) : (
            <>
              <Film size={14} /> Video
            </>
          )}
        </button>
        <button
          onClick={onExportJSON}
          className="px-3 py-1 bg-white/20 text-white rounded font-bold text-xs hover:bg-white/30 flex items-center gap-2"
          title="Save Project JSON"
        >
          <Save size={14} /> JSON
        </button>
      </div>
    </div>
  );
};

export default Header;
