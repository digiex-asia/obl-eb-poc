/**
 * History Plugin - Undo/Redo functionality
 */

import { TextEditorPlugin, PluginContext, ToolbarButtonConfig } from '../types';
import { Icons } from '../components/icons';

export const HistoryPlugin: TextEditorPlugin = {
  name: 'history',
  
  getToolbarButtons: (context: PluginContext) => {
    // This will be handled by the main component since it needs access to undo/redo functions
    return [];
  }
};

