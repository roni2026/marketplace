import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import {
  getFeatureFlags, toggleFeatureFlag, createFeatureFlag,
  getEnvironmentConfig, toggleDebugMode,
  getActivityEvents, testAPIEndpoint, getHealthCheck,
  getVersionInfo, getChangelog, getMaintenanceTools, runMaintenanceTask,
} from '@/lib/developer';
import { Flag, Settings, Bug, Activity, Zap, Heart, Info, Wrench, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function Developer() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [featureFlags, setFeatureFlags] = useState<unknown[]>([]);
  const [envConfig, setEnvConfig] = useState<Record<string, unknown> | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [activityEvents, setActivityEvents] = useState<unknown[]>([]);
  const [healthCheck, setHealthCheck] = useState<{ status: string; timestamp: string; checks: { service: string; status: string; latency?: string }[] } | null>(null);
  const [versionInfo, setVersionInfo] = useState<{ version: string; build: string; commit: string; branch: string; releasedAt: string } | null>(null);
  const [changelog, setChangelog] = useState<{ version: string; date: string; type: string; changes: string[] }[]>([]);
  const [maintenanceTools, setMaintenanceTools] = useState<Record<string, { available: boolean; lastRun: string }> | null>(null);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagKey, setFlagKey] = useState('');
  const [flagName, setFlagName] = useState('');
  const [flagDesc, setFlagDesc] = useState('');
  const [testMethod, setTestMethod] = useState('GET');
  const [testEndpoint, setTestEndpoint] = useState('');
  const [testBody, setTestBody] = useState('');
  const [testResult, setTestResult] = useState<unknown>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { navigate('/'); return; }
    if (isAdmin) fetchAll();
  }, [user, isAdmin, navigate]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [ff, ec, ae, hc, vi, cl, mt] = await Promise.all([
        getFeatureFlags().catch(() => []),
        getEnvironmentConfig().catch(() => null),
        getActivityEvents({ limit: 50 }).catch(() => []),
        getHealthCheck().catch(() => null),
        getVersionInfo().catch(() => null),
        getChangelog().catch(() => []),
        getMaintenanceTools().catch(() => null),
      ]);
      setFeatureFlags(ff ?? []);
      setEnvConfig(ec as typeof envConfig);
      setActivityEvents(ae ?? []);
      setHealthCheck(hc as typeof healthCheck);
      setVersionInfo(vi as typeof versionInfo);
      setChangelog(cl as typeof changelog);
      setMaintenanceTools(mt as typeof maintenanceTools);
    } catch {
      // tables may not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFlag = async (key: string, enabled: boolean) => {
    try {
      await toggleFeatureFlag(key, !enabled);
      const ff = await getFeatureFlags();
      setFeatureFlags(ff ?? []);
      toast.success(`Feature flag ${!enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to toggle feature flag');
    }
  };

  const handleCreateFlag = async () => {
    if (!flagKey || !flagName) return;
    try {
      await createFeatureFlag(flagKey, flagName, flagDesc);
      const ff = await getFeatureFlags();
      setFeatureFlags(ff ?? []);
      setShowFlagDialog(false);
      setFlagKey('');
      setFlagName('');
      setFlagDesc('');
      toast.success('Feature flag created');
    } catch {
      toast.error('Failed to create feature flag');
    }
  };

  const handleToggleDebug = async (enabled: boolean) => {
    try {
      await toggleDebugMode(enabled);
      setDebugMode(enabled);
      toast.success(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to toggle debug mode');
    }
  };

  const handleTestAPI = async () => {
    if (!testEndpoint) return;
    setIsTesting(true);
    try {
      const result = await testAPIEndpoint(
        testMethod,
        testEndpoint,
        testBody ? JSON.parse(testBody) : undefined
      );
      setTestResult(result);
    } catch {
      toast.error('API test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleRunMaintenance = async (task: string) => {
    try {
      await runMaintenanceTask(task);
      toast.success(`Maintenance task "${task}" completed`);
    } catch {
      toast.error('Maintenance task failed');
    }
  };

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
      <h1 className="text-2xl font-bold mb-6">Developer Tools</h1>

      <Tabs defaultValue="flags">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="flags" className="gap-2"><Flag className="h-4 w-4" /> Feature Flags</TabsTrigger>
          <TabsTrigger value="env" className="gap-2"><Settings className="h-4 w-4" /> Environment</TabsTrigger>
          <TabsTrigger value="debug" className="gap-2"><Bug className="h-4 w-4" /> Debug</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity className="h-4 w-4" /> Activity</TabsTrigger>
          <TabsTrigger value="testing" className="gap-2"><Zap className="h-4 w-4" /> API Testing</TabsTrigger>
          <TabsTrigger value="health" className="gap-2"><Heart className="h-4 w-4" /> Health</TabsTrigger>
          <TabsTrigger value="version" className="gap-2"><Info className="h-4 w-4" /> Version</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2"><Wrench className="h-4 w-4" /> Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="flags">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Feature Flags</CardTitle>
                <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4" /> Create Flag</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create Feature Flag</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Key</Label>
                        <Input placeholder="new_feature" value={flagKey} onChange={(e) => setFlagKey(e.target.value)} />
                      </div>
                      <div>
                        <Label>Name</Label>
                        <Input placeholder="New Feature" value={flagName} onChange={(e) => setFlagName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea placeholder="Description..." value={flagDesc} onChange={(e) => setFlagDesc(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowFlagDialog(false)}>Cancel</Button>
                      <Button onClick={handleCreateFlag}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {featureFlags.length > 0 ? (
                <div className="space-y-2">
                  {featureFlags.map((f: Record<string, unknown>, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm font-medium">{f.key as string}</code>
                          <Badge variant="secondary">{f.name as string}</Badge>
                        </div>
                        {f.description && <p className="text-sm text-muted-foreground mt-1">{f.description as string}</p>}
                      </div>
                      <Switch
                        checked={f.is_enabled as boolean}
                        onCheckedChange={() => handleToggleFlag(f.key as string, f.is_enabled as boolean)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No feature flags</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="env">
          <Card>
            <CardHeader><CardTitle>Environment Configuration</CardTitle></CardHeader>
            <CardContent>
              {envConfig ? (
                <div className="space-y-2">
                  {Object.entries(envConfig).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-sm text-muted-foreground">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No environment config</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug">
          <Card>
            <CardHeader><CardTitle>Debug Mode</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Enable Debug Mode</p>
                  <p className="text-sm text-muted-foreground">Enables verbose logging and debug UI elements</p>
                </div>
                <Switch checked={debugMode} onCheckedChange={handleToggleDebug} />
              </div>
              {debugMode && (
                <div className="mt-4 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950">
                  <p className="text-sm">
                    <Bug className="h-4 w-4 inline mr-2" />
                    Debug mode is active. All API calls and state changes will be logged to the console.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle>Activity Events</CardTitle></CardHeader>
            <CardContent>
              {activityEvents.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(activityEvents as Record<string, unknown>[]).slice(0, 30).map((e, i) => (
                        <TableRow key={i}>
                          <TableCell><Badge variant="secondary">{e.action as string}</Badge></TableCell>
                          <TableCell className="text-sm">{e.entity_type as string ?? '-'}</TableCell>
                          <TableCell className="text-sm">{e.created_at ? format(new Date(e.created_at as string), 'MMM d, HH:mm') : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No activity events</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing">
          <Card>
            <CardHeader><CardTitle>API Testing</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={testMethod} onValueChange={setTestMethod}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="https://api.example.com/endpoint" value={testEndpoint} onChange={(e) => setTestEndpoint(e.target.value)} className="flex-1" />
                  <Button onClick={handleTestAPI} disabled={isTesting}>
                    {isTesting ? 'Testing...' : 'Test'}
                  </Button>
                </div>
                {testMethod !== 'GET' && (
                  <Textarea placeholder="Request body (JSON)..." value={testBody} onChange={(e) => setTestBody(e.target.value)} />
                )}
                {testResult && (
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={
                        (testResult as { status: number }).status >= 200 && (testResult as { status: number }).status < 300
                          ? 'bg-green-600 hover:bg-green-600 text-white'
                          : 'bg-red-600 hover:bg-red-600 text-white'
                      }>
                        {(testResult as { status: number }).status} {(testResult as { statusText: string }).statusText}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{(testResult as { responseTime: string }).responseTime}</span>
                    </div>
                    <pre className="text-xs overflow-auto max-h-60 bg-muted p-3 rounded">
                      {JSON.stringify((testResult as { body: unknown }).body ?? (testResult as { error: string }).error, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader><CardTitle>Health Check</CardTitle></CardHeader>
            <CardContent>
              {healthCheck ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Overall Status:</span>
                    <Badge className={healthCheck.status === 'healthy' ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-yellow-600 hover:bg-yellow-600 text-white'}>
                      {healthCheck.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {healthCheck.checks.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                        <span className="font-medium">{c.service}</span>
                        <div className="flex items-center gap-2">
                          {c.latency && <span className="text-sm text-muted-foreground">{c.latency}</span>}
                          <Badge className={c.status === 'healthy' ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-red-600 hover:bg-red-600 text-white'}>
                            {c.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">Last checked: {format(new Date(healthCheck.timestamp), 'MMM d, yyyy HH:mm:ss')}</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No health check data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="version">
          <Card>
            <CardHeader><CardTitle>Version Info & Changelog</CardTitle></CardHeader>
            <CardContent>
              {versionInfo && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-6">
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Version</p>
                    <p className="text-2xl font-bold">{versionInfo.version}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Build</p>
                    <p className="text-lg font-bold">{versionInfo.build}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Commit</p>
                    <p className="text-lg font-bold font-mono">{versionInfo.commit}</p>
                  </div>
                </div>
              )}
              {changelog.length > 0 && (
                <div className="space-y-4">
                  {changelog.map((cl, i) => (
                    <div key={i} className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">v{cl.version}</Badge>
                        <Badge className={
                          cl.type === 'patch' ? 'bg-blue-600 hover:bg-blue-600 text-white' :
                          cl.type === 'minor' ? 'bg-green-600 hover:bg-green-600 text-white' :
                          'bg-orange-600 hover:bg-orange-600 text-white'
                        }>{cl.type}</Badge>
                        <span className="text-sm text-muted-foreground">{cl.date}</span>
                      </div>
                      <ul className="text-sm space-y-1">
                        {cl.changes.map((c, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader><CardTitle>Maintenance Tools</CardTitle></CardHeader>
            <CardContent>
              {maintenanceTools ? (
                <div className="space-y-2">
                  {Object.entries(maintenanceTools).map(([key, tool]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                        <p className="text-xs text-muted-foreground">Last run: {format(new Date(tool.lastRun), 'MMM d, yyyy HH:mm')}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!tool.available}
                        onClick={() => handleRunMaintenance(key)}
                      >
                        <Wrench className="h-4 w-4" /> Run
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No maintenance tools available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
