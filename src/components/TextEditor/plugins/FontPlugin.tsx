/**
 * Font Plugin - Font Family and Font Size
 */

import React from 'react';
import { TextEditorPlugin, PluginContext } from '../types';
import { Icons } from '../components/icons';
import { Tooltip } from '../components/ToolbarComponents';

export const FontPlugin: TextEditorPlugin = {
  name: 'font',
  
  getToolbarSections: (context: PluginContext): React.ReactNode[] => {
    const { activeElement, currentStyle, onUpdateStyle } = context;
    if (!activeElement) return [];
    
    const style = currentStyle || activeElement.defaultStyle;
    
    return [
      <Tooltip key="font-family" text="Font Family">
        <div className="relative group">
          <select 
            className="appearance-none bg-transparent hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-md px-2 py-1.5 pr-6 text-xs font-medium outline-none cursor-pointer w-28 transition-colors text-gray-700"
            value={style.fontFamily}
            onChange={(e) => onUpdateStyle('fontFamily', e.target.value)}
          >
            {['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New', 'Impact'].map(f => 
              <option key={f} value={f}>{f}</option>
            )}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            // <Icons.Minus width={10} height={10} className="rotate-45" />
          </div>
        </div>
      </Tooltip>,
      <Tooltip key="font-size" text="Font Size">
        <div className="flex items-center border border-gray-200 rounded-md bg-white hover:border-gray-300 transition-colors">
          <div className="px-2 text-gray-400">
            // <Icons.FontIcon width={12} height={12} />
          </div>
          <input 
            type="number" 
            className="w-10 py-1.5 text-xs font-medium outline-none bg-transparent text-center text-gray-700"
            value={style.fontSize}
            onChange={(e) => onUpdateStyle('fontSize', parseInt(e.target.value))}
            min="8" max="120"
            disabled={activeElement.autoFit} 
            title={activeElement.autoFit ? 'Auto-Fit Enabled' : ''}
          />
        </div>
      </Tooltip>
    ];
  }
};

