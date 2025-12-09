/**
 * Command Pattern Types for GraphicEditor
 *
 * Commands encapsulate user actions as objects that can:
 * - Execute (update local state)
 * - Undo (reverse changes)
 * - Generate operations (for backend sync)
 */

import type { ContentState } from '../model/types';
import type { Operation } from '../types/api.types';

/**
 * Core Command interface
 */
export interface EditorCommand<TPayload = any> {
  /** Unique command ID (for idempotency) */
  id: string;

  /** Command type (e.g., 'add_element') */
  type: string;

  /** Creation timestamp (for conflict resolution) */
  timestamp: number;

  /**
   * Execute the command on local state
   * Returns new state (pure function)
   */
  execute(state: ContentState): ContentState;

  /**
   * Reverse the command for undo
   * Returns new state (pure function)
   */
  undo(state: ContentState): ContentState;

  /**
   * Generate backend operation(s) for synchronization
   * Does NOT require state - all data is encapsulated in command
   */
  toOperations(): Operation[];

  /**
   * Get command metadata for logging/debugging
   */
  getMetadata(): CommandMetadata;
}

/**
 * Command metadata
 */
export interface CommandMetadata {
  type: string;
  timestamp: number;
  affectedIds: string[];
  description: string;
}

/**
 * Command validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Command dispatcher middleware
 */
export type CommandMiddleware = (
  command: EditorCommand,
  next: (cmd: EditorCommand) => void,
) => void;
