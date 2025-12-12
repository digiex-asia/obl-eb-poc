# Implementation Tasks

## Phase 1: Performance & Core UX (Critical) ✅

### 1.1 Add BATCH_UPDATE_ELEMENTS Action ✅
- [x] 1.1.1 Add `BATCH_UPDATE_ELEMENTS` action type to `shared/model/types.ts`
- [x] 1.1.2 Add action interface: `{ type: 'BATCH_UPDATE_ELEMENTS'; updates: { id: string; attrs: Partial<DesignElement> }[] }`
- [x] 1.1.3 Implement reducer case in `shared/model/store.ts`
- [x] 1.1.4 Create Map for efficient lookups: `updateMap = new Map(updates.map(u => [u.id, u.attrs]))`
- [x] 1.1.5 Test with 10+ elements, verify all updates applied correctly

### 1.2 Implement Transient State System ✅
- [x] 1.2.1 Create `features/canvas/hooks/useTransientState.ts` hook
- [x] 1.2.2 Add `transientState` ref: `useRef<Map<string, Partial<DesignElement>>>(new Map())`
- [x] 1.2.3 Update mousemove handlers to write to transient state instead of dispatching
- [x] 1.2.4 Modify render loop in `useCanvasEngine` to merge transient data: `const el = transient ? { ...baseEl, ...transient } : baseEl`
- [x] 1.2.5 Commit transient state on mouseup using BATCH_UPDATE_ELEMENTS
- [x] 1.2.6 Clear transient state on selection change, page switch, playback start
- [x] 1.2.7 Performance test: Drag 50 elements, verify 60fps on mid-range device

### 1.3 Image Aspect Ratio Preservation ✅
- [x] 1.3.1 Create `addImageWithRatio` helper in `features/sidebar/lib/imageHelpers.ts`
- [x] 1.3.2 Load image, read naturalWidth/Height
- [x] 1.3.3 Scale down if width > 400px, maintain aspect ratio
- [x] 1.3.4 Center image on drop point (subtract half dimensions)
- [x] 1.3.5 Update `Sidebar.tsx` image onClick and onDragStart to use helper
- [x] 1.3.6 Update `Canvas.tsx` onDrop handler to use helper
- [x] 1.3.7 Test: Add landscape image (600x400), verify scaled to 400x267
- [x] 1.3.8 Test: Add portrait image (400x600), verify scaled to 267x400
- [x] 1.3.9 Test: Drop image at specific position, verify centered correctly

## Phase 2: Enhanced Interaction (Important) ✅

### 2.1 Add 8 Resize Handles ✅
- [x] 2.1.1 Update `getHandleUnderMouse` in `useCanvasEngine` to detect 8 handles: nw, n, ne, e, se, s, sw, w
- [x] 2.1.2 Create `drawResizeHandles` function in render loop
- [x] 2.1.3 Draw circles for corner handles (nw, ne, se, sw)
- [x] 2.1.4 Draw pills for edge handles (n, e, s, w) - use `ctx.roundRect()` with horizontal/vertical orientation
- [x] 2.1.5 Add rotation support to hit detection (rotate mouse coords before checking)
- [x] 2.1.6 Update resize logic to handle single-axis changes for edge handles
- [x] 2.1.7 Test: Resize from north handle, verify only height changes
- [x] 2.1.8 Test: Resize from east handle, verify only width changes
- [x] 2.1.9 Test: Resize rotated element (45°), verify handles work correctly

### 2.2 Element-to-Element Snapping ✅
- [x] 2.2.1 Create `buildSnapTargets` function in `features/canvas/lib/snapping.ts`
- [x] 2.2.2 Iterate all non-selected elements, extract 6 snap points each (x, x+w/2, x+w, y, y+h/2, y+h)
- [x] 2.2.3 Add canvas center points (CANVAS_WIDTH/2, CANVAS_HEIGHT/2)
- [x] 2.2.4 Update drag logic to calculate snap offsets for both axes
- [x] 2.2.5 Find nearest snap target within 10px threshold
- [x] 2.2.6 Apply snap offset to drag delta
- [x] 2.2.7 Store active snap guide positions in ref: `activeSnapGuides.current = { x: [guide], y: [guide] }`
- [x] 2.2.8 Render snap guides as pink dashed lines in render loop
- [x] 2.2.9 Test: Drag rect near another rect's edge, verify snap and guide display
- [x] 2.2.10 Test: Drag rect to canvas center, verify snap to center guides

