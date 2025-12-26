# StreamWeave Multi-App Dashboard Architecture

## Core Files Created/Modified

### 1. Process Management
- `process-manager.js` - Manages multiple Node.js processes
- `dashboard-launcher.js` - Launches all apps in dashboard mode
- `dashboard-config.json` - Configuration for all apps and ports

### 2. Electron Integration
- `electron-main.js` - Main Electron process with system tray
- `assets/` - Directory for app icons (tray-icon.png, app-icon.png)

### 3. WebSocket Extensions
- `server.ts` - Extended with app management message types
- Added process manager integration
- Added app start/stop/status WebSocket handlers

### 4. Next.js Configuration
- `next.config.ts` - Updated with iframe-friendly headers
- `package.json` - Added Electron scripts and dependencies

### 5. UI Components
- `chat-client.tsx` - Fixed CSS warnings, removed inline styles
- `chat-client.module.css` - External CSS for dynamic username colors

## WebSocket Message Protocol

### Existing Messages
- `twitch-message` - Chat messages from Twitch
- `twitch-status` - Connection status updates
- `twitch-badges` - Badge cache updates
- `send-twitch-message` - Send message to Twitch
- `update-bot-settings` - Update bot personality/voice

### New App Management Messages
- `start-app` - Start a new application
- `stop-app` - Stop a running application  
- `get-app-status` - Get status of all apps
- `app-started` - Confirmation app started
- `app-stopped` - Confirmation app stopped
- `app-status` - Current status of all apps

## Environment Variables

### Dashboard Mode
- `DASHBOARD_MODE=true` - Enables multi-app process management
- `ELECTRON_IS_DEV=1` - Development mode for Electron

### Port Configuration
- WebSocket Server: 8090 (shared by all apps)
- StreamWeave App: 3100 (configurable via dashboard-config.json)
- Other Apps: Defined in dashboard-config.json

## Key Features

### 1. Hidden Console Windows
- Windows: Uses `windowsHide: true` in spawn options
- All command windows are hidden from taskbar/desktop
- Only system tray icon visible

### 2. System Tray Integration
- Right-click menu with Show/Hide Dashboard
- Open in Browser option
- Quit option that properly shuts down all processes

### 3. Iframe-Friendly Configuration
- Headers configured to allow iframe embedding
- `X-Frame-Options: ALLOWALL`
- `Content-Security-Policy: frame-ancestors *`

### 4. Process Lifecycle Management
- Graceful startup of all apps
- Proper shutdown handling
- Process monitoring and restart capabilities

## Usage Patterns

### Development Mode
```bash
npm run app:start  # Electron with visible window + dev tools
```

### Production Mode  
```bash
npm run electron   # Hidden, system tray only
```

### Individual App Development
```bash
npm run dev        # Normal Next.js development
```

### Dashboard Mode (No Electron)
```bash
npm run dev:dashboard  # All apps in dashboard mode
```
