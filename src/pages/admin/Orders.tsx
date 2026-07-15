import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, Column } from '@/components/admin/DataTable';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { format, subDays } from 'date-fns';
import {
  ShoppingCart, Download, Truck, Package, Clock, CheckCircle,
  XCircle, DollarSign, TrendingUp,
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'paid' | 'pending' | 'failed' | 'refunded';
  created_at: string;
}

// Orders are fetched from the database (offers table or a dedicated orders table).

export default function Orders() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) {
      fetchOrders();
    }
  }, [user, isAdmin, navigate]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // Fetch offers as orders (offers represent transactions in the marketplace)
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id,
          amount,
          status,
          created_at,
          ad_id,
          buyer_id,
          seller_id,
          ads:ad_id (title, slug),
          profiles:buyer_id (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: Order[] = data.map((o: any) => ({
          id: o.id,
          order_number: `#OFF-${o.id.slice(0, 8).toUpperCase()}`,
          customer_name: o.profiles?.full_name || 'Unknown Customer',
          product_name: o.ads?.title || 'Unknown Product',
          amount: o.amount || 0,
          status: o.status === 'accepted' ? 'delivered' : o.status === 'pending' ? 'pending' : o.status === 'rejected' ? 'cancelled' : 'processing',
          payment_status: o.status === 'accepted' ? 'paid' : 'pending',
          created_at: o.created_at,
        }));
        setOrders(mapped);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setOrders([]);
    }
    setIsLoading(false);
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const columns: Column<Order>[] = [
    {
      key: 'order_number', label: 'Order', sortable: true,
      render: (o) => <span className="font-mono text-sm font-medium">{o.order_number}</span>,
    },
    {
      key: 'customer_name', label: 'Customer', sortable: true,
      render: (o) => <span className="text-sm">{o.customer_name}</span>,
    },
    {
      key: 'product_name', label: 'Product',
      render: (o) => <span className="text-sm text-muted-foreground truncate">{o.product_name}</span>,
    },
    {
      key: 'amount', label: 'Amount', sortable: true,
      render: (o) => <span className="font-medium text-sm tabular-nums">৳{o.amount.toLocaleString()}</span>,
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (o) => {
        const colors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        };
        return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[o.status]}`}>{o.status}</span>;
      },
    },
    {
      key: 'payment_status', label: 'Payment', sortable: true,
      render: (o) => {
        const colors: Record<string, string> = {
          paid: 'text-green-600 dark:text-green-400', pending: 'text-yellow-600 dark:text-yellow-400',
          failed: 'text-red-600 dark:text-red-400', refunded: 'text-gray-600 dark:text-gray-400',
        };
        return <span className={`text-xs font-medium capitalize ${colors[o.payment_status]}`}>{o.payment_status}</span>;
      },
    },
    {
      key: 'created_at', label: 'Date', sortable: true,
      render: (o) => <span className="text-xs text-muted-foreground">{format(new Date(o.created_at), 'MMM d, yyyy')}</span>,
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Orders"
        description="Manage all marketplace orders, shipping, and fulfillment"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Orders & Finance' }, { label: 'Orders' }]}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Export</Button>
            <Button size="sm" className="gap-2"><ShoppingCart className="h-3.5 w-3.5" /> Create Order</Button>
          </>
        }
      />

      <StatCardGrid>
        <StatCard title="Total Orders" value={orders.length} icon={ShoppingCart} color="blue" loading={isLoading} />
        <StatCard title="Pending" value={orders.filter(o => o.status === 'pending').length} icon={Clock} color="yellow" loading={isLoading} />
        <StatCard title="Delivered" value={orders.filter(o => o.status === 'delivered').length} icon={CheckCircle} color="green" loading={isLoading} />
        <StatCard title="Cancelled" value={orders.filter(o => o.status === 'cancelled').length} icon={XCircle} color="red" loading={isLoading} />
      </StatCardGrid>

      <div className="mt-6">
        <div className="flex items-center gap-3 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DataTable
          columns={columns}
          data={statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)}
          searchable
          searchPlaceholder="Search orders..."
          searchKeys={['order_number', 'customer_name', 'product_name', 'status']}
          loading={isLoading}
          selectable
          getRowId={(o) => o.id}
          bulkActions={
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs">Mark Shipped</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs">Export Selected</Button>
            </>
          }
          emptyState={
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold text-lg mb-2">No Orders Yet</h3>
              <p className="text-muted-foreground text-sm">Orders will appear here once buyers start making offers.</p>
            </div>
          }
        />
      </div>
    </AdminLayout>
  );
}
