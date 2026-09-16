// electron/ipcChannels.js
// Shared IPC channel name constants — import in both main.js and preload.js
// to avoid hard-coded strings that cause silent bugs when they drift.

const IPC = {
  GET_APP_VERSION:    'GET_APP_VERSION',
  GET_SECURE_TOKEN:   'GET_SECURE_TOKEN',
  SET_SECURE_TOKEN:   'SET_SECURE_TOKEN',
  CLEAR_SECURE_TOKEN: 'CLEAR_SECURE_TOKEN',
  OPEN_EXTERNAL_LINK: 'OPEN_EXTERNAL_LINK',
  DEEP_LINK_NAVIGATE: 'DEEP_LINK_NAVIGATE',
  SHOW_NOTIFICATION:  'SHOW_NOTIFICATION',
  UPLOAD_EVIDENCE:    'UPLOAD_EVIDENCE',
};

module.exports = { IPC };
