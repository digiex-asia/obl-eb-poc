# Design Document: Command Pattern Architecture

## Overview

This document details the architectural design for implementing the Command Pattern in GraphicEditor. The design addresses critical timing bugs, inconsistent undo/redo behavior, and establishes a foundation for offline-first and conflict resolution capabilities.

## Architecture Principles

1. **Atomic Operations**: Commands encapsulate both local state mutation and backend operation generation
2. **Explicit Over Implicit**: Commands carry their own data (pre-generated IDs) rather than discovering it from state
3. **Pure Functions**: Command execution is deterministic and side-effect free
4. **Testability First**: Commands can be unit-tested without React components
5. **Incremental Migration**: New pattern coexists with legacy actions during migration

## System Architecture

### High-Level Flow

```
User Interaction (UI Component)
    ↓
[Create Command with pre-generated IDs]
    ↓
CommandDispatcher.dispatch(command)
    ↓
    ├─→ command.execute(state) → Update local state
    ├─→ Push to history stack (for undo/redo)
    ├─→ command.toOperations() → Generate backend operations
    └─→ Queue operations for sync
    ↓
[Debounced Flush]
    ↓
POST /templates/:id/operations
    ↓
[On Success: Update version tracking]
[On Conflict (409): Conflict resolution flow]
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Components                             │
│  (Canvas, Sidebar, PropertiesPanel, Timeline)                   │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ dispatch(command)
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CommandDispatcher                             │
│  - Middleware chain (logging, history, sync)                    │
│  - Command validation                                            │
│  - Error boundary                                                │
└───────────────┬──────────────────────┬──────────────────────────┘
                │                      │
                │ execute()            │ toOperations()
                ↓                      ↓
┌───────────────────────┐    ┌────────────────────────────────────┐
│   ContentState        │    │   OperationQueue                   │
│   (useReducer)        │    │   - Batch operations               │
│   - pages[]           │    │   - Debounced flush                │
│   - audioLayers[]     │    │   - Retry logic                    │
└───────────────────────┘    └────────────┬───────────────────────┘
                                           │
                                           │ POST
                                           ↓
                              ┌────────────────────────────────────┐
                              │   Backend API                      │
                              │   /templates/:id/operations        │
                              └────────────────────────────────────┘
```

## Command Interface Design

### Core Command Interface

```typescript
// src/components/GraphicEditor/shared/model/commands/types.ts

export interface CommandMetadata {
  userId?: string;
  sessionId?: string;
  description: string; // Human-readable for debugging
}

export interface EditorCommand<TPayload = any> {
  // Identity
  id: string;              // Unique command ID (nanoid)
  type: string;            // Command type discriminator

  // Timestamps for conflict resolution
  timestamp: number;       // Command creation time
  sequenceNumber?: number; // Optional: Per-session sequence

  // State mutation
  execute(state: ContentState): ContentState;
  undo(state: ContentState): ContentState;

  // Backend sync
  toOperations(): Operation[];

  // Metadata
  getMetadata(): CommandMetadata;

  // Validation
  validate(state: ContentState): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}
```

### Base Command Class

```typescript
// src/components/GraphicEditor/shared/model/commands/BaseCommand.ts

export abstract class BaseCommand<TPayload = any> implements EditorCommand<TPayload> {
  readonly id: string;
  readonly timestamp: number;
  readonly type: string;

  constructor(type: string) {
    this.id = nanoid();
    this.timestamp = Date.now();
    this.type = type;
  }

  abstract execute(state: ContentState): ContentState;
  abstract undo(state: ContentState): ContentState;
  abstract toOperations(): Operation[];

  getMetadata(): CommandMetadata {
    return {
      description: `${this.type} command`,
    };
  }

  validate(state: ContentState): ValidationResult {
    return { valid: true };
  }
}
```

## Command Implementations

### 1. AddElementCommand

