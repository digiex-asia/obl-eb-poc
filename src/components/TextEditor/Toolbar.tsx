/**
 * Toolbar Components - Separated into MainToolbar and ElementToolbar
 */

import React from 'react';
import { TextElement, DefaultStyle, PluginContext } from './types';
import { pluginRegistry } from './core/pluginSystem';
import { Icons } from './components/icons';
import { ToolbarButton, ToolbarSeparator } from './components/ToolbarComponents';

interface MainToolbarProps {
  onAddText: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/**
 * Main Toolbar - Shown when no element is active
 * Fixed at the top of the page
 */
export const MainToolbar: React.FC<MainToolbarProps> = ({ 
  onAddText, 
  canUndo, 
  canRedo, 
  onUndo, 
  onRedo
}) => {
  return (
    <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-200 shadow-sm h-14 z-40 relative">
      <div className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm flex items-center justify-center text-white font-bold">
          <Icons.Type width={20} height={20} />
        </div>
        <div className="font-bold text-gray-800 tracking-tight">Canvas Editor</div>
      </div>

      <div className="flex items-center gap-1 border-r pr-2 border-gray-200">
        <ToolbarButton icon={Icons.Undo2} label="Undo" shortcut="⌘Z" onClick={onUndo} disabled={!canUndo} />
        <ToolbarButton icon={Icons.Redo2} label="Redo" shortcut="⌘⇧Z" onClick={onRedo} disabled={!canRedo} />
      </div>

      <button 
        onClick={onAddText} 
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md shadow-sm text-sm font-medium transition-colors ml-2"
      >
        <Icons.Plus width={16} height={16} strokeWidth={2.5} /> 
        <span>Add Text</span>
      </button>
    </div>
  );
};

interface ElementToolbarProps {
  activeElement: TextElement;
  currentStyle: DefaultStyle | null;
  onDelete: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  context: PluginContext;
  x: number;
  y: number;
  positionAbove?: boolean;
}

/**
 * Element Toolbar - Shown when an element is active
 * Positioned absolutely at the top of the selected element
 */
export const ElementToolbar: React.FC<ElementToolbarProps> = ({ 
  activeElement, // Used via context in plugins
  currentStyle, // Used via context in plugins
  onDelete, 
  canUndo, 
  canRedo, 
  onUndo, 
  onRedo,
  context,
  x,
  y,
  positionAbove = true
}) => {
  // Collect toolbar buttons and sections from all plugins
  const allButtons: Array<{ plugin: string; buttons: any[] }> = [];
  const allSections: Array<{ plugin: string; sections: React.ReactNode[] }> = [];
  
  pluginRegistry.getAllPlugins().forEach(plugin => {
    if (plugin.getToolbarButtons) {
      const buttons = plugin.getToolbarButtons(context);
      if (buttons.length > 0) {
        allButtons.push({ plugin: plugin.name, buttons });
      }
    }
    if (plugin.getToolbarSections) {
      const sections = plugin.getToolbarSections(context);
      if (sections.length > 0) {
        allSections.push({ plugin: plugin.name, sections });
      }
    }
  });

  // Organize buttons by plugin groups
  const formattingButtons = allButtons.find(b => b.plugin === 'formatting')?.buttons || [];
  const colorSections = allSections.find(s => s.plugin === 'color')?.sections || [];
  const shadowButtons = allButtons.find(b => b.plugin === 'shadow')?.buttons || [];
  const alignmentButtons = allButtons.find(b => b.plugin === 'alignment')?.buttons || [];
  const listButtons = allButtons.find(b => b.plugin === 'list')?.buttons || [];
  const verticalAlignButtons = allButtons.find(b => b.plugin === 'verticalAlign')?.buttons || [];
  const autoFitButtons = allButtons.find(b => b.plugin === 'autoFit')?.buttons || [];
  
  // Bottom row sections
  const textTransformSections = allSections.find(s => s.plugin === 'textTransform')?.sections || [];
  const spacingSections = allSections.find(s => s.plugin === 'spacing')?.sections || [];

  return (
    <div 
      className="absolute bg-white border border-gray-200 shadow-lg rounded-lg z-50 pointer-events-auto min-w-max"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: positionAbove ? 'translateY(-100%)' : 'translateY(0)',
      }}
    >
      <div className="flex flex-col w-full">
        {/* Top Row: Core Formatting */}
        <div className="flex items-center gap-1 p-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-0.5">
            <ToolbarButton icon={Icons.Undo2} label="Undo" shortcut="⌘Z" onClick={onUndo} disabled={!canUndo} />
            <ToolbarButton icon={Icons.Redo2} label="Redo" shortcut="⌘⇧Z" onClick={onRedo} disabled={!canRedo} />
          </div>
          
          <ToolbarSeparator />

          {/* Font Plugin Sections */}
          <div className="flex items-center gap-2">
            {allSections.find(s => s.plugin === 'font')?.sections}
          </div>

          <ToolbarSeparator />

          {/* Formatting Buttons */}
          <div className="flex gap-0.5">
            {formattingButtons.map((btn, idx) => (
              <ToolbarButton key={idx} {...btn} />
            ))}
          </div>

          <ToolbarSeparator />

          {/* Color & Shadow */}
          <div className="flex gap-1">
            {colorSections}
            {shadowButtons.map((btn, idx) => (
              <ToolbarButton key={idx} {...btn} />
            ))}
          </div>

          <ToolbarSeparator />

          {/* Alignment */}
          <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5 border border-gray-100">
            {alignmentButtons.map((btn, idx) => (
              <ToolbarButton key={idx} {...btn} />
            ))}
          </div>

          <ToolbarSeparator />
          
          {/* Lists */}
          <div className="flex gap-0.5">
            {listButtons.map((btn, idx) => (
              <ToolbarButton key={idx} {...btn} />
            ))}
          </div>

          <ToolbarSeparator />

          {/* Vertical Align */}
          <div className="flex gap-0.5">
            {verticalAlignButtons.map((btn, idx) => (
              <ToolbarButton key={idx} {...btn} />
            ))}
          </div>

          <ToolbarSeparator />
          
          {/* Auto-Fit */}
          {autoFitButtons.map((btn, idx) => (
            <ToolbarButton key={idx} {...btn} />
          ))}

          <div className="flex-1"></div>
          <ToolbarButton icon={Icons.Trash2} label="Delete Element" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onDelete} />
        </div>

        {/* Bottom Row: Advanced & Spacing */}
        <div className="flex items-center gap-4 px-3 py-2 border-t bg-gray-50/80 text-xs overflow-x-auto no-scrollbar backdrop-blur-sm">
          {textTransformSections}
          <ToolbarSeparator />
          {spacingSections}
        </div>
      </div>
    </div>
  );
};

