# KonvaEditor Documentation

## Overview

`KonvaEditor` is an email builder component that uses React Konva for rendering. It implements a declarative rendering approach where Konva components are rendered as React components, and React's reconciliation handles updates. The component uses MobX for state management, providing reactive updates through observable properties.

---

## 1. Code Design

### Architecture Pattern

**Declarative React Konva Rendering**
- Uses React Konva library, which wraps the Konva canvas library in React components
- Rendering is declarative: components describe what to render, React/Konva handles how
- Each visual element (row, element, handle) is a React component
- React's reconciliation engine determines what needs to be updated

**State Management: MobX Pattern**
- Uses MobX store (`EditorStore`) for centralized state management
- Store properties are observable, triggering re-renders when changed
- Components wrapped with `observer()` HOC to react to observable changes
- Actions mutate store properties directly (MobX handles reactivity)

**Component Composition**
- **RowResizeHandle**: Draggable pill for resizing rows
- **ColumnResizeHandle**: Draggable vertical pill for resizing columns
- **ElementResizeHandle**: Draggable circles for resizing elements (4 corners)
- **ImageElement**: Handles image loading with useState/useEffect
- Main component composes these for rendering

**Temporary State for Smooth Operations**
- `tempHeights` Map stores temporary row heights during drag operations
- Provides smooth visual feedback without immediately updating store
- Cleared after drag completes and store updates

**Observer Pattern**
- Components wrapped with `observer()` from `mobx-react-lite`
- Automatically re-render when observed store properties change
- No manual subscription/unsubscription needed

### Component Structure

```
KonvaEditor (Main Component - observer)
├── Store Instance (EditorStore)
│   ├── Observable Properties (rows, selectedRowId, zoom, etc.)
│   └── Actions (updateRowHeight, resizeColumn, updateElement, etc.)
├── Local State
│   ├── tempHeights (Map) - temporary row heights during drag
│   ├── isResizingColumn (boolean) - column resize state
│   └── viewportW, viewportH, scrollY - viewport dimensions
├── Konva Components
│   ├── Stage (root canvas container)
│   ├── Layer (rendering layer)
│   ├── Group (transform group for zoom/positioning)
│   │   ├── Rect (row backgrounds, paper background)
│   │   ├── Line (borders, shapes)
│   │   ├── Circle (elements, handles)
│   │   ├── Text (labels, element text)
│   │   ├── KonvaImage (image elements)
│   │   └── Custom Components
│   │       ├── RowResizeHandle
│   │       ├── ColumnResizeHandle
│   │       ├── ElementResizeHandle
│   │       └── ImageElement
│   └── Shared Components
│       ├── Sidebar
│       ├── TopBar
│       ├── ZoomControls
│       └── ColorPicker
```

### Coordinate System and Transformations

**Coordinate Systems:**
- **Screen Coordinates**: Pixel positions in the Konva Stage (e.g., `e.target.x()`, `e.target.y()`)
- **Logical Coordinates**: Positions in unzoomed space (used for element positioning)
- **Group Coordinates**: Positions relative to the transform Group (accounts for zoom/scroll)

**Key Transformations:**
```typescript
// Stage positioning
const paperScreenW = CANVAS_WIDTH * store.zoom;
const paperScreenX = (viewportW - paperScreenW) / 2;

// Stage center in logical coordinates
const stageCenterX = (stageWidth / 2 - paperScreenX) / store.zoom;

// Transform Group
<Group
  x={paperScreenX}
  y={-scrollY}
  scaleX={store.zoom}
  scaleY={store.zoom}
>
  {/* All content rendered here */}
</Group>
```

**Coordinate Conversion:**
```typescript
// Screen to Logical (for drag operations)
const logicalX = (mouseScreenX - paperScreenX) / store.zoom;
const logicalY = (mouseScreenY + scrollY) / store.zoom - 40;

// Konva event coordinates are in Group's coordinate system
// Already transformed by zoom, so use directly
const newY = e.target.y() - rowY; // Already in logical space
```

---

## 2. Flow

### Component Lifecycle and Initialization

1. **Store Initialization**
   - `EditorStore` instance created (shared across component tree)
   - `makeAutoObservable(this)` makes all properties observable
   - Initial state: one row with default layout

