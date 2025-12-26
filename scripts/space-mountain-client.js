const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SWITCHBOARD_URL = process.env.SPACE_MOUNTAIN_SWITCHBOARD || 'ws://localhost:6068';
const APP_NAME = process.env.SPACE_MOUNTAIN_APP || 'streamweave';
const APP_PORT = Number(process.env.NEXT_PUBLIC_STREAMWEAVE_PORT || process.env.PORT || 3100);
const APP_ROLE = process.env.SPACE_MOUNTAIN_ROLE || 'primary';
const SETTINGS_FILE = path.resolve(__dirname, '..', 'src', 'data', 'discord-channels.json');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function isSpaceMountainEnabled() {
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(data);
    return settings.spaceMountainEnabled !== false;
  } catch (error) {
    return true; // Default enabled if file doesn't exist
  }
}

const probeApp = () => new Promise((resolve, reject) => {
  const req = http.get(
    {
      host: '127.0.0.1',
      port: APP_PORT,
      path: '/dashboard',
      timeout: 3000
    },
    (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode && res.statusCode < 500));
    }
  );
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.on('error', reject);
});

const waitForAppReady = async () => {
  const maxAttempts = Number(process.env.STREAMWEAVE_READY_ATTEMPTS || 30);
  const delay = Number(process.env.STREAMWEAVE_READY_DELAY_MS || 2000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ok = await probeApp();
      if (ok) {
        console.log(`[Space Mountain] StreamWeave HTTP ready on port ${APP_PORT}`);
        return;
      }
    } catch {
      // ignore and retry
    }
    console.log(`[Space Mountain] Waiting for StreamWeave (${attempt}/${maxAttempts})...`);
    await wait(delay);
  }

  console.warn('[Space Mountain] StreamWeave did not confirm readiness; proceeding with registration.');
};

function register(ws) {
  try {
    ws.send(JSON.stringify({
      type: 'REGISTER_APP',
      payload: { appName: APP_NAME, appPort: APP_PORT, role: APP_ROLE }
    }));
    ws.send(JSON.stringify({
      type: 'ROUTE_MESSAGE',
      targetApp: 'apollo-station',
      payload: {
        type: 'app-register',
        payload: { name: APP_NAME, port: APP_PORT, status: 'running' }
      }
    }));
  } catch (error) {
    console.error('[Space Mountain] Failed to register streamweave:', error);
  }
}

function connect() {
  if (!isSpaceMountainEnabled()) {
    console.log('[Space Mountain] Disabled in settings, exiting');
    return;
  }

  const ws = new WebSocket(SWITCHBOARD_URL);

  ws.on('open', async () => {
    console.log(`[Space Mountain] Docking ${APP_NAME} on port ${APP_PORT}`);
    await waitForAppReady().catch(() => {
      console.warn('[Space Mountain] Continuing without readiness confirmation.');
    });
    register(ws);
  });



  ws.on('close', () => {
    console.log('[Space Mountain] StreamWeave link closed. Retrying in 3s...');
    setTimeout(connect, 3000);
  });

  ws.on('error', (error) => {
    console.error('[Space Mountain] StreamWeave link error:', error.message);
    ws.close();
  });
}

connect();
