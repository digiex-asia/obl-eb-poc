import * as React from 'react';
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Copy,
  Square,
  Circle as CircleIcon,
  Image as ImageIcon,
  Download,
  Layout,
  Star,
  Triangle,
  Hexagon,
  Minus,
  Shapes,
  X,
  Heart,
  Diamond,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  ArrowUpFromLine,
  ArrowDownFromLine,
  FlipHorizontal,
  FlipVertical,
  MousePointer2,
  MoreHorizontal,
  ZoomIn,
  Bug,
  Group,
  Ungroup,
} from 'lucide-react';

const { useEffect, useRef, useState, useReducer, useCallback } = React;

// --- 1. CONSTANTS & ASSETS ---
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1080;
const SELECTION_COLOR = '#8b5cf6';
const GUIDE_COLOR = '#ec4899';
const HANDLE_SIZE = 10;
const ROTATE_HANDLE_OFFSET = 40;
const SNAP_THRESHOLD = 10;

const FASHION_ASSETS = [
  {
    id: 'img1',
    src: 'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=600',
    label: 'Street',
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
  | 'image';

interface DesignElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  contentWidth?: number;
  contentHeight?: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  src?: string;
  fillImage?: string;
  opacity: number;
  flipX: boolean;
  flipY: boolean;
  groupId?: string;
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
  selectedIds: string[];
  isPlaying: boolean;
  zoom: number;
  pan: { x: number; y: number };
  activeTab: 'media' | 'shapes';
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    elementId: string | null;
  };
}

// --- 3. STATE & REDUCER ---
type Action =
  | { type: 'ADD_PAGE' }
  | {
      type: 'ADD_ELEMENT';
      elementType: ElementType;
      src?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }
  | { type: 'UPDATE_ELEMENTS'; ids: string[]; attrs: Partial<DesignElement> }
  | {
      type: 'BATCH_UPDATE_ELEMENTS';
      updates: { id: string; attrs: Partial<DesignElement> }[];
    }
  | { type: 'SELECT_ELEMENT'; id: string | null; append?: boolean }
  | { type: 'SELECT_MULTIPLE'; ids: string[] }
  | { type: 'DELETE_ELEMENT' }
  | {
      type: 'ALIGN_ELEMENTS';
      alignType: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
    }
  | { type: 'SET_TAB'; tab: AppState['activeTab'] }
  | { type: 'SET_BACKGROUND'; color: string }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; pan: { x: number; y: number } }
  | {
      type: 'OPEN_CONTEXT_MENU';
      x: number;
      y: number;
      elementId: string | null;
    }
  | { type: 'CLOSE_CONTEXT_MENU' }
  | { type: 'COPY_ELEMENT' }
  | { type: 'MOVE_ELEMENT_BY'; ids: string[]; dx: number; dy: number }
  | { type: 'GROUP_ELEMENTS' }
  | { type: 'UNGROUP_ELEMENTS' };

const generateId = () => Math.random().toString(36).substr(2, 9);

