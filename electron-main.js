const { app, BrowserWindow, Tray, Menu, shell } = require('electron');
const path = require('path');
const ProcessManager = require('./process-manager');
const { spawn } = require('child_process');

let tray = null;
let mainWindow = null;
let splashWindow = null;
let processManager = null;
let nextServer = null;
const isDev = process.env.ELECTRON_IS_DEV == '1' || process.env.ELECTRON_IS_DEV == 1;

// Hide console window on Windows
if (process.platform === 'win32' && !isDev) {
    const { spawn } = require('child_process');
    const originalSpawn = spawn;
    require('child_process').spawn = function(...args) {
        const options = args[2] || {};
        options.windowsHide = true;
        args[2] = options;
        return originalSpawn.apply(this, args);
    };
}

function createTray() {
    // Use StreamWeaver.png as tray icon
    const iconPath = path.join(__dirname, 'assets', 'StreamWeaver.png');
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Dashboard',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: 'Hide Dashboard',
            click: () => {
                if (mainWindow) mainWindow.hide();
            }
        },
        { type: 'separator' },
        {
            label: 'Open in Browser',
            click: () => shell.openExternal('http://localhost:3100/dashboard')
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.setToolTip('StreamWeave Dashboard');
}

function createSplashScreen() {
    splashWindow = new BrowserWindow({
        width: 240,
        height: 240,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        center: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Load the PNG directly as splash screen
    const imagePath = path.join(__dirname, 'public', 'StreamWeaver.png');
    const splashHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                }
                body {
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    overflow: hidden;
                }
                img {
                    width: 240px;
                    height: 240px;
                    animation: fadeIn 0.3s ease-in;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            </style>
        </head>
        <body>
            <img src="file://${imagePath.replace(/\\/g, '/')}" alt="StreamWeaver" />
        </body>
        </html>
    `;

    splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));
}

function createWindow() {
    // Create splash screen first
    createSplashScreen();

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        show: false,
        icon: path.join(__dirname, 'assets', 'app-icon.png')
    });

    mainWindow.loadURL('http://localhost:3100/dashboard');

    // When main window is ready, close splash and show main window
    mainWindow.webContents.on('did-finish-load', () => {
        // Wait minimum 3 seconds for nice splash screen experience
        setTimeout(() => {
            if (splashWindow) {
                splashWindow.close();
                splashWindow = null;
            }
            mainWindow.show();
            mainWindow.focus();
        }, 3000);
    });

    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

function startAllApps() {
    process.env.DASHBOARD_MODE = 'true';
    console.log('[Electron] ELECTRON_IS_DEV:', process.env.ELECTRON_IS_DEV);
    console.log('[Electron] isDev:', isDev);
    console.log('[Electron] Starting all apps in', isDev ? 'DEV' : 'PRODUCTION', 'mode');
    
    if (isDev) {
        // In dev mode, use process manager
        processManager = new ProcessManager();
        const config = require('./dashboard-config.json');
        console.log('[Electron] Loading config:', config);
        config.apps.forEach(app => {
            console.log('[Electron] Starting app:', app.name);
            processManager.startApp(app.name, app.command, app.cwd, app.port);
        });
    } else {
        // In production, start Next.js server with built files
        // Use npx to properly resolve the next command on Windows
        nextServer = spawn('npx', ['next', 'start', '-p', '3100'], {
            cwd: __dirname,
            env: { ...process.env, PORT: '3100' },
            windowsHide: true,
            shell: true
        });

        nextServer.stdout.on('data', (data) => {
            console.log(`Next.js: ${data}`);
        });

        nextServer.stderr.on('data', (data) => {
            console.error(`Next.js Error: ${data}`);
        });

        nextServer.on('error', (error) => {
            console.error('Failed to start Next.js server:', error);
    if (nextServer) {
        nextServer.kill();
    }
        });
    }
}

app.whenReady().then(() => {
    createTray();
    startAllApps();
    
    // Wait for apps to start, then create window
    // In production, wait longer for Next.js to start
    // Increased dev wait time to 6s to give Next.js time to fully start
    const waitTime = isDev ? 6000 : 5000;
    setTimeout(() => {
        createWindow();
        if (isDev) mainWindow.show();
    }, waitTime);
});

app.on('window-all-closed', () => {
    // Keep app running in system tray
});

app.on('before-quit', () => {
    if (processManager) {
        processManager.stopAll();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    } else {
        mainWindow.show();
    }
});
