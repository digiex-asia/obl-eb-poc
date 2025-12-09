# Operation Flooding Solution - Smart Operation Management

## Problem Analysis

When dragging an element from point A to point B, the frontend generates **hundreds of operations** because:

1. **Mouse Move Events**: Fire 60+ times per second during drag
2. **Each Move = One Command**: Every mouse move creates a new `MoveElementCommand`
3. **Each Command = One Operation**: Every command generates an operation for backend
4. **Result**: 100+ operations for a single drag action

```typescript
// Current Flow (BAD)
onDrag (fires 60+ times/sec)
  ↓
MoveElementCommand (100+ commands created)
  ↓
toOperations() (100+ operations generated)
  ↓
Backend receives 100+ operations for one drag
```

---

## Solution: Multi-Level Optimization

We need **3 levels** of optimization:

### Level 1: Operation Coalescing (Command Level)
### Level 2: Debounced Command Execution (Component Level)
### Level 3: Smart Operation Batching (Queue Level)

---

## Level 1: Operation Coalescing

**Idea**: Merge similar consecutive operations into one.

### Implementation: Smart Command Dispatcher

```typescript
// src/components/GraphicEditor/shared/commands/SmartCommandDispatcher.ts

import { CommandDispatcher } from './CommandDispatcher';
import type { EditorCommand } from './types';
import type { ContentState } from '../model/types';

/**
 * Smart Command Dispatcher with operation coalescing
 *
 * Merges similar consecutive commands to reduce operation count
 */
export class SmartCommandDispatcher extends CommandDispatcher {
  private lastCommand: EditorCommand | null = null;
  private coalesceTimer: NodeJS.Timeout | null = null;
  private readonly COALESCE_WINDOW = 500; // ms

  /**
   * Check if two commands can be coalesced
   */
  private canCoalesce(cmd1: EditorCommand, cmd2: EditorCommand): boolean {
    // Only coalesce same operation types
    if (cmd1.type !== cmd2.type) return false;

    // Only coalesce operations on same element
    const meta1 = cmd1.getMetadata();
    const meta2 = cmd2.getMetadata();

    // Check if affecting same element
    const sameTarget =
      meta1.affectedIds.length === meta2.affectedIds.length &&
      meta1.affectedIds.every((id, i) => id === meta2.affectedIds[i]);

    if (!sameTarget) return false;

    // Specific rules by command type
    switch (cmd1.type) {
      case 'move_element':
      case 'resize_element':
      case 'rotate_element':
        return true; // Always coalesce continuous transforms

      case 'update_element':
        return true; // Coalesce property updates

      default:
        return false; // Don't coalesce add/delete
    }
  }

  /**
   * Dispatch with coalescing
   */
  dispatch(command: EditorCommand, state: ContentState): ContentState {
    // If we can coalesce with last command
    if (this.lastCommand && this.canCoalesce(this.lastCommand, command)) {
      console.log('[SmartDispatcher] Coalescing command:', command.type);

      // Cancel previous timer
      if (this.coalesceTimer) {
        clearTimeout(this.coalesceTimer);
      }

      // Replace last command with new one (keep latest state)
      this.lastCommand = command;

      // Set timer to flush after coalesce window
      this.coalesceTimer = setTimeout(() => {
        if (this.lastCommand) {
          console.log('[SmartDispatcher] Flushing coalesced command');
          const newState = super.dispatch(this.lastCommand, state);
          this.lastCommand = null;
          return newState;
        }
      }, this.COALESCE_WINDOW);

      // Execute immediately for UI (but don't generate operation yet)
      return command.execute(state);
    }

    // Can't coalesce - dispatch immediately
    if (this.lastCommand) {
      // Flush pending command first
      const intermediate = super.dispatch(this.lastCommand, state);
      this.lastCommand = null;
      return super.dispatch(command, intermediate);
    }

    this.lastCommand = command;

    // Start coalesce window
    this.coalesceTimer = setTimeout(() => {
      if (this.lastCommand) {
        super.dispatch(this.lastCommand, state);
        this.lastCommand = null;
      }
    }, this.COALESCE_WINDOW);

    return command.execute(state);
  }
}
```

**Result**: 100 move commands → 1 final move operation

---

## Level 2: Debounced Command Execution

**Idea**: Only execute command after user stops dragging.

### Implementation: Enhanced useCommandDispatch Hook