const initialState: AppState = {
  pages: [
    { id: generateId(), duration: 5, background: '#ffffff', elements: [] },
  ],
  activePageId: '',
  selectedIds: [],
  isPlaying: false,
  zoom: 0.6,
  pan: { x: 0, y: 0 },
  activeTab: 'media',
  contextMenu: { visible: false, x: 0, y: 0, elementId: null },
};
initialState.activePageId = initialState.pages[0].id;

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_PAGE':
      const newPage = {
        id: generateId(),
        duration: 3,
        background: '#ffffff',
        elements: [],
      };
      return {
        ...state,
        pages: [...state.pages, newPage],
        activePageId: newPage.id,
      };

    case 'ADD_ELEMENT':
      return {
        ...state,
        pages: state.pages.map(p => {
          if (p.id !== state.activePageId) return p;
          const w =
            action.width || (action.elementType === 'image' ? 400 : 200);
          const h =
            action.height || (action.elementType === 'image' ? 400 : 200);

          const newEl: DesignElement = {
            id: generateId(),
            type: action.elementType,
            x: action.x !== undefined ? action.x : CANVAS_WIDTH / 2 - w / 2,
            y: action.y !== undefined ? action.y : CANVAS_HEIGHT / 2 - h / 2,
            width: w,
            height: h,
            contentWidth: w,
            contentHeight: h,
            rotation: 0,
            fill: '#8b5cf6',
            stroke: 'transparent',
            strokeWidth: 0,
            opacity: 1,
            flipX: false,
            flipY: false,
            src: action.src,
          };
          return { ...p, elements: [...p.elements, newEl] };
        }),
        selectedIds: [],
      };

    case 'UPDATE_ELEMENTS':
      return {
        ...state,
        pages: state.pages.map(p => {
          if (p.id !== state.activePageId) return p;
          return {
            ...p,
            elements: p.elements.map(el =>
              action.ids.includes(el.id) ? { ...el, ...action.attrs } : el
            ),
          };
        }),
      };

    case 'BATCH_UPDATE_ELEMENTS':
      return {
        ...state,
        pages: state.pages.map(p => {
          if (p.id !== state.activePageId) return p;
          const updateMap = new Map(action.updates.map(u => [u.id, u.attrs]));
          return {
            ...p,
            elements: p.elements.map(el => {
              const updates = updateMap.get(el.id);
              return updates ? { ...el, ...updates } : el;
            }),
          };
        }),
      };

    case 'MOVE_ELEMENT_BY':
      return {
        ...state,
        pages: state.pages.map(p => {
          if (p.id !== state.activePageId) return p;
          return {
            ...p,
            elements: p.elements.map(el =>
              action.ids.includes(el.id)
                ? { ...el, x: el.x + action.dx, y: el.y + action.dy }
                : el
            ),
          };
        }),
      };

    case 'GROUP_ELEMENTS': {
      if (state.selectedIds.length < 2) return state;
      const newGroupId = generateId();
      return {
        ...state,
        pages: state.pages.map(p => {
          if (p.id !== state.activePageId) return p;
          return {
            ...p,
            elements: p.elements.map(el =>
              state.selectedIds.includes(el.id)
                ? { ...el, groupId: newGroupId }
                : el
            ),
          };
        }),
      };
    }

    case 'UNGROUP_ELEMENTS': {
      if (state.selectedIds.length === 0) return state;
      return {
        ...state,
        pages: state.pages.map(p => {
          if (p.id !== state.activePageId) return p;
          return {
            ...p,
            elements: p.elements.map(el =>
              state.selectedIds.includes(el.id)
                ? { ...el, groupId: undefined }
                : el
            ),
          };
        }),
      };
    }

    case 'ALIGN_ELEMENTS': {
      const page = state.pages.find(p => p.id === state.activePageId);
      if (!page || state.selectedIds.length === 0) return state;

      const elements = page.elements.filter(e =>
        state.selectedIds.includes(e.id)
      );
      if (elements.length === 0) return state;

      const minX = Math.min(...elements.map(e => e.x));
      const maxX = Math.max(...elements.map(e => e.x + e.width));
      const minY = Math.min(...elements.map(e => e.y));
      const maxY = Math.max(...elements.map(e => e.y + e.height));
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      let newElements = [...page.elements];

      elements.forEach(el => {
        let updates: Partial<DesignElement> = {};
        if (state.selectedIds.length === 1) {
          if (action.alignType === 'left') updates.x = 0;
          if (action.alignType === 'center')
            updates.x = (CANVAS_WIDTH - el.width) / 2;
          if (action.alignType === 'right') updates.x = CANVAS_WIDTH - el.width;
          if (action.alignType === 'top') updates.y = 0;
          if (action.alignType === 'middle')
            updates.y = (CANVAS_HEIGHT - el.height) / 2;
          if (action.alignType === 'bottom')
            updates.y = CANVAS_HEIGHT - el.height;
        } else {
          if (action.alignType === 'left') updates.x = minX;
          if (action.alignType === 'center') updates.x = midX - el.width / 2;
          if (action.alignType === 'right') updates.x = maxX - el.width;
          if (action.alignType === 'top') updates.y = minY;
          if (action.alignType === 'middle') updates.y = midY - el.height / 2;
          if (action.alignType === 'bottom') updates.y = maxY - el.height;
        }
        if (Object.keys(updates).length > 0) {
          newElements = newElements.map(e =>
            e.id === el.id ? { ...e, ...updates } : e
          );
        }
      });

      return {
        ...state,
        pages: state.pages.map(p =>
          p.id === state.activePageId ? { ...p, elements: newElements } : p
        ),
      };
    }

    case 'SELECT_ELEMENT': {
      if (action.id === null) return { ...state, selectedIds: [] };

      // Check for Group logic
      const page = state.pages.find(p => p.id === state.activePageId);
      const clickedEl = page?.elements.find(e => e.id === action.id);

      // If element belongs to a group, select the whole group
      let idsToSelect = [action.id];
      if (clickedEl?.groupId) {
        idsToSelect = page?.elements
          .filter(e => e.groupId === clickedEl.groupId)
          .map(e => e.id) || [action.id];
      }

      if (action.append) {
        const newSelection = new Set(state.selectedIds);
        idsToSelect.forEach(id => {
          if (newSelection.has(id)) newSelection.delete(id);
          else newSelection.add(id);
        });
        return { ...state, selectedIds: Array.from(newSelection) };
      }
      return { ...state, selectedIds: idsToSelect };
    }

    case 'SELECT_MULTIPLE':
      return { ...state, selectedIds: action.ids };

    case 'DELETE_ELEMENT':
      if (state.selectedIds.length === 0) return state;
      return {
        ...state,
        pages: state.pages.map(p =>
          p.id === state.activePageId
            ? {
                ...p,
                elements: p.elements.filter(
                  e => !state.selectedIds.includes(e.id)
                ),
              }
            : p
        ),
        selectedIds: [],
        contextMenu: { ...state.contextMenu, visible: false },
      };

    case 'COPY_ELEMENT':
      const pIdx = state.pages.findIndex(p => p.id === state.activePageId);
      if (pIdx === -1 || state.selectedIds.length === 0) return state;
      const newEls: DesignElement[] = [];
      const toCopy = state.pages[pIdx].elements.filter(e =>
        state.selectedIds.includes(e.id)
      );

      // Map old groupIds to new ones to preserve grouping structure in copy
      const groupMap = new Map<string, string>();

      toCopy.forEach(el => {
        let newGroupId = el.groupId;
        if (el.groupId) {
          if (!groupMap.has(el.groupId)) groupMap.set(el.groupId, generateId());
          newGroupId = groupMap.get(el.groupId);
        }
        newEls.push({
          ...el,
          id: generateId(),
          x: el.x + 20,
          y: el.y + 20,
          groupId: newGroupId,
        });
      });

      return {
        ...state,
        pages: state.pages.map((p, i) =>
          i === pIdx ? { ...p, elements: [...p.elements, ...newEls] } : p
        ),
        selectedIds: newEls.map(e => e.id),
        contextMenu: { ...state.contextMenu, visible: false },
      };

    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_BACKGROUND':
      return {
        ...state,
        pages: state.pages.map(p =>
          p.id === state.activePageId ? { ...p, background: action.color } : p
        ),
      };
    case 'SET_ZOOM':
      return { ...state, zoom: action.zoom };
    case 'SET_PAN':
      return { ...state, pan: action.pan };
    case 'OPEN_CONTEXT_MENU':
      return {
        ...state,
        contextMenu: {
          visible: true,
          x: action.x,
          y: action.y,
          elementId: action.elementId,
        },
      };
    case 'CLOSE_CONTEXT_MENU':
      return {
        ...state,
        contextMenu: { ...state.contextMenu, visible: false },
      };
    default:
      return state;
  }
};

