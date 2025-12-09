# Command Architecture Specification

## Purpose

This specification defines the Command Pattern architecture for the GraphicEditor, establishing a unified approach to handling user actions, state management, undo/redo, and backend synchronization. The Command Pattern addresses critical timing bugs in the current implementation and provides a foundation for offline-first and conflict resolution capabilities.

## ADDED Requirements

### Requirement: Command Interface and Base Classes

The GraphicEditor SHALL provide a Command interface and base implementation that encapsulates user actions with execute, undo, and operation generation capabilities.

#### Scenario: Define command interface

- **WHEN** a command type is defined
- **THEN** it implements the `EditorCommand` interface
- **AND** the interface includes `id`, `type`, `timestamp` properties
- **AND** the interface includes `execute()`, `undo()`, `toOperations()`, `validate()`, and `getMetadata()` methods
- **AND** `execute()` takes `ContentState` and returns new `ContentState`
- **AND** `undo()` takes `ContentState` and returns new `ContentState` (reversing execute)
- **AND** `toOperations()` returns an array of backend `Operation` objects
- **AND** `validate()` checks if command can be applied to current state
- **AND** `getMetadata()` returns human-readable description for debugging

#### Scenario: Create command with pre-generated ID

- **WHEN** a command is instantiated
- **THEN** it receives a unique ID via `nanoid()`
- **AND** it captures current timestamp
- **AND** the ID is used for operation generation (no state discovery needed)

#### Scenario: Validate command before execution

- **WHEN** a command is dispatched
- **THEN** `validate()` is called with current state
- **AND** if validation fails, command execution is aborted
- **AND** validation errors are logged with command type and error messages

### Requirement: CommandDispatcher with Middleware

The GraphicEditor SHALL provide a CommandDispatcher that processes commands through a middleware chain for validation, execution, history tracking, and backend sync.

#### Scenario: Dispatch command through middleware chain

- **WHEN** a command is dispatched via `CommandDispatcher.dispatch(command)`
- **THEN** middleware executes in registration order
- **AND** each middleware calls `next()` to continue the chain
- **AND** middleware can abort the chain by not calling `next()`
- **AND** middleware has access to command, state, and dispatch context

#### Scenario: Execute command with validation middleware

- **WHEN** validation middleware is registered
- **AND** a command is dispatched
- **THEN** `command.validate(state)` is called
- **AND** if validation fails, an error is thrown
- **AND** subsequent middleware does not execute

#### Scenario: Execute command with history middleware

- **WHEN** history middleware is registered
- **AND** a command is dispatched
- **THEN** current state is captured BEFORE command execution
- **AND** captured state is pushed to history stack
- **AND** future history is cleared (can no longer redo)

#### Scenario: Execute command with execution middleware

- **WHEN** execution middleware is registered
- **AND** a command is dispatched
- **THEN** `command.execute(state)` is called
- **AND** new state is set via `setState()`
- **AND** React re-renders with new state

#### Scenario: Execute command with sync middleware

- **WHEN** sync middleware is registered
- **AND** a command is dispatched
- **THEN** `command.toOperations()` is called
- **AND** operations are queued for backend sync
- **AND** operations are batched and flushed after debounce period

#### Scenario: Execute command with logging middleware

- **WHEN** logging middleware is registered
- **AND** a command is dispatched
- **THEN** command type and metadata are logged before execution
- **AND** execution duration is logged after completion
- **AND** logs include timestamp and command ID

### Requirement: Element Commands

The GraphicEditor SHALL provide command implementations for all element manipulation operations.

#### Scenario: Add element with AddElementCommand

- **WHEN** user adds an element to the canvas
- **THEN** `AddElementCommand` is created with pre-generated element ID, page ID, element type, position, dimensions, and fill color
- **AND** executing the command adds the element to the target page
- **AND** undoing the command removes the element from the page
- **AND** `toOperations()` generates an `add_element` operation with element data

#### Scenario: Move element with MoveElementCommand

- **WHEN** user drags an element to a new position
- **THEN** `MoveElementCommand` is created with page ID, element ID, old position, and new position
- **AND** executing the command updates element x/y coordinates
- **AND** undoing the command restores original x/y coordinates
- **AND** `toOperations()` generates a `move_element` operation with new position

#### Scenario: Resize element with ResizeElementCommand

- **WHEN** user drags a resize handle on an element
- **THEN** `ResizeElementCommand` is created with page ID, element ID, old dimensions, and new dimensions
- **AND** executing the command updates element width/height
- **AND** undoing the command restores original width/height
- **AND** `toOperations()` generates a `resize_element` operation with new dimensions

#### Scenario: Rotate element with RotateElementCommand

- **WHEN** user drags the rotation handle on an element
- **THEN** `RotateElementCommand` is created with page ID, element ID, old rotation, and new rotation
- **AND** executing the command updates element rotation angle
- **AND** undoing the command restores original rotation angle
- **AND** `toOperations()` generates a `rotate_element` operation with new rotation

#### Scenario: Delete element with DeleteElementCommand

