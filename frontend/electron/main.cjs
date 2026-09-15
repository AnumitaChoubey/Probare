// electron/main.cjs
// Electron Main Process — entry point for the QEMS desktop app.
// Electron Shell only — connects to the existing central API on Render.
// Phase 1 will add: spawning the local PyInstaller backend binary.

'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const backendManager = require('./backendManager.cjs');

// ── Single Instance Lock — must happen BEFORE app.whenReady() ─────────────────
// Prevents a second Electron window from opening if the user double-clicks.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // Another instance is already running — quit immediately
  app.quit();
  process.exit(0);
}

// ── Keytar (optional — degrades gracefully if native module unavailable) ─────
let keytar = null;
try {
  keytar = require('keytar');
} catch (e) {
  console.warn('[QEMS] keytar not available — OS keychain disabled, using fallback:', e.message);
}

const { IPC } = require('./ipcChannels.cjs');

const KEYTAR_SERVICE = 'QEMS';
const MIN_WIDTH  = 1024;
const MIN_HEIGHT = 768;
const DEF_WIDTH  = 1440;
const DEF_HEIGHT = 900;

let mainWindow = null;

// ── Window Creation ───────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  DEF_WIDTH,
    height: DEF_HEIGHT,
    minWidth:  MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: 'QEMS — Quality Error Management System',
    // Security: contextIsolation ON, nodeIntegration OFF (master plan §9)
    webPreferences: {
      preload:          path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false, // required for preload require()
    },
    show: false, // show only when fully rendered (avoids white flash)
  });

  if (!app.isPackaged) {
    // Development — load the running Vite dev server
    mainWindow.loadURL('http://localhost:5173').catch(err => {
      console.error('[QEMS] Failed to load Vite dev server:', err.message);
    });
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production — load the built Vite output packaged alongside Electron
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Surface renderer-level load errors in the console
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[QEMS] Page load failed: ${desc} (${code}) — URL: ${url}`);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App Lifecycle ─────────────────────────────────────────────────────────────

const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

// Configure electron-log
log.transports.file.level = 'info';
autoUpdater.logger = log;

app.on('before-quit', () => {
  backendManager.stopBackend();
});

// ── Auto-Updater (Phase 4) ───────────────────────────────────────────────────
autoUpdater.on('checking-for-update', () => {
  log.info('[QEMS] Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  log.info('[QEMS] Update available.', info);
  // Optional: notify renderer process to show a badge
  if (mainWindow) mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  log.info('[QEMS] Update not available.', info);
});

autoUpdater.on('error', (err) => {
  log.error('[QEMS] Error in auto-updater.', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  log.info(`[QEMS] Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('[QEMS] Update downloaded.', info);
  // Optional: notify renderer process to prompt user to restart
  if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
});

app.whenReady().then(async () => {
  // Start local backend first
  await backendManager.startBackend();
  createWindow();

  // Focus existing window if a second instance tries to open (Windows deep link)
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const deepLink = commandLine.find(a => a.startsWith('qems://'));
    if (deepLink && mainWindow) {
      mainWindow.webContents.send(IPC.DEEP_LINK_NAVIGATE, deepLink.replace('qems://errors/', ''));
    }
  });

  // macOS: re-create window when dock icon clicked and no windows open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  
  if (app.isPackaged) {
    // Only check for updates in packaged apps
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// Quit on all windows closed (except macOS — standard convention)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Deep Link Protocol (Phase 2: qems:// — Teams/Outlook notification links) ──
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('qems', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('qems');
}

// macOS deep link arrives via open-url
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow && url.startsWith('qems://errors/')) {
    mainWindow.webContents.send(IPC.DEEP_LINK_NAVIGATE, url.replace('qems://errors/', ''));
  }
});

// ── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle(IPC.GET_APP_VERSION, () => app.getVersion());

ipcMain.handle(IPC.GET_SECURE_TOKEN, async (_e, key) => {
  if (!keytar) return null;
  try { return await keytar.getPassword(KEYTAR_SERVICE, key); }
  catch (e) { console.error('[QEMS] keytar.getPassword:', e.message); return null; }
});

ipcMain.handle(IPC.SET_SECURE_TOKEN, async (_e, key, val) => {
  if (!keytar) return;
  try { await keytar.setPassword(KEYTAR_SERVICE, key, val); }
  catch (e) { console.error('[QEMS] keytar.setPassword:', e.message); }
});

ipcMain.handle(IPC.CLEAR_SECURE_TOKEN, async (_e, key) => {
  if (!keytar) return;
  try { await keytar.deletePassword(KEYTAR_SERVICE, key); }
  catch (e) { console.error('[QEMS] keytar.deletePassword:', e.message); }
});
