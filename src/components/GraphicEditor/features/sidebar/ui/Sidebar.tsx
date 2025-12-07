import { useState, useRef, useEffect } from 'react';
import {
  Layout,
  ImageIcon,
  Shapes,
  Type,
  Film,
  Music,
  Palette,
  Square,
  Circle as CircleIcon,
  Triangle,
  Star,
  Hexagon,
  Heart,
  Diamond,
  Mic,
  Plus,
  Pause,
  Play,
} from 'lucide-react';
import type { ElementType } from '../../../shared/model/types';
import { FASHION_ASSETS, AUDIO_ASSETS } from '../../../shared/lib/constants';
import NavButton from '../../../widgets/NavButton';
import ShapeBtn from '../../../widgets/ShapeBtn';
import PropertiesPanel from '../../properties/ui/PropertiesPanel';

const Sidebar = ({
  activeTab,
  onSetTab,
  onAddElement,
  selectedElement,
  onAddAudio,
  isRecording,
  onRecordToggle,
}: any) => {
  const handleDragStart = (
    e: React.DragEvent,
    type: ElementType | 'audio',
    src?: string,
    label?: string,
    duration?: number
  ) => {
    e.dataTransfer.setData('type', type);
    if (src) e.dataTransfer.setData('src', src);
    if (label) e.dataTransfer.setData('label', label);
    if (duration) e.dataTransfer.setData('duration', duration.toString());
  };

  // NEW: Audio Preview Logic
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(new Audio());

  const togglePreview = (track: any) => {
    if (playingPreviewId === track.id) {
      previewAudioRef.current.pause();
      setPlayingPreviewId(null);
    } else {
      previewAudioRef.current.src = track.src;
      previewAudioRef.current
        .play()
        .catch(e => console.error('Preview error', e));
      setPlayingPreviewId(track.id);
    }
  };

  // Stop preview on unmount
  useEffect(() => {
    return () => {
      previewAudioRef.current.pause();
    };
  }, []);

  return (
    <div className="flex h-full bg-white border-r border-gray-200 z-20 flex-shrink-0">
      {/* Icon Rail */}
      <div className="w-[72px] flex flex-col items-center py-4 border-r border-gray-100 bg-white gap-2 z-20">
        <NavButton
          icon={Layout}
          label="Design"
          active={activeTab === 'blocks'}
          onClick={() => onSetTab('blocks')}
        />
        <NavButton
          icon={ImageIcon}
          label="Uploads"
          active={activeTab === 'media'}
          onClick={() => onSetTab('media')}
        />
        <NavButton
          icon={Shapes}
          label="Elements"
          active={activeTab === 'shapes'}
          onClick={() => onSetTab('shapes')}
        />
        <NavButton
          icon={Type}
          label="Text"
          active={activeTab === 'text'}
          onClick={() => onSetTab('text')}
        />
        <NavButton
          icon={Film}
          label="Animate"
          active={activeTab === 'animation'}
          onClick={() => onSetTab('animation')}
        />
        <NavButton
          icon={Music}
          label="Sound"
          active={activeTab === 'audio'}
          onClick={() => onSetTab('audio')}
        />
        <NavButton
          icon={Palette}
          label="Draw"
          active={activeTab === 'color'}
          onClick={() => onSetTab('color')}
        />
      </div>

      <div className="w-80 bg-[#f9fafb] flex flex-col border-r border-gray-200 shadow-inner">
        {selectedElement ? (
          <PropertiesPanel element={selectedElement} onCheckpoint={() => {}} />
        ) : activeTab === 'animation' ? (
          <div className="flex flex-col h-full bg-white animate-in slide-in-from-left duration-200">
            <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 font-bold text-xs uppercase tracking-wider text-gray-600 bg-gray-50">
              <span>Page Animation</span>
            </div>
            {/* Page Animation Props Logic would go here, reusing the Portal pattern later */}
            <div
              id="page-anim-portal-target"
              className="flex-1 overflow-y-auto"
            />
          </div>
        ) : (
          <>
            <div className="h-14 flex items-center px-4 border-b border-gray-200 bg-white font-bold text-gray-800 capitalize">
              {activeTab === 'media' ? 'Images' : activeTab}
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === 'media' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {FASHION_ASSETS.map(asset => (
                      <div
                        key={asset.id}
                        draggable
                        onDragStart={e =>
                          handleDragStart(e, 'image', asset.src)
                        }
                        onClick={() => onAddElement('image', asset.src)}
                        className="cursor-grab active:cursor-grabbing group relative aspect-[3/4] rounded-md overflow-hidden bg-gray-200 hover:opacity-90"
                      >
                        <img
                          src={asset.src}
                          className="w-full h-full object-cover"
                          alt={asset.label}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'audio' && (
                <div className="space-y-6">
                  <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">
                      Voiceover
                    </h3>
                    <button
                      onClick={onRecordToggle}
                      className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-all
                                                ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                                            `}
                    >
                      {isRecording ? (
                        <Square size={16} fill="currentColor" />
                      ) : (
                        <Mic size={16} />
                      )}
                      {isRecording ? 'Stop Recording' : 'Record Voice'}
                    </button>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">
                      Library
                    </h3>
                    <div className="space-y-2">
                      {AUDIO_ASSETS.map(track => (
                        <div
                          key={track.id}
                          draggable
                          onDragStart={e =>
                            handleDragStart(
                              e,
                              'audio',
                              track.src,
                              track.label,
                              track.duration
                            )
                          }
                          className="p-2 bg-white border border-gray-200 rounded-lg flex items-center gap-3 cursor-grab active:cursor-grabbing hover:border-violet-300 transition-colors group"
                        >
                          {/* Play/Pause Button */}
                          <button
                            onClick={() => togglePreview(track)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors flex-shrink-0
                                                            ${playingPreviewId === track.id ? 'bg-violet-600' : 'bg-violet-400 hover:bg-violet-500'}
                                                        `}
                          >
                            {playingPreviewId === track.id ? (
                              <Pause size={12} fill="currentColor" />
                            ) : (
                              <Play size={12} fill="currentColor" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-700 truncate">
                              {track.label}
                            </div>
                            <div className="text-xs text-gray-400">
                              {track.duration}s
                            </div>
                          </div>
                          <button
                            onClick={() => onAddAudio(track)}
                            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-violet-600"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'shapes' && (
                <div className="grid grid-cols-3 gap-3">
                  <ShapeBtn
                    icon={Square}
                    type="rect"
                    onDragStart={handleDragStart}
                    onClick={() => onAddElement('rect')}
                  />
                  <ShapeBtn
                    icon={CircleIcon}
                    type="circle"
                    onDragStart={handleDragStart}
                    onClick={() => onAddElement('circle')}
                  />
                  <ShapeBtn
                    icon={Triangle}
                    type="triangle"
                    onDragStart={handleDragStart}
                    onClick={() => onAddElement('triangle')}
                  />
                  <ShapeBtn
                    icon={Star}
                    type="star"
                    onDragStart={handleDragStart}
                    onClick={() => onAddElement('star')}
                  />
                  <ShapeBtn
                    icon={Hexagon}
                    type="hexagon"
                    onDragStart={handleDragStart}
                    onClick={() => onAddElement('hexagon')}
                  />
                  <ShapeBtn
                    icon={Heart}
                    type="heart"
                    onDragStart={handleDragStart}
                    onClick={() => onAddElement('heart')}
                  />
                  <ShapeBtn
                    icon={Diamond}
                    type="diamond"
                    onDragStart={handleDragStart}
                    onClick={() => onAddElement('diamond')}
                  />
                </div>
              )}
              {activeTab === 'text' && (
                <div className="space-y-3">
                  <div
                    draggable
                    onDragStart={e => handleDragStart(e, 'text')}
                    onClick={() => onAddElement('text')}
                    className="w-full py-4 px-4 bg-gray-800 text-white rounded-lg font-bold text-2xl text-left cursor-grab"
                  >
                    Add Heading
                  </div>
                  <div
                    draggable
                    onDragStart={e => handleDragStart(e, 'text')}
                    onClick={() => onAddElement('text')}
                    className="w-full py-3 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium text-lg text-left cursor-grab"
                  >
                    Add Subheading
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
