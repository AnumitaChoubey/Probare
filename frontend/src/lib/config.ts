// frontend/src/lib/config.ts
// If running inside Electron, route API requests to the local sidecar backend.
// Otherwise, use the standard VITE_API_URL for the web app.
export const API_BASE_URL = (window as any).qemsDesktop 
  ? 'http://127.0.0.1:8765' 
  : import.meta.env.VITE_API_URL;
