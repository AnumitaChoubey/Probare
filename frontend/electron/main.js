// electron/main.js
// Electron Main Process — entry point for the QEMS desktop app.
// Phase 0: Electron shell only. Points to the existing central API on Render.
// Phase 1 will add: spawning the local PyInstaller backend binary.

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let keytar;
try {
  keytar = require('keytar');
} catch (e) {
  // keytar may not be available in dev without native rebuild — fail gracefully
  console.warn('[main] keytar not available, secure token storage will be disabled:', e.message);
  keytar = null;
}

const { IPC } = require('./ipcChannels');

const KEYTAR_SERVICE = 'QEMS';
const MIN_WIDTH = 1024;
const MIN_HEIGHT = 768;
const DEFAULT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;

let mainWindow = null;

// ── Window Creation ──────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: 'QEMS — Quality Error Management System',
    // Security: contextIsolation ON, nodeIntegration OFF (master plan Section 9)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // must be false to allow preload to use require()
    },
    show: false, // don't show until ready-to-show to avoid white flash
  });

  // Load the app
  if (isDev) {
    // Development: load the Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production: load the built Vite output
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Show window only when fully rendered (avoids white flash on launch)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();

  // macOS: re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS — standard convention)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ── Deep Link Handler (Phase 2: qems:// protocol) ────────────────────────────
// Registered for the custom protocol so Teams/Outlook notification links
// can open the app and navigate to a specific error.

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('qems', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('qems');
}

// Windows: deep link arrives as a second instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Someone tried to run a second instance — focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // Parse the deep link from the command line args
    const deepLink = commandLine.find(arg => arg.startsWith('qems://'));
    if (deepLink && mainWindow) {
      const errorId = deepLink.replace('qems://errors/', '');
      mainWindow.webContents.send(IPC.DEEP_LINK_NAVIGATE, errorId);
    }
  });
}

// macOS: deep link arrives via open-url event
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow && url.startsWith('qems://errors/')) {
    const errorId = url.replace('qems://errors/', '');
    mainWindow.webContents.send(IPC.DEEP_LINK_NAVIGATE, errorId);
  }
});

// ── IPC Handlers ─────────────────────────────────────────────────────────────

// Return the app version to the renderer
ipcMain.handle(IPC.GET_APP_VERSION, () => {
  return app.getVersion();
});

// Keytar: read a credential from the OS keychain
ipcMain.handle(IPC.GET_SECURE_TOKEN, async (_event, key) => {
  if (!keytar) return null;
  try {
    return await keytar.getPassword(KEYTAR_SERVICE, key);
  } catch (e) {
    console.error('[main] keytar.getPassword failed:', e.message);
    return null;
  }
});

// Keytar: save a credential to the OS keychain
ipcMain.handle(IPC.SET_SECURE_TOKEN, async (_event, key, value) => {
  if (!keytar) return;
  try {
    await keytar.setPassword(KEYTAR_SERVICE, key, value);
  } catch (e) {
    console.error('[main] keytar.setPassword failed:', e.message);
  }
});

// Keytar: delete a credential from the OS keychain
ipcMain.handle(IPC.CLEAR_SECURE_TOKEN, async (_event, key) => {
  if (!keytar) return;
  try {
    await keytar.deletePassword(KEYTAR_SERVICE, key);
  } catch (e) {
    console.error('[main] keytar.deletePassword failed:', e.message);
  }
});
