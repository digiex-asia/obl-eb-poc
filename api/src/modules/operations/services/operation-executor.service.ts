import { Injectable, BadRequestException } from '@nestjs/common';
import {
  DesignData,
  Operation,
  DesignElement,
  Page,
} from '@common/types/design.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OperationExecutorService {
  execute(designData: DesignData, operation: Operation): DesignData {
    const clonedData = JSON.parse(JSON.stringify(designData));

    switch (operation.type) {
      case 'add_element':
        return this.addElement(clonedData, operation);
      case 'update_element':
        return this.updateElement(clonedData, operation);
      case 'delete_element':
        return this.deleteElement(clonedData, operation);
      case 'move_element':
        return this.moveElement(clonedData, operation);
      case 'resize_element':
        return this.resizeElement(clonedData, operation);
      case 'rotate_element':
        return this.rotateElement(clonedData, operation);
      case 'update_element_props':
        return this.updateElementProps(clonedData, operation);
      case 'add_page':
        return this.addPage(clonedData, operation);
      case 'update_page':
        return this.updatePage(clonedData, operation);
      case 'delete_page':
        return this.deletePage(clonedData, operation);
      case 'reorder_pages':
        return this.reorderPages(clonedData, operation);
      case 'update_canvas':
        return this.updateCanvas(clonedData, operation);
      default:
        throw new BadRequestException(
          `Unknown operation type: ${operation.type}`,
        );
    }
  }

  private findPage(designData: DesignData, pageId: string): Page {
    const page = designData.pages.find((p) => p.id === pageId);
    if (!page) {
      throw new BadRequestException(`Page ${pageId} not found`);
    }
    return page;
  }

  private findElement(page: Page, elementId: string): DesignElement {
    const element = page.elements.find((e) => e.id === elementId);
    if (!element) {
      throw new BadRequestException(`Element ${elementId} not found`);
    }
    return element;
  }

  private addElement(designData: DesignData, operation: Operation): DesignData {
    const { pageId } = operation.target;
    if (!pageId) throw new BadRequestException('pageId required');

    const page = this.findPage(designData, pageId);
    const newElement: DesignElement = {
      id: operation.payload.id || uuidv4(),
      ...operation.payload,
    };

    page.elements.push(newElement);
    return designData;
  }

  private updateElement(
    designData: DesignData,
    operation: Operation,
  ): DesignData {
    const { pageId, elementId } = operation.target;
    if (!pageId || !elementId) {
      throw new BadRequestException('pageId and elementId required');
    }

    const page = this.findPage(designData, pageId);
    const element = this.findElement(page, elementId);

    Object.assign(element, operation.payload);
    return designData;
  }

  private deleteElement(
    designData: DesignData,
    operation: Operation,
  ): DesignData {
    const { pageId, elementId } = operation.target;
    if (!pageId || !elementId) {
      throw new BadRequestException('pageId and elementId required');
    }

    const page = this.findPage(designData, pageId);
    page.elements = page.elements.filter((e) => e.id !== elementId);
    return designData;
  }

  private moveElement(designData: DesignData, operation: Operation): DesignData {
    const { pageId, elementId } = operation.target;
    if (!pageId || !elementId) {
      throw new BadRequestException('pageId and elementId required');
    }

    const page = this.findPage(designData, pageId);
    const element = this.findElement(page, elementId);

    element.x = operation.payload.x ?? element.x;
    element.y = operation.payload.y ?? element.y;
    return designData;
  }

  private resizeElement(
    designData: DesignData,
    operation: Operation,
  ): DesignData {
    const { pageId, elementId } = operation.target;
    if (!pageId || !elementId) {
      throw new BadRequestException('pageId and elementId required');
    }

    const page = this.findPage(designData, pageId);
    const element = this.findElement(page, elementId);

    element.width = operation.payload.width ?? element.width;
    element.height = operation.payload.height ?? element.height;
    element.x = operation.payload.x ?? element.x;
    element.y = operation.payload.y ?? element.y;
    return designData;
  }

  private rotateElement(
    designData: DesignData,
    operation: Operation,
  ): DesignData {
    const { pageId, elementId } = operation.target;
    if (!pageId || !elementId) {
      throw new BadRequestException('pageId and elementId required');
    }

    const page = this.findPage(designData, pageId);
    const element = this.findElement(page, elementId);

    element.rotation = operation.payload.rotation ?? element.rotation;
    return designData;
  }

  private updateElementProps(
    designData: DesignData,
    operation: Operation,
  ): DesignData {
    const { pageId, elementId } = operation.target;
    if (!pageId || !elementId) {
      throw new BadRequestException('pageId and elementId required');
    }

    const page = this.findPage(designData, pageId);
    const element = this.findElement(page, elementId);

    // Update any properties passed in payload
    Object.assign(element, operation.payload);
    return designData;
  }

  private addPage(designData: DesignData, operation: Operation): DesignData {
    const newPage: Page = {
      id: operation.payload.id || uuidv4(),
      duration: operation.payload.duration || 5,
      background: operation.payload.background || '#ffffff',
      elements: operation.payload.elements || [],
      animation: operation.payload.animation,
    };

    designData.pages.push(newPage);
    return designData;
  }

  private updatePage(designData: DesignData, operation: Operation): DesignData {
    const { pageId } = operation.target;
    if (!pageId) throw new BadRequestException('pageId required');

    const page = this.findPage(designData, pageId);
    Object.assign(page, operation.payload);
    return designData;
  }

  private deletePage(designData: DesignData, operation: Operation): DesignData {
    const { pageId } = operation.target;
    if (!pageId) throw new BadRequestException('pageId required');

    designData.pages = designData.pages.filter((p) => p.id !== pageId);
    return designData;
  }

  private reorderPages(
    designData: DesignData,
    operation: Operation,
  ): DesignData {
    const { pageIds } = operation.payload;
    if (!Array.isArray(pageIds)) {
      throw new BadRequestException('pageIds array required');
    }

    const reordered: Page[] = [];
    for (const pageId of pageIds) {
      const page = designData.pages.find((p) => p.id === pageId);
      if (page) reordered.push(page);
    }

    designData.pages = reordered;
    return designData;
  }

  private updateCanvas(
    designData: DesignData,
    operation: Operation,
  ): DesignData {
    designData.canvas = {
      width: operation.payload.width ?? designData.canvas.width,
      height: operation.payload.height ?? designData.canvas.height,
    };
    return designData;
  }
}
