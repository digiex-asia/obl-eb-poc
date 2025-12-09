# Implementation Tasks: Command Pattern

This document outlines the ordered implementation tasks for the Command Pattern architecture. Tasks are broken down into small, verifiable work items that deliver user-visible progress.

## Phase 1: Foundation (Sprint 1, ~2 weeks)

### Task 1.1: Define Command Interface and Types
**Deliverable**: Command type definitions and interfaces
**Files**:
- `src/components/GraphicEditor/shared/model/commands/types.ts`

**Steps**:
1. Create `EditorCommand` interface with required methods
2. Define `CommandMetadata` interface
3. Define `ValidationResult` interface
4. Export types from `types.ts`

**Validation**:
- TypeScript compiles without errors
- Types are exported and can be imported

**Estimated Time**: 2 hours

---

### Task 1.2: Implement BaseCommand Abstract Class
**Deliverable**: Reusable base class for commands
**Files**:
- `src/components/GraphicEditor/shared/model/commands/BaseCommand.ts`

**Steps**:
1. Create `BaseCommand` abstract class implementing `EditorCommand`
2. Implement constructor with ID and timestamp generation
3. Implement default `getMetadata()` and `validate()` methods
4. Mark `execute()`, `undo()`, and `toOperations()` as abstract

**Validation**:
- Class can be extended by concrete commands
- Default validation returns `{ valid: true }`
- Timestamp is set on construction

**Estimated Time**: 1 hour

---

### Task 1.3: Implement CommandDispatcher Core
**Deliverable**: Dispatcher with middleware support
**Files**:
- `src/components/GraphicEditor/shared/model/commands/CommandDispatcher.ts`

**Steps**:
1. Create `CommandDispatcher` class with middleware chain
2. Implement `use(middleware)` to register middleware
3. Implement `dispatch(command)` to execute chain
4. Define `CommandMiddleware` type and `DispatchContext` interface

**Validation**:
- Middleware executes in registration order
- `next()` advances to next middleware
- Context is passed to all middleware

**Estimated Time**: 2 hours

---

### Task 1.4: Implement Core Middleware
**Deliverable**: Validation, execution, history, sync, and logging middleware
**Files**:
- `src/components/GraphicEditor/shared/model/commands/CommandDispatcher.ts` (same file)

**Steps**:
1. Implement `validationMiddleware` - calls `command.validate()`
2. Implement `executionMiddleware` - calls `command.execute()` and `setState()`
3. Implement `historyMiddleware` - calls `pushHistory()` before execution
4. Implement `syncMiddleware` - calls `queueOperations()` with operations
5. Implement `loggingMiddleware` - logs command type and duration

**Validation**:
- Validation middleware aborts on validation failure
- Execution middleware updates state
- History middleware captures state before changes
- Sync middleware queues operations
- Logging middleware outputs to console

**Estimated Time**: 3 hours

---

### Task 1.5: Implement AddElementCommand
**Deliverable**: Pilot command for adding elements
**Files**:
- `src/components/GraphicEditor/shared/model/commands/AddElementCommand.ts`

**Steps**:
1. Extend `BaseCommand`
2. Implement constructor with element data
3. Implement `execute()` to add element to page
4. Implement `undo()` to remove element by ID
5. Implement `toOperations()` to generate `add_element` operation
6. Implement `validate()` to check page exists and element ID is unique

**Validation**:
- Command adds element to correct page
- Undo removes element correctly
- Operation has correct structure
- Validation catches missing page and duplicate ID

**Estimated Time**: 2 hours

---

### Task 1.6: Write Unit Tests for AddElementCommand
**Deliverable**: Comprehensive unit tests
**Files**:
- `src/components/GraphicEditor/shared/__tests__/commands/AddElementCommand.test.ts`

**Steps**:
1. Test `execute()` adds element
2. Test `undo()` removes element
3. Test `toOperations()` generates correct operation
4. Test `validate()` catches invalid page
5. Test `validate()` catches duplicate element ID

**Validation**:
- All tests pass
- Code coverage >90% for AddElementCommand

**Estimated Time**: 1.5 hours

---

### Task 1.7: Implement MoveElementCommand
**Deliverable**: Pilot command for moving elements
**Files**:
- `src/components/GraphicEditor/shared/model/commands/MoveElementCommand.ts`

**Steps**:
1. Extend `BaseCommand`
2. Implement constructor with old/new position
3. Implement `execute()` to update element x/y
4. Implement `undo()` to restore old x/y
5. Implement `toOperations()` to generate `move_element` operation
6. Implement `validate()` to check element exists

