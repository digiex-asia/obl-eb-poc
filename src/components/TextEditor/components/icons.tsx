/**
 * Icon components - Inline SVGs to prevent dependency errors
 */

import React from 'react';

const Icon = ({ path, ...props }: { path: React.ReactNode; [key: string]: any }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    {path}
  </svg>
);

export const Icons = {
  Undo2: (props: any) => <Icon path={<><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></>} {...props} />,
  Redo2: (props: any) => <Icon path={<><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></>} {...props} />,
  Type: (props: any) => <Icon path={<><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></>} {...props} />,
  Minus: (props: any) => <Icon path={<path d="M5 12h14"/>} {...props} />,
  FontIcon: (props: any) => <Icon path={<><path d="M12 4 4 20"/><path d="m20 20-8-16"/><path d="M6 15h12"/></>} {...props} />,
  Bold: (props: any) => <Icon path={<><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></>} {...props} />,
  Italic: (props: any) => <Icon path={<><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></>} {...props} />,
  Underline: (props: any) => <Icon path={<><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/></>} {...props} />,
  Strikethrough: (props: any) => <Icon path={<><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></>} {...props} />,
  Palette: (props: any) => <Icon path={<><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></>} {...props} />,
  Highlighter: (props: any) => <Icon path={<><path d="m9 11-6 6v3h9l3-3"/><path d="m22 7-4.6 4.6L4.9 14.1c-1.1 1.1-1.1 2.8 0 3.9v0c1.1 1.1 2.8 1.1 3.9 0l2.5-2.5"/><path d="m15 11 1 1"/></>} {...props} />,
  Eclipse: (props: any) => <Icon path={<><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 1 0 10 10"/></>} {...props} />,
  AlignLeft: (props: any) => <Icon path={<><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></>} {...props} />,
  AlignCenter: (props: any) => <Icon path={<><line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="7" y1="12" y2="12"/><line x1="19" x2="5" y1="18" y2="18"/></>} {...props} />,
  AlignRight: (props: any) => <Icon path={<><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/></>} {...props} />,
  AlignJustify: (props: any) => <Icon path={<><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></>} {...props} />,
  List: (props: any) => <Icon path={<><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></>} {...props} />,
  ListOrdered: (props: any) => <Icon path={<><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></>} {...props} />,
  Indent: (props: any) => <Icon path={<><polyline points="3 8 7 12 3 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/></>} {...props} />,
  Outdent: (props: any) => <Icon path={<><polyline points="7 8 3 12 7 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/></>} {...props} />,
  ArrowUpToLine: (props: any) => <Icon path={<><path d="M5 3h14"/><path d="m18 13-6-6-6 6"/><path d="M12 7v14"/></>} {...props} />,
  BoxSelect: (props: any) => <Icon path={<><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h1"/><path d="M14 3h1"/><path d="M14 21h1"/><path d="M3 9v1"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M21 14v1"/></>} {...props} />,
  ArrowDownToLine: (props: any) => <Icon path={<><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></>} {...props} />,
  Maximize: (props: any) => <Icon path={<><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></>} {...props} />,
  Trash2: (props: any) => <Icon path={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>} {...props} />,
  Plus: (props: any) => <Icon path={<><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></>} {...props} />,
  CaseUpper: (props: any) => <Icon path={<><path d="m3 15 4-8 4 8"/><path d="M4 13h6"/><path d="M15 11h4.5a2.5 2.5 0 0 1 0 5H15V7h4a2.5 2.5 0 0 1 0 5"/></>} {...props} />,
  CaseLower: (props: any) => <Icon path={<><circle cx="6" cy="15" r="3"/><path d="M9 12v6"/><circle cx="15" cy="15" r="3"/><path d="M18 12v6"/></>} {...props} />,
  MoveHorizontal: (props: any) => <Icon path={<><polyline points="18 8 22 12 18 16"/><polyline points="6 8 2 12 6 16"/><line x1="2" x2="22" y1="12" y2="12"/></>} {...props} />,
  MoveVertical: (props: any) => <Icon path={<><polyline points="8 18 12 22 16 18"/><polyline points="8 6 12 2 16 6"/><line x1="12" x2="12" y1="2" y2="22"/></>} {...props} />,
  Pilcrow: (props: any) => <Icon path={<><path d="M13 4v16"/><path d="M17 4v16"/><path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13"/></>} {...props} />,
};

