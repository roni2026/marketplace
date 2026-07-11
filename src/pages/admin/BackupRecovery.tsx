import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import {
  createBackup, getBackupHistory, restoreBackup,
  createBackupSchedule, getDisasterRecoveryStatus,
  getVersionSnapshots, exportDatabase, backupMedia,
} from '@/lib/backup';
import { Database, HardDrive, Download, RotateCcw, Calendar, Shield, Archive, Image } from 'lucide-react';
import { format } from 'date-fns';

export default function BackupRecovery() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [backups, setBackups] = useState<unknown[]>([]);
  const [drStatus, setDrStatus] = useState<{ status: string; lastDRTest: string; rto: string; rpo: string; replicationLag: string; standbyRegion: string; failoverEnabled: boolean } | null>(null);
  const [snapshots, setSnapshots] = useState<{ version: string; date: string; size: string; status: string }[]>([]);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreId, setRestoreId] = useState('');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState('daily');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { navigate('/'); return; }
    if (isAdmin) fetchAll();
  }, [user, isAdmin, navigate]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [bh, dr, vs] = await Promise.all([
        getBackupHistory().catch(() => []),
        getDisasterRecoveryStatus().catch(() => null),
        getVersionSnapshots().catch(() => []),
      ]);
      setBackups(bh ?? []);
      setDrStatus(dr as typeof drStatus);
      setSnapshots(vs as typeof snapshots);
    } catch {
      // tables may not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      await createBackup('manual');
      const bh = await getBackupHistory();
      setBackups(bh ?? []);
      toast.success('Backup created successfully');
    } catch {
      toast.error('Failed to create backup');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreId) return;
    try {
      await restoreBackup(restoreId);
      setShowRestoreDialog(false);
      setRestoreId('');
      toast.success('Restore process initiated');
    } catch {
      toast.error('Restore failed');
    }
  };

  const handleSchedule = async () => {
    try {
      await createBackupSchedule(scheduleFreq);
      setShowScheduleDialog(false);
      toast.success(`Automatic ${scheduleFreq} backups scheduled`);
    } catch {
      toast.error('Failed to schedule backups');
    }
  };

  const handleExportDb = async () => {
    try {
      await exportDatabase();
      toast.success('Database export started');
    } catch {
      toast.error('Database export failed');
    }
  };

  const handleBackupMedia = async () => {
    try {
      await backupMedia();
      toast.success('Media backup started');
    } catch {
      toast.error('Media backup failed');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
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
      <h1 className="text-2xl font-bold mb-6">Backup & Recovery</h1>

      <Tabs defaultValue="backups">
        <TabsList className="mb-4">
          <TabsTrigger value="backups" className="gap-2"><Database className="h-4 w-4" /> Backups</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2"><Calendar className="h-4 w-4" /> Schedule</TabsTrigger>
          <TabsTrigger value="dr" className="gap-2"><Shield className="h-4 w-4" /> Disaster Recovery</TabsTrigger>
          <TabsTrigger value="snapshots" className="gap-2"><Archive className="h-4 w-4" /> Snapshots</TabsTrigger>
          <TabsTrigger value="export" className="gap-2"><Download className="h-4 w-4" /> Export</TabsTrigger>
        </TabsList>

        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Backup History</CardTitle>
                <Button onClick={handleCreateBackup} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Backup'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {backups.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(backups as Record<string, unknown>[]).map((b, i) => (
                        <TableRow key={i}>
                          <TableCell><Badge variant="secondary">{b.type as string}</Badge></TableCell>
                          <TableCell>
                            <Badge className={
                              b.status === 'completed' ? 'bg-green-600 hover:bg-green-600 text-white' :
                              b.status === 'failed' ? 'bg-red-600 hover:bg-red-600 text-white' :
                              'bg-yellow-600 hover:bg-yellow-600 text-white'
                            }>{b.status as string}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{b.size_bytes ? formatBytes(b.size_bytes as number) : '-'}</TableCell>
                          <TableCell className="text-sm">{format(new Date(b.started_at as string), 'MMM d, HH:mm')}</TableCell>
                          <TableCell className="text-sm">{b.completed_at ? format(new Date(b.completed_at as string), 'MMM d, HH:mm') : '-'}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRestoreId(b.id as string);
                                setShowRestoreDialog(true);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" /> Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No backups available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader><CardTitle>Backup Schedule</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Configure automatic backup frequency.</p>
                <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                  <DialogTrigger asChild>
                    <Button><Calendar className="h-4 w-4" /> Configure Schedule</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Backup Schedule</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Frequency</Label>
                        <Select value={scheduleFreq} onValueChange={setScheduleFreq}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
                      <Button onClick={handleSchedule}>Schedule</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dr">
          <Card>
            <CardHeader><CardTitle>Disaster Recovery Status</CardTitle></CardHeader>
            <CardContent>
              {drStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge className={drStatus.status === 'ready' ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-yellow-600 hover:bg-yellow-600 text-white'}>
                      {drStatus.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">RTO</p>
                      <p className="text-xl font-bold">{drStatus.rto}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">RPO</p>
                      <p className="text-xl font-bold">{drStatus.rpo}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Replication Lag</p>
                      <p className="text-xl font-bold">{drStatus.replicationLag}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Standby Region</p>
                      <p className="text-xl font-bold">{drStatus.standbyRegion}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Failover</p>
                      <Badge className={drStatus.failoverEnabled ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-red-600 hover:bg-red-600 text-white'}>
                        {drStatus.failoverEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Last DR Test</p>
                      <p className="text-sm font-bold">{format(new Date(drStatus.lastDRTest), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No DR status available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots">
          <Card>
            <CardHeader><CardTitle>Version Snapshots</CardTitle></CardHeader>
            <CardContent>
              {snapshots.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Version</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshots.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium"><Badge variant="secondary">{s.version}</Badge></TableCell>
                          <TableCell className="text-sm">{s.date}</TableCell>
                          <TableCell className="text-sm">{s.size}</TableCell>
                          <TableCell>
                            <Badge className={s.status === 'available' ? 'bg-green-600 hover:bg-green-600 text-white' : 'bg-gray-500 hover:bg-gray-500 text-white'}>
                              {s.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No snapshots available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader><CardTitle>Database & Media Export</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" onClick={handleExportDb}>
                  <Download className="h-4 w-4" /> Export Database
                </Button>
                <Button variant="outline" onClick={handleBackupMedia}>
                  <Image className="h-4 w-4" /> Backup Media
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore from Backup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950">
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ Restoring from a backup will overwrite current data. This action cannot be undone.
              </p>
            </div>
            <p className="text-sm">Are you sure you want to restore from this backup?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRestore}>Restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
