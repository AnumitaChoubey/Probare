const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('qems', {
  db: {
    getErrors: (filters: any) => ipcRenderer.invoke('qems:db:getErrors', filters),
    createError: (errorData: any, localId: string, idempotencyKey: string) => ipcRenderer.invoke('qems:db:createError', errorData, localId, idempotencyKey),
    updateError: (localId: string, errorData: any, idempotencyKey: string) => ipcRenderer.invoke('qems:db:updateError', localId, errorData, idempotencyKey)
  },
  auth: {
    saveSession: (sessionData: any) => ipcRenderer.invoke('qems:auth:saveSession', sessionData),
    getSession: () => ipcRenderer.invoke('qems:auth:getSession'),
    clearSession: () => ipcRenderer.invoke('qems:auth:clearSession')
  },
  files: {
    open: (options: any) => ipcRenderer.invoke('qems:files:open', options),
    save: (options: any) => ipcRenderer.invoke('qems:files:save', options)
  },
  clipboard: {
    readImage: () => ipcRenderer.invoke('qems:clipboard:readImage')
  },
  notifications: {
    show: (title: string, body: string) => ipcRenderer.invoke('qems:notifications:show', title, body)
  },
  window: {
    minimize: () => ipcRenderer.invoke('qems:window:minimize'),
    maximize: () => ipcRenderer.invoke('qems:window:maximize'),
    close: () => ipcRenderer.invoke('qems:window:close')
  }
});
