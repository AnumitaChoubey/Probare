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
  
  createEvent: async (data: any): Promise<QualityEvent> => {
    // Map frontend UI model to backend schema
    const payload = {
      title: data.title,
      description: data.description,
      severity: data.severity || 'Medium',
      employee_id: data.employeeId || data.employee_id || 'system',
      team_id: data.teamId || data.team_id,
      process_id: data.processArea || data.processId || data.process_id,
      sub_process_id: data.subCategory || data.sub_process_id,
      error_type_id: data.errorType || data.error_type_id,
      sop_id: data.sopId || data.sop_id,
      customer_impact: data.customerImpact || data.customer_impact,
      owner_id: data.ownerId || data.owner_id
    };

    const response = await apiClient.post(`/projects/${getActiveProjectId()}/quality-events`, payload);
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
