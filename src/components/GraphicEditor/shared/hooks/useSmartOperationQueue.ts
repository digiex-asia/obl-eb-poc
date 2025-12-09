/**
 * Smart Operation Queue with Coalescing and Deduplication
 *
 * Solves the problem of too many operations during continuous actions like:
 * - Dragging (generates 100+ move operations)
 * - Resizing (generates 100+ resize operations)
 * - Property slider changes (generates many update operations)
 *
 * Features:
 * - Operation Coalescing: Merges similar operations into one
 * - Deduplication: Removes redundant operations
 * - Smart Batching: Groups operations by type and target
 * - Debouncing: Waits for user to finish action before sending
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash-es';
import type { Operation } from '../types/api.types';
import { operationsApi } from '../api/operations.api';

interface UseSmartOperationQueueOptions {
  templateId: string | null;
  templateVersion: number;
  delay?: number; // milliseconds, default 2000
  enabled?: boolean;
  coalesceWindow?: number; // milliseconds to coalesce operations, default 100ms
  onVersionConflict?: (currentVersion: number, requestedVersion: number) => void;
  onSuccess?: (newVersion: number) => void;
}

interface UseSmartOperationQueueReturn {
  queueOperation: (operation: Operation | Operation[] | null) => void;
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  queueSize: number;
  coalescedSize: number; // How many operations after coalescing
  flush: () => Promise<void>;
}

/**
 * Create a key to identify coalescing candidates
 * Operations with the same key will be coalesced
 */
function getCoalesceKey(operation: Operation): string {
  const { type, target } = operation;

  // For element operations, key is: type + pageId + elementId
  if (target.pageId && target.elementId) {
    return `${type}:${target.pageId}:${target.elementId}`;
  }

  // For page operations, key is: type + pageId
  if (target.pageId) {
    return `${type}:${target.pageId}`;
  }

  // For audio operations, key is: type + layerId + clipId
  if (target.audioLayerId && target.clipId) {
    return `${type}:${target.audioLayerId}:${target.clipId}`;
  }

  // Default: use operation ID (no coalescing)
  return operation.id;
}

/**
 * Check if two operations can be coalesced
 */
function canCoalesce(op1: Operation, op2: Operation): boolean {
  // Must be same type
  if (op1.type !== op2.type) return false;

  // Must target same entity
  if (getCoalesceKey(op1) !== getCoalesceKey(op2)) return false;

  // These operation types can be coalesced
  const coalescableTypes = [
    'move_element',
    'resize_element',
    'rotate_element',
    'update_element_props',
    'update_element',
    'update_audio_clip',
    'move_audio_clip',
  ];

  return coalescableTypes.includes(op1.type);
}

/**
 * Coalesce two operations into one
 * The newer operation's payload takes precedence
 */
function coalesceOperations(older: Operation, newer: Operation): Operation {
  return {
    ...newer,
    id: newer.id, // Keep newest ID
    timestamp: newer.timestamp, // Keep newest timestamp
    payload: {
      ...older.payload, // Start with older payload
      ...newer.payload, // Override with newer payload
    },
  };
}

/**
 * Coalesce a list of operations
 * Reduces redundant operations by merging similar ones
 */
function coalesceOperationList(operations: Operation[]): Operation[] {
  if (operations.length === 0) return [];

  // Map to track latest operation for each coalesce key
  const coalesceMap = new Map<string, Operation>();
  const nonCoalescableOps: Operation[] = [];

  for (const op of operations) {
    const key = getCoalesceKey(op);

    // Check if this operation can be coalesced
    const existing = coalesceMap.get(key);

    if (existing && canCoalesce(existing, op)) {
      // Coalesce with existing operation
      const coalesced = coalesceOperations(existing, op);
      coalesceMap.set(key, coalesced);
    } else if (canCoalesce(op, op)) {
      // New coalescable operation
      coalesceMap.set(key, op);
    } else {
      // Non-coalescable operation (e.g., add_element, delete_element)
      nonCoalescableOps.push(op);
    }
  }

  // Combine coalesced and non-coalesced operations
  const coalesced = Array.from(coalesceMap.values());
  return [...nonCoalescableOps, ...coalesced];
}

/**
 * Smart operation queue hook
 */