**Validation**:
- Command moves element to new position
- Undo restores original position
- Operation has correct structure
- Validation catches missing element

**Estimated Time**: 2 hours

---

### Task 1.8: Write Unit Tests for MoveElementCommand
**Deliverable**: Comprehensive unit tests
**Files**:
- `src/components/GraphicEditor/shared/__tests__/commands/MoveElementCommand.test.ts`

**Steps**:
1. Test `execute()` moves element
2. Test `undo()` restores position
3. Test `toOperations()` generates correct operation
4. Test `validate()` catches missing element

**Validation**:
- All tests pass
- Code coverage >90% for MoveElementCommand

**Estimated Time**: 1.5 hours

---

### Task 1.9: Implement DeleteElementCommand
**Deliverable**: Pilot command for deleting elements
**Files**:
- `src/components/GraphicEditor/shared/model/commands/DeleteElementCommand.ts`

**Steps**:
1. Extend `BaseCommand`
2. Implement constructor with page ID and element ID
3. Implement `execute()` to store deleted element and remove from page
4. Implement `undo()` to restore element
5. Implement `toOperations()` to generate `delete_element` operation
6. Implement `validate()` to check element exists

**Validation**:
- Command deletes element
- Undo restores element with all properties
- Operation has correct structure
- Validation catches missing element

**Estimated Time**: 2 hours

---

### Task 1.10: Write Unit Tests for DeleteElementCommand
**Deliverable**: Comprehensive unit tests
**Files**:
- `src/components/GraphicEditor/shared/__tests__/commands/DeleteElementCommand.test.ts`

**Steps**:
1. Test `execute()` deletes element
2. Test `undo()` restores element
3. Test `toOperations()` generates correct operation
4. Test `validate()` catches missing element

**Validation**:
- All tests pass
- Code coverage >90% for DeleteElementCommand

**Estimated Time**: 1.5 hours

---

### Task 1.11: Implement useCommandDispatch Hook
**Deliverable**: React hook for dispatching commands
**Files**:
- `src/components/GraphicEditor/shared/hooks/useCommandDispatch.ts`

**Steps**:
1. Create hook with parameters: `state`, `setState`, `pushHistory`, `queueOperations`
2. Create `CommandDispatcher` instance on first render (useRef)
3. Register middleware in order
4. Update context on each render
5. Return memoized dispatch function (useCallback)

**Validation**:
- Hook creates dispatcher once
- Dispatch function is stable across renders
- Context updates with latest values
- Middleware executes correctly

**Estimated Time**: 2 hours

---

### Task 1.12: Integrate useCommandDispatch in App.tsx
**Deliverable**: Command dispatch available in main app
**Files**:
- `src/components/GraphicEditor/app-v2/App.tsx`

**Steps**:
1. Extract `ContentState` from `AppState`
2. Create `setContentState` function that dispatches `SET_CONTENT_STATE` action
3. Create `pushHistory` function that dispatches `PUSH_HISTORY` action
4. Create `queueOperations` wrapper around `queueOperation`
5. Call `useCommandDispatch` hook
6. Add `SET_CONTENT_STATE` action to reducer (if not exists)
7. Add `PUSH_HISTORY` action to reducer (if not exists)

**Validation**:
- Hook is called without errors
- dispatchCommand function is available
- Actions are defined in reducer

**Estimated Time**: 2 hours

---

### Task 1.13: Wire AddElementCommand to Sidebar
**Deliverable**: Shape buttons dispatch AddElementCommand
**Files**:
- `src/components/GraphicEditor/features/sidebar/ui/Sidebar.tsx` (or relevant shape button component)

**Steps**:
1. Pass `dispatchCommand` to shape buttons via props or context
2. Update shape button click handler to create `AddElementCommand`
3. Pre-generate element ID with `nanoid()`
4. Dispatch command instead of legacy action
5. Remove old action dispatch (if exists)

**Validation**:
- Clicking shape button adds element to canvas
- Element appears with correct type and default properties
- Undo removes the element
- Backend operation is queued

**Estimated Time**: 1.5 hours

---

### Task 1.14: Wire MoveElementCommand to Canvas Drag
**Deliverable**: Dragging element dispatches MoveElementCommand
**Files**:
- `src/components/GraphicEditor/features/canvas/ui/Canvas.tsx` (or drag handler)