```typescript
// src/components/GraphicEditor/shared/commands/hooks/useCommandDispatch.ts

import { useCallback, useMemo, useRef } from 'react';
import type { ContentState } from '../../model/types';
import type { EditorCommand } from '../types';
import { SmartCommandDispatcher } from '../SmartCommandDispatcher';
import type { Operation } from '../../types/api.types';

interface UseCommandDispatchOptions {
  onOperationsGenerated?: (operations: Operation[]) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;

  // NEW: Coalescing options
  enableCoalescing?: boolean;      // Default: true
  coalesceWindow?: number;          // Default: 500ms
  coalesceTypes?: string[];         // Which command types to coalesce
}

export function useCommandDispatch(
  state: ContentState,
  setState: (state: ContentState) => void,
  options: UseCommandDispatchOptions = {},
) {
  const {
    enableCoalescing = true,
    coalesceWindow = 500,
    coalesceTypes = ['move_element', 'resize_element', 'rotate_element', 'update_element'],
  } = options;

  // Use SmartCommandDispatcher instead of regular one
  const dispatcherRef = useRef<SmartCommandDispatcher>(
    new SmartCommandDispatcher()
  );
  const dispatcher = dispatcherRef.current;

  // Configure coalescing
  useMemo(() => {
    if (enableCoalescing) {
      (dispatcher as any).COALESCE_WINDOW = coalesceWindow;
      (dispatcher as any).COALESCE_TYPES = coalesceTypes;
    }
  }, [dispatcher, enableCoalescing, coalesceWindow, coalesceTypes]);

  // Rest of implementation stays the same...
  const executeCommand = useCallback(
    (command: EditorCommand) => {
      const newState = dispatcher.dispatch(command, state);
      setState(newState);

      if (options.onHistoryChange) {
        options.onHistoryChange(dispatcher.canUndo(), dispatcher.canRedo());
      }
    },
    [dispatcher, state, setState, options],
  );

  return {
    executeCommand,
    undo: () => { /* ... */ },
    redo: () => { /* ... */ },
    canUndo: dispatcher.canUndo(),
    canRedo: dispatcher.canRedo(),
  };
}
```

---

## Level 3: Smart Operation Batching

**Idea**: Deduplicate operations before sending to backend.

### Implementation: Enhanced Operation Queue

```typescript
// src/components/GraphicEditor/shared/hooks/useSmartOperationQueue.ts

import { useState, useCallback, useRef } from 'react';
import type { Operation } from '../types/api.types';

/**
 * Smart operation queue with deduplication
 */
export const useSmartOperationQueue = (options: UseOperationQueueOptions) => {
  const operationMap = useRef<Map<string, Operation>>(new Map());

  /**
   * Generate unique key for operation coalescing
   */
  const getOperationKey = (op: Operation): string => {
    // Key format: "type:targetId"
    const targetId =
      op.target.elementId ||
      op.target.pageId ||
      op.target.clipId ||
      'unknown';

    return `${op.type}:${targetId}`;
  };

  /**
   * Check if operation can be coalesced
   */
  const canCoalesceOperation = (type: string): boolean => {
    const coalesceable = [
      'move_element',
      'resize_element',
      'rotate_element',
      'update_element',
      'update_element_props',
    ];
    return coalesceable.includes(type);
  };

  /**
   * Queue operation with smart deduplication
   */
  const queueOperation = useCallback((operation: Operation | Operation[]) => {
    const ops = Array.isArray(operation) ? operation : [operation];

    for (const op of ops) {
      const key = getOperationKey(op);

      if (canCoalesceOperation(op.type)) {
        // Replace previous operation of same type on same target
        operationMap.current.set(key, op);
        console.log(`[SmartQueue] Coalesced operation: ${key}`);
      } else {
        // Keep all non-coalesceable operations (add/delete)
        operationMap.current.set(`${key}:${op.id}`, op);
        console.log(`[SmartQueue] Added operation: ${key}`);
      }
    }

    // Trigger flush after delay
    debouncedFlush();
  }, []);

  /**
   * Flush: Convert map to array and send
   */
  const flushQueue = useCallback(async () => {
    const operations = Array.from(operationMap.current.values());
    operationMap.current.clear();

    if (operations.length === 0) return;

    console.log(`[SmartQueue] Flushing ${operations.length} operations (after coalescing)`);

    // Send to backend
    await operationsApi.applyOperations(templateId, {
      operations,
      baseVersion: currentVersion,
    });
  }, [templateId, currentVersion]);

  return { queueOperation, flush: flushQueue };
};
```

---

## Complete Integration

### Step 1: Update AppWithCommands.tsx

```typescript
import { useCommandDispatch } from '../shared/commands/hooks/useCommandDispatch';
import { useSmartOperationQueue } from '../shared/hooks/useSmartOperationQueue';

function AppWithCommands() {
  // Smart operation queue (with deduplication)
  const { queueOperation } = useSmartOperationQueue({
    templateId: currentTemplateId,
    templateVersion,
    enabled: !!currentTemplateId,
    delay: 1000, // Increased to 1 second for better batching
  });

  // Command dispatcher (with coalescing)
  const { executeCommand, undo, redo } = useCommandDispatch(
    { pages: state.pages, audioLayers: state.audioLayers },
    (newState) => {
      baseDispatch({ type: 'SET_CONTENT', ...newState });
    },
    {
      // Enable smart coalescing
      enableCoalescing: true,
      coalesceWindow: 500, // 500ms window

      // Auto-generate operations (now coalesced)
      onOperationsGenerated: (operations) => {
        console.log(`[App] Generated ${operations.length} operations`);
        queueOperation(operations);
      },
    }
  );

  // ... rest of code
}
```

