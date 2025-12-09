/**
 * MoveElementCommand - Move an element to a new position
 *
 * Stores both old and new positions for undo/redo
 */

import { nanoid } from 'nanoid';
import type { ContentState } from '../../model/types';
import type { EditorCommand, CommandMetadata } from '../types';
import type { Operation } from '../../types/api.types';

export class MoveElementCommand implements EditorCommand {
  public readonly id: string;
  public readonly type = 'move_element';
  public readonly timestamp: number;

  private oldX: number = 0;
  private oldY: number = 0;

  constructor(
    private readonly pageId: string,
    private readonly elementId: string,
    private readonly newX: number,
    private readonly newY: number,
  ) {
    this.id = nanoid();
    this.timestamp = Date.now();
  }

  /**
   * Execute: Move element to new position
   */
  execute(state: ContentState): ContentState {
    const newPages = state.pages.map((page) => {
      if (page.id === this.pageId) {
        return {
          ...page,
          elements: page.elements.map((el) => {
            if (el.id === this.elementId) {
              // Store old position for undo
              this.oldX = el.x;
              this.oldY = el.y;

              return {
                ...el,
                x: this.newX,
                y: this.newY,
              };
            }
            return el;
          }),
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
   * Undo: Restore old position
   */
  undo(state: ContentState): ContentState {
    const newPages = state.pages.map((page) => {
      if (page.id === this.pageId) {
        return {
          ...page,
          elements: page.elements.map((el) => {
            if (el.id === this.elementId) {
              return {
                ...el,
                x: this.oldX,
                y: this.oldY,
              };
            }
            return el;
          }),
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
        type: 'move_element',
        target: {
          pageId: this.pageId,
          elementId: this.elementId,
        },
        payload: {
          x: this.newX,
          y: this.newY,
        },
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
      description: `Move element ${this.elementId} to (${this.newX}, ${this.newY})`,
    };
  }
}
