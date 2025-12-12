import { Layers, Undo2, Redo2, Film, Save, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';

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
  onZoomChange,
  saveIndicator,
  createTemplateBtn,
  openTemplateBtn,
}: any & {
  onZoomChange?: (zoom: number) => void;
  saveIndicator?: ReactNode;
  createTemplateBtn?: ReactNode;
  openTemplateBtn?: ReactNode;
}) => {
  const [zoomInput, setZoomInput] = useState(Math.round(zoom * 100).toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync zoomInput with external zoom changes
  useEffect(() => {
    setZoomInput(Math.round(zoom * 100).toString());
  }, [zoom]);
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
        <div className="text-xs bg-white/10 px-2 py-1 rounded-full font-mono flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={zoomInput}
            onChange={e => {
              // Allow only digits
              const value = e.target.value.replace(/\D/g, '');
              setZoomInput(value);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const value = parseInt(zoomInput, 10);
                if (!isNaN(value)) {
                  // Clamp between 10% and 500%
                  const clampedZoom = Math.max(10, Math.min(500, value)) / 100;
                  onZoomChange?.(clampedZoom);
                  setZoomInput(Math.round(clampedZoom * 100).toString());
                }
                inputRef.current?.blur();
              } else if (e.key === 'Escape') {
                // Restore original value
                setZoomInput(Math.round(zoom * 100).toString());
                inputRef.current?.blur();
              }
            }}
            onBlur={() => {
              // Validate and restore if invalid
              const value = parseInt(zoomInput, 10);
              if (isNaN(value) || value < 10 || value > 500) {
                setZoomInput(Math.round(zoom * 100).toString());
              } else {
                // Apply the valid value
                const clampedZoom = Math.max(10, Math.min(500, value)) / 100;
                onZoomChange?.(clampedZoom);
                setZoomInput(Math.round(clampedZoom * 100).toString());
              }
            }}
            onFocus={e => {
              // Select all text for easy replacement
              e.target.select();
            }}
            className="bg-transparent text-white text-center outline-none w-10 cursor-text"
            title="Click to edit zoom (10-500%)"
          />
          <span className="ml-0.5">%</span>
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