### 2.3 Corner Resize Aspect Lock ✅
- [x] 2.3.1 Detect corner handles: `const isCorner = handle?.length === 2` (nw, ne, se, sw)
- [x] 2.3.2 Calculate current aspect ratio: `const aspect = oldBoundsW / oldBoundsH`
- [x] 2.3.3 Determine dominant axis: `if (Math.abs(changeW) > Math.abs(changeH))`
- [x] 2.3.4 Apply aspect to secondary axis: `changeH = changeW / aspect` or `changeW = changeH * aspect`
- [x] 2.3.5 For multi-select, scale all elements proportionally
- [x] 2.3.6 Test: Resize rect from se corner, verify aspect maintained (100x100 → 200x200, not 200x150)
- [x] 2.3.7 Test: Resize multi-select from corner, verify all elements scale proportionally

### 2.4 Content Width/Height for Images ✅
- [x] 2.4.1 Add `contentWidth?: number` to DesignElement interface in `shared/model/types.ts`
- [x] 2.4.2 Add `contentHeight?: number` to DesignElement interface
- [x] 2.4.3 Initialize contentWidth/Height on image add: `contentWidth: w, contentHeight: h`
- [x] 2.4.4 Update resize logic to maintain content aspect ratio
- [x] 2.4.5 For corner resize: scale content proportionally `nextCW = (init.cw || init.w) * scaleX`
- [x] 2.4.6 For edge resize: allow content overflow `targetCW = Math.max(init.cw, nextW)`, maintain aspect
- [x] 2.4.7 Update image rendering to use contentWidth/Height for drawImage
- [x] 2.4.8 Implement clipping rect to visible bounds
- [x] 2.4.9 Test: Add image 400x400, resize to 200x200 via edge handle, verify content shows 400x400 (zoom effect)
- [x] 2.4.10 Test: Resize back to 400x400, verify content fills frame

## Phase 3: Developer Experience (Nice-to-Have) ✅

### 3.1 Debug Mode ✅
- [x] 3.1.1 Add `debugMode` state to App.tsx: `const [debugMode, setDebugMode] = useState(false)`
- [x] 3.1.2 Add Bug icon button to Header.tsx with toggle handler
- [x] 3.1.3 Create `DebugPanel` component in `features/canvas/ui/DebugPanel.tsx`
- [x] 3.1.4 Display metrics: element count, selected count, zoom %, pan x/y
- [x] 3.1.5 Display selected element details: ID, x, y, width, height, rotation
- [x] 3.1.6 Style as floating overlay (top-right, black/80, white text, monospace)
- [x] 3.1.7 Make pointer-events-none to avoid blocking clicks
- [x] 3.1.8 Test: Toggle debug mode, verify all metrics display correctly
- [x] 3.1.9 Test: Select element, verify details update

### 3.2 Interactive Zoom Input ✅
- [x] 3.2.1 Add `zoomInput` state to Header.tsx: `const [zoomInput, setZoomInput] = useState('100')`
- [x] 3.2.2 Add `inputRef` to zoom input element
- [x] 3.2.3 Sync zoomInput with state.zoom on change (if not focused)
- [x] 3.2.4 Add onChange handler: allow only digits, update zoomInput state
- [x] 3.2.5 Add onKeyDown handler: on Enter, parse int, clamp 10-500, dispatch SET_ZOOM, blur input
- [x] 3.2.6 Add onBlur handler: validate and restore valid value or current zoom
- [x] 3.2.7 Add focus helper: select all text on focus for quick replacement
- [x] 3.2.8 Test: Type "250" and press Enter, verify zoom applies to 250%
- [x] 3.2.9 Test: Type "999" and press Enter, verify clamped to 500%
- [x] 3.2.10 Test: Type "abc", verify reverts to current zoom on blur

## Phase 4: Testing & Validation

