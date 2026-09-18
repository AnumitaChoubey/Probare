import { apiClient, getActiveProjectId } from './client';
import { CalibrationSession } from '../../types';


export const calibrationsApi = {
  getCalibrations: async (): Promise<CalibrationSession[]> => {
    const response = await apiClient.get(`/projects/${getActiveProjectId()}/calibrations`);
    return response.data;
  },
  
  submitEvaluation: async (sessionId: string, userId: string, scoreData: any): Promise<CalibrationSession> => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/calibrations/${sessionId}/participants/${userId}/score`, scoreData);
    return response.data;
  },
};
