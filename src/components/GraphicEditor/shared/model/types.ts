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

// Rich text span for styled text
interface TextSpan {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrike?: boolean;
  backgroundColor?: string | null;
  letterSpacing?: number;
  lineHeight?: number;
}

interface DesignElement {
  id: string;
  type: ElementType;
  className?: string; // For Konva/Backend compatibility
  x: number;
  y: number;
  width: number;
  height: number;
  contentWidth?: number; // Actual content width (for image zoom)
  contentHeight?: number; // Actual content height (for image zoom)
  rotation: number;
  fill: string;
  text?: string;
  fontSize?: number;
  src?: string;
  opacity: number;
  animation?: AnimationSettings;
  stroke?: string; // Border color
  strokeWidth?: number; // Border width
  flipX?: boolean; // Horizontal flip
  flipY?: boolean; // Vertical flip
  fillImage?: string; // Pattern/texture fill
  groupId?: string; // Group ID for grouped elements

  // Rich text support
  valueList?: TextSpan[]; // Rich text content
  fontFamily?: string; // Font family for text
  isBold?: boolean; // Bold text
  isItalic?: boolean; // Italic text
  isUnderline?: boolean; // Underline text
  isStrike?: boolean; // Strikethrough text
  align?: 'left' | 'center' | 'right' | 'justify'; // Text alignment
  lineHeight?: number; // Line height multiplier
  letterSpacing?: number; // Letter spacing in pixels
  verticalAlign?: 'top' | 'middle' | 'bottom'; // Vertical alignment
  _layout?: any; // Cached layout data (internal)
  _renderHeight?: number; // Cached render height (internal)
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
  selectedIds: string[]; // Multi-selection support
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
  TextSpan,
  DesignElement,
  Page,
  AudioClip,
  AudioLayer,
  ContentState,
  AppState,
};
