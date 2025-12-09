/**
 * GraphicEditor App with Command Pattern Integration
 *
 * This is an enhanced version of App.tsx that uses the Command Pattern
 * for state management and operation generation.
 */

import { useReducer, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ElementType } from '../shared/model/types';
import {
  reducer,
  initialState,
  generateId,
} from '../shared/model/store';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PAGE_ANIMATIONS } from '../shared/lib/constants';
import useCanvasEngine from '../features/canvas/hooks/useCanvasEngine';
import useVideoExporter from '../features/export/hooks/useVideoExporter';
import useAudioController from '../features/export/hooks/useAudioController';
import Header from '../features/header/ui/Header';
import Sidebar from '../features/sidebar/ui/Sidebar';
import Canvas from '../features/canvas/ui/Canvas';
import Timeline from '../features/timeline/ui/Timeline';
import PropertiesContent from '../features/properties/ui/PropertiesContent';
import AnimationControl from '../features/animation/ui/AnimationControl';
import ContextMenu from '../features/export/ui/ContextMenu';

// Backend integration imports
import { useTemplate } from '../shared/hooks/useTemplate';
import { useOperationQueue } from '../shared/hooks/useOperationQueue';
import { useOperationBatcher } from '../shared/hooks/useOperationBatcher';
import { CreateTemplateBtn } from '../features/template-manager/ui/CreateTemplateBtn';
import { SaveIndicator } from '../features/template-manager/ui/SaveIndicator';
import { OpenTemplateBtn } from '../features/template-manager/ui/OpenTemplateBtn';

// Command Pattern imports
import { useCommandDispatch } from '../shared/commands';
import type { EditorCommand } from '../shared/commands';

