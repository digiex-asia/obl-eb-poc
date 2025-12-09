/**
 * CommandDispatcher - Central command execution and middleware chain
 *
 * Responsibilities:
 * - Execute commands on state
 * - Run middleware (history capture, operation generation, logging)
 * - Provide undo/redo capability
 */

import type { ContentState } from '../model/types';
import type { EditorCommand, CommandMiddleware } from './types';
import { nanoid } from 'nanoid';

export class CommandDispatcher {
  private middleware: CommandMiddleware[] = [];
  private history: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];
  private readonly MAX_HISTORY = 100;

  /**
   * Add middleware to the chain
   */
  use(middleware: CommandMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Dispatch a command (execute + middleware chain)
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

    // Execute command
    const newState = currentCommand.execute(state);

    // Add to history
    this.addToHistory(currentCommand);

    return newState;
  }

  /**
   * Undo last command
   */
  undo(state: ContentState): ContentState | null {
    const command = this.history.pop();
    if (!command) return null;

    this.redoStack.push(command);
    return command.undo(state);
  }

  /**
   * Redo last undone command
   */
  redo(state: ContentState): ContentState | null {
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
   * Get command history (for debugging)
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
  }

  /**
   * Add command to history
   */
  private addToHistory(command: EditorCommand): void {
    this.history.push(command);

    // Clear redo stack when new command is executed
    this.redoStack = [];

    // Limit history size
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
  }
}
