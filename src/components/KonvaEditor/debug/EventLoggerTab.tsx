import React, { useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

export interface DebugEvent {
    id: number;
    timestamp: number;
    type: string;
    x?: number;
    y?: number;
    target?: string;
    details?: string;
}

interface EventLoggerTabProps {
    events: DebugEvent[];
    onClear: () => void;
}

const getEventColor = (type: string): string => {
    switch (type) {
        case 'click':
            return 'text-green-400';
        case 'dragstart':
            return 'text-blue-400';
        case 'dragmove':
            return 'text-blue-300';
        case 'dragend':
            return 'text-blue-500';
        case 'mouseenter':
            return 'text-yellow-400';
        case 'mouseleave':
            return 'text-yellow-600';
        case 'wheel':
            return 'text-purple-400';
        case 'resize':
            return 'text-orange-400';
        default:
            return 'text-gray-400';
    }
};

const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
};

export const EventLoggerTab: React.FC<EventLoggerTabProps> = ({ events, onClear }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new events are added
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [events.length]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-gray-800">
                <span className="text-gray-400 text-[10px]">
                    {events.length} events (max 100)
                </span>
                <button
                    onClick={onClear}
                    className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 transition-colors"
                    title="Clear events"
                >
                    <Trash2 size={12} />
                </button>
            </div>

            {/* Event List */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto p-2 font-mono text-[10px] space-y-0.5"
            >
                {events.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                        No events yet. Interact with the canvas to see events.
                    </div>
                ) : (
                    events.map((event) => (
                        <div
                            key={event.id}
                            className="flex items-start gap-2 py-0.5 hover:bg-gray-800 rounded px-1"
                        >
                            <span className="text-gray-600 shrink-0">
                                {formatTime(event.timestamp)}
                            </span>
                            <span className={`shrink-0 w-16 ${getEventColor(event.type)}`}>
                                {event.type}
                            </span>
                            {event.x !== undefined && event.y !== undefined && (
                                <span className="text-gray-500 shrink-0">
                                    ({Math.round(event.x)}, {Math.round(event.y)})
                                </span>
                            )}
                            {event.target && (
                                <span className="text-cyan-400 truncate">{event.target}</span>
                            )}
                            {event.details && (
                                <span className="text-gray-500 truncate">{event.details}</span>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Legend */}
            <div className="p-2 border-t border-gray-800 flex flex-wrap gap-2 text-[9px]">
                <span className="text-green-400">● click</span>
                <span className="text-blue-400">● drag</span>
                <span className="text-yellow-400">● hover</span>
                <span className="text-purple-400">● wheel</span>
            </div>
        </div>
    );
};