const AppWithCommands = () => {
  const [state, baseDispatch] = useReducer(reducer, initialState);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderTick, setRenderTick] = useState(0);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [previewAnim, setPreviewAnim] = useState<{
    id: string;
    type: string;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Backend integration hooks
  const {
    currentTemplateId,
    templateName,
    templateVersion,
    createTemplate,
    loadTemplate,
    saveTemplate,
    listTemplates,
    setTemplateVersion,
  } = useTemplate(state);

  // Operation queue for backend sync
  const {
    queueOperation,
    isSaving,
    lastSaved,
    error: saveError,
    queueSize,
  } = useOperationQueue({
    templateId: currentTemplateId,
    templateVersion,
    enabled: !!currentTemplateId,
    delay: 2000,
    onSuccess: (newVersion) => {
      setTemplateVersion(newVersion);
      console.log('[AppWithCommands] Template saved with version:', newVersion);
    },
    onVersionConflict: (currentVer, requestedVer) => {
      console.error('[AppWithCommands] Version conflict!', {
        current: currentVer,
        requested: requestedVer,
      });
      alert(
        `Template was modified elsewhere. Please reload. (Server version: ${currentVer}, Your version: ${requestedVer})`
      );
    },
  });

  // Operation batcher: Coalesce rapid operations (e.g., 100 drag events → 1 final operation)
  const { batchOperation } = useOperationBatcher({
    delay: 300, // Wait 300ms after last operation before flushing
    onFlush: (operations) => {
      if (currentTemplateId) {
        console.log('[AppWithCommands] Flushing batched operations:', operations.length);
        queueOperation(operations);
      }
    },
  });

  // Command dispatcher with automatic operation generation
  const { executeCommand, undo, redo, canUndo, canRedo } = useCommandDispatch(
    { pages: state.pages, audioLayers: state.audioLayers },
    (newContentState) => {
      // Update state with new content
      baseDispatch({
        type: 'SET_CONTENT',
        pages: newContentState.pages,
        audioLayers: newContentState.audioLayers,
      });
    },
    {
      // Auto-generate operations and send to batcher (not directly to queue)
      onOperationsGenerated: (operations) => {
        if (currentTemplateId) {
          console.log('[AppWithCommands] Generated operations:', operations.length);
          batchOperation(operations); // ← Batch instead of direct queue
        }
      },
      // Log history changes
      onHistoryChange: (canUndo, canRedo) => {
        console.log('[AppWithCommands] History changed:', { canUndo, canRedo });
      },
    }
  );

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z (Mac: Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          console.log('[AppWithCommands] Undo triggered');
          undo();
        }
      }

      // Redo: Ctrl+Shift+Z (Mac: Cmd+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) {
          console.log('[AppWithCommands] Redo triggered');
          redo();
        }
      }

      // Alternative Redo: Ctrl+Y (Windows)
      if (e.ctrlKey && e.key === 'y' && !e.metaKey) {
        e.preventDefault();
        if (canRedo) {
          console.log('[AppWithCommands] Redo triggered (Ctrl+Y)');
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  // Legacy dispatch for non-command actions (UI state, etc.)
  // Use this for actions that don't modify content state
  const dispatch = (action: any) => {
    console.log('[AppWithCommands] Legacy dispatch:', action.type);
    baseDispatch(action);
  };

  const handleCreateTemplate = async (name: string, description?: string) => {
    try {
      const template = await createTemplate(name, description);
      console.log('Template created:', template.id);
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleOpenTemplate = async (templateId: string) => {
    try {
      const partialState = await loadTemplate(templateId);

      // Merge the loaded template data with current state
      if (partialState.pages) {
        dispatch({ type: 'LOAD_TEMPLATE', data: partialState });
      }

      console.log('Template loaded:', templateId);
    } catch (error) {
      console.error('Failed to load template:', error);
      throw error;
    }
  };

  const activePage = state.pages.find(p => p.id === state.activePageId);
  let pageStartTime = 0;
  for (let p of state.pages) {
    if (p.id === state.activePageId) break;
    pageStartTime += p.duration;
  }

  useAudioController(state.audioLayers, state.isPlaying, state.currentTime);
  const { exportVideo } = useVideoExporter(dispatch);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];
        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const audioURL = URL.createObjectURL(blob);
          const audio = new Audio(audioURL);
          audio.onloadedmetadata = () => {
            const duration = audio.duration === Infinity ? 5 : audio.duration;

            // Use AddAudioClipCommand instead of direct dispatch
            import('../shared/commands').then(({ AddAudioClipCommand }) => {
              const command = new AddAudioClipCommand(
                state.audioLayers[0].id,
                {
                  id: generateId(),
                  src: audioURL,
                  label: 'Voiceover',
                  startAt: state.currentTime,
                  duration: duration,
                  offset: 0,
                  totalDuration: duration,
                }
              );
              executeCommand(command);
            });
          };
        };
        mediaRecorder.start();
        setIsRecording(true);
        dispatch({ type: 'SET_PLAYING', isPlaying: true });
      } catch (err) {
        alert('Mic access denied.');
      }
    }
  };

  useCanvasEngine(canvasRef, state, renderTick, previewAnim);

  const addElement = (type: ElementType) => {
    // Use AddElementCommand instead of direct dispatch
    import('../shared/commands').then(({ AddElementCommand }) => {
      const newElement = {
        type,
        x: 50,
        y: 50,
        width: type === 'text' ? 200 : 100,
        height: type === 'text' ? 50 : 100,
        rotation: 0,
        fill: type === 'text' ? '#000000' : '#4CAF50',
        opacity: 1,
        ...(type === 'text' ? { text: 'Text', fontSize: 24 } : {}),
      };

      const command = new AddElementCommand(state.activePageId, newElement as any);
      executeCommand(command);
    });
  };

  const handleContextMenuAction = (action: string, elementId?: string) => {
    if (action === 'delete' && elementId) {
      // Use DeleteElementCommand instead of direct dispatch
      import('../shared/commands').then(({ DeleteElementCommand }) => {
        const command = new DeleteElementCommand(state.activePageId, elementId);
        executeCommand(command);
      });
    } else if (action === 'duplicate' && elementId) {
      const page = state.pages.find(p => p.id === state.activePageId);
      const element = page?.elements.find(e => e.id === elementId);
      if (element) {
        // Use AddElementCommand for duplication
        import('../shared/commands').then(({ AddElementCommand }) => {
          const duplicatedElement = {
            ...element,
            x: element.x + 20,
            y: element.y + 20,
          };
          const command = new AddElementCommand(state.activePageId, duplicatedElement);
          executeCommand(command);
        });
      }
    }
  };

  // Export JSON function
  const exportToJSON = () => {
    const json = JSON.stringify({ pages: state.pages, audioLayers: state.audioLayers }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName || 'untitled'}-design.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <Header
        past={state.past}
        future={state.future}
        zoom={state.zoom}
        isExporting={state.isExporting}
        exportProgress={state.exportProgress}
        onUndo={() => undo()}
        onRedo={() => redo()}
        onExportVideo={() => exportVideo(canvasRef, state)}
        onExportJSON={exportToJSON}
        saveIndicator={
          <SaveIndicator
            isSaving={isSaving}
            lastSaved={lastSaved}
            error={saveError}
            queueSize={queueSize}
          />
        }
        createTemplateBtn={<CreateTemplateBtn onCreateTemplate={handleCreateTemplate} />}
        openTemplateBtn={<OpenTemplateBtn onOpenTemplate={handleOpenTemplate} />}
      />

      <div className="flex flex-1 overflow-hidden">
        {leftSidebarOpen && (
          <Sidebar
            activeTab={state.activeTab}
            onTabChange={tab => dispatch({ type: 'SET_ACTIVE_TAB', tab })}
            onAddElement={addElement}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto bg-gray-800 p-4">
            <Canvas
              canvasRef={canvasRef}
              state={state}
              dispatch={dispatch}
              executeCommand={executeCommand}
              containerRef={containerRef}
            />
          </div>

          <Timeline
            pages={state.pages}
            audioLayers={state.audioLayers}
            activePageId={state.activePageId}
            selectedElementId={state.selectedElementId}
            selectedAudioId={state.selectedAudioId}
            isPlaying={state.isPlaying}
            currentTime={state.currentTime}
            zoom={state.timelineZoom}
            height={state.timelineHeight}
            dispatch={dispatch}
          />
        </div>

        {state.isRightSidebarOpen && (
          <div className="w-64 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            {state.selectedElementId && activePage && (
              <PropertiesContent
                element={activePage.elements.find(e => e.id === state.selectedElementId)!}
                dispatch={dispatch}
                executeCommand={executeCommand}
              />
            )}
            {state.activeTab === 'animation' && <AnimationControl />}
          </div>
        )}
      </div>

      {state.contextMenu.visible &&
        createPortal(
          <ContextMenu
            x={state.contextMenu.x}
            y={state.contextMenu.y}
            onAction={handleContextMenuAction}
            elementId={state.contextMenu.elementId || undefined}
            onClose={() =>
              dispatch({
                type: 'SET_CONTEXT_MENU',
                visible: false,
                x: 0,
                y: 0,
                elementId: null,
                menuType: 'element',
              })
            }
          />,
          document.body
        )}
    </div>
  );
};

export default AppWithCommands;
