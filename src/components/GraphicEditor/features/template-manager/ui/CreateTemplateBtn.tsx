import * as React from 'react';
import { Plus, X } from 'lucide-react';

const { useState } = React;

interface CreateTemplateBtnProps {
  onCreate: (name: string, description?: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Button with modal for creating new templates
 */
export const CreateTemplateBtn: React.FC<CreateTemplateBtnProps> = ({
  onCreate,
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreate(templateName.trim(), description.trim() || undefined);
      // Reset and close on success
      setIsModalOpen(false);
      setTemplateName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setTemplateName('');
    setDescription('');
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <>
      {/* Create Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Create New Template"
      >
        <Plus size={18} />
        <span className="font-medium">New Template</span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[480px] max-w-[90vw]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Create New Template</h2>
              <button
                onClick={handleCancel}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Template Name */}
              <div>
                <label
                  htmlFor="template-name"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Template Name *
                </label>
                <input
                  id="template-name"
                  type="text"
                  placeholder="My Awesome Template"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  autoFocus
                  disabled={isCreating}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="template-description"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Description (optional)
                </label>
                <textarea
                  id="template-description"
                  placeholder="Brief description of your template..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={isCreating}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button
                onClick={handleCancel}
                disabled={isCreating}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !templateName.trim()}
                className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isCreating ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