**Steps**:
1. Capture element position before drag starts
2. On drag end, create `MoveElementCommand` with old/new position
3. Dispatch command instead of legacy action
4. Remove old action dispatch (if exists)

**Validation**:
- Dragging element updates position
- Undo restores original position
- Backend operation is queued

**Estimated Time**: 2 hours

---

### Task 1.15: Wire DeleteElementCommand to Delete Action
**Deliverable**: Delete key dispatches DeleteElementCommand
**Files**:
- `src/components/GraphicEditor/app-v2/App.tsx` (or keyboard handler)

**Steps**:
1. Update delete key handler to create `DeleteElementCommand`
2. Dispatch command instead of legacy action
3. Remove old action dispatch (if exists)

**Validation**:
- Pressing Delete removes selected element
- Undo restores the element
- Backend operation is queued

**Estimated Time**: 1 hour

---

### Task 1.16: Write Integration Tests for Dispatcher
**Deliverable**: End-to-end dispatcher tests
**Files**:
- `src/components/GraphicEditor/shared/__tests__/CommandDispatcher.test.ts`

**Steps**:
1. Test middleware execution order
2. Test middleware can abort chain
3. Test validation failure prevents execution
4. Test history capture before execution
5. Test operations are queued

**Validation**:
- All tests pass
- Integration tests cover middleware interactions

**Estimated Time**: 2 hours

---

### Task 1.17: Documentation for Phase 1
**Deliverable**: Developer documentation for commands
**Files**:
- `docs/command-pattern.md` (or similar)

**Steps**:
1. Document command interface
2. Document how to create new commands
3. Document middleware chain
4. Provide examples (AddElement, MoveElement, DeleteElement)
5. Document testing approach

**Validation**:
- Documentation is clear and has code examples
- New developer can create a command using docs

**Estimated Time**: 2 hours

---

## Phase 2: Element Operations (Sprint 2, ~2 weeks)

### Task 2.1: Implement ResizeElementCommand
**Deliverable**: Command for resizing elements
**Steps**: (Similar to MoveElementCommand)
1. Implement command with old/new dimensions
2. Implement execute/undo/toOperations
3. Write unit tests
4. Wire to resize handles in Canvas

**Estimated Time**: 3 hours

---

### Task 2.2: Implement RotateElementCommand
**Deliverable**: Command for rotating elements
**Steps**:
1. Implement command with old/new rotation
2. Implement execute/undo/toOperations
3. Write unit tests
4. Wire to rotation handle in Canvas

**Estimated Time**: 3 hours

---

### Task 2.3: Implement UpdateElementPropsCommand
**Deliverable**: Command for updating element properties
**Steps**:
1. Implement command with old/new props (fill, opacity, animation, etc.)
2. Implement execute/undo/toOperations
3. Write unit tests
4. Wire to PropertiesPanel inputs

**Estimated Time**: 4 hours

---

### Task 2.4: Implement DuplicateElementCommand
**Deliverable**: Command for duplicating elements
**Steps**:
1. Create as `BatchCommand` containing `AddElementCommand` with copied properties
2. Wire to context menu "Duplicate" option
3. Write unit tests

**Estimated Time**: 2 hours

---

### Task 2.5: Remove Legacy Element Actions from Reducer
**Deliverable**: Clean up old action types
**Steps**:
1. Remove `ADD_ELEMENT`, `MOVE_ELEMENT`, `DELETE_ELEMENT`, etc. from reducer
2. Remove from action type definitions
3. Remove from legacy dispatch calls (if any remain)
4. Update tests

**Validation**:
- No errors after removal
- All element operations use commands

**Estimated Time**: 2 hours

---

### Task 2.6: Add Command History UI Indicators
**Deliverable**: Show undo/redo availability
**Steps**:
1. Disable Undo button when `state.past.length === 0`
2. Disable Redo button when `state.future.length === 0`
3. Add tooltips showing last command description

**Validation**:
- Buttons are disabled correctly
- Tooltips show command descriptions

**Estimated Time**: 1.5 hours

---

## Phase 3: Page & Audio Operations (Sprint 3, ~2 weeks)

### Task 3.1: Implement AddPageCommand
**Deliverable**: Command for adding pages
**Steps**:
1. Implement command with pre-generated page ID
2. Implement execute/undo/toOperations
3. Write unit tests
4. Wire to "Add Page" button

**Estimated Time**: 3 hours

---