```typescript
// src/components/GraphicEditor/shared/model/commands/AddElementCommand.ts

export class AddElementCommand extends BaseCommand {
  readonly type = 'add_element';

  constructor(
    private readonly elementId: string,     // Pre-generated
    private readonly pageId: string,
    private readonly elementType: ElementType,
    private readonly position: { x: number; y: number },
    private readonly dimensions: { width: number; height: number },
    private readonly fill: string,
  ) {
    super('add_element');
  }

  execute(state: ContentState): ContentState {
    const element: DesignElement = {
      id: this.elementId,
      type: this.elementType,
      x: this.position.x,
      y: this.position.y,
      width: this.dimensions.width,
      height: this.dimensions.height,
      rotation: 0,
      fill: this.fill,
      opacity: 1,
    };

    return {
      ...state,
      pages: state.pages.map(p =>
        p.id === this.pageId
          ? { ...p, elements: [...p.elements, element] }
          : p
      ),
    };
  }

  undo(state: ContentState): ContentState {
    return {
      ...state,
      pages: state.pages.map(p =>
        p.id === this.pageId
          ? { ...p, elements: p.elements.filter(e => e.id !== this.elementId) }
          : p
      ),
    };
  }

  toOperations(): Operation[] {
    return [{
      id: nanoid(),
      type: 'add_element',
      target: {
        pageId: this.pageId,
        elementId: this.elementId,
      },
      payload: {
        type: this.elementType,
        x: this.position.x,
        y: this.position.y,
        width: this.dimensions.width,
        height: this.dimensions.height,
        rotation: 0,
        fill: this.fill,
        opacity: 1,
      },
      timestamp: this.timestamp,
    }];
  }

  validate(state: ContentState): ValidationResult {
    const page = state.pages.find(p => p.id === this.pageId);
    if (!page) {
      return { valid: false, errors: ['Page not found'] };
    }

    const elementExists = page.elements.some(e => e.id === this.elementId);
    if (elementExists) {
      return { valid: false, errors: ['Element ID already exists'] };
    }

    return { valid: true };
  }

  getMetadata(): CommandMetadata {
    return {
      description: `Add ${this.elementType} element to page ${this.pageId}`,
    };
  }
}
```

### 2. MoveElementCommand

```typescript
// src/components/GraphicEditor/shared/model/commands/MoveElementCommand.ts

export class MoveElementCommand extends BaseCommand {
  readonly type = 'move_element';

  constructor(
    private readonly pageId: string,
    private readonly elementId: string,
    private readonly oldPosition: { x: number; y: number },
    private readonly newPosition: { x: number; y: number },
  ) {
    super('move_element');
  }

  execute(state: ContentState): ContentState {
    return this.updateElementPosition(state, this.newPosition);
  }

  undo(state: ContentState): ContentState {
    return this.updateElementPosition(state, this.oldPosition);
  }

  private updateElementPosition(
    state: ContentState,
    position: { x: number; y: number }
  ): ContentState {
    return {
      ...state,
      pages: state.pages.map(p =>
        p.id === this.pageId
          ? {
              ...p,
              elements: p.elements.map(e =>
                e.id === this.elementId
                  ? { ...e, x: position.x, y: position.y }
                  : e
              ),
            }
          : p
      ),
    };
  }

  toOperations(): Operation[] {
    return [{
      id: nanoid(),
      type: 'move_element',
      target: {
        pageId: this.pageId,
        elementId: this.elementId,
      },
      payload: {
        x: this.newPosition.x,
        y: this.newPosition.y,
      },
      timestamp: this.timestamp,
    }];
  }

  getMetadata(): CommandMetadata {
    return {
      description: `Move element ${this.elementId} from (${this.oldPosition.x}, ${this.oldPosition.y}) to (${this.newPosition.x}, ${this.newPosition.y})`,
    };
  }
}
```

### 3. DeleteAudioClipCommand

