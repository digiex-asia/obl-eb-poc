# Command Pattern Implementation Guide

This guide shows you how to use the newly implemented Command Pattern architecture in your GraphicEditor.

## What Was Implemented

### Backend (NestJS)
✅ **Legacy Adapter System** (`api/src/modules/templates/adapters/`)
- `FormatDetector` - Detects legacy vs DesignData format
- `LegacyToV2Adapter` - Transforms legacy Konva → DesignData
- `V2ToLegacyAdapter` - Transforms DesignData → legacy (with round-trip preservation)
- `OperationTranslator` - Translates operations to legacy mutations
- `AdapterCache` - Caches original templates for perfect round-trips

✅ **Enhanced Templates Service**
- Automatic format detection on `GET /templates/:id`
- Automatic transformation to DesignData format for clients
- Legacy preservation on `POST /templates/:id/operations`
- Optimistic locking with version conflict detection

✅ **Enhanced Operation Executor**
- Audio operations support (`add_audio_clip`, `update_audio_clip`, `delete_audio_clip`)
- All 16 operation types fully implemented

### Frontend (React + TypeScript)
✅ **Command Pattern Foundation** (`src/components/GraphicEditor/shared/commands/`)
- `EditorCommand` interface - Core command contract
- `CommandDispatcher` - Command execution & middleware
- History management (undo/redo)

✅ **Pilot Commands**
- `AddElementCommand` - Add element to page
- `MoveElementCommand` - Move element position
- `DeleteElementCommand` - Delete element

✅ **React Integration**
- `useCommandDispatch` hook - Command-based state updates
- Automatic operation generation
- Undo/redo support

## How to Use

### 1. Basic Command Usage

Replace direct reducer dispatch with commands:

**Before (Old Action Pattern)**:
```typescript
dispatch({
  type: 'ADD_ELEMENT',
  pageId: activePageId,
  element: newElement,
});
```

**After (Command Pattern)**:
```typescript
import { AddElementCommand } from './shared/commands';

const command = new AddElementCommand(activePageId, newElement);
executeCommand(command);
```

### 2. Integrate with App.tsx

Update your GraphicEditor App.tsx to use the command hook:

```typescript
import { useCommandDispatch } from './shared/commands';
import { useOperationQueue } from './shared/hooks/useOperationQueue';

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Setup operation queue for backend sync
  const { enqueueOperations } = useOperationQueue({
    templateId: 'your-template-id',
    baseVersion: state.version,
  });

  // Setup command dispatcher
  const { executeCommand, undo, redo, canUndo, canRedo } = useCommandDispatch(
    { pages: state.pages, audioLayers: state.audioLayers },
    (newContentState) => {
      // Update state
      dispatch({
        type: 'SET_CONTENT',
        pages: newContentState.pages,
        audioLayers: newContentState.audioLayers,
      });
    },
    {
      // Auto-send operations to backend
      onOperationsGenerated: (operations) => {
        enqueueOperations(operations);
      },
      // Update UI button states
      onHistoryChange: (canUndo, canRedo) => {
        // Update toolbar button states
      },
    }
  );

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div>
      {/* Your UI */}
      <Toolbar
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      {/* Pass executeCommand to child components */}
      <Canvas executeCommand={executeCommand} />
    </div>
  );
}
```

### 3. Using Commands in Components

**Adding Elements**:
```typescript
import { AddElementCommand } from './shared/commands';

function Toolbar({ executeCommand }) {
  const addRectangle = () => {
    const command = new AddElementCommand(
      activePageId,
      {
        type: 'rect',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: '#4CAF50',
        rotation: 0,
        opacity: 1,
      }
    );
    executeCommand(command);
  };

  return <button onClick={addRectangle}>Add Rectangle</button>;
}
```

**Moving Elements (Drag)**:
```typescript
import { MoveElementCommand } from './shared/commands';

function Canvas({ executeCommand }) {
  const handleDragEnd = (elementId: string, newX: number, newY: number) => {
    const command = new MoveElementCommand(
      activePageId,
      elementId,
      newX,
      newY
    );
    executeCommand(command);
  };

  return (
    <Stage onDragEnd={(e) => {
      const shape = e.target;
      handleDragEnd(shape.id(), shape.x(), shape.y());
    }}>
      {/* Your Konva elements */}
    </Stage>
  );
}
```

**Deleting Elements**:
```typescript
import { DeleteElementCommand } from './shared/commands';

function ContextMenu({ executeCommand, elementId }) {
  const deleteElement = () => {
    const command = new DeleteElementCommand(activePageId, elementId);
    executeCommand(command);
  };

  return <button onClick={deleteElement}>Delete</button>;
}
```

### 4. Testing Commands

Commands are easy to test in isolation:

