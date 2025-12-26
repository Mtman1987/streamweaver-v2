# Setup Guide for Additional Apps in Dashboard System

## Requirements for Each New App

### 1. WebSocket Client Integration

Every app must include a WebSocket client that connects to `ws://localhost:8090`:

```typescript
// websocket-client.ts
export class DashboardWebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectInterval: number = 5000;

    connect() {
        this.ws = new WebSocket('ws://localhost:8090');
        
        this.ws.onopen = () => {
            console.log('[WebSocket] Connected to dashboard');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.ws.onclose = () => {
            console.log('[WebSocket] Disconnected, reconnecting...');
            setTimeout(() => this.connect(), this.reconnectInterval);
        };
    }

    private handleMessage(data: any) {
        // Handle messages specific to your app
        // All apps receive twitch-message, twitch-status, etc.
    }

    send(message: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}
```

### 2. Next.js Configuration

Each app needs iframe-friendly headers in `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
```

### 3. Package.json Scripts

Add these scripts to each app's package.json:

```json
{
  "scripts": {
    "dev": "next dev -p [PORT] -H 0.0.0.0",
    "dev:dashboard": "DASHBOARD_MODE=true next dev -p [PORT] -H 0.0.0.0",
    "build": "next build",
    "start": "next start -p [PORT]"
  }
}
```

### 4. Dashboard Registration

Add your app to the main dashboard's `dashboard-config.json`:

```json
{
  "apps": [
    {
      "name": "streamweave",
      "title": "StreamWeave Chat",
      "command": "dev:dashboard",
      "cwd": ".",
      "port": 3000,
      "path": "/dashboard"
    },
    {
      "name": "your-new-app",
      "title": "Your App Title",
      "command": "dev:dashboard", 
      "cwd": "../path-to-your-app",
      "port": 3001,
      "path": "/main"
    }
  ]
}
```

## Dashboard App Requirements

The main dashboard app needs these components:

### 1. App Manager Component

```typescript
// components/AppManager.tsx
import { useEffect, useState } from 'react';

interface App {
  name: string;
  title: string;
  port: number;
  path: string;
  status: 'running' | 'stopped' | 'starting';
}

export function AppManager() {
  const [apps, setApps] = useState<App[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8090');
    
    websocket.onopen = () => {
      // Request current app status
      websocket.send(JSON.stringify({ type: 'get-app-status', payload: {} }));
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'app-status') {
        setApps(data.payload.apps);
      }
    };

    setWs(websocket);
    return () => websocket.close();
  }, []);

  const startApp = (name: string, command: string, cwd: string, port: number) => {
    ws?.send(JSON.stringify({
      type: 'start-app',
      payload: { name, command, cwd, port }
    }));
  };

  const stopApp = (name: string) => {
    ws?.send(JSON.stringify({
      type: 'stop-app',
      payload: { name }
    }));
  };

  return (
    <div className="app-manager">
      {apps.map(app => (
        <div key={app.name} className="app-card">
          <h3>{app.title}</h3>
          <p>Status: {app.status}</p>
          <iframe 
            src={`http://localhost:${app.port}${app.path}`}
            width="100%" 
            height="600px"
            frameBorder="0"
          />
        </div>
      ))}
    </div>
  );
}
```

### 2. Dashboard Layout

```typescript
// app/dashboard/page.tsx
import { AppManager } from '@/components/AppManager';

export default function DashboardPage() {
  return (
    <div className="dashboard-container">
      <header>
        <h1>StreamWeave Dashboard</h1>
      </header>
      <main>
        <AppManager />
      </main>
    </div>
  );
}
```

## Environment Detection

Apps should detect if they're running in dashboard mode:

```typescript
// utils/environment.ts
export const isDashboardMode = process.env.DASHBOARD_MODE === 'true';
export const isElectronMode = typeof window !== 'undefined' && window.process?.versions?.electron;

export function getWebSocketUrl() {
  if (typeof window === 'undefined') return null;
  
  // Always connect to localhost:8090 in dashboard mode
  if (isDashboardMode || isElectronMode) {
    return 'ws://localhost:8090';
  }
  
  // Fallback for standalone mode
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:8090`;
}
```

## Shared State Management

Apps can share state through the WebSocket server:

```typescript
// Custom message types for your app
interface CustomMessage {
  type: 'your-app-data';
  payload: {
    userId: string;
    data: any;
  };
}

// Send data to other apps
websocket.send(JSON.stringify({
  type: 'your-app-data',
  payload: { userId: 'user123', data: { score: 100 } }
}));

// Receive data from other apps
websocket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'your-app-data') {
    // Handle data from other apps
    updateLocalState(data.payload);
  }
};
```

## Testing Your App Integration

### 1. Standalone Testing
```bash
cd your-app
npm run dev  # Test app individually
```

### 2. Dashboard Integration Testing
```bash
cd streamweave-dashboard
# Add your app to dashboard-config.json
npm run dev:dashboard  # Test with dashboard
```

### 3. Electron Testing
```bash
cd streamweave-dashboard
npm run app:start  # Test in Electron
```

## Common Patterns

### 1. Responsive Iframe Sizing
```css
.app-iframe {
  width: 100%;
  height: 100vh;
  border: none;
  min-height: 600px;
}

@media (max-width: 768px) {
  .app-iframe {
    height: 80vh;
  }
}
```

### 2. Loading States
```typescript
const [appLoading, setAppLoading] = useState(true);

<iframe 
  src={appUrl}
  onLoad={() => setAppLoading(false)}
  style={{ display: appLoading ? 'none' : 'block' }}
/>
{appLoading && <div>Loading app...</div>}
```

### 3. Error Handling
```typescript
const [appError, setAppError] = useState(false);

<iframe 
  src={appUrl}
  onError={() => setAppError(true)}
/>
{appError && <div>Failed to load app. <button onClick={retryLoad}>Retry</button></div>}
```

## Security Considerations

1. **CORS Configuration**: Ensure all apps allow iframe embedding
2. **Content Security Policy**: Configure CSP headers appropriately
3. **Port Management**: Use consistent port allocation
4. **Process Isolation**: Each app runs in its own process space

## Troubleshooting

### Common Issues:
1. **WebSocket Connection Failed**: Check if port 8090 is available
2. **Iframe Not Loading**: Verify X-Frame-Options headers
3. **App Not Starting**: Check dashboard-config.json paths and commands
4. **Electron Window Not Hiding**: Verify windowsHide option in ProcessManager

### Debug Commands:
```bash
# Check if WebSocket server is running
netstat -an | grep 8090

# Test WebSocket connection
wscat -c ws://localhost:8090

# Check Electron processes
tasklist | grep electron
```
