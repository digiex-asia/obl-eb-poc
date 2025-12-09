# Proposal: Implement Command Pattern for GraphicEditor Operations

## Executive Summary

This proposal introduces a unified Command Pattern architecture for the GraphicEditor to address critical issues in the current operation synchronization system. The Command Pattern will encapsulate both local state mutations and backend operations in atomic, testable units, eliminating timing bugs, improving undo/redo consistency, and establishing a foundation for future offline-first and conflict resolution capabilities.

**Status**: Draft
**Change ID**: `implement-command-pattern`
**Target**: GraphicEditor Frontend (FSD architecture) + Backend API
**Scope**: Full-stack architecture refactoring, no new user-facing features
**Components**: Frontend Command Pattern + Backend Operations API

## Problem Statement

The current GraphicEditor implementation on the `be_integration` branch has established backend synchronization but suffers from architectural issues:

### 1. Stale Closure Bug
**File**: `src/components/GraphicEditor/app-v2/App.tsx:83-114`

The enhanced dispatch uses `setTimeout(() => {...}, 0)` to defer operation generation, creating a race condition:

```typescript
const dispatch = (action: any) => {
  const stateBeforeAction = state;  // Captured BEFORE update
  baseDispatch(action);             // Synchronous state update

  setTimeout(() => {
    // Problem: stateBeforeAction is stale, newly added elements don't exist yet
    const operations = operationGenerator.fromAction(action, {
      currentState: stateBeforeAction,  // Wrong state!
    });
  }, 0);
};
```

**Impact**: ADD_ELEMENT and ADD_PAGE operations fail to find newly created items.

### 2. Fragile State Discovery
**File**: `src/components/GraphicEditor/shared/lib/operationGenerator.ts`

Operations must "discover" elements by searching arrays:

```typescript
case 'ADD_ELEMENT': {
  const activePage = currentState.pages.find(p => p.id === currentState.activePageId);
  const newElement = activePage.elements[activePage.elements.length - 1];
  // Assumes last element is the new one - fragile!
}
```

**Impact**: Timing-dependent, O(n) lookups, breaks if multiple elements added quickly.

### 3. Inconsistent History Management
**File**: `src/components/GraphicEditor/shared/model/store.ts`

Undo/redo history is captured inconsistently:
- Some actions auto-capture: `ADD_PAGE`, `ADD_ELEMENT`, `DELETE_ELEMENT`
- Others require flags: `UPDATE_ELEMENT` with `saveHistory: boolean`
- Some skip entirely: `UPDATE_PAGE_DURATION`, `MOVE_AUDIO_CLIP`

**Impact**: Users lose undo capability for certain operations.

### 4. Incomplete Conflict Resolution
**File**: `src/components/GraphicEditor/shared/hooks/useOperationQueue.ts`

Version conflicts (HTTP 409) discard operations with only a warning:

```typescript
if (err.response?.status === 409) {
  console.warn('[OperationQueue] Discarding failed operations:', opsToSend);
  alert('Template was updated by another source. Please reload.');
}
```

**Impact**: Users lose their work on conflicts with no recovery option.

### 5. Missing Action Metadata
**File**: `src/components/GraphicEditor/shared/lib/operationGenerator.ts:288-301`

DELETE_AUDIO_CLIP expects `action.layerId` but it's not provided by the reducer action.

**Impact**: Audio clip deletion operations cannot be generated correctly.

## Proposed Solution

Implement a **Command Pattern** architecture where each user action is represented as a Command object that:

1. **Encapsulates data**: Pre-generates IDs and includes all necessary metadata
2. **Knows how to execute**: Updates local state in a pure function
3. **Knows how to undo**: Reverses its own changes for undo/redo
4. **Generates operations**: Produces backend operations without state discovery
5. **Is testable**: Can be unit-tested in isolation without React

### Key Benefits

- **Eliminates timing bugs**: Commands carry their own data, no state discovery needed
- **Consistent undo/redo**: Every command knows how to undo itself
- **Testable**: Commands are pure TypeScript classes, easy to test
- **Atomic**: State mutation and operation generation are coupled, preventing desync
- **Extensible**: New command types follow a clear pattern
- **Offline-ready**: Commands can be queued and replayed when connection restores
- **Conflict resolution foundation**: Commands can be merged or rejected based on simple rules

### Architecture Overview

```typescript
// Command interface
interface EditorCommand<TPayload = any> {
  id: string;              // Unique command ID (for idempotency)
  type: string;            // Command type (e.g., 'add_element')
  timestamp: number;       // Creation time (for conflict resolution)

  // Execute the command on local state
  execute(state: ContentState): ContentState;

  // Reverse the command for undo
  undo(state: ContentState): ContentState;

  // Generate backend operation(s)
  toOperations(): Operation[];

  // Get command metadata for logging/debugging
  getMetadata(): CommandMetadata;
}

// Example: AddElementCommand
class AddElementCommand implements EditorCommand {
  constructor(
    private elementId: string,    // Pre-generated
    private pageId: string,
    private element: DesignElement
  ) {}

  execute(state: ContentState): ContentState {
    return {
      ...state,
      pages: state.pages.map(p =>
        p.id === this.pageId
          ? { ...p, elements: [...p.elements, this.element] }
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
      target: { pageId: this.pageId, elementId: this.elementId },
      payload: this.element,
      timestamp: Date.now(),
    }];
  }
}
```

### Migration Strategy

**Phase 1: Foundation (Sprint 1)**
- Define `EditorCommand` interface and base types
- Create `CommandDispatcher` with middleware support
- Implement 3 pilot commands: AddElement, MoveElement, DeleteElement
- Add command history stack for undo/redo

