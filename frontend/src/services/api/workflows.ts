import { apiClient, getActiveProjectId } from './client';
import { RootCauseAnalysis, CorrectiveAction, EffectivenessReview } from '../../types';


export const rcaApi = {
  saveRCA: async (eventId: string, rca: RootCauseAnalysis): Promise<RootCauseAnalysis> => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/quality-events/${eventId}/rca`, rca);
    return response.data.data;
  },
};

export const capaApi = {
  addCorrectiveAction: async (eventId: string, action: Partial<CorrectiveAction>): Promise<CorrectiveAction> => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/quality-events/${eventId}/corrective-actions`, action);
    return response.data.data;
  },
  
  updateCorrectiveActionStatus: async (actionId: string, status: string, notes?: string): Promise<CorrectiveAction> => {
    const response = await apiClient.patch(`/projects/${getActiveProjectId()}/corrective-actions/${actionId}`, { status, notes });
    return response.data.data;
  },
};

export const effectivenessApi = {
  submitEffectivenessReview: async (eventId: string, review: Partial<EffectivenessReview>): Promise<EffectivenessReview> => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/quality-events/${eventId}/effectiveness-review`, review);
    return response.data.data;
  },
};
