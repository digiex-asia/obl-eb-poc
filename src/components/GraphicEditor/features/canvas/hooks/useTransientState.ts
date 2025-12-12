import { useRef } from 'react';
import type { DesignElement } from '../../../shared/model/types';
import type { Action } from '../../../shared/model/store';

/**
 * Transient State Hook for lag-free dragging
 *
 * During drag operations, element positions are stored in a ref (transient state)
 * instead of dispatching Redux actions on every mousemove. This provides smooth
 * 60fps dragging by avoiding expensive reducer runs and re-renders.
 *
 * On mouseup, all transient updates are committed to Redux in a single
 * BATCH_UPDATE_ELEMENTS action.
 */
export const useTransientState = () => {
  const transientState = useRef<Map<string, Partial<DesignElement>>>(new Map());

  /**
   * Set transient state for an element (updates in-memory only)
   */
  const setTransient = (id: string, attrs: Partial<DesignElement>) => {
    transientState.current.set(id, attrs);
  };

  /**
   * Get element with transient state merged
   * Returns the base element with transient updates applied
   */
  const getElement = (baseEl: DesignElement): DesignElement => {
    const transient = transientState.current.get(baseEl.id);
    return transient ? { ...baseEl, ...transient } : baseEl;
  };

  /**
   * Commit all transient state to Redux and clear
   * Dispatches BATCH_UPDATE_ELEMENTS action with all pending updates
   */
  const commitTransients = (dispatch: React.Dispatch<Action>) => {
    if (transientState.current.size === 0) return;

    const updates = Array.from(transientState.current.entries()).map(
      ([id, attrs]) => ({ id, attrs })
    );

    dispatch({ type: 'BATCH_UPDATE_ELEMENTS', updates });
    transientState.current.clear();
  };

  /**
   * Clear all transient state without committing
   * Used when drag is cancelled (selection change, page switch, etc.)
   */
  const clearTransients = () => {
    transientState.current.clear();
  };

  /**
   * Check if there are any pending transient updates
   */
  const hasTransients = () => {
    return transientState.current.size > 0;
  };

  return {
    setTransient,
    getElement,
    commitTransients,
    clearTransients,
    hasTransients,
  };
};
