import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { format, subDays } from 'date-fns';
import {
  Banknote, Download, Clock, CheckCircle, XCircle, DollarSign,
  TrendingUp, Wallet, Percent,
} from 'lucide-react';
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface Payout {
  id: string;
  seller_name: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  method: string;
  created_at: string;
  processed_at: string | null;
}

const MOCK_PAYOUTS: Payout[] = Array.from({ length: 20 }, (_, i) => ({
  id: `pay_${i.toString().padStart(4, '0')}`,
  seller_name: ['Rahim Store', 'Karim Electronics', 'Fatima Fashion', 'Ali Motors', 'Sadia Crafts'][i % 5],
  amount: Math.floor(Math.random() * 30000) + 1000,
  status: (['pending', 'processing', 'completed', 'failed'] as const)[Math.floor(Math.random() * 4)],
  method: ['bkash', 'nagad', 'rocket', 'bank_transfer'][Math.floor(Math.random() * 4)],
  created_at: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString(),
  processed_at: Math.random() > 0.5 ? subDays(new Date(), Math.floor(Math.random() * 20)).toISOString() : null,
}));

export default function Payouts() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { navigate('/'); return; }
    if (isAdmin) {
      setPayouts(MOCK_PAYOUTS);
      setIsLoading(false);
    }
  }, [user, isAdmin, navigate]);

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const totalPending = payouts.filter(p => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + p.amount, 0);
  const totalCompleted = payouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const totalFailed = payouts.filter(p => p.status === 'failed').length;

  const chartData = Array.from({ length: 7 }, (_, i) => ({
    day: format(subDays(new Date(), 6 - i), 'EEE'),
    amount: Math.floor(Math.random() * 50000) + 5000,
  }));

  return (
    <AdminLayout>
      <PageHeader
        title="Payouts"
        description="Manage seller payouts, settlement reports, and payment processing"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Finance' }, { label: 'Payouts' }]}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Export</Button>
            <Button size="sm" className="gap-2"><Banknote className="h-3.5 w-3.5" /> Process Payouts</Button>
          </>
        }
      />

      <StatCardGrid>
        <StatCard title="Pending Payouts" value={`৳${totalPending.toLocaleString()}`} icon={Clock} color="yellow" subtitle="Awaiting processing" loading={isLoading} />
        <StatCard title="Completed" value={`৳${totalCompleted.toLocaleString()}`} icon={CheckCircle} color="green" trend={8.2} trendLabel="vs last week" loading={isLoading} />
        <StatCard title="Failed" value={totalFailed} icon={XCircle} color="red" subtitle="Needs review" loading={isLoading} />
        <StatCard title="Total Processed" value={payouts.length} icon={Banknote} color="blue" subtitle="This month" loading={isLoading} />
      </StatCardGrid>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Payout Volume (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={60} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="amount" fill="hsl(220 70% 56%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold">Recent Payouts</h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : (
          payouts.slice(0, 10).map(payout => (
            <Card key={payout.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{payout.seller_name}</p>
                    <Badge variant="outline" className="text-xs capitalize">{payout.method}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{payout.id}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">৳{payout.amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(payout.created_at), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  {payout.status === 'completed' && <Badge className="text-xs bg-green-500 hover:bg-green-500">Completed</Badge>}
                  {payout.status === 'pending' && <Badge className="text-xs bg-yellow-500 hover:bg-yellow-500">Pending</Badge>}
                  {payout.status === 'processing' && <Badge className="text-xs bg-blue-500 hover:bg-blue-500">Processing</Badge>}
                  {payout.status === 'failed' && <Badge variant="destructive" className="text-xs">Failed</Badge>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
