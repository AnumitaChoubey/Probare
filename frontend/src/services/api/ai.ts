import { apiClient, getActiveProjectId } from './client';


export const aiApi = {
  classify: async (data: any) => {
    // We map to the new FastAPI AI endpoint
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/ai/classify`, data);
    return response.data;
  },
  
  rca: async (data: any) => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/ai/rca`, data);
    return response.data;
  },
  
  qualityCopilot: async (data: { prompt: string }) => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/ai/quality-copilot`, data);
    return response.data;
  },
  
  insights: async (data: { question: string }) => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/ai/insights`, data);
    return response.data;
  },
};
