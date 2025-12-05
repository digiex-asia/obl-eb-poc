/**
 * Color Plugin - Text Color and Highlight
 */

import React from 'react';
import { TextEditorPlugin, PluginContext } from '../types';
import { Icons } from '../components/icons';
import { Tooltip } from '../components/ToolbarComponents';

export const ColorPlugin: TextEditorPlugin = {
  name: 'color',
  
  getToolbarSections: (context: PluginContext): React.ReactNode[] => {
    const { activeElement, currentStyle, onUpdateStyle } = context;
    if (!activeElement) return [];
    
    const style = currentStyle || activeElement.defaultStyle;
    
    return [
      <Tooltip key="text-color" text="Text Color">
        <div className="relative group p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors">
          <Icons.Palette width={18} height={18} style={{ color: style.fill }} />
          <input 
            type="color" 
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
            value={style.fill} 
            onChange={(e) => onUpdateStyle('fill', e.target.value)}
          />
        </div>
      </Tooltip>,
      <Tooltip key="highlight-color" text="Highlight Color">
        <div className="relative group p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors">
          <Icons.Highlighter width={18} height={18} className="text-gray-600" />
          <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white shadow-sm pointer-events-none" style={{ backgroundColor: style.backgroundColor || 'transparent' }}></div>
          <input 
            type="color" 
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
            value={style.backgroundColor || '#ffffff'} 
            onChange={(e) => onUpdateStyle('backgroundColor', e.target.value)}
          />
        </div>
      </Tooltip>
    ];
  }
};

