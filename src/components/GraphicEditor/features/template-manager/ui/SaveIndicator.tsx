import * as React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

interface SaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  templateName?: string;
}

/**
 * Displays save status with visual feedback
 */
export const SaveIndicator: React.FC<SaveIndicatorProps> = ({
  isSaving,
  lastSaved,
  error,
  templateName,
}) => {
  const relativeTime = lastSaved ? formatRelativeTime(lastSaved) : null;

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-400">
        <Loader2 size={16} className="animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-red-400 cursor-help"
        title={error.message}
      >
        <AlertCircle size={16} />
        <span>Save failed</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span>
          {templateName && <strong className="text-white">{templateName}</strong>}
          {templateName && ' · '}
          Saved {relativeTime}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <div className="w-2 h-2 bg-gray-500 rounded-full" />
      <span>Not saved</span>
    </div>
  );
};

/**
 * Format a date as relative time (e.g., "just now", "2m ago", "1h ago")
 */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 10) {
    return 'just now';
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'yesterday';
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  // For older dates, show the actual date
  return date.toLocaleDateString();
}
