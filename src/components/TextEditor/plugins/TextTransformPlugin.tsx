/**
 * Text Transform Plugin - Uppercase, Lowercase, Capitalize
 */

import React from 'react';
import { TextEditorPlugin, PluginContext } from '../types';
import { Icons } from '../components/icons';
import { ToolbarButton, Tooltip } from '../components/ToolbarComponents';

export const TextTransformPlugin: TextEditorPlugin = {
  name: 'textTransform',
  
  getToolbarSections: (context: PluginContext): React.ReactNode[] => {
    const { activeElement, currentStyle, onUpdateStyle } = context;
    if (!activeElement) return [];
    
    const style = currentStyle || activeElement.defaultStyle;
    
    return [
      <div key="text-transform" className="flex items-center gap-2">
        <span className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Casing</span>
        <div className="flex items-center bg-white border border-gray-200 rounded-md p-0.5 shadow-sm">
          <ToolbarButton 
            icon={Icons.Type} 
            label="Original Case" 
            isActive={style.textTransform === 'none'} 
            onClick={() => onUpdateStyle('textTransform', 'none')} 
          />
          <ToolbarButton 
            icon={Icons.CaseUpper} 
            label="Uppercase" 
            isActive={style.textTransform === 'uppercase'} 
            onClick={() => onUpdateStyle('textTransform', 'uppercase')} 
          />
          <ToolbarButton 
            icon={Icons.CaseLower} 
            label="Lowercase" 
            isActive={style.textTransform === 'lowercase'} 
            onClick={() => onUpdateStyle('textTransform', 'lowercase')} 
          />
          <Tooltip text="Title Case">
            <button 
              className={`p-1.5 rounded w-7 h-7 flex items-center justify-center font-bold text-[10px] transition-colors ${style.textTransform === 'capitalize' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : 'hover:bg-gray-100 text-gray-600'}`} 
              onClick={() => onUpdateStyle('textTransform', 'capitalize')}
            >
              Tt
            </button>
          </Tooltip>
        </div>
      </div>
    ];
  }
};