2. **Component Mount**
   - `KonvaEditor` component mounts (wrapped with `observer()`)
   - `useRef` creates refs for container and stage
   - `useState` initializes local state (viewport, tempHeights, etc.)
   - `useEffect` sets up ResizeObserver and scroll listener

3. **Initial Render**
   - Calculate viewport dimensions
   - Create `rowPositions` array (Y positions for each row)
   - Render Konva Stage with Layer and Group
   - Render all rows, elements, and controls

### Event Handling Flow

**Konva Event Flow:**
```
User interaction (click, drag, etc.)
  → Konva event fired (onClick, onDragStart, etc.)
  → Event handler called
  → Store action invoked (store.selectElement(), store.updateElement(), etc.)
  → Observable property changes
  → Observer components re-render
  → Konva reconciliation updates canvas
```

**Drag Start Flow:**
```
User starts drag
  → onDragStart called
  → Store initial values in refs (initialXRef, initialYRef, etc.)
  → Set local state if needed (isDraggingRef.current = true)
  → For row resize: set tempHeights entry
```

**Drag Move Flow:**
```
User drags
  → onDragMove called continuously
  → Calculate delta from initial position
  → Update store or tempHeights
  → Component re-renders (if store updated)
  → Visual feedback updates smoothly
```

**Drag End Flow:**
```
User releases drag
  → onDragEnd called
  → Commit changes to store (if using temp state)
  → Clear temporary state
  → Clear isDraggingRef flag
```

### State Update Flow

```
User Action
  → Konva Event Handler
  → Store Action Method (store.updateElement(), etc.)
  → Observable Property Mutated
  → MobX Detects Change
  → Observer Components Re-render
  → React Reconciliation
  → Konva Updates Canvas
```

**Example: Element Drag**
```typescript
// User drags element
onDragMove={(e) => {
  const newY = e.target.y() - row.y;
  // Update temp height for smooth row expansion
  setTempHeights(prev => {
    const newMap = new Map(prev);
    newMap.set(row.id, calculatedHeight);
    return newMap;
  });
}}

onDragEnd={(e) => {
  // Commit to store
  store.updateElement(row.id, el.id, {
    x: e.target.x(),
    y: e.target.y() - row.y
  });
  // Clear temp state
  setTimeout(() => {
    setTempHeights(prev => {
      const newMap = new Map(prev);
      newMap.delete(row.id);
      return newMap;
    });
  }, 0);
}}
```

### Rendering Pipeline

**React Reconciliation:**
1. Component renders JSX with Konva components
2. React creates virtual DOM tree
3. React Konva converts to Konva nodes
4. Konva renders to canvas
5. On re-render, React diffs virtual DOM
6. Only changed Konva nodes updated
7. Konva efficiently updates canvas

**Row Position Calculation:**
```typescript
// Calculate Y positions using temp heights
const rowPositions = store.rows.reduce((acc, row) => {
  const height = getRowHeight(row.id, row.height); // Uses tempHeights
  const y = acc.length === 0 ? 40 : acc[acc.length - 1].y + getRowHeight(...);
  acc.push({ ...row, y, height });
  return acc;
}, []);
```

**Render Order (Z-Index):**
1. Paper background
2. Row backgrounds
3. Row hover borders
4. Elements (non-selected)
5. Selected row controls (borders, buttons, handles)
6. Column guides and resize handles
7. Selected element (on top)
8. Element resize handles

### Drag and Drop Flow

**Element Drag:**
```
Drag Start
  → onDragStart (optional, can store initial values)

Drag Move
  → onDragMove calculates new position
  → Updates tempHeights if dragging to bottom
  → Visual feedback updates smoothly

Drag End
  → onDragEnd commits to store
  → Clears tempHeights
  → Row height finalized
```

**Row Resize:**
```
Drag Start
  → RowResizeHandle.onDragStart
  → Store initial height in initialHeightRef
  → Set localHeight state

Drag Move
  → RowResizeHandle.onDragMove
  → Calculate deltaY
  → Update localHeight
  → Call onHeightChange callback
  → Update tempHeights in parent

Drag End
  → RowResizeHandle.onDragEnd
  → Commit to store (store.updateRowHeight)
  → Clear localHeight
  → Clear tempHeights
```

**Column Resize:**
```
Drag Start
  → ColumnResizeHandle.onDragStart
  → Store initial X position
  → Call onResizeStart (sets isResizingColumn)

Drag Move
  → ColumnResizeHandle.onDragMove
  → Calculate deltaX in percentage
  → Call store.resizeColumn
  → Update initialXRef for next calculation

Drag End
  → ColumnResizeHandle.onDragEnd
  → Call onResizeEnd (clears isResizingColumn)
```

