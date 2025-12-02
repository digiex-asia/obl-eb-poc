# Graphic Editor Design

## Context

The Graphic Editor is a timeline-based video/animation editor built with React and HTML5 Canvas API. It provides a comprehensive interface for creating multi-page compositions with visual elements, animations, and audio tracks. The implementation uses imperative Canvas rendering for performance and real-time interaction.

## Architecture Decisions

### State Management: useReducer Pattern

**Decision**: Use React `useReducer` hook for centralized state management instead of MobX or multiple useState hooks.

**Rationale**:

- Single source of truth for all editor state
- Predictable state updates through action dispatchers
- Easier to reason about complex state transitions
- No external dependencies required
- Better performance for frequent updates

**Implementation**: `AppState` interface defines all state, `Action` union type defines all possible actions, reducer function handles all state transitions.

### Rendering: HTML5 Canvas API

**Decision**: Use imperative Canvas API rendering instead of declarative React components (e.g., React Konva).

**Rationale**:

- Direct control over rendering for performance-critical operations
- Efficient animation loops with `requestAnimationFrame`
- No virtual DOM overhead for frequent updates
- Better control over rendering order and transformations
- Easier to implement complex visual effects

**Implementation**: `useCanvasEngine` hook manages canvas lifecycle, rendering loop, and input handling. Rendering occurs in a continuous animation frame loop.

### Element Hit Testing

**Decision**: Implement custom hit testing using coordinate transformation for rotated elements.

**Rationale**:

- Canvas API doesn't provide built-in hit testing
- Need to handle rotated elements correctly
- Must account for zoom and pan transformations
- Performance is critical for smooth interactions

**Implementation**: Elements are tested in reverse order (top to bottom), coordinates are transformed to element's local space accounting for rotation, then checked against element bounds.

### Audio Management: HTMLAudioElement Pool

**Decision**: Maintain a pool of `HTMLAudioElement` instances mapped by clip ID, reusing instances when possible.

**Rationale**:

- Avoids creating/destroying audio elements frequently
- Better performance for multiple overlapping clips
- Easier to manage playback state
- Supports seeking and synchronization

**Implementation**: `useAudioController` hook maintains a `Map<string, HTMLAudioElement>` and updates playback state based on timeline position.

### Image Caching

**Decision**: Cache loaded images in a ref-based Map to avoid reloading.

**Rationale**:

- Images may be used in multiple elements or thumbnails
- Reduces network requests and memory usage
- Improves rendering performance
- Supports cross-origin images

**Implementation**: `imageCache` ref in `useCanvasEngine` stores `HTMLImageElement` instances keyed by source URL.

### Timeline Zoom and Pan

**Decision**: Implement custom zoom and pan for timeline view using canvas-based ruler and scroll container.

**Rationale**:

- Need precise control over time-to-pixel mapping
- Canvas ruler provides better performance for many tick marks
- Custom scroll behavior needed for drag operations
- Zoom affects both visual scale and interaction precision

**Implementation**: Timeline uses a canvas element for the ruler, scroll container for panning, zoom state affects pixel-per-second calculation.

### Drag and Drop System

**Decision**: Use native HTML5 drag and drop API combined with custom mouse event handling.

**Rationale**:

- Native API provides good UX for dragging from sidebar
- Custom mouse handling needed for canvas interactions
- Different drag behaviors (move, resize, rotate) require custom logic
- Need to handle both drag-drop and click-to-add patterns

**Implementation**: Sidebar elements use `draggable` attribute, canvas uses mouse events for element manipulation, data transfer API for drag-drop communication.

## Performance Optimizations

### Canvas Rendering

- Uses `requestAnimationFrame` for smooth 60fps rendering
- Only re-renders when state changes (via useEffect dependencies)
- Device pixel ratio scaling for crisp rendering on high-DPI displays
- Efficient canvas clearing and redrawing

### Element Lookups

- Elements stored in arrays, accessed by index during rendering
- No complex data structures needed (unlike email builder with column layouts)
- Selection uses direct ID comparison

### Audio Synchronization

- Audio position updates only when timeline position changes significantly (>0.3s)
- Prevents excessive seeking operations
- Clips outside time range are paused immediately

### Image Loading

- Images loaded asynchronously with caching
- Thumbnails use same cache as main canvas
- Placeholder shown during loading

## Data Structures

### AppState

```typescript
interface AppState {
    pages: Page[];                    // Array of pages in timeline order
    audioLayers: AudioLayer[];         // Array of audio tracks

    // History for undo/redo
    past: ContentState[];              // Stack of previous states
    future: ContentState[];            // Stack of future states (after undo)

    activePageId: string;             // Currently selected page
    selectedElementId: string | null;  // Currently selected element
    selectedAudioId: string | null;    // Currently selected audio clip
    isPlaying: boolean;                // Playback state
    zoom: number;                      // Canvas zoom level
    pan: { x: number; y: number };    // Canvas pan offset
    currentTime: number;               // Timeline playhead position
    timelineHeight: number;            // Timeline panel height
    timelineZoom: number;              // Timeline zoom (pixels per second)
    contextMenu: { ... };             // Context menu state
    isSpacePressed: boolean;           // Space key state for panning
    isExporting: boolean;              // Video export in progress
    exportProgress: number;           // Export progress (0-1)
}
```

