import { apiClient } from './client';
import { Template, Operation } from '../types/api.types';

export interface ApplyOperationsDto {
  operations: Operation[];
  baseVersion: number;
}

export interface ApplyOperationsResponse {
  template: Template;
  appliedOps: string[];
}

export const operationsApi = {
  /**
   * Apply partial updates via operations (more efficient than full state sync)
   */
  applyOperations: async (
    templateId: string,
    dto: ApplyOperationsDto
  ): Promise<ApplyOperationsResponse> => {
    const url = `/templates/${templateId}/operations`;
    console.log('[operationsApi] Calling:', { url, templateId, dto });

    const response = await apiClient.post<ApplyOperationsResponse>(url, dto);
    return response.data;
  },
};
