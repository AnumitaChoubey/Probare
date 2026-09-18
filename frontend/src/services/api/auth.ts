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
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};
