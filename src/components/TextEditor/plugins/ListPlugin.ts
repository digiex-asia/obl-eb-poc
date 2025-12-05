/**
 * List Plugin - Bullets, Numbers, Indentation
 */

import { TextEditorPlugin, PluginContext, ToolbarButtonConfig } from '../types';
import { Icons } from '../components/icons';

export const ListPlugin: TextEditorPlugin = {
  name: 'list',
  
  getToolbarButtons: (context: PluginContext): ToolbarButtonConfig[] => {
    const { activeElement, onUpdateStyle } = context;
    if (!activeElement) return [];
    
    return [
      {
        icon: Icons.List,
        label: 'Bulleted List',
        isActive: activeElement.listType === 'bullet',
        onClick: () => onUpdateStyle('listType', activeElement.listType === 'bullet' ? 'none' : 'bullet')
      },
      {
        icon: Icons.ListOrdered,
        label: 'Numbered List',
        isActive: activeElement.listType === 'number',
        onClick: () => onUpdateStyle('listType', activeElement.listType === 'number' ? 'none' : 'number')
      },
      {
        icon: Icons.Indent,
        label: 'Increase Indent',
        onClick: () => onUpdateStyle('listIndent', (activeElement.listIndent || 0) + 1)
      },
      {
        icon: Icons.Outdent,
        label: 'Decrease Indent',
        disabled: !activeElement.listIndent,
        onClick: () => onUpdateStyle('listIndent', Math.max(0, (activeElement.listIndent || 0) - 1))
      }
    ];
  }
};

