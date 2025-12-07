import type {
  AppState,
  ContentState,
  DesignElement,
  ElementType,
  Page,
  AudioClip,
  AudioLayer,
  AnimationSettings,
} from './types';

// --- 3. STATE & REDUCER ---
type Action =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CAPTURE_CHECKPOINT' } // Explicitly save history
  | { type: 'ADD_PAGE' }
  | { type: 'DUPLICATE_PAGE' }
  | { type: 'DELETE_PAGE'; id: string }
  | { type: 'SELECT_PAGE'; id: string }
  | {
      type: 'ADD_ELEMENT';
      elementType: ElementType;
      src?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }
  | {
      type: 'UPDATE_ELEMENT';
      id: string;
      attrs: Partial<DesignElement>;
      animation?: Partial<AnimationSettings>;
      saveHistory?: boolean; // Optional flag to force save
    }
  | { type: 'UPDATE_PAGE'; id: string; attrs: Partial<Page> }
  | { type: 'SELECT_ELEMENT'; id: string | null }
  | { type: 'SELECT_AUDIO'; id: string | null }
  | { type: 'DELETE_ELEMENT'; id?: string }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_TAB'; tab: AppState['activeTab'] }
  | { type: 'SET_BACKGROUND'; color: string }
  | { type: 'SET_ZOOM'; zoom: number; center?: { x: number; y: number } }
  | { type: 'SET_PAN'; pan: { x: number; y: number } }
  | { type: 'SET_CURRENT_TIME'; time: number }
  | { type: 'NEXT_PAGE' }
  | { type: 'SET_TIMELINE_HEIGHT'; height: number }
  | { type: 'SET_TIMELINE_ZOOM'; zoom: number }
  | { type: 'UPDATE_PAGE_DURATION'; id: string; duration: number }
  | {
      type: 'OPEN_CONTEXT_MENU';
      x: number;
      y: number;
      elementId: string | null;
      menuType: 'element' | 'audio';
    }
  | { type: 'CLOSE_CONTEXT_MENU' }
  | { type: 'COPY_ELEMENT'; id: string }
  | { type: 'ADD_AUDIO_LAYER' }
  | { type: 'ADD_AUDIO_CLIP'; layerId: string; clip: AudioClip }
  | {
      type: 'UPDATE_AUDIO_CLIP';
      layerId: string;
      clipId: string;
      newStart: number;
    }
  | {
      type: 'MOVE_AUDIO_CLIP';
      clipId: string;
      fromLayerId: string;
      toLayerId: string;
      newStart: number;
    }
  | {
      type: 'TRIM_AUDIO_CLIP';
      layerId: string;
      clipId: string;
      newStart: number;
      newDuration: number;
      newOffset: number;
    }
  | { type: 'DELETE_AUDIO_CLIP'; id: string }
  | { type: 'SET_SPACE_PRESSED'; pressed: boolean }
  | { type: 'START_EXPORT' }
  | { type: 'UPDATE_EXPORT_PROGRESS'; progress: number }
  | { type: 'FINISH_EXPORT' };

const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to get Element Class Name for Konva compatibility
const getClassName = (type: ElementType): string => {
  const map: Record<string, string> = {
    rect: 'Rect',
    circle: 'Circle',
    triangle: 'RegularPolygon', // Konva uses RegularPolygon for triangles
    star: 'Star',
    text: 'Text',
    image: 'Image',
  };
  return map[type] || 'Shape';
};

