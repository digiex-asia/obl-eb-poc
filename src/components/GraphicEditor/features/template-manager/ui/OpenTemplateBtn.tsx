import * as React from 'react';
import { FolderOpen, X, Loader2, Calendar, Tag } from 'lucide-react';
import type { Template } from '../../../shared/types/api.types';

const { useState, useEffect } = React;

interface OpenTemplateBtnProps {
  onOpen: (templateId: string) => Promise<void>;
  onListTemplates: () => Promise<Template[]>;
  disabled?: boolean;
}

/**
 * Button with modal for opening existing templates
 */
export const OpenTemplateBtn: React.FC<OpenTemplateBtnProps> = ({
  onOpen,
  onListTemplates,
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Load templates when modal opens
  useEffect(() => {
    if (isModalOpen) {
      loadTemplates();
    }
  }, [isModalOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const templateList = await onListTemplates();
      setTemplates(templateList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = async (templateId: string) => {
    setIsOpening(true);
    setError(null);

    try {
      await onOpen(templateId);
      setIsModalOpen(false);
      setSelectedTemplateId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open template');
    } finally {
      setIsOpening(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedTemplateId(null);
    setError(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <>
      {/* Open Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Open Template"
      >
        <FolderOpen size={18} />
        <span className="font-medium">Open</span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[800px] max-w-[90vw] max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Open Template</h2>
              <button
                onClick={handleCancel}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
                  <p className="text-gray-400">Loading templates...</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
                  {error}
                  <button
                    onClick={loadTemplates}
                    className="ml-4 text-sm underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No templates found</p>
                  <p className="text-sm mt-2">Create your first template to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedTemplateId === template.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <h3 className="font-semibold text-white text-lg mb-2">
                        {template.name}
                      </h3>
                      {template.description && (
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {template.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                          >
                            <Tag size={12} />
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(template.updatedAt)}
                        </span>
                        <span className="text-gray-600">v{template.version}</span>
                        {template.designData?.pages && (
                          <span>{template.designData.pages.length} pages</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button
                onClick={handleCancel}
                disabled={isOpening}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedTemplateId && handleOpen(selectedTemplateId)}
                disabled={isOpening || !selectedTemplateId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {isOpening ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Opening...
                  </>
                ) : (
                  'Open Template'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
