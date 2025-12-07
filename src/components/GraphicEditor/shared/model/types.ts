// --- 2. TYPES ---
type ElementType =
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'star'
  | 'polygon'
  | 'heart'
  | 'diamond'
  | 'image'
  | 'text';

interface AnimationSettings {
  type: string;
  speed: number;
  delay: number;
  direction: 'up' | 'down' | 'left' | 'right';
  mode: 'both' | 'enter' | 'exit';
}

interface DesignElement {
  id: string;
  type: ElementType;
  className?: string; // For Konva/Backend compatibility
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  text?: string;
  fontSize?: number;
  src?: string;
  opacity: number;
  animation?: AnimationSettings;
}

interface Page {
  id: string;
  duration: number;
  elements: DesignElement[];
  background: string;
  animation?: AnimationSettings;
}

interface AudioClip {
  id: string;
  src: string;
  label: string;
  startAt: number;
  duration: number;
  offset: number; // Start time within source file
  totalDuration: number; // Total length of source file
}

interface AudioLayer {
  id: string;
  clips: AudioClip[];
}

// Separate Content State for Undo/Redo
interface ContentState {
  pages: Page[];
  audioLayers: AudioLayer[];
}

interface AppState {
  pages: Page[];
  audioLayers: AudioLayer[];

  // History
  past: ContentState[];
  future: ContentState[];

  activePageId: string;
  selectedElementId: string | null;
  selectedAudioId: string | null;
  isPlaying: boolean;
  zoom: number;
  pan: { x: number; y: number };
  activeTab:
    | 'blocks'
    | 'media'
    | 'shapes'
    | 'text'
    | 'animation'
    | 'color'
    | 'audio';
  isRightSidebarOpen: boolean;
  currentTime: number;
  timelineHeight: number;
  timelineZoom: number;
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    elementId: string | null;
    type: 'element' | 'audio';
  };
  isSpacePressed: boolean;
  isExporting: boolean;
  exportProgress: number;
}

export type {
  ElementType,
  AnimationSettings,
  DesignElement,
  Page,
  AudioClip,
  AudioLayer,
  ContentState,
  AppState,
};
