import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import {
  Line, LineChart, Area, AreaChart, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  getErrorLogs, getEmailQueue, getFailedJobs, retryFailedJob,
  getServerHealth, getDatabaseHealth, getCacheStatus, getStorageMonitoring,
  getUptime, getPerformanceMetrics,
} from '@/lib/systemMonitoring';
import { AlertCircle, Mail, AlertTriangle, Server, Database, HardDrive, Activity, Zap, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

export default function SystemMonitoring() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [errorLogs, setErrorLogs] = useState<unknown[]>([]);
  const [emailQueue, setEmailQueue] = useState<unknown[]>([]);
  const [failedJobs, setFailedJobs] = useState<unknown[]>([]);
  const [serverHealth, setServerHealth] = useState<{ cpu: { usage: number }; memory: { used: number; total: number; percentage: number }; disk: { used: number; total: number; percentage: number }; uptime: string } | null>(null);
  const [databaseHealth, setDatabaseHealth] = useState<{ status: string; connections: number; maxConnections: number; slowQueries: number; totalUsers: number; totalAds: number; avgQueryTime: string } | null>(null);
  const [cacheStatus, setCacheStatus] = useState<{ status: string; hitRate: number; missRate: number; keys: number; memoryUsed: string; memoryMax: string } | null>(null);
  const [storageMonitoring, setStorageMonitoring] = useState<{ totalUsed: string; totalQuota: string; percentage: number; files: number; images: number; avgFileSize: string } | null>(null);
  const [uptime, setUptime] = useState<{ uptime: string; checks: { hour: string; status: string; responseTime: number }[] } | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<{ avgResponseTime: number; p95ResponseTime: number; p99ResponseTime: number; requestsPerMinute: number; errorRate: number; data: { hour: string; responseTime: number; requests: number }[] } | null>(null);
  const [errorLevelFilter, setErrorLevelFilter] = useState('all');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) fetchAll();
  }, [user, isAdmin, navigate]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [el, eq, fj, sh, dh, cs, sm, ut, pm] = await Promise.all([
        getErrorLogs({ limit: 100 }).catch(() => []),
        getEmailQueue().catch(() => []),
        getFailedJobs().catch(() => []),
        getServerHealth().catch(() => null),
        getDatabaseHealth().catch(() => null),
        getCacheStatus().catch(() => null),
        getStorageMonitoring().catch(() => null),
        getUptime().catch(() => null),
        getPerformanceMetrics().catch(() => null),
      ]);
      setErrorLogs(el ?? []);
      setEmailQueue(eq ?? []);
      setFailedJobs(fj ?? []);
      setServerHealth(sh as typeof serverHealth);
      setDatabaseHealth(dh as typeof databaseHealth);
      setCacheStatus(cs as typeof cacheStatus);
      setStorageMonitoring(sm as typeof storageMonitoring);
      setUptime(ut as typeof uptime);
      setPerformanceMetrics(pm as typeof performanceMetrics);
    } catch {
      // tables may not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await retryFailedJob(jobId);
      const fj = await getFailedJobs();
      setFailedJobs(fj ?? []);
      toast.success('Job retry initiated');
    } catch {
      toast.error('Failed to retry job');
    }
  };

  const filteredErrors = (errorLogs as Record<string, unknown>[]).filter((e) => {
    if (errorLevelFilter !== 'all' && e.level !== errorLevelFilter) return false;
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
      <h1 className="text-2xl font-bold mb-6">System Monitoring</h1>

      <Tabs defaultValue="errors">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="errors" className="gap-2"><AlertCircle className="h-4 w-4" /> Errors</TabsTrigger>
          <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" /> Email Queue</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2"><AlertTriangle className="h-4 w-4" /> Failed Jobs</TabsTrigger>
          <TabsTrigger value="server" className="gap-2"><Server className="h-4 w-4" /> Server</TabsTrigger>
          <TabsTrigger value="database" className="gap-2"><Database className="h-4 w-4" /> Database</TabsTrigger>
          <TabsTrigger value="cache" className="gap-2"><Zap className="h-4 w-4" /> Cache</TabsTrigger>
          <TabsTrigger value="storage" className="gap-2"><HardDrive className="h-4 w-4" /> Storage</TabsTrigger>
          <TabsTrigger value="uptime">Uptime</TabsTrigger>
          <TabsTrigger value="performance" className="gap-2"><Activity className="h-4 w-4" /> Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Error Logs</CardTitle>
                <Select value={errorLevelFilter} onValueChange={setErrorLevelFilter}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredErrors.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Level</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredErrors.slice(0, 50).map((e, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Badge className={
                              e.level === 'critical' ? 'bg-red-600 hover:bg-red-600 text-white' :
                              e.level === 'error' ? 'bg-orange-600 hover:bg-orange-600 text-white' :
                              e.level === 'warning' ? 'bg-yellow-600 hover:bg-yellow-600 text-white' :
                              'bg-blue-600 hover:bg-blue-600 text-white'
                            }>{e.level as string}</Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-md truncate">{e.message as string}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{e.url as string ?? '-'}</TableCell>
                          <TableCell className="text-sm">{format(new Date(e.created_at as string), 'MMM d, HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No error logs</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader><CardTitle>Email Queue</CardTitle></CardHeader>
            <CardContent>
              {emailQueue.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>To</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(emailQueue as Record<string, unknown>[]).slice(0, 50).map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{e.to_email as string}</TableCell>
                          <TableCell className="text-sm">{e.subject as string}</TableCell>
                          <TableCell>
                            <Badge className={
                              e.status === 'sent' ? 'bg-green-600 hover:bg-green-600 text-white' :
                              e.status === 'failed' ? 'bg-red-600 hover:bg-red-600 text-white' :
                              'bg-yellow-600 hover:bg-yellow-600 text-white'
                            }>{e.status as string}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{e.attempts as number}</TableCell>
                          <TableCell className="text-sm">{format(new Date(e.created_at as string), 'MMM d, HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Email queue is empty</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader><CardTitle>Failed Jobs</CardTitle></CardHeader>
            <CardContent>
              {failedJobs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Failed At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(failedJobs as Record<string, unknown>[]).map((j, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{j.job_type as string}</TableCell>
                          <TableCell className="text-sm text-red-500 max-w-md truncate">{j.error as string ?? '-'}</TableCell>
                          <TableCell className="text-sm">{j.attempts as number}</TableCell>
                          <TableCell className="text-sm">{format(new Date(j.failed_at as string), 'MMM d, HH:mm')}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => handleRetry(j.id as string)}>
                              <RotateCcw className="h-4 w-4" /> Retry
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No failed jobs</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server">
          <Card>
            <CardHeader><CardTitle>Server Health</CardTitle></CardHeader>
            <CardContent>
              {serverHealth ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">CPU Usage</p>
                    <p className="text-2xl font-bold">{serverHealth.cpu.usage}%</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Memory</p>
                    <p className="text-2xl font-bold">{serverHealth.memory.percentage}%</p>
                    <p className="text-xs text-muted-foreground">{serverHealth.memory.used} / {serverHealth.memory.total} GB</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Disk</p>
                    <p className="text-2xl font-bold">{serverHealth.disk.percentage}%</p>
                    <p className="text-xs text-muted-foreground">{serverHealth.disk.used} / {serverHealth.disk.total} GB</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Uptime</p>
                    <p className="text-2xl font-bold text-lg">{serverHealth.uptime}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No server health data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader><CardTitle>Database Health</CardTitle></CardHeader>
            <CardContent>
              {databaseHealth ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className="bg-green-600 hover:bg-green-600 text-white text-base">{databaseHealth.status}</Badge>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Connections</p>
                    <p className="text-2xl font-bold">{databaseHealth.connections}/{databaseHealth.maxConnections}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Slow Queries</p>
                    <p className="text-2xl font-bold">{databaseHealth.slowQueries}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{databaseHealth.totalUsers}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Total Ads</p>
                    <p className="text-2xl font-bold">{databaseHealth.totalAds}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Avg Query Time</p>
                    <p className="text-2xl font-bold">{databaseHealth.avgQueryTime}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No database health data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache">
          <Card>
            <CardHeader><CardTitle>Cache Status</CardTitle></CardHeader>
            <CardContent>
              {cacheStatus ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className="bg-green-600 hover:bg-green-600 text-white text-base">{cacheStatus.status}</Badge>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Hit Rate</p>
                    <p className="text-2xl font-bold text-green-500">{cacheStatus.hitRate}%</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Miss Rate</p>
                    <p className="text-2xl font-bold text-red-500">{cacheStatus.missRate}%</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Keys</p>
                    <p className="text-2xl font-bold">{cacheStatus.keys}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Memory Used</p>
                    <p className="text-2xl font-bold">{cacheStatus.memoryUsed}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Memory Max</p>
                    <p className="text-2xl font-bold">{cacheStatus.memoryMax}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No cache data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card>
            <CardHeader><CardTitle>Storage Monitoring</CardTitle></CardHeader>
            <CardContent>
              {storageMonitoring ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Total Used</p>
                    <p className="text-2xl font-bold">{storageMonitoring.totalUsed}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Total Quota</p>
                    <p className="text-2xl font-bold">{storageMonitoring.totalQuota}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Usage</p>
                    <p className="text-2xl font-bold">{storageMonitoring.percentage}%</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Files</p>
                    <p className="text-2xl font-bold">{storageMonitoring.files}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Images</p>
                    <p className="text-2xl font-bold">{storageMonitoring.images}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Avg File Size</p>
                    <p className="text-2xl font-bold">{storageMonitoring.avgFileSize}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No storage data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uptime">
          <Card>
            <CardHeader><CardTitle>Uptime Monitoring</CardTitle></CardHeader>
            <CardContent>
              {uptime ? (
                <div>
                  <div className="mb-4">
                    <Badge className="bg-green-600 hover:bg-green-600 text-white text-lg">{uptime.uptime}</Badge>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={uptime.checks}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="responseTime" stroke="#82ca9d" name="Response Time (ms)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No uptime data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader><CardTitle>Performance Metrics</CardTitle></CardHeader>
            <CardContent>
              {performanceMetrics ? (
                <div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Avg Response</p>
                      <p className="text-2xl font-bold">{performanceMetrics.avgResponseTime}ms</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">P95 Response</p>
                      <p className="text-2xl font-bold">{performanceMetrics.p95ResponseTime}ms</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Req/Min</p>
                      <p className="text-2xl font-bold">{performanceMetrics.requestsPerMinute}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Error Rate</p>
                      <p className="text-2xl font-bold text-red-500">{performanceMetrics.errorRate}%</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={performanceMetrics.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="responseTime" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Response Time (ms)" />
                      <Area type="monotone" dataKey="requests" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} name="Requests" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No performance data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
