# Design: App.old.tsx Performance Features Integration

## Context

The GraphicEditor currently uses a Feature-Sliced Design (FSD) architecture that provides excellent modularity, maintainability, and backend integration. However, the canvas interaction layer dispatches Redux actions on every mousemove during drag operations, causing performance issues. The legacy `App.old.tsx` implementation solved this with a transient state system that defers state updates until mouseup.

This design document outlines how to integrate all 9 performance and UX features from `App.old.tsx` into the FSD architecture **without compromising** existing FSD advantages.

### Stakeholders
- **End Users**: Need smooth 60fps dragging, precise alignment tools, correct image aspect ratios
- **Developers**: Need debug tools, maintainable code, clear separation of concerns
- **Product**: Need all existing features preserved (backend sync, timeline, audio, animations)

### Constraints
- Must maintain 60fps on mid-range devices (2015 MacBook)
- Must not break existing template save/load functionality
- Must not interfere with timeline, audio, or animation systems
- Must preserve FSD architecture principles

## Goals / Non-Goals

### Goals
1. Achieve lag-free dragging with 50+ elements (60fps)
2. Add all 9 missing features from App.old.tsx
3. Preserve all existing FSD features and advantages
4. Maintain FSD architectural patterns
5. Keep code modular and testable

### Non-Goals
1. Refactor existing FSD features that already work well
2. Change data models beyond adding contentWidth/Height
3. Modify backend API contracts
4. Change timeline or audio architecture
5. Rewrite entire canvas engine (incremental enhancement only)

## Decisions

### Decision 1: Transient State Architecture

**Problem**: Dispatching Redux actions on every mousemove causes 60+ dispatches/sec during drag, triggering reducer runs, re-renders, and backend operation generation. This causes visible lag on slower devices.

**Options Considered**:
1. **Throttle/debounce dispatches** - Still dispatches frequently, just less often
2. **Ref-based transient state (App.old.tsx approach)** - No dispatches during drag
3. **Web Worker for drag calculations** - Complex, overkill for this problem
4. **requestAnimationFrame batching** - Still dispatches, just batched

**Decision**: Use ref-based transient state (Option 2)

**Rationale**:
- Proven solution from App.old.tsx (battle-tested)
- Zero dispatches during drag (only 1 on mouseup)
- Renders still happen every frame, but with fast ref reads instead of Redux selector calls
- Simple to understand and debug
- No external dependencies

**Implementation**:
```typescript
// features/canvas/hooks/useTransientState.ts
export const useTransientState = () => {
  const transientState = useRef<Map<string, Partial<DesignElement>>>(new Map());

  const setTransient = (id: string, attrs: Partial<DesignElement>) => {
    transientState.current.set(id, attrs);
  };

  const getElement = (baseEl: DesignElement) => {
    const transient = transientState.current.get(baseEl.id);
    return transient ? { ...baseEl, ...transient } : baseEl;
  };

  const commitTransients = (dispatch: Dispatch) => {
    if (transientState.current.size === 0) return;
    const updates = Array.from(transientState.current.entries()).map(
      ([id, attrs]) => ({ id, attrs })
    );
    dispatch({ type: 'BATCH_UPDATE_ELEMENTS', updates });
    transientState.current.clear();
  };

  return { setTransient, getElement, commitTransients };
};
```

**Trade-offs**:
- ✅ Pro: Massive performance improvement (60x fewer dispatches)
- ✅ Pro: Simple mental model (refs are fast, Redux is slow during drag)
- ⚠️ Con: State temporarily desynchronized (transient != Redux)
- ⚠️ Con: Must remember to clear transients on selection change, page switch

**Mitigation**:
- Clear transients in useEffect when selectedIds, activePageId, or isPlaying changes
- Add integration tests for state sync edge cases

---

### Decision 2: BATCH_UPDATE_ELEMENTS vs UPDATE_ELEMENTS

**Problem**: The transient state commit needs to update multiple elements with **different** attributes in a single action. Current `UPDATE_ELEMENTS` applies the same attributes to all IDs.

