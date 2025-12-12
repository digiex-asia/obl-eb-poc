# App.old.tsx vs GraphicEditor FSD Comparison

**Analysis Date:** 2025-12-12
**Excluding:** Timeline features (as requested)

This document compares `App.old.tsx` with the current GraphicEditor Feature-Sliced Design (FSD) implementation to identify missing or updated features.

---

## Architecture Differences

### App.old.tsx (Monolithic)
- **Single file**: 2062 lines, everything in one file
- **State**: `useReducer` with local state management
- **Rendering**: Custom `useCanvasEngine` hook inline
- **File size**: ~70KB

### GraphicEditor FSD (Modular)
- **Feature-sliced**: Separated into features (canvas, timeline, properties, export, etc.)
- **State**: Shared reducer in `shared/model/store.ts`
- **Rendering**: Modular hooks in `features/canvas/hooks/`
- **Backend integration**: API hooks for template management
- **Extensible**: Easy to add/remove features

**Winner**: FSD has better architecture for maintainability

---

## Feature Comparison Matrix

| Feature | App.old.tsx | FSD | Status | Notes |
|---------|-------------|-----|--------|-------|
| **Canvas Dimensions** | 1080x1080 (square) | 800x450 (16:9) | Different | Old uses square, FSD uses video aspect ratio |
| **Transient State System** | ✅ Yes | ❌ No | **MISSING IN FSD** | Performance optimization for lag-free dragging |
| **Resize Handles** | ✅ 8 handles (corners + edges) | ⚠️ 4 corner handles only | **MISSING IN FSD** | Edge handles missing |
| **Resize Handle Style** | ✅ Pills for edges, circles for corners | ⚠️ Simple circles | **MISSING IN FSD** | Visual distinction missing |
| **Snap to Elements** | ✅ Snaps to other elements | ⚠️ Canvas center only | **MISSING IN FSD** | Only snaps to canvas center |
| **Snap Guides Visual** | ✅ Shows multiple guide lines | ⚠️ Simple center guides | **MISSING IN FSD** | Less visual feedback |
| **Corner Resize** | ✅ Auto aspect ratio lock | ⚠️ No aspect lock | **MISSING IN FSD** | Corners don't maintain aspect ratio |
| **Edge Resize (Images)** | ✅ Content overflow with aspect | ❌ Not implemented | **MISSING IN FSD** | Image content doesn't maintain aspect |
| **contentWidth/Height** | ✅ Separate content dimensions | ❌ No | **MISSING IN FSD** | Can't zoom into images |
| **BATCH_UPDATE_ELEMENTS** | ✅ Optimized batch action | ❌ Individual updates | **MISSING IN FSD** | Performance issue on multi-select |
| **Debug Mode** | ✅ Toggle with detailed panel | ❌ No | **MISSING IN FSD** | No debug tools |
| **Interactive Zoom Input** | ✅ Editable with keyboard | ⚠️ Display only | **MISSING IN FSD** | Can't type zoom value |
| **Image Aspect Preservation** | ✅ Auto-calculates on add/drop | ⚠️ Fixed size | **MISSING IN FSD** | Images don't preserve aspect |
| **Context Menu** | ✅ Duplicate + Delete | ✅ Full context menu | Same | Both have context menus |
| **Multi-select** | ✅ Shift+click, box select | ✅ Yes | Same | Both support multi-select |
| **Rotation** | ✅ With snap to 45° | ✅ Yes | Same | Both have rotation |
| **Alignment Tools** | ✅ 6 alignment options | ✅ 6 options | Same | Both have full alignment |
| **Flip X/Y** | ✅ For images | ✅ Yes | Same | Both support flip |
| **Stroke/Border** | ✅ Width 0-10 | ✅ Yes | Same | Both have stroke |
| **Opacity** | ✅ 0.0-1.0 | ✅ Yes | Same | Both support opacity |
| **Backend Integration** | ❌ No | ✅ Template CRUD | **FSD ADVANTAGE** | FSD has API integration |
| **Auto-save** | ❌ No | ✅ Yes | **FSD ADVANTAGE** | FSD has auto-save |
| **Operation Queue** | ❌ No | ✅ Yes | **FSD ADVANTAGE** | FSD has operation batching |
| **Video Export** | ❌ No | ✅ Yes | **FSD ADVANTAGE** | FSD can export video |
| **Audio Layers** | ❌ No | ✅ Yes | **FSD ADVANTAGE** | FSD has audio support |
| **Animations** | ❌ No | ✅ Yes | **FSD ADVANTAGE** | FSD has element animations |
| **Page Animations** | ❌ No | ✅ Yes | **FSD ADVANTAGE** | FSD has page transitions |

