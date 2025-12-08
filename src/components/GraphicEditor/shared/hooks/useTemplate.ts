import { useState, useCallback } from 'react';
import { templatesApi } from '../api/templates.api';
import { mappers } from '../lib/mappers';
import { Template, DesignData, Page, AudioLayer } from '../types/api.types';

// Minimal AppState interface needed for this hook
interface AppState {
  pages: Page[];
  audioLayers: AudioLayer[];
  [key: string]: unknown;
}

interface UseTemplateReturn {
  currentTemplateId: string | null;
  templateName: string;
  templateVersion: number;
  isLoading: boolean;
  error: Error | null;
  createTemplate: (name: string, description?: string) => Promise<Template>;
  loadTemplate: (id: string) => Promise<Partial<AppState>>;
  saveTemplate: (state: AppState) => Promise<Template>;
  listTemplates: () => Promise<Template[]>;
  setTemplateVersion: (version: number) => void;
}

/**
 * Hook for managing template CRUD operations
 *
 * @param initialState - Initial app state (used when creating new template)
 * @returns Template management functions and state
 *
 * @example
 * const {
 *   currentTemplateId,
 *   templateName,
 *   createTemplate,
 *   loadTemplate,
 *   saveTemplate
 * } = useTemplate(state);
 */
export const useTemplate = (initialState: AppState): UseTemplateReturn => {
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(
    null
  );
  const [templateName, setTemplateName] = useState('Untitled Template');
  const [templateVersion, setTemplateVersion] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Create a new template
   */
  const createTemplate = useCallback(
    async (name: string, description?: string): Promise<Template> => {
      setIsLoading(true);
      setError(null);

      try {
        const designData = mappers.toDesignData(initialState);

        const template = await templatesApi.create({
          name,
          description: description || 'Created with GraphicEditor',
          category: 'design',
          tags: ['graphic-editor'],
          isPublic: false,
          designData,
        });

        setCurrentTemplateId(template.id);
        setTemplateName(name);
        setTemplateVersion(template.version);

        console.log('[useTemplate] Template created:', template.id);
        return template;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to create template');
        setError(error);
        console.error('[useTemplate] Create failed:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [initialState]
  );

  /**
   * Load a template by ID
   * Returns partial AppState that can be merged with current state
   */
  const loadTemplate = useCallback(
    async (id: string): Promise<Partial<AppState>> => {
      setIsLoading(true);
      setError(null);

      try {
        const template = await templatesApi.getById(id);

        setCurrentTemplateId(id);
        setTemplateName(template.name);
        setTemplateVersion(template.version);

        // Convert DesignData to partial AppState
        const partialState = mappers.fromDesignData(
          template.designData,
          initialState
        );

        console.log('[useTemplate] Template loaded:', id);
        return partialState;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to load template');
        setError(error);
        console.error('[useTemplate] Load failed:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [initialState]
  );

  /**
   * Save current state to existing template
   */
  const saveTemplate = useCallback(
    async (state: AppState): Promise<Template> => {
      if (!currentTemplateId) {
        throw new Error('No template loaded. Create a template first.');
      }

      setError(null);

      try {
        const designData = mappers.toDesignData(state);
        const template = await templatesApi.updateDesignData(
          currentTemplateId,
          designData
        );

        console.log('[useTemplate] Template saved:', currentTemplateId);
        return template;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to save template');
        setError(error);
        console.error('[useTemplate] Save failed:', error);
        throw error;
      }
    },
    [currentTemplateId]
  );

  /**
   * List all templates
   */
  const listTemplates = useCallback(async (): Promise<Template[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const templates = await templatesApi.list();
      console.log('[useTemplate] Templates listed:', templates.length);
      return templates;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to list templates');
      setError(error);
      console.error('[useTemplate] List failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    currentTemplateId,
    templateName,
    templateVersion,
    isLoading,
    error,
    createTemplate,
    loadTemplate,
    saveTemplate,
    listTemplates,
    setTemplateVersion,
  };
};
