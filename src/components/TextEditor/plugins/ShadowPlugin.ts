/**
 * Shadow Plugin - Drop shadow effect
 */

import { TextEditorPlugin, PluginContext, ToolbarButtonConfig } from '../types';
import { Icons } from '../components/icons';

export const ShadowPlugin: TextEditorPlugin = {
  name: 'shadow',
  
  getToolbarButtons: (context: PluginContext): ToolbarButtonConfig[] => {
    const { activeElement, currentStyle, onUpdateStyle } = context;
    if (!activeElement) return [];
    
    const style = currentStyle || activeElement.defaultStyle;
    
    return [
      {
        icon: Icons.Eclipse,
        label: 'Drop Shadow',
        isActive: style.shadow || false,
        onClick: () => onUpdateStyle('shadow', !style.shadow)
      }
    ];
  }
};