---

## Critical Missing Features in FSD (from App.old.tsx)

### 1. ⚠️ **Transient State System** (HIGH PRIORITY)

**App.old.tsx (lines 538-539, 1185-1386):**
```typescript
// Transient State Map for lag-free dragging
const transientState = useRef<Map<string, Partial<DesignElement>>>(new Map());

// During drag - update transient state only
if (type === 'move') {
  initialStates.forEach((init, id) => {
    transientState.current.set(id, { x: init.x + dx, y: init.y + dy });
  });
}

// Render loop - merge transient updates
page.elements.forEach(baseEl => {
  const transient = transientState.current.get(baseEl.id);
  const el = transient ? { ...baseEl, ...transient } : baseEl;
  // ... render el
});

// On mouseup - commit to reducer
if (transientState.current.size > 0) {
  const updates = Array.from(transientState.current.entries()).map(
    ([id, attrs]) => ({ id, attrs })
  );
  dispatch({ type: 'BATCH_UPDATE_ELEMENTS', updates });
  transientState.current.clear();
}
```

**Problem in FSD:**
- Every mousemove during drag dispatches a Redux/reducer action
- This causes **performance issues** on slower devices
- Dragging feels laggy with multiple elements

**Solution:**
- Store intermediate drag positions in a ref
- Only update ref during mousemove (no dispatches)
- Render using ref data
- Commit to state only on mouseup

**Impact:** 🔴 **HIGH** - Affects core UX

---

### 2. ⚠️ **8 Resize Handles (Corners + Edges)** (MEDIUM PRIORITY)

**App.old.tsx (lines 849-870, 936-995):**
```typescript
// 8 handles: nw, ne, se, sw, n, e, s, w
const drawCircleHandle = (x: number, y: number) => {
  ctx.beginPath();
  ctx.arc(x, y, hhs, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.stroke();
};

const drawPillHandle = (x: number, y: number, horizontal: boolean) => {
  ctx.beginPath();
  if (horizontal)
    ctx.roundRect(x - hs, y - hhs / 2, hs * 2, hhs, hhs / 2);
  else
    ctx.roundRect(x - hhs / 2, y - hs, hhs, hs * 2, hhs / 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.stroke();
};

// Corner handles
drawCircleHandle(minX, minY); // nw
drawCircleHandle(maxX, minY); // ne
drawCircleHandle(maxX, maxY); // se
drawCircleHandle(minX, maxY); // sw

// Edge handles (pills)
drawPillHandle(minX + bw / 2, minY, true);  // n
drawPillHandle(maxX, minY + bh / 2, false); // e
drawPillHandle(minX + bw / 2, maxY, true);  // s
drawPillHandle(minX, minY + bh / 2, false); // w
```

**FSD Implementation:**
- Only 4 corner handles
- No edge handles for resizing width/height independently

**Impact:** 🟡 **MEDIUM** - UX degradation for precise resizing

---

### 3. ⚠️ **Snap to Other Elements** (MEDIUM PRIORITY)

