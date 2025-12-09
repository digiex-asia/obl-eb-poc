/**
 * useOperationBatcher - Batches transient operations during drag/resize
 *
 * Problem: Mouse move events during drag generate 100+ UPDATE_ELEMENT actions
 * Solution: Batch these operations and only send the FINAL state after mouseup
 */

import { useRef, useCallback, useEffect } from 'react';
import type { Operation } from '../types/api.types';

interface UseOperationBatcherOptions {
  delay?: number; // ms to wait after last operation before flushing (default: 300ms)
  onFlush: (operations: Operation[]) => void;
}

interface UseOperationBatcherReturn {
  batchOperation: (operation: Operation | Operation[] | null) => void;
  flush: () => void;
  isActive: boolean;
}

/**
 * Hook to batch operations during continuous actions (drag, resize, etc.)
 */
export const useOperationBatcher = (
  options: UseOperationBatcherOptions
): UseOperationBatcherReturn => {
  const { delay = 300, onFlush } = options;

  // Store pending operations grouped by key (type + target)
  const pendingOpsRef = useRef<Map<string, Operation>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Get a key for grouping operations
   */
  const getOperationKey = useCallback((op: Operation): string => {
    const { type, target } = op;

    // Group by type + all target IDs
    const targetKeys = [
      target.pageId,
      target.elementId,
      target.audioLayerId,
      target.clipId,
    ]
      .filter(Boolean)
      .join(':');

    return `${type}:${targetKeys}`;
  }, []);

  /**
   * Flush all pending operations
   */
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (pendingOpsRef.current.size > 0) {
      const operations = Array.from(pendingOpsRef.current.values());
      console.log(
        `[OperationBatcher] Flushing ${pendingOpsRef.current.size} batched operations`
      );
      pendingOpsRef.current.clear();
      onFlush(operations);
    }
  }, [onFlush]);

  /**
   * Add operation(s) to the batch
   */
  const batchOperation = useCallback(
    (operation: Operation | Operation[] | null) => {
      if (!operation) return;

      const ops = Array.isArray(operation) ? operation : [operation];

      // Add/replace operations in the batch
      for (const op of ops) {
        const key = getOperationKey(op);

        // For coalescable operations, keep only the latest
        const coalescableTypes = [
          'move_element',
          'resize_element',
          'rotate_element',
          'update_element',
        ];

        if (coalescableTypes.includes(op.type)) {
          // Replace existing operation (keep newest)
          pendingOpsRef.current.set(key, op);
        } else {
          // Non-coalescable operations: add with unique key
          pendingOpsRef.current.set(`${key}:${op.id}`, op);
        }
      }

      // Reset flush timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        flush();
      }, delay);
    },
    [delay, flush, getOperationKey]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        flush();
      }
    };
  }, [flush]);

  return {
    batchOperation,
    flush,
    isActive: pendingOpsRef.current.size > 0,
  };
};
