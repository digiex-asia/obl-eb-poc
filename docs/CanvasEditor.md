# CanvasEditor Documentation

## Overview

`CanvasEditor` is an email builder component that uses the HTML5 Canvas API for rendering. It implements an imperative rendering approach where the entire canvas is redrawn on each state change. The component uses React's `useReducer` hook for state management, following a unidirectional data flow pattern.

---

## 1. Code Design

### Architecture Pattern

**Imperative Canvas API Rendering**
- The editor uses the HTML5 Canvas API with imperative drawing commands
- All rendering happens in a single `render()` function that clears and redraws the entire canvas
- No virtual DOM or component tree - direct manipulation of canvas context

**State Management: useReducer Pattern**
- Uses React's `useReducer` hook with a centralized `editorReducer` function
- State updates are dispatched via action objects with discriminated union types
- All state mutations go through the reducer, ensuring predictable state transitions

**Custom Canvas Engine Hook**
- `useCanvasEngine` hook encapsulates all canvas rendering logic
- Handles canvas setup, DPR (device pixel ratio) scaling, and event listeners
- Manages image caching and loading
- Re-renders canvas on state changes, scroll, and window resize

**Multi-Pass Rendering Strategy**
- **PASS 1**: Draw content and elements (rows, backgrounds, elements)
- **PASS 2**: Draw row controls for hovered rows
- **PASS 3**: Draw selected row controls (borders, buttons, resize handles)
- **PASS 4**: Draw selected element on top (with resize handles)

This ensures proper z-ordering: content → hover → selection → selected element

**Event Delegation Pattern**
- Mouse events are handled at the canvas level, not individual elements
- Hit detection is performed manually using coordinate calculations
- `dragInfo` ref stores current drag operation state to avoid closure issues

### Component Structure

```
CanvasEditor (Main Component)
├── useCanvasEngine (Custom Hook)
│   ├── Canvas setup & DPR scaling
│   ├── Image caching
│   ├── Render function (multi-pass)
│   └── Event listeners (scroll, resize)
├── Event Handlers
│   ├── handleMouseDown (hit detection, drag start)
│   ├── handleMouseMove (drag operations, hover)
│   ├── handleMouseUp (drag end, commit changes)
│   ├── handleDragOver (drop target detection)
│   └── handleDrop (element/row addition)
└── Shared Components
    ├── Sidebar (layout/component palette)
    ├── TopBar (dimensions display)
    ├── ZoomControls (zoom UI)
    └── ColorPicker (color selection)
```

### Coordinate System and Transformations

**Coordinate Systems:**
- **Screen Coordinates**: Pixel positions relative to viewport (e.g., `e.clientX`, `e.clientY`)
- **Logical Coordinates**: Positions in the unzoomed canvas space (e.g., `logicalX`, `logicalY`)
- **Paper Coordinates**: Positions relative to the centered canvas paper (e.g., `paperX`)

**Key Transformations:**
```typescript
// Screen to Logical
const logicalX = (mouseScreenX - paperScreenX) / zoom;
const logicalY = (mouseScreenY + scrollY) / zoom - 40;

// Paper Screen Positioning
const paperScreenW = CANVAS_WIDTH * zoom;
const paperScreenX = (viewportWidth - paperScreenW) / 2;

// Canvas Transform
ctx.translate(paperScreenX, -scrollY);
ctx.scale(zoom, zoom);
```

---

## 2. Flow

### Component Lifecycle and Initialization

1. **Component Mount**
   - `useReducer` initializes with `initialState`
   - `useRef` creates refs for canvas, container, and dragInfo
   - `useCanvasEngine` hook sets up canvas and rendering

2. **Canvas Setup** (in `useCanvasEngine`)
   - Get canvas context
   - Set up DPR scaling for retina displays
   - Initialize image cache
   - Attach scroll and resize listeners

3. **Initial Render**
   - Calculate viewport dimensions
   - Set canvas size (accounting for DPR)
   - Call `render()` function

### Event Handling Flow

**Mouse Down Flow:**
```
User clicks canvas
  → handleMouseDown called
  → getCanvasCoords converts to logical coordinates
  → Hit detection (row resize, add button, column resize, element, row)
  → Set dragInfo ref with operation type
  → Dispatch SELECT_ROW or SELECT_ELEMENT action
```

