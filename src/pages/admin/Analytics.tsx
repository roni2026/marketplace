/**
 * Analytics — Enterprise analytics dashboard with charts, stats, and date ranges.
 */

import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend,
} from 'recharts';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { exportData, downloadExport } from '@/lib/adminPortal';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingUp, Users, Package, DollarSign, ShoppingCart,
  BarChart3, Download, Activity,
} from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

export default function Analytics() {
  const { stats, userGrowth, listingGrowth, fetchDashboardData } = useAdminPortal();
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<{ name: string; count: number }[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<{ name: string; count: number }[]>([]);
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number; orders: number }[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const days = parseInt(dateRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [catRes, orderRes, txnRes] = await Promise.all([
      supabase.from('categories').select('name').limit(20),
      supabase.from('ads').select('status').is('deleted_at', null),
      supabase.from('transactions').select('amount, created_at, status').eq('status', 'completed').gte('created_at', startDate.toISOString()),
    ]);

    // Category distribution
    const catCounts: Record<string, number> = {};
    (catRes.data || []).forEach((c: any) => {
      catCounts[c.name] = (catCounts[c.name] || 0) + 1;
    });
    setCategoryData(Object.entries(catCounts).map(([name, count]) => ({ name, count })));

    // Order status distribution
    const statusCounts: Record<string, number> = {};
    (orderRes.data || []).forEach((o: any) => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });
    setOrderStatusData(Object.entries(statusCounts).map(([name, count]) => ({ name, count })));

    // Revenue over time
    const revByDate: Record<string, { revenue: number; orders: number }> = {};
    (txnRes.data || []).forEach((t: any) => {
      const date = new Date(t.created_at).toISOString().split('T')[0];
      if (!revByDate[date]) revByDate[date] = { revenue: 0, orders: 0 };
      revByDate[date].revenue += t.amount || 0;
      revByDate[date].orders += 1;
    });
    setRevenueData(Object.entries(revByDate).map(([date, v]) => ({ date, ...v })));

    setLoading(false);
  }, [dateRange]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const s = stats as any;

  const handleExport = useCallback(async () => {
    const csv = await exportData('transactions', 'csv');
    if (csv) downloadExport(csv, 'analytics_export.csv', 'csv');
  }, [exportData, downloadExport]);

  return (
    <AdminLayout>
      <PageHeader
        title="Analytics"
        description="Marketplace performance metrics and insights"
        actions={
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        }
      />

      <StatCardGrid>
        <StatCard title="Total Revenue" value={`$${(s?.total_revenue ?? 0).toLocaleString()}`} icon={DollarSign} color="green" loading={loading} />
        <StatCard title="Total Orders" value={s?.total_transactions ?? 0} icon={ShoppingCart} color="blue" loading={loading} />
        <StatCard title="Total Users" value={s?.total_users ?? 0} icon={Users} color="purple" loading={loading} />
        <StatCard title="Total Listings" value={s?.total_listings ?? 0} icon={Package} color="orange" loading={loading} />
        <StatCard title="Active Listings" value={s?.active_listings ?? 0} icon={TrendingUp} color="cyan" loading={loading} />
        <StatCard title="Total Shops" value={s?.total_shops ?? 0} icon={BarChart3} color="pink" loading={loading} />
      </StatCardGrid>

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList className="h-8">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
          <TabsTrigger value="listings" className="text-xs">Listings</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">User Growth</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[220px] w-full" /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={userGrowth}>
                      <defs>
                        <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#ug)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Listing Growth</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[220px] w-full" /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={listingGrowth}>
                      <defs>
                        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                      <Area type="monotone" dataKey="count" stroke="#10b981" fill="url(#lg)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Category Distribution</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[220px] w-full" /> : categoryData.length === 0 ? (
                  <p className="py-12 text-center text-xs text-muted-foreground">No category data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={categoryData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }: any) => name} labelLine={false} style={{ fontSize: 10 }}>
                        {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Order Status Distribution</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[220px] w-full" /> : orderStatusData.length === 0 ? (
                  <p className="py-12 text-center text-xs text-muted-foreground">No order data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={orderStatusData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">User Growth ({dateRange} days)</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[300px] w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={userGrowth}>
                    <defs>
                      <linearGradient id="ug2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#ug2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings" className="mt-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Listing Growth</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[250px] w-full" /> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={listingGrowth}>
                      <defs>
                        <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                      <Area type="monotone" dataKey="count" stroke="#10b981" fill="url(#lg2)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Listings by Category</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[250px] w-full" /> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="mt-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue Over Time ({dateRange} days)</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[300px] w-full" /> : revenueData.length === 0 ? (
                <p className="py-12 text-center text-xs text-muted-foreground">No revenue data for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue ($)" />
                    <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Orders" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
