import { apiClient, getActiveProjectId } from './client';


export const evidenceApi = {
  upload: async (eventId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/quality-events/${eventId}/evidence`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getEvidenceList: async (eventId: string) => {
    const response = await apiClient.get(`/projects/${getActiveProjectId()}/quality-events/${eventId}/evidence`);
    return response.data;
  },
};
