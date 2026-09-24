import { apiClient } from './client';

export interface TaxonomyConfig {
  processes: Record<string, any>;
  teams: string[];
  root_causes: string[];
  sla_policies: any[];
}

export interface ProjectResponse {
  id: string;
  name: string;
  tenant_id: string;
  taxonomy_config?: TaxonomyConfig;
}

export interface ProjectUser {
  id: string;
  name: string;
  email: string;
  project_role: string;
}

export const projectsApi = {
  list: async (): Promise<ProjectResponse[]> => {
    const { data } = await apiClient.get('/projects');
    return data;
  },
  
  create: async (name: string, tenantId?: string): Promise<ProjectResponse> => {
    const { data } = await apiClient.post('/projects', { name, tenant_id: tenantId });
    return data;
  },
  
  getTaxonomy: async (projectId: string): Promise<TaxonomyConfig> => {
    const { data } = await apiClient.get(`/projects/${projectId}/taxonomy`);
    return data;
  },

  getUsers: async (projectId: string): Promise<ProjectUser[]> => {
    const { data } = await apiClient.get(`/projects/${projectId}/users`);
    return data;
  },
  
  delete: async (projectId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}`);
  }
};
