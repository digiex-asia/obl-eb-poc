# Component Integration Examples

This guide shows how to update existing components to use the Command Pattern.

## Quick Start: Using AppWithCommands.tsx

The easiest way to get started is to use `AppWithCommands.tsx` which has everything wired up:

### 1. Update Your Entry Point

```typescript
// src/components/GraphicEditor/app-v2/index.ts
export { default } from './AppWithCommands'; // Use command-based version
```

Or switch between versions for testing:

```typescript
// For testing command pattern
import App from './AppWithCommands';

// For legacy behavior
// import App from './App';

export default App;
```

## Component-Specific Integrations

### Canvas Component

The Canvas component needs to dispatch `MoveElementCommand` when elements are dragged.

**Before (Action-based)**:
```typescript
const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
  const shape = e.target;
  dispatch({
    type: 'UPDATE_ELEMENT',
    id: shape.id(),
    attrs: { x: shape.x(), y: shape.y() },
  });
};
```

**After (Command-based)**:
```typescript
import { MoveElementCommand } from '../shared/commands';

interface CanvasProps {
  // ... existing props
  executeCommand?: (command: EditorCommand) => void;
}

const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
  const shape = e.target;

  if (executeCommand) {
    // Use command pattern
    const command = new MoveElementCommand(
      activePageId,
      shape.id(),
      shape.x(),
      shape.y()
    );
    executeCommand(command);
  } else {
    // Fallback to legacy dispatch
    dispatch({
      type: 'UPDATE_ELEMENT',
      id: shape.id(),
      attrs: { x: shape.x(), y: shape.y() },
    });
  }
};
```

### Properties Panel

Update the properties panel to use `UpdateElementCommand`.

**Before**:
```typescript
const handlePropertyChange = (property: string, value: any) => {
  dispatch({
    type: 'UPDATE_ELEMENT',
    id: element.id,
    attrs: { [property]: value },
  });
};
```

**After**:
```typescript
import { UpdateElementCommand } from '../shared/commands';

interface PropertiesProps {
  executeCommand?: (command: EditorCommand) => void;
  // ... other props
}

const handlePropertyChange = (property: string, value: any) => {
  if (executeCommand) {
    const command = new UpdateElementCommand(
      activePageId,
      element.id,
      { [property]: value }
    );
    executeCommand(command);
  } else {
    // Fallback
    dispatch({
      type: 'UPDATE_ELEMENT',
      id: element.id,
      attrs: { [property]: value },
    });
  }
};
```

### Sidebar (Add Elements)

**Before**:
```typescript
const addRectangle = () => {
  dispatch({
    type: 'ADD_ELEMENT',
    elementType: 'rect',
  });
};
```

**After**:
```typescript
import { AddElementCommand } from '../shared/commands';

const addRectangle = () => {
  if (executeCommand) {
    const command = new AddElementCommand(activePageId, {
      type: 'rect',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      fill: '#4CAF50',
      rotation: 0,
      opacity: 1,
    });
    executeCommand(command);
  } else {
    dispatch({ type: 'ADD_ELEMENT', elementType: 'rect' });
  }
};
```

### Context Menu (Delete)

**Before**:
```typescript
const handleDelete = () => {
  dispatch({ type: 'DELETE_ELEMENT', id: elementId });
};
```

**After**:
```typescript
import { DeleteElementCommand } from '../shared/commands';

const handleDelete = () => {
  if (executeCommand) {
    const command = new DeleteElementCommand(activePageId, elementId);
    executeCommand(command);
  } else {
    dispatch({ type: 'DELETE_ELEMENT', id: elementId });
  }
};
```

## Timeline Integration

### Add Page

**Before**:
```typescript
const handleAddPage = () => {
  dispatch({ type: 'ADD_PAGE' });
};
```

**After**:
```typescript
import { AddPageCommand } from '../shared/commands';

const handleAddPage = () => {
  if (executeCommand) {
    const command = new AddPageCommand({
      duration: 5,
      background: '#ffffff',
      elements: [],
    });
    executeCommand(command);
  } else {
    dispatch({ type: 'ADD_PAGE' });
  }
};
```

### Add Audio Clip

**Before**:
```typescript
const handleAddAudio = (clip: AudioClip) => {
  dispatch({
    type: 'ADD_AUDIO_CLIP',
    layerId: 'layer_1',
    clip,
  });
};
```