---

## 3. Terminology

### Core Concepts

**Row**
- A horizontal container that holds elements
- Has: `id`, `height`, `layout` (column percentages), `elements[]`, `backgroundColor`
- Can be selected, hovered, resized, reordered, or deleted
- Position calculated in `rowPositions` array

**Element**
- A visual component within a row (rect, circle, text, image, etc.)
- Has: `id`, `type`, `x`, `y`, `width`, `height`, `fill`, optional `src`/`text`
- Can be selected, hovered, dragged, resized, or deleted
- Rendered as Konva components (Rect, Circle, Text, KonvaImage, Line)

**Layout**
- Array of percentages defining column widths (e.g., `[50, 50]` = two equal columns)
- Sum must equal 100
- Used to calculate column boundaries for element placement

**Column**
- A vertical section within a row defined by layout percentages
- Columns can be resized by dragging dividers
- Elements are placed within columns

**Stage**
- Root Konva container (equivalent to canvas element)
- Has width and height matching viewport
- Contains Layers

**Layer**
- Rendering layer within Stage
- All content rendered in single Layer
- Can have multiple Layers for z-ordering (not currently used)

**Group**
- Container for multiple Konva nodes
- Used for transformations (zoom, scroll)
- All content wrapped in transform Group

### Coordinate Systems

**Stage Coordinates**
- Pixel positions in the Konva Stage
- Range: 0 to stageWidth (viewport width)
- Used for Stage positioning

**Group Coordinates (Logical)**
- Positions relative to the transform Group
- Already transformed by zoom
- Used for element positioning
- Range: 0 to CANVAS_WIDTH (600px) for X

**Screen Coordinates**
- Mouse positions relative to viewport
- Converted to logical coordinates for calculations

### State Types

**Store Observable Properties:**
- `rows`: Array of EditorRow objects
- `selectedRowId`: ID of selected row (or null)
- `selectedElementId`: ID of selected element (or null)
- `hoveredElementId`: ID of hovered element (or null)
- `hoveredRowId`: ID of hovered row (or null)
- `dragTarget`: Drop target during drag (or null)
- `reorderTargetIndex`: Row reorder insertion point (or null)
- `zoom`: Zoom level (0.1 to 5.0)

**Local Component State:**
- `tempHeights`: Map<string, number> - temporary row heights during drag
- `isResizingColumn`: boolean - column resize active state
- `viewportW`, `viewportH`: viewport dimensions
- `scrollY`: scroll position

### Store Methods

**Row Methods:**
- `addOrUpdateRowLayout(layout, index?, forceAdd?, minHeight?)`: Add/update row
- `addSpecialBlock(blockType)`: Add divider/spacer/freeform
- `duplicateRow(rowId)`: Duplicate a row
- `selectRow(id)`: Select/deselect row
- `updateRowHeight(rowId, height)`: Change row height
- `reorderRow(fromIndex, toIndex)`: Move row to new position
- `deleteSelection()`: Delete selected row/element

**Element Methods:**
- `addElement(rowId, type, src?, x?, y?, text?)`: Add element to row
- `updateElement(rowId, elId, attrs)`: Update element properties
- `moveElement(sourceRowId, targetRowId, elementId, newX, newY)`: Move element
- `selectElement(rowId, elId)`: Select an element
- `duplicateSelection()`: Duplicate selected element

**Column Methods:**
- `resizeColumn(rowId, dividerIndex, deltaPct)`: Adjust column widths

**UI Methods:**
- `setHoveredElement(id)`: Set hovered element
- `setHoveredRow(id)`: Set hovered row
- `setDragTarget(target)`: Set drop target
- `setReorderTarget(index)`: Set reorder insertion point
- `setZoom(zoom)`: Change zoom level
- `setSelectionColor(color)`: Change background/fill color

### Transform Concepts

**zoom**
- Scale factor for canvas (0.1 to 5.0)
- Applied via Group `scaleX` and `scaleY` props
- Affects all coordinate calculations

**paperScreenX**
- Horizontal offset to center canvas in viewport
- Calculated: `(viewportW - CANVAS_WIDTH * zoom) / 2`
- Used in Group `x` prop

