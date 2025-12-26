"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getBrowserWebSocketUrl } from "@/lib/ws-config";

type VaultData = {
  obs?: { ip?: string; port?: number; password?: string };
  websocket?: { host?: string; port?: number };
  points?: Record<string, number>;
};

type VariablesMap = Record<string, unknown>;

export default function SettingsPage() {
  const { toast } = useToast();
  const wsUrl = useMemo(() => getBrowserWebSocketUrl(), []);
  const [loading, setLoading] = useState(true);
  const [vault, setVault] = useState<VaultData>({});

  // Minimal editable config surface (non-secret)
  const [obsIp, setObsIp] = useState("192.168.40.16");
  const [obsPort, setObsPort] = useState("4455");
  const [obsPassword, setObsPassword] = useState("");

  const [wsHost, setWsHost] = useState("localhost");
  const [wsPort, setWsPort] = useState("8090");

  const [pointsKey, setPointsKey] = useState("");
  const [pointsValue, setPointsValue] = useState("0");
  const [points, setPoints] = useState<Record<string, number>>({});

  const [globalVars, setGlobalVars] = useState<VariablesMap>({});
  const [globalKey, setGlobalKey] = useState("");
  const [globalValue, setGlobalValue] = useState("");

  const [userLogin, setUserLogin] = useState("");
  const [userVars, setUserVars] = useState<VariablesMap>({});
  const [userKey, setUserKey] = useState("");
  const [userValue, setUserValue] = useState("");

  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/vault");
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        const next = (data?.vault || {}) as VaultData;
        setVault(next);
        setObsIp(next.obs?.ip || "192.168.40.16");
        setObsPort(next.obs?.port ? String(next.obs.port) : "4455");
        setObsPassword(next.obs?.password || "");

        setWsHost(next.websocket?.host || "localhost");
        setWsPort(next.websocket?.port ? String(next.websocket.port) : "8090");

        const nextPoints = next.points || {};
        setPoints(nextPoints);

        const globalsRes = await fetch("/api/automation/variables?scope=global");
        const globalsData = await globalsRes.json().catch(() => null);
        if (globalsRes.ok) {
          setGlobalVars((globalsData?.variables || {}) as VariablesMap);
        }
      } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to load Vault", description: String(error?.message || error) });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [toast]);

  const parseSmartValue = (raw: string): unknown => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    try {
      return JSON.parse(trimmed);
    } catch {
      return raw;
    }
  };

  const saveVault = async () => {
    try {
      const res = await fetch("/api/vault", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          obs: {
            ip: obsIp,
            port: Number(obsPort),
            password: obsPassword,
          },
          websocket: {
            host: wsHost,
            port: Number(wsPort),
          },
          points,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setVault((data?.vault || {}) as VaultData);
      toast({ title: "Vault saved" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to save Vault", description: String(error?.message || error) });
    }
  };

  const exportState = async () => {
    try {
      const res = await fetch('/api/state/export');
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replaceAll(':', '-');
      a.href = url;
      a.download = `streamweaver-state-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({ title: 'Exported state JSON' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Export failed', description: String(error?.message || error) });
    }
  };

  const importState = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await fetch('/api/state/import?mode=replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // Reload current state from APIs so UI reflects imported values.
      const vaultRes = await fetch('/api/vault');
      const vaultData = await vaultRes.json().catch(() => null);
      if (vaultRes.ok) {
        const next = (vaultData?.vault || {}) as VaultData;
        setVault(next);
        setObsIp(next.obs?.ip || '192.168.40.16');
        setObsPort(next.obs?.port ? String(next.obs.port) : '4455');
        setObsPassword(next.obs?.password || '');
        setWsHost(next.websocket?.host || 'localhost');
        setWsPort(next.websocket?.port ? String(next.websocket.port) : '8090');
        setPoints(next.points || {});
      }

      const globalsRes = await fetch('/api/automation/variables?scope=global');
      const globalsData = await globalsRes.json().catch(() => null);
      if (globalsRes.ok) setGlobalVars((globalsData?.variables || {}) as VariablesMap);

      if (userLogin.trim()) {
        const user = userLogin.trim();
        const userRes = await fetch(`/api/automation/variables?scope=user&user=${encodeURIComponent(user)}`);
        const userData = await userRes.json().catch(() => null);
        if (userRes.ok) setUserVars((userData?.variables || {}) as VariablesMap);
      }

      toast({ title: 'Imported state JSON' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Import failed', description: String(error?.message || error) });
    } finally {
      setImporting(false);
    }
  };

  const clearBrowserState = async () => {
    try {
      window.localStorage?.clear();
    } catch {
      // ignore
    }
    try {
      window.sessionStorage?.clear();
    } catch {
      // ignore
    }

    // Best-effort cookie clearing for the current domain.
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const eqPos = cookie.indexOf('=');
        const name = (eqPos > -1 ? cookie.slice(0, eqPos) : cookie).trim();
        if (!name) continue;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    } catch {
      // ignore
    }

    // Best-effort Cache Storage cleanup.
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignore
    }

    // Best-effort IndexedDB cleanup.
    try {
      const anyIndexedDb = indexedDB as any;
      if (typeof anyIndexedDb?.databases === 'function') {
        const dbs: Array<{ name?: string | null }> = await anyIndexedDb.databases();
        await Promise.all(
          dbs
            .map((d) => d.name)
            .filter((n): n is string => typeof n === 'string' && n.length > 0)
            .map(
              (name) =>
                new Promise<void>((resolve) => {
                  const req = indexedDB.deleteDatabase(name);
                  req.onsuccess = () => resolve();
                  req.onerror = () => resolve();
                  req.onblocked = () => resolve();
                })
            )
        );
      }
    } catch {
      // ignore
    }
  };

  const resetLocalAppData = async () => {
    const confirmed = window.confirm(
      'Reset local app data? This will remove local tokens/config and clear browser storage. You will be sent back to login.'
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await fetch('/api/dev/reset', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      await clearBrowserState();

      toast({ title: 'Local app data reset' });
      window.location.href = '/login';
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Reset failed',
        description: String(error?.message || error),
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">App configuration and automation state.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vault</CardTitle>
          <CardDescription>
            Store non-secret configuration that can change during development (OBS host/port, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void exportState()} disabled={loading}>
              Export Vault + Variables
            </Button>
            <Label
              htmlFor="import-state"
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Import (replace)
            </Label>
            <input
              id="import-state"
              type="file"
              accept="application/json"
              title="Import state JSON"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                void importState(file);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vault-obs-ip">OBS IP</Label>
              <Input id="vault-obs-ip" value={obsIp} onChange={(e) => setObsIp(e.target.value)} placeholder="192.168.40.16" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vault-obs-port">OBS Port</Label>
              <Input id="vault-obs-port" value={obsPort} onChange={(e) => setObsPort(e.target.value)} placeholder="4455" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vault-obs-password">OBS Password (optional)</Label>
            <Input id="vault-obs-password" type="password" value={obsPassword} onChange={(e) => setObsPassword(e.target.value)} placeholder="Leave empty if auth is disabled" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vault-ws-host">WebSocket Host</Label>
              <Input id="vault-ws-host" value={wsHost} onChange={(e) => setWsHost(e.target.value)} placeholder="localhost" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vault-ws-port">WebSocket Port</Label>
              <Input id="vault-ws-port" value={wsPort} onChange={(e) => setWsPort(e.target.value)} placeholder="8090" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Points</Label>
            <div className="grid gap-2">
              {Object.keys(points).length === 0 ? (
                <div className="text-sm text-muted-foreground">No point values set.</div>
              ) : (
                <div className="grid gap-2">
                  {Object.entries(points).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <Input value={k} disabled />
                      <Input
                        value={String(v)}
                        onChange={(e) => {
                          const num = Number(e.target.value);
                          setPoints((prev) => ({ ...prev, [k]: Number.isFinite(num) ? num : 0 }));
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPoints((prev) => {
                            const next = { ...prev };
                            delete next[k];
                            return next;
                          });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input value={pointsKey} onChange={(e) => setPointsKey(e.target.value)} placeholder="key (e.g. shoutout)" />
              <Input value={pointsValue} onChange={(e) => setPointsValue(e.target.value)} placeholder="number" />
              <Button
                variant="outline"
                onClick={() => {
                  const key = pointsKey.trim();
                  const num = Number(pointsValue);
                  if (!key) return;
                  if (!Number.isFinite(num)) return;
                  setPoints((prev) => ({ ...prev, [key]: num }));
                  setPointsKey("");
                  setPointsValue("0");
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => void saveVault()} disabled={loading}>
              Save Vault
            </Button>
            <Button asChild variant="outline">
              <Link href="/integrations">Go to Integrations</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/api-settings">Go to API Settings</Link>
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Current WebSocket URL: <span className="font-mono">{wsUrl}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation Variables</CardTitle>
          <CardDescription>
            View/edit the stored global variables and per-user variables used by action flows.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-3">
            <div className="font-medium">Global Variables</div>
            {Object.keys(globalVars).length === 0 ? (
              <div className="text-sm text-muted-foreground">No global variables set.</div>
            ) : (
              <div className="grid gap-2">
                {Object.entries(globalVars).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <Input value={k} disabled />
                    <Input
                      value={typeof v === 'string' ? v : JSON.stringify(v)}
                      onChange={(e) => {
                        const nextVal = parseSmartValue(e.target.value);
                        setGlobalVars((prev) => ({ ...prev, [k]: nextVal }));
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const res = await fetch('/api/automation/variables', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ scope: 'global', key: k }),
                        });
                        const data = await res.json().catch(() => null);
                        if (!res.ok) {
                          toast({ variant: 'destructive', title: 'Failed to delete', description: data?.error || `HTTP ${res.status}` });
                          return;
                        }
                        setGlobalVars((data?.variables || {}) as VariablesMap);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input value={globalKey} onChange={(e) => setGlobalKey(e.target.value)} placeholder="key" />
              <Input value={globalValue} onChange={(e) => setGlobalValue(e.target.value)} placeholder="value (string or JSON)" />
              <Button
                variant="outline"
                onClick={async () => {
                  const key = globalKey.trim();
                  if (!key) return;
                  const value = parseSmartValue(globalValue);
                  const res = await fetch('/api/automation/variables', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scope: 'global', key, value }),
                  });
                  const data = await res.json().catch(() => null);
                  if (!res.ok) {
                    toast({ variant: 'destructive', title: 'Failed to save', description: data?.error || `HTTP ${res.status}` });
                    return;
                  }
                  setGlobalVars((data?.variables || {}) as VariablesMap);
                  setGlobalKey('');
                  setGlobalValue('');
                }}
              >
                Add/Set
              </Button>
              <Button
                onClick={async () => {
                  const res = await fetch('/api/automation/variables', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scope: 'global', variables: globalVars }),
                  });
                  const data = await res.json().catch(() => null);
                  if (!res.ok) {
                    toast({ variant: 'destructive', title: 'Failed to save globals', description: data?.error || `HTTP ${res.status}` });
                    return;
                  }
                  setGlobalVars((data?.variables || {}) as VariablesMap);
                  toast({ title: 'Global variables saved' });
                }}
                disabled={loading}
              >
                Save All
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="font-medium">User Variables</div>
            <div className="flex items-center gap-2">
              <Input value={userLogin} onChange={(e) => setUserLogin(e.target.value)} placeholder="user login (e.g. mtman1987)" />
              <Button
                variant="outline"
                onClick={async () => {
                  const user = userLogin.trim();
                  if (!user) return;
                  const res = await fetch(`/api/automation/variables?scope=user&user=${encodeURIComponent(user)}`);
                  const data = await res.json().catch(() => null);
                  if (!res.ok) {
                    toast({ variant: 'destructive', title: 'Failed to load user variables', description: data?.error || `HTTP ${res.status}` });
                    return;
                  }
                  setUserVars((data?.variables || {}) as VariablesMap);
                }}
              >
                Load
              </Button>
              <Button
                onClick={async () => {
                  const user = userLogin.trim();
                  if (!user) return;
                  const res = await fetch('/api/automation/variables', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scope: 'user', user, variables: userVars }),
                  });
                  const data = await res.json().catch(() => null);
                  if (!res.ok) {
                    toast({ variant: 'destructive', title: 'Failed to save user vars', description: data?.error || `HTTP ${res.status}` });
                    return;
                  }
                  setUserVars((data?.variables || {}) as VariablesMap);
                  toast({ title: 'User variables saved' });
                }}
                disabled={loading}
              >
                Save All
              </Button>
            </div>

            {Object.keys(userVars).length === 0 ? (
              <div className="text-sm text-muted-foreground">No variables loaded for this user.</div>
            ) : (
              <div className="grid gap-2">
                {Object.entries(userVars).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <Input value={k} disabled />
                    <Input
                      value={typeof v === 'string' ? v : JSON.stringify(v)}
                      onChange={(e) => {
                        const nextVal = parseSmartValue(e.target.value);
                        setUserVars((prev) => ({ ...prev, [k]: nextVal }));
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const user = userLogin.trim();
                        if (!user) return;
                        const res = await fetch('/api/automation/variables', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ scope: 'user', user, key: k }),
                        });
                        const data = await res.json().catch(() => null);
                        if (!res.ok) {
                          toast({ variant: 'destructive', title: 'Failed to delete', description: data?.error || `HTTP ${res.status}` });
                          return;
                        }
                        setUserVars((data?.variables || {}) as VariablesMap);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input value={userKey} onChange={(e) => setUserKey(e.target.value)} placeholder="key" />
              <Input value={userValue} onChange={(e) => setUserValue(e.target.value)} placeholder="value (string or JSON)" />
              <Button
                variant="outline"
                onClick={async () => {
                  const user = userLogin.trim();
                  const key = userKey.trim();
                  if (!user || !key) return;
                  const value = parseSmartValue(userValue);
                  const res = await fetch('/api/automation/variables', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scope: 'user', user, key, value }),
                  });
                  const data = await res.json().catch(() => null);
                  if (!res.ok) {
                    toast({ variant: 'destructive', title: 'Failed to save', description: data?.error || `HTTP ${res.status}` });
                    return;
                  }
                  setUserVars((data?.variables || {}) as VariablesMap);
                  setUserKey('');
                  setUserValue('');
                }}
              >
                Add/Set
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Development</CardTitle>
          <CardDescription>
            Reset local auth/config and clear browser storage to simulate a fresh install.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Button variant="destructive" onClick={() => void resetLocalAppData()} disabled={resetting}>
            {resetting ? 'Resetting…' : 'Reset Local App Data'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
