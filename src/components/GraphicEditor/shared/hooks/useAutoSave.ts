import { useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash-es';

interface UseAutoSaveOptions {
  delay?: number; // milliseconds, default 2000
  enabled?: boolean; // default true
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  manualSave: () => Promise<void>;
}

/**
 * Hook for auto-saving data with debouncing
 *
 * @param data - Data to be saved
 * @param saveFn - Async function that saves the data
 * @param options - Configuration options
 * @returns Object with saving status and manual save function
 *
 * @example
 * const { isSaving, lastSaved } = useAutoSave(
 *   state,
 *   async (state) => await saveTemplate(state),
 *   { enabled: !!templateId, delay: 2000 }
 * );
 */
export const useAutoSave = <T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn => {
  const { delay = 2000, enabled = true } = options;
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Use ref to store the save function so it doesn't cause re-renders
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  // Create the actual save function
  const performSave = async (data: T) => {
    if (!enabled) return;

    setIsSaving(true);
    setError(null);

    try {
      await saveFnRef.current(data);
      setLastSaved(new Date());
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Save failed');
      setError(error);
      console.error('[useAutoSave] Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Create debounced save function
  const debouncedSave = useRef(
    debounce((data: T) => {
      performSave(data);
    }, delay)
  ).current;

  // Auto-save on data change
  useEffect(() => {
    if (enabled) {
      debouncedSave(data);
    }

    // Cleanup: cancel pending saves on unmount or when disabled
    return () => {
      debouncedSave.cancel();
    };
  }, [data, enabled, debouncedSave]);

  // Manual save function (bypasses debounce)
  const manualSave = async () => {
    debouncedSave.cancel(); // Cancel any pending auto-save
    await performSave(data);
  };

  return {
    isSaving,
    lastSaved,
    error,
    manualSave,
  };
};
