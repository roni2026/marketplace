import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import {
  createAPIToken, getAPITokens, revokeAPIToken,
  getAPILogs, createWebhook, getWebhooks, triggerWebhook,
  getAPIRateLimit, getAPIDocs, getAPIVersion,
} from '@/lib/apiManagement';
import { Key, ScrollText, Webhook, BookOpen, Gauge, Plus, Trash2, Zap } from 'lucide-react';
import { format } from 'date-fns';

export default function APILogs() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState<unknown[]>([]);
  const [logs, setLogs] = useState<unknown[]>([]);
  const [webhooks, setWebhooks] = useState<unknown[]>([]);
  const [rateLimit, setRateLimit] = useState<{ requestsInLastHour: number; limit: number; remaining: number } | null>(null);
  const [apiDocs, setApiDocs] = useState<{ version: string; baseUrl: string; endpoints: { method: string; path: string; description: string; auth: boolean }[] } | null>(null);
  const [apiVersion, setApiVersion] = useState<{ version: string; releasedAt: string; deprecated: string[] } | null>(null);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [tokenScopes, setTokenScopes] = useState('read,write');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('ad.created,ad.updated');
  const [logFilter, setLogFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { navigate('/'); return; }
    if (isAdmin && user) fetchAll();
  }, [user, isAdmin, navigate]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [t, l, wh, rl, docs, ver] = await Promise.all([
        getAPITokens(user!.id).catch(() => []),
        getAPILogs({ limit: 100 }).catch(() => []),
        getWebhooks(user!.id).catch(() => []),
        getAPIRateLimit(user!.id).catch(() => null),
        getAPIDocs().catch(() => null),
        getAPIVersion().catch(() => null),
      ]);
      setTokens(t ?? []);
      setLogs(l ?? []);
      setWebhooks(wh ?? []);
      setRateLimit(rl as typeof rateLimit);
      setApiDocs(docs as typeof apiDocs);
      setApiVersion(ver as typeof apiVersion);
    } catch {
      // tables may not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateToken = async () => {
    if (!tokenName) return;
    try {
      const result = await createAPIToken(user!.id, tokenName, tokenScopes.split(',').map((s) => s.trim()));
      setNewToken((result as { token: string }).token);
      const t = await getAPITokens(user!.id);
      setTokens(t ?? []);
      setTokenName('');
      toast.success('API token created');
    } catch {
      toast.error('Failed to create token');
    }
  };

  const handleRevokeToken = async (id: string) => {
    try {
      await revokeAPIToken(id);
      const t = await getAPITokens(user!.id);
      setTokens(t ?? []);
      toast.success('Token revoked');
    } catch {
      toast.error('Failed to revoke token');
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookUrl) return;
    try {
      await createWebhook(
        user!.id,
        webhookUrl,
        webhookEvents.split(',').map((e) => e.trim()),
        crypto.randomUUID()
      );
      const wh = await getWebhooks(user!.id);
      setWebhooks(wh ?? []);
      setWebhookUrl('');
      setShowWebhookDialog(false);
      toast.success('Webhook created');
    } catch {
      toast.error('Failed to create webhook');
    }
  };

  const handleTriggerWebhook = async (id: string) => {
    try {
      await triggerWebhook(id, 'test', { message: 'Test webhook' });
      toast.success('Webhook triggered');
    } catch {
      toast.error('Failed to trigger webhook');
    }
  };

  const filteredLogs = (logs as Record<string, unknown>[]).filter((l) => {
    if (logFilter && !(l.endpoint as string)?.toLowerCase().includes(logFilter.toLowerCase())) return false;
    if (methodFilter !== 'all' && l.method !== methodFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">API Management</h1>

      <Tabs defaultValue="logs">
        <TabsList className="mb-4">
          <TabsTrigger value="logs" className="gap-2"><ScrollText className="h-4 w-4" /> API Logs</TabsTrigger>
          <TabsTrigger value="tokens" className="gap-2"><Key className="h-4 w-4" /> Tokens</TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2"><Webhook className="h-4 w-4" /> Webhooks</TabsTrigger>
          <TabsTrigger value="docs" className="gap-2"><BookOpen className="h-4 w-4" /> Documentation</TabsTrigger>
          <TabsTrigger value="limits" className="gap-2"><Gauge className="h-4 w-4" /> Rate Limits</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <Card>
            <CardHeader><CardTitle>API Logs</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input placeholder="Filter by endpoint..." value={logFilter} onChange={(e) => setLogFilter(e.target.value)} />
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filteredLogs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Response Time</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.slice(0, 50).map((l, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-sm">{l.endpoint as string}</TableCell>
                          <TableCell><Badge variant="secondary">{l.method as string}</Badge></TableCell>
                          <TableCell>
                            <Badge className={
                              (l.status_code as number) >= 200 && (l.status_code as number) < 300
                                ? 'bg-green-600 hover:bg-green-600 text-white'
                                : (l.status_code as number) >= 400
                                ? 'bg-red-600 hover:bg-red-600 text-white'
                                : 'bg-yellow-600 hover:bg-yellow-600 text-white'
                            }>
                              {l.status_code as number}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{l.response_time_ms as number}ms</TableCell>
                          <TableCell className="text-sm">{format(new Date(l.created_at as string), 'MMM d, HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No API logs</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>API Tokens</CardTitle>
                <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4" /> Create Token</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create API Token</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Token Name</Label>
                        <Input placeholder="My API Token" value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Scopes (comma-separated)</Label>
                        <Input value={tokenScopes} onChange={(e) => setTokenScopes(e.target.value)} />
                      </div>
                      {newToken && (
                        <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950">
                          <p className="text-sm font-medium mb-1">Your new token (save it now, it won't be shown again):</p>
                          <code className="text-xs break-all">{newToken}</code>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setShowTokenDialog(false); setNewToken(null); }}>Close</Button>
                      <Button onClick={handleCreateToken}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {tokens.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Scopes</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokens.map((t: Record<string, unknown>, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{t.name as string}</TableCell>
                          <TableCell>{(t.scopes as string[])?.join(', ')}</TableCell>
                          <TableCell className="text-sm">{t.last_used ? format(new Date(t.last_used as string), 'MMM d, HH:mm') : 'Never'}</TableCell>
                          <TableCell>{t.is_active as boolean ? <Badge className="bg-green-600 hover:bg-green-600 text-white">Active</Badge> : <Badge variant="secondary">Revoked</Badge>}</TableCell>
                          <TableCell>
                            {t.is_active as boolean && (
                              <Button size="icon" variant="ghost" onClick={() => handleRevokeToken(t.id as string)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No API tokens</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Webhooks</CardTitle>
                <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4" /> Add Webhook</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create Webhook</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>URL</Label>
                        <Input placeholder="https://example.com/webhook" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
                      </div>
                      <div>
                        <Label>Events (comma-separated)</Label>
                        <Input value={webhookEvents} onChange={(e) => setWebhookEvents(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowWebhookDialog(false)}>Cancel</Button>
                      <Button onClick={handleCreateWebhook}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>Events</TableHead>
                        <TableHead>Last Triggered</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhooks.map((w: Record<string, unknown>, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-sm max-w-xs truncate">{w.url as string}</TableCell>
                          <TableCell className="text-sm">{(w.events as string[])?.join(', ')}</TableCell>
                          <TableCell className="text-sm">{w.last_triggered ? format(new Date(w.last_triggered as string), 'MMM d, HH:mm') : 'Never'}</TableCell>
                          <TableCell>{w.is_active as boolean ? <Badge className="bg-green-600 hover:bg-green-600 text-white">Active</Badge> : <Badge variant="secondary">Disabled</Badge>}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" onClick={() => handleTriggerWebhook(w.id as string)}>
                              <Zap className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No webhooks</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>API Documentation</CardTitle>
                {apiVersion && <Badge variant="secondary">v{apiVersion.version}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {apiDocs ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">Base URL: <code className="font-mono">{apiDocs.baseUrl}</code></p>
                  {apiDocs.endpoints.map((ep, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Badge className={
                        ep.method === 'GET' ? 'bg-blue-600 hover:bg-blue-600 text-white' :
                        ep.method === 'POST' ? 'bg-green-600 hover:bg-green-600 text-white' :
                        ep.method === 'PUT' ? 'bg-yellow-600 hover:bg-yellow-600 text-white' :
                        'bg-red-600 hover:bg-red-600 text-white'
                      }>{ep.method}</Badge>
                      <code className="font-mono text-sm">{ep.path}</code>
                      <span className="text-sm text-muted-foreground flex-1">{ep.description}</span>
                      {ep.auth && <Badge variant="outline">Auth</Badge>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No documentation available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits">
          <Card>
            <CardHeader><CardTitle>Rate Limits</CardTitle></CardHeader>
            <CardContent>
              {rateLimit ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Requests (Last Hour)</p>
                    <p className="text-2xl font-bold">{rateLimit.requestsInLastHour}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Limit</p>
                    <p className="text-2xl font-bold">{rateLimit.limit}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Remaining</p>
                    <p className="text-2xl font-bold text-green-500">{rateLimit.remaining}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No rate limit data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
