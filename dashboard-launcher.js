const ProcessManager = require('./process-manager');
const config = require('./dashboard-config.json');

const processManager = new ProcessManager();

// Set dashboard mode
process.env.DASHBOARD_MODE = 'true';

// Start all configured apps
config.apps.forEach(app => {
    processManager.startApp(app.name, app.command, app.cwd, app.port);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[Dashboard] Shutting down all apps...');
    processManager.stopAll();
    process.exit(0);
});

console.log('[Dashboard] All apps started. Press Ctrl+C to stop.');