**stageCenterX**
- Center X position in logical coordinates
- Calculated: `(stageWidth / 2 - paperScreenX) / store.zoom`
- Used for row resize pill positioning

**tempHeights**
- Map storing temporary row heights during drag operations
- Key: row ID, Value: temporary height
- Provides smooth visual feedback
- Cleared after drag completes

**isResizingColumn**
- Boolean flag indicating column resize is active
- Used to show/hide percentage labels
- Set in ColumnResizeHandle callbacks

---

## 4. Main Logic

### Row Management

**Adding Rows:**
```typescript
// Via sidebar layout click or drag-drop
store.addOrUpdateRowLayout(
  [50, 50], // column percentages
  1, // optional insertion index
  true, // forceAdd
  150 // optional minHeight
);
```

**Resizing Rows:**
```typescript
// RowResizeHandle component handles drag
// Uses tempHeights for smooth resizing
const handleDragMove = (e: any) => {
  const deltaY = e.target.y() - initialYRef.current;
  const newHeight = Math.max(50, initialHeightRef.current + deltaY);
  setLocalHeight(newHeight);
  onHeightChange(newHeight); // Updates tempHeights in parent
};

// On drag end, commit to store
const handleDragEnd = () => {
  if (localHeight !== null) {
    store.updateRowHeight(row.id, localHeight);
    setLocalHeight(null);
    setTimeout(() => onHeightChange(0), 0); // Clear temp
  }
};
```

**Reordering Rows:**
```typescript
// Drag handle (dots icon) on right side
<Group
  draggable
  onDragMove={(e) => {
    const currentY = e.target.y();
    // Calculate target index based on Y position
    let currentYAccum = 0;
    let newTargetIndex = store.rows.length;
    for (let i = 0; i < store.rows.length; i++) {
      const rowH = store.rows[i].height;
      if (currentY < currentYAccum + rowH / 2) {
        newTargetIndex = i;
        break;
      }
      currentYAccum += rowH;
    }
    store.setReorderTarget(newTargetIndex);
  }}
  onDragEnd={() => {
    const fromIndex = store.rows.findIndex(r => r.id === row.id);
    const toIndex = store.reorderTargetIndex;
    if (fromIndex !== -1 && toIndex !== null && toIndex !== fromIndex) {
      store.reorderRow(fromIndex, toIndex);
    }
    store.setReorderTarget(null);
  }}
>
```

**Deleting Rows:**
```typescript
// Delete key or context menu
store.deleteSelection();
// Store handles selection of next row
```

### Element Management

**Adding Elements:**
```typescript
// Via sidebar click or drag-drop
store.addElement(
  targetRowId,
  'rect', // elementType
  undefined, // src (for images)
  dropX, // optional x
  dropY, // optional y
  'Button' // text (for buttons/text)
);
```

**Moving Elements:**
```typescript
// Drag element with onDragMove and onDragEnd
<Rect
  draggable
  onDragMove={(e) => {
    const newY = e.target.y() - row.y;
    // Auto-expand row if dragging to bottom
    const currentMaxBottom = row.elements.reduce((max, elem) => {
      if (elem.id === el.id) {
        return Math.max(max, newY + elem.height);
      }
      return Math.max(max, elem.y + elem.height);
    }, 0);
    const newHeight = Math.max(150, currentMaxBottom + 40);
    if (newHeight > row.height) {
      setTempHeights(prev => {
        const newMap = new Map(prev);
        newMap.set(row.id, newHeight);
        return newMap;
      });
    }
  }}
  onDragEnd={(e) => {
    const newY = e.target.y() - row.y;
    store.updateElement(row.id, el.id, {
      x: e.target.x(),
      y: newY
    });
    // Clear temp height
    setTimeout(() => {
      setTempHeights(prev => {
        const newMap = new Map(prev);
        newMap.delete(row.id);
        return newMap;
      });
    }, 0);
  }}
/>
```

