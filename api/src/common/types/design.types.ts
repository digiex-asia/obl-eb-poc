// Design data structures matching the frontend GraphicEditor

export type ElementType =
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'star'
  | 'polygon'
  | 'heart'
  | 'diamond'
  | 'image'
  | 'text';

export interface AnimationSettings {
  type: string;
  speed: number;
  delay: number;
  direction?: string;
  mode?: 'enter' | 'exit' | 'continuous';
}

export interface DesignElement {
  id: string;
  type: ElementType;
  className?: string; // For Konva compatibility
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill?: string;
  text?: string;
  fontSize?: number;
  src?: string; // For images
  opacity: number;
  animation?: AnimationSettings;
}

export interface Page {
  id: string;
  duration: number;
  elements: DesignElement[];
  background: string;
  animation?: AnimationSettings;
}

export interface AudioClip {
  id: string;
  src: string;
  label: string;
  startAt: number;
  duration: number;
  offset: number;
  totalDuration: number;
}

export interface AudioLayer {
  id: string;
  clips: AudioClip[];
}

export interface DesignData {
  canvas: {
    width: number;
    height: number;
  };
  pages: Page[];
  audioLayers: AudioLayer[];
}

// Component-related types
export interface ComponentInstance {
  componentInstanceId: string;
  componentId: string;
  overrides?: Partial<DesignElement>[];
}

export interface ComponentLink {
  instanceId: string;
  componentId: string;
  templateId: string;
  pageId: string;
  elementIds: string[];
  overrides: Record<string, any>;
  lastSyncedVersion: number;
}

// Operation types for partial updates
export type OperationType =
  | 'add_element'
  | 'update_element'
  | 'delete_element'
  | 'move_element'
  | 'resize_element'
  | 'rotate_element'
  | 'update_element_props'
  | 'add_page'
  | 'update_page'
  | 'delete_page'
  | 'reorder_pages'
  | 'update_canvas'
  | 'add_audio_clip'
  | 'update_audio_clip'
  | 'delete_audio_clip';

export interface OperationTarget {
  pageId?: string;
  elementId?: string;
  audioLayerId?: string;
  clipId?: string;
}

export interface Operation {
  id: string;
  type: OperationType;
  target: OperationTarget;
  payload: any;
  timestamp: number;
  userId?: string;
}
