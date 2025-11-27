import React, { useEffect, useState, useRef, ReactNode } from 'react';
import { Rect, Group } from 'react-konva';
import Konva from 'konva';

// Random color generator to distinguish different renders
const getRandomColor = (): string => {
    return `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0')}`;
};

interface DebugHighlighterProps {
    children: ReactNode;
    isEnabled?: boolean;
}

/**
 * DebugHighlighter
 * Wrap this component around any Konva Node you want to monitor.
 * It will flash a colored border whenever props or state change (re-render).
 */
export const DebugHighlighter: React.FC<DebugHighlighterProps> = ({
    children,
    isEnabled = true,
}) => {
    const [debugColor, setDebugColor] = useState('transparent');
    const [bounds, setBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const groupRef = useRef<Konva.Group>(null);

    // Use ref to get actual dimensions of children after render
    useEffect(() => {
        if (!isEnabled || !groupRef.current) return;

        // Use requestAnimationFrame to ensure children are rendered
        const rafId = requestAnimationFrame(() => {
            const node = groupRef.current;
            if (!node || typeof node.getClientRect !== 'function') return;

            // Get bounding client rect of the group
            const box = node.getClientRect({ skipTransform: true });

            setBounds({
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
            });

            // Flash color
            const color = getRandomColor();
            setDebugColor(color);
        });

        // Clear color after 300ms
        const timer = setTimeout(() => {
            setDebugColor('transparent');
        }, 300);

        return () => {
            cancelAnimationFrame(rafId);
            clearTimeout(timer);
        };
    }, [children, isEnabled]); // Re-run whenever children change (re-render)

    if (!isEnabled) return <>{children}</>;

    return (
        <Group ref={groupRef}>
            {children}
            {/* Debug overlay border */}
            {debugColor !== 'transparent' && (
                <Rect
                    x={bounds.x}
                    y={bounds.y}
                    width={bounds.width}
                    height={bounds.height}
                    stroke={debugColor}
                    strokeWidth={4}
                    listening={false} // Don't block mouse events
                    perfectDrawEnabled={false} // Optimize performance for debug
                />
            )}
        </Group>
    );
};
