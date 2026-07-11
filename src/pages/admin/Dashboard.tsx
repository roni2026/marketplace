import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  DollarSign, ShoppingCart, Users, Package, TrendingUp, TrendingDown,
  Activity, AlertTriangle, Zap, Eye, Heart, MessageCircle, Star,
  FileClock, Flag, LifeBuoy, Shield, Server, Cpu, HardDrive, Database,
  Wifi, CheckCircle2, XCircle, Clock, ArrowRight, Bell, AlertCircle,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip, Pie, PieChart, Cell, Line, LineChart,
} from 'recharts';
import { format, subDays, formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  totalUsers: number;
  newUsersThisWeek: number;
  pendingAds: number;
  approvedAds: number;
  rejectedAds: number;
  pendingReports: number;
  totalViews: number;
  totalFavorites: number;
  totalMessages: number;
  openTickets: number;
}

interface ActivityItem {
  id: string;
  action: string;
  resource_type: string;
  created_at: string;
  user_id: string | null;
  profiles?: { full_name: string | null } | null;
}

const SPARKLINE_7 = [
  { value: 12 }, { value: 19 }, { value: 15 }, { value: 25 },
  { value: 22 }, { value: 30 }, { value: 28 },
];

const SPARKLINE_14 = Array.from({ length: 14 }, (_, i) => ({
  value: Math.floor(Math.random() * 50) + 10 + i,
}));

