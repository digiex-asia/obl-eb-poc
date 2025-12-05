/**
 * Type definitions for Text Editor Plugin System
 */

export interface TextSpan {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrike?: boolean;
  backgroundColor?: string | null;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  shadow?: boolean;
}

export interface DefaultStyle {
  fontSize: number;
  fontFamily: string;
  fill: string;
  align: 'left' | 'center' | 'right' | 'justify';
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  backgroundColor: string | null;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  shadow: boolean;
}

export interface TextElement {
  id: string;
  type: 'RICH_TEXT';
  x: number;
  y: number;
  width: number;
  height: number;
  isEditing: boolean;
  autoFit: boolean;
  verticalAlign: 'top' | 'middle' | 'bottom';
  listType: 'none' | 'bullet' | 'number';
  listIndent: number;
  defaultStyle: DefaultStyle;
  valueList: TextSpan[];
  _renderHeight?: number;
  _layout?: any; // Layout calculation result
}

export interface ToolbarButtonConfig {
  icon: React.ComponentType<any>;
  label: string;
  shortcut?: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface PluginContext {
  activeElement: TextElement | null;
  currentStyle: DefaultStyle | null;
  selection: { start: number; end: number };
  elements: TextElement[];
  setElements: (elements: TextElement[] | ((prev: TextElement[]) => TextElement[])) => void;
  onUpdateStyle: (key: string, value: any) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export interface TextEditorPlugin {
  name: string;
  
  // Toolbar configuration
  getToolbarButtons?: (context: PluginContext) => ToolbarButtonConfig[];
  getToolbarSections?: (context: PluginContext) => React.ReactNode[];
  
  // Keyboard shortcuts
  handleKeyDown?: (e: KeyboardEvent, context: PluginContext) => boolean; // returns true if handled
  
  // Style updates
  onStyleUpdate?: (key: string, value: any, context: PluginContext) => void;
  
  // Initialization
  initialize?: (context: PluginContext) => void;
  
  // Cleanup
  cleanup?: () => void;
}