const initialState: AppState = {
  pages: [
    {
      id: generateId(),
      duration: 5,
      background: '#ffffff',
      elements: [
        {
          id: generateId(),
          type: 'text',
          className: 'Text',
          x: 200,
          y: 180,
          width: 400,
          height: 60,
          rotation: 0,
          fill: '#1e293b',
          text: 'NEW ARRIVALS',
          fontSize: 48,
          opacity: 1,
          animation: {
            type: 'rise',
            speed: 1,
            delay: 0,
            direction: 'up',
            mode: 'enter',
          },
        },
      ],
      animation: {
        type: 'none',
        speed: 1,
        delay: 0,
        direction: 'left',
        mode: 'enter',
      },
    },
  ],
  audioLayers: [
    { id: generateId(), clips: [] },
    { id: generateId(), clips: [] },
  ],
  past: [],
  future: [],
  activePageId: '',
  selectedElementId: null,
  selectedAudioId: null,
  isPlaying: false,
  zoom: 0.8,
  pan: { x: 0, y: 0 },
  activeTab: 'media',
  isRightSidebarOpen: false,
  currentTime: 0,
  timelineHeight: 250,
  timelineZoom: 40,
  contextMenu: { visible: false, x: 0, y: 0, elementId: null, type: 'element' },
  isSpacePressed: false,
  isExporting: false,
  exportProgress: 0,
};
initialState.activePageId = initialState.pages[0].id;

// --- Helper to snapshot state ---
const createSnapshot = (state: AppState): ContentState => ({
  pages: state.pages,
  audioLayers: state.audioLayers,
});

