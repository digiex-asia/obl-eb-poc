import { nanoid } from 'nanoid';
import type { Operation, OperationType } from '../types/api.types';
import type { AppState, DesignElement, Page, AudioClip } from '../model/types';

/**
 * Utility to generate backend operations from reducer actions
 * This allows efficient partial updates instead of sending the entire state
 */

type Action = any; // Import from store.ts

interface OperationGeneratorOptions {
  currentState: AppState;
}

export const operationGenerator = {
  /**
   * Convert a reducer action into one or more backend operations
   * Returns null for UI-only actions that don't need backend sync
   */
  fromAction(
    action: Action,
    options: OperationGeneratorOptions
  ): Operation[] | null {
    const { currentState } = options;
    const timestamp = Date.now();

    // UI-only actions that don't need backend sync
    const uiOnlyActions = [
      'UNDO',
      'REDO',
      'SELECT_ELEMENT',
      'SELECT_AUDIO',
      'SELECT_PAGE',
      'SET_PLAYING',
      'SET_TAB',
      'SET_ZOOM',
      'SET_PAN',
      'SET_CURRENT_TIME',
      'SET_TIMELINE_HEIGHT',
      'SET_TIMELINE_ZOOM',
      'OPEN_CONTEXT_MENU',
      'CLOSE_CONTEXT_MENU',
      'COPY_ELEMENT',
      'CAPTURE_CHECKPOINT',
      'NEXT_PAGE',
    ];

    if (uiOnlyActions.includes(action.type)) {
      return null;
    }

    // Map actions to operations
    switch (action.type) {
      case 'ADD_PAGE': {
        // Find the newly added page (last one)
        const newPage = currentState.pages[currentState.pages.length - 1];
        if (!newPage) return null;

        return [
          {
            id: nanoid(),
            type: 'add_page',
            target: { pageId: newPage.id },
            payload: newPage,
            timestamp,
          },
        ];
      }

      case 'DELETE_PAGE': {
        return [
          {
            id: nanoid(),
            type: 'delete_page',
            target: { pageId: action.id },
            payload: {},
            timestamp,
          },
        ];
      }

      case 'UPDATE_PAGE': {
        return [
          {
            id: nanoid(),
            type: 'update_page',
            target: { pageId: action.id },
            payload: action.attrs,
            timestamp,
          },
        ];
      }

      case 'UPDATE_PAGE_DURATION': {
        return [
          {
            id: nanoid(),
            type: 'update_page',
            target: { pageId: action.id },
            payload: { duration: action.duration },
            timestamp,
          },
        ];
      }

      case 'SET_BACKGROUND': {
        if (!currentState.activePageId) {
          console.warn('[OperationGenerator] Cannot set background: no active page');
          return null;
        }

        return [
          {
            id: nanoid(),
            type: 'update_page',
            target: { pageId: currentState.activePageId },
            payload: { background: action.color },
            timestamp,
          },
        ];
      }

      case 'ADD_ELEMENT': {
        // Validate activePageId exists
        if (!currentState.activePageId) {
          console.warn('[OperationGenerator] Cannot add element: no active page');
          return null;
        }

        // Find the newly added element
        const activePage = currentState.pages.find(
          (p) => p.id === currentState.activePageId
        );
        if (!activePage) return null;

        const newElement =
          activePage.elements[activePage.elements.length - 1];
        if (!newElement) return null;

        return [
          {
            id: nanoid(),
            type: 'add_element',
            target: {
              pageId: currentState.activePageId,
              elementId: newElement.id,
            },
            payload: newElement,
            timestamp,
          },
        ];
      }

      case 'UPDATE_ELEMENT': {
        // Determine operation type based on what changed
        const attrs = action.attrs;
        let opType: OperationType = 'update_element_props';

        // Check for specific operation types
        if ('x' in attrs || 'y' in attrs) {
          if (Object.keys(attrs).length === 2) {
            // Only x and y changed
            opType = 'move_element';
          }
        }

        if ('width' in attrs || 'height' in attrs) {
          if (
            Object.keys(attrs).length === 2 ||
            (Object.keys(attrs).length === 4 &&
              'x' in attrs &&
              'y' in attrs)
          ) {
            opType = 'resize_element';
          }
        }

        if ('rotation' in attrs && Object.keys(attrs).length === 1) {
          opType = 'rotate_element';
        }

        // Find the element to get pageId
        let pageId: string | undefined;
        for (const page of currentState.pages) {
          if (page.elements.find((el) => el.id === action.id)) {
            pageId = page.id;
            break;
          }
        }

        if (!pageId) return null;

        return [
          {
            id: nanoid(),
            type: opType,
            target: { pageId, elementId: action.id },
            payload: { ...attrs, ...action.animation },
            timestamp,
          },
        ];
      }

      case 'DELETE_ELEMENT': {
        const elementId = action.id || currentState.selectedElementId;
        if (!elementId) return null;

        // Find the element's page
        let pageId: string | undefined;
        for (const page of currentState.pages) {
          if (page.elements.find((el) => el.id === elementId)) {
            pageId = page.id;
            break;
          }
        }

        if (!pageId) return null;

        return [
          {
            id: nanoid(),
            type: 'delete_element',
            target: { pageId, elementId },
            payload: {},
            timestamp,
          },
        ];
      }

      case 'ADD_AUDIO_LAYER': {
        // Find the newly added layer
        const newLayer =
          currentState.audioLayers[currentState.audioLayers.length - 1];
        if (!newLayer) return null;

        // Note: Backend doesn't have add_audio_layer, so we skip this
        // Audio layers are implicit in the clips
        return null;
      }

      case 'ADD_AUDIO_CLIP': {
        return [
          {
            id: nanoid(),
            type: 'add_audio_clip',
            target: { audioLayerId: action.layerId, clipId: action.clip.id },
            payload: action.clip,
            timestamp,
          },
        ];
      }

      case 'UPDATE_AUDIO_CLIP': {
        return [
          {
            id: nanoid(),
            type: 'update_audio_clip',
            target: {
              audioLayerId: action.layerId,
              clipId: action.clipId,
            },
            payload: { startAt: action.newStart },
            timestamp,
          },
        ];
      }

      case 'TRIM_AUDIO_CLIP': {
        return [
          {
            id: nanoid(),
            type: 'update_audio_clip',
            target: {
              audioLayerId: action.layerId,
              clipId: action.clipId,
            },
            payload: {
              startAt: action.newStart,
              duration: action.newDuration,
              offset: action.newOffset,
            },
            timestamp,
          },
        ];
      }

      case 'DELETE_AUDIO_CLIP': {
        return [
          {
            id: nanoid(),
            type: 'delete_audio_clip',
            target: {
              audioLayerId: action.layerId,
              clipId: action.clipId,
            },
            payload: {},
            timestamp,
          },
        ];
      }

      case 'MOVE_AUDIO_CLIP': {
        // Moving a clip between layers is delete + add
        return [
          {
            id: nanoid(),
            type: 'delete_audio_clip',
            target: {
              audioLayerId: action.fromLayerId,
              clipId: action.clipId,
            },
            payload: {},
            timestamp,
          },
          {
            id: nanoid(),
            type: 'add_audio_clip',
            target: {
              audioLayerId: action.toLayerId,
              clipId: action.clipId,
            },
            payload: { startAt: action.newStart },
            timestamp: timestamp + 1,
          },
        ];
      }

      case 'DUPLICATE_PAGE': {
        // Find the duplicated page (last one)
        const newPage = currentState.pages[currentState.pages.length - 1];
        if (!newPage) return null;

        return [
          {
            id: nanoid(),
            type: 'add_page',
            target: { pageId: newPage.id },
            payload: newPage,
            timestamp,
          },
        ];
      }

      case 'LOAD_TEMPLATE': {
        // When loading a template, we don't generate operations
        // The entire state is replaced from the backend
        return null;
      }

      default:
        console.warn(
          `[OperationGenerator] Unhandled action type: ${action.type}`
        );
        return null;
    }
  },

  /**
   * Check if an action should trigger auto-save
   */
  shouldSync(action: Action): boolean {
    const noSyncActions = [
      'UNDO',
      'REDO',
      'SELECT_ELEMENT',
      'SELECT_AUDIO',
      'SELECT_PAGE',
      'SET_PLAYING',
      'SET_TAB',
      'SET_ZOOM',
      'SET_PAN',
      'SET_CURRENT_TIME',
      'SET_TIMELINE_HEIGHT',
      'SET_TIMELINE_ZOOM',
      'OPEN_CONTEXT_MENU',
      'CLOSE_CONTEXT_MENU',
      'COPY_ELEMENT',
      'CAPTURE_CHECKPOINT',
      'NEXT_PAGE',
      'LOAD_TEMPLATE',
    ];

    return !noSyncActions.includes(action.type);
  },
};
