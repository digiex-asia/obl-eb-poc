import type { AppState, Page } from '../../../shared/model/types';

interface DebugPanelProps {
  state: AppState;
  activePage: Page | undefined;
}

/**
 * Debug Panel - Floating overlay with real-time metrics
 *
 * Displays:
 * - Element count
 * - Selected count
 * - Zoom percentage
 * - Pan position
 * - Selected element details (ID, x, y, width, height, rotation)
 */
const DebugPanel = ({ state, activePage }: DebugPanelProps) => {
  if (!activePage) return null;

  const selectedElement =
    state.selectedElementId && activePage
      ? activePage.elements.find(el => el.id === state.selectedElementId)
      : null;

  return (
    <div className="absolute top-14 right-4 bg-black/80 text-white p-3 rounded font-mono text-xs z-50 pointer-events-none space-y-1">
      <div className="font-bold border-b border-white/20 pb-1 mb-1">
        Debug Info
      </div>
      <div>
        Elements: <span className="text-green-400">{activePage.elements.length}</span>
      </div>
      <div>
        Selected:{' '}
        <span className="text-blue-400">
          {state.selectedElementId ? 1 : 0}
        </span>
      </div>
      <div>Zoom: {Math.round(state.zoom * 100)}%</div>
      <div>
        Pan: {Math.round(state.pan.x)}, {Math.round(state.pan.y)}
      </div>

      {selectedElement && (
        <div className="pt-1 border-t border-white/20 mt-1">
          <div className="text-purple-400 font-bold mb-1">Selected Element</div>
          <div>ID: {selectedElement.id.substr(0, 8)}...</div>
          <div>X: {Math.round(selectedElement.x)}</div>
          <div>Y: {Math.round(selectedElement.y)}</div>
          <div>W: {Math.round(selectedElement.width)}</div>
          <div>H: {Math.round(selectedElement.height)}</div>
          <div>Rot: {Math.round(selectedElement.rotation)}°</div>
          {selectedElement.type === 'image' && selectedElement.src && (
            <div className="text-xs text-gray-400 mt-1">
              Type: {selectedElement.type}
            </div>
          )}
        </div>
      )}

      <div className="pt-1 border-t border-white/20 mt-1 text-gray-400 text-[10px]">
        Press Bug icon to toggle
      </div>
    </div>
  );
};

export default DebugPanel;
