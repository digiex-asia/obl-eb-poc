/**
 * AddPageCommand - Add a new page to the timeline
 */

import { nanoid } from 'nanoid';
import type { ContentState, Page } from '../../model/types';
import type { EditorCommand, CommandMetadata } from '../types';
import type { Operation } from '../../types/api.types';

export class AddPageCommand implements EditorCommand {
  public readonly id: string;
  public readonly type = 'add_page';
  public readonly timestamp: number;

  constructor(
    private readonly page: Omit<Page, 'id'>,
    private readonly pageId: string = nanoid(),
    private readonly insertIndex?: number,
  ) {
    this.id = nanoid();
    this.timestamp = Date.now();
  }

  /**
   * Execute: Add page to timeline
   */
  execute(state: ContentState): ContentState {
    const newPage: Page = {
      id: this.pageId,
      ...this.page,
    };

    const newPages = [...state.pages];
    if (this.insertIndex !== undefined) {
      newPages.splice(this.insertIndex, 0, newPage);
    } else {
      newPages.push(newPage);
    }

    return {
      ...state,
      pages: newPages,
    };
  }

  /**
   * Undo: Remove the page
   */
  undo(state: ContentState): ContentState {
    return {
      ...state,
      pages: state.pages.filter((p) => p.id !== this.pageId),
    };
  }

  /**
   * Generate backend operation
   */
  toOperations(): Operation[] {
    return [
      {
        id: nanoid(),
        type: 'add_page',
        target: {
          pageId: this.pageId,
        },
        payload: this.page,
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
      affectedIds: [this.pageId],
      description: `Add page ${this.pageId} (${this.page.duration}s)`,
    };
  }
}
