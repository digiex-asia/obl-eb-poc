# Canvas Editor Features Extraction

This document catalogs all features found across the different canvas/editor implementations in the codebase. Use this to decide which features to clone into App.tsx.

---

## 1. CanvasEditor (Email Builder) - `/src/components/CanvasEditor/`

### Core Architecture
- **HTML5 Canvas** rendering engine
- **Row/Column Layout System** - Email-safe responsive grid
- **MobX State Management** via EditorStore
- **Multi-pass rendering** (content → hover → selection → controls)

### Layout Features
- ✅ Draggable row blocks with multiple column layouts:
  - Single column (100%)
  - Two columns (50/50, 30/70, 70/30)
  - Three columns (33/33/33)
  - Four columns (25/25/25/25)
- ✅ **Column resizing** - Interactive column width adjustment with visual feedback
- ✅ **Row resizing** - Drag bottom handle to adjust row height
- ✅ **Row reordering** - Drag rows to reposition them
- ✅ **Add row buttons** - Plus buttons above/below selected rows
- ✅ **Row selection** with purple highlight border
- ✅ **Row hover** with light blue border

### Element Features
- ✅ **Element types supported**:
  - Rectangle (rounded corners)
  - Circle/Ellipse
  - Triangle
  - Star (5-pointed)
  - Polygon (Hexagon)
  - Image (with loading states)
  - Text/Heading
  - Button (with text)
  - Divider (horizontal line)
  - Spacer (invisible padding)

- ✅ **Element interactions**:
  - Drag to move within/between rows
  - Resize via corner handles (4 corners)
  - Selection with pink border
  - Hover highlight
  - Delete (Backspace/Delete key)
  - Duplicate (Cmd/Ctrl+D)

### Visual Features
- ✅ **Color system**:
  - Solid colors
  - Linear gradients (CSS-style)
  - Color picker with presets (Primary, Secondary, Gradients)
- ✅ **Background colors** for rows
- ✅ **Shadows** on page/paper
- ✅ **Column guide indicators** (purple dashed lines)
- ✅ **Percentage labels** during column resize
- ✅ **Row badge** ("Row" label on selected)
- ✅ **Drag handles** (6-dot pattern on hover/select)

### UI Components
- ✅ **Sidebar** with tabs:
  - Blocks (layouts, free-form, dividers, spacers)
  - Media (image library)
  - Shapes (geometric shapes)
  - Text (heading, paragraph)
  - Button (primary button)
  - Color (palette access)
- ✅ **Top bar** with dimensions display
- ✅ **Zoom controls** (floating, bottom-right)
- ✅ **Context menu** (duplicate, color, delete)
- ✅ **Search bar** in shapes panel

### Advanced Features
- ✅ **Zoom/Pan** (pinch-zoom, Ctrl+scroll)
- ✅ **Scroll-based rendering** (viewport culling)
- ✅ **Image caching** for performance
- ✅ **Device pixel ratio** support (HiDPI)
- ✅ **Drag-and-drop** from sidebar
- ✅ **Keyboard shortcuts**
- ✅ **Responsive canvas** (auto-resize)

### State Management
- ✅ **onChange callback** for state sync
- ✅ **Initial state override** support
- ✅ **Configurable props**:
  - `showSidebar`
  - `showTopBar`
  - `showZoomControls`
  - `sampleImages`
  - `className`
  - `style`

---

## 2. GraphicEditor (GenStudio) - `/src/components/GraphicEditor/app-v2/singleappdemo.tsx`

### Core Architecture
- **HTML5 Canvas** rendering
- **useReducer** state management (no external deps)
- **Multi-page system** with timeline
- **Animation/playback** support

### Page Management
- ✅ **Multi-page support** (pages array)
- ✅ **Add page**
- ✅ **Duplicate page** (with all elements)
- ✅ **Delete page** (with minimum 1 page)
- ✅ **Select/switch pages**
- ✅ **Page duration** (for animations)
- ✅ **Page background color**

### Element Features
- ✅ **Element types**:
  - Rectangle
  - Circle
  - Triangle
  - Star
  - Heart ❤️ (Bezier curves)
  - Diamond 💎
  - Hexagon/Polygon
  - Image (with external URLs)

- ✅ **Advanced element properties**:
  - **Rotation** (with rotate handle)
  - **Opacity**
  - **Flip X/Y** (horizontal/vertical flip)
  - **Stroke** (border) with width control
  - **Fill** (solid colors)
  - **Fill Image** (pattern/texture fill)

### Interaction Features
- ✅ **Multi-select** (Shift+click, box selection)
- ✅ **Selection box/marquee** (drag to select multiple)
- ✅ **Move multiple elements** simultaneously
- ✅ **Resize** (bottom-right corner handle)
- ✅ **Rotate** (top handle with offset)
- ✅ **Snap to center** guides (horizontal/vertical)
- ✅ **Pan mode** (Space + drag)
- ✅ **Context menu** (right-click)

