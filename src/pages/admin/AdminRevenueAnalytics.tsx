/**
 * AdminRevenueAnalytics — GMV, platform revenue, payout totals, transaction volume.
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, Wallet, ShoppingCart, ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, startOfMonth, eachDayOfInterval } from 'date-fns';

export default function AdminRevenueAnalytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [stats, setStats] = useState({ gmv: 0, platformRevenue: 0, totalPayouts: 0, transactionCount: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topSellers, setTopSellers] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const days = parseInt(timeRange);
    const startDate = subDays(new Date(), days);

    try {
      // Fetch transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, transaction_type, status, created_at, platform_fee')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed');

      const txns = transactions || [];
      const gmv = txns.reduce((sum, t) => sum + (t.amount || 0), 0);
      const platformRevenue = txns.reduce((sum, t) => sum + (t.platform_fee || 0), 0);

      // Fetch payouts
      const { data: payouts } = await supabase
        .from('payouts')
        .select('amount, status, created_at')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed');
      const totalPayouts = (payouts || []).reduce((sum, p) => sum + (p.amount || 0), 0);

      setStats({ gmv, platformRevenue, totalPayouts, transactionCount: txns.length });

      // Build chart data
      const dateRange = eachDayOfInterval({ start: startDate, end: new Date() });
      const chartPoints = dateRange.map(date => {
        const dayStr = format(date, 'MMM d');
        const dayTxns = txns.filter(t => format(new Date(t.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
        const dayGmv = dayTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
        const dayRevenue = dayTxns.reduce((sum, t) => sum + (t.platform_fee || 0), 0);
        return { date: dayStr, gmv: dayGmv, revenue: dayRevenue };
      });
      setChartData(chartPoints);

      // Top sellers by transaction volume
      const sellerMap: Record<string, number> = {};
      txns.forEach(t => {
        const sellerId = (t as any).seller_id;
        if (sellerId) sellerMap[sellerId] = (sellerMap[sellerId] || 0) + (t.amount || 0);
      });
      const topSellerIds = Object.entries(sellerMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (topSellerIds.length > 0) {
        const { data: sellerProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', topSellerIds.map(([id]) => id));
        setTopSellers(topSellerIds.map(([id, amount]) => {
          const profile = sellerProfiles?.find(p => p.user_id === id);
          return { id, name: profile?.full_name || 'Unknown', amount, avatar: profile?.avatar_url };
        }));
      }
    } catch {}
    setLoading(false);
  }, [timeRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const StatCard = ({ icon: Icon, label, value, color, trend }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="h-5 w-5" />
          </div>
          {trend !== undefined && (
            <Badge variant={trend >= 0 ? 'default' : 'destructive'} className="gap-1 text-[10px]">
              {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend)}%
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold">৳{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Revenue Analytics</h1>
              <p className="text-muted-foreground">Transaction volume, platform revenue, and payouts</p>
            </div>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={TrendingUp} label="GMV (Gross Merchandise Value)" value={stats.gmv} color="bg-blue-500/10 text-blue-500" />
              <StatCard icon={DollarSign} label="Platform Revenue" value={stats.platformRevenue} color="bg-green-500/10 text-green-500" />
              <StatCard icon={Wallet} label="Total Payouts" value={stats.totalPayouts} color="bg-orange-500/10 text-orange-500" />
              <StatCard icon={ShoppingCart} label="Transactions" value={stats.transactionCount} color="bg-purple-500/10 text-purple-500" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader><CardTitle className="text-base">GMV Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <defs><linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}K`} width={50} />
                      <Tooltip formatter={(v: number) => [`৳${v.toLocaleString()}`, 'GMV']} />
                      <Area type="monotone" dataKey="gmv" stroke="#3b82f6" strokeWidth={2} fill="url(#gmvGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Platform Revenue Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `৳${v}`} width={50} />
                      <Tooltip formatter={(v: number) => [`৳${v.toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {topSellers.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Top Earning Sellers</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topSellers.map((seller, i) => (
                      <div key={seller.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                          <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
                            {seller.avatar ? <img src={seller.avatar} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs font-bold">{seller.name[0]}</div>}
                          </div>
                          <span className="text-sm font-medium">{seller.name}</span>
                        </div>
                        <span className="text-sm font-bold text-primary">৳{seller.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
