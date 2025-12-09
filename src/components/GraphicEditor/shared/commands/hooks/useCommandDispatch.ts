/**
 * useCommandDispatch - React hook for command-based state updates
 *
 * Replaces direct dispatch calls with command-based updates
 * Automatically generates operations for backend sync
 */

import { useCallback, useMemo, useRef } from 'react';
import type { ContentState } from '../../model/types';
import type { EditorCommand } from '../types';
import { CommandDispatcher } from '../CommandDispatcher';
import type { Operation } from '../../types/api.types';

interface UseCommandDispatchOptions {
  onOperationsGenerated?: (operations: Operation[]) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export function useCommandDispatch(
  state: ContentState,
  setState: (state: ContentState) => void,
  options: UseCommandDispatchOptions = {},
) {
  const dispatcherRef = useRef<CommandDispatcher>(new CommandDispatcher());
  const dispatcher = dispatcherRef.current;

  // Setup middleware for operation generation
  useMemo(() => {
    if (options.onOperationsGenerated) {
      dispatcher.use((command, next) => {
        const operations = command.toOperations();
        if (operations.length > 0) {
          options.onOperationsGenerated!(operations);
        }
        next(command);
      });
    }
  }, [dispatcher, options.onOperationsGenerated]);

  /**
   * Execute a command
   */
  const executeCommand = useCallback(
    (command: EditorCommand) => {
      const newState = dispatcher.dispatch(command, state);
      setState(newState);

      // Notify history change
      if (options.onHistoryChange) {
        options.onHistoryChange(dispatcher.canUndo(), dispatcher.canRedo());
      }
    },
    [dispatcher, state, setState, options],
  );

  /**
   * Undo last command
   */
  const undo = useCallback(() => {
    const newState = dispatcher.undo(state);
    if (newState) {
      setState(newState);

      if (options.onHistoryChange) {
        options.onHistoryChange(dispatcher.canUndo(), dispatcher.canRedo());
      }
    }
  }, [dispatcher, state, setState, options]);

  /**
   * Redo last undone command
   */
  const redo = useCallback(() => {
    const newState = dispatcher.redo(state);
    if (newState) {
      setState(newState);

      if (options.onHistoryChange) {
        options.onHistoryChange(dispatcher.canUndo(), dispatcher.canRedo());
      }
    }
  }, [dispatcher, state, setState, options]);

  return {
    executeCommand,
    undo,
    redo,
    canUndo: dispatcher.canUndo(),
    canRedo: dispatcher.canRedo(),
    history: dispatcher.getHistory(),
    clearHistory: () => dispatcher.clearHistory(),
  };
}