- **WHEN** user deletes an element
- **THEN** `DeleteElementCommand` is created with page ID and element ID
- **AND** executing the command stores deleted element data and removes element from page
- **AND** undoing the command restores the element with original data
- **AND** `toOperations()` generates a `delete_element` operation with target IDs

#### Scenario: Update element properties with UpdateElementPropsCommand

- **WHEN** user changes element properties (fill, opacity, animation, etc.)
- **THEN** `UpdateElementPropsCommand` is created with page ID, element ID, old properties, and new properties
- **AND** executing the command merges new properties into element
- **AND** undoing the command restores original properties
- **AND** `toOperations()` generates an `update_element_props` operation with changed properties

### Requirement: Page Commands

The GraphicEditor SHALL provide command implementations for all page manipulation operations.

#### Scenario: Add page with AddPageCommand

- **WHEN** user adds a new page
- **THEN** `AddPageCommand` is created with pre-generated page ID, duration, and background
- **AND** executing the command appends the page to pages array
- **AND** undoing the command removes the page
- **AND** `toOperations()` generates an `add_page` operation with page data

#### Scenario: Delete page with DeletePageCommand

- **WHEN** user deletes a page
- **THEN** `DeletePageCommand` is created with page ID
- **AND** executing the command stores deleted page data and removes page
- **AND** undoing the command restores the page at original index
- **AND** `toOperations()` generates a `delete_page` operation with page ID
- **AND** validation ensures at least one page remains (prevents deleting last page)

#### Scenario: Update page with UpdatePageCommand

- **WHEN** user updates page properties (duration, background, animation)
- **THEN** `UpdatePageCommand` is created with page ID, old properties, and new properties
- **AND** executing the command updates page properties
- **AND** undoing the command restores original properties
- **AND** `toOperations()` generates an `update_page` operation with changed properties

#### Scenario: Reorder pages with ReorderPagesCommand

- **WHEN** user drags a page to reorder in timeline
- **THEN** `ReorderPagesCommand` is created with old order and new order (arrays of page IDs)
- **AND** executing the command reorders pages array
- **AND** undoing the command restores original page order
- **AND** `toOperations()` generates a `reorder_pages` operation with new page ID order

### Requirement: Audio Commands

The GraphicEditor SHALL provide command implementations for all audio clip manipulation operations.

#### Scenario: Add audio clip with AddAudioClipCommand

- **WHEN** user adds an audio clip to a layer
- **THEN** `AddAudioClipCommand` is created with pre-generated clip ID, layer ID, audio source, label, start time, duration, and offset
- **AND** executing the command adds clip to target layer
- **AND** undoing the command removes the clip
- **AND** `toOperations()` generates an `add_audio_clip` operation with clip data

#### Scenario: Move audio clip with MoveAudioClipCommand

- **WHEN** user drags an audio clip horizontally on timeline
- **THEN** `MoveAudioClipCommand` is created with layer ID, clip ID, old start time, and new start time
- **AND** executing the command updates clip start time
- **AND** undoing the command restores original start time
- **AND** `toOperations()` generates an `update_audio_clip` operation with new start time

#### Scenario: Trim audio clip with TrimAudioClipCommand

- **WHEN** user drags audio clip edge to trim
- **THEN** `TrimAudioClipCommand` is created with layer ID, clip ID, old trim values, and new trim values (offset, duration)
- **AND** executing the command updates clip offset and duration
- **AND** undoing the command restores original trim values
- **AND** `toOperations()` generates an `update_audio_clip` operation with new offset/duration

#### Scenario: Delete audio clip with DeleteAudioClipCommand

- **WHEN** user deletes an audio clip
- **THEN** `DeleteAudioClipCommand` is created with layer ID and clip ID
- **AND** executing the command stores deleted clip data and removes clip from layer
- **AND** undoing the command restores the clip
- **AND** `toOperations()` generates a `delete_audio_clip` operation with layer ID and clip ID
- **AND** layer ID is explicitly provided (fixing missing layerId bug)

### Requirement: Batch Commands

The GraphicEditor SHALL support composite commands that group multiple operations as a single undo/redo unit.

#### Scenario: Execute batch command

- **WHEN** `BatchCommand` is dispatched with multiple child commands
- **THEN** executing the batch calls `execute()` on each child command in sequence
- **AND** state updates are chained (output of command N is input to command N+1)
- **AND** undoing the batch calls `undo()` on each child in reverse order
- **AND** `toOperations()` flattens all child operations into a single array
- **AND** validation checks all child commands before execution

#### Scenario: Create batch command for duplicate page

- **WHEN** user duplicates a page with elements
- **THEN** `BatchCommand` is created containing `AddPageCommand` and multiple `AddElementCommand` instances
- **AND** all commands use pre-generated IDs
- **AND** executing the batch creates page and all elements atomically
- **AND** undoing the batch removes all elements and page in one step

### Requirement: Undo and Redo with Commands

The GraphicEditor SHALL support undo and redo operations using command history.

#### Scenario: Undo command

- **WHEN** user presses Cmd/Ctrl+Z or clicks Undo button
- **AND** history stack has previous state
- **THEN** previous state is restored from history
- **AND** current state is moved to future stack
- **AND** selection state is cleared
- **AND** Undo button is disabled if no more history

