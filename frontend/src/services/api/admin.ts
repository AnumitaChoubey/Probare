import { apiClient } from './client';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
}

export const adminApi = {
  listUsers: async (): Promise<AdminUser[]> => {
    const { data } = await apiClient.get('/admin/users');
    return data;
  },
  
  assignRole: async (userId: string, projectId: string, role: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/admin/users/roles', {
      user_id: userId,
      project_id: projectId,
      role
    });
    return data;
  }
};
