import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communicationsApi } from '../../services/api/communications';
import { useQEMS } from '../../context/QEMSContext';
import { Send, FileText, UserCircle } from 'lucide-react';

export const EventCommunication: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { currentUser, addToast } = useQEMS();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['communications', eventId],
    queryFn: () => communicationsApi.getMessages(eventId),
    refetchInterval: 10000, // Poll every 10s for new messages
  });

  const sendMessageMutation = useMutation({
    mutationFn: (body: string) => communicationsApi.postMessage(eventId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', eventId] });
      setMessage('');
    },
    onError: () => {
      addToast({ type: 'error', title: 'Error', description: 'Failed to send message.' });
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  const messages = messagesData?.items || [];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center">
          <FileText className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
          Event Thread
        </h2>
        <p className="text-xs text-slate-500 mt-1">Universal chronological communication for this quality event.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No communication yet. Start the discussion below.
          </div>
        ) : (
          [...messages].reverse().map((msg) => {
            const isMe = msg.sender_id === currentUser.name || msg.sender_id === 'SYSTEM'; // Simplification for UI matching
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <UserCircle className={`w-6 h-6 mt-1 ${isMe ? 'ml-2 text-indigo-500' : 'mr-2 text-slate-400'}`} />
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-slate-500 mb-0.5 px-1 font-mono">
                      {msg.sender_id} • {new Date(msg.created_at).toLocaleString()}
                    </span>
                    <div
                      className={`px-3 py-2 rounded-lg text-sm ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                      }`}
                    >
                      {msg.body}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSend} className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[44px] max-h-32"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-md transition-colors h-[44px] flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
