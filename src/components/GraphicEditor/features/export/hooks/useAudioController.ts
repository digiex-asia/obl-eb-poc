import { useEffect, useRef } from 'react';
import type { AudioLayer } from '../../../shared/model/types';

const useAudioController = (
  layers: AudioLayer[],
  isPlaying: boolean,
  currentTime: number
) => {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const lastTimeRef = useRef(currentTime);

  useEffect(() => {
    layers.forEach(layer => {
      layer.clips.forEach(clip => {
        let audio = audioRefs.current.get(clip.id);
        if (!audio) {
          audio = new Audio(clip.src);
          audioRefs.current.set(clip.id, audio);
        }
        const clipTime = currentTime - clip.startAt + clip.offset; // Adjusted for offset
        const inRange =
          currentTime >= clip.startAt &&
          currentTime < clip.startAt + clip.duration;

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
    const activeIds = new Set(layers.flatMap(l => l.clips.map(c => c.id)));
    audioRefs.current.forEach((audio, id) => {
      if (!activeIds.has(id)) {
        audio.pause();
        audioRefs.current.delete(id);
      }
    });
  }, [layers, isPlaying, currentTime]);

  useEffect(() => {
    if (Math.abs(currentTime - lastTimeRef.current) > 0.5) {
      audioRefs.current.forEach(a => a.pause());
    }
    lastTimeRef.current = currentTime;
  }, [currentTime]);
};

export default useAudioController;