**After**:
```typescript
import { AddAudioClipCommand } from '../shared/commands';

const handleAddAudio = (clip: AudioClip) => {
  if (executeCommand) {
    const command = new AddAudioClipCommand('layer_1', clip);
    executeCommand(command);
  } else {
    dispatch({
      type: 'ADD_AUDIO_CLIP',
      layerId: 'layer_1',
      clip,
    });
  }
};
```

## Gradual Migration Strategy

You can migrate incrementally without breaking existing functionality:

### Step 1: Add Optional executeCommand Prop

```typescript
interface ComponentProps {
  // Existing props
  dispatch: (action: Action) => void;

  // NEW: Optional command executor
  executeCommand?: (command: EditorCommand) => void;
}
```

### Step 2: Use Conditional Logic

```typescript
const handleAction = () => {
  if (executeCommand) {
    // New command-based approach
    const command = new SomeCommand(...);
    executeCommand(command);
  } else {
    // Legacy action-based approach
    dispatch({ type: 'SOME_ACTION', ... });
  }
};
```

### Step 3: Pass executeCommand from Parent

```typescript
// In AppWithCommands.tsx
<Canvas
  // ... existing props
  executeCommand={executeCommand}  // Add this
/>

<PropertiesPanel
  // ... existing props
  executeCommand={executeCommand}  // Add this
/>
```

### Step 4: Remove Fallback After Testing

Once everything works with commands, remove the conditional:

```typescript
// Before (conditional)
if (executeCommand) {
  executeCommand(new SomeCommand(...));
} else {
  dispatch({ type: 'SOME_ACTION', ... });
}

// After (command-only)
const command = new SomeCommand(...);
executeCommand(command);
```

## Testing Your Integration

### 1. Test Undo/Redo

```typescript
// Add an element
const addCmd = new AddElementCommand(pageId, element);
executeCommand(addCmd);

// Undo should remove it
undo();

// Redo should restore it
redo();
```

### 2. Test Backend Sync

```typescript
// Operations should auto-generate
const command = new AddElementCommand(pageId, element);
executeCommand(command);

// Check console for:
// "[AppWithCommands] Auto-generated operations: [...]"

// Check network tab for POST to /templates/:id/operations
```

### 3. Test Keyboard Shortcuts

- Press `Ctrl+Z` (Mac: `Cmd+Z`) → Should undo
- Press `Ctrl+Shift+Z` (Mac: `Cmd+Shift+Z`) → Should redo
- Press `Ctrl+Y` (Windows only) → Should redo

## Common Patterns

### Pattern 1: Simple Add

```typescript
const command = new AddElementCommand(pageId, {
  type: 'rect',
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  fill: '#4CAF50',
  rotation: 0,
  opacity: 1,
});
executeCommand(command);
```

### Pattern 2: Update Properties

```typescript
const command = new UpdateElementCommand(
  pageId,
  elementId,
  { fill: '#FF0000', opacity: 0.8 }
);
executeCommand(command);
```

### Pattern 3: Move on Drag

```typescript
const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
  const shape = e.target;
  const command = new MoveElementCommand(
    pageId,
    shape.id(),
    shape.x(),
    shape.y()
  );
  executeCommand(command);
};
```

### Pattern 4: Delete with Confirmation

```typescript
const handleDelete = () => {
  if (confirm('Delete this element?')) {
    const command = new DeleteElementCommand(pageId, elementId);
    executeCommand(command);
  }
};
```

## Troubleshooting

### executeCommand is undefined

Make sure you're passing it from the parent component:

```typescript
<YourComponent
  executeCommand={executeCommand}  // Add this
  {...otherProps}
/>
```

### Operations not syncing to backend

Check that `onOperationsGenerated` is set up in `useCommandDispatch`:

```typescript
useCommandDispatch(state, setState, {
  onOperationsGenerated: (ops) => {
    console.log('Generated:', ops);  // Should log
    queueOperation(ops);
  },
});
```

### Undo not working

Make sure you're using `executeCommand`, not direct `dispatch`:

```typescript
// ❌ Wrong - bypasses command system
dispatch({ type: 'ADD_ELEMENT', ... });

// ✅ Correct - uses command system
executeCommand(new AddElementCommand(...));
```

### TypeScript errors

Import types correctly:

```typescript
import type { EditorCommand } from '../shared/commands';

interface Props {
  executeCommand?: (command: EditorCommand) => void;
}
```

## Next Steps

1. ✅ Start with `AppWithCommands.tsx`
2. ✅ Test keyboard shortcuts work
3. ✅ Verify operations sync to backend
4. Update one component at a time
5. Test thoroughly after each change
6. Remove legacy dispatch when all migrated

---

**Ready to migrate!** The command pattern is fully functional and backwards compatible.
