import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  FileCheck,
  FileClock,
  FileX,
  AlertTriangle,
  TrendingUp,
  Shield,
  LifeBuoy,
  Eye,
  Heart,
  Flag,
  FolderTree,
} from 'lucide-react';
import { Bar, BarChart, Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, subDays } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface Stats {
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

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyData, setDailyData] = useState<{ date: string; users: number; ads: number }[]>([]);

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
      fetchStats();
    }
  }, [user, isAdmin, navigate]);

  const fetchStats = async () => {
    setIsLoading(true);

    const weekAgo = subDays(new Date(), 7).toISOString();

    const [usersRes, newUsersRes, pendingRes, approvedRes, rejectedRes, reportsRes, viewsRes, favRes, msgRes, ticketsRes] = await Promise.all([
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
    ]);

    const totalViews = (viewsRes.data || []).reduce((sum, ad) => sum + (ad.views_count || 0), 0);

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

    // Build daily growth data for last 14 days
    const daily: { date: string; users: number; ads: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const nextDateStr = format(subDays(new Date(), i - 1), 'yyyy-MM-dd');

      const [dayUsers, dayAds] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', dateStr).lt('created_at', nextDateStr),
        supabase.from('ads').select('*', { count: 'exact', head: true }).gte('created_at', dateStr).lt('created_at', nextDateStr),
      ]);

      daily.push({
        date: format(date, 'MMM d'),
        users: dayUsers.count || 0,
        ads: dayAds.count || 0,
      });
    }
    setDailyData(daily);
    setIsLoading(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  const statCards = [
    { title: 'Total Users', value: stats?.totalUsers, sub: `+${stats?.newUsersThisWeek || 0} this week`, icon: Users, color: 'text-blue-500' },
    { title: 'Pending Ads', value: stats?.pendingAds, icon: FileClock, color: 'text-yellow-500' },
    { title: 'Approved Ads', value: stats?.approvedAds, icon: FileCheck, color: 'text-green-500' },
    { title: 'Rejected Ads', value: stats?.rejectedAds, icon: FileX, color: 'text-red-500' },
    { title: 'Pending Reports', value: stats?.pendingReports, icon: AlertTriangle, color: 'text-orange-500' },
    { title: 'Open Tickets', value: stats?.openTickets, icon: LifeBuoy, color: 'text-purple-500' },
    { title: 'Total Views', value: stats?.totalViews, icon: Eye, color: 'text-cyan-500' },
    { title: 'Favorites', value: stats?.totalFavorites, icon: Heart, color: 'text-pink-500' },
  ];

  const chartData = stats
    ? [
        { name: 'Pending', count: stats.pendingAds, fill: 'hsl(45 93% 47%)' },
        { name: 'Approved', count: stats.approvedAds, fill: 'hsl(142 71% 45%)' },
        { name: 'Rejected', count: stats.rejectedAds, fill: 'hsl(0 72% 50%)' },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your marketplace</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{stat.value?.toLocaleString()}</p>
                  {stat.sub && <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Growth Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Growth Metrics (14 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64 w-full">
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
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                    }}
                  />
                  <Area type="monotone" dataKey="users" stroke="hsl(220 70% 56%)" fill="url(#colorUsers)" strokeWidth={2} />
                  <Area type="monotone" dataKey="ads" stroke="hsl(142 71% 45%)" fill="url(#colorAds)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ads by Status Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Ads by Status</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/admin/ads')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileClock className="h-5 w-5 text-yellow-500" />
              Review Pending Ads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {stats?.pendingAds || 0} ads waiting for review
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/admin/reports')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-orange-500" />
              Handle Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {stats?.pendingReports || 0} reports to review
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/admin/support')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-purple-500" />
              Support Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {stats?.openTickets || 0} open tickets
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/admin/analytics')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              View Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Growth metrics and revenue charts
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/admin/audit')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Track all administrative actions
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/admin/categories')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-blue-500" />
              Manage Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Add or edit categories and subcategories
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
