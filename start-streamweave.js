const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🌊 Starting StreamWeave...');

// Check dependencies
const hasNext = fs.existsSync(path.join(__dirname, 'node_modules', 'next'));
const hasGenkit = fs.existsSync(path.join(__dirname, 'node_modules', 'genkit'));

if (!hasNext || !hasGenkit) {
  console.log('📦 Installing StreamWeave dependencies...');
  const install = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
  
  install.on('exit', (code) => {
    if (code === 0) {
      console.log('✅ Dependencies installed, starting StreamWeave...');
      startStreamWeave();
    } else {
      console.error('❌ Dependency install failed, trying npm fallback...');
      fallbackStart();
    }
  });
} else {
  startStreamWeave();
}

function startStreamWeave() {
  try {
    // Start Space Mountain client
    const smClient = spawn('node', ['scripts/space-mountain-client.js'], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    // Start Genkit dev server
    const genkitServer = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['genkit', 'start', '--', 'npm', 'run', 'dev:next'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    // Start WebSocket server
    const wsServer = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev:ws'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    const shutdown = () => {
      console.log('\n🛑 Shutting down StreamWeave...');
      smClient.kill();
      genkitServer.kill();
      wsServer.kill();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ StreamWeave startup script failed:', error.message);
    fallbackStart();
  }
}

function fallbackStart() {
  console.log('⚠️  Using npm fallback for StreamWeave...');
  const fallback = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
  
  fallback.on('exit', (code) => {
    console.log(`StreamWeave fallback exited with code ${code}`);
  });
}