### ContentState

```typescript
interface ContentState {
    pages: Page[]; // Pages snapshot for history
    audioLayers: AudioLayer[]; // Audio layers snapshot for history
}
```

### DesignElement

```typescript
interface DesignElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    fill: string;
    opacity: number;
    text?: string; // For text elements
    fontSize?: number; // For text elements
    src?: string; // For image elements
    animation?: AnimationSettings;
}
```

### Page

```typescript
interface Page {
    id: string;
    duration: number; // Duration in seconds
    elements: DesignElement[];
    background: string; // Color or gradient
    animation?: AnimationSettings; // Page transition animation
}
```

### AudioLayer

```typescript
interface AudioLayer {
    id: string;
    clips: AudioClip[];
}
```

### AudioClip

```typescript
interface AudioClip {
    id: string;
    src: string;
    label: string;
    startAt: number; // Start time in timeline (seconds)
    duration: number; // Playback duration (seconds)
    offset: number; // Start offset within source file (seconds)
    totalDuration: number; // Total length of source file (seconds)
}
```

## Coordinate Systems

### Canvas Space

- Fixed canvas dimensions: 800x450px (16:9 aspect ratio)
- Origin at top-left (0, 0)
- Elements positioned in canvas space
- Transformations applied: translate to center, apply pan, apply zoom, translate back

### Screen Space

- Viewport coordinates relative to canvas element
- Converted to canvas space for hit testing and interactions
- Accounts for zoom, pan, and canvas centering

### Timeline Space

- Time-based coordinate system (seconds)
- Converted to pixels using `timelineZoom` (pixels per second)
- Horizontal position represents time
- Vertical position represents tracks (pages, audio layers)

## Animation System

### Element Animations

- Applied during timeline playback
- Types: fade, rise, pan, pop, shake, pulse, wiggle
- Configurable: speed (0.5x-3x), delay, direction, mode (enter/exit/both)
- Easing: quadratic ease-out (progress \* (2 - progress))

### Page Animations

- Applied when page appears in timeline
- Types: none, fade, slide, zoom, wipe
- Duration based on speed setting
- Opacity and transform animations

### Preview System

- Hover preview for animation types
- Uses temporary animation state
- Clears when mouse leaves

## Input Handling

### Mouse Events

- `mousedown`: Start drag operation (move, resize, rotate, pan)
- `mousemove`: Update drag operation
- `mouseup`: End drag operation
- `contextmenu`: Show context menu

### Keyboard Events

- `Cmd/Ctrl+Alt+N`: Add page
- `Cmd/Ctrl+D`: Duplicate page
- `Delete/Backspace`: Delete selected element or audio clip
- `Space + drag`: Pan canvas

### Drag Events

- `dragstart`: Initiate drag from sidebar
- `dragover`: Allow drop on canvas/timeline
- `drop`: Create element or audio clip at drop position

## Constraints and Limitations

### Canvas Size

- Fixed at 800x450px (16:9)
- Not responsive to viewport size
- Zoom and pan allow viewing different areas

### Element Types

- Limited to predefined shapes (rect, circle, triangle, star, hexagon, heart, diamond)
- Text elements support basic text rendering
- Image elements support external URLs (CORS required)

### Animation Types

- Predefined set of animation types
- No custom animation curves
- Animations are time-based, not frame-based

### Audio Format

- Supports any format supported by HTMLAudioElement
- Audio clips can be trimmed (start and end)
- Clips maintain offset and totalDuration for trimming support
- Audio mixing supported during video export via AudioContext

### Performance

- Designed for moderate complexity (10-50 elements per page, 5-10 pages)
- May struggle with very large compositions
- No virtualization for timeline or sidebar

## Future Considerations

### Undo/Redo System

**Decision**: Implement undo/redo using separate content state snapshots stored in past/future stacks.

**Rationale**:

- Separates content state (pages, audio layers) from UI state (zoom, pan, selection)
- Prevents UI state from interfering with undo/redo operations
- Simple stack-based approach is efficient and predictable
- Allows explicit checkpoint capture for continuous operations

**Implementation**:

- `ContentState` interface contains only `pages` and `audioLayers`
- `AppState` includes `past: ContentState[]` and `future: ContentState[]` arrays
- `createSnapshot()` helper creates content-only snapshots
- `pushHistory()` helper adds current state to past and clears future
- `UNDO` action: pops from past, pushes current to future
- `REDO` action: pops from future, pushes current to past
- `CAPTURE_CHECKPOINT` action: explicitly saves state before continuous operations
- History is captured automatically for discrete operations (add, delete, etc.)
- History is captured explicitly at start of continuous operations (resize, rotate, drag)

