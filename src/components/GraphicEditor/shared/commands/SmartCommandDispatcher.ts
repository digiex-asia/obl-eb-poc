/**
 * Smart Command Dispatcher with Operation Throttling
 *
 * Solves the problem of generating too many operations during continuous
 * actions like dragging, resizing, or property changes.
 *
 * Strategy:
 * 1. Execute commands immediately on local state (instant UI feedback)
 * 2. Delay operation generation until action completes
 * 3. Only generate ONE operation per command sequence
 */

import type { ContentState } from '../model/types';
import type { EditorCommand, CommandMiddleware } from './types';
import { nanoid } from 'nanoid';

export interface SmartCommandDispatcherOptions {
  /**
   * How long to wait after last command before generating operations
   * Default: 300ms (user has stopped dragging/editing)
   */
  operationDelay?: number;

  /**
   * Maximum commands to keep in history
   * Default: 100
   */
  maxHistory?: number;
}

export class SmartCommandDispatcher {
  private middleware: CommandMiddleware[] = [];
  private history: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];
  private readonly maxHistory: number;
  private readonly operationDelay: number;

  // Track pending operations
  private pendingOperationTimer: NodeJS.Timeout | null = null;
  private pendingCommands: EditorCommand[] = [];
  private onOperationsReady?: (commands: EditorCommand[]) => void;

  constructor(options: SmartCommandDispatcherOptions = {}) {
    this.maxHistory = options.maxHistory || 100;
    this.operationDelay = options.operationDelay || 300;
  }

  /**
   * Set callback for when operations are ready to send
   */
  setOperationsReadyCallback(callback: (commands: EditorCommand[]) => void) {
    this.onOperationsReady = callback;
  }

  /**
   * Add middleware to the chain
   */
  use(middleware: CommandMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Dispatch a command (execute + smart operation generation)
   */
  dispatch(command: EditorCommand, state: ContentState): ContentState {
    // Ensure command has ID and timestamp
    if (!command.id) {
      (command as any).id = nanoid();
    }
    if (!command.timestamp) {
      (command as any).timestamp = Date.now();
    }

    // Run middleware chain
    let currentCommand = command;
    const chain = [...this.middleware];

    const executeNext = (cmd: EditorCommand) => {
      currentCommand = cmd;
      const nextMiddleware = chain.shift();
      if (nextMiddleware) {
        nextMiddleware(currentCommand, executeNext);
      }
    };

    // Start chain
    if (chain.length > 0) {
      executeNext(currentCommand);
    }

    // Execute command immediately (instant UI update)
    const newState = currentCommand.execute(state);

    // Add to history
    this.addToHistory(currentCommand);

    // Smart operation generation (delayed)
    this.scheduleOperationGeneration(currentCommand);

    return newState;
  }

  /**
   * Schedule operation generation with smart throttling
   * Only generates operations after user stops acting
   */
  private scheduleOperationGeneration(command: EditorCommand): void {
    // Add to pending commands
    this.pendingCommands.push(command);

    // Cancel existing timer
    if (this.pendingOperationTimer) {
      clearTimeout(this.pendingOperationTimer);
    }

    // Start new timer
    this.pendingOperationTimer = setTimeout(() => {
      this.generateOperationsFromPending();
    }, this.operationDelay);
  }

  /**
   * Generate operations from pending commands
   * Coalesces similar commands into single operations
   */
  private generateOperationsFromPending(): void {
    if (this.pendingCommands.length === 0) return;

    console.log(
      `[SmartCommandDispatcher] Generating operations from ${this.pendingCommands.length} pending commands`
    );

    // Coalesce commands by target
    const coalesced = this.coalesceCommands(this.pendingCommands);

    console.log(
      `[SmartCommandDispatcher] Coalesced to ${coalesced.length} commands (${Math.round((1 - coalesced.length / this.pendingCommands.length) * 100)}% reduction)`
    );

    // Notify callback
    if (this.onOperationsReady) {
      this.onOperationsReady(coalesced);
    }

    // Clear pending commands
    this.pendingCommands = [];
    this.pendingOperationTimer = null;
  }

  /**
   * Coalesce similar commands targeting the same entity
   * Example: 100 MoveElementCommands → 1 final MoveElementCommand
   */
  private coalesceCommands(commands: EditorCommand[]): EditorCommand[] {
    if (commands.length === 0) return [];

    // Group commands by type and target
    const groups = new Map<string, EditorCommand[]>();

    for (const cmd of commands) {
      const key = this.getCoalesceKey(cmd);
      const existing = groups.get(key);

      if (existing) {
        existing.push(cmd);
      } else {
        groups.set(key, [cmd]);
      }
    }

    // For each group, keep only the LAST command
    const coalesced: EditorCommand[] = [];

    for (const [key, group] of groups.entries()) {
      if (this.canCoalesce(group[0])) {
        // Keep only the last command in the group
        coalesced.push(group[group.length - 1]);
      } else {
        // Keep all non-coalescable commands (e.g., add, delete)
        coalesced.push(...group);
      }
    }

    return coalesced;
  }

  /**
   * Get a key for grouping coalescable commands
   */
  private getCoalesceKey(command: EditorCommand): string {
    const metadata = command.getMetadata();
    // Key = type + affected IDs
    return `${metadata.type}:${metadata.affectedIds.join(':')}`;
  }

  /**
   * Check if command type can be coalesced
   */
  private canCoalesce(command: EditorCommand): boolean {
    const coalescableTypes = [
      'move_element',
      'resize_element',
      'rotate_element',
      'update_element',
    ];
    return coalescableTypes.includes(command.type);
  }

  /**
   * Flush any pending operations immediately
   */
  flushPendingOperations(): void {
    if (this.pendingOperationTimer) {
      clearTimeout(this.pendingOperationTimer);
      this.generateOperationsFromPending();
    }
  }

  /**
   * Undo last command
   */
  undo(state: ContentState): ContentState | null {
    // Flush pending operations before undo
    this.flushPendingOperations();

    const command = this.history.pop();
    if (!command) return null;

    this.redoStack.push(command);
    return command.undo(state);
  }

  /**
   * Redo last undone command
   */
  redo(state: ContentState): ContentState | null {
    // Flush pending operations before redo
    this.flushPendingOperations();

    const command = this.redoStack.pop();
    if (!command) return null;

    this.history.push(command);
    return command.execute(state);
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.history.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get command history
   */
  getHistory(): EditorCommand[] {
    return [...this.history];
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];
    this.redoStack = [];
    this.pendingCommands = [];
    if (this.pendingOperationTimer) {
      clearTimeout(this.pendingOperationTimer);
      this.pendingOperationTimer = null;
    }
  }

  /**
   * Add command to history
   */
  private addToHistory(command: EditorCommand): void {
    this.history.push(command);

    // Clear redo stack when new command is executed
    this.redoStack = [];

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Get statistics about operation generation
   */
  getStats(): {
    historySize: number;
    redoSize: number;
    pendingCommands: number;
    hasPendingTimer: boolean;
  } {
    return {
      historySize: this.history.length,
      redoSize: this.redoStack.length,
      pendingCommands: this.pendingCommands.length,
      hasPendingTimer: this.pendingOperationTimer !== null,
    };
  }
}