**Mouse Move Flow:**
```
Mouse moves
  → handleMouseMove called (via window listener)
  → Check dragInfo.active
  → Calculate delta from start position
  → Dispatch UPDATE_ELEMENT, UPDATE_ROW_HEIGHT, or RESIZE_COLUMN
  → Reducer updates state
  → Canvas re-renders
```

**Mouse Up Flow:**
```
Mouse released
  → handleMouseUp called
  → Commit drag operation
  → Handle row transitions (MOVE_ELEMENT)
  → Handle row reordering (REORDER_ROW)
  → Clear dragInfo
```

### State Update Flow

```
User Action
  → Event Handler
  → dispatch({ type: 'ACTION_TYPE', ...payload })
  → editorReducer(state, action)
  → New state returned
  → Component re-renders
  → useCanvasEngine useEffect triggers
  → render() function called
  → Canvas redrawn
```

### Rendering Pipeline

**Canvas Render Function:**
1. Clear canvas and fill background
2. Apply zoom transform (translate + scale)
3. Draw paper background with shadow
4. **PASS 1**: Iterate rows, draw backgrounds, elements (skip selected element)
5. Draw reorder line if active
6. **PASS 2**: Draw hovered row controls
7. **PASS 3**: Draw selected row controls (borders, buttons, resize pill, badge, drag handle)
8. **PASS 4**: Draw selected element on top with resize handles
9. Restore canvas context

### Drag and Drop Flow

**Element Drag:**
```
Drag Start (mousedown on element)
  → Set dragInfo.type = 'element'
  → Store initial position

Drag Move
  → Calculate new position (initial + delta)
  → Dispatch UPDATE_ELEMENT
  → Element moves visually

Drag End
  → Check if element moved to different row
  → Dispatch MOVE_ELEMENT if needed
  → Update row heights
```

**Row Resize:**
```
Drag Start (mousedown on resize pill)
  → Set dragInfo.type = 'rowResize'
  → Store initial height

Drag Move
  → Calculate new height (initial + deltaY)
  → Dispatch UPDATE_ROW_HEIGHT
  → Row expands/contracts

Drag End
  → Final height committed
```

**Column Resize:**
```
Drag Start (mousedown on column divider)
  → Set dragInfo.type = 'colResize'
  → Store divider index

Drag Move
  → Calculate deltaX in percentage
  → Dispatch RESIZE_COLUMN with deltaPct
  → Update layout array
  → Show percentage labels

Drag End
  → Layout finalized
```

---

## 3. Terminology

### Core Concepts

**Row**
- A horizontal container that holds elements
- Has: `id`, `height`, `layout` (column percentages), `elements[]`, `backgroundColor`
- Can be selected, hovered, resized, reordered, or deleted

**Element**
- A visual component within a row (rect, circle, text, image, etc.)
- Has: `id`, `type`, `x`, `y`, `width`, `height`, `fill`, optional `src`/`text`
- Can be selected, hovered, dragged, resized, or deleted

**Layout**
- Array of percentages defining column widths (e.g., `[50, 50]` = two equal columns)
- Sum must equal 100
- Used to calculate column boundaries for element placement

**Column**
- A vertical section within a row defined by layout percentages
- Columns can be resized by dragging dividers
- Elements are placed within columns

**Paper**
- The centered canvas area where content is drawn
- Fixed width: `CANVAS_WIDTH` (600px)
- Height: Sum of all row heights
- Positioned in viewport center with `paperScreenX` offset

**Viewport**
- The visible area of the scrollable container
- Width: Container client width
- Height: Container client height
- Scroll position affects logical coordinate calculations

### Coordinate Systems

**Screen Coordinates**
- Pixel positions relative to browser viewport
- Examples: `e.clientX`, `e.clientY`, `rect.left`, `rect.top`
- Used for mouse event handling

**Logical Coordinates**
- Positions in unzoomed canvas space
- Examples: `logicalX`, `logicalY`
- Used for element positioning and hit detection
- Calculated: `(screenCoord - offset) / zoom`

**Paper Coordinates**
- Positions relative to the canvas paper (0 to CANVAS_WIDTH)
- Example: `paperX` (0-600 range)
- Used for element placement within rows

