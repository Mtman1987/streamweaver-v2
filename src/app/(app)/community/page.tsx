'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useActionsData } from '@/hooks/use-actions-data';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, ExternalLink, FileUp, Clipboard, Share, Copy } from 'lucide-react';

type SharedAction = {
  id: string;
  name: string;
  description: string;
  url: string;
};

function formatTriggerSummary(action: { triggers?: Array<{ type?: unknown }> } | null | undefined): string {
  const triggers = Array.isArray(action?.triggers) ? action!.triggers : [];
  if (triggers.length === 0) return '—';
  const type = triggers[0]?.type;
  if (typeof type === 'string') return type;
  if (typeof type === 'number') return String(type);
  return '—';
}

export default function CommunityPage() {
  const [sharedActions, setSharedActions] = useState<SharedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [importText, setImportText] = useState('');
  const { actions } = useActionsData();
  const [commands, setCommands] = useState<any[]>([]);
  
  const activeCommands = useMemo(
    () => actions.filter((action) => action.enabled),
    [actions]
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSharedActions();
    loadCommands();
  }, []);

  const loadCommands = async () => {
    try {
      const response = await fetch('/api/commands');
      if (response.ok) {
        const data = await response.json();
        setCommands(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load commands:', error);
    }
  };

  const loadSharedActions = async () => {
    try {
      const response = await fetch('/api/shared-actions');
      if (response.ok) {
        const result = await response.json();
        setSharedActions(result.actions || []);
      }
    } catch (error) {
      console.error('Failed to load shared actions:', error);
    } finally {
      setLoading(false);
    }
  };



  const importAction = async (action: SharedAction) => {
    try {
      const contentResponse = await fetch(action.url);
      if (contentResponse.ok) {
        const content = await contentResponse.json();
        
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(content.action)
        });

        if (response.ok) {
          alert(`Successfully imported "${action.name}"`);
        } else {
          alert('Failed to import action');
        }
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import action');
    }
  };

  const handlePasteImport = async () => {
    try {
      let data = importText;
      console.log('Importing data:', data.substring(0, 100) + '...');
      
      // Check if it's valid JSON first
      let isValidJSON = false;
      try {
        JSON.parse(data);
        isValidJSON = true;
      } catch {
        isValidJSON = false;
      }
      
      // If not valid JSON or contains UUEncoded markers, try conversion
      if (!isValidJSON || data.includes('begin ') || /^[A-Za-z0-9+/=\s]+$/.test(data.trim())) {
        console.log('Detected as UUEncoded/Streamerbot format');
        const response = await fetch('/api/convert-streamerbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exportData: data })
        });
        
        console.log('Conversion response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Conversion result:', result);
          
          if (result.actions && result.actions.length > 0) {
            // Import converted actions
            for (const action of result.actions) {
              const importResponse = await fetch('/api/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(action)
              });
              console.log('Action import response:', importResponse.status);
            }
            
            alert(`Imported ${result.actions.length} actions. Changes made: ${result.changes.join(', ')}`);
            setImportText('');
          } else {
            alert('No actions found in the converted data');
          }
        } else {
          const errorText = await response.text();
          console.error('Conversion failed:', errorText);
          alert(`Conversion failed: ${errorText}`);
        }
      } else {
        console.log('Trying direct JSON import');
        const parsed = JSON.parse(data);
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed)
        });
        
        if (response.ok) {
          alert('Successfully imported action');
          setImportText('');
        } else {
          const errorText = await response.text();
          alert(`Import failed: ${errorText}`);
        }
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImportText(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const exportToDiscord = async (action: any) => {
    try {
      const response = await fetch('/api/export-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          description: `Shared from StreamWeave: ${action.name}`
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert(`Successfully shared "${action.name}" to Discord!`);
          loadSharedActions();
        }
      } else {
        alert('Failed to share to Discord');
      }
    } catch (error) {
      alert('Failed to share to Discord');
    }
  };

  const copyToClipboard = async (action: any) => {
    try {
      const exportData = JSON.stringify(action, null, 2);
      await navigator.clipboard.writeText(exportData);
      alert('Action copied to clipboard!');
    } catch (error) {
      console.error('Clipboard error:', error);
      alert('Failed to copy to clipboard. Please ensure the page is focused.');
    }
  };

  const downloadAsFile = (action: any) => {
    const exportData = JSON.stringify(action, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${action.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };



  if (loading) {
    return <div className="p-6">Loading community actions...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Community Hub</h1>
          <p className="text-muted-foreground">
            Import, export, and share actions with the StreamWeave community
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Actions</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="paste">
                <TabsList>
                  <TabsTrigger value="paste">Paste/UUCode</TabsTrigger>
                  <TabsTrigger value="file">File Upload</TabsTrigger>
                </TabsList>
                <TabsContent value="paste" className="space-y-4">
                  <Textarea
                    placeholder="Paste JSON, UUEncoded data, or Streamerbot export here..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={10}
                  />
                  <Button onClick={handlePasteImport} disabled={!importText}>
                    Import from Clipboard
                  </Button>
                </TabsContent>
                <TabsContent value="file" className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.txt"
                    onChange={handleFileImport}
                    className="hidden"
                    aria-label="Choose file to import"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <FileUp className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                  {importText && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">File loaded:</p>
                      <Textarea value={importText} readOnly rows={5} />
                      <Button onClick={handlePasteImport} className="mt-2">
                        Import File Content
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={loadSharedActions}>
            <Download className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="community">
        <TabsList>
          <TabsTrigger value="community">Community Shared</TabsTrigger>
          <TabsTrigger value="actions">My Actions</TabsTrigger>
          <TabsTrigger value="commands">My Commands</TabsTrigger>
          <TabsTrigger value="active">Active Commands</TabsTrigger>
        </TabsList>
        
        <TabsContent value="community">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sharedActions.map((action) => (
              <Card key={action.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{action.name}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2 mb-4">
                    <Badge variant="secondary">Community Shared</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => importAction(action)} className="flex-1">
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => window.open(action.url, '_blank')}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {sharedActions.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  No community actions found. Actions shared in Discord will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="actions">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {actions.map((action) => (
              <Card key={action.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{action.name}</CardTitle>
                  <CardDescription>Trigger: {formatTriggerSummary(action)}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2 mb-4">
                    <Badge variant={action.enabled ? 'default' : 'secondary'}>
                      {action.enabled ? 'enabled' : 'disabled'}
                    </Badge>
                    <Badge variant="outline">Action</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => exportToDiscord(action)} className="flex-1">
                      <Share className="w-4 h-4 mr-2" />
                      Upload to Discord
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(action)} title="Copy to Clipboard">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => downloadAsFile(action)} title="Save as File">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="commands">
          {commands.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  No commands found. Create some commands first or check the console for errors.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {commands.map((command) => (
                <Card key={command.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{command.name}</CardTitle>
                    <CardDescription>!{command.trigger}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2 mb-4">
                      <Badge variant={command.enabled ? 'default' : 'secondary'}>
                        {command.enabled ? 'enabled' : 'disabled'}
                      </Badge>
                      <Badge variant="outline">Command</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => exportToDiscord(command)} className="flex-1">
                        <Share className="w-4 h-4 mr-2" />
                        Upload to Discord
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(command)} title="Copy to Clipboard">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => downloadAsFile(command)} title="Save as File">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="active">
          {activeCommands.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  No active commands found. Active commands are stored in localStorage.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeCommands.map((activeCmd, index) => (
                <Card key={index} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{activeCmd.name}</CardTitle>
                    <CardDescription>Trigger: {formatTriggerSummary(activeCmd)}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2 mb-4">
                      <Badge variant="default">Active Flow</Badge>
                      <Badge variant="outline">Command + Action</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => exportToDiscord(activeCmd)} className="flex-1">
                        <Share className="w-4 h-4 mr-2" />
                        Upload to Discord
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(activeCmd)} title="Copy to Clipboard">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => downloadAsFile(activeCmd)} title="Save as File">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}