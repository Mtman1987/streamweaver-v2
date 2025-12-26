# Dashboard App Implementation Template

## Main Dashboard App Structure

This template shows how to create the central dashboard app that coordinates all other applications.

### 1. Dashboard WebSocket Hook

```typescript
// hooks/useDashboardWebSocket.ts
import { useEffect, useState, useCallback } from 'react';

interface App {
  name: string;
  title: string;
  port: number;
  path: string;
  status: 'running' | 'stopped' | 'starting';
}

interface WebSocketMessage {
  type: string;
  payload: any;
}

export function useDashboardWebSocket() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const websocket = new WebSocket('ws://localhost:8090');
    
    websocket.onopen = () => {
      console.log('[Dashboard] Connected to WebSocket');
      setConnected(true);
      // Request current app status
      websocket.send(JSON.stringify({ type: 'get-app-status', payload: {} }));
    };

    websocket.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
      
      switch (data.type) {
        case 'app-status':
          setApps(data.payload.apps);
          break;
        case 'app-started':
          setApps(prev => prev.map(app => 
            app.name === data.payload.name 
              ? { ...app, status: 'running' }
              : app
          ));
          break;
        case 'app-stopped':
          setApps(prev => prev.map(app => 
            app.name === data.payload.name 
              ? { ...app, status: 'stopped' }
              : app
          ));
          break;
      }
    };

    websocket.onclose = () => {
      console.log('[Dashboard] WebSocket disconnected, reconnecting...');
      setConnected(false);
      setTimeout(connect, 5000);
    };

    websocket.onerror = (error) => {
      console.error('[Dashboard] WebSocket error:', error);
      setConnected(false);
    };

    setWs(websocket);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      ws?.close();
    };
  }, [connect]);

  const startApp = useCallback((name: string, command: string, cwd: string, port: number) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'start-app',
        payload: { name, command, cwd, port }
      }));
    }
  }, [ws]);

  const stopApp = useCallback((name: string) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'stop-app',
        payload: { name }
      }));
    }
  }, [ws]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }, [ws]);

  return {
    apps,
    connected,
    startApp,
    stopApp,
    sendMessage
  };
}
```

### 2. App Card Component

```typescript
// components/AppCard.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Play, Square, RotateCcw } from 'lucide-react';

interface App {
  name: string;
  title: string;
  port: number;
  path: string;
  status: 'running' | 'stopped' | 'starting';
}

interface AppCardProps {
  app: App;
  onStart: (name: string, command: string, cwd: string, port: number) => void;
  onStop: (name: string) => void;
}

export function AppCard({ app, onStart, onStop }: AppCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'starting': return 'bg-yellow-500';
      case 'stopped': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleStart = () => {
    onStart(app.name, 'dev:dashboard', '.', app.port);
  };

  const handleStop = () => {
    onStop(app.name);
  };

  const openInBrowser = () => {
    window.open(`http://localhost:${app.port}${app.path}`, '_blank');
  };

  const retryIframe = () => {
    setIframeError(false);
    // Force iframe reload by changing src
    const iframe = document.getElementById(`iframe-${app.name}`) as HTMLIFrameElement;
    if (iframe) {
      const src = iframe.src;
      iframe.src = '';
      setTimeout(() => iframe.src = src, 100);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            {app.title}
            <Badge className={getStatusColor(app.status)}>
              {app.status}
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            {app.status === 'stopped' && (
              <Button size="sm" onClick={handleStart}>
                <Play className="h-4 w-4" />
              </Button>
            )}
            {app.status === 'running' && (
              <Button size="sm" variant="destructive" onClick={handleStop}>
                <Square className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={openInBrowser}>
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Port: {app.port} | Path: {app.path}
            </div>
            
            {app.status === 'running' && (
              <div className="border rounded-lg overflow-hidden">
                {iframeError ? (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      Failed to load {app.title}
                    </p>
                    <Button onClick={retryIframe}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : (
                  <iframe
                    id={`iframe-${app.name}`}
                    src={`http://localhost:${app.port}${app.path}`}
                    width="100%"
                    height="600px"
                    frameBorder="0"
                    onError={() => setIframeError(true)}
                    className="w-full"
                  />
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
```

### 3. Main Dashboard Page

```typescript
// app/dashboard/page.tsx
'use client';

import { useDashboardWebSocket } from '@/hooks/useDashboardWebSocket';
import { AppCard } from '@/components/AppCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export default function DashboardPage() {
  const { apps, connected, startApp, stopApp } = useDashboardWebSocket();

  const runningApps = apps.filter(app => app.status === 'running').length;
  const totalApps = apps.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">StreamWeave Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and monitor all your applications
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant={connected ? 'default' : 'destructive'}>
            {connected ? (
              <>
                <Wifi className="h-4 w-4 mr-1" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
          
          <Badge variant="outline">
            {runningApps}/{totalApps} Apps Running
          </Badge>
        </div>
      </header>

      <div className="grid gap-6">
        {apps.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No applications configured. Check dashboard-config.json
              </p>
            </CardContent>
          </Card>
        ) : (
          apps.map(app => (
            <AppCard
              key={app.name}
              app={app}
              onStart={startApp}
              onStop={stopApp}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

### 4. Dashboard Layout

```typescript
// app/dashboard/layout.tsx
import { Inter } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'StreamWeave Dashboard',
  description: 'Multi-app dashboard for StreamWeave ecosystem',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  );
}
```

### 5. Global CSS for Iframe Styling

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Iframe responsive styling */
.app-iframe {
  width: 100%;
  height: 600px;
  border: none;
  border-radius: 8px;
  background: #f8f9fa;
}

.app-iframe:loading {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Dashboard grid responsive */
@media (min-width: 1200px) {
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

@media (min-width: 1600px) {
  .dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Integration Checklist

When adding a new app to the dashboard system:

### ✅ App Requirements
- [ ] WebSocket client connecting to ws://localhost:8090
- [ ] Iframe-friendly headers in next.config.js
- [ ] Dashboard mode detection and handling
- [ ] Responsive design for iframe embedding
- [ ] Error handling for connection failures

### ✅ Dashboard Configuration
- [ ] Add app entry to dashboard-config.json
- [ ] Assign unique port number
- [ ] Define correct command and path
- [ ] Test app starts/stops correctly

### ✅ Electron Integration
- [ ] App works when launched via ProcessManager
- [ ] Console windows are properly hidden
- [ ] App shuts down gracefully with Electron

### ✅ Testing
- [ ] App works standalone (npm run dev)
- [ ] App works in dashboard mode (npm run dev:dashboard)
- [ ] App works in Electron (npm run app:start)
- [ ] Iframe embedding displays correctly
- [ ] WebSocket communication functions properly

This comprehensive setup ensures all apps work seamlessly together in the unified dashboard system while maintaining individual functionality when needed.
