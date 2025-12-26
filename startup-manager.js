#!/usr/bin/env node

const { spawn } = require('child_process');
const net = require('net');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

class StartupManager {
    constructor() {
        this.services = [
            { name: 'next', command: 'dev:next', defaultPort: 3100, envVar: 'PORT' },
            { name: 'websocket', command: 'dev:ws', defaultPort: 8090, envVar: 'WS_PORT' },
            { name: 'genkit', command: 'genkit:watch', defaultPort: 4000, envVar: 'GENKIT_PORT' }
        ];
        this.processes = new Map();
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
                const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
                if (!stdout.trim()) {
                    return; // Port not in use
                }
                
                const lines = stdout.split('\n').filter(line => line.includes(`${port}`));
                
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && !isNaN(parseInt(pid)) && parseInt(pid) !== process.pid) {
                        try {
                            await execAsync(`taskkill /F /PID ${pid}`);
                            console.log(`[Startup] Killed process ${pid} on port ${port}`);
                        } catch (error) {
                            // Process already terminated
                        }
                    }
                }
            } else {
                const { stdout } = await execAsync(`lsof -ti:${port}`);
                const pids = stdout.trim().split('\n').filter(pid => pid && parseInt(pid) !== process.pid);
                
                for (const pid of pids) {
                    try {
                        await execAsync(`kill -9 ${pid}`);
                        console.log(`[Startup] Killed process ${pid} on port ${port}`);
                    } catch (error) {
                        // Process already terminated
                    }
                }
            }
        } catch (error) {
            // No processes found on port
        }
    }

    async cleanupAllPorts() {
        console.log('[Startup] Cleaning up existing processes...');
        
        // Only clean up specific ports if they're actually in use
        console.log('[Startup] Checking service ports...');
        for (const service of this.services) {
            if (await this.isPortInUse(service.defaultPort)) {
                console.log(`[Startup] Port ${service.defaultPort} is in use, cleaning up...`);
                await this.killProcessOnPort(service.defaultPort);
            } else {
                console.log(`[Startup] Port ${service.defaultPort} is available`);
            }
        }

        // Wait for ports to be released
        console.log('[Startup] Waiting for ports to be released...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('[Startup] Port cleanup completed');
    }

    async startService(service) {
        console.log(`[Startup] Starting ${service.name}...`);
        
        // Find available port
        let port = service.defaultPort;
        if (await this.isPortInUse(port)) {
            port = await this.findAvailablePort(port);
            console.log(`[Startup] ${service.name} using port ${port} instead of ${service.defaultPort}`);
        }

        // Set environment variables
        const env = { ...process.env };
        env[service.envVar] = port.toString();
        
        // Special handling for Next.js
        if (service.name === 'next') {
            env.NEXT_PUBLIC_STREAMWEAVE_PORT = port.toString();
        }

        console.log(`[Startup] Executing: npm run ${service.command}`);
        console.log(`[Startup] Environment: ${service.envVar}=${port}`);

        const proc = spawn('npm', ['run', service.command], {
            env,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
            cwd: process.cwd()
        });

        // Capture and log stdout
        proc.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.log(`[${service.name}] ${output}`);
            }
        });

        // Capture and log stderr
        proc.stderr.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.error(`[${service.name}] ${output}`);
            }
        });

        proc.on('error', (error) => {
            console.error(`[Startup] ${service.name} spawn error:`, error);
        });

        proc.on('exit', (code, signal) => {
            console.log(`[Startup] ${service.name} exited with code ${code}, signal ${signal}`);
            this.processes.delete(service.name);
            
            // If service exits immediately, it's likely an error
            if (code !== 0 && code !== null) {
                console.error(`[Startup] ${service.name} failed to start (exit code: ${code})`);
            }
        });

        this.processes.set(service.name, { proc, port });
        console.log(`[Startup] ${service.name} process started on port ${port}`);
        
        // Wait a moment to see if the process starts successfully
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!this.processes.has(service.name)) {
            throw new Error(`${service.name} failed to start - process exited immediately`);
        }
        
        return port;
    }

    async start() {
        try {
            console.log('[Startup] StreamWeaver startup initiated...');
            
            // Clean up existing processes
            await this.cleanupAllPorts();
            
            // Start services sequentially to avoid port conflicts
            for (const service of this.services) {
                try {
                    console.log(`[Startup] Attempting to start ${service.name}...`);
                    await this.startService(service);
                    console.log(`[Startup] ${service.name} started successfully`);
                } catch (error) {
                    console.error(`[Startup] Failed to start ${service.name}:`, error.message);
                    // Continue with other services instead of failing completely
                }
                // Small delay between services
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const runningServices = Array.from(this.processes.keys());
            if (runningServices.length > 0) {
                console.log('[Startup] Services started successfully:');
                for (const [name, info] of this.processes) {
                    console.log(`  - ${name}: http://localhost:${info.port}`);
                }
            } else {
                console.error('[Startup] No services started successfully!');
                console.log('[Startup] This might be due to missing dependencies or configuration issues.');
                console.log('[Startup] Try running: npm install');
            }
            
        } catch (error) {
            console.error('[Startup] Failed to start services:', error);
            await this.shutdown();
            process.exit(1);
        }
    }

    async shutdown() {
        console.log('[Startup] Shutting down all services...');
        
        for (const [name, info] of this.processes) {
            try {
                info.proc.kill('SIGTERM');
                await this.killProcessOnPort(info.port);
            } catch (error) {
                console.error(`[Startup] Error stopping ${name}:`, error);
            }
        }
        
        this.processes.clear();
        console.log('[Startup] Shutdown complete');
    }
}

// Handle graceful shutdown
const startupManager = new StartupManager();

process.on('SIGINT', async () => {
    console.log('\n[Startup] Received SIGINT, shutting down...');
    await startupManager.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n[Startup] Received SIGTERM, shutting down...');
    await startupManager.shutdown();
    process.exit(0);
});

// Start the application
if (require.main === module) {
    console.log('[Startup] Node.js version:', process.version);
    console.log('[Startup] Platform:', process.platform);
    console.log('[Startup] Working directory:', process.cwd());
    startupManager.start().catch(console.error);
}

module.exports = StartupManager;