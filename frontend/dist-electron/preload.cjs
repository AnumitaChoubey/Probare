// electron/preload.ts
var { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("qems", {
  files: {
    open: (options) => ipcRenderer.invoke("qems:files:open", options),
    save: (options) => ipcRenderer.invoke("qems:files:save", options)
  },
  clipboard: {
    readImage: () => ipcRenderer.invoke("qems:clipboard:readImage")
  },
  notifications: {
    show: (title, body) => ipcRenderer.invoke("qems:notifications:show", title, body)
  },
  window: {
    minimize: () => ipcRenderer.invoke("qems:window:minimize"),
    maximize: () => ipcRenderer.invoke("qems:window:maximize"),
    close: () => ipcRenderer.invoke("qems:window:close")
  }
});
