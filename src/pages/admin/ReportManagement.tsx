/**
 * ReportManagement — Admin report queue with filters, actions, and export.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { exportData, downloadExport } from '@/lib/adminPortal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Flag, CheckCircle2, ArrowUp, XCircle, Download, AlertTriangle } from 'lucide-react';

interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  description: string | null;
  status: string;
  report_type: string;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export default function ReportManagement() {
  const { user } = useAuth();
  const { logActivity } = useAdminPortal();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, escalated: 0 });
  const [confirmAction, setConfirmAction] = useState<{ report: Report; action: string } | null>(null);
  const [noteText, setNoteText] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (typeFilter !== 'all') query = query.eq('report_type', typeFilter);
    const { data } = await query.limit(200);
    setReports((data as Report[]) || []);

    const [totalRes, pendingRes, resolvedRes, escalatedRes] = await Promise.all([
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'escalated'),
    ]);
    setStats({ total: totalRes.count ?? 0, pending: pendingRes.count ?? 0, resolved: resolvedRes.count ?? 0, escalated: escalatedRes.count ?? 0 });
    setLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleAction = useCallback(async (report: Report, action: string, note?: string) => {
    const statusMap: Record<string, string> = { resolve: 'resolved', escalate: 'escalated', close: 'closed' };
    const { error } = await supabase
      .from('reports')
      .update({ status: statusMap[action], resolved_at: new Date().toISOString(), resolution_note: note || null })
      .eq('id', report.id);
    if (error) { toast.error('Failed to update report'); return; }
    if (user) await logActivity(`${action}_report`, 'report', report.id, { note });
    toast.success(`Report ${action}d`);
    fetchReports();
  }, [user, logActivity, fetchReports]);

  const handleExport = useCallback(async () => {
    const csv = await exportData('reports', 'csv');
    if (csv) downloadExport(csv, 'reports_export.csv', 'csv');
  }, [exportData, downloadExport]);

  const columns: Column<Report>[] = useMemo(() => [
    { key: 'id', label: 'ID', width: '60px', render: (r) => <span className="text-[11px] text-muted-foreground">{r.id.slice(0, 8)}</span> },
    { key: 'report_type', label: 'Type', render: (r) => <Badge variant="info" className="text-[10px]">{r.report_type}</Badge> },
    { key: 'reason', label: 'Reason', sortable: true, sortValue: (r) => r.reason, render: (r) => <span className="text-xs font-medium">{r.reason}</span> },
    { key: 'description', label: 'Description', render: (r) => <span className="text-xs text-muted-foreground truncate block max-w-xs">{r.description || '—'}</span> },
    {
      key: 'status', label: 'Status', sortable: true, sortValue: (r) => r.status,
      render: (r) => <Badge variant={r.status === 'resolved' ? 'success' : r.status === 'escalated' ? 'destructive' : r.status === 'closed' ? 'secondary' : 'warning'} className="text-[10px]">{r.status}</Badge>,
    },
    { key: 'created_at', label: 'Created', sortable: true, sortValue: (r) => r.created_at, render: (r) => <span className="text-[11px] text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy')}</span> },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          {r.status !== 'resolved' && r.status !== 'closed' && (
            <>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600" onClick={() => { setConfirmAction({ report: r, action: 'resolve' }); setNoteText(''); }} title="Resolve"><CheckCircle2 className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-600" onClick={() => { setConfirmAction({ report: r, action: 'escalate' }); setNoteText(''); }} title="Escalate"><ArrowUp className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => { setConfirmAction({ report: r, action: 'close' }); setNoteText(''); }} title="Close"><XCircle className="h-3.5 w-3.5" /></Button>
            </>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <AdminLayout>
      <PageHeader title="Reports" description={`${stats.total} total reports`} actions={<Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExport}><Download className="h-3.5 w-3.5" /> Export</Button>} />
      <StatCardGrid>
        <StatCard title="Total Reports" value={stats.total} icon={Flag} color="blue" loading={loading} />
        <StatCard title="Pending" value={stats.pending} icon={AlertTriangle} color="yellow" loading={loading} />
        <StatCard title="Resolved" value={stats.resolved} icon={CheckCircle2} color="green" loading={loading} />
        <StatCard title="Escalated" value={stats.escalated} icon={ArrowUp} color="red" loading={loading} />
      </StatCardGrid>
      <div className="mt-4">
        <DataTable
          columns={columns} data={reports} searchable searchPlaceholder="Search reports..." searchKeys={['reason', 'description'] as any}
          pageSize={15} loading={loading} getRowId={(r) => r.id} emptyMessage="No reports found" onExport={handleExport}
          filters={
            <>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="listing">Listing</SelectItem><SelectItem value="user">User</SelectItem><SelectItem value="message">Message</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></SelectTrigger>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="reviewing">Reviewing</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="escalated">Escalated</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></SelectTrigger>
              </Select>
            </>
          }
        />
      </div>
      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) { setConfirmAction(null); setNoteText(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">{confirmAction?.action === 'resolve' ? 'Resolve Report' : confirmAction?.action === 'escalate' ? 'Escalate Report' : 'Close Report'}</DialogTitle><DialogDescription className="text-xs">Add a resolution note (optional):</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label className="text-xs">Note</Label><Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Resolution note..." className="text-xs" maxLength={500} /></div>
          <DialogFooter><Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setConfirmAction(null); setNoteText(''); }}>Cancel</Button><Button size="sm" className="h-8 text-xs" onClick={() => { if (confirmAction) handleAction(confirmAction.report, confirmAction.action, noteText); setConfirmAction(null); setNoteText(''); }}>{confirmAction?.action === 'resolve' ? 'Resolve' : confirmAction?.action === 'escalate' ? 'Escalate' : 'Close'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
