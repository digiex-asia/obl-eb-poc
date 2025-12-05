/**
 * Core utility functions
 */

// Helper to generate unique IDs
export const generateId = () => `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// Helper for Title Case - Improved to handle spacing better
export const toTitleCase = (str: string): string => {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