```typescript
// src/components/GraphicEditor/shared/model/commands/DeleteAudioClipCommand.ts

export class DeleteAudioClipCommand extends BaseCommand {
  readonly type = 'delete_audio_clip';

  private deletedClip: AudioClip | null = null;

  constructor(
    private readonly layerId: string,     // Now explicitly provided!
    private readonly clipId: string,
  ) {
    super('delete_audio_clip');
  }

  execute(state: ContentState): ContentState {
    // Store the deleted clip for undo
    const layer = state.audioLayers.find(l => l.id === this.layerId);
    this.deletedClip = layer?.clips.find(c => c.id === this.clipId) || null;

    return {
      ...state,
      audioLayers: state.audioLayers.map(layer =>
        layer.id === this.layerId
          ? { ...layer, clips: layer.clips.filter(c => c.id !== this.clipId) }
          : layer
      ),
    };
  }

  undo(state: ContentState): ContentState {
    if (!this.deletedClip) {
      throw new Error('Cannot undo: deleted clip data not available');
    }

    return {
      ...state,
      audioLayers: state.audioLayers.map(layer =>
        layer.id === this.layerId
          ? { ...layer, clips: [...layer.clips, this.deletedClip!] }
          : layer
      ),
    };
  }

  toOperations(): Operation[] {
    return [{
      id: nanoid(),
      type: 'delete_audio_clip',
      target: {
        audioLayerId: this.layerId,  // Now available!
        clipId: this.clipId,
      },
      payload: {},
      timestamp: this.timestamp,
    }];
  }

  validate(state: ContentState): ValidationResult {
    const layer = state.audioLayers.find(l => l.id === this.layerId);
    if (!layer) {
      return { valid: false, errors: ['Audio layer not found'] };
    }

    const clip = layer.clips.find(c => c.id === this.clipId);
    if (!clip) {
      return { valid: false, errors: ['Audio clip not found'] };
    }

    return { valid: true };
  }
}
```

### 4. BatchCommand (Composite)

```typescript
// src/components/GraphicEditor/shared/model/commands/BatchCommand.ts

export class BatchCommand extends BaseCommand {
  readonly type = 'batch';

  constructor(
    private readonly commands: EditorCommand[],
    private readonly description: string,
  ) {
    super('batch');
  }

  execute(state: ContentState): ContentState {
    return this.commands.reduce(
      (currentState, cmd) => cmd.execute(currentState),
      state
    );
  }

  undo(state: ContentState): ContentState {
    // Undo in reverse order
    return [...this.commands].reverse().reduce(
      (currentState, cmd) => cmd.undo(currentState),
      state
    );
  }

  toOperations(): Operation[] {
    return this.commands.flatMap(cmd => cmd.toOperations());
  }

  validate(state: ContentState): ValidationResult {
    for (const cmd of this.commands) {
      const result = cmd.validate(state);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  }

  getMetadata(): CommandMetadata {
    return {
      description: this.description || `Batch of ${this.commands.length} commands`,
    };
  }
}
```

## CommandDispatcher Implementation

```typescript
// src/components/GraphicEditor/shared/model/commands/CommandDispatcher.ts

export type CommandMiddleware = (
  command: EditorCommand,
  next: () => void,
  context: DispatchContext
) => void;

export interface DispatchContext {
  state: ContentState;
  setState: (state: ContentState) => void;
  pushHistory: (state: ContentState) => void;
  queueOperations: (ops: Operation[]) => void;
}

export class CommandDispatcher {
  private middlewares: CommandMiddleware[] = [];

  constructor(private context: DispatchContext) {}

  use(middleware: CommandMiddleware): void {
    this.middlewares.push(middleware);
  }

  dispatch(command: EditorCommand): void {
    let index = 0;

    const next = () => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        middleware(command, next, this.context);
      }
    };

    next();
  }
}

// Middleware: Validation
export const validationMiddleware: CommandMiddleware = (command, next, ctx) => {
  const result = command.validate(ctx.state);
  if (!result.valid) {
    console.error(`[Command] Validation failed for ${command.type}:`, result.errors);
    throw new Error(`Command validation failed: ${result.errors?.join(', ')}`);
  }
  next();
};

// Middleware: State Execution
export const executionMiddleware: CommandMiddleware = (command, next, ctx) => {
  const newState = command.execute(ctx.state);
  ctx.setState(newState);
  next();
};

// Middleware: History
export const historyMiddleware: CommandMiddleware = (command, next, ctx) => {
  // Capture state BEFORE execution for undo
  ctx.pushHistory(ctx.state);
  next();
};

// Middleware: Backend Sync
export const syncMiddleware: CommandMiddleware = (command, next, ctx) => {
  const operations = command.toOperations();
  if (operations.length > 0) {
    ctx.queueOperations(operations);
  }
  next();
};

// Middleware: Logging
export const loggingMiddleware: CommandMiddleware = (command, next, ctx) => {
  console.log(`[Command] Executing ${command.type}:`, command.getMetadata());
  const start = performance.now();
  next();
  const duration = performance.now() - start;
  console.log(`[Command] ${command.type} completed in ${duration.toFixed(2)}ms`);
};
```

