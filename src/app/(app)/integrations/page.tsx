"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, CheckCircle, XCircle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function IntegrationsPage() {
  const { toast } = useToast();
  const twitchConfigured = !!process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  const [twitchStatus, setTwitchStatus] = useState<{
    loading: boolean;
    broadcasterConnected: boolean;
    botConnected: boolean;
    broadcasterUsername: string | null;
    botUsername: string | null;
  }>({
    loading: true,
    broadcasterConnected: false,
    botConnected: false,
    broadcasterUsername: null,
    botUsername: null,
  });
  const [obsSettings, setObsSettings] = useState({
    ip: process.env.NEXT_PUBLIC_OBS_IP || "127.0.0.1",
    port: process.env.NEXT_PUBLIC_OBS_PORT || "4455",
    password: "",
    connected: false,
    busy: false,
  });

  const [platformStates, setPlatformStates] = useState({
    twitch: false,
    youtube: false,
    kick: false,
    tiktok: false,
    discord: true
  });

  // Check for configured platforms via env variables
  useEffect(() => {
    const checkPlatformConfig = async () => {
      // Check if Twitch is configured via env
      const hasTwitchEnv = !!process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
      
      setPlatformStates(prev => ({
        ...prev,
        twitch: hasTwitchEnv,
        discord: true // Discord via env
      }));
    };
    
    checkPlatformConfig();
  }, []);

  const refreshTwitchStatus = async () => {
    try {
      setTwitchStatus((prev) => ({ ...prev, loading: true }));
      const res = await fetch('/api/integrations/twitch/status');
      const data = await res.json();
      setTwitchStatus({
        loading: false,
        broadcasterConnected: !!data?.broadcasterConnected,
        botConnected: !!data?.botConnected,
        broadcasterUsername: data?.broadcasterUsername ?? null,
        botUsername: data?.botUsername ?? null,
      });
    } catch {
      setTwitchStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    void refreshTwitchStatus();
  }, []);

  const connectTwitch = (role: 'broadcaster' | 'bot') => {
    if (!twitchConfigured) {
      toast({
        variant: 'destructive',
        title: 'Twitch not configured',
        description: 'Missing NEXT_PUBLIC_TWITCH_CLIENT_ID',
      });
      return;
    }
    window.location.href = `/api/auth/twitch?role=${role}`;
  };

  const disconnectTwitch = async (role: 'broadcaster' | 'bot') => {
    try {
      const res = await fetch('/api/integrations/twitch/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refreshTwitchStatus();
      toast({ title: 'Disconnected', description: `Twitch ${role} disconnected` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Disconnect failed',
        description: String(error?.message || error),
      });
    }
  };

  const platforms = [
    { 
      id: "twitch",
      name: "Twitch", 
      connected: platformStates.twitch, 
      type: "streaming",
      authType: "oauth",
      description: "Stream to Twitch and interact with your chat"
    },
    { 
      id: "youtube",
      name: "YouTube", 
      connected: platformStates.youtube, 
      type: "streaming",
      authType: "oauth",
      description: "Stream to YouTube and manage live chat"
    },
    { 
      id: "kick",
      name: "Kick", 
      connected: platformStates.kick, 
      type: "streaming",
      authType: "username",
      description: "Connect to Kick.com chat (read-only)"
    },
    { 
      id: "tiktok",
      name: "TikTok", 
      connected: platformStates.tiktok, 
      type: "streaming",
      authType: "username",
      description: "Connect to TikTok Live (read-only)"
    },
    { 
      id: "discord",
      name: "Discord", 
      connected: platformStates.discord, 
      type: "chat",
      authType: "token",
      description: "Discord bot for commands and notifications"
    }
  ];

  const services = [
    { name: "OBS Studio", connected: obsSettings.connected, type: "broadcast" },
    { name: "Streamlabs", connected: false, type: "alerts" },
    { name: "StreamElements", connected: false, type: "alerts" },
    { name: "Nightbot", connected: false, type: "moderation" }
  ];

  const testAndSaveObs = async () => {
    const ip = obsSettings.ip.trim();
    const port = obsSettings.port.trim();
    const password = obsSettings.password;
    if (!ip || !port) {
      toast({ variant: "destructive", title: "Missing OBS settings", description: "Please provide IP and port." });
      return;
    }

    setObsSettings((prev) => ({ ...prev, busy: true }));
    try {
      const res = await fetch('/api/obs/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "OBS connection failed",
          description: data?.error ? String(data.error) : `HTTP ${res.status}`,
        });
        setObsSettings((prev) => ({ ...prev, connected: false }));
        return;
      }

      toast({ title: "OBS connected", description: data?.url ? String(data.url) : "Connection test succeeded" });
      setObsSettings((prev) => ({ ...prev, connected: true }));
    } catch (error: any) {
      toast({ variant: "destructive", title: "OBS connection failed", description: String(error?.message || error) });
      setObsSettings((prev) => ({ ...prev, connected: false }));
    } finally {
      setObsSettings((prev) => ({ ...prev, busy: false }));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Platform Connections</CardTitle>
          <CardDescription>Connect your streaming platforms and chat services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {platforms.map((platform) => (
            platform.id === 'twitch' ? (
              <div key={platform.id} className="p-4 border rounded space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(twitchStatus.broadcasterConnected && twitchStatus.botConnected) ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">Twitch</div>
                      <div className="text-sm text-muted-foreground">{platform.description}</div>
                    </div>
                  </div>
                  {twitchConfigured ? (
                    <Badge variant="outline">OAuth</Badge>
                  ) : (
                    <Badge variant="destructive">Missing Client ID</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between rounded border px-3 py-2">
                  <div className="flex items-center gap-3">
                    {twitchStatus.broadcasterConnected ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <div className="text-sm font-medium">Broadcaster</div>
                      <div className="text-xs text-muted-foreground">
                        {twitchStatus.broadcasterUsername ? `@${twitchStatus.broadcasterUsername}` : 'Not connected'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {twitchStatus.broadcasterConnected ? (
                      <>
                        <Badge className="bg-green-600">Connected</Badge>
                        <Button size="sm" variant="outline" onClick={() => void disconnectTwitch('broadcaster')}>
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => connectTwitch('broadcaster')}>
                        Connect
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded border px-3 py-2">
                  <div className="flex items-center gap-3">
                    {twitchStatus.botConnected ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <div className="text-sm font-medium">Bot</div>
                      <div className="text-xs text-muted-foreground">
                        {twitchStatus.botUsername ? `@${twitchStatus.botUsername}` : 'Not connected'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {twitchStatus.botConnected ? (
                      <>
                        <Badge className="bg-green-600">Connected</Badge>
                        <Button size="sm" variant="outline" onClick={() => void disconnectTwitch('bot')}>
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => connectTwitch('bot')}>
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div key={platform.id} className="flex items-center justify-between p-4 border rounded">
                <div className="flex items-center gap-3">
                  {platform.connected ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{platform.name}</div>
                    <div className="text-sm text-muted-foreground">{platform.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {platform.connected ? (
                    <>
                      <Badge className="bg-green-600">Connected</Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setPlatformStates({...platformStates, [platform.id]: false})}
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <>
                      {platform.authType === 'oauth' && (
                        <Button 
                          size="sm"
                          onClick={() => {
                            if (platform.id === 'youtube') {
                              window.location.href = '/api/auth/youtube';
                            }
                          }}
                        >
                          Connect via OAuth
                        </Button>
                      )}
                      {platform.authType === 'username' && (
                        <Button 
                          size="sm"
                          onClick={() => {
                            const username = prompt(`Enter your ${platform.name} username:`);
                            if (username) {
                              fetch(`/api/platforms/${platform.id}/connect`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username })
                              }).then(() => {
                                setPlatformStates({...platformStates, [platform.id]: true});
                              });
                            }
                          }}
                        >
                          Connect
                        </Button>
                      )}
                      {platform.authType === 'token' && (
                        <Badge variant="outline">Configured via ENV</Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OBS Studio Connection</CardTitle>
          <CardDescription>Connect to OBS WebSocket server for scene control and automation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="obs-ip">IP Address</Label>
              <Input
                id="obs-ip"
                value={obsSettings.ip}
                onChange={(e) => setObsSettings({...obsSettings, ip: e.target.value})}
                placeholder="127.0.0.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs-port">Port</Label>
              <Input
                id="obs-port"
                value={obsSettings.port}
                onChange={(e) => setObsSettings({...obsSettings, port: e.target.value})}
                placeholder="4455"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs-password">Password (Optional)</Label>
            <Input
              id="obs-password"
              type="password"
              value={obsSettings.password}
              onChange={(e) => setObsSettings({...obsSettings, password: e.target.value})}
              placeholder="Leave empty if no password"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {obsSettings.connected ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
              <span className="font-medium">
                {obsSettings.connected ? "Connected to OBS" : "Not Connected"}
              </span>
            </div>
            <Button 
              onClick={() => {
                if (obsSettings.connected) {
                  setObsSettings({ ...obsSettings, connected: false });
                  return;
                }
                void testAndSaveObs();
              }}
              disabled={obsSettings.busy}
              variant={obsSettings.connected ? "outline" : "default"}
            >
              {obsSettings.connected ? "Disconnect" : (obsSettings.busy ? "Connecting..." : "Connect")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Third-Party Services</CardTitle>
          <CardDescription>Connect additional streaming and moderation services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-3">
                {service.connected ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <div className="font-medium">{service.name}</div>
                  <div className="text-sm text-muted-foreground capitalize">{service.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {service.connected ? (
                  <Badge className="bg-green-600">Connected</Badge>
                ) : (
                  <Button size="sm">Connect</Button>
                )}
                <Button size="sm" variant="ghost">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Server Settings</CardTitle>
          <CardDescription>Configure WebSocket and HTTP servers for external integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded">
            <div>
              <div className="font-medium">WebSocket Server</div>
              <div className="text-sm text-muted-foreground">ws://localhost:8080</div>
            </div>
            <div className="flex items-center gap-2">
              <Switch defaultChecked />
              <Badge className="bg-green-600">Running</Badge>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border rounded">
            <div>
              <div className="font-medium">HTTP Server</div>
              <div className="text-sm text-muted-foreground">http://localhost:7474</div>
            </div>
            <div className="flex items-center gap-2">
              <Switch defaultChecked />
              <Badge className="bg-green-600">Running</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}