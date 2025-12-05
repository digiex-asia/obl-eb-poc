/**
 * Formatting Plugin - Bold, Italic, Underline, Strikethrough
 */

import { TextEditorPlugin, PluginContext, ToolbarButtonConfig } from '../types';
import { Icons } from '../components/icons';

export const FormattingPlugin: TextEditorPlugin = {
  name: 'formatting',
  
  getToolbarButtons: (context: PluginContext): ToolbarButtonConfig[] => {
    const { activeElement, currentStyle, onUpdateStyle } = context;
    if (!activeElement) return [];
    
    const style = currentStyle || activeElement.defaultStyle;
    
    return [
      {
        icon: Icons.Bold,
        label: 'Bold',
        shortcut: '⌘B',
        isActive: style.isBold,
        onClick: () => onUpdateStyle('isBold', !style.isBold)
      },
      {
        icon: Icons.Italic,
        label: 'Italic',
        shortcut: '⌘I',
        isActive: style.isItalic,
        onClick: () => onUpdateStyle('isItalic', !style.isItalic)
      },
      {
        icon: Icons.Underline,
        label: 'Underline',
        shortcut: '⌘U',
        isActive: style.isUnderline,
        onClick: () => onUpdateStyle('isUnderline', !style.isUnderline)
      },
      {
        icon: Icons.Strikethrough,
        label: 'Strikethrough',
        isActive: style.isStrike,
        onClick: () => onUpdateStyle('isStrike', !style.isStrike)
      }
    ];
  },
  
  handleKeyDown: (e: KeyboardEvent, context: PluginContext): boolean => {
    const isCmd = e.metaKey || e.ctrlKey;
    if (!isCmd || !context.activeElement) return false;
    
    const style = context.currentStyle || context.activeElement.defaultStyle;
    
    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault();
        context.onUpdateStyle('isBold', !style.isBold);
        return true;
      case 'i':
        e.preventDefault();
        context.onUpdateStyle('isItalic', !style.isItalic);
        return true;
      case 'u':
        e.preventDefault();
        context.onUpdateStyle('isUnderline', !style.isUnderline);
        return true;
      default:
        return false;
    }
  }
};

