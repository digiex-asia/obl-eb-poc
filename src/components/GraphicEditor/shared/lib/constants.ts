// --- 1. CONSTANTS & ASSETS ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450; // 16:9 Aspect Ratio
const PRIMARY_COLOR = '#7c3aed';
const SELECTION_COLOR = '#d946ef';
const HANDLE_COLOR = '#ffffff';
const GUIDE_COLOR = '#ec4899';
const SNAP_THRESHOLD = 10;
const HANDLE_SIZE = 8;
const ROTATE_HANDLE_OFFSET = 25;

const FASHION_ASSETS = [
  {
    id: 'img1',
    src: 'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=600',
    label: 'Street Style',
  },
  {
    id: 'img2',
    src: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=600',
    label: 'Vogue',
  },
  {
    id: 'img3',
    src: 'https://images.pexels.com/photos/1126993/pexels-photo-1126993.jpeg?auto=compress&cs=tinysrgb&w=600',
    label: 'Chic',
  },
  {
    id: 'img4',
    src: 'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=600',
    label: 'Mens',
  },
  {
    id: 'img5',
    src: 'https://images.pexels.com/photos/837140/pexels-photo-837140.jpeg?auto=compress&cs=tinysrgb&w=600',
    label: 'Classic',
  },
  {
    id: 'img6',
    src: 'https://images.pexels.com/photos/994234/pexels-photo-994234.jpeg?auto=compress&cs=tinysrgb&w=600',
    label: 'Urban',
  },
  {
    id: 'img7',
    src: 'https://images.pexels.com/photos/3755706/pexels-photo-3755706.jpeg?auto=compress&cs=tinysrgb&w=600',
    label: 'Coat',
  },
  {
    id: 'img8',
    src: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=600',
    label: 'Minimal',
  },
];

const AUDIO_ASSETS = [
  {
    id: 'track1',
    label: 'Synthwave',
    duration: 30,
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'track2',
    label: 'Acoustic Breeze',
    duration: 30,
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'track3',
    label: 'Piano Mood',
    duration: 30,
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
  {
    id: 'track4',
    label: 'Ocean Waves',
    duration: 20,
    src: 'https://actions.google.com/sounds/v1/water/waves_crashing_on_rocks_1.ogg',
  },
];

const ANIMATIONS = [
  { id: 'none', label: 'None', css: '' },
  { id: 'fade', label: 'Fade', css: 'animate-pulse' },
  { id: 'rise', label: 'Rise', css: 'animate-bounce' },
  { id: 'pan', label: 'Pan', css: 'translate-x-2' },
  { id: 'wipe', label: 'Wipe', css: 'scale-x-0 origin-left' },
  { id: 'pop', label: 'Pop', css: 'scale-110' },
  { id: 'breathe', label: 'Breathe', css: 'scale-95' },
  { id: 'tectonic', label: 'Gravity', css: 'translate-y-2' },
  { id: 'shake', label: 'Shake', css: 'rotate-3' },
  { id: 'pulse', label: 'Pulse', css: 'opacity-50' },
  { id: 'wiggle', label: 'Wiggle', css: 'skew-x-6' },
];

const PAGE_ANIMATIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Simple Fade' },
  { id: 'slide', label: 'Slide In' },
  { id: 'zoom', label: 'Zoom In' },
  { id: 'wipe', label: 'Wipe' },
];

export {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PRIMARY_COLOR,
  SELECTION_COLOR,
  HANDLE_COLOR,
  GUIDE_COLOR,
  SNAP_THRESHOLD,
  HANDLE_SIZE,
  ROTATE_HANDLE_OFFSET,
  FASHION_ASSETS,
  AUDIO_ASSETS,
  ANIMATIONS,
  PAGE_ANIMATIONS,
};
