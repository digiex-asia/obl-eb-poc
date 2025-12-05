/**
 * Alignment Plugin - Left, Center, Right, Justify
 */

import { TextEditorPlugin, PluginContext, ToolbarButtonConfig } from '../types';
import { Icons } from '../components/icons';

export const AlignmentPlugin: TextEditorPlugin = {
  name: 'alignment',
  
  getToolbarButtons: (context: PluginContext): ToolbarButtonConfig[] => {
    const { activeElement, onUpdateStyle } = context;
    if (!activeElement) return [];
    
    return [
      {
        icon: Icons.AlignLeft,
        label: 'Align Left',
        isActive: activeElement.defaultStyle.align === 'left',
        onClick: () => onUpdateStyle('align', 'left')
      },
      {
        icon: Icons.AlignCenter,
        label: 'Align Center',
        isActive: activeElement.defaultStyle.align === 'center',
        onClick: () => onUpdateStyle('align', 'center')
      },
      {
        icon: Icons.AlignRight,
        label: 'Align Right',
        isActive: activeElement.defaultStyle.align === 'right',
        onClick: () => onUpdateStyle('align', 'right')
      },
      {
        icon: Icons.AlignJustify,
        label: 'Justify',
        isActive: activeElement.defaultStyle.align === 'justify',
        onClick: () => onUpdateStyle('align', 'justify')
      }
    ];
  }
};

