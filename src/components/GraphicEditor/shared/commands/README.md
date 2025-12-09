# Command Pattern Architecture

This directory contains the Command Pattern implementation for the GraphicEditor.

## Overview

The Command Pattern encapsulates user actions as objects that can:
1. **Execute**: Update local state (pure function)
2. **Undo**: Reverse changes for undo/redo
3. **Generate Operations**: Produce backend operations for sync

## Benefits

- **Eliminates timing bugs**: Commands carry all data, no state discovery needed
- **Consistent undo/redo**: Every command knows how to undo itself
- **Testable**: Commands are pure TypeScript classes
- **Atomic**: State mutation and operation generation are coupled
- **Extensible**: New commands follow clear pattern

## Usage Example

```typescript
import { AddElementCommand, useCommandDispatch } from './commands';

function MyComponent() {
  const { executeCommand, undo, redo, canUndo, canRedo } = useCommandDispatch(
    state,
    setState,
    {
      onOperationsGenerated: (operations) => {
        // Send to backend via operation queue
        operationQueue.enqueue(operations);
      },
      onHistoryChange: (canUndo, canRedo) => {
        // Update UI button states
        setUndoEnabled(canUndo);
        setRedoEnabled(canRedo);
      },
    }
  );

  const addElement = () => {
    const command = new AddElementCommand(
      'page_1',
      {
        type: 'rect',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: '#FF0000',
        rotation: 0,
        opacity: 1,
      }
    );

    executeCommand(command);
    // Command executes, operation is auto-generated and sent to backend
  };

  return (
    <div>
      <button onClick={addElement}>Add Rectangle</button>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </div>
  );
}
```

## Available Commands

### Element Commands
- `AddElementCommand` - Add element to page
- `MoveElementCommand` - Move element position
- `DeleteElementCommand` - Delete element

### Coming Soon
- `ResizeElementCommand`
- `RotateElementCommand`
- `UpdateElementPropsCommand`
- `AddPageCommand`
- `DeletePageCommand`
- `AddAudioClipCommand`

## Architecture

```
commands/
├── types.ts                    # Core interfaces
├── CommandDispatcher.ts        # Command execution & middleware
├── element/
│   ├── AddElementCommand.ts
│   ├── MoveElementCommand.ts
│   └── DeleteElementCommand.ts
├── hooks/
│   └── useCommandDispatch.ts   # React integration
└── index.ts                    # Public API
```

## Migration from Old Pattern

**Before (Action-based)**:
```typescript
dispatch({ type: 'ADD_ELEMENT', element });
// Timing bug: element ID not yet generated
setTimeout(() => generateOperation(), 0); // Stale closure!
```

**After (Command-based)**:
```typescript
const command = new AddElementCommand(pageId, element, elementId);
executeCommand(command);
// ✅ All data pre-generated, no timing issues
// ✅ Operation auto-generated from command
// ✅ Undo/redo built-in
```

## Testing

```typescript
describe('AddElementCommand', () => {
  it('should add element to page', () => {
    const command = new AddElementCommand('page_1', mockElement);
    const newState = command.execute(initialState);

    expect(newState.pages[0].elements).toHaveLength(1);
  });

  it('should undo correctly', () => {
    const command = new AddElementCommand('page_1', mockElement);
    const afterExec = command.execute(initialState);
    const afterUndo = command.undo(afterExec);

    expect(afterUndo).toEqual(initialState);
  });
});
```
