/**
 * ShopAnalyticsPage — Advanced shop analytics with charts, traffic sources,
 * conversion funnel, top listings, and audience insights.
 * Available for Basic+ tiers.
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { BarChart3, TrendingUp, Eye, Heart, MessageSquare, ShoppingCart, Lock, Download, Star, Users, Clock, Zap } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ShopAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [stats, setStats] = useState({ totalViews: 0, totalFavorites: 0, totalMessages: 0, totalOffers: 0, conversionRate: 0 });
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [topListings, setTopListings] = useState<any[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const days = parseInt(timeRange);
    const startDate = subDays(new Date(), days);

    try {
      const { data: shopData } = await supabase.from('shops').select('*').eq('owner_id', user.id).single();
      if (!shopData) { setLoading(false); return; }
      setShop(shopData);

      // Fetch shop analytics
      const { data: analytics } = await supabase
        .from('shop_analytics')
        .select('*')
        .eq('shop_id', shopData.id)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      // Fetch listings for this seller
      const { data: listings } = await supabase
        .from('ads')
        .select('id, title, slug, views_count, favorites_count, status, created_at, category_id, categories(name)')
        .eq('user_id', user.id)
        .order('views_count', { ascending: false })
        .limit(10);

      // Calculate stats
      const allAnalytics = analytics || [];
      const totalViews = allAnalytics.reduce((s, a) => s + (a.views || 0), 0);
      const totalFavorites = allAnalytics.reduce((s, a) => s + (a.favorites || 0), 0);
      const totalMessages = allAnalytics.reduce((s, a) => s + (a.messages || 0), 0);
      const totalOffers = allAnalytics.reduce((s, a) => s + (a.offers || 0), 0);
      const conversionRate = totalViews > 0 ? ((totalMessages + totalOffers) / totalViews * 100).toFixed(1) : '0';

      setStats({ totalViews, totalFavorites, totalMessages, totalOffers, conversionRate: parseFloat(conversionRate) });

      // Traffic chart data
      const dateRange = eachDayOfInterval({ start: startDate, end: new Date() });
      const chartPoints = dateRange.map(date => {
        const dayStr = format(date, 'MMM d');
        const dayData = allAnalytics.filter(a => format(new Date(a.recorded_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
        return {
          date: dayStr,
          views: dayData.reduce((s, a) => s + (a.views || 0), 0),
          favorites: dayData.reduce((s, a) => s + (a.favorites || 0), 0),
          messages: dayData.reduce((s, a) => s + (a.messages || 0), 0),
        };
      });
      setTrafficData(chartPoints);

      // Top listings
      setTopListings((listings || []).slice(0, 5));

      // Category distribution
      if (listings && listings.length > 0) {
        const catMap: Record<string, number> = {};
        listings.forEach(l => {
          const catName = (l as any).categories?.name || 'Uncategorized';
          catMap[catName] = (catMap[catName] || 0) + 1;
        });
        setCategoryDistribution(Object.entries(catMap).map(([name, value]) => ({ name, value })));
      }

      // Hourly activity (simulated from message timestamps)
      const { data: messages } = await supabase
        .from('messages')
        .select('created_at')
        .eq('receiver_id', user.id)
        .gte('created_at', startDate.toISOString());

      const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, count: 0 }));
      (messages || []).forEach(m => {
        const h = new Date(m.created_at).getHours();
        hourBuckets[h].count++;
      });
      setHourlyData(hourBuckets);

    } catch {}
    setLoading(false);
  }, [user, timeRange]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const canAccess = shop && shop.membership_tier !== 'free';

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center mb-2`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
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
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Shop Analytics</h1>
              <p className="text-muted-foreground">Performance insights for {shop?.name || 'your shop'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button>
          </div>
        </div>

        {!canAccess && !loading && (
          <Card className="mb-6 bg-muted/50">
            <CardContent className="p-6 text-center">
              <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Analytics is a Premium feature</p>
              <p className="text-sm text-muted-foreground mb-4">Upgrade to Basic or higher to access detailed analytics.</p>
              <Button asChild><Link to="/membership-plans">View Plans</Link></Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatCard icon={Eye} label="Total Views" value={stats.totalViews} color="bg-blue-500/10 text-blue-500" />
              <StatCard icon={Heart} label="Favorites" value={stats.totalFavorites} color="bg-red-500/10 text-red-500" />
              <StatCard icon={MessageSquare} label="Messages" value={stats.totalMessages} color="bg-green-500/10 text-green-500" />
              <StatCard icon={ShoppingCart} label="Offers" value={stats.totalOffers} color="bg-orange-500/10 text-orange-500" />
              <StatCard icon={TrendingUp} label="Conversion Rate" value={`${stats.conversionRate}%`} color="bg-purple-500/10 text-purple-500" />
            </div>

            <Tabs defaultValue="traffic">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="traffic" className="flex-1">Traffic</TabsTrigger>
                <TabsTrigger value="listings" className="flex-1">Top Listings</TabsTrigger>
                <TabsTrigger value="audience" className="flex-1">Audience</TabsTrigger>
              </TabsList>

              {/* Traffic */}
              <TabsContent value="traffic" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Views & Engagement Over Time</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trafficData}>
                        <defs>
                          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                          <linearGradient id="favGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} fill="url(#viewsGrad)" name="Views" />
                        <Area type="monotone" dataKey="favorites" stroke="#ef4444" strokeWidth={2} fill="url(#favGrad)" name="Favorites" />
                        <Area type="monotone" dataKey="messages" stroke="#10b981" strokeWidth={2} fill="none" name="Messages" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Hourly activity */}
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Hourly Activity</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Messages" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Top Listings */}
              <TabsContent value="listings" className="space-y-4">
                {topListings.length === 0 ? (
                  <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">No listings yet</p></CardContent></Card>
                ) : (
                  topListings.map((listing, i) => (
                    <Card key={listing.id}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <span className="text-lg font-bold text-muted-foreground w-8">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{listing.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {listing.views_count || 0}</span>
                            <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {listing.favorites_count || 0}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{listing.status}</Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild><Link to={`/ad/${listing.slug}-${listing.id}`}>View</Link></Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Audience */}
              <TabsContent value="audience" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Listing Categories</CardTitle></CardHeader>
                    <CardContent>
                      {categoryDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie data={categoryDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => e.name}>
                              {categoryDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <p className="text-muted-foreground text-center py-8">No data</p>}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Shop Followers</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <p className="text-3xl font-bold text-primary">{shop?.total_followers || 0}</p>
                        <p className="text-sm text-muted-foreground">Total followers</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
