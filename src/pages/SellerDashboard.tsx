import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useSellerDashboard } from '@/hooks/useSellerDashboard';
import { formatPrice } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { Eye, MessageCircle, TrendingUp, DollarSign, Users, Repeat, Clock, BarChart3 } from 'lucide-react';
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const {
    analytics,
    listingPerformance,
    viewTrends,
    responseMetrics,
    revenueCharts,
    followers,
    followerCount,
    repeatBuyers,
    conversionRate,
    isLoading,
    fetchViewTrends,
    fetchRevenueCharts,
  } = useSellerDashboard();
  const [trendPeriod, setTrendPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [revenuePeriod, setRevenuePeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchViewTrends(trendPeriod);
      fetchRevenueCharts(revenuePeriod);
    }
  }, [user, trendPeriod, revenuePeriod, fetchViewTrends, fetchRevenueCharts]);

  if (authLoading || (isLoading && !analytics)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg mb-6" />
          <Skeleton className="h-64 rounded-lg" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Seller Dashboard — BazarBD</title>
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Seller analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Views, inquiries, and revenue for your listings.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/seller-portal')}>Seller portal</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/my/orders')}>Orders</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/my-ads')}>My ads</Button>
            <Button size="sm" onClick={() => navigate('/post-ad')}>Post ad</Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{analytics?.views || 0}</p>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inquiries</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{analytics?.inquiries || 0}</p>
              <p className="text-xs text-muted-foreground">Messages received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground">Views to sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatPrice(analytics?.revenue || 0, 'fixed')}</p>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Revenue Chart
              </CardTitle>
              <Select value={revenuePeriod} onValueChange={(v) => setRevenuePeriod(v as '7d' | '30d' | '90d')}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">90 days</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {revenueCharts.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={revenueCharts}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="url(#revenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <p>No revenue data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                View Trends
              </CardTitle>
              <Select value={trendPeriod} onValueChange={(v) => setTrendPeriod(v as '7d' | '30d' | '90d')}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">90 days</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {viewTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={viewTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <p>No view data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Response Metrics */}
        {responseMetrics && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Response Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                  <p className="text-xl font-bold">{responseMetrics.responseRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                  <p className="text-xl font-bold">{responseMetrics.averageResponseTime}h</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Responses</p>
                  <p className="text-xl font-bold">{responseMetrics.totalResponses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Listing Performance Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Listing Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {listingPerformance.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Inquiries</TableHead>
                      <TableHead>Offers</TableHead>
                      <TableHead>Favorites</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listingPerformance.map((listing) => (
                      <TableRow key={listing.ad_id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{listing.title}</TableCell>
                        <TableCell>{listing.views}</TableCell>
                        <TableCell>{listing.inquiries}</TableCell>
                        <TableCell>{listing.offers}</TableCell>
                        <TableCell>{listing.favorites}</TableCell>
                        <TableCell>
                          <Badge variant={listing.status === 'approved' ? 'default' : 'secondary'}>
                            {listing.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No listings yet</p>
            )}
          </CardContent>
        </Card>

        {/* Followers & Repeat Buyers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Followers ({followerCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {followers.length > 0 ? (
                <div className="space-y-3">
                  {followers.slice(0, 5).map((f) => (
                    <div key={f.follower_id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={f.avatar_url || undefined} />
                        <AvatarFallback>{f.full_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.full_name || 'Anonymous'}</p>
                        <p className="text-xs text-muted-foreground">
                          Following {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {followers.length > 5 && (
                    <p className="text-sm text-muted-foreground">+{followers.length - 5} more</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No followers yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                Repeat Buyers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {repeatBuyers.length > 0 ? (
                <div className="space-y-3">
                  {repeatBuyers.slice(0, 5).map((b) => (
                    <div key={b.buyer_id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={b.avatar_url || undefined} />
                        <AvatarFallback>{b.full_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.full_name || 'Anonymous'}</p>
                        <p className="text-xs text-muted-foreground">{b.purchaseCount} purchases</p>
                      </div>
                      <Badge variant="secondary">{formatPrice(b.totalSpent, 'fixed')}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No repeat buyers yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
