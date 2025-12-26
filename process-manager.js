const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ProcessManager {
    constructor() {
        this.processes = new Map();
        this.isDashboardMode = process.env.DASHBOARD_MODE === 'true';
        this.isElectron = process.env.ELECTRON_IS_DEV === '1' || process.versions.electron;
    }

    async isPortInUse(port) {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(port, () => {
                server.once('close', () => resolve(false));
                server.close();
            });
            server.on('error', () => resolve(true));
        });
    }

    async findAvailablePort(startPort, maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            const port = startPort + i;
            if (!(await this.isPortInUse(port))) {
                return port;
            }
        }
        throw new Error(`No available port found starting from ${startPort}`);
    }

    async killProcessOnPort(port) {
        try {
            if (process.platform === 'win32') {
                // Windows
                const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
                const lines = stdout.split('\n').filter(line => line.includes(`${port}`));
                
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && !isNaN(parseInt(pid))) {
                        try {
                            await execAsync(`taskkill /F /PID ${pid}`);
                            console.log(`[ProcessManager] Killed process ${pid} on port ${port}`);
                        } catch (error) {
                            console.log(`[ProcessManager] Process ${pid} already terminated`);
                        }
                    }
                }
            } else {
                // Unix/Linux/macOS
                const { stdout } = await execAsync(`lsof -ti:${port}`);
                const pids = stdout.trim().split('\n').filter(pid => pid);
                
                for (const pid of pids) {
                    try {
                        await execAsync(`kill -9 ${pid}`);
                        console.log(`[ProcessManager] Killed process ${pid} on port ${port}`);
                    } catch (error) {
                        console.log(`[ProcessManager] Process ${pid} already terminated`);
                    }
                }
            }
        } catch (error) {
            console.log(`[ProcessManager] No processes found on port ${port}`);
        }
    }

    async startApp(appName, command, cwd, port) {
        if (this.processes.has(appName)) {
            console.log(`[ProcessManager] ${appName} already running`);
            return;
        }

        // Clean up any existing process on this port
        await this.killProcessOnPort(port);
        
        // Find available port if the requested one is in use
        let actualPort = port;
        if (await this.isPortInUse(port)) {
            console.log(`[ProcessManager] Port ${port} is in use, finding alternative...`);
            actualPort = await this.findAvailablePort(port);
            console.log(`[ProcessManager] Using port ${actualPort} instead of ${port}`);
        }

        // Only set PORT env var for Next.js, use GENKIT_PORT for Genkit
        const env = { ...process.env };
        if (appName === 'genkit') {
            env.GENKIT_PORT = actualPort;
            // Remove PORT to prevent conflict with Next.js
            delete env.PORT;
        } else {
            env.PORT = actualPort;
        }
        
        const spawnOptions = { 
            cwd, 
            env,
            stdio: this.isDashboardMode ? 'pipe' : 'inherit',
            shell: true  // Use shell to properly resolve .cmd files on Windows
        };
        
        // Hide console windows in Electron
        if (this.isElectron && process.platform === 'win32') {
            spawnOptions.windowsHide = true;
        }
        
        const proc = spawn('npm', ['run', command], spawnOptions);

        proc.stdout?.on('data', (data) => {
            console.log(`[${appName}] ${data.toString().trim()}`);
        });

        proc.stderr?.on('data', (data) => {
            console.error(`[${appName}] ${data.toString().trim()}`);
        });

        proc.on('error', (error) => {
            console.error(`[ProcessManager] ${appName} error:`, error);
        });

        proc.on('exit', (code, signal) => {
            console.log(`[ProcessManager] ${appName} exited with code ${code}, signal ${signal}`);
            this.processes.delete(appName);
        });

        this.processes.set(appName, { proc, port: actualPort });
        console.log(`[ProcessManager] Started ${appName} on port ${actualPort}`);
        return actualPort;
    }

    async stopApp(appName) {
        const app = this.processes.get(appName);
        if (app) {
            // Kill the process
            app.proc.kill('SIGTERM');
            
            // Wait a bit, then force kill if still running
            setTimeout(() => {
                if (!app.proc.killed) {
                    app.proc.kill('SIGKILL');
                }
            }, 5000);
            
            // Clean up the port
            await this.killProcessOnPort(app.port);
            
            this.processes.delete(appName);
            console.log(`[ProcessManager] Stopped ${appName}`);
        }
    }

    async stopAll() {
        const stopPromises = [];
        for (const [name] of this.processes) {
            stopPromises.push(this.stopApp(name));
        }
        await Promise.all(stopPromises);
    }
}

module.exports = ProcessManager;