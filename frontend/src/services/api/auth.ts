import { apiClient } from './client';
import { UserRole, RolePermissions } from '../../types';

export interface AuthContextResponse {
  qems_user_id: string;
  external_tenant_id: string;
  accessible_projects: string[];
  roles: UserRole[];
  permissions: (keyof RolePermissions)[];
}

export const authApi = {
  getMe: async (): Promise<AuthContextResponse> => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 403) {
        try {
          console.log('User lacks QEMS mapping, auto-provisioning...');
          await apiClient.post('/auth/register');
          const retryResponse = await apiClient.get('/auth/me');
          return retryResponse.data;
        } catch (regError) {
          console.error('Failed to auto-provision Clerk user in QEMS', regError);
          throw regError;
        }
      }
      throw error;
    }
  },
};
