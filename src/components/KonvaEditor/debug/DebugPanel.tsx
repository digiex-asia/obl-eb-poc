import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Database, Activity, List } from 'lucide-react';
import { InspectorTab } from './InspectorTab';
import { StoreViewerTab } from './StoreViewerTab';
import { RenderStats } from './RenderStats';
import { EventLoggerTab, DebugEvent } from './EventLoggerTab';
import EditorStore from '../../../common/stores/EditorStore';

type TabId = 'inspector' | 'store' | 'stats' | 'events';

interface DebugPanelProps {
    enabled: boolean;
    store: EditorStore;
    stageRef: React.RefObject<any>;
    viewportW: number;
    viewportH: number;
    scrollY: number;
    events: DebugEvent[];
    onClearEvents: () => void;
    // Debug options
    showBoundingBoxes: boolean;
    onToggleBoundingBoxes: () => void;
    showGrid: boolean;
    onToggleGrid: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
    enabled,
    store,
    stageRef,
    viewportW,
    viewportH,
    scrollY,
    events,
    onClearEvents,
    showBoundingBoxes,
    onToggleBoundingBoxes,
    showGrid,
    onToggleGrid,
}) => {
    const [collapsed, setCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('inspector');

    if (!enabled) return null;

    const tabs: { id: TabId; icon: React.ReactNode; label: string }[] = [
        { id: 'inspector', icon: <Info size={14} />, label: 'Inspector' },
        { id: 'store', icon: <Database size={14} />, label: 'Store' },
        { id: 'stats', icon: <Activity size={14} />, label: 'Stats' },
        { id: 'events', icon: <List size={14} />, label: 'Events' },
    ];

    // TopBar height (48px) + Ruler height (24px) = 72px
    const topOffset = 48 + 86;

    return (
        <div
            className={`fixed right-0 bottom-0 bg-gray-900 text-white text-xs transition-all flex ${
                collapsed ? 'w-8' : 'w-72'
            }`}
            style={{ top: topOffset, zIndex: 90 }}
        >
            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-gray-900 text-white p-1 rounded-l hover:bg-gray-800"
                style={{ zIndex: 90 }}
            >
                {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>

            {!collapsed && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-700">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-gray-800 text-white border-b-2 border-amber-500'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                                title={tab.label}
                            >
                                {tab.icon}
                            </button>
                        ))}
                    </div>

                    {/* Debug Options */}
                    <div className="p-2 border-b border-gray-700 flex gap-2">
                        <button
                            onClick={onToggleBoundingBoxes}
                            className={`px-2 py-1 rounded text-xs ${
                                showBoundingBoxes
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            Boxes
                        </button>
                        <button
                            onClick={onToggleGrid}
                            className={`px-2 py-1 rounded text-xs ${
                                showGrid
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            Grid
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-auto">
                        {activeTab === 'inspector' && <InspectorTab store={store} />}
                        {activeTab === 'store' && <StoreViewerTab store={store} />}
                        {activeTab === 'stats' && (
                            <RenderStats
                                store={store}
                                stageRef={stageRef}
                                viewportW={viewportW}
                                viewportH={viewportH}
                                scrollY={scrollY}
                            />
                        )}
                        {activeTab === 'events' && (
                            <EventLoggerTab events={events} onClear={onClearEvents} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
