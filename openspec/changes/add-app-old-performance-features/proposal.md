# Change: Add App.old.tsx Performance and UX Features to GraphicEditor FSD

## Why

The legacy `App.old.tsx` implementation contains several critical performance optimizations and UX enhancements that are missing in the current Feature-Sliced Design (FSD) GraphicEditor implementation. While the FSD architecture provides superior maintainability, backend integration, and feature modularity, it lacks key interaction refinements that made `App.old.tsx` performant and pleasant to use.

**Key Problems Solved:**
1. **Laggy dragging on slower devices** - Current FSD dispatches Redux actions on every mousemove, causing frame drops
2. **Imprecise element resizing** - Only 4 corner handles limit control; users can't resize width/height independently
3. **Difficult alignment** - Only canvas-center snapping; no element-to-element alignment guides
4. **Distorted images** - Images added at fixed 200x200 size lose aspect ratio
5. **Accidental element distortion** - Corner resize doesn't lock aspect ratio
6. **Missing debug tools** - No developer visibility into state for troubleshooting
7. **Manual zoom control** - Can't type exact zoom values, must use buttons/scroll

## What Changes

This change ports **9 critical features** from `App.old.tsx` into the FSD GraphicEditor while **preserving all existing FSD advantages** (backend integration, timeline, audio, animations, video export, modular architecture).

### Phase 1: Performance & Core UX (High Priority)

1. **Transient State System** - Lag-free dragging via ref-based intermediate state
   - Store drag positions in refs during mousemove (no Redux dispatches)
   - Render using ref data
   - Commit to Redux only on mouseup
   - ~60x reduction in state updates during drag operations

2. **BATCH_UPDATE_ELEMENTS Action** - Efficient multi-element updates
   - New reducer action: `BATCH_UPDATE_ELEMENTS` with `updates: { id, attrs }[]`
   - Allows different updates for different elements in single action
   - Required for transient state system to commit efficiently

3. **Image Aspect Ratio Preservation** - Prevent distorted images
   - Auto-calculate width/height from `img.naturalWidth/Height` on add/drop
   - Scale down to max 400px width while maintaining aspect
   - Center images on drop point

### Phase 2: Enhanced Interaction (Medium Priority)

4. **8 Resize Handles** - Complete resize control
   - Add 4 edge handles (N, E, S, W) to existing 4 corner handles
   - Visual distinction: circles for corners, pills for edges
   - Independent width/height control via edge handles

5. **Element-to-Element Snapping** - Precise alignment
   - Build snap targets from all non-selected elements (left, center, right, top, middle, bottom)
   - Snap to nearest target within threshold (10px)
   - Show guide lines at snap positions

6. **Corner Resize Aspect Lock** - Prevent accidental distortion
   - Automatically maintain aspect ratio when resizing from corners
   - Calculate aspect from current bounds, apply to both axes
   - Unlock with modifier key (optional future enhancement)

7. **Content Width/Height for Images** - Advanced image manipulation
   - Add `contentWidth` and `contentHeight` to DesignElement interface
   - Allow content dimensions to exceed visible dimensions (zoom effect)
   - Maintain content aspect ratio during edge resizing

### Phase 3: Developer Experience (Low Priority)

8. **Debug Mode** - Developer visibility
   - Toggle debug panel in header (Bug icon)
   - Display: element count, selected count, zoom, pan, selected element details
   - Positioned top-right as floating overlay
   - Keyboard shortcut: Cmd/Ctrl+Shift+D (optional)

9. **Interactive Zoom Input** - Precise zoom control
   - Make zoom percentage input editable
   - Enter to apply, auto-clamp 10-500%
   - Focus on click, select all text for quick replacement

## Impact

### Affected Specs
- `graphic-editor` - Add/modify requirements for canvas interaction, element management

### Affected Code
- `shared/model/types.ts` - Add contentWidth/Height to DesignElement, add BATCH_UPDATE_ELEMENTS action
- `shared/model/store.ts` - Add BATCH_UPDATE_ELEMENTS reducer case
- `features/canvas/hooks/useCanvasEngine.tsx` - Integrate transient state system, 8 handles, element snapping, aspect locking
- `features/canvas/ui/Canvas.tsx` - Add debug mode overlay
- `features/header/ui/Header.tsx` - Make zoom input interactive, add debug toggle
- `features/sidebar/ui/Sidebar.tsx` - Update image add/drop handler to preserve aspect

### Breaking Changes
**None** - All changes are additive. Existing functionality is preserved.

### Migration Path
No migration required. All features are opt-in enhancements. Existing templates/data remain compatible.

## Success Criteria

1. **Drag performance**: 60fps dragging with 50+ elements on mid-range device
2. **Image aspect**: Images added from sidebar match original aspect ratio (±1px)
3. **Snapping**: Elements snap to other elements within 10px threshold
4. **Resize handles**: 8 handles render correctly, edge handles resize single axis
5. **Corner aspect**: Corner resize maintains aspect ratio (±0.1 ratio delta)
6. **Debug mode**: All metrics display correctly and update in real-time
7. **Zoom input**: Typing zoom value and pressing Enter applies correctly

## Risks & Mitigation

### Risk 1: Transient state sync issues
- **Mitigation**: Clear transient state on mouseup, selection change, page switch
- **Fallback**: If sync issues occur, can disable and revert to direct updates

### Risk 2: Increased code complexity in canvas hook
- **Mitigation**: Extract into separate hooks (useTransientState, useResizeHandles, useSnapping)
- **Documentation**: Add inline comments explaining each system

### Risk 3: Performance regression from additional calculations
- **Mitigation**: Benchmark before/after, optimize snap target calculation with spatial indexing if needed
- **Monitoring**: Add performance.now() timings in debug mode

## References

- `APP_OLD_vs_FSD_COMPARISON.md` - Detailed feature comparison and code examples
- `CANVAS_FEATURES.md` - Original feature extraction document
- `App.old.tsx:538-1430` - Transient state implementation
- `App.old.tsx:842-995` - 8 resize handles and hit detection
- `App.old.tsx:1122-1381` - Element snapping logic
