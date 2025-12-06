import * as React from 'react';
import {
    Play,
    Pause,
    Plus,
    Trash2,
    Copy,
    Square,
    Circle as CircleIcon,
    Type,
    Image as ImageIcon,
    ChevronLeft,
    ChevronRight,
    Layers,
    Download,
    Film,
    Palette,
    Search,
    Layout,
    Sparkles,
    Star,
    Triangle,
    Hexagon,
    Minus,
    ZoomIn,
    Shapes,
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    MoreVertical,
    RotateCw,
    X,
    Music,
    Mic,
    Volume2,
    Headphones,
    Heart,
    Diamond,
    Undo2,
    Redo2,
    Save,
    GripVertical,
    Loader2,
} from 'lucide-react';

const { useEffect, useRef, useState, useReducer, useMemo, useCallback } = React;

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
    activeTab: 'blocks' | 'media' | 'shapes' | 'text' | 'animation' | 'color' | 'audio';
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
    | { type: 'UPDATE_AUDIO_CLIP'; layerId: string; clipId: string; newStart: number }
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
                    animation: { type: 'rise', speed: 1, delay: 0, direction: 'up', mode: 'enter' },
                },
            ],
            animation: { type: 'none', speed: 1, delay: 0, direction: 'left', mode: 'enter' },
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
                animation: { type: 'none', speed: 1, delay: 0, direction: 'left', mode: 'enter' },
            };
            return {
                ...stateWithHistoryAP,
                pages: [...stateWithHistoryAP.pages, newPage],
                activePageId: newPage.id,
            };
        case 'DUPLICATE_PAGE': {
            const stateWithHistoryDP = pushHistory(state);
            const index = stateWithHistoryDP.pages.findIndex(
                (p) => p.id === stateWithHistoryDP.activePageId
            );
            if (index === -1) return stateWithHistoryDP;
            const newPage = {
                ...stateWithHistoryDP.pages[index],
                id: generateId(),
                elements: stateWithHistoryDP.pages[index].elements.map((el) => ({
                    ...el,
                    id: generateId(),
                })),
            };
            const newPages = [...stateWithHistoryDP.pages];
            newPages.splice(index + 1, 0, newPage);
            return { ...stateWithHistoryDP, pages: newPages, activePageId: newPage.id };
        }
        case 'DELETE_PAGE':
            if (state.pages.length <= 1) return state;
            const stateWithHistoryDelP = pushHistory(state);
            const filtered = stateWithHistoryDelP.pages.filter((p) => p.id !== action.id);
            return { ...stateWithHistoryDelP, pages: filtered, activePageId: filtered[0].id };
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
                pages: stateWithHistoryAE.pages.map((p) => {
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
                pages: baseStateUE.pages.map((p) => {
                    if (p.id !== state.activePageId) return p;
                    return {
                        ...p,
                        elements: p.elements.map((el) =>
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
                pages: stateWithHistoryUP.pages.map((p) =>
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
                pages: stateWithHistoryDE.pages.map((p) =>
                    p.id === state.activePageId
                        ? { ...p, elements: p.elements.filter((e) => e.id !== targetId) }
                        : p
                ),
                selectedElementId:
                    state.selectedElementId === targetId ? null : state.selectedElementId,
                contextMenu: { ...state.contextMenu, visible: false },
            };
        case 'COPY_ELEMENT':
            const pageIdx = state.pages.findIndex((p) => p.id === state.activePageId);
            if (pageIdx === -1) return state;
            const elToCopy = state.pages[pageIdx].elements.find((e) => e.id === action.id);
            if (!elToCopy) return state;
            const stateWithHistoryCE = pushHistory(state);
            const newEl = { ...elToCopy, id: generateId(), x: elToCopy.x + 20, y: elToCopy.y + 20 };
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
                pages: stateWithHistoryBG.pages.map((p) =>
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
            const currentIndex = state.pages.findIndex((p) => p.id === state.activePageId);
            return {
                ...state,
                activePageId: state.pages[(currentIndex + 1) % state.pages.length].id,
            };
        case 'SET_TIMELINE_HEIGHT':
            return { ...state, timelineHeight: Math.max(150, Math.min(600, action.height)) };
        case 'SET_TIMELINE_ZOOM':
            return { ...state, timelineZoom: Math.max(10, Math.min(200, action.zoom)) };
        case 'UPDATE_PAGE_DURATION':
            // This is continuous during drag, so we don't push history here. Handled by mouseUp.
            return {
                ...state,
                pages: state.pages.map((p) =>
                    p.id === action.id ? { ...p, duration: Math.max(1, action.duration) } : p
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
            return { ...state, contextMenu: { ...state.contextMenu, visible: false } };
        case 'ADD_AUDIO_LAYER':
            const stateWithHistoryAAL = pushHistory(state);
            return {
                ...stateWithHistoryAAL,
                audioLayers: [...stateWithHistoryAAL.audioLayers, { id: generateId(), clips: [] }],
            };
        case 'ADD_AUDIO_CLIP':
            const stateWithHistoryAAC = pushHistory(state);
            return {
                ...stateWithHistoryAAC,
                audioLayers: stateWithHistoryAAC.audioLayers.map((layer) =>
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
                audioLayers: state.audioLayers.map((layer) =>
                    layer.id === action.fromLayerId
                        ? {
                              ...layer,
                              clips: layer.clips.filter((x) => {
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
                audioLayers: stateWithoutClip.audioLayers.map((layer) =>
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
                audioLayers: state.audioLayers.map((layer) =>
                    layer.id === action.layerId
                        ? {
                              ...layer,
                              clips: layer.clips.map((c) =>
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
                audioLayers: stateWithHistoryDAC.audioLayers.map((layer) => ({
                    ...layer,
                    clips: layer.clips.filter((c) => c.id !== targetAudioId),
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

// --- 4. HOOKS ---

// --- WORKER SCRIPT STRING ---
// We render in worker but 'record' from main thread to support MediaRecorder + OffscreenCanvas better
const WORKER_CODE = `
    let canvas = null;
    let ctx = null;

    self.onmessage = async ({ data }) => {
        if (data.type === 'init') {
            canvas = data.canvas;
            ctx = canvas.getContext('2d');
        }
        if (data.type === 'start') {
            const { pages, width, height, duration, fps } = data;
            const totalFrames = Math.ceil(duration * fps);

            // Pre-load images
            const imageCache = new Map();
            const imageUrls = new Set();
            pages.forEach(p => p.elements.forEach(el => {
                if (el.type === 'image' && el.src) imageUrls.add(el.src);
            }));

            await Promise.all(Array.from(imageUrls).map(async src => {
                try {
                    const response = await fetch(src);
                    const blob = await response.blob();
                    const bitmap = await createImageBitmap(blob);
                    imageCache.set(src, bitmap);
                } catch (e) { console.error('Error loading image in worker', src); }
            }));

            // Render Loop
            for (let i = 0; i <= totalFrames; i++) {
                const currentTime = i / fps;

                // Identify active page
                let activePage = null;
                let pageStartTime = 0;
                let accumulated = 0;

                for (const p of pages) {
                    if (currentTime >= accumulated && currentTime < accumulated + p.duration) {
                        activePage = p;
                        pageStartTime = accumulated;
                        break;
                    }
                    accumulated += p.duration;
                }
                if (!activePage && pages.length > 0 && currentTime >= accumulated) {
                    activePage = pages[pages.length - 1];
                    pageStartTime = accumulated - activePage.duration;
                }

                if (activePage) {
                    // Clear
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, width, height);

                    // Background
                    ctx.fillStyle = activePage.background.startsWith('linear') ? '#ffffff' : activePage.background;
                    ctx.fillRect(0, 0, width, height);

                    const localTime = Math.max(0, currentTime - pageStartTime);

                    // Elements
                    activePage.elements.forEach(el => {
                        ctx.save();
                        let animOpacity = el.opacity;
                        let animY = el.y;
                        let animX = el.x;
                        let animScale = 1;
                        let animRot = el.rotation;

                        if (el.animation && el.animation.type !== 'none') {
                            const anim = el.animation;
                            const t = Math.max(0, localTime - anim.delay);
                            const dur = 1 / (anim.speed || 1);
                            const progress = Math.min(1, t / dur);
                            const eased = progress * (2 - progress);

                            if (progress > 0) {
                                if (anim.type === 'fade') animOpacity = eased;
                                else if (anim.type === 'rise') animY = el.y + (1 - eased) * 50;
                                else if (anim.type === 'pan') animX = el.x + (1 - eased) * -50;
                                else if (anim.type === 'pop') animScale = eased;
                                else if (anim.type === 'shake') animX = el.x + Math.sin(t * 20) * 5;
                                else if (anim.type === 'pulse') animScale = 1 + Math.sin(t * 5) * 0.05;
                                else if (anim.type === 'wiggle') animRot = el.rotation + Math.sin(t * 10) * 5;
                            } else if (anim.delay > 0) {
                                animOpacity = 0;
                            }
                        }

                        const cx = animX + el.width / 2;
                        const cy = animY + el.height / 2;
                        ctx.translate(cx, cy);
                        ctx.rotate((animRot * Math.PI) / 180);
                        ctx.scale(animScale, animScale);
                        ctx.translate(-el.width / 2, -el.height / 2);
                        ctx.globalAlpha = animOpacity;

                        if (el.type === 'rect') {
                            ctx.fillStyle = el.fill;
                            ctx.fillRect(0, 0, el.width, el.height);
                        } else if (el.type === 'circle') {
                            ctx.fillStyle = el.fill;
                            ctx.beginPath();
                            ctx.ellipse(el.width/2, el.height/2, el.width/2, el.height/2, 0, 0, Math.PI * 2);
                            ctx.fill();
                        } else if (el.type === 'image' && el.src) {
                            const bmp = imageCache.get(el.src);
                            if (bmp) {
                                ctx.drawImage(bmp, 0, 0, el.width, el.height);
                            } else {
                                ctx.fillStyle = '#ccc';
                                ctx.fillRect(0, 0, el.width, el.height);
                            }
                        } else if (el.type === 'text' && el.text) {
                            ctx.fillStyle = el.fill;
                            ctx.font = el.fontSize + 'px sans-serif';
                            ctx.textBaseline = 'top';
                            ctx.fillText(el.text, 0, 0);
                        } else if (el.type === 'star') {
                             ctx.fillStyle = el.fill; ctx.beginPath();
                             const cx = el.width/2, cy = el.height/2, r = Math.min(el.width, el.height)/2;
                             for (let k = 0; k < 5; k++) {
                                 ctx.lineTo(cx + r * Math.cos(((18+k*72)/180)*Math.PI), cy - r * Math.sin(((18+k*72)/180)*Math.PI));
                                 ctx.lineTo(cx + (r/2.5) * Math.cos(((54+k*72)/180)*Math.PI), cy - (r/2.5) * Math.sin(((54+k*72)/180)*Math.PI));
                             }
                             ctx.closePath(); ctx.fill();
                        } else {
                            ctx.fillStyle = el.fill;
                            ctx.fillRect(0, 0, el.width, el.height);
                        }

                        ctx.restore();
                    });
                }

                // Throttle Loop - we match frame duration
                await new Promise(r => setTimeout(r, 33)); // ~30fps

                // Notify progress
                if (i % 30 === 0) {
                    self.postMessage({ type: 'progress', progress: i / totalFrames });
                }
            }

            // Allow last frame to settle
            await new Promise(r => setTimeout(r, 100));
            self.postMessage({ type: 'done' });
        }
    };
`;

const useVideoExporter = (dispatch: React.Dispatch<Action>) => {
    const workerRef = useRef<Worker | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

    useEffect(() => {
        // Create hidden canvas DOM element
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        canvasRef.current = canvas;

        // Create Worker
        const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        workerRef.current = new Worker(url);

        // Transfer control to worker
        // Note: transferControlToOffscreen consumes the context capability of the canvas
        try {
            const offscreen = canvas.transferControlToOffscreen();
            workerRef.current.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
        } catch (e) {
            console.error('OffscreenCanvas not supported or already transferred', e);
        }

        workerRef.current.onmessage = (e) => {
            const { type, progress } = e.data;
            if (type === 'progress') {
                dispatch({ type: 'UPDATE_EXPORT_PROGRESS', progress });
            } else if (type === 'done') {
                if (recorderRef.current && recorderRef.current.state === 'recording') {
                    recorderRef.current.stop();
                }
                // Close audio context
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }
            }
        };

        return () => {
            workerRef.current?.terminate();
            URL.revokeObjectURL(url);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    const exportVideo = async (pages: Page[], audioLayers: AudioLayer[]) => {
        if (!workerRef.current || !canvasRef.current) return;
        dispatch({ type: 'START_EXPORT' });

        const totalDuration = pages.reduce((acc, p) => acc + p.duration, 0);
        chunksRef.current = [];

        // 1. Prepare Audio Context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioDest = audioContext.createMediaStreamDestination();
        audioContextRef.current = audioContext;
        audioDestRef.current = audioDest;

        // 2. Load and Schedule Audio Clips
        const loadAndScheduleAudio = async () => {
            const promises = [];
            for (const layer of audioLayers) {
                for (const clip of layer.clips) {
                    // Only fetch if clip starts within video duration
                    if (clip.startAt < totalDuration) {
                        promises.push(
                            fetch(clip.src)
                                .then((res) => res.arrayBuffer())
                                .then((buffer) => audioContext.decodeAudioData(buffer))
                                .then((audioBuffer) => {
                                    const source = audioContext.createBufferSource();
                                    source.buffer = audioBuffer;
                                    source.connect(audioDest);
                                    // Schedule: start(when, offset, duration)
                                    // when: relative to now (which corresponds to video start) + clip start time
                                    // offset: clip internal offset
                                    // duration: clip duration
                                    source.start(
                                        audioContext.currentTime + clip.startAt,
                                        clip.offset,
                                        clip.duration
                                    );
                                })
                                .catch((err) =>
                                    console.error('Error decoding audio for export', err)
                                )
                        );
                    }
                }
            }
            await Promise.all(promises);
        };

        await loadAndScheduleAudio();

        // 3. Setup MediaRecorder with Mixed Audio + Video
        const videoStream = canvasRef.current.captureStream(30); // 30 FPS
        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioDest.stream.getAudioTracks(),
        ]);

        const mimeType = MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.424028, mp4a.40.2"')
            ? 'video/mp4; codecs="avc1.424028, mp4a.40.2"'
            : 'video/webm;codecs=vp9';

        const recorder = new MediaRecorder(combinedStream, {
            mimeType,
            videoBitsPerSecond: 5000000,
        });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType.split(';')[0] });
            dispatch({ type: 'FINISH_EXPORT' });

            // Download
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `video-export.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
            a.click();
        };

        // 4. Start Everything
        recorder.start();
        // Tell worker to start rendering video frames
        workerRef.current.postMessage({
            type: 'start',
            pages: JSON.parse(JSON.stringify(pages)),
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            duration: totalDuration,
            fps: 30,
        });
    };

    return { exportVideo };
};

const useAudioController = (layers: AudioLayer[], isPlaying: boolean, currentTime: number) => {
    const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
    const lastTimeRef = useRef(currentTime);

    useEffect(() => {
        layers.forEach((layer) => {
            layer.clips.forEach((clip) => {
                let audio = audioRefs.current.get(clip.id);
                if (!audio) {
                    audio = new Audio(clip.src);
                    audioRefs.current.set(clip.id, audio);
                }
                const clipTime = currentTime - clip.startAt + clip.offset; // Adjusted for offset
                const inRange =
                    currentTime >= clip.startAt && currentTime < clip.startAt + clip.duration;

                if (isPlaying && inRange) {
                    if (audio.paused) {
                        audio.currentTime = clipTime;
                        audio.play().catch(() => {});
                    } else if (Math.abs(audio.currentTime - clipTime) > 0.3) {
                        audio.currentTime = clipTime;
                    }
                } else {
                    if (!audio.paused) audio.pause();
                }
            });
        });
        const activeIds = new Set(layers.flatMap((l) => l.clips.map((c) => c.id)));
        audioRefs.current.forEach((audio, id) => {
            if (!activeIds.has(id)) {
                audio.pause();
                audioRefs.current.delete(id);
            }
        });
    }, [layers, isPlaying, currentTime]);

    useEffect(() => {
        if (Math.abs(currentTime - lastTimeRef.current) > 0.5) {
            audioRefs.current.forEach((a) => a.pause());
        }
        lastTimeRef.current = currentTime;
    }, [currentTime]);
};

const useCanvasEngine = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    containerRef: React.RefObject<HTMLDivElement>, // New: Container for wheel events
    page: Page | undefined,
    selectedId: string | null,
    isPlaying: boolean,
    currentTime: number,
    zoom: number,
    pan: { x: number; y: number },
    isSpacePressed: boolean, // New: Space key state
    dispatch: React.Dispatch<Action>,
    pageStartTime: number,
    previewAnimation: { id: string; type: string } | null
) => {
    const dragInfo = useRef<{
        active: boolean;
        type: 'move' | 'resize' | 'rotate' | 'pan';
        handle?: string;
        id: string | null;
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        initialW: number;
        initialH: number;
        initialRot: number;
    }>({
        active: false,
        type: 'move',
        id: null,
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        initialW: 0,
        initialH: 0,
        initialRot: 0,
    });

    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const getImg = (src: string) => {
        if (imageCache.current.has(src)) return imageCache.current.get(src)!;
        const img = new Image();
        img.src = src;
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            imageCache.current.set(src, img);
        };
        return img;
    };

    // Zoom and Pan Handling via Wheel
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                // Zoom
                const delta = -e.deltaY;
                const factor = 0.001; // Sensitivity
                const newZoom = Math.max(0.1, Math.min(5, zoom + delta * factor));
                dispatch({ type: 'SET_ZOOM', zoom: newZoom });
            } else {
                // Pan
                dispatch({
                    type: 'SET_PAN',
                    pan: { x: pan.x - e.deltaX, y: pan.y - e.deltaY },
                });
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [zoom, pan]);

    useEffect(() => {
        if (!canvasRef.current || !canvasRef.current.parentElement) return;
        const parent = canvasRef.current.parentElement;
        const resizeObserver = new ResizeObserver(() => {
            if (canvasRef.current && parent) {
                const dpr = window.devicePixelRatio || 1;
                canvasRef.current.width = parent.clientWidth * dpr;
                canvasRef.current.height = parent.clientHeight * dpr;
                canvasRef.current.style.width = `${parent.clientWidth}px`;
                canvasRef.current.style.height = `${parent.clientHeight}px`;
            }
        });
        resizeObserver.observe(parent);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !page) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrame: number;

        const render = () => {
            const dpr = window.devicePixelRatio || 1;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#e5e7eb';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.scale(dpr, dpr);
            const centerX = canvas.width / dpr / 2;
            const centerY = canvas.height / dpr / 2;

            ctx.translate(centerX + pan.x, centerY + pan.y);
            ctx.scale(zoom, zoom);
            ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);

            // --- PAGE ANIMATION ---
            const localTime = Math.max(0, currentTime - pageStartTime);
            let pageOpacity = 1;

            if (isPlaying && page.animation && page.animation.type !== 'none') {
                const pAnim = page.animation;
                const t = Math.max(0, localTime - pAnim.delay);
                const duration = 1 / (pAnim.speed || 1);
                const progress = Math.min(1, t / duration);
                const eased = progress * (2 - progress);

                // Only apply enter animation if we are at start
                if (progress <= 1) {
                    if (pAnim.type === 'fade') pageOpacity = eased;
                    if (pAnim.type === 'slide') {
                        ctx.translate((1 - eased) * -CANVAS_WIDTH, 0);
                    }
                    if (pAnim.type === 'zoom') {
                        const s = 0.5 + eased * 0.5;
                        ctx.translate((CANVAS_WIDTH / 2) * (1 - s), (CANVAS_HEIGHT / 2) * (1 - s));
                        ctx.scale(s, s);
                    }
                }
            }
            ctx.globalAlpha = pageOpacity;

            // Page Background
            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 30;
            ctx.shadowOffsetY = 10;
            if (page.background.startsWith('linear-gradient')) {
                const colors = page.background.match(/#[a-fA-F0-9]{6}/g);
                if (colors && colors.length >= 2) {
                    const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
                    grad.addColorStop(0, colors[0]);
                    grad.addColorStop(1, colors[1]);
                    ctx.fillStyle = grad;
                } else {
                    ctx.fillStyle = '#ffffff';
                }
            } else {
                ctx.fillStyle = page.background;
            }
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            // Render Elements
            page.elements.forEach((el) => {
                ctx.save();

                let animOpacity = el.opacity;
                let animY = el.y;
                let animX = el.x;
                let animScale = 1;
                let animRot = el.rotation;

                const isPreview = previewAnimation && previewAnimation.id === el.id;
                const shouldAnimate = isPlaying || isPreview;

                if (shouldAnimate) {
                    const anim = isPreview
                        ? { ...el.animation, type: previewAnimation.type }
                        : el.animation;
                    if (anim && anim.type !== 'none') {
                        let t = isPlaying
                            ? Math.max(0, localTime - anim.delay)
                            : (Date.now() % 2000) / 1000;
                        const duration = 1 / (anim.speed || 1);
                        const progress = Math.min(1, t / duration);
                        const eased = progress * (2 - progress);

                        if (progress > 0 || isPreview) {
                            if (anim.type === 'fade') animOpacity = eased;
                            else if (anim.type === 'rise') animY = el.y + (1 - eased) * 50;
                            else if (anim.type === 'pan') animX = el.x + (1 - eased) * -50;
                            else if (anim.type === 'pop') animScale = eased;
                            else if (anim.type === 'shake') animX = el.x + Math.sin(t * 20) * 5;
                            else if (anim.type === 'pulse') animScale = 1 + Math.sin(t * 5) * 0.05;
                            else if (anim.type === 'wiggle')
                                animRot = el.rotation + Math.sin(t * 10) * 5;
                        } else if (anim.delay > 0 && isPlaying) {
                            animOpacity = 0;
                        }
                    }
                }

                const cx = animX + el.width / 2;
                const cy = animY + el.height / 2;
                ctx.translate(cx, cy);
                ctx.rotate((animRot * Math.PI) / 180);
                ctx.scale(animScale, animScale);
                ctx.translate(-el.width / 2, -el.height / 2);
                ctx.globalAlpha = animOpacity * pageOpacity;

                // Draw Element
                if (el.type === 'rect') {
                    ctx.fillStyle = el.fill;
                    ctx.fillRect(0, 0, el.width, el.height);
                } else if (el.type === 'circle') {
                    ctx.fillStyle = el.fill;
                    ctx.beginPath();
                    ctx.ellipse(
                        el.width / 2,
                        el.height / 2,
                        el.width / 2,
                        el.height / 2,
                        0,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                } else if (el.type === 'image' && el.src) {
                    const img = getImg(el.src);
                    if (img.complete && img.naturalWidth !== 0) {
                        ctx.drawImage(img, 0, 0, el.width, el.height);
                    } else {
                        ctx.fillStyle = '#e2e8f0';
                        ctx.fillRect(0, 0, el.width, el.height);
                    }
                } else if (el.type === 'text' && el.text) {
                    ctx.fillStyle = el.fill;
                    ctx.font = `${el.fontSize}px sans-serif`;
                    ctx.textBaseline = 'top';
                    ctx.fillText(el.text, 0, 0);
                } else if (el.type === 'triangle') {
                    ctx.fillStyle = el.fill;
                    ctx.beginPath();
                    ctx.moveTo(el.width / 2, 0);
                    ctx.lineTo(el.width, el.height);
                    ctx.lineTo(0, el.height);
                    ctx.closePath();
                    ctx.fill();
                } else if (el.type === 'star') {
                    ctx.fillStyle = el.fill;
                    ctx.beginPath();
                    // Draw Star
                    const cx = el.width / 2,
                        cy = el.height / 2;
                    const r = Math.min(el.width, el.height) / 2;
                    for (let i = 0; i < 5; i++) {
                        ctx.lineTo(
                            cx + r * Math.cos(((18 + i * 72) / 180) * Math.PI),
                            cy - r * Math.sin(((18 + i * 72) / 180) * Math.PI)
                        );
                        ctx.lineTo(
                            cx + (r / 2.5) * Math.cos(((54 + i * 72) / 180) * Math.PI),
                            cy - (r / 2.5) * Math.sin(((54 + i * 72) / 180) * Math.PI)
                        );
                    }
                    ctx.closePath();
                    ctx.fill();
                } else if (el.type === 'hexagon') {
                    ctx.fillStyle = el.fill;
                    ctx.beginPath();
                    const cx = el.width / 2,
                        cy = el.height / 2;
                    const r = Math.min(el.width, el.height) / 2;
                    for (let i = 0; i < 6; i++) {
                        ctx.lineTo(
                            cx + r * Math.cos((i * 2 * Math.PI) / 6),
                            cy + r * Math.sin((i * 2 * Math.PI) / 6)
                        );
                    }
                    ctx.closePath();
                    ctx.fill();
                } else if (el.type === 'heart') {
                    ctx.fillStyle = el.fill;
                    ctx.beginPath();
                    const topCurveHeight = el.height * 0.3;
                    ctx.moveTo(el.width / 2, el.height * 0.2);
                    ctx.bezierCurveTo(el.width / 2, 0, 0, 0, 0, topCurveHeight);
                    ctx.bezierCurveTo(
                        0,
                        (el.height + topCurveHeight) / 2,
                        el.width / 2,
                        (el.height + topCurveHeight) / 2,
                        el.width / 2,
                        el.height
                    );
                    ctx.bezierCurveTo(
                        el.width / 2,
                        (el.height + topCurveHeight) / 2,
                        el.width,
                        (el.height + topCurveHeight) / 2,
                        el.width,
                        topCurveHeight
                    );
                    ctx.bezierCurveTo(el.width, 0, el.width / 2, 0, el.width / 2, el.height * 0.2);
                    ctx.fill();
                } else if (el.type === 'diamond') {
                    ctx.fillStyle = el.fill;
                    ctx.beginPath();
                    ctx.moveTo(el.width / 2, 0);
                    ctx.lineTo(el.width, el.height / 2);
                    ctx.lineTo(el.width / 2, el.height);
                    ctx.lineTo(0, el.height / 2);
                    ctx.closePath();
                    ctx.fill();
                }

                // Selection Highlights
                if (el.id === selectedId && !isPlaying && !isPreview) {
                    ctx.strokeStyle = SELECTION_COLOR;
                    ctx.lineWidth = 1.5 / zoom;
                    ctx.strokeRect(0, 0, el.width, el.height);

                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = SELECTION_COLOR;
                    const hs = HANDLE_SIZE / zoom;

                    const drawHandle = (hx: number, hy: number) => {
                        ctx.beginPath();
                        ctx.rect(hx - hs / 2, hy - hs / 2, hs, hs);
                        ctx.fill();
                        ctx.stroke();
                    };

                    drawHandle(0, 0);
                    drawHandle(el.width, 0);
                    drawHandle(0, el.height);
                    drawHandle(el.width, el.height);
                    drawHandle(el.width / 2, 0);
                    drawHandle(el.width / 2, el.height);
                    drawHandle(0, el.height / 2);
                    drawHandle(el.width, el.height / 2);

                    ctx.beginPath();
                    ctx.moveTo(el.width / 2, 0);
                    ctx.lineTo(el.width / 2, -ROTATE_HANDLE_OFFSET / zoom);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(el.width / 2, -ROTATE_HANDLE_OFFSET / zoom, hs / 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }

                ctx.restore();
            });

            ctx.restore();
            animationFrame = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrame);
    }, [page, selectedId, isPlaying, currentTime, zoom, pan, previewAnimation]);

    // Input Handling
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const toCanvasSpace = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const clientX = e.clientX - rect.left;
            const clientY = e.clientY - rect.top;
            const rawX = (clientX - centerX - pan.x) / zoom;
            const rawY = (clientY - centerY - pan.y) / zoom;
            return { x: rawX + CANVAS_WIDTH / 2, y: rawY + CANVAS_HEIGHT / 2 };
        };

        const getHandleUnderMouse = (mouse: { x: number; y: number }, el: DesignElement) => {
            const hs = (HANDLE_SIZE / zoom) * 1.5;
            const cx = el.x + el.width / 2;
            const cy = el.y + el.height / 2;
            const rad = (-el.rotation * Math.PI) / 180;
            const dx = mouse.x - cx;
            const dy = mouse.y - cy;
            const lx = dx * Math.cos(rad) - dy * Math.sin(rad) + el.width / 2;
            const ly = dx * Math.sin(rad) + dy * Math.cos(rad) + el.height / 2;

            if (
                Math.abs(lx - el.width / 2) < hs &&
                Math.abs(ly - -ROTATE_HANDLE_OFFSET / zoom) < hs
            )
                return 'rotate';
            if (Math.abs(lx - 0) < hs && Math.abs(ly - 0) < hs) return 'nw';
            if (Math.abs(lx - el.width) < hs && Math.abs(ly - 0) < hs) return 'ne';
            if (Math.abs(lx - 0) < hs && Math.abs(ly - el.height) < hs) return 'sw';
            if (Math.abs(lx - el.width) < hs && Math.abs(ly - el.height) < hs) return 'se';
            if (Math.abs(lx - el.width / 2) < hs && Math.abs(ly - 0) < hs) return 'n';
            if (Math.abs(lx - el.width / 2) < hs && Math.abs(ly - el.height) < hs) return 's';
            if (Math.abs(lx - 0) < hs && Math.abs(ly - el.height / 2) < hs) return 'w';
            if (Math.abs(lx - el.width) < hs && Math.abs(ly - el.height / 2) < hs) return 'e';
            return null;
        };

        const getElementUnderMouse = (ex: number, ey: number) => {
            if (!page) return null;
            for (let i = page.elements.length - 1; i >= 0; i--) {
                const el = page.elements[i];
                const cx = el.x + el.width / 2;
                const cy = el.y + el.height / 2;
                const rad = (-el.rotation * Math.PI) / 180;
                const dx = ex - cx;
                const dy = ey - cy;
                const lx = dx * Math.cos(rad) - dy * Math.sin(rad) + el.width / 2;
                const ly = dx * Math.sin(rad) + dy * Math.cos(rad) + el.height / 2;
                if (lx >= 0 && lx <= el.width && ly >= 0 && ly <= el.height) return el;
            }
            return null;
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 2) {
                e.preventDefault();
                const mouse = toCanvasSpace(e);
                const el = getElementUnderMouse(mouse.x, mouse.y);
                dispatch({
                    type: 'OPEN_CONTEXT_MENU',
                    x: e.clientX,
                    y: e.clientY,
                    elementId: el ? el.id : null,
                    menuType: 'element',
                });
                return;
            } else {
                dispatch({ type: 'CLOSE_CONTEXT_MENU' });
            }

            // Space Pan OR Middle Click Pan
            if (
                isSpacePressed ||
                (e.buttons === 1 && e.getModifierState('Space')) ||
                e.button === 1
            ) {
                dragInfo.current = {
                    active: true,
                    type: 'pan',
                    id: null,
                    startX: e.clientX,
                    startY: e.clientY,
                    initialX: pan.x,
                    initialY: pan.y,
                    initialW: 0,
                    initialH: 0,
                    initialRot: 0,
                };
                return;
            }

            const mouse = toCanvasSpace(e);
            if (!page) return;

            if (selectedId) {
                const el = page.elements.find((e) => e.id === selectedId);
                if (el) {
                    const handle = getHandleUnderMouse(mouse, el);
                    if (handle) {
                        // --- HISTORY CAPTURE: START OF INTERACTION ---
                        dispatch({ type: 'CAPTURE_CHECKPOINT' });

                        dragInfo.current = {
                            active: true,
                            type: handle === 'rotate' ? 'rotate' : 'resize',
                            handle: handle,
                            id: el.id,
                            startX: mouse.x,
                            startY: mouse.y,
                            initialX: el.x,
                            initialY: el.y,
                            initialW: el.width,
                            initialH: el.height,
                            initialRot: el.rotation,
                            centerX: el.x + el.width / 2,
                            centerY: el.y + el.height / 2,
                        };
                        return;
                    }
                }
            }

            const el = getElementUnderMouse(mouse.x, mouse.y);
            if (el) {
                // --- HISTORY CAPTURE: START OF INTERACTION ---
                dispatch({ type: 'CAPTURE_CHECKPOINT' });

                dispatch({ type: 'SELECT_ELEMENT', id: el.id });
                dragInfo.current = {
                    active: true,
                    type: 'move',
                    id: el.id,
                    startX: mouse.x,
                    startY: mouse.y,
                    initialX: el.x,
                    initialY: el.y,
                    initialW: el.width,
                    initialH: el.height,
                    initialRot: el.rotation,
                };
            } else {
                dispatch({ type: 'SELECT_ELEMENT', id: null });
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragInfo.current.active) return;

            if (dragInfo.current.type === 'pan') {
                const dx = e.clientX - dragInfo.current.startX;
                const dy = e.clientY - dragInfo.current.startY;
                dispatch({
                    type: 'SET_PAN',
                    pan: { x: dragInfo.current.initialX + dx, y: dragInfo.current.initialY + dy },
                });
                return;
            }

            const mouse = toCanvasSpace(e);
            const {
                id,
                initialX,
                initialY,
                initialW,
                initialH,
                initialRot,
                centerX,
                centerY,
                startX,
                startY,
                handle,
            } = dragInfo.current;

            if (dragInfo.current.type === 'move') {
                const dx = mouse.x - startX;
                const dy = mouse.y - startY;
                dispatch({
                    type: 'UPDATE_ELEMENT',
                    id: id!,
                    attrs: { x: initialX + dx, y: initialY + dy },
                });
            } else if (dragInfo.current.type === 'rotate') {
                const angle = (Math.atan2(mouse.y - centerY!, mouse.x - centerX!) * 180) / Math.PI;
                let newRot = angle + 90;
                if (e.shiftKey) newRot = Math.round(newRot / 45) * 45;
                dispatch({ type: 'UPDATE_ELEMENT', id: id!, attrs: { rotation: newRot } });
            } else if (dragInfo.current.type === 'resize') {
                const angleRad = (initialRot * Math.PI) / 180;
                const cos = Math.cos(-angleRad);
                const sin = Math.sin(-angleRad);
                const dxGlobal = mouse.x - startX;
                const dyGlobal = mouse.y - startY;

                // Figma-style resizing
                const keepAspect = e.shiftKey;
                const fromCenter = e.altKey;

                // Project mouse movement to local unrotated space
                let dx = dxGlobal * cos - dyGlobal * sin;
                let dy = dxGlobal * sin + dyGlobal * cos;

                let newX = initialX;
                let newY = initialY;
                let newW = initialW;
                let newH = initialH;

                // Determine change based on handle
                let changeW = 0;
                let changeH = 0;
                let changeX = 0;
                let changeY = 0;

                if (handle?.includes('e')) changeW = dx;
                if (handle?.includes('w')) {
                    changeW = -dx;
                    changeX = dx;
                }
                if (handle?.includes('s')) changeH = dy;
                if (handle?.includes('n')) {
                    changeH = -dy;
                    changeY = dy;
                }

                if (keepAspect) {
                    const ratio = initialW / initialH;
                    if (Math.abs(changeW) > Math.abs(changeH)) {
                        changeH = changeW / ratio;
                        // Adjust Y if pulling from top
                        if (handle?.includes('n')) changeY = (-changeW / ratio) * -1; // simplify signs later
                    } else {
                        changeW = changeH * ratio;
                        if (handle?.includes('w')) changeX = -changeH * ratio * -1;
                    }
                }

                if (fromCenter) {
                    // Double the expansion, keep center fixed
                    newW = initialW + changeW * 2;
                    newH = initialH + changeH * 2;
                    newX = initialX - changeW;
                    newY = initialY - changeH;
                } else {
                    // Standard resize logic
                    newW = initialW + changeW;
                    newH = initialH + changeH;

                    // Simplified for 0 rotation stability, implementing full math is complex in one go.
                    // Let's stick to non-rotated visual update for position if rotated, or standard if 0.
                    if (initialRot === 0) {
                        newX = initialX + changeX;
                        newY = initialY + changeY;
                    }
                }

                if (newW < 10) newW = 10;
                if (newH < 10) newH = 10;

                dispatch({
                    type: 'UPDATE_ELEMENT',
                    id: id!,
                    attrs: { x: newX, y: newY, width: newW, height: newH },
                });
            }
        };

        const handleMouseUp = () => {
            dragInfo.current.active = false;
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [page, selectedId, zoom, pan, isSpacePressed]);
};

// --- 5. UI COMPONENTS ---
const NavButton = ({ icon: Icon, label, active, onClick }: any) => (
    <button
        onClick={onClick}
        className={`w-full aspect-square flex flex-col items-center justify-center gap-1.5 transition-all relative ${active ? 'text-violet-600 bg-violet-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
    >
        <Icon size={20} strokeWidth={2} />
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);

const ShapeBtn = ({ icon: Icon, type, onDragStart, onClick }: any) => (
    <div
        draggable
        onDragStart={(e) => onDragStart(e, type)}
        onClick={onClick}
        className="aspect-square bg-gray-200 rounded-md flex items-center justify-center text-gray-600 hover:bg-violet-100 hover:text-violet-600 transition-colors cursor-grab"
    >
        <Icon size={24} strokeWidth={1.5} />
    </div>
);

const PageThumbnail = ({ page, width, height }: { page: Page; width: number; height: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const [tick, setTick] = useState(0);

    const getImg = (src: string) => {
        if (imageCache.current.has(src)) return imageCache.current.get(src)!;
        const img = new Image();
        img.src = src;
        img.crossOrigin = 'Anonymous';
        img.onload = () => setTick((t) => t + 1); // trigger re-render
        imageCache.current.set(src, img);
        return img;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const scaleX = width / CANVAS_WIDTH;
        const scaleY = height / CANVAS_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        const dx = (width - CANVAS_WIDTH * scale) / 2;
        const dy = (height - CANVAS_HEIGHT * scale) / 2;

        ctx.save();
        ctx.translate(dx, dy);
        ctx.scale(scale, scale);

        ctx.beginPath();
        ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.clip();

        if (page.background.startsWith('linear-gradient')) {
            const colors = page.background.match(/#[a-fA-F0-9]{6}/g);
            if (colors && colors.length >= 2) {
                const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
                grad.addColorStop(0, colors[0]);
                grad.addColorStop(1, colors[1]);
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = '#ffffff';
            }
        } else {
            ctx.fillStyle = page.background;
        }
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        page.elements.forEach((el) => {
            ctx.save();
            const cx = el.x + el.width / 2;
            const cy = el.y + el.height / 2;
            ctx.translate(cx, cy);
            ctx.rotate((el.rotation * Math.PI) / 180);
            ctx.translate(-el.width / 2, -el.height / 2);

            if (el.type === 'rect') {
                ctx.fillStyle = el.fill;
                ctx.fillRect(0, 0, el.width, el.height);
            } else if (el.type === 'circle') {
                ctx.fillStyle = el.fill;
                ctx.beginPath();
                ctx.ellipse(
                    el.width / 2,
                    el.height / 2,
                    el.width / 2,
                    el.height / 2,
                    0,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            } else if (el.type === 'image' && el.src) {
                const img = getImg(el.src);
                if (img.complete) ctx.drawImage(img, 0, 0, el.width, el.height);
            } else if (el.type === 'text' && el.text) {
                ctx.fillStyle = el.fill;
                ctx.font = `${el.fontSize}px sans-serif`;
                ctx.textBaseline = 'top';
                ctx.fillText(el.text, 0, 0);
            }
            ctx.restore();
        });

        ctx.restore();
    }, [page, width, height, tick]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
    }, [width, height]);

    return <canvas ref={canvasRef} style={{ width, height }} className="block" />;
};

const AnimationControl = ({ value, onChange, options, onPreview }: any) => {
    return (
        <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-2">
                {options.map((anim: any) => (
                    <button
                        key={anim.id}
                        onMouseEnter={() => onPreview && onPreview(anim.id)}
                        onMouseLeave={() => onPreview && onPreview(null)}
                        onClick={() => onChange({ ...value, type: anim.id })}
                        className={`aspect-square flex flex-col items-center justify-center gap-1 p-1 rounded border text-[10px] text-center transition-all ${value?.type === anim.id ? 'bg-violet-50 border-violet-500 text-violet-700' : 'bg-white border-gray-200 hover:border-violet-300'}`}
                    >
                        {/* CSS Animation Preview */}
                        <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center overflow-hidden mb-1">
                            <div className={`w-3 h-3 bg-violet-400 rounded-full ${anim.css}`} />
                        </div>
                        {anim.label}
                    </button>
                ))}
            </div>
            {value?.type !== 'none' && (
                <div className="space-y-2 bg-gray-50 p-3 rounded-md">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Speed</span>
                        <span>{value?.speed}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.5"
                        value={value?.speed || 1}
                        onChange={(e) => onChange({ ...value, speed: parseFloat(e.target.value) })}
                        className="w-full accent-violet-600"
                    />
                </div>
            )}
        </div>
    );
};

const PropertiesPanel = ({
    element,
    onCheckpoint,
}: {
    element: DesignElement;
    onCheckpoint: () => void;
}) => {
    return (
        <div className="flex flex-col h-full bg-white animate-in slide-in-from-left duration-200">
            <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 font-bold text-xs uppercase tracking-wider text-gray-600 bg-gray-50">
                <span>Edit {element.type}</span>
                <span className="text-violet-600">#{element.id.substr(0, 4)}</span>
            </div>

            <div id="properties-portal-target" className="flex-1 overflow-y-auto" />
        </div>
    );
};

const PropertiesContent = ({ element, onChange, onPreviewAnim, onCheckpoint }: any) => {
    return (
        <div className="p-4 space-y-6">
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Width</label>
                    <input
                        type="number"
                        value={Math.round(element.width)}
                        onFocus={onCheckpoint}
                        onChange={(e) => onChange(element.id, { width: parseInt(e.target.value) })}
                        className="w-full p-2 bg-gray-50 rounded border border-gray-200 text-sm"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Rotation
                    </label>
                    <input
                        type="number"
                        value={Math.round(element.rotation)}
                        onFocus={onCheckpoint}
                        onChange={(e) =>
                            onChange(element.id, { rotation: parseInt(e.target.value) })
                        }
                        className="w-full p-2 bg-gray-50 rounded border border-gray-200 text-sm"
                    />
                </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Opacity</label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={element.opacity}
                    onMouseDown={onCheckpoint}
                    onChange={(e) => onChange(element.id, { opacity: parseFloat(e.target.value) })}
                    className="w-full accent-violet-600"
                />
            </div>

            {element.type !== 'image' && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Fill Color
                    </label>
                    <div className="flex gap-2 flex-wrap">
                        {[
                            '#000000',
                            '#ffffff',
                            '#ef4444',
                            '#f97316',
                            '#eab308',
                            '#22c55e',
                            '#3b82f6',
                            '#a855f7',
                        ].map((c) => (
                            <button
                                key={c}
                                onClick={() => {
                                    onCheckpoint();
                                    onChange(element.id, { fill: c });
                                }}
                                className={`w-6 h-6 rounded-full border ${element.fill === c ? 'ring-2 ring-violet-500' : 'border-gray-200'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                        <input
                            type="color"
                            value={element.fill}
                            onFocus={onCheckpoint}
                            onChange={(e) => onChange(element.id, { fill: e.target.value })}
                            className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden"
                        />
                    </div>
                </div>
            )}

            <div className="space-y-4 pt-4 border-t border-gray-100">
                <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                    <Film size={12} /> Animation
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {ANIMATIONS.map((anim) => (
                        <button
                            key={anim.id}
                            onMouseEnter={() => onPreviewAnim({ id: element.id, type: anim.id })}
                            onMouseLeave={() => onPreviewAnim(null)}
                            onClick={() => {
                                onCheckpoint();
                                onChange(element.id, {
                                    animation: { ...element.animation, type: anim.id },
                                });
                            }}
                            className={`p-2 rounded border text-xs text-center transition-all ${element.animation?.type === anim.id ? 'bg-violet-50 border-violet-500 text-violet-700' : 'bg-white border-gray-200 hover:border-violet-300'}`}
                        >
                            {anim.label}
                        </button>
                    ))}
                </div>
                {element.animation?.type !== 'none' && (
                    <div className="space-y-2 bg-gray-50 p-3 rounded-md">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Speed</span>
                            <span>{element.animation?.speed}x</span>
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.5"
                            value={element.animation?.speed || 1}
                            onMouseDown={onCheckpoint}
                            onChange={(e) =>
                                onChange(element.id, {
                                    animation: {
                                        ...element.animation,
                                        speed: parseFloat(e.target.value),
                                    },
                                })
                            }
                            className="w-full accent-violet-600"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

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
            previewAudioRef.current.play().catch((e) => console.error('Preview error', e));
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
                        <div id="page-anim-portal-target" className="flex-1 overflow-y-auto" />
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
                                        {FASHION_ASSETS.map((asset) => (
                                            <div
                                                key={asset.id}
                                                draggable
                                                onDragStart={(e) =>
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
                                            {AUDIO_ASSETS.map((track) => (
                                                <div
                                                    key={track.id}
                                                    draggable
                                                    onDragStart={(e) =>
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
                                        onDragStart={(e) => handleDragStart(e, 'text')}
                                        onClick={() => onAddElement('text')}
                                        className="w-full py-4 px-4 bg-gray-800 text-white rounded-lg font-bold text-2xl text-left cursor-grab"
                                    >
                                        Add Heading
                                    </div>
                                    <div
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, 'text')}
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
    const headerResizeRef = useRef<{ startY: number; startH: number } | null>(null);
    const pageResizeRef = useRef<{ id: string; startX: number; initialDuration: number } | null>(
        null
    );

    const totalDuration = pages.reduce((acc: number, p: Page) => acc + p.duration, 0);
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
        onResize(headerResizeRef.current.startH + (headerResizeRef.current.startY - e.clientY));
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
        pageResizeRef.current = { id: pageId, startX: e.clientX, initialDuration: currentDuration };
        document.addEventListener('mousemove', handlePageResizeMove);
        document.addEventListener('mouseup', handlePageResizeEnd);
    };
    const handlePageResizeMove = (e: MouseEvent) => {
        if (!pageResizeRef.current) return;
        const dx = e.clientX - pageResizeRef.current.startX;
        const newDuration = Math.max(1, pageResizeRef.current.initialDuration + dx / zoom);
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
            const offsetX = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
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
            panStart.current = { x: e.clientX, left: scrollContainerRef.current.scrollLeft };
        }
    };

    // Clip Mouse Down Handler
    const handleClipMouseDown = (e: React.MouseEvent, clip: AudioClip, layerId: string) => {
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

    const handleAudioDragStart = (e: React.DragEvent, clip: AudioClip, layerId: string) => {
        e.dataTransfer.setData('type', 'move_audio');
        e.dataTransfer.setData('clipId', clip.id);
        e.dataTransfer.setData('fromLayerId', layerId);
        e.dataTransfer.setData('startOffset', (e.nativeEvent.offsetX / zoom).toString());
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
                onMoveAudioClip(clipId, fromLayerId, layerId, Math.max(0, time - startOffset));
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
                        newStart = trimmingClip.initialStart + trimmingClip.initialDuration - 0.1;
                        newOffset = trimmingClip.initialOffset + trimmingClip.initialDuration - 0.1;
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
                    if (trimmingClip.initialOffset + newDuration > trimmingClip.totalDuration) {
                        newDuration = trimmingClip.totalDuration - trimmingClip.initialOffset;
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
                    <button className="hover:text-violet-600" onClick={() => onSetZoom(zoom * 0.9)}>
                        <Minus size={14} />
                    </button>
                    <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-violet-500"
                            style={{ width: `${(zoom / 200) * 100}%` }}
                        />
                    </div>
                    <button className="hover:text-violet-600" onClick={() => onSetZoom(zoom * 1.1)}>
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
                onDragOver={(e) => e.preventDefault()}
            >
                {/* Ruler */}
                <div
                    className="h-6 border-b border-gray-200 sticky top-0 bg-white z-20 cursor-pointer"
                    style={{ width: totalWidth }}
                    onMouseDown={(e) => {
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
                                onClick={(e) => onSelect(page.id)}
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
                                    onMouseDown={(e) =>
                                        handlePageResizeStart(e, page.id, page.duration)
                                    }
                                >
                                    <div className="w-1 h-4 bg-gray-300 rounded-full group-hover/handle:bg-violet-400" />
                                </div>
                                <div className="absolute top-1 right-8 hidden group-hover:flex gap-1 z-20">
                                    <button
                                        onClick={(e) => {
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
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => handleTimelineDrop(e, layer.id)}
                        >
                            <div className="absolute left-2 top-3 text-[9px] text-gray-400 pointer-events-none sticky z-10">
                                Audio {i + 1}
                            </div>
                            {layer.clips.map((clip) => (
                                <div
                                    key={clip.id}
                                    onMouseDown={(e) => handleClipMouseDown(e, clip, layer.id)} // Fix: use local handler
                                    onClick={(e) => {
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
                                    onContextMenu={(e) => {
                                        e.stopPropagation();
                                        onContextMenu(e, clip.id, 'audio');
                                    }}
                                >
                                    {/* Left Trim Handle */}
                                    {selectedAudioId === clip.id && (
                                        <div
                                            className="absolute left-0 top-0 bottom-0 w-2 bg-violet-400/50 hover:bg-violet-600 cursor-w-resize z-20 flex items-center justify-center"
                                            onMouseDown={(e) =>
                                                handleTrimStart(e, clip, layer.id, 'left')
                                            }
                                        >
                                            <div className="w-0.5 h-3 bg-white/50 rounded-full" />
                                        </div>
                                    )}

                                    <Music size={10} className="text-blue-500 mr-1 flex-shrink-0" />
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
                                            onMouseDown={(e) =>
                                                handleTrimStart(e, clip, layer.id, 'right')
                                            }
                                        >
                                            <div className="w-0.5 h-3 bg-white/50 rounded-full" />
                                        </div>
                                    )}

                                    {/* Hover Delete Button */}
                                    <button
                                        className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm z-20"
                                        onClick={(e) => {
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

const useCanvasEngineHook = useCanvasEngine; // Alias for consistency

// --- 6. MAIN APP ---
const App = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [renderTick, setRenderTick] = useState(0);
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const [previewAnim, setPreviewAnim] = useState<{ id: string; type: string } | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const activePage = state.pages.find((p) => p.id === state.activePageId);
    let pageStartTime = 0;
    for (let p of state.pages) {
        if (p.id === state.activePageId) break;
        pageStartTime += p.duration;
    }

    useAudioController(state.audioLayers, state.isPlaying, state.currentTime);
    const { exportVideo } = useVideoExporter(dispatch); // Export Hook

    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                chunksRef.current = [];
                mediaRecorder.ondataavailable = (e) => {
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
            if (state.currentTime >= accumulated && state.currentTime < accumulated + p.duration) {
                targetPageId = p.id;
                break;
            }
            accumulated += p.duration;
        }
        if (!targetPageId && state.pages.length > 0 && state.currentTime >= accumulated)
            targetPageId = state.pages[state.pages.length - 1].id;
        if (targetPageId && targetPageId !== state.activePageId)
            dispatch({ type: 'SELECT_PAGE', id: targetPageId });
    }, [state.currentTime, state.pages, state.activePageId]);

    // Updated Shortcuts to include Audio Deletion and Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmd = isMac ? e.metaKey : e.ctrlKey;

            // Undo: Cmd+Z
            if (cmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                dispatch({ type: 'UNDO' });
            }

            // Redo: Cmd+Shift+Z or Cmd+Y
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
                // New: Delete selected Audio
                if (state.selectedAudioId) {
                    e.preventDefault();
                    dispatch({ type: 'DELETE_AUDIO_CLIP', id: state.selectedAudioId });
                }
            }

            // Spacebar for Panning
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
        const type = e.dataTransfer.getData('type') as ElementType | 'audio' | 'move_audio';
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

    useCanvasEngineHook(
        canvasRef,
        containerRef, // Added container ref
        activePage,
        state.selectedElementId,
        state.isPlaying,
        state.currentTime,
        state.zoom,
        state.pan,
        state.isSpacePressed, // Added space pressed
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
                setRenderTick((t) => t + 1);
            }, 1000 / 60);
        }
        return () => clearInterval(interval);
    }, [state.isPlaying, state.pages, state.audioLayers]);

    // --- Konva/Backend Export Compatibility ---
    const exportToJSON = () => {
        // Transform the state into a structure resembling Konva's scene graph
        // Stage -> Layer (Page) -> Shape (Element)
        const konvaData = {
            attrs: {
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
            },
            className: 'Stage',
            children: state.pages.map((page) => ({
                className: 'Layer',
                attrs: {
                    name: `Page ${page.id}`,
                    id: page.id,
                    duration: page.duration, // Custom attr
                    background: page.background,
                },
                children: page.elements.map((el) => ({
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
                        image: el.src, // Konva uses image object but storing src for JSON is standard
                        name: el.type,
                        draggable: true,
                    },
                })),
            })),
            audioLayers: state.audioLayers, // Keep audio separate as it's not visual
        };

        const blob = new Blob([JSON.stringify(konvaData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'project-export.json';
        a.click();
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
            <div className="h-10 bg-violet-600 text-white flex items-center justify-between px-5 shadow-sm z-40 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-base tracking-tight flex items-center gap-2">
                        <Layers className="text-white" size={20} /> GenStudio
                    </div>
                    <div className="h-5 w-px bg-white/20" />
                    <div className="flex gap-4 text-xs font-medium text-white/90">
                        <button
                            className="hover:text-white flex items-center gap-1 opacity-80 hover:opacity-100 disabled:opacity-30"
                            onClick={() => dispatch({ type: 'UNDO' })}
                            disabled={state.past.length === 0}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 size={14} /> Undo
                        </button>
                        <button
                            className="hover:text-white flex items-center gap-1 opacity-80 hover:opacity-100 disabled:opacity-30"
                            onClick={() => dispatch({ type: 'REDO' })}
                            disabled={state.future.length === 0}
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <Redo2 size={14} /> Redo
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-xs bg-white/10 px-3 py-1 rounded-full">
                        Untitled Design
                    </div>
                    <div className="text-xs bg-white/10 px-3 py-1 rounded-full font-mono">
                        {Math.round(state.zoom * 100)}%
                    </div>
                    {/* EXPORT BUTTONS */}
                    <button
                        onClick={() => exportVideo(state.pages, state.audioLayers)}
                        disabled={state.isExporting}
                        className={`px-3 py-1 bg-violet-800 text-white rounded font-bold text-xs hover:bg-violet-900 flex items-center gap-2 ${state.isExporting ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        {state.isExporting ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />{' '}
                                {Math.round(state.exportProgress * 100)}%
                            </>
                        ) : (
                            <>
                                <Film size={14} /> Video
                            </>
                        )}
                    </button>
                    <button
                        onClick={exportToJSON}
                        className="px-3 py-1 bg-white/20 text-white rounded font-bold text-xs hover:bg-white/30 flex items-center gap-2"
                        title="Save Project JSON"
                    >
                        <Save size={14} /> JSON
                    </button>
                </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
                <Sidebar
                    activeTab={state.activeTab}
                    selectedElement={activePage?.elements.find(
                        (el) => el.id === state.selectedElementId
                    )}
                    onSetTab={(t: any) => dispatch({ type: 'SET_TAB', tab: t })}
                    onAddElement={(type: any, src: any) =>
                        dispatch({ type: 'ADD_ELEMENT', elementType: type, src })
                    }
                    onSetBackground={(col: string) =>
                        dispatch({ type: 'SET_BACKGROUND', color: col })
                    }
                    leftSidebarOpen={leftSidebarOpen}
                    onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
                    onAddAudio={(track: any) =>
                        dispatch({
                            type: 'ADD_AUDIO_CLIP',
                            layerId: state.audioLayers[0].id,
                            clip: {
                                id: generateId(),
                                src: track.src,
                                label: track.label,
                                duration: track.duration,
                                startAt: state.currentTime,
                            },
                        })
                    }
                    isRecording={isRecording}
                    onRecordToggle={toggleRecording}
                />

                {state.selectedElementId && (
                    <div className="absolute left-[72px] top-10 w-80 bottom-0 z-30 bg-white border-r border-gray-200 flex flex-col shadow-xl">
                        <PropertiesContent
                            element={
                                activePage?.elements.find(
                                    (el) => el.id === state.selectedElementId
                                )!
                            }
                            onChange={(id: string, attrs: any) =>
                                dispatch({ type: 'UPDATE_ELEMENT', id, attrs })
                            }
                            onPreviewAnim={setPreviewAnim}
                            onCheckpoint={() => dispatch({ type: 'CAPTURE_CHECKPOINT' })}
                        />
                    </div>
                )}
                {!state.selectedElementId && state.activeTab === 'animation' && (
                    <div className="absolute left-[72px] top-10 w-80 bottom-0 z-30 bg-white border-r border-gray-200 flex flex-col shadow-xl">
                        <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 font-bold text-xs uppercase tracking-wider text-gray-600 bg-gray-50">
                            <span>Page Animation</span>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto">
                            <AnimationControl
                                value={activePage?.animation}
                                onChange={(anim: any) =>
                                    dispatch({
                                        type: 'UPDATE_PAGE',
                                        id: activePage?.id!,
                                        attrs: { animation: anim },
                                    })
                                }
                                options={PAGE_ANIMATIONS}
                                onPreview={(type: string) =>
                                    setPreviewAnim(type ? { id: activePage?.id!, type } : null)
                                }
                            />
                        </div>
                    </div>
                )}

                <div className="flex-1 flex flex-col relative bg-[#e5e7eb] overflow-hidden">
                    <div
                        className={`flex-1 relative overflow-hidden ${state.isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        ref={containerRef}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        tabIndex={0}
                    >
                        <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />
                        {state.contextMenu.visible && (
                            <div
                                className="absolute bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[150px] z-50 animate-in fade-in zoom-in-95 duration-100"
                                style={{ left: state.contextMenu.x, top: state.contextMenu.y }}
                            >
                                {state.contextMenu.type === 'element' ? (
                                    <>
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                            onClick={() => {
                                                if (state.contextMenu.elementId)
                                                    dispatch({
                                                        type: 'COPY_ELEMENT',
                                                        id: state.contextMenu.elementId,
                                                    });
                                            }}
                                        >
                                            <Copy size={14} /> Duplicate
                                        </button>
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                            onClick={() => {
                                                if (state.contextMenu.elementId)
                                                    dispatch({
                                                        type: 'DELETE_ELEMENT',
                                                        id: state.contextMenu.elementId,
                                                    });
                                            }}
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                        onClick={() => {
                                            if (state.contextMenu.elementId)
                                                dispatch({
                                                    type: 'DELETE_AUDIO_CLIP',
                                                    id: state.contextMenu.elementId,
                                                });
                                        }}
                                    >
                                        <Trash2 size={14} /> Delete Clip
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <Timeline
                        pages={state.pages}
                        audioLayers={state.audioLayers}
                        activePageId={state.activePageId}
                        isPlaying={state.isPlaying}
                        currentTime={state.currentTime}
                        height={state.timelineHeight}
                        zoom={state.timelineZoom}
                        onSelect={(id: string) => {
                            dispatch({ type: 'SELECT_PAGE', id });
                            let newTime = 0;
                            for (const p of state.pages) {
                                if (p.id === id) break;
                                newTime += p.duration;
                            }
                            dispatch({ type: 'SET_CURRENT_TIME', time: newTime });
                        }}
                        onAdd={() => dispatch({ type: 'ADD_PAGE' })}
                        onDelete={(id: any) => dispatch({ type: 'DELETE_PAGE', id })}
                        onTogglePlay={() =>
                            dispatch({ type: 'SET_PLAYING', isPlaying: !state.isPlaying })
                        }
                        onScrub={(time: number) => {
                            dispatch({ type: 'SET_CURRENT_TIME', time });
                            setRenderTick((t) => t + 1);
                        }}
                        onResize={(h: number) =>
                            dispatch({ type: 'SET_TIMELINE_HEIGHT', height: h })
                        }
                        onSetZoom={(z: number) => dispatch({ type: 'SET_TIMELINE_ZOOM', zoom: z })}
                        onUpdatePageDuration={(id: string, dur: number) =>
                            dispatch({ type: 'UPDATE_PAGE_DURATION', id, duration: dur })
                        }
                        onAddAudioLayer={() => dispatch({ type: 'ADD_AUDIO_LAYER' })}
                        onMoveAudioClip={(
                            clipId: string,
                            fromId: string,
                            toId: string,
                            start: number
                        ) =>
                            dispatch({
                                type: 'MOVE_AUDIO_CLIP',
                                clipId,
                                fromLayerId: fromId,
                                toLayerId: toId,
                                newStart: start,
                            })
                        }
                        onDeleteAudioClip={(id: string) =>
                            dispatch({ type: 'DELETE_AUDIO_CLIP', id })
                        }
                        onContextMenu={(e: MouseEvent, id: string, type: 'audio') =>
                            dispatch({
                                type: 'OPEN_CONTEXT_MENU',
                                x: e.clientX,
                                y: e.clientY,
                                elementId: id,
                                menuType: type,
                            })
                        }
                        selectedAudioId={state.selectedAudioId}
                        onSelectAudio={(id: string) => dispatch({ type: 'SELECT_AUDIO', id })}
                        onAddAudioClip={(layerId: string, clip: AudioClip) =>
                            dispatch({ type: 'ADD_AUDIO_CLIP', layerId, clip })
                        }
                        onTrimAudioClip={(args: any) =>
                            dispatch({ type: 'TRIM_AUDIO_CLIP', ...args })
                        }
                    />
                </div>
            </div>
        </div>
    );
};

export default App;
