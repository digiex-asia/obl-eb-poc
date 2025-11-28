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
} from 'lucide-react';

const { useEffect, useRef, useState, useReducer, useMemo, useCallback } = React;

// --- 1. CONSTANTS & ASSETS ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450; // 16:9 Aspect Ratio
const PRIMARY_COLOR = '#7c3aed'; // Violet (Canva-like)
const SELECTION_COLOR = '#d946ef';
const GUIDE_COLOR = '#ec4899'; // Pink Smart Guide
const SNAP_THRESHOLD = 10;
const HANDLE_SIZE = 10;

// Fashion Assets
const FASHION_ASSETS = [
    {
        id: 'shoe1',
        src: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80',
        label: 'Sneaker',
    },
    {
        id: 'coat1',
        src: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&q=80',
        label: 'Coat',
    },
    {
        id: 'hat1',
        src: 'https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?w=200&q=80',
        label: 'Hat',
    },
    {
        id: 'fashion1',
        src: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&q=80',
        label: 'Model',
    },
    {
        id: 'shoe2',
        src: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200&q=80',
        label: 'Nike',
    },
    {
        id: 'coat2',
        src: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=200&q=80',
        label: 'Jacket',
    },
    {
        id: 'hat2',
        src: 'https://images.unsplash.com/photo-1572251860137-7e4850e3355c?w=200&q=80',
        label: 'Cap',
    },
    {
        id: 'fashion2',
        src: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=200&q=80',
        label: 'Style',
    },
];

const ANIMATIONS = [
    { id: 'none', label: 'None' },
    { id: 'fade', label: 'Fade' },
    { id: 'rise', label: 'Rise' },
    { id: 'pan', label: 'Pan' },
    { id: 'wipe', label: 'Wipe' },
    { id: 'pop', label: 'Pop' },
    { id: 'breathe', label: 'Breathe' },
    { id: 'tectonic', label: 'Gravity' },
];

// --- 2. TYPES ---
type ElementType = 'rect' | 'circle' | 'triangle' | 'star' | 'polygon' | 'image' | 'text';

interface AnimationSettings {
    type: string;
    speed: number; // 0.1 - 2.0
    delay: number; // seconds
    direction: 'up' | 'down' | 'left' | 'right';
    mode: 'both' | 'enter' | 'exit';
}

interface DesignElement {
    id: string;
    type: ElementType;
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
}

interface AppState {
    pages: Page[];
    activePageId: string;
    selectedElementId: string | null;
    isPlaying: boolean;
    zoom: number;
    pan: { x: number; y: number };
    activeTab: 'blocks' | 'media' | 'shapes' | 'text' | 'animation' | 'color';
    isRightSidebarOpen: boolean;
    currentTime: number; // Global timeline time
    timelineHeight: number;
    timelineZoom: number; // pixels per second
}

// --- 3. STATE & REDUCER ---

type Action =
    | { type: 'ADD_PAGE' }
    | { type: 'DUPLICATE_PAGE' }
    | { type: 'DELETE_PAGE'; id: string }
    | { type: 'SELECT_PAGE'; id: string }
    | { type: 'ADD_ELEMENT'; elementType: ElementType; src?: string }
    | {
          type: 'UPDATE_ELEMENT';
          id: string;
          attrs: Partial<DesignElement>;
          animation?: Partial<AnimationSettings>;
      }
    | { type: 'SELECT_ELEMENT'; id: string | null }
    | { type: 'DELETE_ELEMENT' }
    | { type: 'SET_PLAYING'; isPlaying: boolean }
    | { type: 'SET_TAB'; tab: AppState['activeTab'] }
    | { type: 'SET_BACKGROUND'; color: string }
    | { type: 'SET_ZOOM'; zoom: number; center?: { x: number; y: number } }
    | { type: 'SET_PAN'; pan: { x: number; y: number } }
    | { type: 'TOGGLE_RIGHT_SIDEBAR'; isOpen?: boolean }
    | { type: 'SET_CURRENT_TIME'; time: number }
    | { type: 'NEXT_PAGE' }
    | { type: 'SET_TIMELINE_HEIGHT'; height: number }
    | { type: 'SET_TIMELINE_ZOOM'; zoom: number }
    | { type: 'UPDATE_PAGE_DURATION'; id: string; duration: number };

const generateId = () => Math.random().toString(36).substr(2, 9);

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
                {
                    id: generateId(),
                    type: 'rect',
                    x: 50,
                    y: 50,
                    width: 100,
                    height: 100,
                    rotation: 15,
                    fill: '#8b5cf6',
                    opacity: 0.2,
                    animation: {
                        type: 'fade',
                        speed: 1,
                        delay: 0.5,
                        direction: 'up',
                        mode: 'enter',
                    },
                },
            ],
        },
    ],
    activePageId: '', // set in init
    selectedElementId: null,
    isPlaying: false,
    zoom: 0.8,
    pan: { x: 0, y: 0 },
    activeTab: 'media',
    isRightSidebarOpen: false,
    currentTime: 0,
    timelineHeight: 200, // Increased default height
    timelineZoom: 40, // px per second
};
initialState.activePageId = initialState.pages[0].id;

const reducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'ADD_PAGE':
            const newPage: Page = {
                id: generateId(),
                duration: 3,
                background: '#ffffff',
                elements: [],
            };
            return {
                ...state,
                pages: [...state.pages, newPage],
                activePageId: newPage.id,
                // Do not reset current time on add
            };
        case 'DUPLICATE_PAGE': {
            const index = state.pages.findIndex((p) => p.id === state.activePageId);
            if (index === -1) return state;
            const sourcePage = state.pages[index];
            const newPage: Page = {
                ...sourcePage,
                id: generateId(),
                elements: sourcePage.elements.map((el) => ({ ...el, id: generateId() })), // Clone elements with new IDs
            };
            const newPages = [...state.pages];
            newPages.splice(index + 1, 0, newPage);
            return {
                ...state,
                pages: newPages,
                activePageId: newPage.id,
            };
        }
        case 'DELETE_PAGE':
            if (state.pages.length <= 1) return state;
            const filtered = state.pages.filter((p) => p.id !== action.id);
            return { ...state, pages: filtered, activePageId: filtered[0].id };
        case 'SELECT_PAGE':
            // Calc start time of this page to jump to it?
            // Optional: Jump timeline to start of selected page
            return {
                ...state,
                activePageId: action.id,
                selectedElementId: null,
                isPlaying: false,
            };
        case 'ADD_ELEMENT':
            return {
                ...state,
                pages: state.pages.map((p) => {
                    if (p.id !== state.activePageId) return p;
                    const newEl: DesignElement = {
                        id: generateId(),
                        type: action.elementType,
                        x: CANVAS_WIDTH / 2 - 50,
                        y: CANVAS_HEIGHT / 2 - 50,
                        width: 100,
                        height: 100,
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
                    if (action.elementType === 'text') {
                        newEl.width = 300;
                        newEl.height = 50;
                    }
                    if (action.elementType === 'image') {
                        newEl.width = 200;
                        newEl.height = 200;
                    }
                    return { ...p, elements: [...p.elements, newEl] };
                }),
                selectedElementId: null,
                isRightSidebarOpen: true,
            };
        case 'UPDATE_ELEMENT':
            return {
                ...state,
                pages: state.pages.map((p) => {
                    if (p.id !== state.activePageId) return p;
                    return {
                        ...p,
                        elements: p.elements.map((el) => {
                            if (el.id !== action.id) return el;
                            const updatedEl = { ...el, ...action.attrs };
                            if (action.animation)
                                updatedEl.animation = { ...el.animation!, ...action.animation };
                            return updatedEl;
                        }),
                    };
                }),
            };
        case 'SELECT_ELEMENT':
            return {
                ...state,
                selectedElementId: action.id,
                isRightSidebarOpen: action.id !== null,
            };
        case 'DELETE_ELEMENT':
            if (!state.selectedElementId) return state;
            return {
                ...state,
                pages: state.pages.map((p) => {
                    if (p.id !== state.activePageId) return p;
                    return {
                        ...p,
                        elements: p.elements.filter((e) => e.id !== state.selectedElementId),
                    };
                }),
                selectedElementId: null,
                isRightSidebarOpen: false,
            };
        case 'SET_PLAYING':
            return {
                ...state,
                isPlaying: action.isPlaying,
                selectedElementId: null,
                isRightSidebarOpen: false,
            };
        case 'SET_TAB':
            return { ...state, activeTab: action.tab };
        case 'SET_BACKGROUND':
            return {
                ...state,
                pages: state.pages.map((p) =>
                    p.id === state.activePageId ? { ...p, background: action.color } : p
                ),
            };
        case 'SET_ZOOM':
            return { ...state, zoom: action.zoom };
        case 'SET_PAN':
            return { ...state, pan: action.pan };
        case 'TOGGLE_RIGHT_SIDEBAR':
            return {
                ...state,
                isRightSidebarOpen:
                    action.isOpen !== undefined ? action.isOpen : !state.isRightSidebarOpen,
            };
        case 'SET_CURRENT_TIME':
            return { ...state, currentTime: Math.max(0, action.time) };
        case 'NEXT_PAGE': {
            // Logic handled in playback loop mostly, but for manual Next
            const currentIndex = state.pages.findIndex((p) => p.id === state.activePageId);
            const nextIndex = (currentIndex + 1) % state.pages.length;
            return { ...state, activePageId: state.pages[nextIndex].id };
        }
        case 'SET_TIMELINE_HEIGHT':
            return { ...state, timelineHeight: Math.max(150, Math.min(600, action.height)) };
        case 'SET_TIMELINE_ZOOM':
            return { ...state, timelineZoom: Math.max(10, Math.min(200, action.zoom)) };
        case 'UPDATE_PAGE_DURATION':
            return {
                ...state,
                pages: state.pages.map((p) =>
                    p.id === action.id ? { ...p, duration: Math.max(1, action.duration) } : p
                ),
            };
        default:
            return state;
    }
};

