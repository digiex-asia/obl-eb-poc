/**
 * Hidden Input Component for text editing
 */

import React, { useRef, useEffect } from 'react';

interface HiddenInputProps {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  onChange: (value: string) => void;
  onSelect: (start: number, end: number) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onCopy: (e: React.ClipboardEvent) => void;
}

export const HiddenInput: React.FC<HiddenInputProps> = ({ 
  value, 
  selectionStart, 
  selectionEnd, 
  onChange, 
  onSelect, 
  onKeyDown, 
  onBlur, 
  onPaste, 
  onCopy 
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      if (document.activeElement !== ref.current) ref.current.focus({ preventScroll: true });
      if (ref.current.selectionStart !== selectionStart || ref.current.selectionEnd !== selectionEnd) {
        ref.current.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }); 

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onSelect={(e) => onSelect(e.currentTarget.selectionStart, e.currentTarget.selectionEnd)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onPaste={onPaste}
      onCopy={onCopy}
      autoFocus
      style={{ 
        position: 'fixed', top: 0, left: 0, opacity: 0, 
        width: '1px', height: '1px', border: 'none', 
        outline: 'none', resize: 'none', overflow: 'hidden', zIndex: -1 
      }}
    />
  );
};