**Resizing Elements:**
```typescript
// ElementResizeHandle component for each corner
const handleDragMove = (e: any) => {
  const handlePos = getHandlePosition();
  const deltaX = (e.target.x() - handlePos.x) / store.zoom;
  const deltaY = (e.target.y() - handlePos.y) / store.zoom;

  let newX = initialXRef.current;
  let newY = initialYRef.current;
  let newW = initialWRef.current;
  let newH = initialHRef.current;

  if (handle === 'br') {
    newW = Math.max(20, initialWRef.current + deltaX);
    newH = Math.max(20, initialHRef.current + deltaY);
  } else if (handle === 'bl') {
    newW = Math.max(20, initialWRef.current - deltaX);
    newH = Math.max(20, initialHRef.current + deltaY);
    newX = initialXRef.current + (initialWRef.current - newW);
  }
  // ... similar for 'tr' and 'tl'

  store.updateElement(rowId, el.id, {
    x: newX,
    y: newY,
    width: newW,
    height: newH
  });
};
```

**Auto-Expanding Rows:**
```typescript
// When element dragged to bottom
// In onDragMove:
const currentMaxBottom = row.elements.reduce((max, elem) => {
  if (elem.id === el.id) {
    return Math.max(max, newY + elem.height);
  }
  return Math.max(max, elem.y + elem.height);
}, 0);
const newHeight = Math.max(150, currentMaxBottom + 40);
if (newHeight > row.height) {
  setTempHeights(prev => {
    const newMap = new Map(prev);
    newMap.set(row.id, newHeight);
    return newMap;
  });
}
```

### Column Layout and Resizing

**Column Resize Logic:**
```typescript
// ColumnResizeHandle component
const handleDragMove = (e: any) => {
  const currentX = e.target.x();
  const deltaX = (currentX - initialXRef.current) / store.zoom;
  const deltaPct = (deltaX / CANVAS_WIDTH) * 100;

  if (Math.abs(deltaPct) > 0.01) {
    store.resizeColumn(row.id, dividerIndex, deltaPct);
    initialXRef.current = currentX; // Update for next calculation
  }
};

// Store method:
resizeColumn(rowId: string, dividerIndex: number, deltaPct: number) {
  const row = this.rows.find((r) => r.id === rowId);
  const newLayout = [...row.layout];
  let newLeft = newLayout[dividerIndex] + deltaPct;
  let newRight = newLayout[dividerIndex + 1] - deltaPct;
  // Enforce minimum 5%
  if (newLeft < 5) {
    const diff = 5 - newLeft;
    newLeft = 5;
    newRight -= diff;
  }
  newLayout[dividerIndex] = newLeft;
  newLayout[dividerIndex + 1] = newRight;
  row.layout = newLayout;
}
```

**Percentage Labels:**
```typescript
// Show during column resize
{isResizingColumn && colW > 30 && (
  <>
    <Rect
      x={colX + colW / 2 - 18 / store.zoom}
      y={row.y + row.height - 24 / store.zoom}
      width={36 / store.zoom}
      height={18 / store.zoom}
      fill={COLUMN_GUIDE_COLOR}
      cornerRadius={4 / store.zoom}
    />
    <Text
      x={colX + colW / 2}
      y={row.y + row.height - 24 / store.zoom + 9 / store.zoom}
      text={`${Math.round(pct)}%`}
      fontSize={10 / store.zoom}
      fill="white"
      align="center"
      verticalAlign="middle"
    />
  </>
)}
```

### Selection and Hover States

**Selection Logic:**
- Click on element → `store.selectElement(rowId, elId)` → Sets `selectedElementId` and `selectedRowId`
- Click on row background → `store.selectRow(rowId)` → Sets `selectedRowId`, clears `selectedElementId`
- Click on stage background → `store.selectRow(null)` → Clears selection

**Hover Logic:**
- Mouse enter element → `store.setHoveredElement(el.id)` → Shows pink border
- Mouse enter row → `store.setHoveredRow(row.id)` → Shows light blue border
- Mouse leave → Clear hover states

**Visual Feedback:**
- Selected row: Blue borders (full width), resize pill, add buttons, "Row" badge, drag handle
- Selected element: Pink border, 4 corner resize handles
- Hovered row: Light blue border
- Hovered element: Pink border

### Drag and Drop Implementation

**Hit Detection:**
- Konva handles hit detection automatically
- `onClick`, `onMouseEnter`, `onMouseLeave` events work on individual components
- No manual coordinate calculations needed for basic interactions