**Options Considered**:
1. **Loop and dispatch UPDATE_ELEMENTS for each element** - 50 dispatches, defeats purpose
2. **Add BATCH_UPDATE_ELEMENTS action** - Single dispatch with array of updates
3. **Extend UPDATE_ELEMENTS with optional updates array** - Breaks existing usage

**Decision**: Add new BATCH_UPDATE_ELEMENTS action (Option 2)

**Rationale**:
- Backward compatible (doesn't change UPDATE_ELEMENTS)
- Clear intent (batch vs individual)
- Efficient (single reducer run, single re-render)
- Matches operation generator pattern (already batches operations)

**Implementation**:
```typescript
// shared/model/types.ts
type Action =
  // ... existing actions
  | {
      type: 'BATCH_UPDATE_ELEMENTS';
      updates: { id: string; attrs: Partial<DesignElement> }[];
    };

// shared/model/store.ts
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

**Trade-offs**:
- ✅ Pro: Efficient (single pass over elements)
- ✅ Pro: Flexible (each element can have different updates)
- ⚠️ Con: Slightly more complex reducer logic
- ⚠️ Con: Operation generator needs to handle new action type

**Mitigation**: Add operation generator handler in separate task

---

### Decision 3: 8 Resize Handles Implementation

**Problem**: Need to add 4 edge handles (N, E, S, W) while keeping existing 4 corner handles working.

**Options Considered**:
1. **Separate render passes** - Draw corners, then draw edges
2. **Unified handle array** - Loop through all 8 handles
3. **Manual drawing** - Draw each handle explicitly

**Decision**: Manual drawing with visual distinction (Option 3)

**Rationale**:
- Clear and explicit (matches App.old.tsx approach)
- Easy to customize visuals (circles vs pills)
- No abstraction overhead
- Easier to debug (can see each handle in code)

**Implementation**:
```typescript
// Corners: circles
const drawCircleHandle = (x: number, y: number) => {
  ctx.beginPath();
  ctx.arc(x, y, hhs, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.stroke();
};

// Edges: pills (rounded rectangles)
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

// Draw all 8
drawCircleHandle(minX, minY); // nw
drawPillHandle(minX + bw / 2, minY, true); // n
drawCircleHandle(maxX, minY); // ne
drawPillHandle(maxX, minY + bh / 2, false); // e
drawCircleHandle(maxX, maxY); // se
drawPillHandle(minX + bw / 2, maxY, true); // s
drawCircleHandle(minX, maxY); // sw
drawPillHandle(minX, minY + bh / 2, false); // w
```

**Visual Distinction**:
- Corners = circles (multi-axis resize, aspect locked)
- Edges = pills (single-axis resize, no aspect lock)
- Users can learn the difference through visual affordance

**Trade-offs**:
- ✅ Pro: Clear visual feedback
- ✅ Pro: Easy to understand code
- ⚠️ Con: More lines of code than loop approach
- ⚠️ Con: Need to handle rotation transform for hit detection

---

### Decision 4: Snap Target Calculation Strategy

**Problem**: Need to build snap targets from all non-selected elements efficiently. With 100 elements, that's 600 snap points to check against.

**Options Considered**:
1. **Simple loop every frame** - Easy, but potentially slow
2. **Spatial indexing (quadtree)** - Fast, but complex
3. **Memoization with dependency array** - Cache until elements change

**Decision**: Start with memoization (Option 3), optimize with spatial indexing if needed

**Rationale**:
- Most common case: < 50 elements, < 300 snap points
- Array operations are fast for small N
- Premature optimization is root of all evil
- Can profile and optimize later if needed

**Implementation**:
```typescript
const buildSnapTargets = (
  elements: DesignElement[],
  selectedIds: string[]
) => {
  const snapTargetsX = [CANVAS_WIDTH / 2];
  const snapTargetsY = [CANVAS_HEIGHT / 2];

  elements.forEach(el => {
    if (!selectedIds.includes(el.id)) {
      // 3 horizontal: left, center, right
      snapTargetsX.push(el.x, el.x + el.width / 2, el.x + el.width);
      // 3 vertical: top, middle, bottom
      snapTargetsY.push(el.y, el.y + el.height / 2, el.y + el.height);
    }
  });

  return { x: snapTargetsX, y: snapTargetsY };
};
```

**Performance Budget**: < 1ms for 100 elements (600 iterations)

**Trade-offs**:
- ✅ Pro: Simple and understandable
- ✅ Pro: Fast enough for typical use case
- ⚠️ Con: O(n) calculation every drag frame
- ⚠️ Con: May need optimization for very dense layouts (100+ elements)

**Mitigation**: Add performance.now() timing in debug mode to monitor

---

### Decision 5: Content Width/Height for Images

**Problem**: Need to support "zoom into image" effect where image content dimensions exceed visible bounds.

**Options Considered**:
1. **Add contentWidth/Height to DesignElement** - Simple, explicit
2. **Use scale property** - More general, but confusing with canvas scale
3. **Separate content and transform matrices** - Overkill, too complex

**Decision**: Add optional contentWidth/Height fields (Option 1)

**Rationale**:
- Explicit intent (content size vs visible size)
- Backward compatible (optional fields, default to width/height)
- Easy to understand (content = what's there, width/height = what's shown)
- Matches App.old.tsx implementation

**Implementation**:
```typescript
interface DesignElement {
  // ... existing fields
  contentWidth?: number;  // Actual content width (can be > width)
  contentHeight?: number; // Actual content height (can be > height)
}

// On add image
dispatch({
  type: 'ADD_ELEMENT',
  elementType: 'image',
  src,
  width: w,
  height: h,
  contentWidth: w,
  contentHeight: h,
});

// On resize (edge handle)
const contentAspect = (el.contentWidth || el.width) / (el.contentHeight || el.height);
let targetCW = Math.max(el.contentWidth || el.width, nextW);
let targetCH = targetCW / contentAspect;
if (targetCH < nextH) {
  targetCH = nextH;
  targetCW = targetCH * contentAspect;
}

// Render with clipping
ctx.beginPath();
ctx.rect(0, 0, el.width, el.height);
ctx.clip();
ctx.drawImage(img, 0, 0, el.contentWidth || el.width, el.contentHeight || el.height);
```

**Trade-offs**:
- ✅ Pro: Enables powerful image manipulation (pan, zoom within frame)
- ✅ Pro: Non-breaking (optional, defaults to width/height)
- ⚠️ Con: Adds complexity to resize logic
- ⚠️ Con: Must handle in export (video rendering needs to respect content dimensions)

**Mitigation**: Extensive testing with various resize scenarios

---

### Decision 6: Debug Mode Architecture

**Problem**: Need developer visibility without cluttering production UI.

**Options Considered**:
1. **Browser DevTools extension** - Requires installation, not portable
2. **React DevTools profiler** - Exists, but not specific to our metrics
3. **In-app toggle with floating overlay** - Self-contained, always available

**Decision**: In-app toggle with floating overlay (Option 3)

**Rationale**:
- No external dependencies
- Works in production, staging, development
- Can be screenshotted for bug reports
- Keyboard shortcut for quick access
- Pointer-events-none so doesn't block interactions

**Implementation**:
```typescript
// features/canvas/ui/DebugPanel.tsx
export const DebugPanel = ({ state, activePage }: Props) => {
  if (!state.debugMode) return null;

  return (
    <div className="absolute top-14 right-4 bg-black/80 text-white p-3 rounded font-mono text-xs z-50 pointer-events-none">
      <div className="font-bold border-b border-white/20 pb-1 mb-1">
        Debug Info
      </div>
      <div>Elements: <span className="text-green-400">{activePage.elements.length}</span></div>
      <div>Selected: <span className="text-blue-400">{state.selectedIds.length}</span></div>
      <div>Zoom: {Math.round(state.zoom * 100)}%</div>
      <div>Pan: {Math.round(state.pan.x)}, {Math.round(state.pan.y)}</div>
      {state.selectedIds.length === 1 && (
        <div className="pt-1 border-t border-white/20 mt-1">
          <div>ID: {state.selectedIds[0].substr(0, 6)}...</div>
          <div>X: {Math.round(element.x)}</div>
          <div>Y: {Math.round(element.y)}</div>
        </div>
      )}
    </div>
  );
};
```

**Trade-offs**:
- ✅ Pro: Always available, no setup required
- ✅ Pro: Can add performance metrics later (FPS, render time)
- ⚠️ Con: Adds ~1KB to bundle
- ⚠️ Con: Must ensure doesn't leak sensitive data in production

**Mitigation**: Use environment variable to disable in production if needed

---

## Architecture Integration

### How Transient State Fits into FSD

```
User Interaction
       ↓
Event Handler (mousemove)
       ↓
useTransientState.setTransient() ← Write to ref
       ↓
Render Loop (requestAnimationFrame)
       ↓
useTransientState.getElement() ← Read from ref, merge with Redux
       ↓
Canvas Drawing
       ↓
User Sees Update (60fps)

... on mouseup ...

commitTransients()
       ↓
dispatch(BATCH_UPDATE_ELEMENTS)
       ↓
Reducer Updates Redux State
       ↓
Operation Generator (if backend enabled)
       ↓
Backend API Sync
```

### File Organization

```
features/
  canvas/
    hooks/
      useCanvasEngine.tsx (existing, enhanced with transient state)
      useTransientState.ts (NEW)
      useResizeHandles.ts (NEW, extracted from useCanvasEngine)
      useSnapping.ts (NEW, extracted from useCanvasEngine)
    lib/
      snapping.ts (NEW, buildSnapTargets, calculateSnapOffset)
      resizing.ts (NEW, calculateCornerAspectLock)
    ui/
      Canvas.tsx (existing, minimal changes)
      DebugPanel.tsx (NEW)
  header/
    ui/
      Header.tsx (existing, add debug toggle + interactive zoom)
  sidebar/
    lib/
      imageHelpers.ts (NEW, addImageWithRatio)
    ui/
      Sidebar.tsx (existing, use addImageWithRatio)
shared/
  model/
    types.ts (existing, add contentWidth/Height + BATCH_UPDATE_ELEMENTS)
    store.ts (existing, add BATCH_UPDATE_ELEMENTS case)
```

### Testing Strategy

**Unit Tests** (`*.test.ts`):
- `useTransientState`: setTransient, getElement, commitTransients
- `buildSnapTargets`: with 0, 1, 10, 100 elements
- `addImageWithRatio`: various aspect ratios
- `calculateCornerAspectLock`: various ratios and directions

**Integration Tests** (`*.integration.test.tsx`):
- Drag with transient state enabled vs disabled (performance comparison)
- Resize from all 8 handles on rotated elements
- Snap to elements in complex layouts
- Debug mode toggle and metric updates

**Performance Tests** (`*.perf.test.ts`):
- Benchmark drag with 50 elements (must be < 16ms per frame)
- Benchmark snap target calculation with 100 elements (must be < 1ms)
- Measure FPS during 5-second continuous drag

---

## Risks / Trade-offs

### Risk 1: Transient State Desynchronization

**Description**: If transients aren't cleared on page switch/selection change, elements may appear in wrong position until mouseup.

**Likelihood**: Medium (easy to forget edge cases)

**Impact**: High (visual bugs, user confusion)

**Mitigation**:
- useEffect with dependencies: `[selectedIds, activePageId, isPlaying]`
- Clear transients in all 3 cases
- Integration tests for each case

---

### Risk 2: Backend Sync Timing Issues

**Description**: Operation generator might try to read element positions before transient commit, causing stale data in backend.

**Likelihood**: Low (operation generator triggers on dispatch, not during drag)

**Impact**: Medium (backend out of sync with frontend)

**Mitigation**:
- Ensure operation generator only runs on specific action types
- BATCH_UPDATE_ELEMENTS generates single operation with all updates
- Add integration test: drag → save template → reload → verify positions

---

### Risk 3: Increased Code Complexity

**Description**: Canvas hook grows from ~300 lines to ~600+ lines with all features.

**Likelihood**: High (already happening)

**Impact**: Medium (harder to maintain, onboard new devs)

**Mitigation**:
- Extract hooks: useTransientState, useResizeHandles, useSnapping
- Extract utilities: snapping.ts, resizing.ts
- Add comprehensive JSDoc comments
- Inline comments explaining each system

---

### Risk 4: Performance Regression from Snap Calculation

**Description**: Building snap targets every frame with 100+ elements could drop FPS.

**Likelihood**: Low (only during drag, and most users have < 50 elements)

**Impact**: Medium (defeats purpose of performance improvements)

**Mitigation**:
- Memoize snap targets (recalc only when elements change)
- Add performance.now() timings in debug mode
- Set performance budget: < 1ms per calculation
- If exceeded, implement spatial indexing (quadtree)

---

## Migration Plan

**Phase 1: Add without breaking** (Week 1)
- Add BATCH_UPDATE_ELEMENTS action (no usage yet)
- Add contentWidth/Height to types (optional fields)
- Add DebugPanel component (hidden by default)
- Add imageHelpers with addImageWithRatio (not used yet)

**Phase 2: Integrate transient state** (Week 2)
- Create useTransientState hook
- Update useCanvasEngine to use transient state
- Update render loop to merge transient data
- Performance test: verify 60fps improvement

**Phase 3: Add interaction features** (Week 3)
- Add 8 resize handles
- Add element snapping
- Add corner aspect lock
- Enable addImageWithRatio in Sidebar

**Phase 4: Polish** (Week 4)
- Enable debug mode toggle
- Make zoom input interactive
- Enable content width/height support
- Full QA pass

**Rollback**: Each phase is additive. If issues found, can feature-flag or disable specific enhancements while keeping others.

---

## Open Questions

1. **Should we add keyboard shortcut for debug mode?**
   - Proposal: Cmd/Ctrl+Shift+D
   - Concern: May conflict with browser shortcuts
   - Decision: Implement in Phase 4, make configurable

2. **Should corner aspect lock have modifier key to disable?**
   - Proposal: Hold Alt to unlock aspect ratio
   - Concern: Adds complexity, may confuse users
   - Decision: Defer to Phase 4, gather user feedback first

3. **Should snap threshold be configurable?**
   - Current: Hard-coded 10px
   - Proposal: User preference setting
   - Decision: Defer to future enhancement, keep simple for now

4. **Should we migrate App.old.tsx users to FSD?**
   - Concern: App.old.tsx may have external users
   - Decision: Keep both for now, deprecate App.old.tsx after Phase 4 complete and stable

---

## Success Metrics

**Performance**:
- ✅ Drag 50 elements at 60fps on 2015 MacBook
- ✅ Snap calculation < 1ms with 100 elements
- ✅ Render loop < 16ms per frame with debug mode enabled

**Functionality**:
- ✅ All 8 resize handles work on rotated elements (0°, 45°, 90°, 135°)
- ✅ Element snapping works with 10+ elements on canvas
- ✅ Images preserve aspect ratio (within ±1px)
- ✅ Corner resize maintains aspect (within ±0.1 ratio delta)
- ✅ Debug mode displays all metrics correctly

**Quality**:
- ✅ Zero ESLint warnings
- ✅ Zero TypeScript errors
- ✅ 100% test coverage for new utility functions
- ✅ Integration tests pass for all edge cases
- ✅ Manual QA sign-off

**Preservation**:
- ✅ All existing FSD features still work (backend, timeline, audio, animations, export)
- ✅ Template save/load works with new element properties
- ✅ Video export handles contentWidth/Height correctly

---

## References

- [App.old.tsx](src/components/GraphicEditor/App.old.tsx) - Source implementation
- [APP_OLD_vs_FSD_COMPARISON.md](APP_OLD_vs_FSD_COMPARISON.md) - Detailed analysis
- [CANVAS_FEATURES.md](CANVAS_FEATURES.md) - Original feature extraction
- [Feature-Sliced Design](https://feature-sliced.design/) - Architecture methodology
- [React useRef Hook](https://react.dev/reference/react/useRef) - Ref-based state documentation
