import { apiClient, getActiveProjectId } from './client';
import { QualityStatus } from '../../types';

export const bulkApi = {
  submitStatusUpdateJob: async (eventIds: string[], newStatus: QualityStatus) => {
    const payload = {
      operation_type: "status_update",
      filter_criteria: { id: eventIds }, // We assume backend can handle IDs in filter_criteria
      operation_payload: { target_status: newStatus }
    };
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/bulk/jobs`, payload);
    return response.data;
  },

  submitAssignJob: async (eventIds: string[], assigneeId: string) => {
    const payload = {
      operation_type: "assign",
      filter_criteria: { id: eventIds },
      operation_payload: { assignee_id: assigneeId }
    };
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/bulk/jobs`, payload);
    return response.data;
  }
};
