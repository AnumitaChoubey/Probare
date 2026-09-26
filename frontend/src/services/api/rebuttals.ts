import { apiClient, getActiveProjectId } from './client';
import { RebuttalRecord, DisputeCategory } from '../../types';


export const rebuttalsApi = {
  submitRebuttal: async (eventId: string, data: { category: DisputeCategory, explanation: string, evidenceFiles: any[] }): Promise<RebuttalRecord> => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/quality-events/${eventId}/rebuttal`, data);
    return response.data.data;
  },
  
  resolveRebuttal: async (eventId: string, data: { decision: string, rationale: string, expected_version: number }): Promise<any> => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/quality-events/${eventId}/rebuttal/decision`, data);
    return response.data.data;
  },
};