export const useSmartOperationQueue = (
  options: UseSmartOperationQueueOptions
): UseSmartOperationQueueReturn => {
  const {
    templateId,
    templateVersion,
    delay = 2000,
    enabled = true,
    coalesceWindow = 100, // 100ms window to coalesce operations
    onVersionConflict,
    onSuccess,
  } = options;

  const [operationQueue, setOperationQueue] = useState<Operation[]>([]);
  const [coalescedQueue, setCoalescedQueue] = useState<Operation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Use ref to avoid stale closures
  const queueRef = useRef<Operation[]>([]);
  const versionRef = useRef(templateVersion);
  const templateIdRef = useRef(templateId);
  const enabledRef = useRef(enabled);

  // Update refs when values change
  useEffect(() => {
    versionRef.current = templateVersion;
  }, [templateVersion]);

  useEffect(() => {
    templateIdRef.current = templateId;
  }, [templateId]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  /**
   * Coalesce the current queue
   * Called periodically to reduce queue size
   */
  const coalesceQueue = useCallback(() => {
    if (queueRef.current.length === 0) return;

    const originalSize = queueRef.current.length;
    const coalesced = coalesceOperationList(queueRef.current);

    if (coalesced.length < originalSize) {
      console.log(
        `[SmartOperationQueue] Coalesced ${originalSize} operations → ${coalesced.length} operations (${Math.round((1 - coalesced.length / originalSize) * 100)}% reduction)`
      );
    }

    queueRef.current = coalesced;
    setOperationQueue(coalesced);
    setCoalescedQueue(coalesced);
  }, []);

  /**
   * Flush the queue - send all pending operations to backend
   */
  const flushQueue = useCallback(async () => {
    const currentEnabled = enabledRef.current;
    const currentTemplateId = templateIdRef.current;
    const currentVersion = versionRef.current;

    if (!currentEnabled || !currentTemplateId || queueRef.current.length === 0) {
      return;
    }

    // Final coalescing before sending
    coalesceQueue();

    const opsToSend = [...queueRef.current];
    queueRef.current = [];
    setOperationQueue([]);
    setCoalescedQueue([]);

    setIsSaving(true);
    setError(null);

    try {
      console.log(
        `[SmartOperationQueue] Sending ${opsToSend.length} operations to backend...`,
        opsToSend
      );

      if (!currentTemplateId) {
        throw new Error('Template ID is null');
      }

      const response = await operationsApi.applyOperations(currentTemplateId, {
        operations: opsToSend,
        baseVersion: currentVersion,
      });

      setLastSaved(new Date());

      const newVersion = response.template.version;
      versionRef.current = newVersion;

      if (onSuccess) {
        onSuccess(newVersion);
      }

      console.log(
        `[SmartOperationQueue] ✅ Successfully applied ${response.appliedOps.length} operations. Version: ${currentVersion} → ${newVersion}`
      );
    } catch (err: any) {
      if (err.response?.status === 409) {
        const conflictData = err.response.data;
        console.error('[SmartOperationQueue] Version conflict:', conflictData);

        if (onVersionConflict) {
          onVersionConflict(
            conflictData.currentVersion,
            conflictData.requestedVersion
          );
        }

        setError(
          new Error(
            `Version conflict: Current version ${conflictData.currentVersion}`
          )
        );
      } else {
        const error = err instanceof Error ? err : new Error('Failed to save operations');
        setError(error);
        console.error('[SmartOperationQueue] Save failed:', error);
      }

      console.warn('[SmartOperationQueue] Discarding failed operations:', opsToSend);
    } finally {
      setIsSaving(false);
    }
  }, [enabled, templateId, onSuccess, onVersionConflict, coalesceQueue]);

  // Debounced flush
  const debouncedFlush = useRef(
    debounce(() => {
      flushQueue();
    }, delay)
  ).current;

  // Periodic coalescing (during active editing)
  const debouncedCoalesce = useRef(
    debounce(() => {
      coalesceQueue();
    }, coalesceWindow)
  ).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedFlush.cancel();
      debouncedCoalesce.cancel();
    };
  }, [debouncedFlush, debouncedCoalesce]);

  /**
   * Add operation(s) to the queue
   */
  const queueOperation = useCallback(
    (operation: Operation | Operation[] | null) => {
      if (!operation || !enabled) {
        return;
      }

      const ops = Array.isArray(operation) ? operation : [operation];

      // Add to queue
      queueRef.current = [...queueRef.current, ...ops];
      setOperationQueue(queueRef.current);

      // Trigger periodic coalescing
      debouncedCoalesce();

      // Trigger debounced flush
      debouncedFlush();
    },
    [enabled, debouncedFlush, debouncedCoalesce]
  );

  /**
   * Manual flush (bypasses debounce)
   */
  const flush = useCallback(async () => {
    debouncedFlush.cancel();
    debouncedCoalesce.cancel();
    await flushQueue();
  }, [debouncedFlush, debouncedCoalesce, flushQueue]);

  return {
    queueOperation,
    isSaving,
    lastSaved,
    error,
    queueSize: operationQueue.length,
    coalescedSize: coalescedQueue.length,
    flush,
  };
};