// --- 4. HOOKS ---
const useCanvasEngine = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  page: Page | undefined,
  selectedIds: string[],
  isPlaying: boolean, // Added back missing prop
  currentTime: number, // Added back missing prop
  zoom: number,
  pan: { x: number; y: number },
  dispatch: React.Dispatch<Action>
) => {
  const dragInfo = useRef<{
    active: boolean;
    type: 'move' | 'resize' | 'rotate' | 'pan' | 'select-box';
    handle?: string;
    startX: number;
    startY: number;
    initialStates: Map<
      string,
      {
        x: number;
        y: number;
        w: number;
        h: number;
        cw?: number;
        ch?: number;
        r: number;
      }
    >;
    boxStartX?: number;
    boxStartY?: number;
    centerX?: number;
    centerY?: number;
    initialRot?: number;
    groupBounds?: { minX: number; minY: number; maxX: number; maxY: number };
    snapTargets?: { x: number[]; y: number[] };
  }>({
    active: false,
    type: 'move',
    startX: 0,
    startY: 0,
    initialStates: new Map(),
  });

  const mousePosRef = useRef({ x: 0, y: 0 });
  const activeSnapGuides = useRef<{ x: number[]; y: number[] }>({
    x: [],
    y: [],
  });
  const transientState = useRef<Map<string, Partial<DesignElement>>>(new Map());

  // OPTIMIZATION: Offscreen Canvas for Static Elements
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isCachingRef = useRef(false);

  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const getImg = useCallback((src: string) => {
    if (imageCache.current.has(src)) return imageCache.current.get(src)!;
    const img = new Image();
    img.src = src;
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      imageCache.current.set(src, img);
    };
    return img;
  }, []);

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

  // SCROLL ZOOM HANDLER
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const newZoom = Math.max(
          0.1,
          Math.min(5, zoom - e.deltaY * zoomSensitivity)
        );
        dispatch({ type: 'SET_ZOOM', zoom: newZoom });
      } else {
        dispatch({
          type: 'SET_PAN',
          pan: { x: pan.x - e.deltaX, y: pan.y - e.deltaY },
        });
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [zoom, pan, dispatch]);

  // RENDER HELPER
  const drawElement = useCallback(
    (ctx: CanvasRenderingContext2D, el: DesignElement) => {
      ctx.save();
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((el.rotation * Math.PI) / 180);
      if (el.flipX) ctx.scale(-1, 1);
      if (el.flipY) ctx.scale(1, -1);
      ctx.translate(-el.width / 2, -el.height / 2);
      ctx.globalAlpha = el.opacity;

      if (el.type === 'image' && el.src) {
        ctx.beginPath();
        ctx.rect(0, 0, el.width, el.height);
        ctx.clip();
        const img = getImg(el.src);
        if (img.complete) {
          const cw = el.contentWidth || el.width;
          const ch = el.contentHeight || el.height;
          ctx.drawImage(img, 0, 0, cw, ch);
        } else {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(0, 0, el.width, el.height);
        }
      } else {
        ctx.beginPath();
        if (el.type === 'rect') ctx.rect(0, 0, el.width, el.height);
        else if (el.type === 'circle')
          ctx.ellipse(
            el.width / 2,
            el.height / 2,
            el.width / 2,
            el.height / 2,
            0,
            0,
            Math.PI * 2
          );
        else if (el.type === 'triangle') {
          ctx.moveTo(el.width / 2, 0);
          ctx.lineTo(el.width, el.height);
          ctx.lineTo(0, el.height);
          ctx.closePath();
        } else if (el.type === 'star') {
          const r = Math.min(el.width, el.height) / 2;
          const cx = el.width / 2;
          const cy = el.height / 2;
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
        } else if (el.type === 'heart') {
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
          ctx.bezierCurveTo(
            el.width,
            0,
            el.width / 2,
            0,
            el.width / 2,
            el.height * 0.2
          );
        } else if (el.type === 'hexagon') {
          const cx = el.width / 2;
          const cy = el.height / 2;
          const r = Math.min(el.width, el.height) / 2;
          for (let i = 0; i < 6; i++) {
            ctx.lineTo(
              cx + r * Math.cos((i * 2 * Math.PI) / 6),
              cy + r * Math.sin((i * 2 * Math.PI) / 6)
            );
          }
          ctx.closePath();
        } else if (el.type === 'diamond') {
          ctx.moveTo(el.width / 2, 0);
          ctx.lineTo(el.width, el.height / 2);
          ctx.lineTo(el.width / 2, el.height);
          ctx.lineTo(0, el.height / 2);
          ctx.closePath();
        }

        if (el.fillImage) {
          ctx.save();
          ctx.clip();
          const img = getImg(el.fillImage);
          if (img.complete) ctx.drawImage(img, 0, 0, el.width, el.height);
          else {
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(0, 0, el.width, el.height);
          }
          ctx.restore();
        } else {
          ctx.fillStyle = el.fill;
          ctx.fill();
        }
      }

      if (el.strokeWidth > 0 && el.stroke !== 'transparent') {
        if (el.type !== 'image') {
          ctx.strokeStyle = el.stroke;
          ctx.lineWidth = el.strokeWidth;
          ctx.stroke();
        } else {
          ctx.strokeStyle = el.stroke;
          ctx.lineWidth = el.strokeWidth;
          ctx.strokeRect(0, 0, el.width, el.height);
        }
      }
      ctx.restore();
    },
    [getImg]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !page) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;

      // Setup Main Canvas
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

      // Draw Canvas Background
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
        } else ctx.fillStyle = '#ffffff';
      } else ctx.fillStyle = page.background;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // --- OPTIMIZED RENDERING ---
      const isDragging =
        dragInfo.current.active &&
        (dragInfo.current.type === 'move' ||
          dragInfo.current.type === 'rotate' ||
          dragInfo.current.type === 'resize');

      // 1. Prepare Static Cache if starting drag
      if (isDragging && !isCachingRef.current) {
        if (!offscreenCanvasRef.current)
          offscreenCanvasRef.current = document.createElement('canvas');
        const oc = offscreenCanvasRef.current;
        oc.width = CANVAS_WIDTH;
        oc.height = CANVAS_HEIGHT;
        const oCtx = oc.getContext('2d');
        if (oCtx) {
          oCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          // Draw only NON-selected elements to static cache
          page.elements.forEach(el => {
            if (!selectedIds.includes(el.id)) {
              drawElement(oCtx, el);
            }
          });
        }
        isCachingRef.current = true;
      } else if (!isDragging) {
        isCachingRef.current = false;
      }

      // 2. Draw Elements
      if (isDragging && offscreenCanvasRef.current && isCachingRef.current) {
        // A. Draw Static Background (1 Draw Call)
        ctx.drawImage(offscreenCanvasRef.current, 0, 0);

        // B. Draw Dynamic (Selected) Elements
        page.elements.forEach(baseEl => {
          if (selectedIds.includes(baseEl.id)) {
            const transient = transientState.current.get(baseEl.id);
            const el = transient ? { ...baseEl, ...transient } : baseEl;
            drawElement(ctx, el);
          }
        });
      } else {
        // Standard Draw (No Cache)
        page.elements.forEach(el => drawElement(ctx, el));
      }

      // --- Draw Snapping Guides ---
      if (dragInfo.current.active && dragInfo.current.type === 'move') {
        ctx.lineWidth = 1 / zoom;
        ctx.strokeStyle = GUIDE_COLOR;
        activeSnapGuides.current.x.forEach(gx => {
          ctx.beginPath();
          ctx.moveTo(gx, -1000);
          ctx.lineTo(gx, CANVAS_HEIGHT + 1000);
          ctx.stroke();
        });
        activeSnapGuides.current.y.forEach(gy => {
          ctx.beginPath();
          ctx.moveTo(-1000, gy);
          ctx.lineTo(CANVAS_WIDTH + 1000, gy);
          ctx.stroke();
        });
      }

      // --- Draw Selection ---
      if (selectedIds.length > 0) {
        const selectedEls = page.elements
          .filter(e => selectedIds.includes(e.id))
          .map(e => {
            const transient = transientState.current.get(e.id);
            return transient ? { ...e, ...transient } : e;
          });

        if (selectedEls.length > 0) {
          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
          selectedEls.forEach(el => {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
            maxX = Math.max(maxX, el.x + el.width);
            maxY = Math.max(maxY, el.y + el.height);
          });

          const isSingle = selectedIds.length === 1;

          ctx.save();
          if (isSingle) {
            const el = selectedEls[0];
            const cx = el.x + el.width / 2;
            const cy = el.y + el.height / 2;
            ctx.translate(cx, cy);
            ctx.rotate((el.rotation * Math.PI) / 180);
            ctx.translate(-el.width / 2, -el.height / 2);
            minX = 0;
            minY = 0;
            maxX = el.width;
            maxY = el.height;
          }

          const bw = maxX - minX;
          const bh = maxY - minY;

          ctx.strokeStyle = SELECTION_COLOR;
          ctx.lineWidth = 1.5 / zoom;
          ctx.strokeRect(minX, minY, bw, bh);

          const hs = HANDLE_SIZE / zoom;
          const hhs = hs / 2;

          const drawCircleHandle = (x: number, y: number) => {
            ctx.beginPath();
            ctx.arc(x, y, hhs, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
          };
          const drawPillHandle = (
            x: number,
            y: number,
            horizontal: boolean
          ) => {
            ctx.beginPath();
            if (horizontal)
              ctx.roundRect(x - hs, y - hhs / 2, hs * 2, hhs, hhs / 2);
            else ctx.roundRect(x - hhs / 2, y - hs, hhs, hs * 2, hhs / 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
          };

          drawCircleHandle(minX, minY);
          drawCircleHandle(maxX, minY);
          drawCircleHandle(maxX, maxY);
          drawCircleHandle(minX, maxY);
          drawPillHandle(minX + bw / 2, minY, true);
          drawPillHandle(maxX, minY + bh / 2, false);
          drawPillHandle(minX + bw / 2, maxY, true);
          drawPillHandle(minX, minY + bh / 2, false);

          const rotOffset = ROTATE_HANDLE_OFFSET / zoom;
          ctx.beginPath();
          ctx.moveTo(minX + bw / 2, minY);
          ctx.lineTo(minX + bw / 2, minY - rotOffset);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(minX + bw / 2, minY - rotOffset, hhs, 0, Math.PI * 2);
          ctx.fillStyle = 'white';
          ctx.fill();
          ctx.stroke();

          // --- DEGREE INDICATOR ---
          if (dragInfo.current.type === 'rotate' && isSingle) {
            const el = selectedEls[0];
            const degText = `${Math.round(el.rotation)}°`;
            ctx.font = '12px sans-serif';
            const textWidth = ctx.measureText(degText).width;
            const pad = 6;

            ctx.save();
            ctx.translate(minX + bw / 2, minY - rotOffset - 25);
            ctx.rotate((-el.rotation * Math.PI) / 180);

            ctx.fillStyle = SELECTION_COLOR;
            ctx.beginPath();
            ctx.roundRect(
              -textWidth / 2 - pad,
              -10,
              textWidth + pad * 2,
              20,
              4
            );
            ctx.fill();

            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(degText, 0, 0);
            ctx.restore();
          }

          ctx.restore();
        }
      }

      // Selection Marquee
      if (
        dragInfo.current.type === 'select-box' &&
        dragInfo.current.active &&
        dragInfo.current.boxStartX !== undefined
      ) {
        const { boxStartX, boxStartY } = dragInfo.current;
        const rect = canvas.getBoundingClientRect();
        const mx =
          (mousePosRef.current.x - rect.left - rect.width / 2 - pan.x) / zoom +
          CANVAS_WIDTH / 2;
        const my =
          (mousePosRef.current.y - rect.top - rect.height / 2 - pan.y) / zoom +
          CANVAS_HEIGHT / 2;
        ctx.save();
        ctx.strokeStyle = '#8b5cf6';
        ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.lineWidth = 1 / zoom;
        const bx = Math.min(boxStartX, mx);
        const by = Math.min(boxStartY!, my);
        const bw = Math.abs(mx - boxStartX);
        const bh = Math.abs(my - boxStartY!);
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.restore();
      }

      ctx.restore();
      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [page, selectedIds, isPlaying, currentTime, zoom, pan, drawElement]);

  // Input Handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toCanvasSpace = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const rawX = (clientX - rect.width / 2 - pan.x) / zoom;
      const rawY = (clientY - rect.height / 2 - pan.y) / zoom;
      return { x: rawX + CANVAS_WIDTH / 2, y: rawY + CANVAS_HEIGHT / 2 };
    };

    const getHandleUnderMouse = (
      mouse: { x: number; y: number },
      bounds: { minX: number; minY: number; maxX: number; maxY: number },
      rotation: number
    ) => {
      const hs = (HANDLE_SIZE / zoom) * 2;
      let mx = mouse.x;
      let my = mouse.y;

      const bw = bounds.maxX - bounds.minX;
      const bh = bounds.maxY - bounds.minY;
      const cx = bounds.minX + bw / 2;
      const cy = bounds.minY + bh / 2;

      if (rotation !== 0) {
        const rad = (-rotation * Math.PI) / 180;
        const dx = mouse.x - cx;
        const dy = mouse.y - cy;
        mx = cx + (dx * Math.cos(rad) - dy * Math.sin(rad));
        my = cy + (dx * Math.sin(rad) + dy * Math.cos(rad));
      }

      if (Math.abs(mx - bounds.minX) < hs && Math.abs(my - bounds.minY) < hs)
        return 'nw';
      if (Math.abs(mx - bounds.maxX) < hs && Math.abs(my - bounds.minY) < hs)
        return 'ne';
      if (Math.abs(mx - bounds.maxX) < hs && Math.abs(my - bounds.maxY) < hs)
        return 'se';
      if (Math.abs(mx - bounds.minX) < hs && Math.abs(my - bounds.maxY) < hs)
        return 'sw';
      if (
        Math.abs(mx - (bounds.minX + bw / 2)) < hs &&
        Math.abs(my - bounds.minY) < hs
      )
        return 'n';
      if (
        Math.abs(mx - bounds.maxX) < hs &&
        Math.abs(my - (bounds.minY + bh / 2)) < hs
      )
        return 'e';
      if (
        Math.abs(mx - (bounds.minX + bw / 2)) < hs &&
        Math.abs(my - bounds.maxY) < hs
      )
        return 's';
      if (
        Math.abs(mx - bounds.minX) < hs &&
        Math.abs(my - (bounds.minY + bh / 2)) < hs
      )
        return 'w';

      const rotOffset = ROTATE_HANDLE_OFFSET / zoom;
      if (
        Math.abs(mx - (bounds.minX + bw / 2)) < hs &&
        Math.abs(my - (bounds.minY - rotOffset)) < hs
      )
        return 'rotate';

      return null;
    };

    const handleMouseDown = (e: MouseEvent) => {
      const mouse = toCanvasSpace(e);
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      if (e.button === 2) return;
      if (e.buttons === 1 && e.getModifierState('Space')) {
        dragInfo.current = {
          active: true,
          type: 'pan',
          startX: e.clientX,
          startY: e.clientY,
          initialStates: new Map(),
        };
        return;
      }

      if (selectedIds.length > 0 && page) {
        const selectedEls = page.elements.filter(e =>
          selectedIds.includes(e.id)
        );
        if (selectedEls.length > 0) {
          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
          selectedEls.forEach(el => {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
            maxX = Math.max(maxX, el.x + el.width);
            maxY = Math.max(maxY, el.y + el.height);
          });
          const rotation =
            selectedIds.length === 1 ? selectedEls[0].rotation : 0;
          const handle = getHandleUnderMouse(
            mouse,
            { minX, minY, maxX, maxY },
            rotation
          );

          if (handle) {
            const states = new Map();
            selectedEls.forEach(el => {
              states.set(el.id, {
                x: el.x,
                y: el.y,
                w: el.width,
                h: el.height,
                cw: el.contentWidth || el.width,
                ch: el.contentHeight || el.height,
                r: el.rotation,
              });
            });
            const cx = minX + (maxX - minX) / 2;
            const cy = minY + (maxY - minY) / 2;

            if (handle === 'rotate') {
              dragInfo.current = {
                active: true,
                type: 'rotate',
                startX: mouse.x,
                startY: mouse.y,
                initialStates: states,
                centerX: cx,
                centerY: cy,
                initialRot: rotation,
              };
            } else {
              dragInfo.current = {
                active: true,
                type: 'resize',
                handle: handle,
                startX: mouse.x,
                startY: mouse.y,
                initialStates: states,
                groupBounds: { minX, minY, maxX, maxY },
                initialRot: rotation,
              };
            }
            return;
          }
        }
      }

      let hitEl = null;
      if (page) {
        for (let i = page.elements.length - 1; i >= 0; i--) {
          const el = page.elements[i];
          if (
            mouse.x >= el.x &&
            mouse.x <= el.x + el.width &&
            mouse.y >= el.y &&
            mouse.y <= el.y + el.height
          ) {
            hitEl = el;
            break;
          }
        }
      }

      if (hitEl) {
        const isShift = e.shiftKey;
        if (!selectedIds.includes(hitEl.id))
          dispatch({ type: 'SELECT_ELEMENT', id: hitEl.id, append: isShift });
        else if (isShift)
          dispatch({ type: 'SELECT_ELEMENT', id: hitEl.id, append: true });

        const currentSelected =
          !selectedIds.includes(hitEl.id) && !isShift
            ? [hitEl.id]
            : selectedIds.includes(hitEl.id)
              ? selectedIds
              : [...selectedIds, hitEl.id];
        const states = new Map();
        page?.elements.forEach(el => {
          if (currentSelected.includes(el.id))
            states.set(el.id, {
              x: el.x,
              y: el.y,
              w: el.width,
              h: el.height,
              r: el.rotation,
            });
        });

        const snapTargetsX = [CANVAS_WIDTH / 2];
        const snapTargetsY = [CANVAS_HEIGHT / 2];

        if (page) {
          page.elements.forEach(el => {
            if (!currentSelected.includes(el.id)) {
              snapTargetsX.push(el.x, el.x + el.width / 2, el.x + el.width);
              snapTargetsY.push(el.y, el.y + el.height / 2, el.y + el.height);
            }
          });
        }

        dragInfo.current = {
          active: true,
          type: 'move',
          startX: mouse.x,
          startY: mouse.y,
          initialStates: states,
          snapTargets: { x: snapTargetsX, y: snapTargetsY },
        };
      } else {
        dispatch({ type: 'SELECT_ELEMENT', id: null });
        dragInfo.current = {
          active: true,
          type: 'select-box',
          startX: e.clientX,
          startY: e.clientY,
          boxStartX: mouse.x,
          boxStartY: mouse.y,
          initialStates: new Map(),
        };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      if (!dragInfo.current.active) return;
      const {
        type,
        startX,
        startY,
        initialStates,
        centerX,
        centerY,
        handle,
        groupBounds,
        initialRot,
        snapTargets,
      } = dragInfo.current;

      if (type === 'pan') {
        dispatch({
          type: 'SET_PAN',
          pan: { x: pan.x + e.clientX - startX, y: pan.y + e.clientY - startY },
        });
        dragInfo.current.startX = e.clientX;
        dragInfo.current.startY = e.clientY;
        return;
      }

      const mouse = toCanvasSpace(e);

      // --- TRANSIENT UPDATE LOGIC ---
      if (type === 'rotate') {
        const angle =
          (Math.atan2(mouse.y - centerY!, mouse.x - centerX!) * 180) / Math.PI;
        let newRot = angle - -90;
        if (e.shiftKey) newRot = Math.round(newRot / 45) * 45;

        if (initialStates.size === 1) {
          const id = initialStates.keys().next().value;
          transientState.current.set(id, { rotation: newRot });
        } else {
          initialStates.forEach((_, id) => {
            transientState.current.set(id, { rotation: newRot });
          });
        }
        return;
      }

      if (type === 'resize' && groupBounds) {
        const dxGlobal = mouse.x - startX;
        const dyGlobal = mouse.y - startY;
        let dx = dxGlobal;
        let dy = dyGlobal;

        if (initialStates.size === 1 && initialRot) {
          const rad = (initialRot * Math.PI) / 180;
          dx = dxGlobal * Math.cos(rad) + dyGlobal * Math.sin(rad);
          dy = -dxGlobal * Math.sin(rad) + dyGlobal * Math.cos(rad);
        }

        let changeX = 0;
        let changeY = 0;
        let changeW = 0;
        let changeH = 0;
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

        const isCorner = handle?.length === 2;
        const oldBoundsW = groupBounds.maxX - groupBounds.minX;
        const oldBoundsH = groupBounds.maxY - groupBounds.minY;

        if (isCorner) {
          const aspect = oldBoundsW / oldBoundsH;
          if (Math.abs(changeW) > Math.abs(changeH)) changeH = changeW / aspect;
          else changeW = changeH * aspect;
          if (handle?.includes('w')) changeX = -changeW;
          if (handle?.includes('n')) changeY = -changeH;
        }

        const scaleX = (oldBoundsW + changeW) / oldBoundsW;
        const scaleY = (oldBoundsH + changeH) / oldBoundsH;

        initialStates.forEach((init, id) => {
          const relX = init.x - groupBounds.minX;
          const relY = init.y - groupBounds.minY;

          let nextX = init.x;
          let nextY = init.y;
          let nextW = init.w;
          let nextH = init.h;

          if (initialStates.size > 1) {
            nextX = groupBounds.minX + changeX + relX * scaleX;
            nextY = groupBounds.minY + changeY + relY * scaleY;
            nextW = init.w * scaleX;
            nextH = init.h * scaleY;
          } else {
            if (handle?.includes('e')) nextW = Math.max(10, init.w + changeW);
            if (handle?.includes('w')) {
              const d = changeW;
              nextW = Math.max(10, init.w + d);
              if (initialRot === 0) nextX = init.x - d;
            }
            if (handle?.includes('s')) nextH = Math.max(10, init.h + changeH);
            if (handle?.includes('n')) {
              const d = changeH;
              nextH = Math.max(10, init.h + d);
              if (initialRot === 0) nextY = init.y - d;
            }
          }

          let nextCW = init.cw || init.w;
          let nextCH = init.ch || init.h;
          const contentAspect = nextCW / nextCH;
          nextW = Math.abs(nextW);
          nextH = Math.abs(nextH);

          if (isCorner) {
            const sX = nextW / init.w;
            nextCW = (init.cw || init.w) * sX;
            nextCH = (init.ch || init.h) * sX;
          } else {
            let targetCW = Math.max(init.cw || init.w, nextW);
            let targetCH = targetCW / contentAspect;
            if (targetCH < nextH) {
              targetCH = nextH;
              targetCW = targetCH * contentAspect;
            }
            nextCW = targetCW;
            nextCH = targetCH;
          }

          transientState.current.set(id, {
            x: nextX,
            y: nextY,
            width: nextW,
            height: nextH,
            contentWidth: nextCW,
            contentHeight: nextCH,
          });
        });
      }

      if (type === 'move') {
        let dx = mouse.x - startX;
        let dy = mouse.y - startY;

        // SNAP LOGIC
        if (snapTargets) {
          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
          initialStates.forEach(state => {
            minX = Math.min(minX, state.x);
            minY = Math.min(minY, state.y);
            maxX = Math.max(maxX, state.x + state.w);
            maxY = Math.max(maxY, state.y + state.h);
          });

          const currentMinX = minX + dx;
          const currentMaxX = maxX + dx;
          const currentCenterX = currentMinX + (currentMaxX - currentMinX) / 2;

          const currentMinY = minY + dy;
          const currentMaxY = maxY + dy;
          const currentCenterY = currentMinY + (currentMaxY - currentMinY) / 2;

          let snapDx = 0;
          let minDistX = SNAP_THRESHOLD;
          let guideX: number[] = [];
          let snapDy = 0;
          let minDistY = SNAP_THRESHOLD;
          let guideY: number[] = [];

          snapTargets.x.forEach(target => {
            const dL = target - currentMinX;
            const dR = target - currentMaxX;
            const dC = target - currentCenterX;
            if (Math.abs(dL) < minDistX) {
              minDistX = Math.abs(dL);
              snapDx = dL;
              guideX = [target];
            } else if (Math.abs(dR) < minDistX) {
              minDistX = Math.abs(dR);
              snapDx = dR;
              guideX = [target];
            } else if (Math.abs(dC) < minDistX) {
              minDistX = Math.abs(dC);
              snapDx = dC;
              guideX = [target];
            }
          });

          snapTargets.y.forEach(target => {
            const dT = target - currentMinY;
            const dB = target - currentMaxY;
            const dC = target - currentCenterY;
            if (Math.abs(dT) < minDistY) {
              minDistY = Math.abs(dT);
              snapDy = dT;
              guideY = [target];
            } else if (Math.abs(dB) < minDistY) {
              minDistY = Math.abs(dB);
              snapDy = dB;
              guideY = [target];
            } else if (Math.abs(dC) < minDistY) {
              minDistY = Math.abs(dC);
              snapDy = dC;
              guideY = [target];
            }
          });

          dx += snapDx;
          dy += snapDy;
          activeSnapGuides.current = { x: guideX, y: guideY };
        } else {
          activeSnapGuides.current = { x: [], y: [] };
        }

        initialStates.forEach((init, id) => {
          transientState.current.set(id, { x: init.x + dx, y: init.y + dy });
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // 1. Commit Transient State to Redux/Reducer
      if (transientState.current.size > 0) {
        const updates = Array.from(transientState.current.entries()).map(
          ([id, attrs]) => ({ id, attrs })
        );
        dispatch({ type: 'BATCH_UPDATE_ELEMENTS', updates });
        transientState.current.clear();
      }

      // 2. Handle Selection Box
      if (
        dragInfo.current.type === 'select-box' &&
        dragInfo.current.active &&
        page
      ) {
        const rect = canvas.getBoundingClientRect();
        const mx =
          (e.clientX - rect.left - rect.width / 2 - pan.x) / zoom +
          CANVAS_WIDTH / 2;
        const my =
          (e.clientY - rect.top - rect.height / 2 - pan.y) / zoom +
          CANVAS_HEIGHT / 2;
        const sx = dragInfo.current.boxStartX!;
        const sy = dragInfo.current.boxStartY!;
        const minX = Math.min(sx, mx);
        const maxX = Math.max(sx, mx);
        const minY = Math.min(sy, my);
        const maxY = Math.max(sy, my);
        const ids: string[] = [];
        page.elements.forEach(el => {
          const ex = el.x + el.width / 2;
          const ey = el.y + el.height / 2;
          if (ex >= minX && ex <= maxX && ey >= minY && ey <= maxY)
            ids.push(el.id);
        });
        if (ids.length > 0) dispatch({ type: 'SELECT_MULTIPLE', ids });
      }

      dragInfo.current.active = false;
      activeSnapGuides.current = { x: [], y: [] };
      isCachingRef.current = false; // Reset Cache on Drop
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [page, selectedIds, zoom, pan, drawElement]);
};

// --- 5. UI COMPONENTS ---
const NavButton = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full aspect-square flex flex-col items-center justify-center gap-1.5 transition-all ${active ? 'text-violet-600 bg-violet-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
  >
    <Icon size={20} strokeWidth={2} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const IconButton = ({ icon: Icon, onClick, active, title }: any) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-2 rounded hover:bg-gray-100 ${active ? 'bg-violet-100 text-violet-600' : 'text-gray-600'}`}
  >
    <Icon size={16} />
  </button>
);

const ShapeBtn = ({ icon: Icon, type, onDragStart, onClick }: any) => (
  <div
    draggable
    onDragStart={e => onDragStart(e, type)}
    onClick={onClick}
    className="aspect-square bg-gray-200 rounded-md flex items-center justify-center text-gray-600 hover:bg-violet-100 hover:text-violet-600 cursor-grab"
  >
    <Icon size={24} strokeWidth={1.5} />
  </div>
);

// Floating Context Toolbar
const ContextToolbar = ({
  selectedIds,
  page,
  dispatch,
}: {
  selectedIds: string[];
  page: Page;
  dispatch: any;
}) => {
  const elements = page.elements.filter(e => selectedIds.includes(e.id));
  if (elements.length === 0) return null;

  const isSingle = elements.length === 1;
  const firstEl = elements[0];
  const update = (attrs: Partial<DesignElement>) =>
    dispatch({ type: 'UPDATE_ELEMENTS', ids: selectedIds, attrs });

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-200 max-w-[90vw] overflow-x-auto">
      <div className="flex bg-gray-50 rounded p-1">
        <IconButton
          icon={AlignLeft}
          onClick={() =>
            dispatch({ type: 'ALIGN_ELEMENTS', alignType: 'left' })
          }
        />
        <IconButton
          icon={AlignCenter}
          onClick={() =>
            dispatch({ type: 'ALIGN_ELEMENTS', alignType: 'center' })
          }
        />
        <IconButton
          icon={AlignRight}
          onClick={() =>
            dispatch({ type: 'ALIGN_ELEMENTS', alignType: 'right' })
          }
        />
      </div>
      <div className="w-px h-6 bg-gray-200" />
      {elements.some(e => e.type === 'image') && (
        <>
          <div className="flex bg-gray-50 rounded p-1">
            <IconButton
              icon={FlipHorizontal}
              onClick={() => update({ flipX: !firstEl.flipX })}
              active={firstEl.flipX}
            />
            <IconButton
              icon={FlipVertical}
              onClick={() => update({ flipY: !firstEl.flipY })}
              active={firstEl.flipY}
            />
          </div>
          <div className="w-px h-6 bg-gray-200" />
        </>
      )}
      {elements.some(e => e.type !== 'image') && (
        <div className="flex gap-1">
          {[
            '#000000',
            '#ffffff',
            '#ef4444',
            '#f97316',
            '#eab308',
            '#22c55e',
            '#3b82f6',
            '#a855f7',
          ].map(c => (
            <button
              key={c}
              onClick={() => update({ fill: c })}
              className={`w-6 h-6 rounded-full border ${firstEl.fill === c ? 'ring-2 ring-violet-500' : 'border-gray-200'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
      <div className="w-px h-6 bg-gray-200" />
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 border rounded flex items-center justify-center text-[10px] font-bold bg-gray-50">
          {firstEl.strokeWidth}
        </div>
        <input
          type="range"
          min="0"
          max="10"
          className="w-20 accent-violet-600"
          value={firstEl.strokeWidth}
          onChange={e =>
            update({
              strokeWidth: parseInt(e.target.value),
              stroke:
                firstEl.stroke === 'transparent' ? '#000000' : firstEl.stroke,
            })
          }
        />
      </div>
      <div className="w-px h-6 bg-gray-200" />
      <IconButton
        icon={Group}
        onClick={() => dispatch({ type: 'GROUP_ELEMENTS' })}
        title="Group (Cmd+G)"
      />
      <IconButton
        icon={Ungroup}
        onClick={() => dispatch({ type: 'UNGROUP_ELEMENTS' })}
        title="Ungroup (Cmd+Shift+G)"
      />
      <IconButton
        icon={Copy}
        onClick={() => dispatch({ type: 'COPY_ELEMENT' })}
      />
      <IconButton
        icon={Trash2}
        onClick={() => dispatch({ type: 'DELETE_ELEMENT' })}
        className="text-red-500 hover:bg-red-50"
      />
    </div>
  );
};

const Sidebar = ({ activeTab, onSetTab, onAddElement }: any) => {
  const handleDragStart = (
    e: React.DragEvent,
    type: ElementType,
    src?: string
  ) => {
    e.dataTransfer.setData('type', type);
    if (src) e.dataTransfer.setData('src', src);
  };

  return (
    <div className="flex h-full bg-white border-r border-gray-200 z-20 flex-shrink-0">
      <div className="w-[72px] flex flex-col items-center py-4 border-r border-gray-100 bg-white gap-2 z-20">
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
      </div>

      <div className="w-80 bg-[#f9fafb] flex flex-col border-r border-gray-200 shadow-inner">
        <div className="h-14 flex items-center px-4 border-b border-gray-200 bg-white font-bold text-gray-800 capitalize">
          {activeTab}
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'media' && (
            <div className="grid grid-cols-2 gap-2">
              {FASHION_ASSETS.map(asset => (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={e => handleDragStart(e, 'image', asset.src)}
                  onClick={() => onAddElement('image', asset.src)}
                  className="cursor-grab active:cursor-grabbing group relative aspect-[3/4] rounded-md overflow-hidden bg-gray-200 hover:opacity-90"
                >
                  <img src={asset.src} className="w-full h-full object-cover" />
                </div>
              ))}
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
        </div>
      </div>
    </div>
  );
};

// --- 6. MAIN APP ---
const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [zoomInput, setZoomInput] = useState(
    Math.round(state.zoom * 100).toString()
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setZoomInput(Math.round(state.zoom * 100).toString());
    }
  }, [state.zoom]);

  const activePage = state.pages.find(p => p.id === state.activePageId);

  // Helper for adding images with aspect ratio
  const addImageWithRatio = (src: string, dropX?: number, dropY?: number) => {
    const img = new Image();
    img.src = src;
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > 400) {
        const ratio = 400 / w;
        w = 400;
        h = h * ratio;
      }

      let finalX = dropX;
      let finalY = dropY;

      if (finalX !== undefined) finalX -= w / 2;
      if (finalY !== undefined) finalY -= h / 2;

      dispatch({
        type: 'ADD_ELEMENT',
        elementType: 'image',
        src,
        width: w,
        height: h,
        x: finalX,
        y: finalY,
      });
    };
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        if (e.shiftKey) {
          e.preventDefault();
          dispatch({ type: 'UNGROUP_ELEMENTS' });
        } else {
          e.preventDefault();
          dispatch({ type: 'GROUP_ELEMENTS' });
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (state.selectedIds.length > 0) {
          dispatch({ type: 'COPY_ELEMENT' });
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedIds.length > 0) {
          e.preventDefault();
          dispatch({ type: 'DELETE_ELEMENT' });
        }
      }

      // Keyboard Movement
      if (state.selectedIds.length > 0) {
        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          dispatch({
            type: 'MOVE_ELEMENT_BY',
            ids: state.selectedIds,
            dx: 0,
            dy: -step,
          });
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          dispatch({
            type: 'MOVE_ELEMENT_BY',
            ids: state.selectedIds,
            dx: 0,
            dy: step,
          });
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          dispatch({
            type: 'MOVE_ELEMENT_BY',
            ids: state.selectedIds,
            dx: -step,
            dy: 0,
          });
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          dispatch({
            type: 'MOVE_ELEMENT_BY',
            ids: state.selectedIds,
            dx: step,
            dy: 0,
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedIds]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type') as ElementType;
    const src = e.dataTransfer.getData('src');
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x =
      (e.clientX - rect.left - rect.width / 2 - state.pan.x) / state.zoom +
      CANVAS_WIDTH / 2;
    const y =
      (e.clientY - rect.top - rect.height / 2 - state.pan.y) / state.zoom +
      CANVAS_HEIGHT / 2;

    if (type === 'image' && src) {
      addImageWithRatio(src, x, y);
    } else {
      dispatch({
        type: 'ADD_ELEMENT',
        elementType: type,
        src,
        x: x - 50,
        y: y - 50,
      });
    }
  };

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) setZoomInput(val);
  };

  const handleZoomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let val = parseInt(zoomInput);
      if (!isNaN(val)) {
        val = Math.max(10, Math.min(500, val));
        dispatch({ type: 'SET_ZOOM', zoom: val / 100 });
        setZoomInput(val.toString());
        inputRef.current?.blur();
      }
    }
  };

  const focusZoomInput = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  useCanvasEngine(
    canvasRef,
    activePage,
    state.selectedIds,
    state.isPlaying,
    state.currentTime,
    state.zoom,
    state.pan,
    dispatch
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      <div className="h-10 bg-violet-600 text-white flex items-center justify-between px-5 shadow-sm z-40 flex-shrink-0">
        <div className="font-bold flex items-center gap-2">
          <Layout size={20} /> GenStudio
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`p-1.5 rounded hover:bg-white/20 transition-colors ${debugMode ? 'bg-white/20 text-white' : 'text-white/60'}`}
            title="Toggle Debug Info"
          >
            <Bug size={14} />
          </button>
          <div className="text-xs bg-white/10 px-2 py-1 rounded-full font-mono flex items-center hover:bg-white/20 transition-colors">
            <button
              onClick={focusZoomInput}
              className="mr-1 opacity-70 hover:opacity-100"
            >
              <ZoomIn size={12} />
            </button>
            <input
              ref={inputRef}
              className="bg-transparent text-white border-none outline-none w-8 text-center appearance-none"
              value={zoomInput}
              onChange={handleZoomInputChange}
              onKeyDown={handleZoomInputKeyDown}
              onBlur={() => {
                let val = parseInt(zoomInput);
                if (!isNaN(val))
                  setZoomInput(Math.max(10, Math.min(500, val)).toString());
                else setZoomInput(Math.round(state.zoom * 100).toString());
              }}
            />
            <span className="opacity-50">%</span>
          </div>
          <button className="px-3 py-1 bg-violet-800 text-white rounded font-bold text-xs flex items-center gap-2">
            <Download size={14} /> Export
          </button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={state.activeTab}
          onSetTab={(t: any) => dispatch({ type: 'SET_TAB', tab: t })}
          onAddElement={(type: any, src: any) => {
            if (type === 'image' && src) {
              addImageWithRatio(src);
            } else {
              dispatch({ type: 'ADD_ELEMENT', elementType: type, src });
            }
          }}
        />
        {state.selectedIds.length > 0 && activePage && (
          <ContextToolbar
            selectedIds={state.selectedIds}
            page={activePage}
            dispatch={dispatch}
          />
        )}
        {debugMode && activePage && (
          <div className="absolute top-14 right-4 bg-black/80 text-white p-3 rounded font-mono text-xs z-50 pointer-events-none space-y-1">
            <div className="font-bold border-b border-white/20 pb-1 mb-1">
              Debug Info
            </div>
            <div>
              Elements:{' '}
              <span className="text-green-400">
                {activePage.elements.length}
              </span>
            </div>
            <div>
              Selected:{' '}
              <span className="text-blue-400">{state.selectedIds.length}</span>
            </div>
            <div>Zoom: {Math.round(state.zoom * 100)}%</div>
            <div>
              Pan: {Math.round(state.pan.x)}, {Math.round(state.pan.y)}
            </div>
            {state.selectedIds.length === 1 && (
              <div className="pt-1 border-t border-white/20 mt-1">
                <div>ID: {state.selectedIds[0].substr(0, 6)}...</div>
                <div>
                  X:{' '}
                  {Math.round(
                    activePage.elements.find(e => e.id === state.selectedIds[0])
                      ?.x || 0
                  )}
                </div>
                <div>
                  Y:{' '}
                  {Math.round(
                    activePage.elements.find(e => e.id === state.selectedIds[0])
                      ?.y || 0
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex-1 flex flex-col relative bg-[#e5e7eb] overflow-hidden">
          <div
            className="flex-1 relative bg-[#e5e7eb] overflow-hidden"
            ref={containerRef}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            <canvas
              ref={canvasRef}
              className="block w-full h-full cursor-crosshair"
            />
            {state.contextMenu.visible && (
              <div
                className="absolute bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[150px] z-50 animate-in fade-in"
                style={{ left: state.contextMenu.x, top: state.contextMenu.y }}
              >
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                  onClick={() => dispatch({ type: 'COPY_ELEMENT' })}
                >
                  <Copy size={14} /> Duplicate
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  onClick={() => dispatch({ type: 'DELETE_ELEMENT' })}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
