/**
 * Auto-Fit Plugin - Enable/disable auto-fit scaling
 */

import { TextEditorPlugin, PluginContext, ToolbarButtonConfig } from '../types';
import { Icons } from '../components/icons';

export const AutoFitPlugin: TextEditorPlugin = {
  name: 'autoFit',
  
  getToolbarButtons: (context: PluginContext): ToolbarButtonConfig[] => {
    const { activeElement, onUpdateStyle } = context;
    if (!activeElement) return [];
    
    return [
      {
        icon: Icons.Maximize,
        label: activeElement.autoFit ? 'Disable Auto-Fit (Scale)' : 'Enable Auto-Fit (Scale)',
        isActive: activeElement.autoFit,
        onClick: () => onUpdateStyle('autoFit', !activeElement.autoFit)
      }
    ];
  }
};

