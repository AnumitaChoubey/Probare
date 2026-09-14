const { spawn } = require('child_process');
const path = require('path');
const { app, dialog } = require('electron');
const http = require('http');

let backendProcess = null;

function waitForBackend(port, timeoutMs = 15000, pollIntervalMs = 250) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function poll() {
      if (Date.now() - startTime > timeoutMs) {
        return reject(new Error('Backend failed to start within timeout period.'));
      }

      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        if (res.statusCode === 200) {
          return resolve();
        }
        setTimeout(poll, pollIntervalMs);
      });

      req.on('error', () => {
        setTimeout(poll, pollIntervalMs);
      });

      req.end();
    }

    poll();
  });
}

async function startBackend() {
  const port = '8765';
  
  // Resolve path differently based on dev vs production
  const isDev = !app.isPackaged;
  const dbPath = path.join(app.getPath('userData'), 'qems_local.db');
  
  let executablePath;
  if (isDev) {
    executablePath = path.join(__dirname, '..', '..', 'backend', 'dist', 'qems-backend.exe');
  } else {
    executablePath = path.join(process.resourcesPath, 'backend', 'qems-backend.exe');
  }

  console.log(`[BackendManager] Starting backend from: ${executablePath}`);
  console.log(`[BackendManager] Database path: ${dbPath}`);

  try {
    backendProcess = spawn(executablePath, ['--port', port, '--db-path', dbPath]);

    backendProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend ERR] ${data.toString().trim()}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`[BackendManager] Backend process exited with code ${code}`);
      backendProcess = null;
    });

    // Wait for it to be healthy
    await waitForBackend(port);
    console.log('[BackendManager] Backend is ready!');
  } catch (error) {
    console.error(`[BackendManager] Failed to start backend:`, error);
    dialog.showErrorBox(
      'Backend Failed to Start',
      'The QEMS local service could not be started. Please restart the application or contact support.'
    );
    app.quit();
  }
}

function stopBackend() {
  if (backendProcess) {
    console.log('[BackendManager] Stopping backend process...');
    backendProcess.kill('SIGTERM');
    
    // Fallback force kill
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.warn('[BackendManager] Force killing backend process...');
        backendProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

module.exports = {
  startBackend,
  stopBackend
};
