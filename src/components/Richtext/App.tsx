import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Type,
  MousePointer2,
  Eraser,
  Bold,
  Italic,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Highlighter,
  Palette,
  Heading1,
  Heading2,
  GripHorizontal,
  PlusSquare,
  Move,
  Activity,
  Waves,
  Scaling,
  Minus,
  Plus,
  Check,
  Sparkles,
  BoxSelect,
  ArrowUpDown,
  ArrowLeftRight,
  MousePointerClick,
  ClipboardCopy,
  ClipboardPaste,
  Scissors,
} from 'lucide-react';

// ==========================================
// 1. TYPES & DATA MODEL
// ==========================================

type Point = { path: number[]; offset: number };
type Range = { anchor: Point; focus: Point };

type TextAnimation = 'none' | 'wavy' | 'pulse' | 'rainbow';
type BlockAnimation = 'none' | 'float' | 'shake';

type TextLeaf = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  letterSpacing?: number;
  animation?: TextAnimation;
};

type ElementNode = {
  type:
    | 'paragraph'
    | 'heading-1'
    | 'heading-2'
    | 'bullet-list'
    | 'numbered-list';
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  blockAnimation?: BlockAnimation;
  children: TextLeaf[];
};

type TextBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  content: ElementNode[];
};

type RenderedChar = {
  char: string;
  x: number;
  width: number;
  style: TextLeaf;
  leafIndex: number;
  charIndexInLeaf: number;
};

type RenderedLine = {
  y: number;
  height: number;
  baseline: number;
  chars: RenderedChar[];
  path: number[];
};

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';

// ==========================================
// 2. PLUGINS (TOOLBAR COMPONENTS)
// ==========================================

const WEB_SAFE_FONTS = [
  'Arial',
  'Verdana',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Impact',
];
const GOOGLE_FONTS = [
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Playfair Display',
  'Oswald',
];

type PluginProps = {
  currentStyle: Partial<TextLeaf> & {
    blockAnimation?: BlockAnimation;
    lineHeight?: number;
  };
  onApply: (key: any, val: any) => void;
};

