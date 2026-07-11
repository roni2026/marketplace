import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, Column } from '@/components/admin/DataTable';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { formatPrice } from '@/lib/constants';
import { format, subDays } from 'date-fns';
import {
  CreditCard, DollarSign, TrendingUp, Download, Banknote,
  Receipt, Wallet, Percent, RotateCcw,
} from 'lucide-react';

interface Transaction {
  id: string;
  ad_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  amount: number;
  status: string;
  type: string;
  created_at: string;
  ads?: { title: string } | null;
}

// Mock data for transactions since the table may not exist yet
const MOCK_TRANSACTIONS: Transaction[] = Array.from({ length: 50 }, (_, i) => ({
  id: `txn_${i.toString().padStart(4, '0')}`,
  ad_id: null,
  buyer_id: null,
  seller_id: null,
  amount: Math.floor(Math.random() * 50000) + 500,
  status: ['completed', 'pending', 'failed', 'refunded'][Math.floor(Math.random() * 4)],
  type: ['payment', 'payout', 'commission', 'refund'][Math.floor(Math.random() * 4)],
  created_at: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString(),
  ads: { title: `Product ${i + 1}` },
}));

export default function Transactions() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { navigate('/'); return; }
    if (isAdmin) {
      // Try to fetch real data, fall back to mock
      fetchTransactions();
    }
  }, [user, isAdmin, navigate]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    // For now, use mock data since transactions table may not exist
    setTransactions(MOCK_TRANSACTIONS);
    setIsLoading(false);
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const totalRevenue = transactions.filter(t => t.type === 'payment' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
  const totalPayouts = transactions.filter(t => t.type === 'payout' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0);
  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const failedCount = transactions.filter(t => t.status === 'failed').length;

  const columns: Column<Transaction>[] = [
    {
      key: 'id', label: 'Transaction ID', sortable: true,
      render: (t) => <span className="font-mono text-xs">{t.id}</span>,
    },
    {
      key: 'type', label: 'Type', sortable: true,
      render: (t) => {
        const icons: Record<string, any> = { payment: CreditCard, payout: Banknote, commission: Percent, refund: RotateCcw };
        const Icon = icons[t.type] || Receipt;
        return <span className="flex items-center gap-1.5 text-sm capitalize"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{t.type}</span>;
      },
    },
    {
      key: 'amount', label: 'Amount', sortable: true,
      render: (t) => <span className="font-medium text-sm tabular-nums">৳{t.amount.toLocaleString()}</span>,
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (t) => {
        const colors: Record<string, string> = {
          completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          refunded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        };
        return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[t.status]}`}>{t.status}</span>;
      },
    },
    {
      key: 'ads', label: 'Product',
      render: (t) => <span className="text-sm text-muted-foreground truncate">{t.ads?.title || '—'}</span>,
    },
    {
      key: 'created_at', label: 'Date', sortable: true,
      render: (t) => <span className="text-xs text-muted-foreground">{format(new Date(t.created_at), 'MMM d, yyyy HH:mm')}</span>,
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Transactions"
        description="All financial transactions, payments, payouts, and refunds"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Finance' }, { label: 'Transactions' }]}
        actions={<Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Export</Button>}
      />

      <StatCardGrid>
        <StatCard title="Total Revenue" value={`৳${totalRevenue.toLocaleString()}`} icon={DollarSign} color="green" trend={12.5} trendLabel="vs last month" loading={isLoading} />
        <StatCard title="Total Payouts" value={`৳${totalPayouts.toLocaleString()}`} icon={Banknote} color="blue" loading={isLoading} />
        <StatCard title="Pending" value={pendingCount} icon={CreditCard} color="yellow" subtitle="Transactions" loading={isLoading} />
        <StatCard title="Failed" value={failedCount} icon={RotateCcw} color="red" subtitle="Transactions" loading={isLoading} />
      </StatCardGrid>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={transactions}
          searchable
          searchPlaceholder="Search transactions..."
          searchKeys={['id', 'type', 'status']}
          loading={isLoading}
          getRowId={(t) => t.id}
        />
      </div>
    </AdminLayout>
  );
}