**Drag Constraints:**
```typescript
// Constrain row resize pill to vertical movement
dragBoundFunc={(pos) => {
  const deltaY = pos.y - initialYRef.current;
  const newHeight = Math.max(50, initialHeightRef.current + deltaY);
  return { x: stageCenterX, y: row.y + newHeight - pillHValue / 2 };
}}

// Constrain column resize to horizontal movement
dragBoundFunc={(pos) => {
  return { x: pos.x, y: row.y + row.height / 2 };
}}

// Constrain row reorder handle to vertical movement
dragBoundFunc={(pos) => {
  return { x: dragX, y: pos.y };
}}
```

### Zoom and Viewport Management

**Zoom Control:**
```typescript
// Cmd/Ctrl + Scroll
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      store.setZoom(store.zoom + -e.deltaY * 0.001);
    }
  };
  container.addEventListener('wheel', handleWheel, { passive: false });
  return () => container.removeEventListener('wheel', handleWheel);
}, [store.zoom]);
```

**Viewport Calculations:**
```typescript
// ResizeObserver for viewport dimensions
useEffect(() => {
  if (containerRef.current) {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setViewportW(entry.contentRect.width);
        setViewportH(entry.contentRect.height);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }
}, []);

// Scroll listener
useEffect(() => {
  const handleScroll = () => {
    if (containerRef.current) {
      setScrollY(containerRef.current.scrollTop);
    }
  };
  containerRef.current?.addEventListener('scroll', handleScroll);
  return () => containerRef.current?.removeEventListener('scroll', handleScroll);
}, []);
```

**Coordinate Transformations:**
```typescript
// Screen to Logical (for drag-drop)
const getCanvasCoords = (e: React.MouseEvent | React.DragEvent) => {
  const container = containerRef.current;
  if (!container) return { paperX: 0, logicalY: 0 };
  const rect = container.getBoundingClientRect();
  const viewportWidth = container.clientWidth;
  const paperScreenW = CANVAS_WIDTH * store.zoom;
  const paperScreenX = (viewportWidth - paperScreenW) / 2;
  const mouseScreenX = e.clientX - rect.left;
  const mouseScreenY = e.clientY - rect.top;
  const logicalX = (mouseScreenX - paperScreenX) / store.zoom;
  const logicalY = (mouseScreenY + scrollY) / store.zoom - 40;
  return { paperX: logicalX, logicalY };
};
```

### Gradient Support

**Gradient Parsing:**
```typescript
// Helper function to parse gradient strings
const getFillProps = (
  color: string | undefined,
  width: number
) => {
  if (!color) return { fill: 'transparent' };
  if (color.startsWith('linear-gradient')) {
    const colors = color.match(/#[a-fA-F0-9]{6}/g);
    if (colors && colors.length >= 2) {
      return {
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: width, y: 0 },
        fillLinearGradientColorStops: [0, colors[0], 1, colors[1]],
      };
    }
  }
  return { fill: color };
};

// Usage:
<Rect
  {...getFillProps(row.backgroundColor, CANVAS_WIDTH)}
  // ... other props
/>
```

---

## 5. Store/Reducer Work

### MobX Store Pattern

**Store Class:**
```typescript
class EditorStore {
  rows: EditorRow[] = [/* initial row */];
  selectedRowId: string | null = 'row-1';
  selectedElementId: string | null = null;
  // ... other observable properties

  constructor() {
    makeAutoObservable(this);
  }

  // Actions mutate properties directly
  updateRowHeight(rowId: string, height: number) {
    const row = this.rows.find((r) => r.id === rowId);
    if (row) {
      row.height = Math.max(50, height);
    }
  }
}
```

**makeAutoObservable:**
- Automatically makes all properties observable
- Automatically makes all methods actions
- Automatically makes getters computed
- No manual decorators needed

**Observable Properties:**
- When an observable property changes, MobX tracks the change
- Components wrapped with `observer()` automatically re-render
- Only components that use changed properties re-render (fine-grained)

### Observer Pattern

**Component Wrapping:**
```typescript
const KonvaEditor = observer(() => {
  // Component automatically re-renders when store properties change
  // Only if those properties are accessed in render
});

const RowResizeHandle = observer(({ row, store, ... }) => {
  // Component re-renders when row.height or store.zoom changes
});
```

**Reactivity:**
- MobX tracks which observable properties are accessed during render
- When those properties change, component re-renders
- Unused properties don't trigger re-renders

### Store Actions

