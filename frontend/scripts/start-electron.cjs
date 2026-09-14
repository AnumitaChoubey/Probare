// scripts/start-electron.cjs
// Cross-platform helper: waits for the Vite dev server to be ready,
// then spawns Electron. Works on Windows, macOS, and Linux.
const { execSync, spawn } = require('child_process');
const http = require('http');

const VITE_URL = 'http://localhost:5173';
const MAX_WAIT_MS = 30000;
const POLL_MS = 300;

function checkServer(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
    }).on('error', () => resolve(false));
  });
}

async function waitForVite() {
  const start = Date.now();
  console.log(`[start-electron] Waiting for Vite at ${VITE_URL}...`);
  while (Date.now() - start < MAX_WAIT_MS) {
    if (await checkServer(VITE_URL)) {
      console.log('[start-electron] Vite is ready! Launching Electron...');
      return true;
    }
    await new Promise(r => setTimeout(r, POLL_MS));
  }
  console.error('[start-electron] Timed out waiting for Vite.');
  process.exit(1);
}

waitForVite().then(() => {
  // Use the `electron` package's own resolved binary path
  const electronPath = require('electron');
  const child = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    cwd: require('path').join(__dirname, '..'),
    shell: false,
  });
  child.on('close', (code) => process.exit(code));
});
