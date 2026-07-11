/**
 * SellerReports — Admin page for reviewing seller reports.
 */

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { getAllSellerReports, updateSellerReportStatus } from '@/lib/marketplaceExperience';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Flag, AlertCircle, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SellerReport } from '@/integrations/supabase/types_v6_marketplace';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary', reviewing: 'default', resolved: 'outline', dismissed: 'destructive',
};

export default function SellerReports() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<SellerReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<SellerReport | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('reviewing');
  const [adminNotes, setAdminNotes] = useState('');
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

  const fetchReports = useCallback(async () => {
    const data = await getAllSellerReports();
    setReports(data as SellerReport[]);
    // Fetch profile names
    const userIds = [...new Set(data.flatMap(r => [r.reporter_id, r.seller_id]))];
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

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { navigate('/'); return; }
    if (isAdmin) fetchReports();
  }, [user, isAdmin, navigate, fetchReports]);

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;
    const success = await updateSellerReportStatus(selectedReport.id, newStatus, adminNotes, user?.id);
    if (success) {
      toast.success('Report status updated');
      setShowUpdateDialog(false);
      fetchReports();
    }
  };

  const openUpdateDialog = (report: SellerReport) => {
    setSelectedReport(report);
    setNewStatus(report.status);
    setAdminNotes(report.admin_notes || '');
    setShowUpdateDialog(true);
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const filtered = statusFilter === 'all' ? reports : reports.filter(r => r.status === statusFilter);
  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const dismissedCount = reports.filter(r => r.status === 'dismissed').length;

  return (
    <AdminLayout>
      <PageHeader
        title="Seller Reports"
        description="Review and moderate seller reports submitted by users"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Seller Reports' }]}
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

          <div className="mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reporter</TableHead><TableHead>Reported Seller</TableHead>
                      <TableHead>Reason</TableHead><TableHead>Reason Code</TableHead>
                      <TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{profileMap[r.reporter_id] || 'Unknown'}</TableCell>
                        <TableCell className="text-sm">{profileMap[r.seller_id] || 'Unknown'}</TableCell>
                        <TableCell className="text-sm">{r.reason}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.reason_code}</Badge></TableCell>
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
        </>
      )}

      {/* Report Details Dialog */}
      <Dialog open={!!selectedReport && !showUpdateDialog} onOpenChange={open => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Report Details</DialogTitle></DialogHeader>
          {selectedReport && (
            <div className="space-y-3 py-2">
              <div><span className="text-xs text-muted-foreground">Reporter</span><p className="text-sm font-medium">{profileMap[selectedReport.reporter_id] || 'Unknown'}</p></div>
              <div><span className="text-xs text-muted-foreground">Reported Seller</span><p className="text-sm font-medium">{profileMap[selectedReport.seller_id] || 'Unknown'}</p></div>
              <div><span className="text-xs text-muted-foreground">Reason</span><p className="text-sm font-medium">{selectedReport.reason}</p></div>
              <div><span className="text-xs text-muted-foreground">Reason Code</span><p className="text-sm"><Badge variant="outline">{selectedReport.reason_code}</Badge></p></div>
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
            <div><Label>Admin Notes</Label><Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} placeholder="Internal notes about this report..." className="mt-1" /></div>
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