## React Integration

### useCommandDispatch Hook

```typescript
// src/components/GraphicEditor/shared/hooks/useCommandDispatch.ts

export function useCommandDispatch(
  state: ContentState,
  setState: (state: ContentState) => void,
  pushHistory: (state: ContentState) => void,
  queueOperations: (ops: Operation[]) => void,
): (command: EditorCommand) => void {
  const dispatcherRef = useRef<CommandDispatcher | null>(null);

  if (!dispatcherRef.current) {
    const dispatcher = new CommandDispatcher({
      state,
      setState,
      pushHistory,
      queueOperations,
    });

    // Register middleware in order
    dispatcher.use(loggingMiddleware);
    dispatcher.use(validationMiddleware);
    dispatcher.use(historyMiddleware);
    dispatcher.use(executionMiddleware);
    dispatcher.use(syncMiddleware);

    dispatcherRef.current = dispatcher;
  }

  // Update context on each render
  dispatcherRef.current.context = {
    state,
    setState,
    pushHistory,
    queueOperations,
  };

  return useCallback(
    (command: EditorCommand) => {
      dispatcherRef.current?.dispatch(command);
    },
    []
  );
}
```

### App.tsx Integration

```typescript
// src/components/GraphicEditor/app-v2/App.tsx

export function App() {
  const [state, baseDispatch] = useReducer(reducer, initialState);
  const { queueOperation } = useOperationQueue(currentTemplateId);

  // Extract content state for commands
  const contentState: ContentState = {
    pages: state.pages,
    audioLayers: state.audioLayers,
  };

  const setContentState = useCallback((newContentState: ContentState) => {
    baseDispatch({
      type: 'SET_CONTENT_STATE',
      pages: newContentState.pages,
      audioLayers: newContentState.audioLayers,
    });
  }, []);

  const pushHistory = useCallback((prevState: ContentState) => {
    baseDispatch({ type: 'PUSH_HISTORY', state: prevState });
  }, []);

  const queueOperations = useCallback((ops: Operation[]) => {
    ops.forEach(op => queueOperation(op));
  }, [queueOperation]);

  // Command dispatcher
  const dispatchCommand = useCommandDispatch(
    contentState,
    setContentState,
    pushHistory,
    queueOperations
  );

  // Example: Handle add element
  const handleAddElement = (elementType: ElementType) => {
    const elementId = nanoid();
    const command = new AddElementCommand(
      elementId,
      state.activePageId,
      elementType,
      { x: 400, y: 225 },  // Canvas center
      { width: 100, height: 100 },
      '#3b82f6'
    );
    dispatchCommand(command);
  };

  // ... rest of component
}
```

## Undo/Redo with Commands

```typescript
// src/components/GraphicEditor/shared/model/commands/UndoCommand.ts

export class UndoCommand extends BaseCommand {
  readonly type = 'undo';

  constructor(private readonly commandToUndo: EditorCommand) {
    super('undo');
  }

  execute(state: ContentState): ContentState {
    return this.commandToUndo.undo(state);
  }

  undo(state: ContentState): ContentState {
    // Redo is just re-executing the original command
    return this.commandToUndo.execute(state);
  }

  toOperations(): Operation[] {
    // Undo is local-only, no backend sync
    return [];
  }
}

// In App.tsx
const handleUndo = () => {
  if (state.past.length === 0) return;

  const previousState = state.past[state.past.length - 1];

  baseDispatch({ type: 'UNDO' });
  // Reducer handles moving past → current → future
};
```

## Conflict Resolution Design

### Simple Last-Write-Wins Strategy

