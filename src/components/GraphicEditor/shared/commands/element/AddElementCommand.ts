/**
 * AddElementCommand - Add a new element to a page
 *
 * Encapsulates all data needed to add an element (no state discovery required)
 */

import { nanoid } from 'nanoid';
import type { ContentState, DesignElement } from '../../model/types';
import type { EditorCommand, CommandMetadata } from '../types';
import type { Operation } from '../../types/api.types';

export class AddElementCommand implements EditorCommand {
  public readonly id: string;
  public readonly type = 'add_element';
  public readonly timestamp: number;

  constructor(
    private readonly pageId: string,
    private readonly element: DesignElement,
    private readonly elementId: string = nanoid(),
  ) {
    this.id = nanoid();
    this.timestamp = Date.now();
  }

  /**
   * Execute: Add element to page
   */
  execute(state: ContentState): ContentState {
    const newPages = state.pages.map((page) => {
      if (page.id === this.pageId) {
        return {
          ...page,
          elements: [
            ...page.elements,
            {
              ...this.element,
              id: this.elementId,
            },
          ],
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
   * Undo: Remove the element
   */
  undo(state: ContentState): ContentState {
    const newPages = state.pages.map((page) => {
      if (page.id === this.pageId) {
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
   * Generate backend operation
   */
  toOperations(): Operation[] {
    return [
      {
        id: nanoid(),
        type: 'add_element',
        target: {
          pageId: this.pageId,
          elementId: this.elementId,
        },
        payload: this.element,
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
      description: `Add ${this.element.type} element to page ${this.pageId}`,
    };
  }
}