// --- 4. CANVAS ENGINE ---
const useCanvasEngine = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    page: Page | undefined,
    selectedId: string | null,
    isPlaying: boolean,
    currentTime: number,
    zoom: number,
    pan: { x: number; y: number },
    dispatch: React.Dispatch<Action>,
    // Pass in pageStartTime to calculate local animation time
    pageStartTime: number
) => {
    const dragInfo = useRef<{
        active: boolean;
        type: 'move' | 'resize';
        id: string | null;
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        initialW: number;
        initialH: number;
        initial: any;
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
        initial: {},
    });

    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const guides = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !page) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrame: number;

        const render = () => {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#e5e7eb';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            ctx.translate(centerX + pan.x, centerY + pan.y);
            ctx.scale(zoom, zoom);
            ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);

            // Paper Shadow
            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 30;
            ctx.shadowOffsetY = 10;

            // Background
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

            // Calculate local time for this page
            // If currentTime is 7s, and page starts at 5s, localTime is 2s
            const localTime = Math.max(0, currentTime - pageStartTime);

            page.elements.forEach((el) => {
                ctx.save();

                let animOpacity = el.opacity;
                let animY = el.y;
                let animX = el.x;
                let animScale = 1;

                // FIX: Only animate if actively playing.
                // When paused (editing), show elements at their final/static positions
                // so the visuals match the mouse hit-detection coordinates.
                if (isPlaying) {
                    const anim = el.animation;
                    if (anim && anim.type !== 'none') {
                        const t = Math.max(0, localTime - anim.delay);
                        const duration = 1 / anim.speed;
                        const progress = Math.min(1, t / duration);
                        const eased = progress * (2 - progress);

                        if (progress > 0) {
                            if (anim.type === 'fade') {
                                animOpacity = eased;
                            } else if (anim.type === 'rise') {
                                const dirMult = anim.direction === 'down' ? -1 : 1;
                                animY = el.y + (1 - eased) * 100 * dirMult;
                                animOpacity = eased;
                            } else if (anim.type === 'pan') {
                                const dirMult = anim.direction === 'right' ? -1 : 1;
                                const offset = (1 - eased) * -100 * dirMult;
                                animX = el.x + offset;
                                animOpacity = eased;
                            }
                        } else if (anim.delay > 0) {
                            animOpacity = 0;
                        }
                    }
                }

                const cx = animX + el.width / 2;
                const cy = animY + el.height / 2;
                ctx.translate(cx, cy);
                ctx.rotate((el.rotation * Math.PI) / 180);
                ctx.scale(animScale, animScale);
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
                    const cx = el.width / 2,
                        cy = el.height / 2,
                        outerRadius = el.width / 2,
                        innerRadius = el.width / 4;
                    for (let i = 0; i < 5; i++) {
                        ctx.lineTo(
                            cx + Math.cos(((18 + i * 72) / 180) * Math.PI) * outerRadius,
                            cy - Math.sin(((18 + i * 72) / 180) * Math.PI) * outerRadius
                        );
                        ctx.lineTo(
                            cx + Math.cos(((54 + i * 72) / 180) * Math.PI) * innerRadius,
                            cy - Math.sin(((54 + i * 72) / 180) * Math.PI) * innerRadius
                        );
                    }
                    ctx.closePath();
                    ctx.fill();
                } else if (el.type === 'polygon') {
                    ctx.fillStyle = el.fill;
                    ctx.beginPath();
                    const cx = el.width / 2,
                        cy = el.height / 2,
                        r = el.width / 2;
                    for (let i = 0; i < 6; i++)
                        ctx.lineTo(
                            cx + r * Math.cos((i * 2 * Math.PI) / 6),
                            cy + r * Math.sin((i * 2 * Math.PI) / 6)
                        );
                    ctx.closePath();
                    ctx.fill();
                } else if (el.type === 'image' && el.src) {
                    const img = getImg(el.src);
                    if (img.complete) ctx.drawImage(img, 0, 0, el.width, el.height);
                    else {
                        ctx.fillStyle = '#ccc';
                        ctx.fillRect(0, 0, el.width, el.height);
                    }
                } else if (el.type === 'text' && el.text) {
                    ctx.fillStyle = el.fill;
                    ctx.font = `${el.fontSize}px sans-serif`;
                    ctx.textBaseline = 'top';
                    ctx.fillText(el.text, 0, 0);
                }

                if (el.id === selectedId && !isPlaying) {
                    ctx.strokeStyle = SELECTION_COLOR;
                    ctx.lineWidth = 2 / zoom;
                    ctx.strokeRect(0, 0, el.width, el.height);
                    ctx.fillStyle = 'white';
                    const h = 8 / zoom;
                    ctx.fillRect(el.width - h / 2, el.height - h / 2, h, h);
                    ctx.strokeRect(el.width - h / 2, el.height - h / 2, h, h);
                }

                ctx.restore();
            });

            if (!isPlaying) {
                if (guides.current.x !== null) {
                    ctx.beginPath();
                    ctx.strokeStyle = GUIDE_COLOR;
                    ctx.lineWidth = 1 / zoom;
                    ctx.moveTo(guides.current.x, 0);
                    ctx.lineTo(guides.current.x, CANVAS_HEIGHT);
                    ctx.stroke();
                }
                if (guides.current.y !== null) {
                    ctx.beginPath();
                    ctx.strokeStyle = GUIDE_COLOR;
                    ctx.lineWidth = 1 / zoom;
                    ctx.moveTo(0, guides.current.y);
                    ctx.lineTo(CANVAS_WIDTH, guides.current.y);
                    ctx.stroke();
                }
            }

            ctx.restore();
            animationFrame = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrame);
    }, [page, selectedId, isPlaying, currentTime, zoom, pan]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const getElementUnderMouse = (ex: number, ey: number) => {
            if (!page) return null;
            for (let i = page.elements.length - 1; i >= 0; i--) {
                const el = page.elements[i];
                if (ex >= el.x && ex <= el.x + el.width && ey >= el.y && ey <= el.y + el.height)
                    return el;
            }
            return null;
        };

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

        const handleMouseDown = (e: MouseEvent) => {
            if (e.buttons === 1 && e.getModifierState('Space')) {
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
                    initial: {},
                };
                return;
            }

            const mouse = toCanvasSpace(e);
            if (!page) return;

            if (selectedId) {
                const el = page?.elements.find((el) => el.id === selectedId);
                if (el) {
                    const hx = el.x + el.width;
                    const hy = el.y + el.height;
                    if (Math.abs(mouse.x - hx) < 15 / zoom && Math.abs(mouse.y - hy) < 15 / zoom) {
                        dragInfo.current = {
                            active: true,
                            type: 'resize',
                            id: el.id,
                            startX: mouse.x,
                            startY: mouse.y,
                            initialX: el.x,
                            initialY: el.y,
                            initialW: el.width,
                            initialH: el.height,
                            initial: { ...el },
                        };
                        return;
                    }
                }
            }

            const el = getElementUnderMouse(mouse.x, mouse.y);
            if (el) {
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
                    initial: { ...el },
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
            const dx = mouse.x - dragInfo.current.startX;
            const dy = mouse.y - dragInfo.current.startY;
            const { initial, id } = dragInfo.current;

            if (dragInfo.current.type === 'move') {
                let newX = initial.x + dx;
                let newY = initial.y + dy;

                const cx = newX + initial.width / 2;
                const cy = newY + initial.height / 2;
                guides.current = { x: null, y: null };

                if (Math.abs(cx - CANVAS_WIDTH / 2) < SNAP_THRESHOLD / zoom) {
                    newX = CANVAS_WIDTH / 2 - initial.width / 2;
                    guides.current.x = CANVAS_WIDTH / 2;
                }
                if (Math.abs(cy - CANVAS_HEIGHT / 2) < SNAP_THRESHOLD / zoom) {
                    newY = CANVAS_HEIGHT / 2 - initial.height / 2;
                    guides.current.y = CANVAS_HEIGHT / 2;
                }

                dispatch({ type: 'UPDATE_ELEMENT', id: id!, attrs: { x: newX, y: newY } });
            } else if (dragInfo.current.type === 'resize') {
                dispatch({
                    type: 'UPDATE_ELEMENT',
                    id: id!,
                    attrs: {
                        width: Math.max(10, initial.width + dx),
                        height: Math.max(10, initial.height + dy),
                    },
                });
            }
        };

        const handleMouseUp = () => {
            dragInfo.current.active = false;
            guides.current = { x: null, y: null };
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [page, selectedId, zoom, pan]);
};