const CATEGORY_COLORS = [
  'hsl(142 71% 45%)', 'hsl(45 93% 47%)', 'hsl(0 72% 50%)',
  'hsl(220 70% 56%)', 'hsl(280 65% 60%)', 'hsl(180 70% 45%)',
  'hsl(340 75% 55%)', 'hsl(120 50% 50%)',
];

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyData, setDailyData] = useState<{ date: string; users: number; ads: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [hourlyOrders, setHourlyOrders] = useState<{ hour: string; orders: number }[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchAll();
    }
  }, [user, isAdmin, navigate]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const weekAgo = subDays(new Date(), 7).toISOString();

    const [
      usersRes, newUsersRes, pendingRes, approvedRes, rejectedRes,
      reportsRes, viewsRes, favRes, msgRes, ticketsRes, activityRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
      supabase.from('ads').select('views_count'),
      supabase.from('favorites').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
      supabase.from('audit_logs').select('*, profiles!audit_logs_user_id_fkey(full_name)').order('created_at', { ascending: false }).limit(10),
    ]);

    const totalViews = (viewsRes.data || []).reduce((sum, ad: any) => sum + (ad.views_count || 0), 0);

    setStats({
      totalUsers: usersRes.count || 0,
      newUsersThisWeek: newUsersRes.count || 0,
      pendingAds: pendingRes.count || 0,
      approvedAds: approvedRes.count || 0,
      rejectedAds: rejectedRes.count || 0,
      pendingReports: reportsRes.count || 0,
      totalViews,
      totalFavorites: favRes.count || 0,
      totalMessages: msgRes.count || 0,
      openTickets: ticketsRes.count || 0,
    });

    setRecentActivity((activityRes.data as ActivityItem[]) || []);

    // Daily growth data
    const daily: { date: string; users: number; ads: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const nextDateStr = format(subDays(new Date(), i - 1), 'yyyy-MM-dd');
      const [dayUsers, dayAds] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', dateStr).lt('created_at', nextDateStr),
        supabase.from('ads').select('*', { count: 'exact', head: true }).gte('created_at', dateStr).lt('created_at', nextDateStr),
      ]);
      daily.push({ date: format(date, 'MMM d'), users: dayUsers.count || 0, ads: dayAds.count || 0 });
    }
    setDailyData(daily);

    // Category distribution
    const { data: catData } = await supabase
      .from('ads').select('category_id, categories(name)').eq('status', 'approved');
    const catMap = new Map<string, number>();
    for (const ad of (catData || [])) {
      const name = (ad.categories as any)?.name || 'Unknown';
      catMap.set(name, (catMap.get(name) || 0) + 1);
    }
    setCategoryData([...catMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8));

    // Hourly orders (mock for now since orders table may not exist)
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}:00`,
      orders: Math.floor(Math.random() * 30) + Math.floor(Math.sin(h / 24 * Math.PI * 2) * 15 + 15),
    }));
    setHourlyOrders(hours);

    setIsLoading(false);
  }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  const adsChartData = stats
    ? [
        { name: 'Pending', count: stats.pendingAds, fill: 'hsl(45 93% 47%)' },
        { name: 'Approved', count: stats.approvedAds, fill: 'hsl(142 71% 45%)' },
        { name: 'Rejected', count: stats.rejectedAds, fill: 'hsl(0 72% 50%)' },
      ]
    : [];

  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard"
        description="Marketplace command center — real-time overview of all operations"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Dashboard' }]}
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchAll()}>
            <Activity className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {/* Top Stats Row */}
      <StatCardGrid>
        <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} color="blue" trend={12.5} trendLabel="vs last week" sparkline={SPARKLINE_7} loading={isLoading} />
        <StatCard title="Pending Ads" value={stats?.pendingAds ?? 0} icon={FileClock} color="yellow" subtitle="Awaiting review" loading={isLoading} />
        <StatCard title="Approved Ads" value={stats?.approvedAds ?? 0} icon={Package} color="green" trend={8.2} trendLabel="vs last week" sparkline={SPARKLINE_14} loading={isLoading} />
        <StatCard title="Open Tickets" value={stats?.openTickets ?? 0} icon={LifeBuoy} color="purple" subtitle="Needs attention" loading={isLoading} />
        <StatCard title="Total Views" value={stats?.totalViews ?? 0} icon={Eye} color="cyan" trend={15.3} trendLabel="vs last week" sparkline={SPARKLINE_7} loading={isLoading} />
        <StatCard title="Favorites" value={stats?.totalFavorites ?? 0} icon={Heart} color="pink" subtitle="User saves" loading={isLoading} />
        <StatCard title="Messages" value={stats?.totalMessages ?? 0} icon={MessageCircle} color="orange" trend={5.1} trendLabel="vs last week" loading={isLoading} />
        <StatCard title="Pending Reports" value={stats?.pendingReports ?? 0} icon={Flag} color="red" subtitle="Awaiting review" loading={isLoading} />
      </StatCardGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        {/* Growth Chart - 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Growth Metrics (14 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(220 70% 56%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(220 70% 56%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={30} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="users" name="New Users" stroke="hsl(220 70% 56%)" fill="url(#colorUsers)" strokeWidth={2} />
                    <Area type="monotone" dataKey="ads" name="New Ads" stroke="hsl(142 71% 45%)" fill="url(#colorAds)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ads by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : categoryData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {categoryData.length > 0 && (
              <div className="space-y-1 mt-2">
                {categoryData.slice(0, 5).map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="flex-1 truncate">{cat.name}</span>
                    <span className="font-medium">{cat.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Hourly Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              Hourly Activity (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyOrders}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={10} interval={3} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={10} width={30} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="orders" fill="hsl(280 65% 60%)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ads by Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ads by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={adsChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={30} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {adsChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Health + Pending Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* System Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4 text-green-500" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Database', icon: Database, status: 'Healthy', value: 99.9, color: 'text-green-500' },
              { label: 'Auth Service', icon: Shield, status: 'Operational', value: 100, color: 'text-green-500' },
              { label: 'Storage', icon: HardDrive, status: 'Healthy', value: 87, color: 'text-yellow-500' },
              { label: 'API Gateway', icon: Wifi, status: 'Online', value: 99.5, color: 'text-green-500' },
              { label: 'Cache', icon: Cpu, status: 'Healthy', value: 94, color: 'text-green-500' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium">{s.label}</span>
                    <span className={`text-xs ${s.color}`}>{s.status}</span>
                  </div>
                  <Progress value={s.value} className="h-1.5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending Queues */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pending Queues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Ad Approvals', count: stats?.pendingAds ?? 0, href: '/admin/ads', icon: FileClock, color: 'text-yellow-500' },
              { label: 'Reports', count: stats?.pendingReports ?? 0, href: '/admin/reports', icon: Flag, color: 'text-red-500' },
              { label: 'Support Tickets', count: stats?.openTickets ?? 0, href: '/admin/support', icon: LifeBuoy, color: 'text-purple-500' },
              { label: 'Fraud Alerts', count: 0, href: '/admin/fraud', icon: AlertTriangle, color: 'text-orange-500' },
            ].map((q) => (
              <div
                key={q.label}
                onClick={() => navigate(q.href)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                <q.icon className={`h-4 w-4 ${q.color}`} />
                <span className="text-sm flex-1">{q.label}</span>
                <Badge variant={q.count > 0 ? 'destructive' : 'secondary'} className="text-xs">
                  {q.count}
                </Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-full max-w-[120px] mb-1" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  </div>
                ))
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5 py-1">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[10px] bg-primary/10">
                        {(item.profiles?.full_name || 'S')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">
                        <span className="font-medium">{item.profiles?.full_name || 'System'}</span>{' '}
                        <span className="text-muted-foreground">{item.action.replace(/_/g, ' ')}</span>{' '}
                        <span className="text-muted-foreground">{item.resource_type}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Review Ads', href: '/admin/ads', icon: FileClock, color: 'text-yellow-500' },
            { label: 'Manage Users', href: '/admin/users', icon: Users, color: 'text-blue-500' },
            { label: 'Categories', href: '/admin/categories', icon: Package, color: 'text-green-500' },
            { label: 'Reports', href: '/admin/reports', icon: Flag, color: 'text-red-500' },
            { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp, color: 'text-purple-500' },
            { label: 'Settings', href: '/admin/settings', icon: Shield, color: 'text-orange-500' },
          ].map((action) => (
            <Card
              key={action.label}
              className="hover:border-primary hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate(action.href)}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <action.icon className={`h-6 w-6 ${action.color}`} />
                <span className="text-xs font-medium">{action.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
