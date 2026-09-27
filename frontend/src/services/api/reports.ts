import { apiClient, getActiveProjectId } from './client';

export const reportsApi = {
  getTemplates: async () => {
    const response = await apiClient.get(`/projects/${getActiveProjectId()}/reports/templates`);
    return response.data;
  },

  createTemplate: async (data: any) => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/reports/templates`, data);
    return response.data;
  },

  triggerRun: async (templateId: str, format: str = "csv") => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/reports/templates/${templateId}/run`, {
      export_format: format
    });
    return response.data;
  },

  getRunStatus: async (runId: str) => {
    const response = await apiClient.get(`/projects/${getActiveProjectId()}/reports/runs/${runId}`);
    return response.data;
  }
};
