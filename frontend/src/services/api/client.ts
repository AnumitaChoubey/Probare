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
      const detail = error.response.data?.detail || error.message;
      if (status === 401) {
        console.error('Unauthorized access - redirecting to login.');
        // Dispatch event so the app can redirect to login
        window.dispatchEvent(new CustomEvent('probare:unauthorized'));
      } else if (status === 403) {
        console.error('Permission denied:', detail);
        window.dispatchEvent(new CustomEvent('probare:toast', {
          detail: { type: 'error', title: 'Permission Denied', description: detail }
        }));
      } else if (status === 409) {
        console.error('CONCURRENT_MODIFICATION: Another user modified this record.');
        window.dispatchEvent(new CustomEvent('probare:toast', {
          detail: {
            type: 'warning',
            title: 'Concurrent Modification',
            description: 'This record was modified by another user. Please refresh to see the latest version.'
          }
        }));
      } else if (status === 503 || status === 502) {
        console.error('Backend service unavailable:', detail);
        window.dispatchEvent(new CustomEvent('probare:toast', {
          detail: { type: 'error', title: 'Service Unavailable', description: 'The backend service is temporarily unavailable. Please try again.' }
        }));
      }
    } else if (error.request) {
      // Network error - no response received
      console.error('Network error:', error.message);
      window.dispatchEvent(new CustomEvent('probare:toast', {
        detail: { type: 'error', title: 'Network Error', description: 'Unable to reach the server. Check your connection.' }
      }));
    }
    return Promise.reject(error);
  }
);