**App.old.tsx (lines 1122-1133, 1310-1381):**
```typescript
// Build snap targets from ALL elements (not just canvas center)
const snapTargetsX = [CANVAS_WIDTH / 2];
const snapTargetsY = [CANVAS_HEIGHT / 2];

if (page) {
  page.elements.forEach(el => {
    if (!currentSelected.includes(el.id)) {
      snapTargetsX.push(el.x, el.x + el.width / 2, el.x + el.width);
      snapTargetsY.push(el.y, el.y + el.height / 2, el.y + el.height);
    }
  });
}

// During drag, snap to nearest target
snapTargets.x.forEach(target => {
  const dL = target - currentMinX;
  const dR = target - currentMaxX;
  const dC = target - currentCenterX;
  if (Math.abs(dL) < minDistX) {
    minDistX = Math.abs(dL);
    snapDx = dL;
    guideX = [target];
  }
  // ... check dR and dC
});
```

**FSD Implementation:**
- Only snaps to canvas center (horizontal/vertical)
- No element-to-element snapping

**Impact:** 🟡 **MEDIUM** - Harder to align elements precisely

---

### 4. ⚠️ **Corner Resize with Aspect Ratio Lock** (MEDIUM PRIORITY)

**App.old.tsx (lines 1234-1240):**
```typescript
const isCorner = handle?.length === 2; // 'nw', 'ne', 'se', 'sw'
const oldBoundsW = groupBounds.maxX - groupBounds.minX;
const oldBoundsH = groupBounds.maxY - groupBounds.minY;

if (isCorner) {
  const aspect = oldBoundsW / oldBoundsH;
  if (Math.abs(changeW) > Math.abs(changeH))
    changeH = changeW / aspect;
  else
    changeW = changeH * aspect;
  // ... apply changes
}
```

**FSD Implementation:**
- Corner resize doesn't lock aspect ratio
- Elements can be distorted unintentionally

**Impact:** 🟡 **MEDIUM** - Design quality issue

---

### 5. ⚠️ **Content Width/Height for Images** (LOW PRIORITY)

**App.old.tsx (lines 98-99, 1274-1293):**
```typescript
interface DesignElement {
  // ...
  contentWidth?: number;  // Actual image content width (can be > width)
  contentHeight?: number; // Actual image content height (can be > height)
}

// On edge resize, maintain content aspect ratio
let nextCW = init.cw || init.w;
let nextCH = init.ch || init.h;
const contentAspect = nextCW / nextCH;

if (isCorner) {
  const sX = nextW / init.w;
  nextCW = (init.cw || init.w) * sX;
  nextCH = (init.ch || init.h) * sX;
} else {
  // Allow content to overflow for zooming effect
  let targetCW = Math.max(init.cw || init.w, nextW);
  let targetCH = targetCW / contentAspect;
  if (targetCH < nextH) {
    targetCH = nextH;
    targetCW = targetCH * contentAspect;
  }
  nextCW = targetCW;
  nextCH = targetCH;
}
```

**FSD Implementation:**
- No separate content dimensions
- Images can't "zoom in" while maintaining aspect ratio

**Impact:** 🟢 **LOW** - Nice-to-have for advanced image manipulation

---

### 6. ⚠️ **BATCH_UPDATE_ELEMENTS Action** (MEDIUM PRIORITY)

**App.old.tsx (lines 153-155, 297-311):**
```typescript
type Action =
  // ...
  | {
      type: 'BATCH_UPDATE_ELEMENTS';
      updates: { id: string; attrs: Partial<DesignElement> }[];
    };

case 'BATCH_UPDATE_ELEMENTS':
  return {
    ...state,
    pages: state.pages.map(p => {
      if (p.id !== state.activePageId) return p;
      const updateMap = new Map(action.updates.map(u => [u.id, u.attrs]));
      return {
        ...p,
        elements: p.elements.map(el => {
          const updates = updateMap.get(el.id);
          return updates ? { ...el, ...updates } : el;
        }),
      };
    }),
  };
```

