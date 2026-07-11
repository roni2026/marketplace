/**
 * MessageModeration — Admin page for message moderation and spam monitoring.
 */

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getAllMessageReports, updateMessageReportStatus } from '@/lib/messagingSystem';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Flag, AlertCircle, CheckCircle2, XCircle, Eye, Search, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MessageReport } from '@/integrations/supabase/types_v8_messaging';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary', reviewing: 'default', resolved: 'outline', dismissed: 'destructive',
};

export default function MessageModeration() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<MessageReport | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('reviewing');
  const [adminNotes, setAdminNotes] = useState('');
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [spamReports, setSpamReports] = useState<MessageReport[]>([]);
  const [spamUsers, setSpamUsers] = useState<Array<{ userId: string; name: string; count: number }>>([]);

  const fetchReports = useCallback(async () => {
    const data = await getAllMessageReports();
    setReports(data as MessageReport[]);
    const userIds = [...new Set(data.flatMap(r => [r.reporter_id, r.reported_user_id]))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      if (profiles) {
        const map: Record<string, string> = {};
        profiles.forEach((p: any) => { map[p.user_id] = p.full_name || 'Unknown'; });
        setProfileMap(map);
      }
    }
    setIsLoading(false);
  }, []);

  const fetchSpamData = useCallback(async () => {
    const { data } = await supabase
      .from('message_reports')
      .select('*, reported:profiles!message_reports_reported_user_id_fkey(full_name)')
      .eq('reason', 'spam')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setSpamReports(data as MessageReport[]);
      const userCounts: Record<string, { name: string; count: number }> = {};
      data.forEach((r: any) => {
        const id = r.reported_user_id;
        const name = r.reported?.full_name || 'Unknown';
        if (!userCounts[id]) userCounts[id] = { name, count: 0 };
        userCounts[id].count++;
      });
      setSpamUsers(Object.entries(userCounts).map(([userId, info]) => ({ userId, name: info.name, count: info.count })).sort((a, b) => b.count - a.count));
    }
  }, []);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { navigate('/'); return; }
    if (isAdmin) { fetchReports(); fetchSpamData(); }
  }, [user, isAdmin, navigate, fetchReports, fetchSpamData]);

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;
    const success = await updateMessageReportStatus(selectedReport.id, newStatus, adminNotes, user?.id);
    if (success) {
      toast.success('Report status updated');
      setShowUpdateDialog(false);
      fetchReports();
      fetchSpamData();
    }
  };

  const openUpdateDialog = (report: MessageReport) => {
    setSelectedReport(report);
    setNewStatus(report.status);
    setAdminNotes(report.admin_notes || '');
    setShowUpdateDialog(true);
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const filtered = reports.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const reporterName = profileMap[r.reporter_id] || '';
      const reportedName = profileMap[r.reported_user_id] || '';
      if (!reporterName.toLowerCase().includes(q) && !reportedName.toLowerCase().includes(q) && !r.reason.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const dismissedCount = reports.filter(r => r.status === 'dismissed').length;

  return (
    <AdminLayout>
      <PageHeader
        title="Message Moderation"
        description="Review reported conversations and monitor spam activity"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Message Moderation' }]}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          <StatCardGrid>
            <StatCard title="Total Reports" value={String(reports.length)} icon={Flag} />
            <StatCard title="Pending" value={String(pendingCount)} icon={AlertCircle} />
            <StatCard title="Resolved" value={String(resolvedCount)} icon={CheckCircle2} />
            <StatCard title="Dismissed" value={String(dismissedCount)} icon={XCircle} />
          </StatCardGrid>

          <Tabs defaultValue="reports" className="mt-6">
            <TabsList>
              <TabsTrigger value="reports" className="gap-2"><Flag className="h-4 w-4" /> Reports</TabsTrigger>
              <TabsTrigger value="spam" className="gap-2"><Ban className="h-4 w-4" /> Spam Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="space-y-4">
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    className="w-full pl-8 pr-3 py-2 border rounded text-sm"
                    placeholder="Search by user or reason..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reporter</TableHead><TableHead>Reported User</TableHead>
                          <TableHead>Reason</TableHead><TableHead>Description</TableHead>
                          <TableHead>Status</TableHead><TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm">{profileMap[r.reporter_id] || 'Unknown'}</TableCell>
                            <TableCell className="text-sm">{profileMap[r.reported_user_id] || 'Unknown'}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs capitalize">{r.reason.replace(/_/g, ' ')}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{r.description || '—'}</TableCell>
                            <TableCell><Badge variant={STATUS_VARIANTS[r.status] || 'secondary'} className="capitalize">{r.status}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setSelectedReport(r)}><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => openUpdateDialog(r)}>Update</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filtered.length === 0 && (
                          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No reports found</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="spam" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Spam Reports</p>
                    <p className="text-2xl font-bold mt-1">{spamReports.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Flagged Users</p>
                    <p className="text-2xl font-bold mt-1">{spamUsers.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Users with 2+ Reports</p>
                    <p className="text-2xl font-bold mt-1">{spamUsers.filter(u => u.count >= 2).length}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Users with Multiple Spam Reports</h3>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>User</TableHead><TableHead className="text-right">Spam Reports</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {spamUsers.map(u => (
                        <TableRow key={u.userId}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="text-right"><Badge variant={u.count >= 3 ? 'destructive' : 'secondary'}>{u.count}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/users`)}>View User</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {spamUsers.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No spam reports</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Report Details Dialog */}
      <Dialog open={!!selectedReport && !showUpdateDialog} onOpenChange={open => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Report Details</DialogTitle></DialogHeader>
          {selectedReport && (
            <div className="space-y-3 py-2">
              <div><span className="text-xs text-muted-foreground">Reporter</span><p className="text-sm font-medium">{profileMap[selectedReport.reporter_id] || 'Unknown'}</p></div>
              <div><span className="text-xs text-muted-foreground">Reported User</span><p className="text-sm font-medium">{profileMap[selectedReport.reported_user_id] || 'Unknown'}</p></div>
              <div><span className="text-xs text-muted-foreground">Reason</span><p className="text-sm"><Badge variant="outline" className="capitalize">{selectedReport.reason.replace(/_/g, ' ')}</Badge></p></div>
              {selectedReport.description && <div><span className="text-xs text-muted-foreground">Description</span><p className="text-sm">{selectedReport.description}</p></div>}
              <div><span className="text-xs text-muted-foreground">Status</span><p className="text-sm"><Badge variant={STATUS_VARIANTS[selectedReport.status] || 'secondary'} className="capitalize">{selectedReport.status}</Badge></p></div>
              {selectedReport.admin_notes && <div><span className="text-xs text-muted-foreground">Admin Notes</span><p className="text-sm">{selectedReport.admin_notes}</p></div>}
              {selectedReport.screenshot_urls && selectedReport.screenshot_urls.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Screenshots</span>
                  <div className="flex gap-2 mt-1">
                    {selectedReport.screenshot_urls.map((url, i) => <img key={i} src={url} alt={`Screenshot ${i+1}`} className="h-20 w-20 rounded-md object-cover border" />)}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedReport(null)}>Close</Button>
                <Button onClick={() => openUpdateDialog(selectedReport)}>Update Status</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Update Report Status</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Admin Notes</Label><Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} placeholder="Internal notes..." className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