### Task 3.2: Implement DeletePageCommand
**Deliverable**: Command for deleting pages
**Steps**:
1. Implement command with page ID
2. Store deleted page for undo
3. Implement validation to prevent deleting last page
4. Write unit tests
5. Wire to page delete button

**Estimated Time**: 3 hours

---

### Task 3.3: Implement UpdatePageCommand
**Deliverable**: Command for updating page properties
**Steps**:
1. Implement command with old/new page properties
2. Implement execute/undo/toOperations
3. Write unit tests
4. Wire to page duration slider and background picker

**Estimated Time**: 3 hours

---

### Task 3.4: Implement ReorderPagesCommand
**Deliverable**: Command for reordering pages
**Steps**:
1. Implement command with old/new page order
2. Implement execute/undo/toOperations
3. Write unit tests
4. Wire to timeline page drag-drop

**Estimated Time**: 3 hours

---

### Task 3.5: Implement DuplicatePageCommand
**Deliverable**: Command for duplicating pages with elements
**Steps**:
1. Create as `BatchCommand` with `AddPageCommand` + multiple `AddElementCommand`
2. Pre-generate all IDs
3. Wire to Cmd/Ctrl+D shortcut
4. Write unit tests

**Estimated Time**: 3 hours

---

### Task 3.6: Implement AddAudioClipCommand
**Deliverable**: Command for adding audio clips
**Steps**:
1. Implement command with pre-generated clip ID
2. Implement execute/undo/toOperations
3. Write unit tests
4. Wire to audio track drop

**Estimated Time**: 3 hours

---

### Task 3.7: Implement MoveAudioClipCommand
**Deliverable**: Command for moving audio clips
**Steps**:
1. Implement command with old/new start time
2. Implement execute/undo/toOperations
3. Write unit tests
4. Wire to audio clip drag

**Estimated Time**: 3 hours

---

### Task 3.8: Implement TrimAudioClipCommand
**Deliverable**: Command for trimming audio clips
**Steps**:
1. Implement command with old/new offset and duration
2. Implement execute/undo/toOperations
3. Write unit tests
4. Wire to audio clip edge drag

**Estimated Time**: 3 hours

---

### Task 3.9: Implement DeleteAudioClipCommand
**Deliverable**: Command for deleting audio clips (with layerId fix)
**Steps**:
1. Implement command with layer ID and clip ID (fixing missing layerId bug)
2. Store deleted clip for undo
3. Implement execute/undo/toOperations
4. Write unit tests
5. Wire to clip delete button

**Validation**:
- layerId is included in operation target
- Backend receives correct layer ID

**Estimated Time**: 3 hours

---

### Task 3.10: Remove Legacy operationGenerator.ts
**Deliverable**: Delete old operation generation code
**Steps**:
1. Remove `src/components/GraphicEditor/shared/lib/operationGenerator.ts`
2. Remove imports of operationGenerator
3. Remove legacy enhanced dispatch in App.tsx
4. Update tests

**Validation**:
- No compilation errors
- All operations generated by commands

**Estimated Time**: 2 hours

---

### Task 3.11: Remove Legacy Actions from Reducer
**Deliverable**: Clean up all remaining legacy actions
**Steps**:
1. Remove all page and audio actions from reducer
2. Ensure only UI-only actions remain (zoom, pan, selection, etc.)
3. Update reducer tests

**Validation**:
- Reducer only handles UI state
- Content mutations go through commands

**Estimated Time**: 2 hours

---

## Phase 4: Conflict Resolution & Polish (Sprint 4, ~2 weeks)

### Task 4.1: Implement BatchCommand
**Deliverable**: Composite command for grouped operations
**Steps**:
1. Implement `BatchCommand` class
2. Execute child commands sequentially
3. Undo in reverse order
4. Flatten operations
5. Write unit tests

**Estimated Time**: 3 hours

---

### Task 4.2: Add Command Serialization for Crash Recovery
**Deliverable**: Commands persist to localStorage
**Steps**:
1. Create `CommandSerializer` class
2. Implement `serialize()` to JSON
3. Implement `deserialize()` from JSON
4. Store pending commands to localStorage
5. Restore commands on page load
6. Write unit tests

**Validation**:
- Commands survive page refresh
- Deserialized commands execute correctly

**Estimated Time**: 4 hours

---

### Task 4.3: Implement ConflictResolver
**Deliverable**: Conflict resolution logic
**Files**:
- `src/components/GraphicEditor/shared/model/commands/ConflictResolver.ts`