```typescript
// src/components/GraphicEditor/shared/model/commands/ConflictResolver.ts

export interface ConflictResolution {
  strategy: 'client-wins' | 'server-wins' | 'merge';
  mergedState?: ContentState;
}

export class ConflictResolver {
  resolve(
    clientCommands: EditorCommand[],
    serverVersion: number,
    serverState: ContentState,
  ): ConflictResolution {
    // Simple last-write-wins based on timestamp
    const latestClientTimestamp = Math.max(
      ...clientCommands.map(c => c.timestamp)
    );

    // If client commands are newer, client wins
    if (latestClientTimestamp > serverVersion) {
      return { strategy: 'client-wins' };
    }

    // Otherwise, server wins
    return { strategy: 'server-wins' };
  }
}
```

### Conflict UI Flow

```typescript
// In useOperationQueue.ts
catch (err: any) {
  if (err.response?.status === 409) {
    const serverTemplate = err.response.data.template;

    // Show conflict resolution modal
    const resolution = await showConflictModal({
      localCommands: pendingCommands,
      serverState: serverTemplate.designData,
    });

    if (resolution === 'keep-local') {
      // Force push with new base version
      await operationsApi.applyOperations(templateId, {
        operations: opsToSend,
        baseVersion: serverTemplate.version,
        force: true,
      });
    } else if (resolution === 'load-server') {
      // Discard local changes and reload
      window.location.reload();
    }
  }
}
```

## File Structure

```
src/components/GraphicEditor/
  shared/
    model/
      commands/
        types.ts                    # EditorCommand interface
        BaseCommand.ts              # Abstract base class
        CommandDispatcher.ts        # Dispatcher + middleware
        ConflictResolver.ts         # Conflict resolution logic

        # Element commands
        AddElementCommand.ts
        MoveElementCommand.ts
        ResizeElementCommand.ts
        RotateElementCommand.ts
        DeleteElementCommand.ts
        UpdateElementPropsCommand.ts

        # Page commands
        AddPageCommand.ts
        DeletePageCommand.ts
        UpdatePageCommand.ts
        ReorderPagesCommand.ts

        # Audio commands
        AddAudioClipCommand.ts
        MoveAudioClipCommand.ts
        TrimAudioClipCommand.ts
        DeleteAudioClipCommand.ts

        # Utility commands
        BatchCommand.ts
        UndoCommand.ts
        RedoCommand.ts

        index.ts                    # Public API exports

    hooks/
      useCommandDispatch.ts         # React hook for dispatching

    __tests__/
      commands/
        AddElementCommand.test.ts   # Unit tests
        MoveElementCommand.test.ts
        ...
```

## Testing Strategy

### Unit Tests (Commands)

```typescript
// src/components/GraphicEditor/shared/__tests__/commands/AddElementCommand.test.ts

describe('AddElementCommand', () => {
  it('should add element to page', () => {
    const command = new AddElementCommand(
      'el-123',
      'page-1',
      'rect',
      { x: 100, y: 100 },
      { width: 50, height: 50 },
      '#ff0000'
    );

    const initialState: ContentState = {
      pages: [{ id: 'page-1', duration: 3, elements: [], background: '#fff' }],
      audioLayers: [],
    };

    const newState = command.execute(initialState);

    expect(newState.pages[0].elements).toHaveLength(1);
    expect(newState.pages[0].elements[0].id).toBe('el-123');
    expect(newState.pages[0].elements[0].type).toBe('rect');
  });

  it('should generate correct operation', () => {
    const command = new AddElementCommand(
      'el-123',
      'page-1',
      'rect',
      { x: 100, y: 100 },
      { width: 50, height: 50 },
      '#ff0000'
    );

    const operations = command.toOperations();

    expect(operations).toHaveLength(1);
    expect(operations[0].type).toBe('add_element');
    expect(operations[0].target.elementId).toBe('el-123');
    expect(operations[0].target.pageId).toBe('page-1');
  });

  it('should undo correctly', () => {
    const command = new AddElementCommand(
      'el-123',
      'page-1',
      'rect',
      { x: 100, y: 100 },
      { width: 50, height: 50 },
      '#ff0000'
    );

    const initialState: ContentState = {
      pages: [{ id: 'page-1', duration: 3, elements: [], background: '#fff' }],
      audioLayers: [],
    };

    const stateAfterExecute = command.execute(initialState);
    const stateAfterUndo = command.undo(stateAfterExecute);

    expect(stateAfterUndo.pages[0].elements).toHaveLength(0);
  });
});
```

