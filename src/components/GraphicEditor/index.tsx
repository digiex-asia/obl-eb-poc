/**
 * GraphicEditor Public Export
 *
 * Exports both old (monolithic) and new (FSD) versions for comparison
 */

// Old implementation (original monolithic App.old.tsx)
import AppOld from './App.old';

// New implementation (FSD) - work in progress
import AppNew from './app-v2';

// Named exports for comparison routes
export const GraphicEditorOld = AppOld;
export const GraphicEditorNew = AppNew;

// Default export (points to old for backward compatibility)
export default AppOld;
