import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

let activeProjectId = '';

export const setActiveProjectId = (id: string) => {
  activeProjectId = id;
};

export const getActiveProjectId = () => {
  if (!activeProjectId) {
    console.warn('API called before activeProjectId was set from /auth/me context.');
  }
  return activeProjectId;
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
apiClient.interceptors.request.use(
  async (config) => {
    // Attempt to get token from Clerk first
    if (window.Clerk?.session) {
      try {
        const token = await window.Clerk.session.getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (err) {
        console.error("Failed to fetch Clerk token", err);
      }
    } else {
      // Fallback for development if Clerk is not yet mounted or not configured
      const isDev = import.meta.env.MODE === 'development';
      if (isDev) {
        const devToken = import.meta.env.VITE_DEV_TOKEN;
        if (devToken) {
          config.headers['Authorization'] = `Bearer ${devToken}`;
        }
      }
    }
    
    if ((config.method === 'post' || config.method === 'patch' || config.method === 'put') && !config.headers['Idempotency-Key']) {
      // Use crypto.randomUUID() if available, fallback to a simple generator
      const getUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      config.headers['Idempotency-Key'] = getUUID();
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for generic error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        console.error('Unauthorized access - please login.');
      } else if (status === 403) {
        console.error('Permission denied.');
      } else if (status === 409) {
        console.error('CONCURRENT_MODIFICATION: Another user has modified this record. State will not be overwritten silently.');
        if (window.qems?.notifications) {
          window.qems.notifications.show('Concurrent Modification', 'The record was modified by another user. Please refresh.');
        } else {
          // A naive alert for non-electron fallback
          alert('CONCURRENT_MODIFICATION: Record modified by another user. Please refresh.');
        }
      }
    }
    return Promise.reject(error);
  }
);
