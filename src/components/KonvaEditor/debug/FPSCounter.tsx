import React, { useEffect, useRef, useState } from 'react';

interface FPSCounterProps {
    enabled: boolean;
}

export const FPSCounter: React.FC<FPSCounterProps> = ({ enabled }) => {
    const [fps, setFps] = useState(60);
    const frameCountRef = useRef(0);
    const lastTimeRef = useRef(performance.now());
    const rafIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            return;
        }

        const measureFPS = () => {
            frameCountRef.current++;
            const now = performance.now();
            const delta = now - lastTimeRef.current;

            if (delta >= 1000) {
                setFps(Math.round((frameCountRef.current * 1000) / delta));
                frameCountRef.current = 0;
                lastTimeRef.current = now;
            }

            rafIdRef.current = requestAnimationFrame(measureFPS);
        };

        rafIdRef.current = requestAnimationFrame(measureFPS);

        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, [enabled]);

    if (!enabled) return null;

    const getColor = () => {
        if (fps >= 50) return 'bg-green-500';
        if (fps >= 30) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div
            className={`absolute top-2 left-2 ${getColor()} text-white text-xs font-mono px-2 py-1 rounded shadow-lg z-50`}
        >
            {fps} FPS
        </div>
    );
};

