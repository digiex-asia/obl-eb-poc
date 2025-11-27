import React from 'react';
import { observer } from 'mobx-react-lite';
import { Group, Line } from 'react-konva';

interface GridOverlayProps {
    enabled: boolean;
    canvasWidth: number;
    canvasHeight: number;
    gridSpacing?: number;
    zoom: number;
}

export const GridOverlay: React.FC<GridOverlayProps> = observer(({
    enabled,
    canvasWidth,
    canvasHeight,
    gridSpacing = 50,
    zoom,
}) => {
    if (!enabled) return null;

    const lines: React.ReactNode[] = [];
    const minorColor = 'rgba(156, 163, 175, 0.3)';
    const majorColor = 'rgba(107, 114, 128, 0.5)';
    const strokeWidth = 1 / zoom;

    // Vertical lines
    for (let x = 0; x <= canvasWidth; x += gridSpacing / 2) {
        const isMajor = x % (gridSpacing * 2) === 0;
        lines.push(
            <Line
                key={`v-${x}`}
                points={[x, 0, x, canvasHeight]}
                stroke={isMajor ? majorColor : minorColor}
                strokeWidth={strokeWidth}
                listening={false}
            />
        );
    }

    // Horizontal lines
    for (let y = 0; y <= canvasHeight; y += gridSpacing / 2) {
        const isMajor = y % (gridSpacing * 2) === 0;
        lines.push(
            <Line
                key={`h-${y}`}
                points={[0, y, canvasWidth, y]}
                stroke={isMajor ? majorColor : minorColor}
                strokeWidth={strokeWidth}
                listening={false}
            />
        );
    }

    return <Group listening={false}>{lines}</Group>;
});