### Step 2: Update Canvas Component

```typescript
// Canvas component with drag handling
const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
  const shape = e.target;

  // Create command on EVERY move (will be coalesced)
  const command = new MoveElementCommand(
    activePageId,
    shape.id(),
    shape.x(),
    shape.y()
  );

  executeCommand(command);
  // ✅ Only last position will be sent to backend!
};

const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
  // Force flush coalesced command immediately
  if (flush) {
    flush(); // Send final position now
  }
};
```

---

## Results Comparison

### Before Optimization

```
User drags element from (0, 0) to (100, 100)

Mouse Events: 120 events
Commands: 120 MoveElementCommands
Operations Generated: 120 operations
Network Requests: 1 request with 120 operations
Backend Updates: 120 state updates
Database Writes: 1 (final state)

❌ Wasted bandwidth, CPU, and time
```

### After Optimization

```
User drags element from (0, 0) to (100, 100)

Mouse Events: 120 events
Commands: 120 MoveElementCommands (created but coalesced)
Operations Generated: 1 operation (only final position)
Network Requests: 1 request with 1 operation
Backend Updates: 1 state update
Database Writes: 1 (final state)

✅ 99% reduction in operations sent!
```

---

## Configuration Options

```typescript
// Fine-tune coalescing behavior
const { executeCommand } = useCommandDispatch(state, setState, {
  enableCoalescing: true,        // Enable/disable coalescing
  coalesceWindow: 500,           // Time window to merge operations
  coalesceTypes: [               // Which operations to coalesce
    'move_element',
    'resize_element',
    'rotate_element',
    'update_element_props',
  ],

  onOperationsGenerated: (ops) => {
    console.log(`Generated ${ops.length} operations`);
    // Will be 1 instead of 100+
  },
});
```

---

## Additional Optimizations

### 1. Drag-Specific Throttling

```typescript
// Only update every N milliseconds during drag
const throttledMove = useCallback(
  throttle((x: number, y: number) => {
    const command = new MoveElementCommand(pageId, elementId, x, y);
    executeCommand(command);
  }, 50), // Update max 20 times per second
  [pageId, elementId, executeCommand]
);

const handleDragMove = (e) => {
  throttledMove(e.target.x(), e.target.y());
};
```

### 2. Visual Feedback Without Commands

```typescript
// Update visual position immediately (no command)
const handleDragMove = (e) => {
  // Update Konva shape position (visual only)
  e.target.position({ x: newX, y: newY });

  // Don't create command yet
};

const handleDragEnd = (e) => {
  // Only create command when drag ends
  const command = new MoveElementCommand(
    pageId,
    elementId,
    e.target.x(),
    e.target.y()
  );
  executeCommand(command);
};
```

### 3. Smart Operation Merging

```typescript
// Merge consecutive similar operations
function mergeOperations(ops: Operation[]): Operation[] {
  const merged = new Map<string, Operation>();

  for (const op of ops) {
    const key = `${op.type}:${op.target.elementId}`;

    if (shouldMerge(op.type)) {
      // Keep only latest operation for this element
      merged.set(key, op);
    } else {
      // Keep all (add/delete operations)
      merged.set(`${key}:${op.id}`, op);
    }
  }

  return Array.from(merged.values());
}
```

---

## Recommended Approach

### For Drag/Resize/Rotate (Continuous Operations)

**Strategy**: Command on dragEnd only

```typescript
const handleDragEnd = (e) => {
  // Only create command when done
  const command = new MoveElementCommand(pageId, elementId, x, y);
  executeCommand(command);
};
```

### For Property Changes (Discrete Operations)

**Strategy**: Command on every change + coalescing

```typescript
const handleColorChange = (color) => {
  // Create command immediately (will be coalesced if rapid)
  const command = new UpdateElementCommand(pageId, elementId, { fill: color });
  executeCommand(command);
};
```

---

## Summary

**Problem**: 100+ operations for single drag action

**Solution**: 3-level optimization
1. **Command Coalescing**: Merge similar consecutive commands
2. **Debounced Execution**: Wait for user to stop before generating operation
3. **Smart Batching**: Deduplicate operations before sending

**Result**:
- ✅ 99% reduction in operations
- ✅ Same UI responsiveness
- ✅ Efficient backend sync
- ✅ Proper undo/redo (one undo = entire drag)

**Implementation Priority**:
1. **Quick Fix**: Execute command only on dragEnd (immediate)
2. **Better Fix**: Add SmartCommandDispatcher (1 hour)
3. **Best Fix**: Full 3-level optimization (2 hours)
