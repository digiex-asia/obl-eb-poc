import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash-es';
import type { Operation } from '../types/api.types';
import { operationsApi } from '../api/operations.api';

interface UseOperationQueueOptions {
  templateId: string | null;
  templateVersion: number;
  delay?: number; // milliseconds, default 2000
  enabled?: boolean;
  onVersionConflict?: (currentVersion: number, requestedVersion: number) => void;
  onSuccess?: (newVersion: number) => void;
}

interface UseOperationQueueReturn {
  queueOperation: (operation: Operation | Operation[] | null) => void;
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  queueSize: number;
  flush: () => Promise<void>;
}

/**
 * Hook for batching and auto-saving operations with debouncing
 *
 * Features:
 * - Batches multiple operations into a single API call
 * - Debounces saves (default 2 seconds after last change)
 * - Optimistic locking with version tracking
 * - Automatic conflict resolution
 *
 * @example
 * const { queueOperation } = useOperationQueue({
 *   templateId: currentTemplateId,
 *   templateVersion: version,
 *   enabled: !!currentTemplateId,
 *   onSuccess: (newVersion) => setVersion(newVersion)
 * });
 *
 * // In reducer middleware:
 * const ops = operationGenerator.fromAction(action, { currentState });
 * queueOperation(ops);
 */
export const useOperationQueue = (
  options: UseOperationQueueOptions
): UseOperationQueueReturn => {
  const {
    templateId,
    templateVersion,
    delay = 2000,
    enabled = true,
    onVersionConflict,
    onSuccess,
  } = options;

  const [operationQueue, setOperationQueue] = useState<Operation[]>([]);
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
   * Flush the queue - send all pending operations to backend
   */
  const flushQueue = useCallback(async () => {
    // Use refs to get current values (avoid stale closure)
    const currentEnabled = enabledRef.current;
    const currentTemplateId = templateIdRef.current;
    const currentVersion = versionRef.current;

    console.log('[OperationQueue] flushQueue called:', {
      enabled: currentEnabled,
      templateId: currentTemplateId,
      queueSize: queueRef.current.length,
    });

    if (!currentEnabled || !currentTemplateId || queueRef.current.length === 0) {
      console.log('[OperationQueue] Skipping flush - conditions not met');
      return;
    }

    const opsToSend = [...queueRef.current];
    queueRef.current = [];
    setOperationQueue([]);

    setIsSaving(true);
    setError(null);

    try {
      console.log(
        `[OperationQueue] Flushing ${opsToSend.length} operations to backend...`,
        { templateId: currentTemplateId, version: currentVersion, operations: opsToSend }
      );

      if (!currentTemplateId) {
        throw new Error('Template ID is null - cannot flush operations');
      }

      const response = await operationsApi.applyOperations(currentTemplateId, {
        operations: opsToSend,
        baseVersion: currentVersion,
      });

      setLastSaved(new Date());

      // Update version from response
      const newVersion = response.template.version;
      versionRef.current = newVersion;

      if (onSuccess) {
        onSuccess(newVersion);
      }

      console.log(
        `[OperationQueue] Successfully applied ${response.appliedOps.length} operations. New version: ${newVersion}`
      );
    } catch (err: any) {
      // Handle version conflict
      if (err.response?.status === 409) {
        const conflictData = err.response.data;
        console.error('[OperationQueue] Version conflict:', conflictData);

        if (onVersionConflict) {
          onVersionConflict(
            conflictData.currentVersion,
            conflictData.requestedVersion
          );
        }

        setError(
          new Error(
            `Version conflict: Template was modified. Current version: ${conflictData.currentVersion}`
          )
        );
      } else {
        const error =
          err instanceof Error ? err : new Error('Failed to save operations');
        setError(error);
        console.error('[OperationQueue] Save failed:', error);
      }

      // Re-queue failed operations (optional - could lose data on network errors)
      // For now, we'll log and discard
      console.warn('[OperationQueue] Discarding failed operations:', opsToSend);
    } finally {
      setIsSaving(false);
    }
  }, [enabled, templateId, onSuccess, onVersionConflict]);

  // Debounced flush
  const debouncedFlush = useRef(
    debounce(() => {
      flushQueue();
    }, delay)
  ).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedFlush.cancel();
    };
  }, [debouncedFlush]);

  /**
   * Add operation(s) to the queue
   */
  const queueOperation = useCallback(
    (operation: Operation | Operation[] | null) => {
      console.log('[OperationQueue] queueOperation called:', {
        operation,
        enabled,
        templateId,
      });

      if (!operation || !enabled) {
        console.log('[OperationQueue] Skipping - operation is null or disabled');
        return;
      }

      const ops = Array.isArray(operation) ? operation : [operation];

      // Add to queue
      queueRef.current = [...queueRef.current, ...ops];
      setOperationQueue(queueRef.current);

      console.log(
        `[OperationQueue] Queued ${ops.length} operation(s). Queue size: ${queueRef.current.length}`,
        ops
      );

      // Trigger debounced flush
      console.log('[OperationQueue] Triggering debounced flush...');
      debouncedFlush();
    },
    [enabled, debouncedFlush, templateId]
  );

  /**
   * Manual flush (bypasses debounce)
   */
  const flush = useCallback(async () => {
    debouncedFlush.cancel(); // Cancel any pending debounced flush
    await flushQueue();
  }, [debouncedFlush, flushQueue]);

  return {
    queueOperation,
    isSaving,
    lastSaved,
    error,
    queueSize: operationQueue.length,
    flush,
  };
};
