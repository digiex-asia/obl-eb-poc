import { useRef, useState, useEffect } from 'react';
import type { Page } from '../shared/model/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../shared/lib/constants';

const PageThumbnail = ({
  page,
  width,
  height,
}: {
  page: Page;
  width: number;
  height: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [tick, setTick] = useState(0);

  const getImg = (src: string) => {
    if (imageCache.current.has(src)) return imageCache.current.get(src)!;
    const img = new Image();
    img.src = src;
    img.crossOrigin = 'Anonymous';
    img.onload = () => setTick(t => t + 1); // trigger re-render
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

    page.elements.forEach(el => {
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

export default PageThumbnail;
