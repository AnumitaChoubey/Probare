import { apiClient, getActiveProjectId } from './client';
import { QualityEvent, QualityStatus } from '../../types';


export const eventsApi = {
  getEvents: async (params?: Record<string, any>): Promise<QualityEvent[]> => {
    const response = await apiClient.get(`/projects/${getActiveProjectId()}/quality-events`, {
      params: { limit: 500, ...params }
    });
    return response.data.items || response.data;
  },
  
  getEvent: async (id: string): Promise<QualityEvent> => {
    const response = await apiClient.get(`/projects/${getActiveProjectId()}/quality-events/${id}`);
    return response.data;
  },
  
  createEvent: async (data: Partial<QualityEvent>): Promise<QualityEvent> => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/quality-events`, data);
    return response.data;
  },
  
  updateEvent: async (id: string, data: Partial<QualityEvent>): Promise<QualityEvent> => {
    const response = await apiClient.patch(`/projects/${getActiveProjectId()}/quality-events/${id}`, data);
    return response.data;
  },
  
  updateStatus: async (id: string, status: QualityStatus, expected_version: number = 1): Promise<QualityEvent> => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/quality-events/${id}/transitions`, {
      target_state: status,
      expected_version: expected_version,
      reason: 'Status transition from UI'
    });
    return response.data;
  },
};