**Phase 2: Element Operations (Sprint 2)**
- Convert remaining element commands (Resize, Rotate, UpdateProps)
- Migrate element-related actions to commands
- Update UI components to dispatch commands instead of actions
- Add integration tests for command → operation flow

**Phase 3: Page & Audio (Sprint 3)**
- Convert page commands (Add, Delete, Reorder, UpdateDuration)
- Convert audio commands (AddClip, MoveClip, TrimClip, DeleteClip)
- Remove legacy operationGenerator
- Final cleanup and documentation

**Phase 4: Conflict Resolution (Sprint 4)**
- Implement command-based conflict detection
- Add server timestamp tracking
- Implement merge strategies (last-write-wins, add-wins)
- UI for conflict resolution options

## Alternatives Considered

### Alternative 1: Fix Current Pattern (Quick Fix)
**Description**: Patch the stale closure bug and add missing action metadata without architectural changes.

**Pros**:
- Fast to implement (1 sprint)
- Low risk, minimal code changes
- Team stays in familiar patterns

**Cons**:
- Does not solve root causes (fragile state discovery, inconsistent history)
- Technical debt continues to accumulate
- Future features (offline mode, collaboration) will be harder

**Decision**: Rejected. Short-term fix that doesn't address architectural problems.

### Alternative 2: MobX Migration
**Description**: Migrate GraphicEditor to use MobX like other editors (KonvaEditor, CanvasEditor).

**Pros**:
- Unified state management across all editors
- Automatic O(1) reactive lookups
- Well-tested pattern in the codebase

**Cons**:
- Major rewrite of GraphicEditor state layer
- Team wants full control over state (per user feedback)
- Does not solve operation synchronization issues
- Heavier bundle size

**Decision**: Rejected. User explicitly does not want MobX, prefers useReducer control.

### Alternative 3: CRDT (Yjs/Automerge)
**Description**: Adopt a CRDT library for automatic conflict resolution and real-time collaboration.

**Pros**:
- Eliminates version conflicts entirely
- Enables real-time collaboration out of the box
- Proven technology (Figma, Notion use CRDTs)

**Cons**:
- 100KB+ library dependency
- Requires backend changes to support CRDT sync protocol
- Steeper learning curve
- Overkill if collaboration is not planned
- Team wants full control over state management

**Decision**: Rejected for now. Command Pattern provides a clean upgrade path to CRDT later if collaboration becomes a requirement.

## Success Criteria

1. **Bug Resolution**:
   - Zero stale closure bugs in operation generation
   - All operations correctly generate with proper target IDs
   - Undo/redo works consistently for all operations

2. **Code Quality**:
   - 100% test coverage for command implementations
   - All commands follow consistent interface pattern
   - Reduced cyclomatic complexity in dispatch logic

3. **Performance**:
   - No performance regression in operation dispatch (<5ms per command)
   - Operation queue flush time remains <50ms for 10 operations

4. **Maintainability**:
   - New commands can be added with <50 lines of code
   - Clear documentation and examples for each command type
   - Zero TypeScript errors, zero ESLint warnings

## Dependencies

- **Frontend**: No new dependencies (pure TypeScript pattern)
- **Backend**: No changes required to existing `/templates/:id/operations` endpoint
- **Team**: Frontend engineer familiar with TypeScript classes and design patterns

## Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Team unfamiliar with Command Pattern | Medium | Medium | Pair programming sessions, detailed documentation |
| Migration introduces bugs | High | Low | Incremental migration with feature flags, extensive testing |
| Performance regression | Medium | Low | Benchmark before/after, profile command execution |
| Dual patterns during migration | Low | High | Clear migration guide, lint rules to prevent action usage |
| Scope creep (adding features) | Medium | Medium | Strict command interface, focus on parity with actions |

## Timeline

- **Sprint 1** (2 weeks): Foundation + 3 pilot commands
- **Sprint 2** (2 weeks): Element operations migration
- **Sprint 3** (2 weeks): Page & audio operations migration
- **Sprint 4** (2 weeks): Conflict resolution + polish

**Total**: 8 weeks for full implementation

## Open Questions

1. **Command Serialization**: Should commands be serializable to localStorage for crash recovery?
   - Recommendation: Yes, for future offline-first capability

2. **Batch Commands**: Do we need a CompositeCommand for grouped operations (e.g., "Duplicate page with all elements")?
   - Recommendation: Yes, add in Phase 2

3. **Command Versioning**: How do we handle command schema changes over time?
   - Recommendation: Add version field to command interface, handle migrations in execute()

4. **Optimistic UI**: Should commands support rollback on backend failure?
   - Recommendation: Yes, commands already have undo(), use it for rollback

## Related Specifications

- `graphic-editor` spec: Multi-page timeline editor requirements (see `openspec/specs/graphic-editor/spec.md`)
- `command-architecture` spec: Frontend Command Pattern requirements (NEW - see `specs/command-architecture/spec.md`)
- `backend-operations` spec: Backend Operations API requirements (NEW - see `specs/backend-operations/spec.md`)
- `legacy-adapter` spec: Legacy Konva template compatibility (NEW - see `specs/legacy-adapter/spec.md`)

## Additional Documentation

- **Frontend Design**: See `design.md` for detailed Command Pattern architecture
- **Backend Design**: See `backend-design.md` for API and database architecture
- **Legacy Adapter Design**: See `legacy-adapter-design.md` for backward compatibility strategy
- **Implementation Tasks**: See `tasks.md` for 57 detailed implementation tasks across 4 phases

## References

- Architecture Advisor Report: Agent analysis of current implementation
- Command Pattern: https://refactoring.guru/design-patterns/command
- Operational Transformation: https://en.wikipedia.org/wiki/Operational_transformation
- CRDT Primer: https://crdt.tech/
