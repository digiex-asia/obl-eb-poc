/**
 * UpdateElementCommand - Update element properties
 *
 * Generic command for updating any element properties
 */

import { nanoid } from 'nanoid';
import type { ContentState, DesignElement } from '../../model/types';
import type { EditorCommand, CommandMetadata } from '../types';
import type { Operation } from '../../types/api.types';

export class UpdateElementCommand implements EditorCommand {
  public readonly id: string;
  public readonly type = 'update_element';
  public readonly timestamp: number;

  private oldProps: Partial<DesignElement> = {};

  constructor(
    private readonly pageId: string,
    private readonly elementId: string,
    private readonly newProps: Partial<DesignElement>,
  ) {
    this.id = nanoid();
    this.timestamp = Date.now();
  }

  /**
   * Execute: Update element properties
   */
  execute(state: ContentState): ContentState {
    const newPages = state.pages.map((page) => {
      if (page.id === this.pageId) {
        return {
          ...page,
          elements: page.elements.map((el) => {
            if (el.id === this.elementId) {
              // Store old props for undo
              const keys = Object.keys(this.newProps) as (keyof DesignElement)[];
              keys.forEach(key => {
                this.oldProps[key] = el[key] as any;
              });

              return {
                ...el,
                ...this.newProps,
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
   * Undo: Restore old properties
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
                ...this.oldProps,
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
        type: 'update_element_props',
        target: {
          pageId: this.pageId,
          elementId: this.elementId,
        },
        payload: this.newProps,
        timestamp: this.timestamp,
      },
    ];
  }

  /**
   * Get metadata
   */
  getMetadata(): CommandMetadata {
    const props = Object.keys(this.newProps).join(', ');
    return {
      type: this.type,
      timestamp: this.timestamp,
      affectedIds: [this.pageId, this.elementId],
      description: `Update element ${this.elementId} properties: ${props}`,
    };
  }
}