const reducer = (state: AppState, action: Action): AppState => {
  // Helper to push history
  const pushHistory = (s: AppState) => ({
    ...s,
    past: [...s.past, createSnapshot(s)],
    future: [],
  });

  switch (action.type) {
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        ...state,
        pages: previous.pages,
        audioLayers: previous.audioLayers,
        past: newPast,
        future: [createSnapshot(state), ...state.future],
        // Attempt to restore selection if possible, otherwise clear
        selectedElementId: null,
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        ...state,
        pages: next.pages,
        audioLayers: next.audioLayers,
        past: [...state.past, createSnapshot(state)],
        future: newFuture,
        selectedElementId: null,
      };
    }
    case 'CAPTURE_CHECKPOINT':
      return pushHistory(state);

    case 'ADD_PAGE':
      const stateWithHistoryAP = pushHistory(state);
      const newPage: Page = {
        id: generateId(),
        duration: 3,
        background: '#ffffff',
        elements: [],
        animation: {
          type: 'none',
          speed: 1,
          delay: 0,
          direction: 'left',
          mode: 'enter',
        },
      };
      return {
        ...stateWithHistoryAP,
        pages: [...stateWithHistoryAP.pages, newPage],
        activePageId: newPage.id,
      };
    case 'DUPLICATE_PAGE': {
      const stateWithHistoryDP = pushHistory(state);
      const index = stateWithHistoryDP.pages.findIndex(
        p => p.id === stateWithHistoryDP.activePageId
      );
      if (index === -1) return stateWithHistoryDP;
      const newPage = {
        ...stateWithHistoryDP.pages[index],
        id: generateId(),
        elements: stateWithHistoryDP.pages[index].elements.map(el => ({
          ...el,
          id: generateId(),
        })),
      };
      const newPages = [...stateWithHistoryDP.pages];
      newPages.splice(index + 1, 0, newPage);
      return {
        ...stateWithHistoryDP,
        pages: newPages,
        activePageId: newPage.id,
      };
    }
    case 'DELETE_PAGE':
      if (state.pages.length <= 1) return state;
      const stateWithHistoryDelP = pushHistory(state);
      const filtered = stateWithHistoryDelP.pages.filter(
        p => p.id !== action.id
      );
      return {
        ...stateWithHistoryDelP,
        pages: filtered,
        activePageId: filtered[0].id,
      };
    case 'SELECT_PAGE':
      return {
        ...state,
        activePageId: action.id,
        selectedElementId: null,
        selectedAudioId: null,
        contextMenu: { ...state.contextMenu, visible: false },
      };
    case 'ADD_ELEMENT':
      const stateWithHistoryAE = pushHistory(state);
      return {
        ...stateWithHistoryAE,
        pages: stateWithHistoryAE.pages.map(p => {
          if (p.id !== state.activePageId) return p;
          const newEl: DesignElement = {
            id: generateId(),
            type: action.elementType,
            className: getClassName(action.elementType),
            x: action.x || 350,
            y: action.y || 200,
            width: action.width || 100,
            height: action.height || 100,
            rotation: 0,
            fill: action.elementType === 'text' ? '#000000' : '#8b5cf6',
            opacity: 1,
            text: action.elementType === 'text' ? 'Add Text' : undefined,
            fontSize: 32,
            src: action.src,
            animation: {
              type: 'none',
              speed: 1,
              delay: 0,
              direction: 'up',
              mode: 'enter',
            },
          };
          if (action.elementType === 'text' && !action.width) {
            newEl.width = 300;
            newEl.height = 50;
          }
          return { ...p, elements: [...p.elements, newEl] };
        }),
        selectedElementId: null,
        isRightSidebarOpen: true,
      };
    case 'UPDATE_ELEMENT':
      // Logic: if saveHistory flag is true, push history FIRST
      const baseStateUE = action.saveHistory ? pushHistory(state) : state;
      return {
        ...baseStateUE,
        pages: baseStateUE.pages.map(p => {
          if (p.id !== state.activePageId) return p;
          return {
            ...p,
            elements: p.elements.map(el =>
              el.id === action.id
                ? {
                    ...el,
                    ...action.attrs,
                    animation: action.animation
                      ? { ...el.animation!, ...action.animation }
                      : el.animation,
                  }
                : el
            ),
          };
        }),
      };
    case 'UPDATE_PAGE':
      // Assuming Page updates (bg color, animation) are discrete enough to save history
      // Or we can rely on `onFocus` checkpointing in UI. Let's auto-save for now as it's safer.
      const stateWithHistoryUP = pushHistory(state);
      return {
        ...stateWithHistoryUP,
        pages: stateWithHistoryUP.pages.map(p =>
          p.id === action.id ? { ...p, ...action.attrs } : p
        ),
      };
    case 'SELECT_ELEMENT':
      return { ...state, selectedElementId: action.id, selectedAudioId: null };
    case 'SELECT_AUDIO':
      return { ...state, selectedAudioId: action.id, selectedElementId: null };
    case 'DELETE_ELEMENT':
      const targetId = action.id || state.selectedElementId;
      if (!targetId) return state;
      const stateWithHistoryDE = pushHistory(state);
      return {
        ...stateWithHistoryDE,
        pages: stateWithHistoryDE.pages.map(p =>
          p.id === state.activePageId
            ? { ...p, elements: p.elements.filter(e => e.id !== targetId) }
            : p
        ),
        selectedElementId:
          state.selectedElementId === targetId ? null : state.selectedElementId,
        contextMenu: { ...state.contextMenu, visible: false },
      };
    case 'COPY_ELEMENT':
      const pageIdx = state.pages.findIndex(p => p.id === state.activePageId);
      if (pageIdx === -1) return state;
      const elToCopy = state.pages[pageIdx].elements.find(
        e => e.id === action.id
      );
      if (!elToCopy) return state;
      const stateWithHistoryCE = pushHistory(state);
      const newEl = {
        ...elToCopy,
        id: generateId(),
        x: elToCopy.x + 20,
        y: elToCopy.y + 20,
      };
      return {
        ...stateWithHistoryCE,
        pages: stateWithHistoryCE.pages.map((p, i) =>
          i === pageIdx ? { ...p, elements: [...p.elements, newEl] } : p
        ),
        selectedElementId: newEl.id,
        contextMenu: { ...state.contextMenu, visible: false },
      };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.isPlaying, selectedElementId: null };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_BACKGROUND':
      const stateWithHistoryBG = pushHistory(state);
      return {
        ...stateWithHistoryBG,
        pages: stateWithHistoryBG.pages.map(p =>
          p.id === state.activePageId ? { ...p, background: action.color } : p
        ),
      };
    case 'SET_ZOOM':
      return { ...state, zoom: action.zoom };
    case 'SET_PAN':
      return { ...state, pan: action.pan };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: Math.max(0, action.time) };
    case 'NEXT_PAGE':
      const currentIndex = state.pages.findIndex(
        p => p.id === state.activePageId
      );
      return {
        ...state,
        activePageId: state.pages[(currentIndex + 1) % state.pages.length].id,
      };
    case 'SET_TIMELINE_HEIGHT':
      return {
        ...state,
        timelineHeight: Math.max(150, Math.min(600, action.height)),
      };
    case 'SET_TIMELINE_ZOOM':
      return {
        ...state,
        timelineZoom: Math.max(10, Math.min(200, action.zoom)),
      };
    case 'UPDATE_PAGE_DURATION':
      // This is continuous during drag, so we don't push history here. Handled by mouseUp.
      return {
        ...state,
        pages: state.pages.map(p =>
          p.id === action.id
            ? { ...p, duration: Math.max(1, action.duration) }
            : p
        ),
      };
    case 'OPEN_CONTEXT_MENU':
      return {
        ...state,
        contextMenu: {
          visible: true,
          x: action.x,
          y: action.y,
          elementId: action.elementId,
          type: action.menuType,
        },
      };
    case 'CLOSE_CONTEXT_MENU':
      return {
        ...state,
        contextMenu: { ...state.contextMenu, visible: false },
      };
    case 'ADD_AUDIO_LAYER':
      const stateWithHistoryAAL = pushHistory(state);
      return {
        ...stateWithHistoryAAL,
        audioLayers: [
          ...stateWithHistoryAAL.audioLayers,
          { id: generateId(), clips: [] },
        ],
      };
    case 'ADD_AUDIO_CLIP':
      const stateWithHistoryAAC = pushHistory(state);
      return {
        ...stateWithHistoryAAC,
        audioLayers: stateWithHistoryAAC.audioLayers.map(layer =>
          layer.id === action.layerId
            ? { ...layer, clips: [...layer.clips, action.clip] }
            : layer
        ),
      };
    case 'MOVE_AUDIO_CLIP': {
      // Dragging audio is continuous, so standard MOVE doesn't push history.
      // We rely on checkpointing before drag.
      let clipToMove: AudioClip | undefined;
      const stateWithoutClip = {
        ...state,
        audioLayers: state.audioLayers.map(layer =>
          layer.id === action.fromLayerId
            ? {
                ...layer,
                clips: layer.clips.filter(x => {
                  if (x.id === action.clipId) clipToMove = x;
                  return x.id !== action.clipId;
                }),
              }
            : layer
        ),
      };
      if (!clipToMove) return state;
      return {
        ...stateWithoutClip,
        audioLayers: stateWithoutClip.audioLayers.map(layer =>
          layer.id === action.toLayerId
            ? {
                ...layer,
                clips: [
                  ...layer.clips,
                  { ...clipToMove!, startAt: Math.max(0, action.newStart) },
                ],
              }
            : layer
        ),
      };
    }
    case 'TRIM_AUDIO_CLIP': {
      return {
        ...state,
        audioLayers: state.audioLayers.map(layer =>
          layer.id === action.layerId
            ? {
                ...layer,
                clips: layer.clips.map(c =>
                  c.id === action.clipId
                    ? {
                        ...c,
                        startAt: action.newStart,
                        duration: action.newDuration,
                        offset: action.newOffset,
                      }
                    : c
                ),
              }
            : layer
        ),
      };
    }
    case 'DELETE_AUDIO_CLIP':
      const targetAudioId = action.id || state.selectedAudioId;
      if (!targetAudioId) return state;
      const stateWithHistoryDAC = pushHistory(state);
      return {
        ...stateWithHistoryDAC,
        audioLayers: stateWithHistoryDAC.audioLayers.map(layer => ({
          ...layer,
          clips: layer.clips.filter(c => c.id !== targetAudioId),
        })),
        selectedAudioId: null,
        contextMenu: { ...state.contextMenu, visible: false },
      };
    case 'SET_SPACE_PRESSED':
      return { ...state, isSpacePressed: action.pressed };
    case 'START_EXPORT':
      return { ...state, isExporting: true, exportProgress: 0 };
    case 'UPDATE_EXPORT_PROGRESS':
      return { ...state, exportProgress: action.progress };
    case 'FINISH_EXPORT':
      return { ...state, isExporting: false, exportProgress: 0 };
    default:
      return state;
  }
};

export type { Action };
export { generateId, getClassName, initialState, createSnapshot, reducer };
