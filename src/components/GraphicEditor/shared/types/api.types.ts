// API Types for Backend Integration

// Re-export types from App.tsx for use in API layer
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
  direction: 'up' | 'down' | 'left' | 'right';
  mode: 'both' | 'enter' | 'exit';
}

export interface DesignElement {
  id: string;
  type: ElementType;
  className?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  text?: string;
  fontSize?: number;
  src?: string;
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

// Backend API Response Types
export interface Template {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  isPublic: boolean;
  designData: DesignData;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DesignData {
  canvas: {
    width: number;
    height: number;
  };
  pages: Page[];
  audioLayers: AudioLayer[];
}

// Backend API Request Types
export interface CreateTemplateDto {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  designData: DesignData;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  designData?: DesignData;
}

// Operation Types (for future partial updates)
export interface Operation {
  type: string;
  path: string;
  value?: unknown;
  oldValue?: unknown;
}

export interface ApplyOperationDto {
  operations: Operation[];
  version: number;
}
