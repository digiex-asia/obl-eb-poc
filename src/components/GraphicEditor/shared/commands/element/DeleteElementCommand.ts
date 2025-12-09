/**
 * DeleteElementCommand - Delete an element from a page
 *
 * Stores the deleted element for undo
 */

import { nanoid } from 'nanoid';
import type { ContentState, DesignElement } from '../../model/types';
import type { EditorCommand, CommandMetadata } from '../types';
import type { Operation } from '../../types/api.types';

export class DeleteElementCommand implements EditorCommand {
  public readonly id: string;
  public readonly type = 'delete_element';
  public readonly timestamp: number;

  private deletedElement: DesignElement | null = null;
  private elementIndex: number = -1;

  constructor(
    private readonly pageId: string,
    private readonly elementId: string,
  ) {
    this.id = nanoid();
    this.timestamp = Date.now();
  }

  /**
   * Execute: Delete the element
   */
  execute(state: ContentState): ContentState {
    const newPages = state.pages.map((page) => {
      if (page.id === this.pageId) {
        // Store deleted element and index for undo
        this.elementIndex = page.elements.findIndex((el) => el.id === this.elementId);
        if (this.elementIndex !== -1) {
          this.deletedElement = { ...page.elements[this.elementIndex] };
        }

        return {
          ...page,
          elements: page.elements.filter((el) => el.id !== this.elementId),
        };
      }
      return page;
    });

    return {
      ...state,
      pages: newPages,
    };
  }

  /**
   * Undo: Restore the deleted element
   */
  undo(state: ContentState): ContentState {
    if (!this.deletedElement) {
      return state; // Nothing to undo
    }

    const newPages = state.pages.map((page) => {
      if (page.id === this.pageId) {
        const newElements = [...page.elements];
        // Insert at original position
        newElements.splice(this.elementIndex, 0, this.deletedElement!);

        return {
          ...page,
          elements: newElements,
        };
      }
      return page;
    });

    return {
      ...state,
      pages: newPages,
    };
  }

  /**
   * Generate backend operation
   */
  toOperations(): Operation[] {
    return [
      {
        id: nanoid(),
        type: 'delete_element',
        target: {
          pageId: this.pageId,
          elementId: this.elementId,
        },
        payload: null,
        timestamp: this.timestamp,
      },
    ];
  }

  /**
   * Get metadata
   */
  getMetadata(): CommandMetadata {
    return {
      type: this.type,
      timestamp: this.timestamp,
      affectedIds: [this.pageId, this.elementId],
      description: `Delete element ${this.elementId} from page ${this.pageId}`,
    };
  }
}
