import { apiClient, getActiveProjectId } from './client';
import { QualityEvent, QualityStatus } from '../../types';

// Maps backend snake_case response → frontend camelCase QualityEvent type
function mapEventFromApi(e: any): QualityEvent {
  const now = new Date();
  const slaDue = e.sla_due_at ? new Date(e.sla_due_at) : new Date(now.getTime() + 48 * 3600 * 1000);
  const hoursRemaining = Math.round((slaDue.getTime() - now.getTime()) / 3600000 * 10) / 10;
  const slaStatus = hoursRemaining < 0 ? 'Breached' : hoursRemaining < 8 ? 'At Risk' : hoursRemaining < 20 ? 'Warning' : 'On Track';

  return {
    id: e.id,
    title: e.title || '(Untitled)',
    date: e.created_at ? new Date(e.created_at).toLocaleString() : '',
    employee: e.employee_name || e.employee_id || 'Unknown',
    employeeId: e.employee_id || '',
    team: e.team_name || e.team_id || 'Unknown Team',
    processArea: e.process_id || '',
    subCategory: e.sub_process_id || '',
    errorType: e.error_type_id || '',
    sopId: e.sop_id || '',
    sopTitle: e.sop_id || '',
    severity: e.severity || 'MEDIUM',
    status: e.status || 'Logged',
    owner: e.owner_name || e.owner_id || 'Unassigned',
    createdBy: e.created_by_name || e.created_by_id || '',
    description: e.description || '',
    customerImpact: e.customer_impact || '',
    financialImpact: e.financial_impact || undefined,
    complianceImpact: e.compliance_impact || undefined,
    expectedOutcome: e.expected_outcome || undefined,
    actualOutcome: e.actual_outcome || undefined,
    slaDueDate: slaDue.toISOString(),
    slaStatus,
    slaHoursRemaining: hoursRemaining,
    evidence: [],
    correctiveActions: [],
    history: [],
    version: e.version || 1,
  };
}

export const eventsApi = {
  getEvents: async (params?: Record<string, any>): Promise<QualityEvent[]> => {
    const response = await apiClient.get(`/projects/${getActiveProjectId()}/quality-events`, {
      params: { limit: 100, ...params }
    });
    const items = response.data.items || response.data;
    return Array.isArray(items) ? items.map(mapEventFromApi) : [];
  },
  
  getEvent: async (id: string): Promise<QualityEvent> => {
    const response = await apiClient.get(`/projects/${getActiveProjectId()}/quality-events/${id}`);
    return mapEventFromApi(response.data);
  },
  
  createEvent: async (data: any): Promise<QualityEvent> => {
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
      customer_impact: data.customerImpact || data.customer_impact || 'None',
      owner_id: data.ownerId || data.owner_id
    };

    const response = await apiClient.post(`/projects/${getActiveProjectId()}/quality-events`, payload);
    return mapEventFromApi(response.data);
  },
  
  updateEvent: async (id: string, data: Partial<QualityEvent>): Promise<QualityEvent> => {
    const response = await apiClient.patch(`/projects/${getActiveProjectId()}/quality-events/${id}`, data);
    return mapEventFromApi(response.data);
  },
  
  updateStatus: async (id: string, status: QualityStatus, expected_version: number = 1): Promise<QualityEvent> => {
    const response = await apiClient.post(`/projects/${getActiveProjectId()}/quality-events/${id}/transitions`, {
      target_state: status,
      expected_version: expected_version,
      reason: 'Status transition from UI'
    });
    return mapEventFromApi(response.data);
  },
};