### Integration Tests (Dispatcher)

```typescript
// src/components/GraphicEditor/shared/__tests__/CommandDispatcher.test.ts

describe('CommandDispatcher', () => {
  it('should execute middleware in order', () => {
    const executionOrder: string[] = [];

    const middleware1: CommandMiddleware = (cmd, next) => {
      executionOrder.push('m1-before');
      next();
      executionOrder.push('m1-after');
    };

    const middleware2: CommandMiddleware = (cmd, next) => {
      executionOrder.push('m2-before');
      next();
      executionOrder.push('m2-after');
    };

    const dispatcher = new CommandDispatcher({
      state: { pages: [], audioLayers: [] },
      setState: jest.fn(),
      pushHistory: jest.fn(),
      queueOperations: jest.fn(),
    });

    dispatcher.use(middleware1);
    dispatcher.use(middleware2);

    dispatcher.dispatch(new MockCommand());

    expect(executionOrder).toEqual([
      'm1-before',
      'm2-before',
      'm2-after',
      'm1-after',
    ]);
  });
});
```

## Performance Considerations

### Command Creation Overhead
- Commands are lightweight objects (~100 bytes each)
- Pre-allocate IDs with nanoid (sub-millisecond)
- No observable performance impact expected

### Execution Performance
- Commands use immutable updates (spread operator)
- For large pages (100+ elements), ensure O(1) lookups with Maps if needed
- Benchmark target: <5ms per command execution

### Memory Management
- History stack is bounded (default: 50 commands)
- Old commands are garbage collected automatically
- Batch commands share references to child commands (no duplication)

## Migration Path

### Phase 1: Coexistence
- CommandDispatcher coexists with legacy action dispatch
- New features use commands, existing features use actions
- No breaking changes to existing code

### Phase 2: Gradual Migration
- Migrate one action type per week
- Update UI components to use commands
- Add deprecation warnings to legacy actions

### Phase 3: Cleanup
- Remove legacy operationGenerator.ts
- Remove legacy action types from reducer
- Update documentation and examples

## Security Considerations

### Command Validation
- All commands validate state before execution
- Prevents invalid IDs, out-of-bounds coordinates, etc.
- Validation errors are logged and thrown (fail-fast)

### Operation Sanitization
- Operations to backend are validated before sending
- No sensitive data (passwords, tokens) in command payloads
- Operation IDs are unique to prevent replay attacks

## Future Enhancements

### 1. Command Serialization (Crash Recovery)
```typescript
interface SerializableCommand {
  type: string;
  data: Record<string, any>;
}

class CommandSerializer {
  serialize(command: EditorCommand): SerializableCommand {
    // Convert command to JSON
  }

  deserialize(data: SerializableCommand): EditorCommand {
    // Reconstruct command from JSON
  }
}
```

### 2. Operational Transformation (Real-time Collaboration)
```typescript
class OperationalTransformer {
  transform(
    clientCommand: EditorCommand,
    serverCommands: EditorCommand[]
  ): EditorCommand {
    // Transform client command against server commands
  }
}
```

### 3. CRDT Upgrade Path
```typescript
class CRDTCommandAdapter {
  toCRDTOperation(command: EditorCommand): Y.Transaction {
    // Convert command to CRDT operation for Yjs
  }
}
```

## Glossary

- **Command**: An object encapsulating a user action with execute/undo/toOperations methods
- **Operation**: Backend API payload representing a partial state update
- **ContentState**: Subset of AppState containing pages and audioLayers (undo/redo scope)
- **Middleware**: Function that intercepts command dispatch for cross-cutting concerns
- **Conflict**: Version mismatch between client and server state
- **CRDT**: Conflict-free Replicated Data Type (future enhancement)
