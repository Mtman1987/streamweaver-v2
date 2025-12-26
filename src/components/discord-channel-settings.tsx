'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

import { Switch } from '@/components/ui/switch';

interface ChannelSettings {
  logChannelId: string;
  aiChatChannelId: string;
  shoutoutChannelId: string;
  spaceMountainEnabled?: boolean;
}

export function DiscordChannelSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ChannelSettings>({
    logChannelId: '',
    aiChatChannelId: '',
    shoutoutChannelId: '',
    spaceMountainEnabled: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/discord/channels')
      .then(res => res.json())
      .then(setSettings)
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/discord/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast({ title: 'Settings saved', description: 'Discord channels updated successfully' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord Channels</CardTitle>
        <CardDescription>Configure Discord channel IDs for different features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="logChannel">Chat Log Channel ID</Label>
          <Input
            id="logChannel"
            value={settings.logChannelId}
            onChange={(e) => setSettings(prev => ({ ...prev, logChannelId: e.target.value }))}
            placeholder="1340315377774755890"
          />
        </div>
        <div>
          <Label htmlFor="aiChannel">AI Chat Channel ID</Label>
          <Input
            id="aiChannel"
            value={settings.aiChatChannelId}
            onChange={(e) => setSettings(prev => ({ ...prev, aiChatChannelId: e.target.value }))}
            placeholder="1437862625609257142"
          />
        </div>
        <div>
          <Label htmlFor="shoutoutChannel">Shoutout Channel ID</Label>
          <Input
            id="shoutoutChannel"
            value={settings.shoutoutChannelId}
            onChange={(e) => setSettings(prev => ({ ...prev, shoutoutChannelId: e.target.value }))}
            placeholder="1341946492696526858"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch 
            id="spaceMountain" 
            checked={settings.spaceMountainEnabled || false}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, spaceMountainEnabled: checked }))}
          />
          <Label htmlFor="spaceMountain">Enable Space Mountain Dock</Label>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}