**Direct Mutation:**
```typescript
// MobX allows direct mutation
updateElement(rowId: string, elId: string, attrs: Partial<EditorElement>) {
  const row = this.rows.find((r) => r.id === rowId);
  const element = row.elements.find((e) => e.id === elId);
  Object.assign(element, attrs); // Direct mutation
  // MobX detects change and triggers re-renders
}
```

**Array Updates:**
```typescript
// Array mutations are tracked
addElement(rowId: string, elementType: ElementType, ...) {
  const row = this.rows.find((r) => r.id === rowId);
  row.elements = [...row.elements, newEl]; // New array reference
  // MobX detects array change
}

// Or direct push (also works)
row.elements.push(newEl);
```

**Nested Updates:**
```typescript
// Nested property changes are tracked
resizeColumn(rowId: string, dividerIndex: number, deltaPct: number) {
  const row = this.rows.find((r) => r.id === rowId);
  row.layout[dividerIndex] = newLeft; // Nested array update
  row.layout[dividerIndex + 1] = newRight;
  // MobX detects nested changes
}
```

### How State Changes Trigger Re-renders

**MobX Reactivity Flow:**
1. Store action method called
2. Observable property mutated
3. MobX detects change
4. Components using that property marked for re-render
5. React re-renders those components
6. React Konva reconciles changes
7. Konva updates canvas

**Example:**
```typescript
// User drags element
onDragEnd={(e) => {
  store.updateElement(row.id, el.id, {
    x: e.target.x(),
    y: e.target.y() - row.y
  });
  // ↑ This mutates store.rows[].elements[].x and .y
  // ↑ MobX detects change
  // ↑ KonvaEditor re-renders (uses store.rows)
  // ↑ React Konva updates Rect component position
  // ↑ Canvas updated
}}
```

**Performance Considerations:**
- Only components using changed properties re-render
- Fine-grained reactivity reduces unnecessary re-renders
- React Konva efficiently updates only changed nodes
- Canvas updates are incremental (not full redraw)

### Temporary State Pattern

**Smooth Drag Operations:**
```typescript
// Problem: Store updates cause re-renders, but drag needs smooth updates
// Solution: Use temporary state for visual feedback, commit on drag end

// In component:
const [tempHeights, setTempHeights] = useState<Map<string, number>>(new Map());

// During drag:
onHeightChange={(height) => {
  if (height > 0) {
    setTempHeights(prev => {
      const newMap = new Map(prev);
      newMap.set(row.id, height);
      return newMap;
    });
  } else {
    setTempHeights(prev => {
      const newMap = new Map(prev);
      newMap.delete(row.id);
      return newMap;
    });
  }
}}

// Use temp height in render:
const getRowHeight = (rowId: string, defaultHeight: number) => {
  return tempHeights.get(rowId) ?? defaultHeight;
};

// On drag end, commit to store:
store.updateRowHeight(row.id, localHeight);
setLocalHeight(null);
setTimeout(() => onHeightChange(0), 0); // Clear temp
```

**Why Temporary State:**
- Provides immediate visual feedback during drag
- Avoids multiple store updates during drag move
- Commits final value on drag end
- Smooth user experience

---

## Key Code Examples

### Row Resize Handle Component
```typescript
const RowResizeHandle = observer(({ row, store, onHeightChange, stageCenterX }) => {
  const initialHeightRef = useRef<number>(row.height);
  const initialYRef = useRef<number>(row.y + row.height - pillHValue / 2);
  const [localHeight, setLocalHeight] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  const handleDragStart = (e: any) => {
    isDraggingRef.current = true;
    initialHeightRef.current = row.height;
    initialYRef.current = e.target.y();
    setLocalHeight(row.height);
  };

  const handleDragMove = (e: any) => {
    const deltaY = e.target.y() - initialYRef.current;
    const newHeight = Math.max(50, initialHeightRef.current + deltaY);
    setLocalHeight(newHeight);
    onHeightChange(newHeight);
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    if (localHeight !== null) {
      store.updateRowHeight(row.id, localHeight);
      setLocalHeight(null);
      setTimeout(() => onHeightChange(0), 0);
    }
  };

  const displayHeight = localHeight !== null ? localHeight : row.height;
  const displayY = row.y + displayHeight - pillHValue / 2;

  return (
    <Group
      x={stageCenterX}
      y={displayY}
      draggable
      dragBoundFunc={(pos) => {
        const deltaY = pos.y - initialYRef.current;
        const newHeight = Math.max(50, initialHeightRef.current + deltaY);
        return { x: stageCenterX, y: row.y + newHeight - pillHValue / 2 };
      }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <Rect
        x={-pillW / 2}
        y={0}
        width={pillW}
        height={pillHValue}
        fill="white"
        stroke={PRIMARY_COLOR}
        strokeWidth={1 / store.zoom}
        cornerRadius={3 / store.zoom}
      />
    </Group>
  );
});
```

