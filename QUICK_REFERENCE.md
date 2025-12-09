# Command Pattern Quick Reference

## 🚀 Quick Start

### 1. Import Commands
```typescript
import {
  AddElementCommand,
  MoveElementCommand,
  DeleteElementCommand,
  useCommandDispatch,
} from './shared/commands';
```

### 2. Setup Dispatcher
```typescript
const { executeCommand, undo, redo } = useCommandDispatch(
  state,
  setState,
  {
    onOperationsGenerated: (ops) => operationQueue.enqueue(ops),
  }
);
```

### 3. Use Commands
```typescript
// Add element
const cmd = new AddElementCommand(pageId, element);
executeCommand(cmd);

// Move element
const cmd = new MoveElementCommand(pageId, elementId, newX, newY);
executeCommand(cmd);

// Delete element
const cmd = new DeleteElementCommand(pageId, elementId);
executeCommand(cmd);
```

---

## 📖 Command Patterns

### Add Element
```typescript
const command = new AddElementCommand(
  'page_1',  // pageId
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
```

### Move Element
```typescript
const command = new MoveElementCommand(
  'page_1',     // pageId
  'element_1',  // elementId
  150,          // newX
  200           // newY
);
executeCommand(command);
```

### Delete Element
```typescript
const command = new DeleteElementCommand(
  'page_1',     // pageId
  'element_1'   // elementId
);
executeCommand(command);
```

---

## ⌨️ Keyboard Shortcuts

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Undo: Ctrl+Z (Mac: Cmd+Z)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }

    // Redo: Ctrl+Shift+Z (Mac: Cmd+Shift+Z)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      redo();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undo, redo]);
```

---

## 🔌 Backend API

### GET /templates/:id
```typescript
const response = await fetch('/templates/template_123');
const template = await response.json();

// Always returns DesignData format (even if legacy in DB)
console.log(template.designData.pages);
```

### POST /templates/:id/operations
```typescript
const response = await fetch('/templates/template_123/operations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operations: [
      {
        id: 'op_123',
        type: 'update_element',
        target: { pageId: 'page_1', elementId: 'el_1' },
        payload: { x: 150, y: 200 },
        timestamp: Date.now(),
      },
    ],
    baseVersion: 5,
  }),
});

// Handle version conflict
if (response.status === 409) {
  const conflict = await response.json();
  console.log('Conflict:', conflict.currentVersion);
}
```

---

## 🧪 Testing

### Test Command Execution
```typescript
test('AddElementCommand should add element', () => {
  const command = new AddElementCommand('page_1', mockElement);
  const newState = command.execute(initialState);

  expect(newState.pages[0].elements).toHaveLength(1);
});
```

### Test Command Undo
```typescript
test('should undo correctly', () => {
  const command = new AddElementCommand('page_1', mockElement);
  const afterExec = command.execute(initialState);
  const afterUndo = command.undo(afterExec);

  expect(afterUndo).toEqual(initialState);
});
```

### Test Operation Generation
```typescript
test('should generate correct operation', () => {
  const command = new AddElementCommand('page_1', mockElement);
  const ops = command.toOperations();

  expect(ops[0].type).toBe('add_element');
  expect(ops[0].target.pageId).toBe('page_1');
});
```

---

## 🎨 UI Components

### Toolbar with Undo/Redo
```typescript
function Toolbar({ onUndo, onRedo, canUndo, canRedo }) {
  return (
    <div>
      <button onClick={onUndo} disabled={!canUndo}>
        ↶ Undo
      </button>
      <button onClick={onRedo} disabled={!canRedo}>
        ↷ Redo
      </button>
    </div>
  );
}
```

### Shape Tools
```typescript
function ShapeTools({ executeCommand, activePageId }) {
  const addRect = () => {
    executeCommand(new AddElementCommand(activePageId, {
      type: 'rect',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      fill: '#4CAF50',
      rotation: 0,
      opacity: 1,
    }));
  };

  const addCircle = () => {
    executeCommand(new AddElementCommand(activePageId, {
      type: 'circle',
      x: 150,
      y: 150,
      width: 100,
      height: 100,
      fill: '#2196F3',
      rotation: 0,
      opacity: 1,
    }));
  };

  return (
    <div>
      <button onClick={addRect}>Add Rectangle</button>
      <button onClick={addCircle}>Add Circle</button>
    </div>
  );
}
```

### Canvas with Drag
```typescript
function Canvas({ executeCommand, activePageId, elements }) {
  const handleDragEnd = (elementId: string, newX: number, newY: number) => {
    executeCommand(new MoveElementCommand(
      activePageId,
      elementId,
      newX,
      newY
    ));
  };

  return (
    <Stage>
      {elements.map(element => (
        <Shape
          key={element.id}
          {...element}
          draggable
          onDragEnd={(e) => {
            handleDragEnd(element.id, e.target.x(), e.target.y());
          }}
        />
      ))}
    </Stage>
  );
}
```

---

## 🐛 Common Issues

### Issue: Operations not syncing
**Solution**: Ensure `onOperationsGenerated` is set:
```typescript
useCommandDispatch(state, setState, {
  onOperationsGenerated: (ops) => {
    console.log('Generated:', ops);
    operationQueue.enqueue(ops);
  },
});
```

### Issue: Undo not working
**Solution**: Use `executeCommand`, not direct dispatch:
```typescript
// ❌ Wrong
dispatch({ type: 'ADD_ELEMENT', element });

// ✅ Correct
executeCommand(new AddElementCommand(pageId, element));
```

### Issue: Type errors
**Solution**: Import from correct path:
```typescript
import { AddElementCommand } from './shared/commands';
// NOT from './commands/element/AddElementCommand'
```

---

## 📁 File Locations

### Backend
```
api/src/modules/templates/
├── adapters/          # Legacy compatibility
└── services/
    └── templates.service.ts
```

### Frontend
```
src/components/GraphicEditor/shared/
└── commands/
    ├── types.ts
    ├── CommandDispatcher.ts
    ├── element/
    │   ├── AddElementCommand.ts
    │   ├── MoveElementCommand.ts
    │   └── DeleteElementCommand.ts
    └── hooks/
        └── useCommandDispatch.ts
```

---

## 🔗 Links

- **Full Guide**: `IMPLEMENTATION_GUIDE.md`
- **API Docs**: `openspec/changes/implement-command-pattern/API_CONTRACTS.md`
- **Tests**: `openspec/changes/implement-command-pattern/TESTING_HARNESS.md`
- **Summary**: `COMMAND_PATTERN_SUMMARY.md`

---

## ✅ Checklist

### Initial Setup
- [ ] Import commands in your component
- [ ] Setup `useCommandDispatch` in App.tsx
- [ ] Wire up undo/redo keyboard shortcuts
- [ ] Test with AddElementCommand

### Migration
- [ ] Replace ADD_ELEMENT action → AddElementCommand
- [ ] Replace MOVE_ELEMENT action → MoveElementCommand
- [ ] Replace DELETE_ELEMENT action → DeleteElementCommand
- [ ] Test undo/redo works
- [ ] Verify operations sync to backend

### Testing
- [ ] Write tests for commands
- [ ] Test backend adapter with sample_template.json
- [ ] Test version conflict handling
- [ ] Performance test with 100+ operations

---

**Ready to use!** Start with `AddElementCommand` and expand from there. 🚀
