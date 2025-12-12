import { useEffect, useRef } from 'react';
import type { Page, DesignElement } from '../../../shared/model/types';
import type { Action } from '../../../shared/model/store';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SELECTION_COLOR,
  HANDLE_SIZE,
  ROTATE_HANDLE_OFFSET,
} from '../../../shared/lib/constants';

const useCanvasEngine = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  containerRef: React.RefObject<HTMLDivElement>, // New: Container for wheel events
  page: Page | undefined,
  selectedId: string | null,
  selectedIds: string[], // Multi-selection support
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
    type: 'move' | 'resize' | 'rotate' | 'pan' | 'select';
    handle?: string;
    id: string | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
    initialRot: number;
    centerX?: number;
    centerY?: number;
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

  // Selection box state
  const selectionBox = useRef<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  // Store initial positions of all selected elements for multi-element dragging
  const initialElementPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

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
    const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: true });
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
            ctx.translate(
              (CANVAS_WIDTH / 2) * (1 - s),
              (CANVAS_HEIGHT / 2) * (1 - s)
            );
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
      page.elements.forEach(el => {
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
              else if (anim.type === 'shake')
                animX = el.x + Math.sin(t * 20) * 5;
              else if (anim.type === 'pulse')
                animScale = 1 + Math.sin(t * 5) * 0.05;
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
          ctx.bezierCurveTo(
            el.width,
            0,
            el.width / 2,
            0,
            el.width / 2,
            el.height * 0.2
          );
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
        if (selectedIds.includes(el.id) && !isPlaying && !isPreview) {
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
          ctx.arc(
            el.width / 2,
            -ROTATE_HANDLE_OFFSET / zoom,
            hs / 1.5,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();
      });

      // Draw selection box if dragging to select
      if (selectionBox.current && !isPlaying) {
        const { startX, startY, endX, endY } = selectionBox.current;
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const w = Math.abs(endX - startX);
        const h = Math.abs(endY - startY);

        ctx.strokeStyle = SELECTION_COLOR;
        ctx.fillStyle = 'rgba(99, 102, 241, 0.1)'; // Light blue fill
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
      }

      ctx.restore();
      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [page, selectedId, selectedIds, isPlaying, currentTime, zoom, pan, previewAnimation]);

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

    const getHandleUnderMouse = (
      mouse: { x: number; y: number },
      el: DesignElement
    ) => {
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
      if (Math.abs(lx - el.width) < hs && Math.abs(ly - el.height) < hs)
        return 'se';
      if (Math.abs(lx - el.width / 2) < hs && Math.abs(ly - 0) < hs) return 'n';
      if (Math.abs(lx - el.width / 2) < hs && Math.abs(ly - el.height) < hs)
        return 's';
      if (Math.abs(lx - 0) < hs && Math.abs(ly - el.height / 2) < hs)
        return 'w';
      if (Math.abs(lx - el.width) < hs && Math.abs(ly - el.height / 2) < hs)
        return 'e';
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
        const el = page.elements.find(e => e.id === selectedId);
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

        // Cmd/Ctrl+Click for multi-selection
        if (e.metaKey || e.ctrlKey) {
          if (selectedIds.includes(el.id)) {
            // Deselect if already selected
            const newIds = selectedIds.filter(id => id !== el.id);
            dispatch({ type: 'SELECT_MULTIPLE', ids: newIds });
          } else {
            // Add to selection
            dispatch({ type: 'SELECT_MULTIPLE', ids: [...selectedIds, el.id] });
          }
          return;
        } else {
          // Single selection
          dispatch({ type: 'SELECT_ELEMENT', id: el.id });
        }

        // Store initial positions of all selected elements for multi-drag
        initialElementPositions.current.clear();
        const elementsToMove = selectedIds.includes(el.id) ? selectedIds : [el.id];
        elementsToMove.forEach(id => {
          const elem = page.elements.find(e => e.id === id);
          if (elem) {
            initialElementPositions.current.set(id, { x: elem.x, y: elem.y });
          }
        });

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
        // Clicking on empty space - start selection box drag
        selectionBox.current = {
          startX: mouse.x,
          startY: mouse.y,
          endX: mouse.x,
          endY: mouse.y,
        };
        dragInfo.current = {
          active: true,
          type: 'select',
          id: null,
          startX: mouse.x,
          startY: mouse.y,
          initialX: 0,
          initialY: 0,
          initialW: 0,
          initialH: 0,
          initialRot: 0,
        };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragInfo.current.active) return;

      if (dragInfo.current.type === 'pan') {
        const dx = e.clientX - dragInfo.current.startX;
        const dy = e.clientY - dragInfo.current.startY;
        dispatch({
          type: 'SET_PAN',
          pan: {
            x: dragInfo.current.initialX + dx,
            y: dragInfo.current.initialY + dy,
          },
        });
        return;
      }

      const mouse = toCanvasSpace(e);

      // Update selection box
      if (dragInfo.current.type === 'select' && selectionBox.current) {
        selectionBox.current.endX = mouse.x;
        selectionBox.current.endY = mouse.y;
        return;
      }
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

        // Move all selected elements together if multiple are selected
        if (initialElementPositions.current.size > 1) {
          const updates = Array.from(initialElementPositions.current.entries()).map(([elId, initialPos]) => ({
            id: elId,
            attrs: { x: initialPos.x + dx, y: initialPos.y + dy },
          }));

          dispatch({
            type: 'BATCH_UPDATE_ELEMENTS',
            updates,
          });
        } else {
          dispatch({
            type: 'UPDATE_ELEMENT',
            id: id!,
            attrs: { x: initialX + dx, y: initialY + dy },
          });
        }
      } else if (dragInfo.current.type === 'rotate') {
        const angle =
          (Math.atan2(mouse.y - centerY!, mouse.x - centerX!) * 180) / Math.PI;
        let newRot = angle + 90;
        if (e.shiftKey) newRot = Math.round(newRot / 45) * 45;
        dispatch({
          type: 'UPDATE_ELEMENT',
          id: id!,
          attrs: { rotation: newRot },
        });
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
      // Handle selection box completion
      if (dragInfo.current.type === 'select' && selectionBox.current && page) {
        const { startX, startY, endX, endY } = selectionBox.current;
        const boxX = Math.min(startX, endX);
        const boxY = Math.min(startY, endY);
        const boxW = Math.abs(endX - startX);
        const boxH = Math.abs(endY - startY);

        // Only select if there was actual dragging (not just a click)
        if (boxW > 5 || boxH > 5) {
          // Find all elements that intersect with the selection box
          const selectedElements = page.elements.filter(el => {
            // Simple bounding box intersection test
            const elRight = el.x + el.width;
            const elBottom = el.y + el.height;
            const boxRight = boxX + boxW;
            const boxBottom = boxY + boxH;

            return !(
              el.x > boxRight ||
              elRight < boxX ||
              el.y > boxBottom ||
              elBottom < boxY
            );
          });

          const selectedIds = selectedElements.map(el => el.id);
          dispatch({ type: 'SELECT_MULTIPLE', ids: selectedIds });
        } else {
          // Just a click, deselect all
          dispatch({ type: 'SELECT_ELEMENT', id: null });
        }

        selectionBox.current = null;
      }

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
  }, [page, selectedId, selectedIds, zoom, pan, isSpacePressed]);
};

export default useCanvasEngine;
