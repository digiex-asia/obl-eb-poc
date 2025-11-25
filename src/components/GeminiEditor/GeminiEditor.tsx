import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Rect, Text, Group, Transformer } from "react-konva";
import { makeAutoObservable } from "mobx";
import { observer } from "mobx-react-lite";
import {
  Layout,
  Type,
  Image as ImageIcon,
  MousePointer2,
  Zap,
  Turtle,
  Grid,
  Trash2
} from "lucide-react";

/**
 * ------------------------------------------------------------------
 * 1. MOBX STORE (Simplified Logic)
 * ------------------------------------------------------------------
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

class ElementStore {
  id;
  type;
  x;
  y;
  width;
  height;
  fill;
  text;

  constructor(data) {
    this.id = data.id || generateId();
    this.type = data.type;
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.width = data.width || 100;
    this.height = data.height || 100;
    this.fill = data.fill || "#e2e8f0";
    this.text = data.text || "";
    makeAutoObservable(this);
  }

  update(attrs) {
    Object.assign(this, attrs);
  }
}

class EmailPageStore {
  elements = [];
  selectedIds = [];
  width = 800;
  height = 800;

  constructor() {
    makeAutoObservable(this);
  }

  addElement(element) {
    this.elements.push(new ElementStore(element));
  }

  updateElement(id, attrs) {
    const el = this.elements.find((e) => e.id === id);
    if (el) {
      el.update(attrs);
    }
  }

  removeElement(id) {
    this.elements = this.elements.filter(e => e.id !== id);
    this.selectedIds = this.selectedIds.filter(sid => sid !== id);
  }

  setSelected(id) {
    this.selectedIds = id ? [id] : [];
  }
}

class UIStore {
  // 'slow' = Sync State on DragMove (React Render Cycle)
  // 'fast' = Sync State on DragEnd (Konva Native Cycle)
  performanceMode = 'fast';
  page = new EmailPageStore();

  constructor() {
    makeAutoObservable(this);
  }

  togglePerformanceMode() {
    this.performanceMode = this.performanceMode === 'fast' ? 'slow' : 'fast';
  }

  addBlockAt(type, x, y) {
    const defaults = {
      box: { width: 100, height: 100, fill: '#bfdbfe', text: 'Container' },
      text: { width: 200, height: 40, fill: 'transparent', text: 'Double click to edit' },
      image: { width: 150, height: 100, fill: '#e2e8f0', text: 'Image Block' },
      button: { width: 120, height: 40, fill: '#3b82f6', text: 'Button' },
    };

    this.page.addElement({
      type,
      x,
      y,
      ...defaults[type]
    });
  }
}

const store = new UIStore();

/**
 * ------------------------------------------------------------------
 * 2. CANVAS ELEMENT COMPONENT (The Core Performance Logic)
 * ------------------------------------------------------------------
 */
const CanvasElement = observer(({ element, isSelected, onSelect }) => {
  const shapeRef = useRef(null);
  const trRef = useRef(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // --- CRITICAL PERFORMANCE SECTION ---

  const handleDragMove = (e) => {
    if (store.performanceMode === 'slow') {
      // SLOW MODE: We force a MobX update on every pixel move.
      // This triggers React Reconciliation -> Virtual DOM Diff -> Component Re-render.
      // In complex apps with many layers, this causes lag/jank.
      element.update({
        x: e.target.x(),
        y: e.target.y(),
      });

      // Simulate heavy app logic (e.g., collision detection, guidelines calculation)
      // to make the "Slow" mode perceptible in this simple demo.
      const start = performance.now();
      while (performance.now() - start < 2) {}
    }
    // FAST MODE: We do NOTHING here.
    // Konva updates the canvas bitmap natively without React knowing.
  };

  const handleDragEnd = (e) => {
    // FAST MODE: We only sync to MobX once at the end.
    // React only re-renders once.
    element.update({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  // ------------------------------------

  return (
    <>
      <Group
        ref={shapeRef}
        x={element.x}
        y={element.y}
        draggable
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(element.id);
        }}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        {element.type === 'button' ? (
           <Rect
             width={element.width}
             height={element.height}
             fill={element.fill}
             cornerRadius={6}
             shadowBlur={10}
             shadowColor="rgba(59, 130, 246, 0.3)"
            />
        ) : (
           <Rect
             width={element.width}
             height={element.height}
             fill={element.fill}
             stroke={isSelected ? "#3b82f6" : "#cbd5e1"}
             strokeWidth={isSelected ? 2 : 1}
             cornerRadius={2}
           />
        )}

        <Text
          text={element.text}
          width={element.width}
          height={element.height}
          align="center"
          verticalAlign="middle"
          fontSize={14}
          fontFamily="sans-serif"
          fill={element.type === 'button' ? 'white' : '#4b5563'}
          listening={false}
        />
      </Group>

      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 30 || newBox.height < 30) {
              return oldBox;
            }
            return newBox;
          }}
          onTransformEnd={() => {
            const node = shapeRef.current;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            node.scaleX(1);
            node.scaleY(1);
            element.update({
              x: node.x(),
              y: node.y(),
              width: Math.max(5, node.width() * scaleX),
              height: Math.max(5, node.height() * scaleY),
            });
          }}
        />
      )}
    </>
  );
});