**FSD Implementation:**
- Uses `UPDATE_ELEMENTS` which updates all elements with same attrs
- Can't batch different updates for different elements efficiently

**Impact:** 🟡 **MEDIUM** - Performance issue with transient state system

---

### 7. ⚠️ **Debug Mode** (LOW PRIORITY)

**App.old.tsx (lines 1780, 1914-2005):**
```typescript
const [debugMode, setDebugMode] = useState(false);

// Toggle button in header
<button
  onClick={() => setDebugMode(!debugMode)}
  className={`p-1.5 rounded hover:bg-white/20 ${debugMode ? 'bg-white/20' : 'text-white/60'}`}
>
  <Bug size={14} />
</button>

// Debug panel
{debugMode && activePage && (
  <div className="absolute top-14 right-4 bg-black/80 text-white p-3 rounded...">
    <div>Elements: {activePage.elements.length}</div>
    <div>Selected: {state.selectedIds.length}</div>
    <div>Zoom: {Math.round(state.zoom * 100)}%</div>
    <div>Pan: {Math.round(state.pan.x)}, {Math.round(state.pan.y)}</div>
    {state.selectedIds.length === 1 && (
      <div>
        <div>ID: {state.selectedIds[0].substr(0, 6)}...</div>
        <div>X: {Math.round(element.x)}</div>
        <div>Y: {Math.round(element.y)}</div>
      </div>
    )}
  </div>
)}
```

**FSD Implementation:**
- No debug mode
- Hard to troubleshoot issues in production

**Impact:** 🟢 **LOW** - Developer experience, not critical for users

---

### 8. ⚠️ **Interactive Zoom Input** (LOW PRIORITY)

**App.old.tsx (lines 1781-1894):**
```typescript
const [zoomInput, setZoomInput] = useState(
  Math.round(state.zoom * 100).toString()
);
const inputRef = useRef<HTMLInputElement>(null);

// Input with keyboard support
<input
  ref={inputRef}
  className="bg-transparent text-white border-none outline-none w-8..."
  value={zoomInput}
  onChange={handleZoomInputChange}
  onKeyDown={handleZoomInputKeyDown}  // Enter to apply
  onBlur={() => {
    let val = parseInt(zoomInput);
    if (!isNaN(val))
      setZoomInput(Math.max(10, Math.min(500, val)).toString());
  }}
/>

const focusZoomInput = () => {
  inputRef.current?.focus();
  inputRef.current?.select();
};
```

**FSD Implementation:**
- Zoom is display-only
- Can't type exact zoom value
- Must use zoom buttons or scroll

**Impact:** 🟢 **LOW** - Convenience feature

---

### 9. ⚠️ **Image Aspect Ratio Preservation** (MEDIUM PRIORITY)

**App.old.tsx (lines 1794-1824):**
```typescript
const addImageWithRatio = (src: string, dropX?: number, dropY?: number) => {
  const img = new Image();
  img.src = src;
  img.crossOrigin = 'Anonymous';
  img.onload = () => {
    let w = img.naturalWidth;
    let h = img.naturalHeight;

    // Scale down if too large
    if (w > 400) {
      const ratio = 400 / w;
      w = 400;
      h = h * ratio;
    }

    // Center on drop point
    let finalX = dropX;
    let finalY = dropY;
    if (finalX !== undefined) finalX -= w / 2;
    if (finalY !== undefined) finalY -= h / 2;

    dispatch({
      type: 'ADD_ELEMENT',
      elementType: 'image',
      src,
      width: w,
      height: h,
      x: finalX,
      y: finalY,
    });
  };
};
```

**FSD Implementation:**
- Images added with fixed size (e.g., 200x200)
- Original aspect ratio is lost

**Impact:** 🟡 **MEDIUM** - Images look distorted when added

---

## FSD Advantages (Not in App.old.tsx)

