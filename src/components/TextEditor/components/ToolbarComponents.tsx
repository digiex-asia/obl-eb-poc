/**
 * Shared Toolbar Components
 */

import React from 'react';
import { Icons } from './icons';
import { ToolbarButtonConfig } from '../types';

export const Tooltip = ({ text, shortcut, children }: { text?: string; shortcut?: string; children: React.ReactNode }) => {
  if (!text && !shortcut) return <>{children}</>;
  
  return (
    <div className="group relative flex items-center justify-center">
      {children}
      <div className="absolute top-full mt-2 px-2 py-1.5 bg-gray-900 text-white text-[10px] font-medium rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity delay-300 pointer-events-none whitespace-nowrap z-50 flex items-center gap-2 border border-gray-700">
        <span>{text}</span>
        {shortcut && (
          <span className="text-gray-400 font-mono text-[9px] bg-gray-800 px-1 rounded border border-gray-700">
            {shortcut}
          </span>
        )}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-l border-t border-gray-700"></div>
      </div>
    </div>
  );
};

export const ToolbarButton = ({ icon: Icon, label, shortcut, onClick, isActive, disabled, color, className = "" }: ToolbarButtonConfig & { color?: string }) => (
  <Tooltip text={label} shortcut={shortcut}>
    <button 
      className={`
        p-1.5 rounded-md transition-all duration-200 outline-none
        ${disabled 
          ? 'opacity-40 cursor-not-allowed text-gray-400' 
          : isActive 
            ? 'bg-blue-50 text-blue-600 shadow-inner ring-1 ring-blue-100' 
            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900 active:bg-gray-200'
        }
        ${className}
      `}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon width={18} height={18} strokeWidth={2} style={color ? { color } : undefined} />
    </button>
  </Tooltip>
);

export const ToolbarSeparator = () => <div className="w-px h-5 bg-gray-200 mx-1 self-center" />;