**Keyboard Shortcuts**:

- Cmd/Ctrl+Z: Undo
- Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y: Redo
- Platform detection for Mac vs Windows modifier keys

**UI Integration**:

- Undo/Redo buttons in top bar
- Buttons disabled when no history available
- Selection cleared on undo/redo to prevent invalid references

### Audio Clip Trimming

**Decision**: Support trimming audio clips by dragging left/right edges, similar to page duration resizing.

**Rationale**:

- Consistent UX with page duration resizing
- Allows precise control over audio clip boundaries
- Essential for professional video editing workflows
- Visual feedback during trimming improves usability

**Implementation**:

- Resize handles on left and right edges of audio clips
- Left edge: trims start (increases startAt, decreases duration)
- Right edge: trims end (decreases duration, startAt unchanged)
- Minimum duration enforced (prevents zero or negative duration)
- History checkpoint captured at start of trim operation
- Continuous trim updates don't create multiple history entries
- Cursor changes to `ew-resize` on handles

**Visual Design**:

- Handles visible on selected or hovered clips
- Handles styled distinctly (e.g., different color, hover effect)
- Real-time visual feedback during drag operation

### Video Export System

**Decision**: Use Web Workers with OffscreenCanvas for video rendering, AudioContext for audio mixing, and MediaRecorder for final encoding.

**Rationale**:

- OffscreenCanvas allows rendering in a worker thread without blocking UI
- AudioContext provides precise audio scheduling and mixing
- MediaRecorder API supports real-time encoding of combined video/audio streams
- Worker-based rendering prevents UI freezing during export
- Progress tracking enables user feedback during long exports

**Implementation**:

- `useVideoExporter` hook manages export lifecycle
- Hidden canvas created and transferred to worker via `transferControlToOffscreen()`
- Worker renders frames at 30 FPS using same rendering logic as main canvas
- Audio clips loaded via `fetch()` and decoded with `AudioContext.decodeAudioData()`
- Audio sources scheduled with `source.start(when, offset, duration)` to respect trimming
- Video stream captured via `canvas.captureStream(30)`
- Audio and video streams combined into single `MediaStream`
- MediaRecorder encodes with MP4 (preferred) or WebM (fallback) codec
- Progress updates sent from worker to main thread
- Final blob downloaded automatically when recording stops

**Export State**:

- `isExporting`: Boolean flag indicating export in progress
- `exportProgress`: Number (0-1) representing export completion percentage
- Export button disabled during export to prevent multiple simultaneous exports

**Audio Trimming in Export**:

- `offset` field determines where in source file playback starts
- `duration` field determines how long clip plays
- `source.start(audioContext.currentTime + clip.startAt, clip.offset, clip.duration)` schedules trimmed playback
- Only clips that start within video duration are included

### JSON Export System

**Decision**: Export project data as JSON in Konva-compatible scene graph format.

**Rationale**:

- Konva format enables backend processing and compatibility with Konva-based systems
- JSON is human-readable and easy to parse
- Preserves all project data including custom properties
- Enables project saving and loading functionality

**Implementation**:

- `exportToJSON()` function transforms AppState to Konva format
- Structure: Stage (root) -> Layers (pages) -> Shapes (elements)
- Each element mapped to appropriate Konva className (Rect, Circle, Text, Image, etc.)
- Custom properties (duration, background, animation) preserved in attrs
- Audio layers included as separate top-level property
- JSON stringified with 2-space indentation for readability
- Blob created and downloaded as "project-export.json"

**Format Structure**:

```typescript
{
    attrs: { width, height },
    className: 'Stage',
    children: [ // Pages as Layers
        {
            className: 'Layer',
            attrs: { name, id, duration, background },
            children: [ // Elements as Shapes
                {
                    className: 'Rect' | 'Circle' | 'Text' | ...,
                    attrs: { id, x, y, width, height, rotation, opacity, fill, ... }
                }
            ]
        }
    ],
    audioLayers: [ /* AudioLayer[] */ ]
}
```

### Potential Enhancements

- Video element support
- More animation types and custom curves
- Audio waveform visualization
- Layer grouping
- Copy/paste between pages
- Keyboard shortcuts for all operations
- Multi-select for elements
- Alignment guides and snapping
- Grid and ruler overlays
- Audio fade in/out effects
- Audio volume control per clip
- Export quality settings (resolution, bitrate)
- Export format selection (MP4, WebM, GIF)
- Project import/load functionality

### Technical Debt

- Large single-file component (2900+ lines) could be split
- Some magic numbers could be constants
- Animation system could be more extensible
- Audio synchronization could be more robust
- Error handling for failed image/audio loads
- History stack could have maximum size limit to prevent memory issues