### State Types

**selectedRowId**
- ID of currently selected row (or `null`)
- Only one row can be selected at a time
- Selection shows borders, resize handles, add buttons, badge, drag handle

**selectedElementId**
- ID of currently selected element (or `null`)
- Only one element can be selected at a time
- Selection shows pink border and 4 corner resize handles

**hoveredElementId**
- ID of element under mouse cursor (or `null`)
- Shows pink border on hover
- Used for visual feedback

**hoveredRowId**
- ID of row under mouse cursor (or `null`)
- Shows light blue border on hover
- Used for visual feedback

**dragTarget**
- Object: `{ rowId: string, colIndex: number }` or `null`
- Indicates which column is the drop target during drag
- Shows green highlight on target column

**reorderTargetIndex**
- Number index or `null`
- Indicates where a row will be inserted during reorder drag
- Shows blue line at insertion point

### Action Types

**Row Actions:**
- `ADD_OR_UPDATE_ROW_LAYOUT`: Add new row or update selected row's layout
- `ADD_SPECIAL_BLOCK`: Add divider/spacer/freeform block
- `DUPLICATE_ROW`: Duplicate a row
- `SELECT_ROW`: Select/deselect a row
- `UPDATE_ROW_HEIGHT`: Change row height
- `REORDER_ROW`: Move row to new position
- `DELETE_SELECTION`: Delete selected row/element

**Element Actions:**
- `ADD_ELEMENT`: Add element to row
- `UPDATE_ELEMENT`: Update element properties (position, size, etc.)
- `MOVE_ELEMENT`: Move element to different row
- `SELECT_ELEMENT`: Select an element
- `DUPLICATE_SELECTION`: Duplicate selected element

**Column Actions:**
- `RESIZE_COLUMN`: Adjust column widths by percentage

**UI Actions:**
- `SET_HOVERED_ELEMENT`: Set hovered element
- `SET_HOVERED_ROW`: Set hovered row
- `SET_DRAG_TARGET`: Set drop target
- `SET_REORDER_TARGET`: Set reorder insertion point
- `SET_ZOOM`: Change zoom level
- `SET_SELECTION_COLOR`: Change background/fill color

### Transform Concepts

**zoom**
- Scale factor for canvas (0.1 to 5.0)
- Applied via `ctx.scale(zoom, zoom)`
- Affects all coordinate calculations

**paperScreenX**
- Horizontal offset to center canvas in viewport
- Calculated: `(viewportWidth - CANVAS_WIDTH * zoom) / 2`
- Used in `ctx.translate(paperScreenX, -scrollY)`

**logicalScrollY**
- Scroll position converted to logical coordinates
- Calculated: `scrollY / zoom`
- Used to determine visible row range

**dragInfo**
- Ref object storing current drag operation state
- Contains: `active`, `type`, `rowId`, `elId`, `startX`, `startY`, `initialX`, `initialY`, `initialW`, `initialH`
- Prevents closure stale state issues in window event listeners

---

## 4. Main Logic

### Row Management

**Adding Rows:**
```typescript
// Via sidebar layout click or drag-drop
dispatch({
  type: 'ADD_OR_UPDATE_ROW_LAYOUT',
  layout: [50, 50], // column percentages
  index: 1, // optional insertion index
  forceAdd: true, // force add even if row selected
  minHeight: 150 // optional minimum height
});
```

**Resizing Rows:**
```typescript
// Drag resize pill at bottom of selected row
// In handleMouseMove:
if (dragInfo.type === 'rowResize') {
  const dy = (e.clientY - dragInfo.startY) / state.zoom;
  dispatch({
    type: 'UPDATE_ROW_HEIGHT',
    rowId: dragInfo.rowId,
    height: dragInfo.initialH + dy
  });
}
```

**Reordering Rows:**
```typescript
// Drag dots handle on right side of selected row
// Calculate target index based on Y position
// On mouseup:
dispatch({
  type: 'REORDER_ROW',
  fromIndex: dragInfo.draggedRowIndex,
  toIndex: state.reorderTargetIndex
});
```

**Deleting Rows:**
```typescript
// Delete key or context menu
dispatch({ type: 'DELETE_SELECTION' });
// Reducer handles selection of next row
```

