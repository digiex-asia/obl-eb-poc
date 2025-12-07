import { apiClient } from './client';
import {
  Template,
  CreateTemplateDto,
  UpdateTemplateDto,
  DesignData,
} from '../types/api.types';

export const templatesApi = {
  /**
   * Create a new template
   */
  create: async (dto: CreateTemplateDto): Promise<Template> => {
    const response = await apiClient.post<Template>('/templates', dto);
    return response.data;
  },

  /**
   * Get template by ID
   */
  getById: async (id: string): Promise<Template> => {
    const response = await apiClient.get<Template>(`/templates/${id}`);
    return response.data;
  },

  /**
   * List all templates
   */
  list: async (): Promise<Template[]> => {
    const response = await apiClient.get<Template[]>('/templates');
    return response.data;
  },

  /**
   * Update template metadata
   */
  updateMetadata: async (
    id: string,
    dto: UpdateTemplateDto
  ): Promise<Template> => {
    const response = await apiClient.patch<Template>(`/templates/${id}`, dto);
    return response.data;
  },

  /**
   * Update template design data (full replace)
   */
  updateDesignData: async (
    id: string,
    designData: DesignData
  ): Promise<Template> => {
    const response = await apiClient.patch<Template>(`/templates/${id}`, {
      designData,
    });
    return response.data;
  },

  /**
   * Delete template
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/templates/${id}`);
  },
};
