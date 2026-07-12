/**
 * Payouts — Admin payout management with status filter and process/complete/fail actions.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { exportData, downloadExport } from '@/lib/adminPortal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Wallet, DollarSign, CheckCircle2, XCircle, Clock, Download, AlertTriangle } from 'lucide-react';

interface Payout {
  id: string; seller_id: string; amount: number; status: string;
  created_at: string; processed_at: string | null; failure_reason: string | null;
  reference: string | null;
}

export default function Payouts() {
  const { user } = useAuth();
  const { logActivity } = useAdminPortal();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ pending: 0, pendingAmount: 0, completed: 0, completedAmount: 0, failed: 0 });
  const [confirmAction, setConfirmAction] = useState<{ payout: Payout; action: string } | null>(null);
  const [failReason, setFailReason] = useState('');

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('payouts').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data } = await query.limit(200);
    setPayouts((data as Payout[]) || []);

    const [pendingRes, pendingAmtRes, completedRes, completedAmtRes, failedRes] = await Promise.all([
      supabase.from('payouts').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('payouts').select('amount').eq('status', 'pending'),
      supabase.from('payouts').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('payouts').select('amount').eq('status', 'completed'),
      supabase.from('payouts').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    ]);
    setStats({
      pending: pendingRes.count ?? 0,
      pendingAmount: (pendingAmtRes.data || []).reduce((s, p) => s + (p.amount || 0), 0),
      completed: completedRes.count ?? 0,
      completedAmount: (completedAmtRes.data || []).reduce((s, p) => s + (p.amount || 0), 0),
      failed: failedRes.count ?? 0,
    });
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const handleAction = useCallback(async (payout: Payout, action: string, reason?: string) => {
    const statusMap: Record<string, string> = { process: 'processing', complete: 'completed', fail: 'failed' };
    const updates: any = { status: statusMap[action] };
    if (action === 'complete' || action === 'fail') updates.processed_at = new Date().toISOString();
    if (action === 'fail') updates.failure_reason = reason || 'Failed by admin';
    const { error } = await supabase.from('payouts').update(updates).eq('id', payout.id);
    if (error) { toast.error('Failed to update payout'); return; }
    if (user) await logActivity(`${action}_payout`, 'payout', payout.id, { amount: payout.amount });
    toast.success(`Payout ${action}ed`);
    fetchPayouts();
  }, [user, logActivity, fetchPayouts]);

  const handleExport = useCallback(async () => {
    const csv = await exportData('payouts', 'csv');
    if (csv) downloadExport(csv, 'payouts_export.csv', 'csv');
  }, [exportData, downloadExport]);

  const columns: Column<Payout>[] = useMemo(() => [
    { key: 'id', label: 'ID', width: '70px', render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.id.slice(0, 8)}</span> },
    { key: 'seller_id', label: 'Seller', render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.seller_id?.slice(0, 10)}</span> },
    { key: 'amount', label: 'Amount', sortable: true, sortValue: (r) => r.amount, align: 'right', render: (r) => <span className="text-xs font-medium text-green-600">${r.amount?.toLocaleString() || 0}</span> },
    { key: 'status', label: 'Status', sortable: true, sortValue: (r) => r.status, render: (r) => <Badge variant={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'destructive' : r.status === 'processing' ? 'info' : 'warning'} className="text-[10px]">{r.status}</Badge> },
    { key: 'created_at', label: 'Created', sortable: true, sortValue: (r) => r.created_at, render: (r) => <span className="text-[11px] text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy')}</span> },
    { key: 'processed_at', label: 'Processed', render: (r) => <span className="text-[11px] text-muted-foreground">{r.processed_at ? format(new Date(r.processed_at), 'MMM d, yyyy') : '—'}</span> },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          {(r.status === 'pending' || r.status === 'processing') && (
            <>
              {r.status === 'pending' && <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600" onClick={() => handleAction(r, 'process')} title="Process"><Clock className="h-3.5 w-3.5" /></Button>}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600" onClick={() => handleAction(r, 'complete')} title="Complete"><CheckCircle2 className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600" onClick={() => { setConfirmAction({ payout: r, action: 'fail' }); setFailReason(''); }} title="Fail"><XCircle className="h-3.5 w-3.5" /></Button>
            </>
          )}
        </div>
      ),
    },
  ], [handleAction]);

  return (
    <AdminLayout>
      <PageHeader title="Payout Management" description={`${stats.pending} pending payouts`} actions={<Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExport}><Download className="h-3.5 w-3.5" /> Export</Button>} />
      <StatCardGrid>
        <StatCard title="Pending" value={stats.pending} icon={Clock} color="yellow" loading={loading} />
        <StatCard title="Pending Amount" value={`$${stats.pendingAmount.toLocaleString()}`} icon={Wallet} color="blue" loading={loading} />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="green" loading={loading} />
        <StatCard title="Completed Volume" value={`$${stats.completedAmount.toLocaleString()}`} icon={DollarSign} color="purple" loading={loading} />
        <StatCard title="Failed" value={stats.failed} icon={XCircle} color="red" loading={loading} />
      </StatCardGrid>
      <div className="mt-4">
        <DataTable
          columns={columns} data={payouts} searchable searchPlaceholder="Search payouts..." searchKeys={['id', 'seller_id'] as any}
          pageSize={20} loading={loading} getRowId={(r) => r.id} emptyMessage="No payouts found" onExport={handleExport}
          filters={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /><SelectContent>
                <SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem><SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent></SelectTrigger>
            </Select>
          }
        />
      </div>
      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) { setConfirmAction(null); setFailReason(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Fail Payout</DialogTitle><DialogDescription className="text-xs">Provide a reason for failing this payout:</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label className="text-xs">Failure Reason</Label><Textarea value={failReason} onChange={(e) => setFailReason(e.target.value)} placeholder="Reason..." className="text-xs" maxLength={500} /></div>
          <DialogFooter><Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setConfirmAction(null); setFailReason(''); }}>Cancel</Button><Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => { if (confirmAction) handleAction(confirmAction.payout, 'fail', failReason); setConfirmAction(null); setFailReason(''); }}>Fail Payout</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
