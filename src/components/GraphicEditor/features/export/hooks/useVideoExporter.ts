import { useEffect, useRef } from 'react';
import type { Page, AudioLayer } from '../../../shared/model/types';
import type { Action } from '../../../shared/model/store';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../shared/lib/constants';

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
      workerRef.current.postMessage({ type: 'init', canvas: offscreen }, [
        offscreen,
      ]);
    } catch (e) {
      console.error('OffscreenCanvas not supported or already transferred', e);
    }

    workerRef.current.onmessage = e => {
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
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
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
                .then(res => res.arrayBuffer())
                .then(buffer => audioContext.decodeAudioData(buffer))
                .then(audioBuffer => {
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
                .catch(err =>
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

    const mimeType = MediaRecorder.isTypeSupported(
      'video/mp4; codecs="avc1.424028, mp4a.40.2"'
    )
      ? 'video/mp4; codecs="avc1.424028, mp4a.40.2"'
      : 'video/webm;codecs=vp9';

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 5000000,
    });
    recorderRef.current = recorder;

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeType.split(';')[0],
      });
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

export default useVideoExporter;
