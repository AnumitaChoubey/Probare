const { app, BrowserWindow, ipcMain, dialog, clipboard, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'), // Ensure preload is compiled next to main.js
      sandbox: true,
    }
  });

  if (isDev) {
    // If you start Vite dev server on a different port, change this
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Serve the dist directory via a local express server to avoid file:// protocol issues
    // which break Clerk Auth and React Router
    const express = require('express');
    const http = require('http');
    const expressApp = express();
    
    expressApp.use(express.static(path.join(__dirname, '../dist')));
    
    // For single page applications, fallback to index.html for unknown routes
    expressApp.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
    
    const server = http.createServer(expressApp);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log(`Local server started on port ${port}`);
      mainWindow.loadURL(`http://127.0.0.1:${port}`);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

import { initSchema, getQualityErrors, createQualityError, updateQualityError } from './database.js';
import { saveOfflineSession, getOfflineSession, clearOfflineSession } from './auth.js';

app.whenReady().then(() => {
  initSchema();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

ipcMain.handle('qems:db:getErrors', (event, filters) => {
  return getQualityErrors(filters);
});

ipcMain.handle('qems:db:createError', (event, errorData, localId, idempotencyKey) => {
  return createQualityError(errorData, localId, idempotencyKey);
});

ipcMain.handle('qems:db:updateError', (event, localId, errorData, idempotencyKey) => {
  return updateQualityError(localId, errorData, idempotencyKey);
});

ipcMain.handle('qems:auth:saveSession', (event, sessionData) => {
  saveOfflineSession(sessionData);
  return true;
});

ipcMain.handle('qems:auth:getSession', (event) => {
  return getOfflineSession();
});

ipcMain.handle('qems:auth:clearSession', (event) => {
  clearOfflineSession();
  return true;
});

ipcMain.handle('qems:files:open', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    ...options
  });
  if (!result.canceled) {
    return result.filePaths;
  }
  return undefined;
});

ipcMain.handle('qems:files:save', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  if (!result.canceled) {
    return result.filePath;
  }
  return undefined;
});

ipcMain.handle('qems:clipboard:readImage', () => {
  const image = clipboard.readImage();
  if (image && !image.isEmpty()) {
    return image.toDataURL();
  }
  return undefined;
});

ipcMain.handle('qems:notifications:show', (event, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

ipcMain.handle('qems:window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('qems:window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('qems:window:close', () => {
  if (mainWindow) mainWindow.close();
});
