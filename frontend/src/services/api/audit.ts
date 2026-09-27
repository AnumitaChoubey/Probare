import { apiClient, getActiveProjectId } from './client';

export const auditApi = {
  getTrail: async (params?: Record<string, any>) => {
    const response = await apiClient.get(`/projects/${getActiveProjectId()}/audit-trail`, { params });
    return response.data;
  }
};