const FontPlugin = ({ currentStyle, onApply }: PluginProps) => (
  <div className="flex gap-2 items-center border-r border-gray-200 pr-2">
    <div className="flex flex-col w-32">
      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">
        Font
      </span>
      <select
        className="w-full text-xs border-gray-300 bg-gray-50 rounded p-1 outline-none focus:border-blue-500 transition-colors"
        value={currentStyle.fontFamily}
        onChange={e => onApply('fontFamily', e.target.value)}
        title="Font Family"
      >
        <optgroup label="Standard">
          {WEB_SAFE_FONTS.map(f => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </optgroup>
        <optgroup label="Google Fonts">
          {GOOGLE_FONTS.map(f => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </optgroup>
      </select>
    </div>

    <div className="flex flex-col">
      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">
        Size
      </span>
      <div className="flex items-center bg-gray-50 rounded border p-0.5">
        <button
          className="p-1 hover:bg-gray-200 rounded"
          onClick={() => onApply('fontSize', (currentStyle.fontSize || 16) - 1)}
        >
          <Minus size={12} />
        </button>
        <input
          type="number"
          className="w-8 text-center text-xs bg-transparent outline-none no-arrows"
          value={currentStyle.fontSize}
          onChange={e => onApply('fontSize', parseInt(e.target.value))}
        />
        <button
          className="p-1 hover:bg-gray-200 rounded"
          onClick={() => onApply('fontSize', (currentStyle.fontSize || 16) + 1)}
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  </div>
);

const ColorPlugin = ({ currentStyle, onApply }: PluginProps) => (
  <div className="flex items-center gap-2 border-r border-gray-200 pr-2">
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">
        Colors
      </span>
      <div className="flex gap-1">
        <div
          className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-1 py-0.5 rounded border border-gray-200"
          title="Text Color"
        >
          <span className="font-serif font-bold">A</span>
          <input
            type="color"
            value={currentStyle.color}
            onChange={e => onApply('color', e.target.value)}
            className="w-4 h-4 p-0 border-0 rounded cursor-pointer"
          />
        </div>
        <div
          className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-1 py-0.5 rounded border border-gray-200"
          title="Highlight Color"
        >
          <Highlighter size={12} />
          <input
            type="color"
            value={
              currentStyle.backgroundColor === 'transparent'
                ? '#ffffff'
                : currentStyle.backgroundColor
            }
            onChange={e => onApply('backgroundColor', e.target.value)}
            className="w-4 h-4 p-0 border-0 rounded cursor-pointer"
          />
          <button
            onClick={() => onApply('backgroundColor', 'transparent')}
            className="text-[10px] hover:text-red-500 hover:bg-red-50 px-1 rounded"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
);

const SpacingPlugin = ({ currentStyle, onApply }: PluginProps) => (
  <div className="flex gap-3 items-center border-r border-gray-200 pr-2">
    <div className="flex flex-col w-16">
      <div className="flex justify-between text-[10px] text-gray-400 font-medium mb-0.5">
        <span className="uppercase tracking-wider">Line</span>
        <span>{currentStyle.lineHeight?.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min="0.8"
        max="3"
        step="0.1"
        className="h-1.5 w-full bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        value={currentStyle.lineHeight}
        onChange={e => onApply('lineHeight', parseFloat(e.target.value))}
        title="Line Height"
      />
    </div>
    <div className="flex flex-col w-16">
      <div className="flex justify-between text-[10px] text-gray-400 font-medium mb-0.5">
        <span className="uppercase tracking-wider">Char</span>
        <span>{currentStyle.letterSpacing}px</span>
      </div>
      <input
        type="range"
        min="-2"
        max="10"
        step="1"
        className="h-1.5 w-full bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        value={currentStyle.letterSpacing}
        onChange={e => onApply('letterSpacing', parseFloat(e.target.value))}
        title="Character Spacing"
      />
    </div>
  </div>
);

const StylePlugin = ({ currentStyle, onApply }: PluginProps) => (
  <div className="flex gap-1 items-center border-r border-gray-200 pr-2">
    <button
      onClick={() => onApply('bold', !currentStyle.bold)}
      className={`p-2 rounded transition-colors ${currentStyle.bold ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
      title="Bold"
    >
      <Bold size={16} />
    </button>
    <button
      onClick={() => onApply('italic', !currentStyle.italic)}
      className={`p-2 rounded transition-colors ${currentStyle.italic ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
      title="Italic"
    >
      <Italic size={16} />
    </button>
    <button
      onClick={() => onApply('strike', !currentStyle.strike)}
      className={`p-2 rounded transition-colors ${currentStyle.strike ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
      title="Strikethrough"
    >
      <Strikethrough size={16} />
    </button>
  </div>
);

const AnimationPlugin = ({ currentStyle, onApply }: PluginProps) => (
  <div className="flex gap-2 items-center">
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">
        Text FX
      </span>
      <select
        className="bg-gray-50 border border-gray-300 rounded text-xs p-1 outline-none w-20 focus:border-blue-500 transition-colors"
        value={currentStyle.animation}
        onChange={e => onApply('animation', e.target.value)}
      >
        <option value="none">None</option>
        <option value="wavy">Wavy</option>
        <option value="pulse">Pulse</option>
        <option value="rainbow">Color</option>
      </select>
    </div>

    <div className="flex flex-col">
      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">
        Block FX
      </span>
      <select
        className="bg-gray-50 border border-gray-300 rounded text-xs p-1 outline-none w-20 focus:border-blue-500 transition-colors"
        value={currentStyle.blockAnimation}
        onChange={e => onApply('blockAnimation', e.target.value)}
      >
        <option value="none">None</option>
        <option value="float">Float</option>
        <option value="shake">Shake</option>
      </select>
    </div>
  </div>
);

// ==========================================
// 3. MINI SLATE ENGINE (Helpers)
// ==========================================

const Editor = {
  isCollapsed: (range: Range) =>
    range.anchor.path[0] === range.focus.path[0] &&
    range.anchor.offset === range.focus.offset,

  edges: (selection: Range) => {
    const { anchor, focus } = selection;
    if (
      anchor.path[0] < focus.path[0] ||
      (anchor.path[0] === focus.path[0] && anchor.offset < focus.offset)
    ) {
      return [anchor, focus];
    }
    return [focus, anchor];
  },

  getTextInRange: (content: ElementNode[], at: Range) => {
    const [start, end] = Editor.edges(at);
    if (start.path[0] !== end.path[0]) return '';

    const node = content[start.path[0]];
    let text = '';
    let currentOffset = 0;

    for (const leaf of node.children) {
      const leafLen = leaf.text.length;
      const leafEnd = currentOffset + leafLen;

      if (leafEnd > start.offset && currentOffset < end.offset) {
        const sliceStart = Math.max(0, start.offset - currentOffset);
        const sliceEnd = Math.min(leafLen, end.offset - currentOffset);
        text += leaf.text.slice(sliceStart, sliceEnd);
      }
      currentOffset += leafLen;
    }
    return text;
  },
};

const Transforms = {
  insertText: (content: ElementNode[], text: string, at: Range) => {
    const [start] = Editor.edges(at);
    const pathIndex = start.path[0];
    const node = content[pathIndex];

    let currentOffset = 0;
    for (let i = 0; i < node.children.length; i++) {
      const leaf = node.children[i];
      const len = leaf.text.length;

      if (
        start.offset >= currentOffset &&
        start.offset <= currentOffset + len
      ) {
        const leafOffset = start.offset - currentOffset;
        const before = leaf.text.slice(0, leafOffset);
        const after = leaf.text.slice(leafOffset);
        leaf.text = before + text + after;

        return {
          anchor: { path: [pathIndex], offset: start.offset + text.length },
          focus: { path: [pathIndex], offset: start.offset + text.length },
        };
      }
      currentOffset += len;
    }
    return at;
  },

  deleteBackward: (content: ElementNode[], at: Range) => {
    const [start, end] = Editor.edges(at);
    const pathIndex = start.path[0];
    const node = content[pathIndex];

    if (start.offset !== end.offset) {
      let currentOffset = 0;
      const newChildren = [];
      for (const leaf of node.children) {
        const leafStart = currentOffset;
        const leafEnd = currentOffset + leaf.text.length;

        if (leafEnd <= start.offset || leafStart >= end.offset) {
          newChildren.push(leaf);
        } else {
          const keepStart =
            leafStart < start.offset
              ? leaf.text.slice(0, start.offset - leafStart)
              : '';
          const keepEnd =
            leafEnd > end.offset ? leaf.text.slice(end.offset - leafStart) : '';
          if (keepStart || keepEnd) {
            newChildren.push({ ...leaf, text: keepStart + keepEnd });
          }
        }
        currentOffset += leaf.text.length;
      }
      if (newChildren.length === 0)
        newChildren.push({ ...node.children[0], text: '' });
      node.children = newChildren;
      return { anchor: start, focus: start };
    }

    let currentOffset = 0;
    for (let i = 0; i < node.children.length; i++) {
      const leaf = node.children[i];
      const len = leaf.text.length;

      if (start.offset > currentOffset && start.offset <= currentOffset + len) {
        const leafOffset = start.offset - currentOffset;
        const before = leaf.text.slice(0, leafOffset - 1);
        const after = leaf.text.slice(leafOffset);
        leaf.text = before + after;

        if (leaf.text === '' && node.children.length > 1) {
          node.children.splice(i, 1);
        }

        const newPoint = { path: [pathIndex], offset: start.offset - 1 };
        return { anchor: newPoint, focus: newPoint };
      }
      currentOffset += len;
    }
    return at;
  },

  applyStyleToRange: (content: ElementNode[], style: any, at: Range) => {
    const [start, end] = Editor.edges(at);

    if (
      'blockAnimation' in style ||
      'lineHeight' in style ||
      'align' in style
    ) {
      for (let i = start.path[0]; i <= end.path[0]; i++) {
        content[i] = { ...content[i], ...style };
      }
      return;
    }

    if (start.path[0] !== end.path[0]) return;

    const node = content[start.path[0]];
    const newChildren: TextLeaf[] = [];
    let currentOffset = 0;

    for (const leaf of node.children) {
      const leafStart = currentOffset;
      const leafEnd = currentOffset + leaf.text.length;

      if (leafStart >= start.offset && leafEnd <= end.offset) {
        newChildren.push({ ...leaf, ...style });
      } else if (
        Math.max(leafStart, start.offset) < Math.min(leafEnd, end.offset)
      ) {
        const intersectionStart = Math.max(leafStart, start.offset) - leafStart;
        const intersectionEnd = Math.min(leafEnd, end.offset) - leafStart;

        const before = leaf.text.slice(0, intersectionStart);
        const middle = leaf.text.slice(intersectionStart, intersectionEnd);
        const after = leaf.text.slice(intersectionEnd);

        if (before) newChildren.push({ ...leaf, text: before });
        if (middle) newChildren.push({ ...leaf, ...style, text: middle });
        if (after) newChildren.push({ ...leaf, text: after });
      } else {
        newChildren.push(leaf);
      }
      currentOffset += leaf.text.length;
    }
    node.children = newChildren;
  },
};

// ==========================================
// 4. MAIN COMPONENT
// ==========================================

const DEFAULT_FONT_SIZE = 16;
const DEFAULT_FONT = 'Arial';
const PADDING = 10;
const CURSOR_COLOR = '#2563eb';
const SELECTION_COLOR = 'rgba(37, 99, 235, 0.3)';
const HANDLE_SIZE = 8;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const animationRef = useRef<number>();
  const lastInputTime = useRef<number>(Date.now()); // For blinking cursor

  const [textBoxes, setTextBoxes] = useState<TextBox[]>([
    {
      id: 'box-1',
      x: 50,
      y: 50,
      width: 500,
      content: [
        {
          type: 'heading-1',
          align: 'center',
          blockAnimation: 'float',
          children: [
            {
              text: 'Mouse Selection ',
              fontSize: 42,
              bold: true,
              color: '#4f46e5',
              fontFamily: 'Montserrat',
            },
            {
              text: 'Fixed',
              fontSize: 42,
              bold: true,
              color: '#000',
              fontFamily: 'Montserrat',
              animation: 'wavy',
            },
          ],
        },
        {
          type: 'paragraph',
          align: 'center',
          children: [
            {
              text: 'Try dragging loosely around this text to select it.',
              fontSize: 14,
              fontFamily: 'Open Sans',
            },
          ],
        },
      ],
    },
    {
      id: 'box-2',
      x: 100,
      y: 250,
      width: 300,
      content: [
        {
          type: 'paragraph',
          children: [
            {
              text: 'Clicking empty space or dragging works better now.',
              fontSize: 18,
            },
          ],
        },
      ],
    },
  ]);

  const [activeBoxId, setActiveBoxId] = useState<string | null>('box-1');
  const [selection, setSelection] = useState<Range>({
    anchor: { path: [0], offset: 0 },
    focus: { path: [0], offset: 0 },
  });

  const [dragMode, setDragMode] = useState<
    'none' | 'select' | 'move-box' | ResizeHandle
  >('none');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [initialBoxState, setInitialBoxState] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const [currentStyle, setCurrentStyle] = useState<
    Partial<TextLeaf> & { blockAnimation?: BlockAnimation; lineHeight?: number }
  >({
    fontSize: DEFAULT_FONT_SIZE,
    fontFamily: DEFAULT_FONT,
    color: '#000000',
    backgroundColor: 'transparent',
    bold: false,
    italic: false,
    letterSpacing: 0,
    lineHeight: 1.5,
    animation: 'none',
    blockAnimation: 'none',
  });

  const layoutMap = useRef<
    Record<string, { lines: RenderedLine[]; height: number }>
  >({});

  useEffect(() => {
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${GOOGLE_FONTS.map(f => f.replace(' ', '+')).join('&family=')}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    if (!activeBoxId) return;
    const box = textBoxes.find(b => b.id === activeBoxId);
    if (!box) return;
    const pathIndex = selection.focus.path[0];
    const node = box.content[pathIndex];
    if (node) {
      let currentOffset = 0;
      for (const leaf of node.children) {
        if (
          selection.focus.offset >= currentOffset &&
          selection.focus.offset <= currentOffset + leaf.text.length
        ) {
          setCurrentStyle({
            fontSize: leaf.fontSize || DEFAULT_FONT_SIZE,
            fontFamily: leaf.fontFamily || DEFAULT_FONT,
            color: leaf.color || '#000000',
            backgroundColor: leaf.backgroundColor || 'transparent',
            bold: leaf.bold || false,
            italic: leaf.italic || false,
            strike: leaf.strike || false,
            letterSpacing: leaf.letterSpacing || 0,
            lineHeight: node.lineHeight || 1.5,
            animation: leaf.animation || 'none',
            blockAnimation: node.blockAnimation || 'none',
          });
          break;
        }
        currentOffset += leaf.text.length;
      }
    }
  }, [selection, activeBoxId, textBoxes]);

  // ==========================================
  // LAYOUT
  // ==========================================
  const computeBoxLayout = (ctx: CanvasRenderingContext2D, box: TextBox) => {
    const lines: RenderedLine[] = [];
    let currentY = PADDING;
    const maxWidth = box.width - PADDING * 2;

    box.content.forEach((node, nodeIndex) => {
      const nodeLines: RenderedLine[] = [];
      let currentLineChars: RenderedChar[] = [];
      let currentLineWidth = 0;
      let maxLineHeight = 0;

      const flushLine = () => {
        let startX = PADDING;
        if (node.align === 'center')
          startX += (maxWidth - currentLineWidth) / 2;
        if (node.align === 'right') startX += maxWidth - currentLineWidth;

        let cursorX = startX;
        const positionedChars = currentLineChars.map(c => {
          const charObj = { ...c, x: cursorX };
          cursorX += c.width;
          return charObj;
        });

        nodeLines.push({
          y: currentY,
          height: maxLineHeight,
          baseline: currentY + maxLineHeight * 0.8,
          chars: positionedChars,
          path: [nodeIndex],
        });

        currentY += maxLineHeight;
        currentLineChars = [];
        currentLineWidth = 0;
        maxLineHeight = 0;
      };

      let effectiveMaxWidth = maxWidth;
      if (node.type === 'bullet-list' || node.type === 'numbered-list') {
        effectiveMaxWidth -= 24;
      }

      node.children.forEach((leaf, leafIndex) => {
        const fontSize = leaf.fontSize || DEFAULT_FONT_SIZE;
        const family = leaf.fontFamily || DEFAULT_FONT;
        const weight = leaf.bold ? 'bold' : 'normal';
        const style = leaf.italic ? 'italic' : '';
        ctx.font = `${style} ${weight} ${fontSize}px "${family}"`;

        const lineHeight = fontSize * (node.lineHeight || 1.4);
        const letterSpacing = leaf.letterSpacing || 0;

        const chars = leaf.text.split('');
        chars.forEach((char, charIdx) => {
          const w = ctx.measureText(char).width + letterSpacing;
          if (
            currentLineWidth + w > effectiveMaxWidth &&
            currentLineChars.length > 0
          )
            flushLine();

          currentLineChars.push({
            char,
            x: 0,
            width: w,
            style: leaf,
            leafIndex,
            charIndexInLeaf: charIdx,
          });

          currentLineWidth += w;
          maxLineHeight = Math.max(maxLineHeight, lineHeight);
        });
      });

      if (currentLineChars.length > 0) {
        flushLine();
      } else {
        // Handle empty line case so it's selectable
        const fontSize = node.children[0]?.fontSize || DEFAULT_FONT_SIZE;
        const lineHeight = fontSize * (node.lineHeight || 1.4);
        nodeLines.push({
          y: currentY,
          height: lineHeight,
          baseline: currentY + lineHeight * 0.8,
          chars: [],
          path: [nodeIndex],
        });
        currentY += lineHeight;
      }

      currentY += 10;
      lines.push(...nodeLines);
    });
    layoutMap.current[box.id] = { lines, height: currentY + PADDING };
  };

  // ==========================================
  // RENDER
  // ==========================================
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const time = Date.now();
    const dpr = window.devicePixelRatio || 1;
    const rect = containerRef.current?.getBoundingClientRect();

    // Resize canvas buffer if needed
    if (
      rect &&
      (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr)
    ) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    // Reset transform and apply DPI scaling each frame (safer pattern)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    textBoxes.forEach(box => {
      ctx.save();
      ctx.translate(box.x, box.y);

      const computedHeight = layoutMap.current[box.id]?.height || 50;
      const actualBoxHeight = box.height || computedHeight;

      if (box.id === activeBoxId) {
        ctx.strokeStyle = '#3b82f6';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(0, 0, box.width, actualBoxHeight);
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        const handles = [
          { x: -HANDLE_SIZE / 2, y: -HANDLE_SIZE / 2 }, // NW
          { x: box.width / 2 - HANDLE_SIZE / 2, y: -HANDLE_SIZE / 2 }, // N
          { x: box.width - HANDLE_SIZE / 2, y: -HANDLE_SIZE / 2 }, // NE
          {
            x: box.width - HANDLE_SIZE / 2,
            y: actualBoxHeight / 2 - HANDLE_SIZE / 2,
          }, // E
          {
            x: box.width - HANDLE_SIZE / 2,
            y: actualBoxHeight - HANDLE_SIZE / 2,
          }, // SE
          {
            x: box.width / 2 - HANDLE_SIZE / 2,
            y: actualBoxHeight - HANDLE_SIZE / 2,
          }, // S
          { x: -HANDLE_SIZE / 2, y: actualBoxHeight - HANDLE_SIZE / 2 }, // SW
          { x: -HANDLE_SIZE / 2, y: actualBoxHeight / 2 - HANDLE_SIZE / 2 }, // W
        ];
        handles.forEach(h => {
          ctx.fillRect(h.x, h.y, HANDLE_SIZE, HANDLE_SIZE);
          ctx.strokeRect(h.x, h.y, HANDLE_SIZE, HANDLE_SIZE);
        });
      }

      if (box.height) {
        ctx.beginPath();
        ctx.rect(0, 0, box.width, box.height);
        ctx.clip();
      }

      computeBoxLayout(ctx, box);
      const layout = layoutMap.current[box.id];
      if (!layout) {
        ctx.restore();
        return;
      }

      layout.lines.forEach(line => {
        const blockNode = box.content[line.path[0]];
        let lineOffsetX = 0;
        let lineOffsetY = 0;
        if (blockNode.blockAnimation === 'float')
          lineOffsetY = Math.sin(time / 500 + line.path[0]) * 5;
        if (blockNode.blockAnimation === 'shake')
          lineOffsetX = Math.sin(time / 50 + line.path[0]) * 2;

        line.chars.forEach(charData => {
          let leafStartOffset = 0;
          const node = box.content[line.path[0]];
          for (let i = 0; i < charData.leafIndex; i++)
            leafStartOffset += node.children[i].text.length;
          const absCharIndex = leafStartOffset + charData.charIndexInLeaf;

          const [start, end] = Editor.edges(selection);
          const isSelected =
            activeBoxId === box.id &&
            start.path[0] === line.path[0] &&
            end.path[0] === line.path[0] &&
            absCharIndex >= start.offset &&
            absCharIndex < end.offset;

          if (isSelected) {
            ctx.fillStyle = SELECTION_COLOR;
            ctx.fillRect(
              charData.x + lineOffsetX,
              line.y + lineOffsetY,
              charData.width,
              line.height
            );
          }

          const s = charData.style;
          if (s.backgroundColor && s.backgroundColor !== 'transparent') {
            ctx.fillStyle = s.backgroundColor;
            ctx.fillRect(
              charData.x + lineOffsetX,
              line.y + lineOffsetY,
              charData.width,
              line.height
            );
          }

          const weight = s.bold ? 'bold' : 'normal';
          const style = s.italic ? 'italic' : '';
          let drawSize = s.fontSize || DEFAULT_FONT_SIZE;
          let drawOffsetY = 0;
          let drawColor = s.color || '#000';

          if (s.animation === 'wavy')
            drawOffsetY = Math.sin(time / 200 + absCharIndex) * 3;
          else if (s.animation === 'pulse')
            drawSize =
              drawSize * (1 + Math.sin(time / 200 + absCharIndex) * 0.15);
          else if (s.animation === 'rainbow')
            drawColor = `hsl(${(time / 10 + absCharIndex * 20) % 360}, 70%, 50%)`;

          ctx.font = `${style} ${weight} ${drawSize}px "${s.fontFamily || DEFAULT_FONT}"`;
          ctx.fillStyle = drawColor;
          const textY =
            line.y + (line.height - drawSize) / 2 + lineOffsetY + drawOffsetY;
          ctx.textBaseline = 'top';
          ctx.fillText(charData.char, charData.x + lineOffsetX, textY);

          if (s.strike)
            ctx.fillRect(
              charData.x + lineOffsetX,
              textY + drawSize / 2,
              charData.width,
              1
            );
        });
      });

      // Cursor Blinking Logic
      const cursorVisible =
        time % 1000 < 500 || time - lastInputTime.current < 500;

      if (activeBoxId === box.id && cursorVisible) {
        const { focus } = selection;
        for (const line of layout.lines) {
          if (line.path[0] !== focus.path[0]) continue;

          // Handle Empty Lines
          if (line.chars.length === 0) {
            let lineOffsetX = 0;
            let lineOffsetY = 0;
            const node = box.content[line.path[0]];
            if (node.blockAnimation === 'float')
              lineOffsetY = Math.sin(time / 500 + line.path[0]) * 5;

            if (focus.offset === 0) {
              ctx.beginPath();
              ctx.moveTo(PADDING + lineOffsetX, line.y + lineOffsetY);
              ctx.lineTo(
                PADDING + lineOffsetX,
                line.y + line.height + lineOffsetY
              );
              ctx.lineWidth = 2;
              ctx.strokeStyle = CURSOR_COLOR;
              ctx.stroke();

              if (inputRef.current) {
                const r = canvas.getBoundingClientRect();
                inputRef.current.style.top = `${r.top + box.y + line.y + lineOffsetY}px`;
                inputRef.current.style.left = `${r.left + box.x + PADDING + lineOffsetX}px`;
              }
            }
            continue;
          }

          const firstChar = line.chars[0];
          const node = box.content[line.path[0]];
          let lineStartOffset = 0;
          for (let k = 0; k < firstChar.leafIndex; k++)
            lineStartOffset += node.children[k].text.length;
          lineStartOffset += firstChar.charIndexInLeaf;

          if (
            focus.offset >= lineStartOffset &&
            focus.offset <= lineStartOffset + line.chars.length
          ) {
            const localOffset = focus.offset - lineStartOffset;
            let cx = line.chars[0].x;
            if (localOffset > 0 && line.chars[localOffset - 1]) {
              cx =
                line.chars[localOffset - 1].x +
                line.chars[localOffset - 1].width;
            }

            let lineOffsetX = 0;
            let lineOffsetY = 0;
            if (node.blockAnimation === 'float')
              lineOffsetY = Math.sin(time / 500 + line.path[0]) * 5;
            if (node.blockAnimation === 'shake')
              lineOffsetX = Math.sin(time / 50 + line.path[0]) * 2;

            ctx.beginPath();
            ctx.moveTo(cx + lineOffsetX, line.y + lineOffsetY);
            ctx.lineTo(cx + lineOffsetX, line.y + line.height + lineOffsetY);
            ctx.lineWidth = 2;
            ctx.strokeStyle = CURSOR_COLOR;
            ctx.stroke();

            if (inputRef.current) {
              const r = canvas.getBoundingClientRect();
              inputRef.current.style.top = `${r.top + box.y + line.y + lineOffsetY}px`;
              inputRef.current.style.left = `${r.left + box.x + cx + lineOffsetX}px`;
            }
            break;
          }
        }
      }
      ctx.restore();
    });
    animationRef.current = requestAnimationFrame(render);
  }, [textBoxes, selection, activeBoxId]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [render]);

  // ==========================================
  // INPUT HANDLERS
  // ==========================================

  const getResizeHandle = (
    box: TextBox,
    mx: number,
    my: number
  ): ResizeHandle | null => {
    const computedHeight = layoutMap.current[box.id]?.height || 50;
    const h = box.height || computedHeight;
    const w = box.width;
    const hs = HANDLE_SIZE;

    const lx = mx - box.x;
    const ly = my - box.y;

    if (lx >= -hs && lx <= hs && ly >= -hs && ly <= hs) return 'nw';
    if (lx >= w - hs && lx <= w + hs && ly >= -hs && ly <= hs) return 'ne';
    if (lx >= w - hs && lx <= w + hs && ly >= h - hs && ly <= h + hs)
      return 'se';
    if (lx >= -hs && lx <= hs && ly >= h - hs && ly <= h + hs) return 'sw';
    if (lx >= w / 2 - hs && lx <= w / 2 + hs && ly >= -hs && ly <= hs)
      return 'n';
    if (lx >= w / 2 - hs && lx <= w / 2 + hs && ly >= h - hs && ly <= h + hs)
      return 's';
    if (lx >= -hs && lx <= hs && ly >= h / 2 - hs && ly <= h / 2 + hs)
      return 'w';
    if (lx >= w - hs && lx <= w + hs && ly >= h / 2 - hs && ly <= h / 2 + hs)
      return 'e';

    return null;
  };

  // FIXED HIT TEST LOGIC (Robust)
  const hitTestChar = (box: TextBox, mx: number, my: number): Point | null => {
    const layout = layoutMap.current[box.id];
    if (!layout || layout.lines.length === 0) return null;

    const rx = mx - box.x;
    const ry = my - box.y;

    // 1. Find Closest Line (Robust Vertical Search)
    let line = layout.lines[0];
    let minDY = Infinity;

    for (const l of layout.lines) {
      const centerY = l.y + l.height / 2;
      const dy = Math.abs(ry - centerY);
      if (dy < minDY) {
        minDY = dy;
        line = l;
      }
    }

    if (!line) return null;

    // 2. Handle Empty Lines (e.g., new lines)
    if (line.chars.length === 0) {
      return { path: line.path, offset: 0 };
    }

    const firstChar = line.chars[0];
    const lastChar = line.chars[line.chars.length - 1];

    // 3. Check Left/Right Bounds
    if (rx < firstChar.x) return getGlobalOffset(box, line, firstChar, 0);
    if (rx > lastChar.x + lastChar.width)
      return getGlobalOffset(box, line, lastChar, 1);

    // 4. Find Closest Char (Horizontal Search)
    let closestChar = firstChar;
    let minDX = Infinity;

    for (const char of line.chars) {
      const centerX = char.x + char.width / 2;
      const dx = Math.abs(rx - centerX);
      if (dx < minDX) {
        minDX = dx;
        closestChar = char;
      }
    }

    // 5. Determine click side (Left or Right of char)
    const charCenter = closestChar.x + closestChar.width / 2;
    const delta = rx > charCenter ? 1 : 0;

    return getGlobalOffset(box, line, closestChar, delta);
  };

  const getGlobalOffset = (
    box: TextBox,
    line: RenderedLine,
    char: RenderedChar,
    delta: number
  ) => {
    let abs = 0;
    const node = box.content[line.path[0]];
    for (let k = 0; k < char.leafIndex; k++)
      abs += node.children[k].text.length;
    return { path: line.path, offset: abs + char.charIndexInLeaf + delta };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    lastInputTime.current = Date.now(); // Reset Blink

    if (activeBoxId) {
      const activeBox = textBoxes.find(b => b.id === activeBoxId);
      if (activeBox) {
        const handle = getResizeHandle(activeBox, mx, my);
        if (handle) {
          setDragMode(handle);
          setDragStart({ x: mx, y: my });
          const layout = layoutMap.current[activeBox.id];
          setInitialBoxState({
            x: activeBox.x,
            y: activeBox.y,
            w: activeBox.width,
            h: activeBox.height || layout?.height || 50,
          });
          return;
        }
      }
    }

    let hitBox = null;
    for (let i = textBoxes.length - 1; i >= 0; i--) {
      const b = textBoxes[i];
      const h = b.height || layoutMap.current[b.id]?.height || 50;
      if (mx >= b.x && mx <= b.x + b.width && my >= b.y && my <= b.y + h) {
        hitBox = b;
        break;
      }
    }

    if (hitBox) {
      setActiveBoxId(hitBox.id);
      if (e.ctrlKey) {
        setDragMode('move-box');
        setDragStart({ x: mx, y: my });
        setInitialBoxState({
          x: hitBox.x,
          y: hitBox.y,
          w: hitBox.width,
          h: hitBox.height || 0,
        });
      } else {
        setDragMode('select');
        setDragStart({ x: mx, y: my }); // Required for drag selection to work
        const pt = hitTestChar(hitBox, mx, my);
        if (pt) setSelection({ anchor: pt, focus: pt });
        inputRef.current?.focus();
      }
    } else {
      setActiveBoxId(null);
      setDragMode('none');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let cursor = 'default';
    const hoveredBox = textBoxes
      .slice()
      .reverse()
      .find(b => {
        const h = b.height || layoutMap.current[b.id]?.height || 50;
        return mx >= b.x && mx <= b.x + b.width && my >= b.y && my <= b.y + h;
      });

    if (activeBoxId) {
      const box = textBoxes.find(b => b.id === activeBoxId);
      if (box) {
        const handle = getResizeHandle(box, mx, my);
        if (handle) {
          if (handle === 'nw' || handle === 'se') cursor = 'nwse-resize';
          else if (handle === 'ne' || handle === 'sw') cursor = 'nesw-resize';
          else if (handle === 'n' || handle === 's') cursor = 'ns-resize';
          else cursor = 'ew-resize';
        }
      }
    }

    if (cursor === 'default' && hoveredBox) {
      if (e.ctrlKey) cursor = 'move';
      else cursor = 'text';
    }
    canvasRef.current.style.cursor = cursor;

    // Early return if not dragging, but allow 'select' mode without initialBoxState
    if (dragMode === 'none' || !activeBoxId || !dragStart) return;
    if (dragMode !== 'select' && !initialBoxState) return;

    if (dragMode === 'move-box') {
      const dx = mx - dragStart.x;
      const dy = my - dragStart.y;
      setTextBoxes(p =>
        p.map(b =>
          b.id === activeBoxId
            ? { ...b, x: initialBoxState.x + dx, y: initialBoxState.y + dy }
            : b
        )
      );
    } else if (dragMode === 'select') {
      const box = textBoxes.find(b => b.id === activeBoxId);
      if (box) {
        const pt = hitTestChar(box, mx, my);
        if (pt) setSelection(p => ({ ...p, focus: pt }));
      }
    } else if (initialBoxState) {
      // Resize mode - requires initialBoxState
      const dx = mx - dragStart.x;
      const dy = my - dragStart.y;
      let newW = initialBoxState.w;
      let newX = initialBoxState.x;
      let newH = initialBoxState.h;
      let newY = initialBoxState.y;

      if (dragMode.includes('e')) newW = Math.max(50, initialBoxState.w + dx);
      if (dragMode.includes('w')) {
        const delta = Math.min(initialBoxState.w - 50, dx);
        newW = initialBoxState.w - delta;
        newX = initialBoxState.x + delta;
      }

      if (dragMode.includes('s')) newH = Math.max(20, initialBoxState.h + dy);
      if (dragMode.includes('n')) {
        const delta = Math.min(initialBoxState.h - 20, dy);
        newH = initialBoxState.h - delta;
        newY = initialBoxState.y + delta;
      }

      setTextBoxes(p =>
        p.map(b =>
          b.id === activeBoxId
            ? { ...b, x: newX, y: newY, width: newW, height: newH }
            : b
        )
      );
    }
  };

  const handleMouseUp = () => {
    setDragMode('none');
    setDragStart(null);
    setInitialBoxState(null);
    inputRef.current?.focus();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!activeBoxId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const newId = `box-${Date.now()}`;
      const newBox: TextBox = {
        id: newId,
        x: mx,
        y: my,
        width: 250,
        content: [
          {
            type: 'paragraph',
            children: [
              {
                text: 'New Text Box',
                fontFamily: DEFAULT_FONT,
                fontSize: DEFAULT_FONT_SIZE,
              },
            ],
          },
        ],
      };
      setTextBoxes(prev => [...prev, newBox]);
      setActiveBoxId(newId);
      setSelection({
        anchor: { path: [0], offset: 0 },
        focus: { path: [0], offset: 12 },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeBoxId) return;
    const { key } = e;

    lastInputTime.current = Date.now(); // Reset Blink

    // Handle Home/End for Line navigation
    if (key === 'Home' || key === 'End') {
      const box = textBoxes.find(b => b.id === activeBoxId);
      const layout = layoutMap.current[activeBoxId];
      if (box && layout) {
        // Find line containing cursor
        const focusPath = selection.focus.path[0];
        const focusOffset = selection.focus.offset;

        // Re-calc global offset for line start/end
        let line = layout.lines.find(l => {
          if (l.path[0] !== focusPath) return false;

          // Calculate bounds for this line
          let lineStart = 0;
          const node = box.content[l.path[0]];
          if (l.chars.length > 0) {
            const first = l.chars[0];
            for (let k = 0; k < first.leafIndex; k++)
              lineStart += node.children[k].text.length;
            lineStart += first.charIndexInLeaf;
          }
          const lineEnd = lineStart + l.chars.length;
          return focusOffset >= lineStart && focusOffset <= lineEnd;
        });

        if (line) {
          // Determine absolute start/end offset of this line
          let absStart = 0;
          let absEnd = 0;
          const node = box.content[line.path[0]];

          if (line.chars.length > 0) {
            const first = line.chars[0];
            const last = line.chars[line.chars.length - 1];
            for (let k = 0; k < first.leafIndex; k++)
              absStart += node.children[k].text.length;
            absStart += first.charIndexInLeaf;

            absEnd = absStart + line.chars.length;
          } else {
            // Empty line logic if needed (usually lines have chars or is new block)
          }

          const newOffset = key === 'Home' ? absStart : absEnd;
          setSelection({
            anchor: { path: [focusPath], offset: newOffset },
            focus: { path: [focusPath], offset: newOffset },
          });
          return;
        }
      }
    }

    setTextBoxes(prev => {
      const newBoxes = [...prev];
      const idx = newBoxes.findIndex(b => b.id === activeBoxId);
      const box = newBoxes[idx];
      const newContent = JSON.parse(JSON.stringify(box.content));

      let newSel = selection;

      if (key === 'Backspace') {
        newSel = Transforms.deleteBackward(newContent, selection);
      } else if (key.length === 1 && !e.ctrlKey && !e.metaKey) {
        newSel = Transforms.insertText(newContent, key, selection);
      } else if (key === 'ArrowLeft') {
        newSel = {
          ...selection,
          focus: {
            ...selection.focus,
            offset: Math.max(0, selection.focus.offset - 1),
          },
        };
        if (!e.shiftKey) newSel.anchor = newSel.focus;
      } else if (key === 'ArrowRight') {
        newSel = {
          ...selection,
          focus: { ...selection.focus, offset: selection.focus.offset + 1 },
        };
        if (!e.shiftKey) newSel.anchor = newSel.focus;
      }

      setSelection(newSel);
      newBoxes[idx] = { ...box, content: newContent };
      return newBoxes;
    });
  };

  const applyStyle = (
    key: keyof TextLeaf | 'blockAnimation' | 'lineHeight' | 'letterSpacing',
    val: any
  ) => {
    if (!activeBoxId) return;
    setCurrentStyle(p => ({ ...p, [key]: val }));
    setTextBoxes(prev => {
      const newBoxes = [...prev];
      const idx = newBoxes.findIndex(b => b.id === activeBoxId);
      const box = newBoxes[idx];
      const newContent = JSON.parse(JSON.stringify(box.content));
      Transforms.applyStyleToRange(newContent, { [key]: val }, selection);
      newBoxes[idx] = { ...box, content: newContent };
      return newBoxes;
    });
    inputRef.current?.focus();
  };

  const manualCopy = () => {
    if (inputRef.current) inputRef.current.focus();
    document.execCommand('copy');
  };

  const manualPaste = async () => {
    if (navigator.clipboard) {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTextBoxes(prev => {
          const newBoxes = [...prev];
          const idx = newBoxes.findIndex(b => b.id === activeBoxId);
          if (idx === -1) return prev;
          const box = newBoxes[idx];
          const newContent = JSON.parse(JSON.stringify(box.content));
          const newSel = Transforms.insertText(newContent, text, selection);
          newBoxes[idx] = { ...box, content: newContent };
          setSelection(newSel);
          return newBoxes;
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans text-gray-700 select-none">
      {/* TOOLBAR */}
      <div className="bg-white border-b border-gray-300 p-2 flex flex-wrap gap-4 items-center shadow-sm z-10">
        <FontPlugin currentStyle={currentStyle} onApply={applyStyle} />
        <ColorPlugin currentStyle={currentStyle} onApply={applyStyle} />
        <SpacingPlugin currentStyle={currentStyle} onApply={applyStyle} />
        <StylePlugin currentStyle={currentStyle} onApply={applyStyle} />
        <AnimationPlugin currentStyle={currentStyle} onApply={applyStyle} />

        {/* CLIPBOARD ACTIONS */}
        <div className="flex gap-1 items-center pl-2 border-l border-gray-200">
          <button
            onClick={manualCopy}
            className="p-2 hover:bg-gray-100 rounded"
            title="Copy"
          >
            <ClipboardCopy size={16} />
          </button>
          <button
            onClick={manualPaste}
            className="p-2 hover:bg-gray-100 rounded"
            title="Paste"
          >
            <ClipboardPaste size={16} />
          </button>
        </div>
      </div>

      {/* EDITOR AREA */}
      <div className="flex-1 overflow-hidden relative bg-gray-200">
        <div
          ref={containerRef}
          className="absolute inset-0 m-4 bg-white shadow-2xl overflow-hidden cursor-text"
          onMouseDown={() => {
            setActiveBoxId(null);
            setDragMode('none');
          }}
          onDoubleClick={handleDoubleClick}
        >
          <canvas
            ref={canvasRef}
            className="block w-full h-full"
            onMouseDown={e => {
              e.stopPropagation();
              handleMouseDown(e);
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
          <textarea
            ref={inputRef}
            className="absolute opacity-0 w-1 h-1 pointer-events-none"
            autoFocus
            onKeyDown={handleKeyDown}
            onCopy={manualCopy}
            onCut={manualCopy} // Simpler for now
            onPaste={manualPaste}
            onChange={() => {}}
          />

          {!activeBoxId && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-gray-300 flex flex-col items-center">
              <BoxSelect size={48} className="opacity-50 mb-2" />
              <p>Double click to add text box</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
