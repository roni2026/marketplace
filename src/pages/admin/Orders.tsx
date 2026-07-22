import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, Column } from '@/components/admin/DataTable';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import {
  completeOrder,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  updateOrderStatus,
  type MarketplaceOrder,
} from '@/lib/orders';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';

type AdminOrder = MarketplaceOrder & {
  buyer_name?: string;
  seller_name?: string;
  product_name?: string;
};

export default function Orders() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_orders')
        .select('*, ads:ad_id(title, slug, price)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      let rows = (data as MarketplaceOrder[]) || [];
      const userIds = [...new Set(rows.flatMap((r) => [r.buyer_id, r.seller_id]))];
      let profileMap = new Map<string, { full_name: string | null }>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profileMap = new Map(
          (profiles || []).map((p: { user_id: string; full_name: string | null }) => [p.user_id, p]),
        );
      }

      const mapped: AdminOrder[] = rows.map((o) => ({
        ...o,
        buyer_name: profileMap.get(o.buyer_id)?.full_name || o.buyer_id.slice(0, 8),
        seller_name: profileMap.get(o.seller_id)?.full_name || o.seller_id.slice(0, 8),
        product_name: o.ads?.title || '—',
      }));
      setOrders(mapped);
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to load orders (apply marketplace_orders migration)',
      );
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin) fetchOrders();
  }, [user, isAdmin, navigate, fetchOrders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${o.order_number} ${o.product_name} ${o.buyer_name} ${o.seller_name} ${o.id}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  const stats = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length,
      meetup: orders.filter((o) => o.status === 'meetup_set').length,
      completed: orders.filter((o) => o.status === 'completed').length,
      disputed: orders.filter((o) => o.status === 'disputed').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
      gmv: orders
        .filter((o) => o.status === 'completed')
        .reduce((s, o) => s + Number(o.amount || 0), 0),
    }),
    [orders],
  );

  const forceStatus = async (order: AdminOrder, status: string) => {
    setBusy(true);
    try {
      if (status === 'completed' && user) {
        await completeOrder(order, user.id);
      } else {
        const patch: Record<string, string | null> = { status };
        if (status === 'cancelled') {
          patch.cancelled_at = new Date().toISOString();
          patch.cancel_reason = adminNote.trim() || 'Cancelled by admin';
        }
        if (adminNote.trim()) {
          patch.seller_notes = `[admin] ${adminNote.trim()}`;
        }
        await updateOrderStatus(order.id, patch);
      }
      toast.success(`Order → ${ORDER_STATUS_LABEL[status] || status}`);
      setSelected(null);
      setAdminNote('');
      fetchOrders();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const header = [
      'order_number',
      'status',
      'payment_status',
      'amount',
      'buyer',
      'seller',
      'product',
      'created_at',
    ];
    const lines = filtered.map((o) =>
      [
        o.order_number,
        o.status,
        o.payment_status,
        o.amount,
        o.buyer_name,
        o.seller_name,
        JSON.stringify(o.product_name || ''),
        o.created_at,
      ].join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  const columns: Column<AdminOrder>[] = [
    {
      key: 'order_number',
      label: 'Order',
      sortable: true,
      render: (o) => <span className="font-mono text-xs font-medium">{o.order_number}</span>,
    },
    {
      key: 'product_name',
      label: 'Listing',
      render: (o) => <span className="text-sm truncate max-w-[180px] block">{o.product_name}</span>,
    },
    {
      key: 'buyer_name',
      label: 'Buyer',
      render: (o) => <span className="text-sm">{o.buyer_name}</span>,
    },
    {
      key: 'seller_name',
      label: 'Seller',
      render: (o) => <span className="text-sm">{o.seller_name}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (o) => (
        <span className="font-medium text-sm tabular-nums">৳{Number(o.amount).toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (o) => (
        <Badge variant="outline" className="capitalize font-normal text-xs">
          {ORDER_STATUS_LABEL[o.status] || o.status}
        </Badge>
      ),
    },
    {
      key: 'payment_status',
      label: 'Payment',
      render: (o) => (
        <span className="text-xs capitalize text-muted-foreground">
          {PAYMENT_STATUS_LABEL[o.payment_status] || o.payment_status}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (o) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: 'id',
      label: '',
      render: (o) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(o);
            setAdminNote('');
          }}
        >
          Manage
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Orders"
        description="Real deals from accepted offers — confirm, meetup, complete, dispute"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Orders & Finance' },
          { label: 'Orders' },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={fetchOrders}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </>
        }
      />

      <StatCardGrid>
        <StatCard title="Total" value={stats.total} icon={ShoppingCart} color="blue" loading={isLoading} />
        <StatCard title="Active" value={stats.pending + stats.meetup} icon={Clock} color="yellow" loading={isLoading} />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle} color="green" loading={isLoading} />
        <StatCard title="Disputed" value={stats.disputed} icon={AlertTriangle} color="red" loading={isLoading} />
        <StatCard
          title="Completed GMV"
          value={`৳${stats.gmv.toLocaleString()}`}
          icon={CheckCircle}
          color="green"
          loading={isLoading}
        />
        <StatCard title="Cancelled" value={stats.cancelled} icon={XCircle} color="red" loading={isLoading} />
      </StatCardGrid>

      <div className="mt-6 flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search order #, buyer, seller, listing…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="meetup_set">Meetup set</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        getRowId={(o) => o.id}
        emptyMessage="No marketplace orders yet. They appear when a seller accepts an offer."
        onRowClick={(o) => {
          setSelected(o);
          setAdminNote('');
        }}
      />

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-base">{selected.order_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{ORDER_STATUS_LABEL[selected.status] || selected.status}</Badge>
                  <Badge variant="secondary">
                    {PAYMENT_STATUS_LABEL[selected.payment_status] || selected.payment_status}
                  </Badge>
                </div>
                <p>
                  <span className="text-muted-foreground">Listing:</span> {selected.product_name}
                </p>
                <p>
                  <span className="text-muted-foreground">Amount:</span> ৳
                  {Number(selected.amount).toLocaleString()}
                </p>
                <p>
                  <span className="text-muted-foreground">Buyer:</span> {selected.buyer_name}
                </p>
                <p>
                  <span className="text-muted-foreground">Seller:</span> {selected.seller_name}
                </p>
                {selected.meetup_location && (
                  <p>
                    <span className="text-muted-foreground">Meetup:</span> {selected.meetup_location}
                    {selected.meetup_at && (
                      <> · {format(new Date(selected.meetup_at), 'MMM d, yyyy h:mm a')}</>
                    )}
                  </p>
                )}
                {selected.cancel_reason && (
                  <p className="text-destructive text-xs">Cancel reason: {selected.cancel_reason}</p>
                )}
                <div className="space-y-2">
                  <Label>Admin note (optional)</Label>
                  <Textarea
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Internal note or cancel reason"
                  />
                </div>
              </div>
              <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {selected.status !== 'confirmed' && selected.status !== 'completed' && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => forceStatus(selected, 'confirmed')}>
                      Confirm
                    </Button>
                  )}
                  {selected.status !== 'completed' && (
                    <Button size="sm" disabled={busy} onClick={() => forceStatus(selected, 'completed')}>
                      Complete
                    </Button>
                  )}
                  {selected.status !== 'disputed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => forceStatus(selected, 'disputed')}
                    >
                      Dispute
                    </Button>
                  )}
                  {selected.status !== 'cancelled' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => forceStatus(selected, 'cancelled')}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