#### Scenario: Redo command

- **WHEN** user presses Cmd/Ctrl+Shift+Z or clicks Redo button
- **AND** future stack has next state
- **THEN** next state is restored from future stack
- **AND** current state is moved to history stack
- **AND** selection state is cleared
- **AND** Redo button is disabled if no more future history

#### Scenario: Clear redo history on new command

- **WHEN** any new command is executed (not undo/redo)
- **THEN** future history stack is cleared
- **AND** user cannot redo previously undone commands
- **AND** new command becomes the latest history entry

#### Scenario: Limit history stack size

- **WHEN** history stack exceeds maximum size (default: 50 entries)
- **THEN** oldest history entry is removed (FIFO)
- **AND** memory usage is bounded

### Requirement: Command Validation

The GraphicEditor SHALL validate all commands before execution to prevent invalid state transitions.

#### Scenario: Validate element exists for update

- **WHEN** `MoveElementCommand` or `ResizeElementCommand` is dispatched
- **AND** target element ID does not exist in target page
- **THEN** validation fails with error "Element not found"
- **AND** command execution is aborted
- **AND** error is logged to console

#### Scenario: Validate page exists for element operation

- **WHEN** any element command is dispatched
- **AND** target page ID does not exist
- **THEN** validation fails with error "Page not found"
- **AND** command execution is aborted

#### Scenario: Validate last page cannot be deleted

- **WHEN** `DeletePageCommand` is dispatched
- **AND** only one page exists
- **THEN** validation fails with error "Cannot delete last page"
- **AND** command execution is aborted

#### Scenario: Validate element ID uniqueness

- **WHEN** `AddElementCommand` is dispatched
- **AND** element ID already exists in target page
- **THEN** validation fails with error "Element ID already exists"
- **AND** command execution is aborted

### Requirement: React Integration Hook

The GraphicEditor SHALL provide a `useCommandDispatch` hook for dispatching commands from React components.

#### Scenario: Create command dispatcher hook

- **WHEN** component calls `useCommandDispatch(state, setState, pushHistory, queueOperations)`
- **THEN** a `CommandDispatcher` instance is created on first render
- **AND** middleware is registered (logging, validation, history, execution, sync)
- **AND** hook returns a dispatch function
- **AND** dispatch function is memoized (stable reference)

#### Scenario: Dispatch command from component

- **WHEN** component calls `dispatchCommand(command)`
- **THEN** command flows through middleware chain
- **AND** state updates trigger React re-render
- **AND** operations are queued for backend sync
- **AND** history is captured for undo

#### Scenario: Update dispatcher context on re-render

- **WHEN** component re-renders with new state
- **THEN** dispatcher context is updated with latest state, setState, pushHistory, queueOperations
- **AND** middleware has access to current values
- **AND** no memory leaks from stale closures

### Requirement: Backend Operation Synchronization

The GraphicEditor SHALL synchronize commands with the backend via operation queue without timing bugs.

#### Scenario: Queue operations from command

- **WHEN** command is executed via execution middleware
- **THEN** `command.toOperations()` is called
- **AND** operations are added to operation queue
- **AND** queue debounces flush for 2 seconds
- **AND** multiple commands in quick succession are batched

#### Scenario: Flush operation queue

- **WHEN** debounce period expires
- **AND** operation queue has pending operations
- **THEN** `POST /templates/:id/operations` is called with operations array and base version
- **AND** on success, version is updated and queue is cleared
- **AND** on conflict (409), conflict resolution flow is triggered
- **AND** on other errors, operations are retried with exponential backoff

#### Scenario: Handle version conflict with commands

- **WHEN** backend returns HTTP 409 (version conflict)
- **THEN** conflict modal is displayed with options: "Keep my changes", "Load server version", "Merge"
- **AND** if "Keep my changes", operations are force-pushed with server version as base
- **AND** if "Load server version", page is reloaded to fetch server state
- **AND** if "Merge", conflict resolver attempts to merge based on timestamps

### Requirement: Performance and Testing

The GraphicEditor SHALL ensure command execution is performant and all commands are unit-tested.

#### Scenario: Execute command within performance budget

- **WHEN** any command is executed
- **THEN** execution completes in <5ms (99th percentile)
- **AND** logging middleware measures and logs duration
- **AND** performance regression is detected in CI

#### Scenario: Unit test command execution

- **WHEN** command unit test runs
- **THEN** test verifies `execute()` produces correct state
- **AND** test verifies `undo()` reverses execute() correctly
- **AND** test verifies `toOperations()` generates correct operation structure
- **AND** test verifies `validate()` catches invalid states
- **AND** tests run without React (pure TypeScript)

#### Scenario: Integration test command dispatcher

- **WHEN** dispatcher integration test runs
- **THEN** test verifies middleware executes in correct order
- **AND** test verifies middleware can abort chain
- **AND** test verifies context updates on re-render
- **AND** test verifies history capture and undo/redo

## MODIFIED Requirements

None (this is a new capability, no existing requirements modified).

## REMOVED Requirements

None (this is additive, no requirements removed).
