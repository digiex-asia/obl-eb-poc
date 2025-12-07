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

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
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
            dispatch({
              type: 'ADD_AUDIO_CLIP',
              layerId: state.audioLayers[0].id,
              clip: {
                id: generateId(),
                src: audioURL,
                label: 'Voiceover',
                startAt: state.currentTime,
                duration: duration,
                offset: 0,
                totalDuration: duration,
              },
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

  useEffect(() => {
    let accumulated = 0;
    let targetPageId = null;
    for (let p of state.pages) {
      if (
        state.currentTime >= accumulated &&
        state.currentTime < accumulated + p.duration
      ) {
        targetPageId = p.id;
        break;
      }
      accumulated += p.duration;
    }
    if (
      !targetPageId &&
      state.pages.length > 0 &&
      state.currentTime >= accumulated
    )
      targetPageId = state.pages[state.pages.length - 1].id;
    if (targetPageId && targetPageId !== state.activePageId)
      dispatch({ type: 'SELECT_PAGE', id: targetPageId });
  }, [state.currentTime, state.pages, state.activePageId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmd = isMac ? e.metaKey : e.ctrlKey;

      if (cmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }

      if (
        (cmd && e.shiftKey && e.key.toLowerCase() === 'z') ||
        (cmd && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }

      if (cmd && e.altKey && e.key === 'n') {
        e.preventDefault();
        dispatch({ type: 'ADD_PAGE' });
      }
      if (cmd && e.key === 'd') {
        e.preventDefault();
        dispatch({ type: 'DUPLICATE_PAGE' });
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedElementId) {
          e.preventDefault();
          dispatch({ type: 'DELETE_ELEMENT' });
        }
        if (state.selectedAudioId) {
          e.preventDefault();
          dispatch({ type: 'DELETE_AUDIO_CLIP', id: state.selectedAudioId });
        }
      }

      if (
        e.code === 'Space' &&
        !e.repeat &&
        (document.activeElement === document.body ||
          document.activeElement === containerRef.current)
      ) {
        e.preventDefault();
        dispatch({ type: 'SET_SPACE_PRESSED', pressed: true });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        dispatch({ type: 'SET_SPACE_PRESSED', pressed: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state.selectedElementId, state.selectedAudioId]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type') as
      | ElementType
      | 'audio'
      | 'move_audio';
    if (type === 'audio' || type === 'move_audio') return;
    const src = e.dataTransfer.getData('src');
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const dx = clientX - (centerX + state.pan.x);
    const dy = clientY - (centerY + state.pan.y);
    const rawX = dx / state.zoom;
    const rawY = dy / state.zoom;
    const finalX = rawX + CANVAS_WIDTH / 2;
    const finalY = rawY + CANVAS_HEIGHT / 2;

    if (type === 'image' && src) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > 400) {
          const ratio = 400 / w;
          w = 400;
          h = h * ratio;
        }
        dispatch({
          type: 'ADD_ELEMENT',
          elementType: 'image',
          src,
          x: finalX - w / 2,
          y: finalY - h / 2,
          width: w,
          height: h,
        });
      };
    } else {
      dispatch({
        type: 'ADD_ELEMENT',
        elementType: type as ElementType,
        x: finalX - 50,
        y: finalY - 50,
      });
    }
  };

  useCanvasEngine(
    canvasRef,
    containerRef,
    activePage,
    state.selectedElementId,
    state.isPlaying,
    state.currentTime,
    state.zoom,
    state.pan,
    state.isSpacePressed,
    dispatch,
    pageStartTime,
    previewAnim
  );

  useEffect(() => {
    let interval: number;
    if (state.isPlaying) {
      const startTime = Date.now() - state.currentTime * 1000;
      interval = setInterval(() => {
        const now = Date.now();
        const newTime = (now - startTime) / 1000;
        const videoDur = state.pages.reduce((a, b) => a + b.duration, 0);
        const audioDur = state.audioLayers.reduce(
          (max, l) =>
            Math.max(
              max,
              l.clips.reduce((m, c) => Math.max(m, c.startAt + c.duration), 0)
            ),
          0
        );
        const totalDur = Math.max(videoDur, audioDur);
        if (newTime > totalDur) {
          dispatch({ type: 'SET_PLAYING', isPlaying: false });
          dispatch({ type: 'SET_CURRENT_TIME', time: 0 });
        } else {
          dispatch({ type: 'SET_CURRENT_TIME', time: newTime });
        }
        setRenderTick(t => t + 1);
      }, 1000 / 60);
    }
    return () => clearInterval(interval);
  }, [state.isPlaying, state.pages, state.audioLayers]);

  const exportToJSON = () => {
    const konvaData = {
      attrs: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      },
      className: 'Stage',
      children: state.pages.map(page => ({
        className: 'Layer',
        attrs: {
          name: `Page ${page.id}`,
          id: page.id,
          duration: page.duration,
          background: page.background,
        },
        children: page.elements.map(el => ({
          className: el.className || 'Shape',
          attrs: {
            id: el.id,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
            scaleX: 1,
            scaleY: 1,
            opacity: el.opacity,
            fill: el.fill,
            text: el.text,
            fontSize: el.fontSize,
            image: el.src,
            name: el.type,
            draggable: true,
          },
        })),
      })),
      audioLayers: state.audioLayers,
    };

    const blob = new Blob([JSON.stringify(konvaData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-export.json';
    a.click();
  };

  const selectedElement =
    activePage?.elements.find(e => e.id === state.selectedElementId) || null;

  // Portals for properties
  const propertiesPortalTarget = document.getElementById(
    'properties-portal-target'
  );
  const pageAnimPortalTarget = document.getElementById(
    'page-anim-portal-target'
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      <Header
        past={state.past}
        future={state.future}
        zoom={state.zoom}
        isExporting={state.isExporting}
        exportProgress={state.exportProgress}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onExportVideo={() => exportVideo(state.pages, state.audioLayers)}
        onExportJSON={exportToJSON}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={state.activeTab}
          onSetTab={(tab: any) => dispatch({ type: 'SET_TAB', tab })}
          onAddElement={(type: ElementType, src?: string) =>
            dispatch({ type: 'ADD_ELEMENT', elementType: type, src })
          }
          selectedElement={selectedElement}
          onAddAudio={(track: any) => {
            dispatch({
              type: 'ADD_AUDIO_CLIP',
              layerId: state.audioLayers[0].id,
              clip: {
                id: generateId(),
                src: track.src,
                label: track.label,
                startAt: state.currentTime,
                duration: track.duration,
                offset: 0,
                totalDuration: track.duration,
              },
            });
          }}
          isRecording={isRecording}
          onRecordToggle={toggleRecording}
        />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Canvas
            canvasRef={canvasRef}
            containerRef={containerRef}
            isSpacePressed={state.isSpacePressed}
            onDragOver={(e: React.DragEvent) => e.preventDefault()}
            onDrop={handleDrop}
          />

          <ContextMenu
            contextMenu={state.contextMenu}
            onDuplicate={(id: string) => dispatch({ type: 'COPY_ELEMENT', id })}
            onDelete={(id: string) => dispatch({ type: 'DELETE_ELEMENT', id })}
            onDeleteAudio={(id: string) =>
              dispatch({ type: 'DELETE_AUDIO_CLIP', id })
            }
          />

          <Timeline
            pages={state.pages}
            audioLayers={state.audioLayers}
            activePageId={state.activePageId}
            onSelect={(id: string) => dispatch({ type: 'SELECT_PAGE', id })}
            onAdd={() => dispatch({ type: 'ADD_PAGE' })}
            onDelete={(id: string) => dispatch({ type: 'DELETE_PAGE', id })}
            isPlaying={state.isPlaying}
            onTogglePlay={() =>
              dispatch({ type: 'SET_PLAYING', isPlaying: !state.isPlaying })
            }
            currentTime={state.currentTime}
            height={state.timelineHeight}
            onResize={(h: number) =>
              dispatch({ type: 'SET_TIMELINE_HEIGHT', height: h })
            }
            zoom={state.timelineZoom}
            onSetZoom={(z: number) => dispatch({ type: 'SET_TIMELINE_ZOOM', zoom: z })}
            onUpdatePageDuration={(id: string, duration: number) =>
              dispatch({ type: 'UPDATE_PAGE_DURATION', id, duration })
            }
            onScrub={(time: number) =>
              dispatch({ type: 'SET_CURRENT_TIME', time })
            }
            onAddAudioLayer={() => dispatch({ type: 'ADD_AUDIO_LAYER' })}
            onMoveAudioClip={(
              clipId: string,
              fromLayerId: string,
              toLayerId: string,
              newStart: number
            ) =>
              dispatch({
                type: 'MOVE_AUDIO_CLIP',
                clipId,
                fromLayerId,
                toLayerId,
                newStart,
              })
            }
            onDeleteAudioClip={(id: string) =>
              dispatch({ type: 'DELETE_AUDIO_CLIP', id })
            }
            onContextMenu={(e: React.MouseEvent, id: string, type: 'element' | 'audio') => {
              e.preventDefault();
              dispatch({
                type: 'OPEN_CONTEXT_MENU',
                x: e.clientX,
                y: e.clientY,
                elementId: id,
                menuType: type,
              });
            }}
            selectedAudioId={state.selectedAudioId}
            onSelectAudio={(id: string | null) =>
              dispatch({ type: 'SELECT_AUDIO', id })
            }
            onAddAudioClip={(layerId: string, clip: any) =>
              dispatch({ type: 'ADD_AUDIO_CLIP', layerId, clip })
            }
            onTrimAudioClip={({
              layerId,
              clipId,
              newStart,
              newDuration,
              newOffset,
            }: any) =>
              dispatch({
                type: 'TRIM_AUDIO_CLIP',
                layerId,
                clipId,
                newStart,
                newDuration,
                newOffset,
              })
            }
          />
        </div>
      </div>

      {/* Portals for Properties */}
      {selectedElement &&
        propertiesPortalTarget &&
        createPortal(
          <PropertiesContent
            element={selectedElement}
            onChange={(id: string, attrs: any) =>
              dispatch({ type: 'UPDATE_ELEMENT', id, attrs })
            }
            onPreviewAnim={setPreviewAnim}
            onCheckpoint={() => dispatch({ type: 'CAPTURE_CHECKPOINT' })}
          />,
          propertiesPortalTarget
        )}

      {activePage &&
        pageAnimPortalTarget &&
        state.activeTab === 'animation' &&
        createPortal(
          <AnimationControl
            value={activePage.animation}
            onChange={(anim: any) =>
              dispatch({
                type: 'UPDATE_PAGE',
                id: activePage.id,
                attrs: { animation: anim },
              })
            }
            options={PAGE_ANIMATIONS}
            onPreview={(type: string) =>
              setPreviewAnim(type ? { id: activePage.id, type } : null)
            }
          />,
          pageAnimPortalTarget
        )}
    </div>
  );
};

export default App;