### Alignment Features
- ✅ **Alignment toolbar** (floating, appears on selection):
  - Align Left
  - Align Center
  - Align Right
  - Align Top
  - Align Middle
  - Align Bottom
- ✅ **Smart alignment** to canvas center
- ✅ **Multi-element alignment** (relative to group bounds)
- ✅ **Single-element alignment** (to canvas)

### Timeline/Animation
- ✅ **Timeline panel** (resizable height)
- ✅ **Timeline zoom** (horizontal scaling)
- ✅ **Play/Pause** controls
- ✅ **Scrubber/playhead** (red line)
- ✅ **Current time display**
- ✅ **Page duration visualization** (width = duration)
- ✅ **Auto-advance pages** during playback

### Visual Features
- ✅ **Floating context toolbar** (top-center on selection)
- ✅ **Quick color swatches** (8 colors)
- ✅ **Stroke width slider** (0-10)
- ✅ **Flip buttons** for images
- ✅ **Smart guides** (pink dashed lines for center snap)
- ✅ **Selection handles** (white circles with pink border)
- ✅ **Page shadow** (elevation effect)

### Sidebar
- ✅ **Two-column sidebar**:
  - Icon nav (72px) - Uploads, Elements
  - Content panel (320px)
- ✅ **Fashion assets library** (sample images)
- ✅ **Shapes grid** (3x3 layout)
- ✅ **Drag-and-drop** elements
- ✅ **Click to add** elements

### Keyboard/Mouse
- ✅ **Delete** - Delete/Backspace
- ✅ **Copy** - Context menu or Cmd+C (visual duplicate)
- ✅ **Shift+click** - Toggle selection
- ✅ **Space+drag** - Pan canvas
- ✅ **Shift+rotate** - Snap to 45° increments
- ✅ **Click empty area** - Deselect all

### Export/Share
- ✅ **Export button** (in header)
- ✅ **Download functionality** (referenced)

---

## 3. KonvaEditor - `/src/components/KonvaEditor/`

### Core Architecture
- **Konva.js library** (declarative 2D canvas)
- **MobX observable state**
- **React-konva** integration

### Debug Features (Extensive Debug Panel)
- ✅ **Debug panel** with tabs:
  - Event Logger
  - Store Viewer
  - Inspector
  - Performance/FPS Counter
  - Render Stats
- ✅ **Grid overlay** (configurable)
- ✅ **Bounding boxes** visualization
- ✅ **Snap guides** visual feedback
- ✅ **Distance indicators**

### Advanced Features (from file structure)
- ✅ **Smart guides** (alignment assistance)
- ✅ **Distance measurement** between elements
- ✅ **Alignment toolbar**
- ✅ **Performance optimizations**
- ✅ **Event logging** (for debugging)
- ✅ **Store state inspection**

---

## Feature Comparison Matrix

| Feature | CanvasEditor | GraphicEditor | KonvaEditor |
|---------|-------------|---------------|-------------|
| **Multi-page** | ❌ | ✅ | ❌ |
| **Row/Column Layout** | ✅ | ❌ | ✅ |
| **Rotation** | ❌ | ✅ | ✅ |
| **Multi-select** | ❌ | ✅ | ✅ |
| **Box Selection** | ❌ | ✅ | ✅ |
| **Flip X/Y** | ❌ | ✅ | ✅ |
| **Opacity** | ❌ | ✅ | ✅ |
| **Timeline** | ❌ | ✅ | ❌ |
| **Animation** | ❌ | ✅ | ❌ |
| **Smart Guides** | ❌ | ✅ | ✅ |
| **Alignment Tools** | ❌ | ✅ | ✅ |
| **Debug Tools** | ❌ | ❌ | ✅ |
| **Email-safe** | ✅ | ❌ | ✅ |
| **Image Fill** | ❌ | ✅ | ? |
| **Heart/Diamond** | ❌ | ✅ | ? |
| **Stroke/Border** | ❌ | ✅ | ✅ |
| **Context Menu** | ✅ | ✅ | ? |
| **Pan Mode** | ❌ | ✅ | ✅ |

---

## Recommended Features to Clone into App.tsx

### High Priority (Essential)
1. ✅ **Multi-select** (Shift+click, box selection) - GenStudio
2. ✅ **Rotation** with rotate handle - GenStudio
3. ✅ **Opacity control** - GenStudio
4. ✅ **Flip X/Y** - GenStudio
5. ✅ **Smart guides** (center snapping) - GenStudio
6. ✅ **Alignment toolbar** - GenStudio
7. ✅ **Stroke/border** controls - GenStudio
8. ✅ **Context menu** - Both
9. ✅ **Pan mode** (Space+drag) - GenStudio

