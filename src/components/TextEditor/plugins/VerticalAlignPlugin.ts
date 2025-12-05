/**
 * Vertical Alignment Plugin - Top, Middle, Bottom
 */

import { TextEditorPlugin, PluginContext, ToolbarButtonConfig } from '../types';
import { Icons } from '../components/icons';

export const VerticalAlignPlugin: TextEditorPlugin = {
  name: 'verticalAlign',
  
  getToolbarButtons: (context: PluginContext): ToolbarButtonConfig[] => {
    const { activeElement, onUpdateStyle } = context;
    if (!activeElement) return [];
    
    return [
      {
        icon: Icons.ArrowUpToLine,
        label: 'Align Top',
        disabled: activeElement.autoFit,
        isActive: activeElement.verticalAlign === 'top',
        onClick: () => onUpdateStyle('verticalAlign', 'top')
      },
      {
        icon: Icons.BoxSelect,
        label: 'Align Middle',
        disabled: activeElement.autoFit,
        isActive: activeElement.verticalAlign === 'middle',
        onClick: () => onUpdateStyle('verticalAlign', 'middle')
      },
      {
        icon: Icons.ArrowDownToLine,
        label: 'Align Bottom',
        disabled: activeElement.autoFit,
        isActive: activeElement.verticalAlign === 'bottom',
        onClick: () => onUpdateStyle('verticalAlign', 'bottom')
      }
    ];
  }
};