### Element Management

**Adding Elements:**
```typescript
// Via sidebar click or drag-drop
dispatch({
  type: 'ADD_ELEMENT',
  rowId: targetRowId,
  elementType: 'rect',
  src: undefined, // for images
  x: dropX, // optional, centers in column if not provided
  y: dropY, // optional
  text: 'Button' // for buttons/text
});
```

**Moving Elements:**
```typescript
// Drag element
// During drag: UPDATE_ELEMENT with new x, y
// On mouseup: Check if moved to different row
if (targetRowId !== sourceRowId) {
  dispatch({
    type: 'MOVE_ELEMENT',
    sourceRowId,
    targetRowId,
    elementId,
    newX: element.x,
    newY: absoluteY - targetRowStart
  });
}
```

**Resizing Elements:**
```typescript
// Drag corner resize handle
// Calculate new dimensions based on handle type:
if (handle === 'br') {
  newW = initialW + deltaX;
  newH = initialH + deltaY;
} else if (handle === 'bl') {
  newW = initialW - deltaX;
  newH = initialH + deltaY;
  newX = initialX + (initialW - newW);
}
// ... similar for 'tr' and 'tl'
dispatch({
  type: 'UPDATE_ELEMENT',
  rowId,
  elId,
  attrs: { x: newX, y: newY, width: newW, height: newH }
});
```

**Auto-Expanding Rows:**
```typescript
// When element dragged to bottom, row auto-expands
// In UPDATE_ELEMENT reducer:
const maxBottom = updatedElements.reduce(
  (max, el) => Math.max(max, el.y + el.height),
  0
);
const newHeight = Math.max(150, maxBottom + 40);
// Update row height
```

### Column Layout and Resizing

**Column Resize Logic:**
```typescript
// Drag column divider
const deltaPct = (deltaX / CANVAS_WIDTH) * 100;
// Update layout array:
let newLeft = currentLeft + deltaPct;
let newRight = currentRight - deltaPct;
// Enforce minimum 5% per column
if (newLeft < 5) {
  const diff = 5 - newLeft;
  newLeft = 5;
  newRight -= diff;
}
newLayout[dividerIndex] = newLeft;
newLayout[dividerIndex + 1] = newRight;
```

**Column Hit Detection:**
```typescript
// Determine which column contains a point
let colAccumX = 0;
for (let i = 0; i < row.layout.length; i++) {
  const colW = (CANVAS_WIDTH * row.layout[i]) / 100;
  if (x >= colAccumX && x < colAccumX + colW) {
    return i; // column index
  }
  colAccumX += colW;
}
```

### Selection and Hover States

**Selection Logic:**
- Click on element → `SELECT_ELEMENT` → Sets `selectedElementId` and `selectedRowId`
- Click on row background → `SELECT_ROW` → Sets `selectedRowId`, clears `selectedElementId`
- Click outside → `SELECT_ROW` with `null` → Clears selection

**Hover Logic:**
- Mouse move over element → `SET_HOVERED_ELEMENT` → Shows pink border
- Mouse move over row → `SET_HOVERED_ROW` → Shows light blue border
- Mouse leave → Clear hover states

**Visual Feedback:**
- Selected row: Blue borders (full width), resize pill, add buttons, "Row" badge, drag handle
- Selected element: Pink border, 4 corner resize handles
- Hovered row: Light blue border
- Hovered element: Pink border

### Drag and Drop Implementation

**Hit Detection:**
```typescript
// Check resize pill
if (Math.abs(paperX - centerX) < 30 &&
    Math.abs(logicalY - rowBottom) < 10) {
  // Start row resize
}

// Check add button
if (Math.abs(paperX - centerX) < 20 &&
    Math.abs(logicalY - (rowTop - ADD_BUTTON_OFFSET)) < ADD_BUTTON_HIT_TOLERANCE) {
  // Add row above
}

// Check element
if (paperX >= el.x && paperX <= el.x + el.width &&
    rowLocalY >= el.y && rowLocalY <= el.y + el.height) {
  // Select element, start drag
}

// Check resize handle
const handles = [
  { name: 'tl', x: el.x, y: el.y },
  { name: 'tr', x: el.x + el.width, y: el.y },
  // ... bl, br
];
if (Math.abs(paperX - h.x) <= limit &&
    Math.abs(rowLocalY - h.y) <= limit) {
  // Start element resize
}
```