### Medium Priority (Enhanced UX)
10. ✅ **Multi-page system** - GenStudio
11. ✅ **Timeline panel** - GenStudio
12. ✅ **Heart & Diamond shapes** - GenStudio
13. ✅ **Image fill/patterns** - GenStudio
14. ✅ **Selection box marquee** - GenStudio
15. ✅ **Distance measurement** - KonvaEditor
16. ✅ **Floating context toolbar** - GenStudio

### Low Priority (Nice to Have)
17. ✅ **Animation/playback** - GenStudio
18. ✅ **Debug panel** - KonvaEditor
19. ✅ **Event logging** - KonvaEditor
20. ✅ **FPS counter** - KonvaEditor
21. ✅ **Bounding box viz** - KonvaEditor

---

## Implementation Notes

### From CanvasEditor (Strengths)
- Clean reducer pattern with actions
- Excellent row/column grid system
- Good drag-and-drop handling
- Color picker component is reusable
- Sidebar organization is very clean

### From GraphicEditor (Strengths)
- **Rotation math** is well-implemented (rotate handle positioning)
- **Multi-select logic** is solid (shift, box select)
- **Smart guides** implementation is elegant
- **Floating toolbar** UX is intuitive
- **Page system** is simple but effective

### From KonvaEditor (Strengths)
- Debug tools are excellent for development
- Performance monitoring is built-in
- Event system is robust
- Store viewer helps with state debugging

---

## Code Snippets to Extract

### 1. Rotation Handle Math (GenStudio lines 995-1016)
```typescript
// Rotate handle logic - calculate angle from center
const centerX = el.x + el.width / 2;
const centerY = el.y + el.height / 2;
const angle = (Math.atan2(mouse.y - centerY, mouse.x - centerX) * 180) / Math.PI;
const startAngle = -90; // Handle is at top
let newRot = angle - startAngle;
if (e.shiftKey) newRot = Math.round(newRot / 45) * 45; // Snap to 45°
```

### 2. Box Selection Logic (GenStudio lines 961-971, 1032-1063)
```typescript
// Start box select on empty area click
dragInfo.current = {
  active: true,
  type: 'select-box',
  boxStartX: mouse.x,
  boxStartY: mouse.y,
  // ...
};
// On mouseup, check which elements are inside box
const ids: string[] = [];
page.elements.forEach(el => {
  const ex = el.x + el.width / 2;
  const ey = el.y + el.height / 2;
  if (ex >= minX && ex <= maxX && ey >= minY && ey <= maxY) {
    ids.push(el.id);
  }
});
```

### 3. Smart Guides (GenStudio lines 561-587)
```typescript
// Draw snap guides when dragging
if (dragInfo.current.active && dragInfo.current.type === 'move' && selectedIds.length === 1) {
  const el = page.elements.find(e => e.id === selectedIds[0]);
  if (el) {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    if (Math.abs(cx - CANVAS_WIDTH / 2) < SNAP_THRESHOLD) {
      // Draw vertical guide
    }
    if (Math.abs(cy - CANVAS_HEIGHT / 2) < SNAP_THRESHOLD) {
      // Draw horizontal guide
    }
  }
}
```

### 4. Floating Context Toolbar (GenStudio lines 1110-1232)
```typescript
const ContextToolbar = ({ selectedIds, page, dispatch }) => {
  const elements = page.elements.filter(e => selectedIds.includes(e.id));
  if (elements.length === 0) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl ...">
      {/* Alignment buttons */}
      {/* Flip buttons (for images) */}
      {/* Color swatches */}
      {/* Stroke width slider */}
      {/* Copy/Delete buttons */}
    </div>
  );
};
```

---

## Architecture Decision Points

### If Cloning to App.tsx:

1. **State Management**: Consider whether to:
   - Keep MobX (from CanvasEditor/KonvaEditor)
   - Use useReducer (from GraphicEditor)
   - Mix both approaches

2. **Rendering Engine**: Choose:
   - Raw Canvas 2D (both CanvasEditor & GraphicEditor)
   - Konva.js (KonvaEditor)
   - React-konva (declarative)

3. **Layout System**: Decide on:
   - Row/Column grid (email-friendly, CanvasEditor)
   - Free-form multi-page (design tool, GraphicEditor)
   - Hybrid approach

4. **Component Structure**:
   - Modular (CanvasEditor has separate reducer.ts, types.ts)
   - Monolithic (GraphicEditor is single-file)
   - Feature-based (KonvaEditor has features/ directory)

---

## Next Steps

1. **Review this document** and mark which features you want
2. **Prioritize** features based on your use case:
   - Email builder? → CanvasEditor features
   - Design tool? → GraphicEditor features
   - Both? → Hybrid approach
3. **Create implementation plan** for selected features
4. **Test compatibility** of combined features

---

Generated: 2025-12-12
Source Files Analyzed:
- `/src/components/CanvasEditor/CanvasEditor.tsx` (2202 lines)
- `/src/components/GraphicEditor/app-v2/singleappdemo.tsx` (1563 lines)
- `/src/components/KonvaEditor/` (multiple files, structure analyzed)