### 4.1 Unit Tests
- [ ] 4.1.1 Test BATCH_UPDATE_ELEMENTS reducer with 10 updates
- [ ] 4.1.2 Test buildSnapTargets with 5 elements, verify 30+ snap points
- [ ] 4.1.3 Test addImageWithRatio with various aspect ratios
- [ ] 4.1.4 Test corner aspect lock calculation with different ratios
- [ ] 4.1.5 Test content width/height resize logic

### 4.2 Integration Tests
- [ ] 4.2.1 Test transient state with multi-select drag (10 elements)
- [ ] 4.2.2 Test 8 handles on rotated elements (0°, 45°, 90°)
- [ ] 4.2.3 Test element snapping with complex layouts (10+ elements)
- [ ] 4.2.4 Test image aspect preservation through add, drop, resize
- [ ] 4.2.5 Test debug mode with all scenarios (empty, single, multi-select)

### 4.3 Performance Tests
- [ ] 4.3.1 Benchmark drag with 50 elements: before (transient disabled) vs after (transient enabled)
- [ ] 4.3.2 Measure FPS during continuous drag for 5 seconds
- [ ] 4.3.3 Verify snap target calculation < 1ms with 100 elements
- [ ] 4.3.4 Profile render loop with debug mode enabled, verify < 2ms overhead
- [ ] 4.3.5 Test on low-end device (2015 MacBook), verify acceptable performance

### 4.4 Manual QA
- [ ] 4.4.1 Add 20 shapes, drag multi-select smoothly, verify no lag
- [ ] 4.4.2 Add images of various sizes/aspects, verify all preserve aspect
- [ ] 4.4.3 Resize elements from all 8 handles, verify correct behavior
- [ ] 4.4.4 Drag elements near each other, verify snapping and guides
- [ ] 4.4.5 Resize from corners, verify aspect locked
- [ ] 4.4.6 Toggle debug mode, verify metrics accurate
- [ ] 4.4.7 Type zoom values, verify input works smoothly
- [ ] 4.4.8 Test with backend integration (template save/load), verify no regressions
- [ ] 4.4.9 Test timeline/audio features, verify no interference
- [ ] 4.4.10 Export video, verify no issues with new element properties

## Phase 5: Documentation & Cleanup

### 5.1 Code Documentation
- [ ] 5.1.1 Add JSDoc comments to useTransientState hook
- [ ] 5.1.2 Add JSDoc comments to buildSnapTargets function
- [ ] 5.1.3 Add JSDoc comments to addImageWithRatio helper
- [ ] 5.1.4 Add inline comments explaining transient state flow
- [ ] 5.1.5 Add inline comments explaining 8-handle hit detection

### 5.2 User Documentation
- [ ] 5.2.1 Update CANVAS_FEATURES.md with new FSD feature list
- [ ] 5.2.2 Add performance tips section (transient state benefits)
- [ ] 5.2.3 Document debug mode keyboard shortcut (if added)
- [ ] 5.2.4 Update README with new capabilities

### 5.3 Cleanup
- [ ] 5.3.1 Remove any console.log debugging statements
- [ ] 5.3.2 Remove commented-out code
- [ ] 5.3.3 Format all changed files with Prettier
- [ ] 5.3.4 Run ESLint, fix all warnings (must be 0)
- [ ] 5.3.5 Verify TypeScript compiles with no errors
- [ ] 5.3.6 Archive App.old.tsx to archive/ folder (keep for reference)

## Acceptance Criteria

- [ ] All Phase 1-3 tasks completed
- [ ] All tests pass (unit, integration, performance)
- [ ] Manual QA sign-off on all scenarios
- [ ] Zero ESLint warnings
- [ ] Zero TypeScript errors
- [ ] Code formatted with Prettier
- [ ] Documentation updated
- [ ] Drag performance: 60fps with 50+ elements
- [ ] Image aspect: All images preserve original aspect ratio
- [ ] Snapping: Elements snap to other elements within 10px
- [ ] Resize: All 8 handles work correctly on rotated elements
- [ ] Debug mode: All metrics display and update correctly
- [ ] Zoom input: Keyboard input works and validates correctly
- [ ] No regressions: All existing FSD features still work (backend, timeline, audio, animations, export)