**Drag Constraints:**
- Elements: Constrained to row bounds (can move between rows)
- Row resize: Minimum height 50px
- Column resize: Minimum 5% per column
- Element resize: Minimum 20px width/height

### Zoom and Viewport Management

**Zoom Control:**
```typescript
// Cmd/Ctrl + Scroll
container.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    dispatch({
      type: 'SET_ZOOM',
      zoom: state.zoom + -e.deltaY * 0.001
    });
  }
}, { passive: false });
```

**Viewport Calculations:**
```typescript
// Calculate visible area
const logicalScrollY = scrollY / state.zoom;
const logicalViewportH = viewportHeight / state.zoom;

// Only render rows in viewport (optimization possible)
// Currently renders all rows
```

**Coordinate Transformations:**
```typescript
// Screen to Logical
const getCanvasCoords = (e: React.MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const paperScreenW = CANVAS_WIDTH * state.zoom;
  const paperScreenX = (viewportWidth - paperScreenW) / 2;
  const mouseScreenX = e.clientX - rect.left;
  const mouseScreenY = e.clientY - rect.top;
  const logicalX = (mouseScreenX - paperScreenX) / state.zoom;
  const logicalY = (mouseScreenY + scrollY) / state.zoom - 40;
  return { paperX: logicalX, logicalY };
};
```

---

## 5. Store/Reducer Work

### useReducer Pattern

**Reducer Function:**
```typescript
const editorReducer = (state: EditorState, action: Action): EditorState => {
  switch (action.type) {
    case 'ACTION_TYPE':
      // Return new state object
      return { ...state, /* updates */ };
    // ... other cases
    default:
      return state;
  }
};
```

**Action Type System:**
```typescript
type Action =
  | { type: 'ADD_ELEMENT'; rowId: string; elementType: ElementType; ... }
  | { type: 'UPDATE_ELEMENT'; rowId: string; elId: string; attrs: Partial<EditorElement> }
  | { type: 'SELECT_ROW'; id: string | null }
  // ... discriminated union of all action types
```

**State Shape:**
```typescript
interface EditorState {
  rows: EditorRow[];
  selectedRowId: string | null;
  selectedElementId: string | null;
  hoveredElementId: string | null;
  hoveredRowId: string | null;
  dragTarget: { rowId: string; colIndex: number } | null;
  reorderTargetIndex: number | null;
  zoom: number;
}
```

### Reducer Logic

**Immutable Updates:**
```typescript
// Always return new objects/arrays
case 'UPDATE_ELEMENT':
  return {
    ...state,
    rows: state.rows.map((row) => {
      if (row.id !== action.rowId) return row;
      return {
        ...row,
        elements: row.elements.map((el) => {
          if (el.id !== action.elId) return el;
          return { ...el, ...action.attrs };
        })
      };
    })
  };
```

**Side-Effect Free:**
- Reducer is a pure function
- No API calls, no DOM manipulation
- Only state transformations
- Predictable and testable

**Complex Operations:**
```typescript
// Example: MOVE_ELEMENT
case 'MOVE_ELEMENT': {
  // Find source row and element
  const sourceRow = state.rows.find(r => r.id === action.sourceRowId);
  const element = sourceRow.elements.find(e => e.id === action.elementId);

  // Remove from source
  const newRows = state.rows.map(row => {
    if (row.id === action.sourceRowId) {
      return {
        ...row,
        elements: row.elements.filter(e => e.id !== action.elementId)
      };
    }
    // Add to target
    if (row.id === action.targetRowId) {
      const newHeight = Math.max(
        row.height,
        action.newY + element.height + 40,
        150
      );
      return {
        ...row,
        height: newHeight,
        elements: [...row.elements, { ...element, x: action.newX, y: action.newY }]
      };
    }
    return row;
  });

  return {
    ...state,
    rows: newRows,
    selectedRowId: action.targetRowId,
    selectedElementId: action.elementId
  };
}
```

### How State Changes Trigger Re-renders