/**
 * ------------------------------------------------------------------
 * 3. CANVAS AREA
 * ------------------------------------------------------------------
 */
const EditorCanvas = observer(() => {
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const { page } = store;

  // HTML5 Drop Handler (Sidebar -> Canvas)
  const handleDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    if (!type) return;

    if (stageRef.current) {
      stageRef.current.setPointersPositions(e);
      const pointerPosition = stageRef.current.getPointerPosition();
      if (pointerPosition) {
        // Adjust for stage container offset if necessary
        store.addBlockAt(type, pointerPosition.x, pointerPosition.y);
      }
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  return (
    <div
      className="flex-1 bg-gray-100 relative overflow-auto flex justify-center pt-8 pb-8"
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="relative shadow-xl bg-white" style={{ width: page.width, height: page.height }}>

        {/* Grid Background */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        <Stage
          width={page.width}
          height={page.height}
          ref={stageRef}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) {
              page.setSelected(null);
            }
          }}
        >
          <Layer>
            {page.elements.map((el) => (
              <CanvasElement
                key={el.id}
                element={el}
                isSelected={page.selectedIds.includes(el.id)}
                onSelect={(id) => page.setSelected(id)}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
});

/**
 * ------------------------------------------------------------------
 * 4. SIDEBAR COMPONENTS
 * ------------------------------------------------------------------
 */
const SidebarItem = ({ type, icon: Icon, label, desc }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData("type", type);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group flex items-start gap-3 p-3 bg-white border border-transparent hover:border-blue-500 rounded-lg cursor-grab active:cursor-grabbing transition-all hover:shadow-md mb-2"
    >
      <div className="p-2 bg-gray-50 rounded text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600">
        <Icon size={20} />
      </div>
      <div>
        <span className="block text-sm font-semibold text-gray-700">{label}</span>
        <span className="block text-xs text-gray-400 mt-0.5">{desc}</span>
      </div>
    </div>
  );
};

const DeleteButton = observer(() => {
  const { page } = store;
  if (page.selectedIds.length === 0) return null;

  return (
    <button
      onClick={() => page.removeElement(page.selectedIds[0])}
      className="absolute bottom-6 right-6 bg-white text-red-500 p-3 rounded-full shadow-lg border hover:bg-red-50 z-20"
      title="Delete Selected"
    >
      <Trash2 size={20} />
    </button>
  );
});

/**
 * ------------------------------------------------------------------
 * 5. MAIN APP LAYOUT
 * ------------------------------------------------------------------
 */
const GeminiEditor = observer(() => {
  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 text-slate-800 font-sans overflow-hidden">
      {/* HEADER */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-indigo-200">
            E
          </div>
          <div>
            <h1 className="font-bold text-gray-800 leading-tight">Email Builder</h1>
            <p className="text-xs text-gray-500">React Konva + MobX Performance Demo</p>
          </div>
        </div>

        {/* PERFORMANCE TOGGLE */}
        <div className="flex items-center gap-3 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
          <button
            onClick={() => store.performanceMode = 'slow'}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
              store.performanceMode === 'slow'
                ? 'bg-white text-rose-600 shadow-sm ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Turtle size={16} />
            <span>Slow Mode</span>
          </button>
          <button
            onClick={() => store.performanceMode = 'fast'}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
              store.performanceMode === 'fast'
                ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Zap size={16} />
            <span>Fast Mode</span>
          </button>
        </div>

        <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
           <Grid size={16} />
           <span>Canvas: 800x800</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR */}
        <aside className="w-72 bg-white border-r flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="p-5 border-b">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Drag Blocks</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
             <SidebarItem type="box" label="HTML Block" desc="Responsive container" icon={Layout} />
             <SidebarItem type="text" label="Text Block" desc="Rich text content" icon={Type} />
             <SidebarItem type="button" label="Button" desc="Clickable CTA" icon={MousePointer2} />
             <SidebarItem type="image" label="Image" desc="Upload or placeholder" icon={ImageIcon} />

             <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Performance Insight</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                This toggle simulates the performance difference between syncing React state on every frame vs syncing only on drop.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="font-medium text-slate-700">Slow:</span>
                  <span className="text-slate-500">Re-renders React tree on drag</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                   <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                   <span className="font-medium text-slate-700">Fast:</span>
                   <span className="text-slate-500">Updates only Canvas layer</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* EDITOR */}
        <EditorCanvas />
        <DeleteButton />
      </div>
    </div>
  );
});

export default GeminiEditor;
