import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Plus,
  Minus,
  Music,
  Trash2,
  X,
} from 'lucide-react';
import type { Page, AudioLayer, AudioClip } from '../../../shared/model/types';
import PageThumbnail from '../../../widgets/PageThumbnail';

// --- TIMELINE COMPONENTS ---
const Timeline = ({
  pages,
  audioLayers,
  activePageId,
  onSelect,
  onAdd,
  onDelete,
  isPlaying,
  onTogglePlay,
  currentTime,
  height,
  onResize,
  zoom,
  onSetZoom,
  onUpdatePageDuration,
  onScrub,
  onAddAudioLayer,
  onMoveAudioClip,
  onDeleteAudioClip,
  onContextMenu,
  selectedAudioId,
  onSelectAudio,
  onAddAudioClip,
  onTrimAudioClip, // NEW
}: any) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLCanvasElement>(null);
  const headerResizeRef = useRef<{ startY: number; startH: number } | null>(
    null
  );
  const pageResizeRef = useRef<{
    id: string;
    startX: number;
    initialDuration: number;
  } | null>(null);

  const totalDuration = pages.reduce(
    (acc: number, p: Page) => acc + p.duration,
    0
  );
  const maxAudioTime = audioLayers.reduce(
    (max: number, layer: AudioLayer) =>
      Math.max(
        max,
        layer.clips.reduce((m, c) => Math.max(m, c.startAt + c.duration), 0)
      ),
    0
  );
  const finalDuration = Math.max(totalDuration, maxAudioTime);
  const totalWidth = Math.max((finalDuration + 5) * zoom, 1000);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; left: number } | null>(null);
  const [draggingClip, setDraggingClip] = useState<{
    id: string;
    layerId: string;
    startX: number;
    originalStartAt: number;
  } | null>(null);

  // Audio Trim State
  const [trimmingClip, setTrimmingClip] = useState<{
    id: string;
    layerId: string;
    type: 'left' | 'right';
    startX: number;
    initialStart: number;
    initialDuration: number;
    initialOffset: number;
    totalDuration: number;
  } | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(10, Math.min(200, zoom * delta));
        onSetZoom(newZoom);
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom]);

  useEffect(() => {
    const canvas = rulerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalWidth * dpr;
    canvas.height = 24 * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalWidth, 24);
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px monospace';
    ctx.textBaseline = 'top';
    let interval = zoom < 20 ? 10 : zoom < 50 ? 5 : zoom < 100 ? 1 : 0.5;
    for (let t = 0; t <= finalDuration + 5; t += interval) {
      const x = t * zoom;
      const isMajor = Math.abs(t % (interval * 5)) < 0.01 || t === 0;
      const height = isMajor ? 12 : 6;
      ctx.fillRect(x, 0, 1, height);
      if (isMajor) {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        const text = `${m}:${s.toString().padStart(2, '0')}`;
        ctx.fillText(text, x + 4, 0);
      }
    }
  }, [zoom, totalWidth, finalDuration]);

  const handleHeaderResizeStart = (e: React.MouseEvent) => {
    headerResizeRef.current = { startY: e.clientY, startH: height };
    document.addEventListener('mousemove', handleHeaderResizeMove);
    document.addEventListener('mouseup', handleHeaderResizeEnd);
  };
  const handleHeaderResizeMove = (e: MouseEvent) => {
    if (!headerResizeRef.current) return;
    onResize(
      headerResizeRef.current.startH +
        (headerResizeRef.current.startY - e.clientY)
    );
  };
  const handleHeaderResizeEnd = () => {
    headerResizeRef.current = null;
    document.removeEventListener('mousemove', handleHeaderResizeMove);
    document.removeEventListener('mouseup', handleHeaderResizeEnd);
  };

  const handlePageResizeStart = (
    e: React.MouseEvent,
    pageId: string,
    currentDuration: number
  ) => {
    e.stopPropagation();
    pageResizeRef.current = {
      id: pageId,
      startX: e.clientX,
      initialDuration: currentDuration,
    };
    document.addEventListener('mousemove', handlePageResizeMove);
    document.addEventListener('mouseup', handlePageResizeEnd);
  };
  const handlePageResizeMove = (e: MouseEvent) => {
    if (!pageResizeRef.current) return;
    const dx = e.clientX - pageResizeRef.current.startX;
    const newDuration = Math.max(
      1,
      pageResizeRef.current.initialDuration + dx / zoom
    );
    onUpdatePageDuration(pageResizeRef.current.id, newDuration);
  };
  const handlePageResizeEnd = () => {
    pageResizeRef.current = null;
    document.removeEventListener('mousemove', handlePageResizeMove);
    document.removeEventListener('mouseup', handlePageResizeEnd);
  };

  const handleScrub = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!scrollContainerRef.current) return;
      const rect = scrollContainerRef.current.getBoundingClientRect();
      const offsetX =
        e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
      onScrub(Math.max(0, offsetX / zoom));
    },
    [zoom, onScrub]
  );

  const handleTrackMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('.cursor-ew-resize') ||
      (e.target as HTMLElement).closest('.audio-clip')
    )
      return;

    setIsPanning(true);
    if (scrollContainerRef.current) {
      panStart.current = {
        x: e.clientX,
        left: scrollContainerRef.current.scrollLeft,
      };
    }
  };

  // Clip Mouse Down Handler
  const handleClipMouseDown = (
    e: React.MouseEvent,
    clip: AudioClip,
    layerId: string
  ) => {
    e.stopPropagation();
    onSelectAudio(clip.id); // Select on click
    setDraggingClip({
      id: clip.id,
      layerId: layerId,
      startX: e.clientX,
      originalStartAt: clip.startAt,
    });
  };

  // Audio Trim Handler
  const handleTrimStart = (
    e: React.MouseEvent,
    clip: AudioClip,
    layerId: string,
    type: 'left' | 'right'
  ) => {
    e.stopPropagation();
    // Don't start drag/select
    setTrimmingClip({
      id: clip.id,
      layerId,
      type,
      startX: e.clientX,
      initialStart: clip.startAt,
      initialDuration: clip.duration,
      initialOffset: clip.offset,
      totalDuration: clip.totalDuration,
    });
  };

  const handleAudioDragStart = (
    e: React.DragEvent,
    clip: AudioClip,
    layerId: string
  ) => {
    e.dataTransfer.setData('type', 'move_audio');
    e.dataTransfer.setData('clipId', clip.id);
    e.dataTransfer.setData('fromLayerId', layerId);
    e.dataTransfer.setData(
      'startOffset',
      (e.nativeEvent.offsetX / zoom).toString()
    );
  };

  const handleTimelineDrop = (e: React.DragEvent, layerId?: string) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (!scrollContainerRef.current) return;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const time = Math.max(0, x / zoom);

    if (type === 'audio') {
      const src = e.dataTransfer.getData('src');
      const label = e.dataTransfer.getData('label');
      const duration = parseFloat(e.dataTransfer.getData('duration'));

      if (layerId && src && onAddAudioClip) {
        onAddAudioClip(layerId, {
          id: Date.now().toString(),
          src,
          label,
          duration,
          offset: 0,
          totalDuration: duration,
          startAt: time,
        });
      }
    }
    if (type === 'move_audio') {
      const clipId = e.dataTransfer.getData('clipId');
      const fromLayerId = e.dataTransfer.getData('fromLayerId');
      const startOffset = parseFloat(e.dataTransfer.getData('startOffset'));
      if (layerId)
        onMoveAudioClip(
          clipId,
          fromLayerId,
          layerId,
          Math.max(0, time - startOffset)
        );
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isScrubbing) {
        e.preventDefault();
        handleScrub(e);
      }
      if (isPanning && panStart.current && scrollContainerRef.current) {
        e.preventDefault();
        const dx = e.clientX - panStart.current.x;
        scrollContainerRef.current.scrollLeft = panStart.current.left - dx;
      }
      if (draggingClip) {
        e.preventDefault();
        const dx = e.clientX - draggingClip.startX;
        const dt = dx / zoom;
        const newStart = Math.max(0, draggingClip.originalStartAt + dt);
        onMoveAudioClip(
          draggingClip.id,
          draggingClip.layerId,
          draggingClip.layerId,
          newStart
        );
      }
      if (trimmingClip) {
        e.preventDefault();
        const dx = (e.clientX - trimmingClip.startX) / zoom;

        if (trimmingClip.type === 'left') {
          // Trimming left: changes startAt, offset, and duration
          let newStart = trimmingClip.initialStart + dx;
          // Constraint 1: Cannot start before 0
          if (newStart < 0) newStart = 0;

          let delta = newStart - trimmingClip.initialStart;
          let newOffset = trimmingClip.initialOffset + delta;
          let newDuration = trimmingClip.initialDuration - delta;

          // Constraint 2: Offset cannot be negative (can't go before start of source)
          if (newOffset < 0) {
            newOffset = 0;
            delta = newOffset - trimmingClip.initialOffset;
            newStart = trimmingClip.initialStart + delta;
            newDuration = trimmingClip.initialDuration - delta;
          }

          // Constraint 3: Min duration 0.1s
          if (newDuration < 0.1) {
            newDuration = 0.1;
            newStart =
              trimmingClip.initialStart + trimmingClip.initialDuration - 0.1;
            newOffset =
              trimmingClip.initialOffset + trimmingClip.initialDuration - 0.1;
          }

          if (onTrimAudioClip) {
            onTrimAudioClip({
              layerId: trimmingClip.layerId,
              clipId: trimmingClip.id,
              newStart,
              newDuration,
              newOffset,
            });
          }
        } else {
          // Trimming right: changes duration only
          let newDuration = trimmingClip.initialDuration + dx;

          // Constraint 1: Min duration 0.1s
          if (newDuration < 0.1) newDuration = 0.1;

          // Constraint 2: Cannot exceed total source duration
          if (
            trimmingClip.initialOffset + newDuration >
            trimmingClip.totalDuration
          ) {
            newDuration =
              trimmingClip.totalDuration - trimmingClip.initialOffset;
          }

          if (onTrimAudioClip) {
            onTrimAudioClip({
              layerId: trimmingClip.layerId,
              clipId: trimmingClip.id,
              newStart: trimmingClip.initialStart,
              newDuration,
              newOffset: trimmingClip.initialOffset,
            });
          }
        }
      }
    };
    const handleGlobalMouseUp = () => {
      setIsScrubbing(false);
      setIsPanning(false);
      setDraggingClip(null);
      setTrimmingClip(null);
    };
    if (isScrubbing || isPanning || draggingClip || trimmingClip) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [
    isScrubbing,
    isPanning,
    draggingClip,
    trimmingClip,
    handleScrub,
    zoom,
    onMoveAudioClip,
    onTrimAudioClip,
  ]);

  let currentX = 0;
  const pageBlocks = pages.map((page: Page) => {
    const start = currentX;
    const width = page.duration * zoom;
    currentX += width;
    return { ...page, start, width };
  });

  return (
    <div
      className="flex flex-col bg-white border-t border-gray-200 relative select-none"
      style={{ height }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-violet-500 z-50 bg-gray-200"
        onMouseDown={handleHeaderResizeStart}
      />
      <div className="h-10 flex items-center justify-between px-4 bg-gray-50 border-b border-gray-200 text-gray-700 text-xs flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onTogglePlay} className="hover:text-violet-600">
            {isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
          </button>
          <span>{currentTime.toFixed(1)}s</span>
          <button
            className="hover:text-violet-600"
            onClick={() => onSetZoom(zoom * 0.9)}
          >
            <Minus size={14} />
          </button>
          <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500"
              style={{ width: `${(zoom / 200) * 100}%` }}
            />
          </div>
          <button
            className="hover:text-violet-600"
            onClick={() => onSetZoom(zoom * 1.1)}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddAudioLayer}
            className="flex items-center gap-1 hover:text-violet-600 border px-2 py-1 rounded bg-white"
          >
            <Music size={12} /> Add Audio Track
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-1 hover:text-violet-600 border px-2 py-1 rounded bg-white"
          >
            <Plus size={12} /> Add Page
          </button>
        </div>
      </div>
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-x-auto overflow-y-auto relative custom-scrollbar bg-gray-100 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleTrackMouseDown}
        onDragOver={e => e.preventDefault()}
      >
        {/* Ruler */}
        <div
          className="h-6 border-b border-gray-200 sticky top-0 bg-white z-20 cursor-pointer"
          style={{ width: totalWidth }}
          onMouseDown={e => {
            e.stopPropagation();
            setIsScrubbing(true);
            handleScrub(e);
          }}
        >
          <canvas ref={rulerRef} style={{ width: totalWidth, height: 24 }} />
          {/* Draggable Playhead Handle */}
          <div
            className="absolute top-0 w-3 h-3 -ml-1.5 bg-red-500 rounded-b-full shadow z-30 hover:scale-125 transition-transform"
            style={{ left: currentTime * zoom }}
          />
        </div>
        {/* Tracks */}
        <div
          className="relative pt-2 px-0"
          style={{ width: totalWidth, minHeight: '100%' }}
        >
          {/* Video Track */}
          <div className="h-24 relative mb-1 border-b border-gray-200 bg-gray-50/50">
            {pageBlocks.map((page: any) => (
              <div
                key={page.id}
                className={`absolute top-2 h-20 rounded-md border overflow-hidden group transition-colors ${activePageId === page.id ? 'border-violet-500 ring-1 ring-violet-500 z-10' : 'border-gray-300 bg-white hover:border-gray-400'}`}
                style={{ left: page.start, width: page.width }}
                onClick={e => onSelect(page.id)}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <PageThumbnail page={page} width={page.width} height={80} />
                </div>
                <div className="absolute top-1 left-2 text-[10px] text-gray-500 font-mono truncate max-w-[90%] z-20 mix-blend-multiply font-bold">
                  Page {page.id.substr(0, 4)}
                </div>
                <div className="absolute bottom-1 left-2 text-[9px] text-gray-400 font-mono z-20 mix-blend-multiply">
                  {page.duration.toFixed(1)}s
                </div>
                <div
                  className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-violet-100 flex items-center justify-center group/handle z-30"
                  onMouseDown={e =>
                    handlePageResizeStart(e, page.id, page.duration)
                  }
                >
                  <div className="w-1 h-4 bg-gray-300 rounded-full group-hover/handle:bg-violet-400" />
                </div>
                <div className="absolute top-1 right-8 hidden group-hover:flex gap-1 z-20">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDelete(page.id);
                    }}
                    className="p-1 bg-white border border-gray-200 text-red-500 rounded hover:bg-red-50"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Audio Tracks */}
          {audioLayers.map((layer: AudioLayer, i: number) => (
            <div
              key={layer.id}
              className="h-10 relative mb-1 border-b border-gray-200 bg-blue-50/30"
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={e => handleTimelineDrop(e, layer.id)}
            >
              <div className="absolute left-2 top-3 text-[9px] text-gray-400 pointer-events-none sticky z-10">
                Audio {i + 1}
              </div>
              {layer.clips.map(clip => (
                <div
                  key={clip.id}
                  onMouseDown={e => handleClipMouseDown(e, clip, layer.id)} // Fix: use local handler
                  onClick={e => {
                    e.stopPropagation();
                    onSelectAudio(clip.id);
                  }}
                  className={`absolute top-1 h-8 bg-blue-100 border rounded flex items-center px-2 cursor-grab active:cursor-grabbing audio-clip overflow-hidden hover:bg-blue-200 transition-colors group
                                        ${selectedAudioId === clip.id ? 'border-violet-500 ring-2 ring-violet-300 z-10' : 'border-blue-300'}
                                    `}
                  style={{
                    left: clip.startAt * zoom,
                    width: clip.duration * zoom,
                  }}
                  onContextMenu={e => {
                    e.stopPropagation();
                    onContextMenu(e, clip.id, 'audio');
                  }}
                >
                  {/* Left Trim Handle */}
                  {selectedAudioId === clip.id && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 bg-violet-400/50 hover:bg-violet-600 cursor-w-resize z-20 flex items-center justify-center"
                      onMouseDown={e =>
                        handleTrimStart(e, clip, layer.id, 'left')
                      }
                    >
                      <div className="w-0.5 h-3 bg-white/50 rounded-full" />
                    </div>
                  )}

                  <Music
                    size={10}
                    className="text-blue-500 mr-1 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[10px] text-blue-800 truncate font-medium leading-none">
                      {clip.label}
                    </span>
                    {/* Fake Waveform */}
                    <div className="flex items-end gap-px h-3 opacity-30 mt-0.5">
                      {Array.from({ length: 20 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="w-1 bg-blue-600 rounded-full"
                          style={{ height: `${Math.random() * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[9px] text-blue-500 ml-2">
                    {clip.duration.toFixed(1)}s
                  </span>

                  {/* Right Trim Handle */}
                  {selectedAudioId === clip.id && (
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 bg-violet-400/50 hover:bg-violet-600 cursor-e-resize z-20 flex items-center justify-center"
                      onMouseDown={e =>
                        handleTrimStart(e, clip, layer.id, 'right')
                      }
                    >
                      <div className="w-0.5 h-3 bg-white/50 rounded-full" />
                    </div>
                  )}

                  {/* Hover Delete Button */}
                  <button
                    className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm z-20"
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteAudioClip(clip.id);
                    }}
                    title="Delete Clip"
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          ))}
          {/* Playhead Line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 z-40 pointer-events-none"
            style={{ left: currentTime * zoom }}
          />
        </div>
      </div>
    </div>
  );
};

export default Timeline;