### Element Drag with Auto-Expand
```typescript
<Rect
  draggable
  onDragMove={(e) => {
    const newY = e.target.y() - row.y;
    const currentMaxBottom = row.elements.reduce((max, elem) => {
      if (elem.id === el.id) {
        return Math.max(max, newY + elem.height);
      }
      return Math.max(max, elem.y + elem.height);
    }, 0);
    const newHeight = Math.max(150, currentMaxBottom + 40);
    if (newHeight > row.height) {
      setTempHeights(prev => {
        const newMap = new Map(prev);
        newMap.set(row.id, newHeight);
        return newMap;
      });
    }
  }}
  onDragEnd={(e) => {
    const newY = e.target.y() - row.y;
    store.updateElement(row.id, el.id, {
      x: e.target.x(),
      y: newY
    });
    setTimeout(() => {
      setTempHeights(prev => {
        const newMap = new Map(prev);
        newMap.delete(row.id);
        return newMap;
      });
    }, 0);
  }}
/>
```

### Column Resize with Percentage Labels
```typescript
const ColumnResizeHandle = observer(({ row, dividerIndex, dividerX, store, onResizeStart, onResizeEnd }) => {
  const initialXRef = useRef<number>(dividerX);

  const handleDragMove = (e: any) => {
    const currentX = e.target.x();
    const deltaX = (currentX - initialXRef.current) / store.zoom;
    const deltaPct = (deltaX / CANVAS_WIDTH) * 100;

    if (Math.abs(deltaPct) > 0.01) {
      store.resizeColumn(row.id, dividerIndex, deltaPct);
      initialXRef.current = currentX;
    }
  };

  return (
    <Group
      x={dividerX}
      y={row.y + row.height / 2}
      draggable
      dragBoundFunc={(pos) => ({ x: pos.x, y: row.y + row.height / 2 })}
      onDragStart={onResizeStart}
      onDragMove={handleDragMove}
      onDragEnd={onResizeEnd}
    >
      <Rect
        x={-handleW / 2}
        y={-handleH / 2}
        width={handleW}
        height={handleH}
        fill="white"
        stroke={COLUMN_GUIDE_COLOR}
        strokeWidth={1 / store.zoom}
        cornerRadius={3 / store.zoom}
      />
    </Group>
  );
});

// In main render, show percentage labels when resizing:
{isResizingColumn && colW > 30 && (
  <>
    <Rect x={...} y={...} fill={COLUMN_GUIDE_COLOR} />
    <Text x={...} y={...} text={`${Math.round(pct)}%`} />
  </>
)}
```

---

## Performance Considerations

1. **Fine-Grained Reactivity**: Only components using changed properties re-render
2. **React Reconciliation**: React efficiently diffs virtual DOM, only updates changed nodes
3. **Konva Updates**: Konva only updates changed canvas nodes, not full redraw
4. **Temporary State**: Smooth drag operations without excessive store updates
5. **Image Caching**: Images loaded once and cached (in ImageElement component)
6. **Optimization Opportunities**:
   - Viewport culling (only render visible rows)
   - Memoization of row position calculations
   - Debounce resize operations
   - Virtual scrolling for many rows

---

## Integration with Shared Components

- **Sidebar**: Provides layout templates, shapes, media, text, buttons
- **TopBar**: Displays canvas dimensions
- **ZoomControls**: Zoom in/out UI
- **ColorPicker**: Color selection for backgrounds/elements

All shared components are in `src/components/shared/` directory.

---

## Key Differences from CanvasEditor

1. **Rendering**: Declarative React components vs imperative canvas drawing
2. **State**: MobX store vs useReducer
3. **Updates**: React reconciliation vs manual canvas redraw
4. **Smoothness**: Temporary state for smooth drags vs direct state updates
5. **Components**: Modular components (handles, elements) vs monolithic render function
6. **Hit Detection**: Automatic via Konva vs manual coordinate calculations
7. **Performance**: Fine-grained reactivity vs full canvas redraw

