// electron/main.ts
var { app, BrowserWindow, ipcMain, dialog, clipboard, Notification } = require("electron");
var path = require("path");
var fs = require("fs");
var isDev = !app.isPackaged;
var mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
      // Ensure preload is compiled next to main.js
      sandbox: true
    }
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
ipcMain.handle("qems:files:open", async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    ...options
  });
  if (!result.canceled) {
    return result.filePaths;
  }
  return void 0;
});
ipcMain.handle("qems:files:save", async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  if (!result.canceled) {
    return result.filePath;
  }
  return void 0;
});
ipcMain.handle("qems:clipboard:readImage", () => {
  const image = clipboard.readImage();
  if (image && !image.isEmpty()) {
    return image.toDataURL();
  }
  return void 0;
});
ipcMain.handle("qems:notifications:show", (event, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});
ipcMain.handle("qems:window:minimize", () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.handle("qems:window:maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  }
});
ipcMain.handle("qems:window:close", () => {
  if (mainWindow) mainWindow.close();
});
