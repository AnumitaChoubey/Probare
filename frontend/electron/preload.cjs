// electron/preload.js
// Runs in the renderer context BEFORE the page loads.
// Exposes a narrow, explicit API to the React app via contextBridge.
// contextIsolation is ON — the renderer never gets raw Node.js access.

const { contextBridge, ipcRenderer, shell } = require('electron');
const { IPC } = require('./ipcChannels.cjs');

contextBridge.exposeInMainWorld('qemsDesktop', {
  /**
   * Returns the Electron app version from package.json.
   * @returns {Promise<string>}
   */
  getAppVersion: () => ipcRenderer.invoke(IPC.GET_APP_VERSION),

  /**
   * Reads a credential from the OS keychain (keytar).
   * Falls back gracefully — if the key doesn't exist, returns null.
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  getSecureToken: (key) => ipcRenderer.invoke(IPC.GET_SECURE_TOKEN, key),

  /**
   * Saves a credential to the OS keychain.
   * @param {string} key
   * @param {string} value
   * @returns {Promise<void>}
   */
  setSecureToken: (key, value) => ipcRenderer.invoke(IPC.SET_SECURE_TOKEN, key, value),

  /**
   * Deletes a credential from the OS keychain.
   * @param {string} key
   * @returns {Promise<void>}
   */
  clearSecureToken: (key) => ipcRenderer.invoke(IPC.CLEAR_SECURE_TOKEN, key),

  /**
   * Opens a URL in the system's default browser (not inside Electron).
   * Used for Teams/Outlook links (Phase 2).
   * @param {string} url
   */
  openExternalLink: (url) => shell.openExternal(url),

  /**
   * Subscribe to deep-link navigation events (qems:// protocol links).
   * Used when a Teams/Outlook notification link opens the app (Phase 2).
   * @param {(errorId: string) => void} callback
   */
  onDeepLink: (callback) => {
    ipcRenderer.on(IPC.DEEP_LINK_NAVIGATE, (_event, errorId) => callback(errorId));
    // Return a cleanup function so React can call it on unmount
    return () => ipcRenderer.removeAllListeners(IPC.DEEP_LINK_NAVIGATE);
  },
});