// --- 5. UI COMPONENTS ---

const Sidebar = ({
    activeTab,
    onSetTab,
    onAddElement,
    onApplyAnimation,
    onSetBackground,
    selectedElement,
    leftSidebarOpen,
    onToggleLeftSidebar,
}: any) => {
    const [animSettings, setAnimSettings] = useState<AnimationSettings>({
        type: 'none',
        speed: 1,
        delay: 0,
        direction: 'up',
        mode: 'enter',
    });

    useEffect(() => {
        if (selectedElement?.animation) setAnimSettings(selectedElement.animation);
    }, [selectedElement]);

    const updateAnim = (updates: Partial<AnimationSettings>) => {
        const newSettings = { ...animSettings, ...updates };
        setAnimSettings(newSettings);
        if (selectedElement) {
            onApplyAnimation(newSettings);
        }
    };

    return (
        <div className="flex h-full bg-white border-r border-gray-200 z-20">
            {/* Icon Rail */}
            <div className="w-[72px] flex flex-col items-center py-4 border-r border-gray-100 bg-white gap-2 relative z-20">
                <NavButton
                    icon={Layout}
                    label="Blocks"
                    active={activeTab === 'blocks' && leftSidebarOpen}
                    onClick={() => onSetTab('blocks')}
                />
                <NavButton
                    icon={ImageIcon}
                    label="Media"
                    active={activeTab === 'media' && leftSidebarOpen}
                    onClick={() => onSetTab('media')}
                />
                <NavButton
                    icon={Shapes}
                    label="Shapes"
                    active={activeTab === 'shapes' && leftSidebarOpen}
                    onClick={() => onSetTab('shapes')}
                />
                <NavButton
                    icon={Type}
                    label="Text"
                    active={activeTab === 'text' && leftSidebarOpen}
                    onClick={() => onSetTab('text')}
                />
                <NavButton
                    icon={Film}
                    label="Animation"
                    active={activeTab === 'animation' && leftSidebarOpen}
                    onClick={() => onSetTab('animation')}
                />
                <NavButton
                    icon={Palette}
                    label="Color"
                    active={activeTab === 'color' && leftSidebarOpen}
                    onClick={() => onSetTab('color')}
                />

                <div className="flex-grow" />
                <button
                    onClick={onToggleLeftSidebar}
                    className="p-2 text-gray-400 hover:text-gray-600 mb-2"
                >
                    {leftSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>

            {/* Detail Drawer */}
            {leftSidebarOpen && (
                <div className="w-80 bg-[#f9fafb] flex flex-col border-r border-gray-200 shadow-inner animate-in slide-in-from-left duration-200">
                    <div className="h-14 flex items-center px-4 border-b border-gray-200 bg-white font-bold text-gray-800 capitalize">
                        {activeTab}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {activeTab === 'media' && (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search
                                        size={14}
                                        className="absolute left-3 top-2.5 text-gray-400"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search fashion..."
                                        className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Trending Fashion
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {FASHION_ASSETS.map((asset) => (
                                            <div
                                                key={asset.id}
                                                onClick={() => onAddElement('image', asset.src)}
                                                className="cursor-pointer group relative aspect-[3/4] rounded-md overflow-hidden bg-gray-200"
                                            >
                                                <img
                                                    src={asset.src}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    alt={asset.label}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'animation' && (
                            <div className="space-y-6">
                                {selectedElement ? (
                                    <>
                                        <div className="grid grid-cols-3 gap-3">
                                            {ANIMATIONS.map((anim) => (
                                                <button
                                                    key={anim.id}
                                                    onClick={() => updateAnim({ type: anim.id })}
                                                    className={`aspect-square bg-white rounded-lg border flex flex-col items-center justify-center gap-2 hover:border-violet-500 transition-all
                                                        ${animSettings.type === anim.id ? 'border-violet-600 ring-1 ring-violet-600 bg-violet-50' : 'border-gray-200'}
                                                    `}
                                                >
                                                    <Sparkles
                                                        size={14}
                                                        className={
                                                            animSettings.type === anim.id
                                                                ? 'text-violet-600'
                                                                : 'text-gray-400'
                                                        }
                                                    />
                                                    <span className="text-[10px] font-medium text-gray-600">
                                                        {anim.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        {animSettings.type !== 'none' && (
                                            <div className="space-y-5 pt-4 border-t border-gray-200">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-medium text-gray-500">
                                                        <span>Speed</span>
                                                        <span>{animSettings.speed}x</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0.1"
                                                        max="2"
                                                        step="0.1"
                                                        value={animSettings.speed}
                                                        onChange={(e) =>
                                                            updateAnim({
                                                                speed: parseFloat(e.target.value),
                                                            })
                                                        }
                                                        className="w-full accent-violet-600"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-gray-500">
                                                        Direction
                                                    </label>
                                                    <div className="flex gap-2">
                                                        {['up', 'down', 'left', 'right'].map(
                                                            (dir) => (
                                                                <button
                                                                    key={dir}
                                                                    onClick={() =>
                                                                        updateAnim({
                                                                            direction: dir as any,
                                                                        })
                                                                    }
                                                                    className={`flex-1 py-2 rounded-md border flex items-center justify-center ${animSettings.direction === dir ? 'bg-violet-100 border-violet-500 text-violet-700' : 'bg-white border-gray-200'}`}
                                                                >
                                                                    {dir === 'up' && (
                                                                        <ArrowUp size={14} />
                                                                    )}
                                                                    {dir === 'down' && (
                                                                        <ArrowDown size={14} />
                                                                    )}
                                                                    {dir === 'left' && (
                                                                        <ArrowLeft size={14} />
                                                                    )}
                                                                    {dir === 'right' && (
                                                                        <ArrowRight size={14} />
                                                                    )}
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center text-gray-400 mt-10">
                                        <p className="text-sm">Select an element to animate</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'shapes' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-3">
                                    <ShapeBtn icon={Square} onClick={() => onAddElement('rect')} />
                                    <ShapeBtn
                                        icon={CircleIcon}
                                        onClick={() => onAddElement('circle')}
                                    />
                                    <ShapeBtn
                                        icon={Triangle}
                                        onClick={() => onAddElement('triangle')}
                                    />
                                    <ShapeBtn icon={Star} onClick={() => onAddElement('star')} />
                                    <ShapeBtn
                                        icon={Hexagon}
                                        onClick={() => onAddElement('polygon')}
                                    />
                                    <ShapeBtn icon={Layout} onClick={() => onAddElement('rect')} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'text' && (
                            <div className="space-y-3">
                                <button
                                    onClick={() => onAddElement('text')}
                                    className="w-full py-4 px-4 bg-gray-800 text-white rounded-lg font-bold text-2xl text-left hover:bg-gray-900 transition"
                                >
                                    Add Heading
                                </button>
                                <button
                                    onClick={() => onAddElement('text')}
                                    className="w-full py-3 px-4 bg-gray-200 text-gray-800 rounded-lg font-medium text-lg text-left hover:bg-gray-300 transition"
                                >
                                    Add Subheading
                                </button>
                                <button
                                    onClick={() => onAddElement('text')}
                                    className="w-full py-2 px-4 border border-gray-300 text-gray-600 rounded-lg text-sm text-left hover:bg-gray-50 transition"
                                >
                                    Add body text
                                </button>
                            </div>
                        )}

                        {activeTab === 'color' && (
                            <div className="grid grid-cols-5 gap-2">
                                {[
                                    '#ffffff',
                                    '#f8fafc',
                                    '#f1f5f9',
                                    '#e2e8f0',
                                    '#cbd5e1',
                                    '#64748b',
                                    '#0f172a',
                                    '#ef4444',
                                    '#f97316',
                                    '#f59e0b',
                                    '#10b981',
                                    '#06b6d4',
                                    '#3b82f6',
                                    '#6366f1',
                                    '#8b5cf6',
                                    '#d946ef',
                                    '#f43f5e',
                                ].map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => onSetBackground(c)}
                                        className="w-8 h-8 rounded-full border border-gray-200 shadow-sm hover:scale-110 transition"
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const NavButton = ({ icon: Icon, label, active, onClick }: any) => (
    <button
        onClick={onClick}
        className={`w-full aspect-square flex flex-col items-center justify-center gap-1.5 transition-all relative
        ${active ? 'text-violet-600' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
        `}
    >
        <Icon size={20} strokeWidth={2} />
        <span className="text-[10px] font-medium">{label}</span>
        {active && (
            <div className="absolute left-0 top-2 bottom-2 w-1 bg-violet-600 rounded-r-full" />
        )}
    </button>
);

const ShapeBtn = ({ icon: Icon, onClick }: any) => (
    <button
        onClick={onClick}
        className="aspect-square bg-gray-200 rounded-md flex items-center justify-center text-gray-600 hover:bg-violet-100 hover:text-violet-600 transition-colors"
    >
        <Icon size={24} strokeWidth={1.5} />
    </button>
);

// --- NEW THUMBNAIL COMPONENT (Canvas Based) ---
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

        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);

        // Calculate Scale to fit "contain" style
        const scaleX = width / CANVAS_WIDTH;
        const scaleY = height / CANVAS_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        const dx = (width - CANVAS_WIDTH * scale) / 2;
        const dy = (height - CANVAS_HEIGHT * scale) / 2;

        ctx.save();
        ctx.translate(dx, dy);
        ctx.scale(scale, scale);

        // Clip to actual canvas area
        ctx.beginPath();
        ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.clip();

        // 1. Background
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

        // 2. Elements (Copy of main render logic without animation)
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
                const cx = el.width / 2,
                    cy = el.height / 2,
                    outerRadius = el.width / 2,
                    innerRadius = el.width / 4;
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(
                        cx + Math.cos(((18 + i * 72) / 180) * Math.PI) * outerRadius,
                        cy - Math.sin(((18 + i * 72) / 180) * Math.PI) * outerRadius
                    );
                    ctx.lineTo(
                        cx + Math.cos(((54 + i * 72) / 180) * Math.PI) * innerRadius,
                        cy - Math.sin(((54 + i * 72) / 180) * Math.PI) * innerRadius
                    );
                }
                ctx.closePath();
                ctx.fill();
            } else if (el.type === 'polygon') {
                ctx.fillStyle = el.fill;
                ctx.beginPath();
                const cx = el.width / 2,
                    cy = el.height / 2,
                    r = el.width / 2;
                for (let i = 0; i < 6; i++)
                    ctx.lineTo(
                        cx + r * Math.cos((i * 2 * Math.PI) / 6),
                        cy + r * Math.sin((i * 2 * Math.PI) / 6)
                    );
                ctx.closePath();
                ctx.fill();
            } else if (el.type === 'image' && el.src) {
                const img = getImg(el.src);
                if (img.complete) ctx.drawImage(img, 0, 0, el.width, el.height);
                else {
                    ctx.fillStyle = '#ccc';
                    ctx.fillRect(0, 0, el.width, el.height);
                }
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

    return <canvas ref={canvasRef} width={width} height={height} className="block w-full h-full" />;
};

// --- 7. NEW TIMELINE (Video Editor Style) ---
const Timeline = ({
    pages,
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
}: any) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const rulerRef = useRef<HTMLCanvasElement>(null);
    const headerResizeRef = useRef<{ startY: number; startH: number } | null>(null);
    const pageResizeRef = useRef<{ id: string; startX: number; initialDuration: number } | null>(
        null
    );

    // Calculate total duration for width
    const totalDuration = pages.reduce((acc: number, p: Page) => acc + p.duration, 0);
    // Add some padding at the end
    const totalWidth = Math.max((totalDuration + 5) * zoom, 1000);

    // --- ZOOM HANDLER ---
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.metaKey || e.ctrlKey) {
                e.preventDefault();
                // Determine direction
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                const newZoom = Math.max(10, Math.min(200, zoom * delta));
                onSetZoom(newZoom);
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [zoom]);

    // --- RULER RENDERING ---
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
        ctx.fillStyle = '#6b7280'; // gray-500 for better visibility on white
        ctx.font = '10px monospace';
        ctx.textBaseline = 'top';

        // Determine Tick Interval based on zoom
        let interval = 1; // seconds
        if (zoom < 20) interval = 10;
        else if (zoom < 50) interval = 5;
        else if (zoom < 100) interval = 1;
        else interval = 0.5;

        for (let t = 0; t <= totalDuration + 5; t += interval) {
            const x = t * zoom;
            const isMajor = t % (interval * 5) === 0 || t === 0;
            const height = isMajor ? 12 : 6;

            ctx.fillRect(x, 0, 1, height);

            if (isMajor) {
                // Format MM:SS
                const m = Math.floor(t / 60);
                const s = Math.floor(t % 60);
                const text = `${m}:${s.toString().padStart(2, '0')}`;
                ctx.fillText(text, x + 4, 0);
            }
        }
    }, [zoom, totalWidth, totalDuration]);

    // --- INTERACTION HANDLERS ---

    // 1. Timeline Resize (Height)
    const handleHeaderResizeStart = (e: React.MouseEvent) => {
        headerResizeRef.current = { startY: e.clientY, startH: height };
        document.addEventListener('mousemove', handleHeaderResizeMove);
        document.addEventListener('mouseup', handleHeaderResizeEnd);
    };
    const handleHeaderResizeMove = (e: MouseEvent) => {
        if (!headerResizeRef.current) return;
        const dy = headerResizeRef.current.startY - e.clientY;
        onResize(headerResizeRef.current.startH + dy);
    };
    const handleHeaderResizeEnd = () => {
        headerResizeRef.current = null;
        document.removeEventListener('mousemove', handleHeaderResizeMove);
        document.removeEventListener('mouseup', handleHeaderResizeEnd);
    };

    // 2. Page Duration Resize (Width)
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
        const deltaSeconds = dx / zoom;
        const newDuration = Math.max(1, pageResizeRef.current.initialDuration + deltaSeconds);
        onUpdatePageDuration(pageResizeRef.current.id, newDuration);
    };
    const handlePageResizeEnd = () => {
        pageResizeRef.current = null;
        document.removeEventListener('mousemove', handlePageResizeMove);
        document.removeEventListener('mouseup', handlePageResizeEnd);
    };

    // 3. Scrubbing
    const handleRulerClick = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left + scrollContainerRef.current.scrollLeft;
        const time = offsetX / zoom;
        onScrub(time);
    };

    // --- PAGE BLOCK RENDER PREP ---
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
            {/* Height Resize Handle */}
            <div
                className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-violet-500 z-50 bg-gray-200"
                onMouseDown={handleHeaderResizeStart}
            />

            {/* Toolbar Area */}
            <div className="h-10 flex items-center justify-between px-4 bg-gray-50 border-b border-gray-200 text-gray-700 text-xs">
                <div className="flex items-center gap-4">
                    <button onClick={onTogglePlay} className="hover:text-violet-600">
                        {isPlaying ? (
                            <Pause size={16} fill="currentColor" />
                        ) : (
                            <Play size={16} fill="currentColor" />
                        )}
                    </button>
                    <span>{currentTime.toFixed(1)}s</span>
                    <div className="h-4 w-px bg-gray-300 mx-2" />
                    <button className="hover:text-violet-600" onClick={() => onSetZoom(zoom * 0.9)}>
                        <Minus size={14} />
                    </button>
                    {/* Zoom Slider Indicator */}
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
                        onClick={onAdd}
                        className="flex items-center gap-1 hover:text-violet-600"
                    >
                        <Plus size={14} /> Add Page
                    </button>
                </div>
            </div>

            {/* Scrollable Tracks Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar bg-gray-100"
            >
                {/* 1. Ruler Layer */}
                <div
                    className="h-6 border-b border-gray-200 sticky top-0 bg-white z-10 cursor-pointer"
                    style={{ width: totalWidth }}
                    onClick={handleRulerClick}
                >
                    <canvas ref={rulerRef} style={{ width: totalWidth, height: 24 }} />
                </div>

                {/* 2. Tracks Layer */}
                <div
                    className="relative pt-4 px-0"
                    style={{ width: totalWidth, minHeight: '100%' }}
                >
                    {/* Page Blocks Track */}
                    <div className="h-24 relative mb-2">
                        {pageBlocks.map((page: any) => (
                            <div
                                key={page.id}
                                className={`absolute top-2 h-20 rounded-md border overflow-hidden group transition-colors
                                    ${activePageId === page.id ? 'border-violet-500 ring-1 ring-violet-500 z-10' : 'border-gray-300 bg-white hover:border-gray-400'}
                                `}
                                style={{
                                    left: page.start,
                                    width: page.width,
                                }}
                                onClick={() => onSelect(page.id)}
                            >
                                {/* Canvas Preview */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <PageThumbnail page={page} width={page.width} height={80} />
                                </div>

                                {/* Label */}
                                <div className="absolute top-1 left-2 text-[10px] text-gray-500 font-mono truncate max-w-[90%] z-20 mix-blend-multiply font-bold">
                                    Page {page.id.substr(0, 4)}
                                </div>
                                <div className="absolute bottom-1 left-2 text-[9px] text-gray-400 font-mono z-20 mix-blend-multiply">
                                    {page.duration.toFixed(1)}s
                                </div>

                                {/* Drag Handle (Right) */}
                                <div
                                    className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-violet-100 flex items-center justify-center group/handle z-30"
                                    onMouseDown={(e) =>
                                        handlePageResizeStart(e, page.id, page.duration)
                                    }
                                >
                                    <div className="w-1 h-4 bg-gray-300 rounded-full group-hover/handle:bg-violet-400" />
                                </div>

                                {/* Controls on hover */}
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

                    {/* Playhead Line */}
                    <div
                        className="absolute top-0 bottom-0 w-px bg-black z-40 pointer-events-none flex flex-col items-center"
                        style={{ left: currentTime * zoom }}
                    >
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-gray-800 -mt-0" />
                        <div className="flex-1 w-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const PropertiesPanel = ({
    element,
    onChange,
    onClose,
}: {
    element: DesignElement | null;
    onChange: (id: string, attrs: any) => void;
    onClose: () => void;
}) => {
    if (!element) return null;

    return (
        <div className="w-64 bg-white border-l border-gray-200 flex flex-col z-10 shadow-xl absolute right-0 top-0 bottom-0 h-full animate-in slide-in-from-right duration-300">
            <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 font-bold text-xs uppercase tracking-wider text-gray-600 bg-gray-50">
                <span>{element.type} Settings</span>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
                    <ChevronRight size={16} />
                </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">X</label>
                        <input
                            type="number"
                            value={Math.round(element.x)}
                            onChange={(e) => onChange(element.id, { x: parseInt(e.target.value) })}
                            className="w-full p-2 bg-gray-50 rounded border border-gray-200 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Y</label>
                        <input
                            type="number"
                            value={Math.round(element.y)}
                            onChange={(e) => onChange(element.id, { y: parseInt(e.target.value) })}
                            className="w-full p-2 bg-gray-50 rounded border border-gray-200 text-sm"
                        />
                    </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Fill Color
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={element.fill}
                            onChange={(e) => onChange(element.id, { fill: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border-none"
                        />
                        <span className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            {element.fill}
                        </span>
                    </div>
                </div>
                {element.type === 'text' && (
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                            Content
                        </label>
                        <textarea
                            value={element.text}
                            onChange={(e) => onChange(element.id, { text: e.target.value })}
                            className="w-full p-2 bg-gray-50 rounded border border-gray-200 text-sm min-h-[80px]"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 6. MAIN APP COMPONENT ---

const App = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [renderTick, setRenderTick] = useState(0);
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);

    const activePage = state.pages.find((p) => p.id === state.activePageId);

    // Calculate start time of current active page to synchronize local animation
    // If we are on Page 2, and Page 1 is 5s long, Page 2 starts at 5s.
    let pageStartTime = 0;
    for (let p of state.pages) {
        if (p.id === state.activePageId) break;
        pageStartTime += p.duration;
    }

    // Auto-switch page based on currentTime
    useEffect(() => {
        let accumulated = 0;
        let targetPageId = null; // Start with null to detect if we found a match

        for (let p of state.pages) {
            // Check if time falls strictly within this page's window
            // Use < for end to avoid overlap, >= for start
            if (state.currentTime >= accumulated && state.currentTime < accumulated + p.duration) {
                targetPageId = p.id;
                break; // Found it, stop looking
            }
            accumulated += p.duration;
        }

        // Edge case: End of timeline or loop finished without finding (time >= total duration)
        if (!targetPageId && state.pages.length > 0) {
            // Only switch to last page if we are actually past the end
            if (state.currentTime >= accumulated) {
                targetPageId = state.pages[state.pages.length - 1].id;
            }
        }

        // Only dispatch if we found a valid target and it's different
        if (targetPageId && targetPageId !== state.activePageId) {
            dispatch({ type: 'SELECT_PAGE', id: targetPageId });
        }
    }, [state.currentTime, state.pages, state.activePageId]);

    // Keyboard Shortcuts (New Page / Duplicate)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + Option + N : Add New Page
            if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'n') {
                e.preventDefault();
                dispatch({ type: 'ADD_PAGE' });
            }
            // Cmd/Ctrl + D : Duplicate Page
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault(); // Prevent bookmark shortcut
                dispatch({ type: 'DUPLICATE_PAGE' });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useCanvasEngine(
        canvasRef,
        activePage,
        state.selectedElementId,
        state.isPlaying,
        state.currentTime,
        state.zoom,
        state.pan,
        dispatch,
        pageStartTime
    );

    // Playback Loop
    useEffect(() => {
        let interval: number;
        if (state.isPlaying) {
            const startTime = Date.now() - state.currentTime * 1000;
            interval = setInterval(() => {
                const now = Date.now();
                const newTime = (now - startTime) / 1000;

                // Total duration
                const totalDur = state.pages.reduce((a, b) => a + b.duration, 0);

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
    }, [state.isPlaying, state.pages]);

    // Global Key & Scroll Handlers (Zoom/Pan)
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            // Only handle canvas zoom here, timeline zoom is in Timeline component
            if ((e.ctrlKey || e.metaKey) && containerRef.current?.contains(e.target as Node)) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                dispatch({
                    type: 'SET_ZOOM',
                    zoom: Math.min(Math.max(0.1, state.zoom * delta), 5),
                });
            }
        };
        // Add to window to catch global canvas zoom, but verify target
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            window.removeEventListener('wheel', handleWheel);
        };
    }, [state.zoom]);

    return (
        <div className="flex flex-col h-screen w-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
            {/* Header */}
            <div className="h-10 bg-violet-600 text-white flex items-center justify-between px-5 shadow-sm z-40 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-base tracking-tight flex items-center gap-2">
                        <Layers className="text-white" size={20} /> GenStudio
                    </div>
                    <div className="h-5 w-px bg-white/20" />
                    <div className="flex gap-4 text-xs font-medium text-white/90">
                        <span className="hover:text-white cursor-pointer transition">File</span>
                        <span className="hover:text-white cursor-pointer transition">Resize</span>
                        <span className="hover:text-white cursor-pointer transition">View</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-xs bg-white/10 px-3 py-1 rounded-full">
                        Untitled Design - 1920 x 1080
                    </div>
                    <div className="text-xs bg-white/10 px-3 py-1 rounded-full font-mono flex items-center gap-2">
                        <ZoomIn size={12} /> {Math.round(state.zoom * 100)}%
                    </div>
                    <button className="px-3 py-1 bg-white text-violet-600 rounded font-bold text-xs hover:bg-gray-50 transition shadow-sm">
                        Share
                    </button>
                    <button className="px-3 py-1 bg-violet-800 text-white rounded font-bold text-xs hover:bg-violet-900 transition shadow-sm flex items-center gap-2">
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <Sidebar
                    activeTab={state.activeTab}
                    selectedElement={activePage?.elements.find(
                        (el) => el.id === state.selectedElementId
                    )}
                    onSetTab={(t: any) => {
                        dispatch({ type: 'SET_TAB', tab: t });
                        if (!leftSidebarOpen) setLeftSidebarOpen(true);
                    }}
                    onAddElement={(type: any, src: any) =>
                        dispatch({ type: 'ADD_ELEMENT', elementType: type, src })
                    }
                    onApplyAnimation={(anim: any) =>
                        dispatch({
                            type: 'UPDATE_ELEMENT',
                            id: state.selectedElementId!,
                            animation: anim,
                        })
                    }
                    onSetBackground={(col: string) =>
                        dispatch({ type: 'SET_BACKGROUND', color: col })
                    }
                    leftSidebarOpen={leftSidebarOpen}
                    onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
                />

                <div className="flex-1 flex flex-col relative bg-[#e5e7eb] overflow-hidden">
                    <div
                        className="flex-1 flex items-center justify-center overflow-hidden relative"
                        ref={containerRef}
                    >
                        <div
                            className="relative shadow-2xl ring-1 ring-black/5 transition-transform duration-75 ease-out origin-center"
                            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
                        >
                            <canvas
                                ref={canvasRef}
                                width={CANVAS_WIDTH}
                                height={CANVAS_HEIGHT}
                                className="bg-white cursor-crosshair block"
                            />
                        </div>
                    </div>

                    {state.isRightSidebarOpen && (
                        <PropertiesPanel
                            element={
                                activePage?.elements.find(
                                    (el) => el.id === state.selectedElementId
                                ) || null
                            }
                            onChange={(id, attrs) =>
                                dispatch({ type: 'UPDATE_ELEMENT', id, attrs })
                            }
                            onClose={() =>
                                dispatch({ type: 'TOGGLE_RIGHT_SIDEBAR', isOpen: false })
                            }
                        />
                    )}

                    <Timeline
                        pages={state.pages}
                        activePageId={state.activePageId}
                        isPlaying={state.isPlaying}
                        currentTime={state.currentTime}
                        height={state.timelineHeight}
                        zoom={state.timelineZoom}
                        onSelect={(id: string) => {
                            dispatch({ type: 'SELECT_PAGE', id });
                            // Sync timeline to start of page
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
                    />
                </div>
            </div>
        </div>
    );
};

export default App;