```typescript
import { describe, it, expect } from 'vitest';
import { AddElementCommand } from './commands';

describe('AddElementCommand', () => {
  it('should add element to page', () => {
    const initialState = {
      pages: [{ id: 'page_1', duration: 5, elements: [], background: '#fff' }],
      audioLayers: [],
    };

    const element = {
      type: 'rect',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      fill: '#000',
      rotation: 0,
      opacity: 1,
    };

    const command = new AddElementCommand('page_1', element);
    const newState = command.execute(initialState);

    expect(newState.pages[0].elements).toHaveLength(1);
    expect(newState.pages[0].elements[0].type).toBe('rect');
  });

  it('should generate correct operation', () => {
    const command = new AddElementCommand('page_1', mockElement);
    const operations = command.toOperations();

    expect(operations).toHaveLength(1);
    expect(operations[0].type).toBe('add_element');
    expect(operations[0].target.pageId).toBe('page_1');
  });

  it('should undo correctly', () => {
    const command = new AddElementCommand('page_1', mockElement);
    const afterExec = command.execute(initialState);
    const afterUndo = command.undo(afterExec);

    expect(afterUndo).toEqual(initialState);
  });
});
```

## Backend API Usage

### GET /templates/:id
Always returns DesignData format, automatically transforms legacy templates:

```typescript
const response = await fetch('/templates/template_123');
const template = await response.json();

// template.designData is always in DesignData format
// Even if stored as legacy Konva format in database
console.log(template.designData.pages); // Multi-page format
```

### POST /templates/:id/operations
Send operations, works with both legacy and new templates:

```typescript
const operations = [
  {
    id: 'op_123',
    type: 'update_element',
    target: { pageId: 'page_1', elementId: 'el_1' },
    payload: { x: 150, y: 200 },
    timestamp: Date.now(),
  },
];

const response = await fetch('/templates/template_123/operations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operations,
    baseVersion: 5, // For optimistic locking
  }),
});

if (response.status === 409) {
  // Version conflict - template was modified
  const conflict = await response.json();
  console.log('Current version:', conflict.currentVersion);
  // Handle conflict (refresh, merge, or ask user)
}

const result = await response.json();
console.log('Applied operations:', result.appliedOps);
console.log('Updated template:', result.template);
```

## Migration Strategy

### Phase 1: Pilot Commands (Current)
- ✅ AddElement, MoveElement, DeleteElement implemented
- Test with these 3 commands first
- Verify operation generation and backend sync

### Phase 2: Remaining Element Commands
- Implement: ResizeElement, RotateElement, UpdateElementProps
- Migrate element-related UI to use commands
- Remove legacy action-based element updates

### Phase 3: Page & Audio Commands
- Implement: AddPage, DeletePage, ReorderPages
- Implement: AddAudioClip, MoveAudioClip, DeleteAudioClip
- Complete migration to command-based architecture

### Phase 4: Cleanup
- Remove old operationGenerator.ts
- Remove legacy action types
- Update documentation

## Benefits You'll See

1. **No More Timing Bugs**: Commands carry all data, no stale closures
2. **Built-in Undo/Redo**: Every command knows how to undo itself
3. **Consistent History**: All operations are tracked automatically
4. **Testable**: Test commands in isolation without React
5. **Type-Safe**: Full TypeScript support with strict typing
6. **Backend Compatible**: Works seamlessly with legacy templates

## Troubleshooting

### Operations Not Syncing to Backend?
Check that `onOperationsGenerated` callback is set up:
```typescript
useCommandDispatch(state, setState, {
  onOperationsGenerated: (ops) => {
    console.log('Generated operations:', ops);
    operationQueue.enqueue(ops);
  },
});
```

### Undo/Redo Not Working?
Ensure you're using `executeCommand` instead of direct dispatch:
```typescript
// ❌ Wrong
dispatch({ type: 'ADD_ELEMENT', element });

// ✅ Correct
const command = new AddElementCommand(pageId, element);
executeCommand(command);
```

### Type Errors?
Make sure you're importing from the correct path:
```typescript
import {
  AddElementCommand,
  MoveElementCommand,
  DeleteElementCommand,
  useCommandDispatch
} from './shared/commands';
```

## Next Steps

1. **Test the pilot commands** with your UI
2. **Implement ResizeElementCommand** following the pattern
3. **Gradually migrate** existing actions to commands
4. **Add tests** for each command
5. **Monitor** operation generation and backend sync

## Need Help?

- Check `QUICKSTART.md` in openspec/changes/implement-command-pattern/
- Review `API_CONTRACTS.md` for backend API details
- See `TESTING_HARNESS.md` for testing examples
- Look at pilot commands for implementation patterns

---

**Status**: ✅ Foundation Complete
**Ready for**: Integration and Testing