### ✅ **Backend Integration**
- Template CRUD operations
- Auto-save functionality
- Operation queue for efficient sync
- Version conflict detection

### ✅ **Timeline with Audio**
- Multi-track audio layers
- Voiceover recording
- Audio clip trimming
- Synchronized playback

### ✅ **Element Animations**
- Fade, Rise, Pan, Pop, Shake, Pulse, Wiggle
- Animation preview on hover
- Speed, delay, direction controls
- Enter/Exit/Both modes

### ✅ **Page Animations**
- Fade, Slide, Zoom, Wipe transitions
- Page duration control
- Timeline scrubbing

### ✅ **Video Export**
- Frame-by-frame rendering
- Audio synchronization
- MP4/WebM output
- Progress tracking

### ✅ **Feature-Sliced Architecture**
- Modular, maintainable codebase
- Easy to add/remove features
- Separation of concerns
- Testable structure

---

## Recommendations for OpenSpec Proposal

### Priority 1 (Critical Performance/UX):
1. ✅ **Transient State System** - Fixes laggy dragging
2. ✅ **BATCH_UPDATE_ELEMENTS** - Required for transient state
3. ✅ **Image Aspect Preservation** - Prevents distorted images

### Priority 2 (Enhanced UX):
4. ✅ **8 Resize Handles** - Better resize control
5. ✅ **Snap to Elements** - Precise alignment
6. ✅ **Corner Aspect Lock** - Prevents accidental distortion

### Priority 3 (Nice-to-Have):
7. ⚠️ **Debug Mode** - Developer tools
8. ⚠️ **Interactive Zoom** - Convenience
9. ⚠️ **Content Width/Height** - Advanced image zoom

### Not Recommended (Keep FSD Version):
- Canvas dimensions (16:9 is better for video)
- Monolithic structure (FSD is superior)

---

## Implementation Strategy

### Phase 1: Performance Fixes
1. Add `BATCH_UPDATE_ELEMENTS` action to reducer
2. Implement transient state system in canvas hook
3. Test with 50+ elements for lag

### Phase 2: UX Improvements
1. Add 8 resize handles (corners + edges)
2. Implement element-to-element snapping
3. Add corner aspect ratio lock
4. Fix image aspect ratio on add/drop

### Phase 3: Developer Experience
1. Add debug mode toggle
2. Make zoom input interactive
3. Add performance metrics display

---

## Code Reuse from App.old.tsx

### Files to Extract:
1. `useTransientState.ts` - Transient state hook (lines 538-1430)
2. `BATCH_UPDATE_ELEMENTS` reducer case (lines 297-311)
3. `drawResizeHandles` function (lines 842-881)
4. `getHandleUnderMouse` function (lines 936-995)
5. `buildSnapTargets` function (lines 1122-1133)
6. `calculateAspectResize` function (lines 1234-1293)
7. `addImageWithRatio` function (lines 1794-1824)
8. `DebugPanel` component (lines 1967-2005)

---

## Conclusion

**App.old.tsx** has several **critical performance and UX features** that are missing in the current FSD implementation:

1. **Transient state system** - Solves laggy drag performance
2. **8 resize handles** - Better UX for resizing
3. **Element snapping** - Precise alignment
4. **Image aspect preservation** - Prevents distortion

These should be ported to the FSD architecture while **preserving FSD's advantages**:
- Backend integration
- Timeline/audio features
- Animation system
- Modular structure

The OpenSpec proposal should focus on **Phase 1 (Performance)** and **Phase 2 (UX)** features, as these directly impact core user experience.

---

**Generated:** 2025-12-12
**Source Files:**
- `/src/components/GraphicEditor/App.old.tsx` (2062 lines)
- `/src/components/GraphicEditor/app-v2/App.tsx` (FSD structure)
- `/src/components/GraphicEditor/app-v2/singleappdemo.tsx` (1563 lines)
