/**
 * Spacing Plugin - Letter Spacing, Line Height, Paragraph Spacing
 */

import React from 'react';
import { TextEditorPlugin, PluginContext } from '../types';
import { Icons } from '../components/icons';
import { Tooltip } from '../components/ToolbarComponents';

export const SpacingPlugin: TextEditorPlugin = {
  name: 'spacing',
  
  getToolbarSections: (context: PluginContext): React.ReactNode[] => {
    const { activeElement, currentStyle, onUpdateStyle } = context;
    if (!activeElement) return [];
    
    const style = currentStyle || activeElement.defaultStyle;
    
    return [
      <div key="spacing-controls" className="flex items-center gap-4">
        <Tooltip text="Letter Spacing">
          <div className="flex items-center gap-1.5 group">
            <Icons.MoveHorizontal width={14} height={14} className="text-gray-400 group-hover:text-gray-600 transition-colors"/>
            <input 
              type="number" 
              className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
              value={style.letterSpacing || 0} 
              onChange={(e) => onUpdateStyle('letterSpacing', parseFloat(e.target.value))} 
              step="0.5"
            />
          </div>
        </Tooltip>
        
        <Tooltip text="Line Height">
          <div className="flex items-center gap-1.5 group">
            <Icons.MoveVertical width={14} height={14} className="text-gray-400 group-hover:text-gray-600 transition-colors"/>
            <input 
              type="number" 
              className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
              value={style.lineHeight || 1.2} 
              onChange={(e) => onUpdateStyle('lineHeight', parseFloat(e.target.value))} 
              step="0.1"
            />
          </div>
        </Tooltip>

        <Tooltip text="Paragraph Spacing">
          <div className="flex items-center gap-1.5 group">
            <Icons.Pilcrow width={14} height={14} className="text-gray-400 group-hover:text-gray-600 transition-colors"/>
            <input 
              type="number" 
              className="w-12 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
              value={activeElement.defaultStyle.paragraphSpacing || 0} 
              onChange={(e) => onUpdateStyle('paragraphSpacing', parseInt(e.target.value))} 
              step="1"
            />
          </div>
        </Tooltip>
      </div>
    ];
  }
};

