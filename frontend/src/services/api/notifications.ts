import { apiClient } from './client';
import { NotificationItem } from '../../types';

export const notificationsApi = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    const response = await apiClient.get('/notifications');
    return response.data;
  },
  
  markRead: async (id: string): Promise<any> => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },
  
  markAllRead: async (): Promise<any> => {
    const response = await apiClient.post('/notifications/read-all');
    return response.data;
  },
};