**Steps**:
1. Implement `ConflictResolver` class
2. Implement `resolve()` with last-write-wins strategy
3. Compare client command timestamps with server version
4. Return resolution strategy (client-wins, server-wins, merge)

**Validation**:
- Resolver returns correct strategy based on timestamps

**Estimated Time**: 2 hours

---

### Task 4.4: Add Conflict Resolution UI
**Deliverable**: Modal for conflict resolution
**Files**:
- `src/components/GraphicEditor/features/template-manager/ui/ConflictModal.tsx`

**Steps**:
1. Create `ConflictModal` component
2. Show options: "Keep my changes", "Load server version", "Merge"
3. Integrate with `useOperationQueue` hook
4. On "Keep my changes", force push with server version
5. On "Load server version", reload page
6. On "Merge", call ConflictResolver

**Validation**:
- Modal appears on 409 error
- Each option works correctly

**Estimated Time**: 4 hours

---

### Task 4.5: Add Retry Logic with Exponential Backoff
**Deliverable**: Automatic retry on network errors
**Files**:
- `src/components/GraphicEditor/shared/hooks/useOperationQueue.ts`

**Steps**:
1. Implement `retryWithBackoff()` function
2. Retry up to 3 times with exponential delay (1s, 2s, 4s)
3. Only retry on network errors (not 409)
4. Show toast notification on retry
5. Log retry attempts

**Validation**:
- Operations retry on network failure
- User sees retry notification

**Estimated Time**: 2 hours

---

### Task 4.6: Add Command Performance Monitoring
**Deliverable**: Performance metrics for commands
**Steps**:
1. Enhance logging middleware to track execution duration
2. Log warning if command takes >5ms
3. Add performance metrics to command metadata
4. Create performance report tool (dev mode only)

**Validation**:
- Slow commands are logged
- Performance data is accessible in dev tools

**Estimated Time**: 2 hours

---

### Task 4.7: Add Command History Limit Configuration
**Deliverable**: Configurable history stack size
**Steps**:
1. Add `MAX_HISTORY_SIZE` constant (default: 50)
2. Update history middleware to enforce limit
3. Remove oldest entry when limit exceeded
4. Add UI indicator showing history usage (e.g., "45/50")

**Validation**:
- History stack does not exceed limit
- Memory usage is bounded

**Estimated Time**: 1.5 hours

---

### Task 4.8: Final Integration Testing
**Deliverable**: End-to-end test suite
**Steps**:
1. Test complete workflow: add page → add elements → move → resize → delete → undo → redo
2. Test conflict resolution flow (mock 409 response)
3. Test offline/online transitions
4. Test command serialization/deserialization
5. Test performance under load (100+ commands)

**Validation**:
- All workflows pass
- No regressions from original functionality

**Estimated Time**: 4 hours

---

### Task 4.9: Update Developer Documentation
**Deliverable**: Complete documentation
**Steps**:
1. Document all command types
2. Document conflict resolution
3. Document performance guidelines
4. Add architecture diagrams
5. Add troubleshooting guide

**Validation**:
- Documentation covers all features
- Examples are up-to-date

**Estimated Time**: 3 hours

---

### Task 4.10: Code Cleanup and Linting
**Deliverable**: Clean, lint-free codebase
**Steps**:
1. Remove commented-out code
2. Remove unused imports
3. Run Prettier on all command files
4. Run ESLint and fix warnings
5. Update package.json scripts if needed

**Validation**:
- Zero ESLint warnings
- All files formatted with Prettier

**Estimated Time**: 2 hours

---

## Summary

**Total Tasks**: 57
**Total Estimated Time**: ~122 hours (~8 weeks at 15 hours/week)

**Phase Breakdown**:
- Phase 1 (Foundation): ~30 hours
- Phase 2 (Element Operations): ~20 hours
- Phase 3 (Page & Audio): ~35 hours
- Phase 4 (Conflict Resolution & Polish): ~37 hours

**Dependencies**:
- Phase 2 depends on Phase 1 completion
- Phase 3 depends on Phase 2 completion
- Phase 4 can start after Phase 3 is mostly complete

**Parallelizable Work**:
- Unit tests can be written in parallel with next command implementation
- Documentation can be written incrementally throughout all phases
- UI wiring can be done in parallel if multiple developers

**Risk Mitigation**:
- Each task has clear validation criteria
- Incremental delivery ensures no "big bang" integration
- Tests catch regressions early
- Phase 1 provides immediate value (fixes stale closure bug)
