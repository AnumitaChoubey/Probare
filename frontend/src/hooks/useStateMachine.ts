import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface StateMachineConfig {
  transitions: Record<string, string[]>;
  roles: Record<string, string[]>;
}

export function useStateMachine() {
  const { data: config, isLoading, error } = useQuery<StateMachineConfig>({
    queryKey: ['stateMachineConfig'],
    queryFn: async () => {
      // In a real app, this URL would be relative or injected via env vars
      const res = await axios.get('/api/v1/config/state-machine');
      return res.data;
    },
    staleTime: Infinity, // Configuration rarely changes during a session
  });

  const getAvailableTransitions = (currentState: string): string[] => {
    if (!config) return [];
    return config.transitions[currentState] || [];
  };

  const canPerformAction = (action: string, userRoles: string[]): boolean => {
    if (!config || !config.roles[action]) return true; // If no specific role required, allow
    return config.roles[action].some(role => userRoles.includes(role));
  };

  return {
    config,
    isLoading,
    error,
    getAvailableTransitions,
    canPerformAction,
  };
}
