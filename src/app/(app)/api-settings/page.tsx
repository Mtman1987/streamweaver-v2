
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";
import { getBrowserWebSocketUrl } from "@/lib/ws-config";


export default function ApiSettingsPage() {
  const { toast } = useToast();
  const wsUrl = useMemo(() => getBrowserWebSocketUrl(), []);
  
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        toast({ title: "Copied to clipboard!" });
    }).catch(err => {
        toast({ variant: "destructive", title: "Failed to copy", description: "Could not copy text to clipboard." });
    });
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API & Webhooks</h1>
        <p className="text-muted-foreground">Manage your API keys, webhooks, and external integrations.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>Use this key to interact with the StreamWeave API.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input id="api-key" readOnly value="********************************" className="font-code" />
            <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard("********************************")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>WebSocket Server</CardTitle>
          <CardDescription>Connect to the local WebSocket server for real-time events.</CardDescription>
        </CardHeader>
        <CardContent>
            <Label htmlFor="websocket-url">Server URL</Label>
            <div className="flex items-center gap-2">
                <Input id="websocket-url" readOnly value={wsUrl} className="font-code" />
                <Button variant="outline" size="icon" onClick={() => handleCopyToClipboard(wsUrl)}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}

    
