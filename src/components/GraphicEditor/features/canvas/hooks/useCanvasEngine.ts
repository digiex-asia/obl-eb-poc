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
import { useTransientState } from './useTransientState';
import {
  buildSnapTargets,
  calculateGroupSnap,
} from '../lib/snapping';
import { TextLayoutEngine } from '../../richtext/textLayoutEngine';

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
    type: 'move' | 'resize' | 'rotate' | 'pan' | 'select-box';
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
    initialContentW?: number;
    initialContentH?: number;
    boxStartX?: number;
    boxStartY?: number;
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

  // Transient state for lag-free dragging
  const { setTransient, getElement, commitTransients, clearTransients } =
    useTransientState();

  // Snap guides for alignment
  const activeSnapGuides = useRef<{ x: number[]; y: number[] }>({
    x: [],
    y: [],
  });

  // Mouse position for marquee rendering
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

      // Show page animation at current time (even when scrubbing)
      if (page.animation && page.animation.type !== 'none') {
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

      // Render snap guides (pink dashed lines)
      if (
        activeSnapGuides.current.x.length > 0 ||
        activeSnapGuides.current.y.length > 0
      ) {
        ctx.strokeStyle = '#ec4899'; // Pink
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);

        // Vertical guides
        activeSnapGuides.current.x.forEach(x => {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();
        });

        // Horizontal guides
        activeSnapGuides.current.y.forEach(y => {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_WIDTH, y);
          ctx.stroke();
        });

        ctx.setLineDash([]); // Reset
      }

      // Render Elements (with transient state merged)
      page.elements.forEach(baseEl => {
        const el = getElement(baseEl); // Merge transient updates
        ctx.save();

        let animOpacity = el.opacity;
        let animY = el.y;
        let animX = el.x;
        let animScale = 1;
        let animRot = el.rotation;

        const isPreview = previewAnimation && previewAnimation.id === el.id;

        // Show element animation at current time (even when scrubbing)
        const anim = isPreview
          ? { ...el.animation, type: previewAnimation.type }
          : el.animation;

        if (anim && anim.type !== 'none') {
          // Use localTime for timeline scrubbing, preview for hover
          let t = isPreview
            ? (Date.now() % 2000) / 1000
            : Math.max(0, localTime - (anim.delay || 0));
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
          } else if ((anim.delay || 0) > 0) {
            // Hide element before its animation starts
            animOpacity = 0;
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
            // Use contentWidth/Height for zoom/crop effect
            const contentW = el.contentWidth || el.width;
            const contentH = el.contentHeight || el.height;

            // If content is larger than frame, center and clip
            if (contentW > el.width || contentH > el.height) {
              const offsetX = (el.width - contentW) / 2;
              const offsetY = (el.height - contentH) / 2;

              // Clip to visible bounds
              ctx.save();
              ctx.beginPath();
              ctx.rect(0, 0, el.width, el.height);
              ctx.clip();

              // Draw image with content dimensions, centered
              ctx.drawImage(img, offsetX, offsetY, contentW, contentH);
              ctx.restore();
            } else {
              // Normal rendering when content fits or equals frame
              ctx.drawImage(img, 0, 0, contentW, contentH);
            }
          } else {
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(0, 0, el.width, el.height);
          }
        } else if (el.type === 'text') {
          // Rich text rendering
          if (el.valueList && el.valueList.length > 0) {
            const layout = TextLayoutEngine.calculateLayout(ctx, el.valueList, el.width, {
              align: el.align || 'left',
              lineHeight: el.lineHeight || 1.2,
              letterSpacing: el.letterSpacing || 0,
            });

            // Cache layout for later use
            (el as any)._layout = layout;
            (el as any)._renderHeight = layout.totalHeight;

            // Apply vertical alignment
            let startY = 0;
            if (el.verticalAlign === 'middle') {
              startY = (el.height - layout.totalHeight) / 2;
            } else if (el.verticalAlign === 'bottom') {
              startY = el.height - layout.totalHeight;
            }

            ctx.save();
            ctx.translate(0, startY);

            // Draw backgrounds
            layout.backgrounds.forEach(bg => {
              ctx.fillStyle = bg.fill;
              ctx.fillRect(bg.x, bg.y, bg.width, bg.height);
            });

            // Draw text characters
            layout.charPositions.forEach(charPos => {
              const style = charPos.style;
              const fontStyle = style.isItalic ? 'italic' : 'normal';
              const fontWeight = style.isBold ? 'bold' : 'normal';
              ctx.font = `${fontStyle} ${fontWeight} ${style.fontSize}px ${style.fontFamily || 'Arial'}`;
              ctx.fillStyle = style.fill || '#000000';
              ctx.fillText(charPos.char, charPos.x, charPos.y + charPos.fontSize * 0.9);
            });

            // Draw decorations (underline, strikethrough)
            layout.decorations.forEach(dec => {
              ctx.beginPath();
              ctx.strokeStyle = dec.color;
              ctx.lineWidth = Math.max(1, dec.fontSize / 15);

              if (dec.type === 'underline') {
                const y = dec.y + dec.fontSize * 1.05;
                ctx.moveTo(dec.x, y);
                ctx.lineTo(dec.x + dec.width, y);
              } else if (dec.type === 'line-through') {
                const y = dec.y + dec.fontSize * 0.6;
                ctx.moveTo(dec.x, y);
                ctx.lineTo(dec.x + dec.width, y);
              }
              ctx.stroke();
            });

            ctx.restore();
          } else if (el.text) {
            // Fallback to simple text rendering
            ctx.fillStyle = el.fill;
            ctx.font = `${el.fontSize}px sans-serif`;
            ctx.textBaseline = 'top';
            ctx.fillText(el.text, 0, 0);
          }
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
        const isSelected = selectedIds.includes(el.id);
        if (isSelected && !isPlaying && !isPreview) {
          ctx.strokeStyle = SELECTION_COLOR;
          ctx.lineWidth = 1.5 / zoom;
          ctx.strokeRect(0, 0, el.width, el.height);

          // Only show handles for single selection
          if (el.id === selectedId && selectedIds.length === 1) {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = SELECTION_COLOR;
            const hs = HANDLE_SIZE / zoom;
            const hhs = hs / 2; // Half handle size

            // Circle handles for corners (visual cue for aspect-locked resize)
            const drawCircleHandle = (hx: number, hy: number) => {
              ctx.beginPath();
              ctx.arc(hx, hy, hhs, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            };

            // Pill handles for edges (visual cue for single-axis resize)
            const drawPillHandle = (
              hx: number,
              hy: number,
              horizontal: boolean
            ) => {
              ctx.beginPath();
              if (horizontal) {
                ctx.roundRect(hx - hs, hy - hhs / 2, hs * 2, hhs, hhs / 2);
              } else {
                ctx.roundRect(hx - hhs / 2, hy - hs, hhs, hs * 2, hhs / 2);
              }
              ctx.fill();
              ctx.stroke();
            };

            // Corner handles (circles) - aspect locked
            drawCircleHandle(0, 0); // nw
            drawCircleHandle(el.width, 0); // ne
            drawCircleHandle(el.width, el.height); // se
            drawCircleHandle(0, el.height); // sw

            // Edge handles (pills) - single axis
            drawPillHandle(el.width / 2, 0, true); // n (horizontal pill)
            drawPillHandle(el.width, el.height / 2, false); // e (vertical pill)
            drawPillHandle(el.width / 2, el.height, true); // s (horizontal pill)
            drawPillHandle(0, el.height / 2, false); // w (vertical pill)

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

            // Rotation degree indicator during rotation
            if (dragInfo.current.type === 'rotate') {
              const degText = `${Math.round(el.rotation)}°`;
              ctx.font = `${12 / zoom}px sans-serif`;
              const textWidth = ctx.measureText(degText).width;
              const pad = 6 / zoom;

              ctx.save();
              ctx.translate(el.width / 2, -ROTATE_HANDLE_OFFSET / zoom - 25 / zoom);
              ctx.rotate((-el.rotation * Math.PI) / 180);

              ctx.fillStyle = SELECTION_COLOR;
              ctx.beginPath();
              ctx.roundRect(
                -textWidth / 2 - pad,
                -10 / zoom,
                textWidth + pad * 2,
                20 / zoom,
                4 / zoom
              );
              ctx.fill();

              ctx.fillStyle = 'white';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(degText, 0, 0);
              ctx.restore();
            }
          }
        }

        ctx.restore();
      });

      // Draw multi-selection group bounds and handles
      if (selectedIds.length > 1 && !isPlaying) {
        const selectedElements = page.elements.filter(e => selectedIds.includes(e.id));
        if (selectedElements.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          selectedElements.forEach(el => {
            const actualEl = getElement(el);
            minX = Math.min(minX, actualEl.x);
            minY = Math.min(minY, actualEl.y);
            maxX = Math.max(maxX, actualEl.x + actualEl.width);
            maxY = Math.max(maxY, actualEl.y + actualEl.height);
          });

          const bw = maxX - minX;
          const bh = maxY - minY;

          ctx.save();
          ctx.strokeStyle = SELECTION_COLOR;
          ctx.lineWidth = 2 / zoom;
          ctx.strokeRect(minX, minY, bw, bh);

          // Draw resize handles on group bounds
          ctx.fillStyle = 'white';
          ctx.strokeStyle = SELECTION_COLOR;
          const hs = HANDLE_SIZE / zoom;
          const hhs = hs / 2;

          const drawHandle = (hx: number, hy: number) => {
            ctx.beginPath();
            ctx.arc(hx, hy, hhs, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          };

          // Corner handles for group resize
          drawHandle(minX, minY); // nw
          drawHandle(maxX, minY); // ne
          drawHandle(maxX, maxY); // se
          drawHandle(minX, maxY); // sw
          drawHandle(minX + bw / 2, minY); // n
          drawHandle(maxX, minY + bh / 2); // e
          drawHandle(minX + bw / 2, maxY); // s
          drawHandle(minX, minY + bh / 2); // w

          ctx.restore();
        }
      }

      // Draw drag selection marquee
      if (
        dragInfo.current.type === 'select-box' &&
        dragInfo.current.active &&
        dragInfo.current.boxStartX !== undefined
      ) {
        const { boxStartX, boxStartY } = dragInfo.current;
        const canvas = canvasRef.current!;
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

        const minX = Math.min(boxStartX!, mx);
        const minY = Math.min(boxStartY!, my);
        const width = Math.abs(mx - boxStartX!);
        const height = Math.abs(my - boxStartY!);

        ctx.fillRect(minX, minY, width, height);
        ctx.strokeRect(minX, minY, width, height);
        ctx.restore();
      }

      ctx.restore();
      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [page, selectedId, selectedIds, isPlaying, currentTime, zoom, pan, previewAnimation]);

  // Clear transient state when selection, page, or playback changes
  useEffect(() => {
    clearTransients();
  }, [selectedId, selectedIds, page?.id, isPlaying]);

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

    const getGroupHandleUnderMouse = (mouse: { x: number; y: number }) => {
      if (selectedIds.length <= 1 || !page) return null;
      const selectedElements = page.elements.filter(e => selectedIds.includes(e.id));
      if (selectedElements.length === 0) return null;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selectedElements.forEach(el => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
      });

      const bw = maxX - minX;
      const bh = maxY - minY;
      const hs = (HANDLE_SIZE / zoom) * 1.5;

      // Check all 8 handles
      if (Math.abs(mouse.x - minX) < hs && Math.abs(mouse.y - minY) < hs) return 'nw';
      if (Math.abs(mouse.x - maxX) < hs && Math.abs(mouse.y - minY) < hs) return 'ne';
      if (Math.abs(mouse.x - maxX) < hs && Math.abs(mouse.y - maxY) < hs) return 'se';
      if (Math.abs(mouse.x - minX) < hs && Math.abs(mouse.y - maxY) < hs) return 'sw';
      if (Math.abs(mouse.x - (minX + bw / 2)) < hs && Math.abs(mouse.y - minY) < hs) return 'n';
      if (Math.abs(mouse.x - maxX) < hs && Math.abs(mouse.y - (minY + bh / 2)) < hs) return 'e';
      if (Math.abs(mouse.x - (minX + bw / 2)) < hs && Math.abs(mouse.y - maxY) < hs) return 's';
      if (Math.abs(mouse.x - minX) < hs && Math.abs(mouse.y - (minY + bh / 2)) < hs) return 'w';
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

      // Check for group resize handles first (multi-selection)
      const groupHandle = getGroupHandleUnderMouse(mouse);
      if (groupHandle) {
        // --- HISTORY CAPTURE: START OF INTERACTION ---
        dispatch({ type: 'CAPTURE_CHECKPOINT' });

        dragInfo.current = {
          active: true,
          type: 'resize',
          handle: groupHandle,
          id: null, // null indicates group resize
          startX: mouse.x,
          startY: mouse.y,
          initialX: 0,
          initialY: 0,
          initialW: 0,
          initialH: 0,
          initialRot: 0,
        };
        return;
      }

      // Check for single element handles
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
              initialContentW: el.contentWidth || el.width,
              initialContentH: el.contentHeight || el.height,
            };
            return;
          }
        }
      }

      const el = getElementUnderMouse(mouse.x, mouse.y);
      if (el) {
        // --- HISTORY CAPTURE: START OF INTERACTION ---
        dispatch({ type: 'CAPTURE_CHECKPOINT' });

        // Only change selection if element is not already selected
        // This allows dragging multiple selected elements
        if (!selectedIds.includes(el.id)) {
          dispatch({ type: 'SELECT_ELEMENT', id: el.id });
        }

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
        // Start drag selection on empty canvas
        dispatch({ type: 'SELECT_ELEMENT', id: null });
        // Hide sidebar panels when clicking on empty canvas
        dispatch({ type: 'SET_TAB', tab: 'blocks' });
        dragInfo.current = {
          active: true,
          type: 'select-box',
          id: null,
          startX: e.clientX,
          startY: e.clientY,
          boxStartX: mouse.x,
          boxStartY: mouse.y,
          initialX: 0,
          initialY: 0,
          initialW: 0,
          initialH: 0,
          initialRot: 0,
        };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Track mouse position for marquee rendering
      mousePosRef.current = { x: e.clientX, y: e.clientY };

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
        let dx = mouse.x - startX;
        let dy = mouse.y - startY;

        // Apply snapping if page exists
        if (page) {
          const selectedElements = page.elements.filter(e => selectedIds.includes(e.id));
          if (selectedElements.length > 0) {
            const snapTargets = buildSnapTargets(page.elements, selectedIds);
            const snap = calculateGroupSnap(
              selectedElements,
              dx,
              dy,
              snapTargets.x,
              snapTargets.y
            );
            dx = snap.dx;
            dy = snap.dy;
            activeSnapGuides.current = {
              x: snap.guidesX,
              y: snap.guidesY,
            };
          }
        }

        // Move all selected elements together using transient state
        selectedIds.forEach(selectedId => {
          const el = page?.elements.find(e => e.id === selectedId);
          if (el) {
            setTransient(selectedId, { x: el.x + dx, y: el.y + dy });
          }
        });
      } else if (dragInfo.current.type === 'rotate') {
        const angle =
          (Math.atan2(mouse.y - centerY!, mouse.x - centerX!) * 180) / Math.PI;
        let newRot = angle + 90;
        if (e.shiftKey) newRot = Math.round(newRot / 45) * 45;
        // Use transient state for smooth rotation (no Redux dispatch)
        setTransient(id!, { rotation: newRot });
      } else if (dragInfo.current.type === 'resize') {
        // Group resize (when id is null)
        if (id === null && selectedIds.length > 1 && page) {
          const selectedElements = page.elements.filter(e => selectedIds.includes(e.id));
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          selectedElements.forEach(el => {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
            maxX = Math.max(maxX, el.x + el.width);
            maxY = Math.max(maxY, el.y + el.height);
          });

          const dxGlobal = mouse.x - startX;
          const dyGlobal = mouse.y - startY;
          let dx = dxGlobal;
          let dy = dyGlobal;

          const isCorner = handle?.length === 2;
          const oldBoundsW = maxX - minX;
          const oldBoundsH = maxY - minY;

          let changeX = 0, changeY = 0, changeW = 0, changeH = 0;
          if (handle?.includes('e')) changeW = dx;
          if (handle?.includes('w')) { changeW = -dx; changeX = dx; }
          if (handle?.includes('s')) changeH = dy;
          if (handle?.includes('n')) { changeH = -dy; changeY = dy; }

          // Apply aspect ratio lock for corners
          if (isCorner) {
            const aspect = oldBoundsW / oldBoundsH;
            if (Math.abs(changeW) > Math.abs(changeH)) changeH = changeW / aspect;
            else changeW = changeH * aspect;
            if (handle?.includes('w')) changeX = -changeW;
            if (handle?.includes('n')) changeY = -changeH;
          }

          const scaleX = (oldBoundsW + changeW) / oldBoundsW;
          const scaleY = (oldBoundsH + changeH) / oldBoundsH;

          // Apply transformation to all selected elements
          selectedElements.forEach(el => {
            const relX = el.x - minX;
            const relY = el.y - minY;
            const nextX = minX + changeX + relX * scaleX;
            const nextY = minY + changeY + relY * scaleY;
            const nextW = el.width * scaleX;
            const nextH = el.height * scaleY;

            setTransient(el.id, {
              x: nextX,
              y: nextY,
              width: Math.max(10, nextW),
              height: Math.max(10, nextH),
            });
          });
          return;
        }

        // Single element resize
        const angleRad = (initialRot * Math.PI) / 180;
        const cos = Math.cos(-angleRad);
        const sin = Math.sin(-angleRad);
        const dxGlobal = mouse.x - startX;
        const dyGlobal = mouse.y - startY;

        // Figma-style resizing
        const isCorner = handle && handle.length === 2; // nw, ne, se, sw
        const keepAspect = isCorner || e.shiftKey; // Auto-lock for corners, Shift for edges
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

        // Apply aspect ratio lock for corners (or Shift+edge)
        if (keepAspect) {
          const ratio = initialW / initialH;
          if (Math.abs(changeW) > Math.abs(changeH)) {
            changeH = changeW / ratio;
            // Adjust Y if pulling from top
            if (handle?.includes('n')) changeY = (-changeW / ratio) * -1;
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

        // Calculate content width/height for images
        const { initialContentW, initialContentH } = dragInfo.current;
        const currentElement = page?.elements.find(e => e.id === id);
        let newContentW: number | undefined;
        let newContentH: number | undefined;

        if (currentElement?.type === 'image' && initialContentW && initialContentH) {
          if (isCorner) {
            // Corner resize: scale content proportionally with frame
            const scaleX = newW / initialW;
            const scaleY = newH / initialH;
            const scale = keepAspect ? scaleX : Math.min(scaleX, scaleY);
            newContentW = initialContentW * scale;
            newContentH = initialContentH * scale;
          } else {
            // Edge resize: keep content size fixed for zoom effect
            // Maintain content aspect ratio based on which dimension is being changed
            if (handle?.includes('e') || handle?.includes('w')) {
              // Horizontal edge: scale content to maintain aspect
              const contentAspect = initialContentW / initialContentH;
              newContentW = Math.max(initialContentW, newW);
              newContentH = newContentW / contentAspect;
            } else if (handle?.includes('n') || handle?.includes('s')) {
              // Vertical edge: scale content to maintain aspect
              const contentAspect = initialContentW / initialContentH;
              newContentH = Math.max(initialContentH, newH);
              newContentW = newContentH * contentAspect;
            }
          }
        }

        // Use transient state for smooth resizing (no Redux dispatch)
        const updates: Partial<DesignElement> = {
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        };
        if (newContentW !== undefined) updates.contentWidth = newContentW;
        if (newContentH !== undefined) updates.contentHeight = newContentH;
        setTransient(id!, updates);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Handle select-box completion
      if (dragInfo.current.active && dragInfo.current.type === 'select-box' && page) {
        const mouse = toCanvasSpace(e);
        const sx = dragInfo.current.boxStartX!;
        const sy = dragInfo.current.boxStartY!;
        const minX = Math.min(sx, mouse.x);
        const maxX = Math.max(sx, mouse.x);
        const minY = Math.min(sy, mouse.y);
        const maxY = Math.max(sy, mouse.y);

        // Find all elements within the selection box
        const selectedIds = page.elements
          .filter(el => {
            const elLeft = el.x;
            const elRight = el.x + el.width;
            const elTop = el.y;
            const elBottom = el.y + el.height;
            // Check if element is fully or partially within selection box
            return (
              elRight > minX &&
              elLeft < maxX &&
              elBottom > minY &&
              elTop < maxY
            );
          })
          .map(el => el.id);

        dispatch({ type: 'SELECT_MULTIPLE', ids: selectedIds });
      }

      // Commit transient state to Redux before clearing drag
      if (
        dragInfo.current.active &&
        (dragInfo.current.type === 'move' ||
          dragInfo.current.type === 'resize' ||
          dragInfo.current.type === 'rotate')
      ) {
        commitTransients(dispatch);
      }
      // Clear snap guides
      activeSnapGuides.current = { x: [], y: [] };
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