**React Re-render Flow:**
1. `dispatch(action)` called
2. `editorReducer` processes action
3. New state object returned
4. `useReducer` updates state
5. Component re-renders with new state
6. `useCanvasEngine` hook's `useEffect` detects state change
7. `render()` function called
8. Canvas redrawn

**Dependencies:**
```typescript
useEffect(() => {
  // ... render logic
}, [state, canvasRef, containerRef, imagesLoaded]);
// Re-renders when state changes
```

**Performance Considerations:**
- Canvas redraws entire scene on every state change
- No virtual DOM diffing - full repaint
- Image caching prevents reloading images
- Could optimize by only rendering visible rows
- Could use `requestAnimationFrame` for smoother animations

### State Management Best Practices

**Using Refs for Drag State:**
```typescript
// dragInfo stored in ref to avoid stale closures
const dragInfo = useRef({ active: false, ... });

// Window event listeners use ref, not state
window.addEventListener('mousemove', (e) => {
  if (dragInfo.current.active) {
    handleMouseMove(e);
  }
});
```

**Dispatch Ref Pattern:**
```typescript
// Ensure dispatch is always current
const dispatchRef = useRef(dispatch);
useEffect(() => {
  dispatchRef.current = dispatch;
}, [dispatch]);
```

**Initial State:**
```typescript
const initialState: EditorState = {
  rows: [{ id: 'row-1', height: 200, layout: [100], elements: [] }],
  selectedRowId: 'row-1',
  selectedElementId: null,
  // ... other defaults
};
```

---

## Key Code Examples

### Row Resize Implementation
```typescript
// In handleMouseDown:
if (Math.abs(coords.paperX - centerX) < 30 &&
    Math.abs(coords.logicalY - rowBottom) < 10) {
  dragInfo.current = {
    active: true,
    type: 'rowResize',
    rowId: row.id,
    initialH: row.height,
    startY: e.clientY
  };
}

// In handleMouseMove:
if (dragInfo.current.type === 'rowResize') {
  const dy = (e.clientX - dragInfo.current.startY) / state.zoom;
  dispatch({
    type: 'UPDATE_ROW_HEIGHT',
    rowId: dragInfo.current.rowId,
    height: dragInfo.current.initialH + dy
  });
}
```

### Element Drag with Row Transition
```typescript
// In handleMouseUp:
if (dragInfo.current.type === 'element') {
  const element = /* get element */;
  const absoluteElementY = currentRowStart + element.y;

  // Find target row
  let targetRowId = null;
  let targetRowStart = 0;
  for (let r of state.rows) {
    if (absoluteElementY >= targetRowStart &&
        absoluteElementY <= targetRowStart + r.height) {
      targetRowId = r.id;
      break;
    }
    targetRowStart += r.height;
  }

  // Move if different row
  if (targetRowId && targetRowId !== rowId) {
    dispatch({
      type: 'MOVE_ELEMENT',
      sourceRowId: rowId,
      targetRowId,
      elementId,
      newX: element.x,
      newY: absoluteElementY - targetRowStart
    });
  }
}
```

### Multi-Pass Rendering
```typescript
// PASS 1: Content
state.rows.forEach((row) => {
  // Draw background, elements (skip selected)
});

// PASS 2: Hovered row controls
if (hoveredRowData && !selectedRowData) {
  // Draw hover border, drag handle
}

// PASS 3: Selected row controls
if (selectedRowData) {
  // Draw borders, buttons, resize pill, badge, drag handle
}

// PASS 4: Selected element
if (selectedElement) {
  // Draw element with selection border and resize handles
}
```

---

## Performance Considerations

1. **Full Canvas Redraw**: Every state change triggers full repaint
2. **Image Caching**: Images cached in Map to prevent reloading
3. **Event Listeners**: Window-level listeners for drag operations
4. **DPR Scaling**: Canvas scaled for retina displays
5. **Optimization Opportunities**:
   - Only render visible rows (viewport culling)
   - Use `requestAnimationFrame` for animations
   - Debounce resize operations
   - Virtual scrolling for many rows

---

## Integration with Shared Components

- **Sidebar**: Provides layout templates, shapes, media, text, buttons
- **TopBar**: Displays canvas dimensions
- **ZoomControls**: Zoom in/out UI
- **ColorPicker**: Color selection for backgrounds/elements

All shared components are in `src/components/shared/` directory.

