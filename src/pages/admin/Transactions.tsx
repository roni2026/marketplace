/**
 * Transactions — Admin transactions list with filters, stats, and export.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { exportData, downloadExport } from '@/lib/adminPortal';
import { format } from 'date-fns';
import { CreditCard, DollarSign, ShoppingCart, TrendingUp, Download, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Transaction {
  id: string; amount: number; status: string; transaction_type: string;
  buyer_id: string | null; seller_id: string | null; ad_id: string | null;
  created_at: string; reference: string | null;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, volume: 0, completed: 0, pending: 0 });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (typeFilter !== 'all') query = query.eq('transaction_type', typeFilter);
    const { data } = await query.limit(200);
    setTransactions((data as Transaction[]) || []);

    const [totalRes, completedRes, pendingRes] = await Promise.all([
      supabase.from('transactions').select('amount', { count: 'exact', head: true }),
      supabase.from('transactions').select('amount').eq('status', 'completed'),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    const completedVolume = (completedRes.data || []).reduce((sum, t) => sum + (t.amount || 0), 0);
    setStats({ total: totalRes.count ?? 0, volume: completedVolume, completed: completedRes.data?.length ?? 0, pending: pendingRes.count ?? 0 });
    setLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleExport = useCallback(async () => {
    const csv = await exportData('transactions', 'csv');
    if (csv) downloadExport(csv, 'transactions_export.csv', 'csv');
  }, [exportData, downloadExport]);

  const columns: Column<Transaction>[] = useMemo(() => [
    { key: 'id', label: 'ID', width: '70px', render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.id.slice(0, 8)}</span> },
    { key: 'transaction_type', label: 'Type', render: (r) => <Badge variant="info" className="text-[10px]">{r.transaction_type}</Badge> },
    { key: 'amount', label: 'Amount', sortable: true, sortValue: (r) => r.amount, align: 'right', render: (r) => <span className={`text-xs font-medium ${r.transaction_type === 'refund' || r.transaction_type === 'payout' ? 'text-red-600' : 'text-green-600'}`}>${r.amount?.toLocaleString() || 0}</span> },
    { key: 'status', label: 'Status', sortable: true, sortValue: (r) => r.status, render: (r) => <Badge variant={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'destructive' : 'warning'} className="text-[10px]">{r.status}</Badge> },
    { key: 'buyer_id', label: 'Buyer', render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.buyer_id?.slice(0, 8) || '—'}</span> },
    { key: 'seller_id', label: 'Seller', render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.seller_id?.slice(0, 8) || '—'}</span> },
    { key: 'created_at', label: 'Date', sortable: true, sortValue: (r) => r.created_at, render: (r) => <span className="text-[11px] text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy HH:mm')}</span> },
  ], []);

  return (
    <AdminLayout>
      <PageHeader title="Transactions" description={`${stats.total} total transactions`} actions={<Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExport}><Download className="h-3.5 w-3.5" /> Export</Button>} />
      <StatCardGrid>
        <StatCard title="Total Volume" value={`$${stats.volume.toLocaleString()}`} icon={DollarSign} color="green" loading={loading} />
        <StatCard title="Total Transactions" value={stats.total} icon={CreditCard} color="blue" loading={loading} />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="purple" loading={loading} />
        <StatCard title="Pending" value={stats.pending} icon={Clock} color="yellow" loading={loading} />
      </StatCardGrid>
      <div className="mt-4">
        <DataTable
          columns={columns} data={transactions} searchable searchPlaceholder="Search transactions..." searchKeys={['id', 'reference'] as any}
          pageSize={20} loading={loading} getRowId={(r) => r.id} emptyMessage="No transactions found" onExport={handleExport}
          filters={
            <>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /><SelectContent>
                  <SelectItem value="all">All Types</SelectItem><SelectItem value="sale">Sale</SelectItem><SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem><SelectItem value="deposit">Deposit</SelectItem><SelectItem value="escrow">Escrow</SelectItem>
                </SelectContent></SelectTrigger>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /><SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem><SelectItem value="refunded">Refunded</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent></SelectTrigger>
              </Select>
            </>
          }
        />
      </div>
    </AdminLayout>
  );
}
