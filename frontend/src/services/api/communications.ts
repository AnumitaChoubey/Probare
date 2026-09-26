import { apiClient as api, getActiveProjectId } from './client';

export interface CommunicationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  attachments?: any[];
  read_states?: { user_id: string; read_at: string }[];
}

export interface Conversation {
  id: string;
  quality_event_id: string;
  participants: { user_id: string; role_hint?: string }[];
  messages: CommunicationMessage[];
}

export interface PaginatedMessages {
  items: CommunicationMessage[];
  total_count: number;
}

export const communicationsApi = {
  getConversation: async (eventId: string): Promise<Conversation> => {
    const projectId = getActiveProjectId();
    const { data } = await api.get(`/projects/${projectId}/quality-events/${eventId}/conversation`);
    return data;
  },
  
  getMessages: async (eventId: string, skip = 0, limit = 50): Promise<PaginatedMessages> => {
    const projectId = getActiveProjectId();
    const { data } = await api.get(`/projects/${projectId}/quality-events/${eventId}/conversation/messages`, {
      params: { skip, limit }
    });
    return data;
  },
  
  postMessage: async (eventId: string, body: string, attachmentIds: string[] = []): Promise<CommunicationMessage> => {
    const projectId = getActiveProjectId();
    const { data } = await api.post(`/projects/${projectId}/quality-events/${eventId}/conversation/messages`, {
      body,
      attachment_ids: attachmentIds
    });
    return data;
  },
  
  markRead: async (eventId: string, messageId: string): Promise<void> => {
    const projectId = getActiveProjectId();
    await api.post(`/projects/${projectId}/quality-events/${eventId}/conversation/messages/${messageId}/read`);
  }
};
