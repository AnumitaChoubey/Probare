const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('qems', {
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
