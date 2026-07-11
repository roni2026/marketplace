import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Bar, BarChart, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart, Pie, PieChart, Cell } from 'recharts';
import { TrendingUp, Users, FileCheck, DollarSign, Activity, Eye, Heart, MessageCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface AnalyticsData {
  totalUsers: number;
  newUsersThisWeek: number;
  totalAds: number;
  newAdsThisWeek: number;
  totalRevenue: number;
  pendingApprovals: number;
  totalViews: number;
  totalFavorites: number;
  totalMessages: number;
}

interface DailyData {
  date: string;
  users: number;
  ads: number;
  views: number;
}

export default function AnalyticsPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      fetchAnalytics();
    }
  }, [user, isAdmin, navigate]);

  const fetchAnalytics = async () => {
    setIsLoading(true);

    const weekAgo = subDays(new Date(), 7).toISOString();

    const [usersRes, newUsersRes, adsRes, newAdsRes, pendingRes, viewsRes, favRes, msgRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('ads').select('*', { count: 'exact', head: true }),
      supabase.from('ads').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('ads').select('views_count'),
      supabase.from('favorites').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
    ]);

    const totalViews = (viewsRes.data || []).reduce((sum, ad) => sum + (ad.views_count || 0), 0);

    setData({
      totalUsers: usersRes.count || 0,
      newUsersThisWeek: newUsersRes.count || 0,
      totalAds: adsRes.count || 0,
      newAdsThisWeek: newAdsRes.count || 0,
      totalRevenue: 0,
      pendingApprovals: pendingRes.count || 0,
      totalViews,
      totalFavorites: favRes.count || 0,
      totalMessages: msgRes.count || 0,
    });

    // Build daily data for last 14 days
    const daily: DailyData[] = [];
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
        views: 0,
      });
    }
    setDailyData(daily);

    // Category distribution
    const { data: catData } = await supabase
      .from('ads')
      .select('category_id, categories(name)')
      .eq('status', 'approved');

    const catMap = new Map<string, { name: string; value: number }>();
    for (const ad of (catData || [])) {
      const catName = (ad.categories as { name: string })?.name || 'Unknown';
      const existing = catMap.get(catName);
      if (existing) {
        existing.value++;
      } else {
        catMap.set(catName, { name: catName, value: 1 });
      }
    }
    setCategoryData([...catMap.values()].sort((a, b) => b.value - a.value).slice(0, 8));

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
    { title: 'Total Users', value: data?.totalUsers, sub: `+${data?.newUsersThisWeek || 0} this week`, icon: Users, color: 'text-blue-500' },
    { title: 'Total Ads', value: data?.totalAds, sub: `+${data?.newAdsThisWeek || 0} this week`, icon: FileCheck, color: 'text-green-500' },
    { title: 'Total Views', value: data?.totalViews, sub: 'Across all ads', icon: Eye, color: 'text-purple-500' },
    { title: 'Favorites', value: data?.totalFavorites, sub: 'User saves', icon: Heart, color: 'text-red-500' },
    { title: 'Messages', value: data?.totalMessages, sub: 'Total sent', icon: MessageCircle, color: 'text-orange-500' },
    { title: 'Pending Review', value: data?.pendingApprovals, sub: 'Awaiting moderation', icon: Activity, color: 'text-yellow-500' },
  ];

  const PIE_COLORS = ['hsl(142 71% 45%)', 'hsl(45 93% 47%)', 'hsl(0 72% 50%)', 'hsl(220 70% 56%)', 'hsl(280 65% 60%)', 'hsl(180 70% 45%)', 'hsl(340 75% 55%)', 'hsl(120 50% 50%)'];

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Analytics</h1>
        </div>
        <p className="text-muted-foreground">Growth metrics, revenue charts, and system health</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                  <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Growth Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">User & Ad Growth (14 days)</CardTitle>
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

      {/* Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ads by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      fontSize={11}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily New Ads</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
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
                    <Bar dataKey="ads" radius={[6, 6, 0, 0]} fill="hsl(142 71% 45%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Database</p>
              <Badge className="bg-green-600 hover:bg-green-600 text-white">Healthy</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Auth Service</p>
              <Badge className="bg-green-600 hover:bg-green-600 text-white">Operational</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Storage</p>
              <Badge className="bg-green-600 hover:bg-green-600 text-white">Healthy</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">API Status</p>
              <Badge className="bg-green-600 hover:bg-green-600 text-white">Online</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
