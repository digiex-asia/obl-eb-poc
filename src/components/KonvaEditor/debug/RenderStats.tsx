import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import EditorStore from '../../../common/stores/EditorStore';

interface RenderStatsProps {
    store: EditorStore;
    stageRef: React.RefObject<any>;
    viewportW: number;
    viewportH: number;
    scrollY: number;
}

const StatRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="flex justify-between py-1 border-b border-gray-800">
        <span className="text-gray-400">{label}</span>
        <span className="text-green-400 font-mono">{value}</span>
    </div>
);

export const RenderStats: React.FC<RenderStatsProps> = observer(
    ({ store, stageRef, viewportW, viewportH, scrollY }) => {
        const [nodeCount, setNodeCount] = useState(0);

        useEffect(() => {
            const updateNodeCount = () => {
                if (stageRef.current) {
                    const stage = stageRef.current;
                    // Count all nodes in the stage
                    const countNodes = (node: any): number => {
                        let count = 1;
                        const children = node.children || [];
                        for (const child of children) {
                            count += countNodes(child);
                        }
                        return count;
                    };
                    setNodeCount(countNodes(stage));
                }
            };

            updateNodeCount();
            const interval = setInterval(updateNodeCount, 1000);
            return () => clearInterval(interval);
        }, [stageRef]);

        const totalElements = store.rows.reduce((acc, row) => acc + row.elements.length, 0);
        const totalHeight = store.rows.reduce((acc, row) => acc + row.height, 0);

        return (
            <div className="p-3">
                {/* Canvas Stats */}
                <div className="mb-4">
                    <h3 className="text-amber-500 font-semibold mb-2 uppercase text-[10px] tracking-wider">
                        Canvas
                    </h3>
                    <StatRow label="Konva Nodes" value={nodeCount} />
                    <StatRow label="Rows" value={store.rows.length} />
                    <StatRow label="Elements" value={totalElements} />
                    <StatRow label="Total Height" value={`${totalHeight}px`} />
                </div>

                {/* View Stats */}
                <div className="mb-4">
                    <h3 className="text-cyan-500 font-semibold mb-2 uppercase text-[10px] tracking-wider">
                        Viewport
                    </h3>
                    <StatRow label="Zoom" value={`${Math.round(store.zoom * 100)}%`} />
                    <StatRow label="Width" value={`${viewportW}px`} />
                    <StatRow label="Height" value={`${viewportH}px`} />
                    <StatRow label="Scroll Y" value={`${Math.round(scrollY)}px`} />
                </div>

                {/* Selection Stats */}
                <div className="mb-4">
                    <h3 className="text-fuchsia-500 font-semibold mb-2 uppercase text-[10px] tracking-wider">
                        Selection
                    </h3>
                    <StatRow
                        label="Selected Row"
                        value={store.selectedRowId ? store.selectedRowId.slice(0, 8) : 'None'}
                    />
                    <StatRow
                        label="Selected Element"
                        value={store.selectedElementId ? store.selectedElementId.slice(0, 8) : 'None'}
                    />
                    <StatRow
                        label="Hovered Row"
                        value={store.hoveredRowId ? store.hoveredRowId.slice(0, 8) : 'None'}
                    />
                </div>

                {/* Memory (if available) */}
                {(performance as any).memory && (
                    <div className="mb-4">
                        <h3 className="text-orange-500 font-semibold mb-2 uppercase text-[10px] tracking-wider">
                            Memory
                        </h3>
                        <StatRow
                            label="Used Heap"
                            value={`${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB`}
                        />
                        <StatRow
                            label="Total Heap"
                            value={`${Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024)}MB`}
                        />
                    </div>
                )}
            </div>
        );
    }
);

