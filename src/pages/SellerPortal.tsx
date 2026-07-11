import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useSellerFeatures } from '@/hooks/useSellerFeatures';
import { useSellerDashboard } from '@/hooks/useSellerDashboard';
import { useShop } from '@/hooks/useShop';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import {
  Package, TrendingUp, DollarSign, Eye, Clock, Store,
  Plus, Edit, Trash2, Copy, RefreshCw, Archive, Calendar,
  MessageCircle, Star, BarChart3, Wallet, Settings, AlertCircle,
  Truck, MapPin, Vacation, FileText, Download, CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface Ad {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  price_type: string;
  status: string;
  condition: string;
  division: string;
  district: string;
  created_at: string;
  views_count: number | null;
  ad_images: { image_url: string }[];
}

export default function SellerPortal() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, profile } = useAuth();
  const { shop } = useShop();
  const {
    drafts,
    schedules,
    vacationMode,
    payoutMethods,
    transactions,
    transactionSummary,
    payouts,
    shippingPrefs,
    isLoading: featuresLoading,
    setVacationMode,
    updateShippingPrefs,
    deleteDraft,
    deletePayoutMethod,
    setDefaultPayout,
    requestPayout,
  } = useSellerFeatures();
  const {
    analytics,
    listingPerformance,
    viewTrends,
    responseMetrics,
    conversionRate,
    isLoading: dashboardLoading,
    fetchViewTrends,
  } = useSellerDashboard();

  const [ads, setAds] = useState<Ad[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [trendPeriod, setTrendPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [vacationMessage, setVacationMessage] = useState('');
  const [vacationEnabled, setVacationEnabled] = useState(false);
  const [shippingForm, setShippingForm] = useState({
    offers_shipping: true,
    offers_pickup: true,
    offers_delivery: false,
    default_shipping_cost: 0,
    pickup_address: '',
    pickup_city: '',
    pickup_division: '',
    estimated_handling_days: 1,
  });
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethodId, setPayoutMethodId] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (vacationMode) {
      setVacationEnabled(vacationMode.is_active);
      setVacationMessage(vacationMode.message || '');
    }
  }, [vacationMode]);

  useEffect(() => {
    if (shippingPrefs) {
      setShippingForm({
        offers_shipping: shippingPrefs.offers_shipping,
        offers_pickup: shippingPrefs.offers_pickup,
        offers_delivery: shippingPrefs.offers_delivery,
        default_shipping_cost: shippingPrefs.default_shipping_cost,
        pickup_address: shippingPrefs.pickup_address || '',
        pickup_city: shippingPrefs.pickup_city || '',
        pickup_division: shippingPrefs.pickup_division || '',
        estimated_handling_days: shippingPrefs.estimated_handling_days,
      });
    }
  }, [shippingPrefs]);

  const fetchAds = useCallback(async () => {
    if (!user) return;
    setAdsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('id, title, slug, price, price_type, status, condition, division, district, created_at, views_count, ad_images(image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAds((data as Ad[]) || []);
    } catch (err) {
      console.error('fetchAds error:', err);
    } finally {
      setAdsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  useEffect(() => {
    if (user) fetchViewTrends(trendPeriod);
  }, [user, trendPeriod, fetchViewTrends]);

  const handleDuplicate = async (ad: Ad) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('ads')
        .insert({
          user_id: user.id,
          title: `${ad.title} (Copy)`,
          slug: `${ad.slug}-copy-${Date.now()}`,
          description: '',
          category_id: (await supabase.from('ads').select('category_id').eq('id', ad.id).single()).data?.category_id,
          price: ad.price,
          price_type: ad.price_type,
          condition: ad.condition,
          division: ad.division,
          district: ad.district,
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      toast.success('Listing duplicated');
      fetchAds();
    } catch (err) {
      console.error('Duplicate error:', err);
      toast.error('Failed to duplicate listing');
    }
  };

  const handleArchive = async (adId: string) => {
    try {
      const { error } = await supabase
        .from('ads')
        .update({ status: 'archived' })
        .eq('id', adId);
      if (error) throw error;
      toast.success('Listing archived');
      fetchAds();
    } catch (err) {
      toast.error('Failed to archive listing');
    }
  };

  const handleRenew = async (adId: string) => {
    try {
      const { error } = await supabase
        .from('ads')
        .update({
          status: 'approved',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', adId);
      if (error) throw error;
      toast.success('Listing renewed');
      fetchAds();
    } catch (err) {
      toast.error('Failed to renew listing');
    }
  };

  const handleDelete = async (adId: string) => {
    try {
      const { error } = await supabase.from('ads').delete().eq('id', adId);
      if (error) throw error;
      toast.success('Listing deleted');
      fetchAds();
    } catch (err) {
      toast.error('Failed to delete listing');
    }
  };

  const handleSaveVacation = async () => {
    await setVacationMode(vacationEnabled, vacationMessage || undefined);
  };

  const handleSaveShipping = async () => {
    await updateShippingPrefs(shippingForm);
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!payoutMethodId) {
      toast.error('Select a payout method');
      return;
    }
    const result = await requestPayout(amount, payoutMethodId);
    if (result) {
      setPayoutAmount('');
      setPayoutMethodId('');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96" />
        </div>
        <Footer />
      </div>
    );
  }

  const filterAds = (status: string | null) => {
    if (!status) return ads;
    return ads.filter((a) => a.status === status);
  };

  const statCards = [
    { title: 'Active Listings', value: filterAds('approved').length + filterAds('boosted').length + filterAds('premium').length, icon: Package, color: 'text-green-500' },
    { title: 'Sold Items', value: filterAds('sold').length, icon: DollarSign, color: 'text-blue-500' },
    { title: 'Pending', value: filterAds('pending').length, icon: Clock, color: 'text-yellow-500' },
    { title: 'Expired', value: filterAds('expired').length, icon: AlertCircle, color: 'text-red-500' },
    { title: 'Revenue', value: formatPrice(transactionSummary.totalSales, 'fixed'), icon: TrendingUp, color: 'text-purple-500' },
    { title: 'Profile Views', value: analytics?.views || 0, icon: Eye, color: 'text-cyan-500' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Seller Portal — Marketplace</title>
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Seller Portal</h1>
            <p className="text-sm text-muted-foreground">Manage your listings, orders, and seller account</p>
          </div>
          <div className="flex items-center gap-2">
            {!shop && (
              <Link to="/shop-setup">
                <Button size="sm" className="gap-2">
                  <Store className="h-4 w-4" /> Create Shop
                </Button>
              </Link>
            )}
            <Link to="/post-ad">
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Post Ad
              </Button>
            </Link>
          </div>
        </div>

        {/* Upgrade CTA */}
        {!shop && (
          <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Store className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Upgrade to a Shop Membership</p>
                  <p className="text-sm text-muted-foreground">Get a dedicated storefront, advanced analytics, and more.</p>
                </div>
              </div>
              <Link to="/shop-setup">
                <Button className="gap-2">Upgrade Now <Store className="h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {statCards.map((stat, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                    </div>
                    <p className="text-lg font-bold">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">View Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardLoading ? (
                    <Skeleton className="h-48" />
                  ) : viewTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={viewTrends}>
                        <defs>
                          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(220 70% 56%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(220 70% 56%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="views" stroke="hsl(220 70% 56%)" fill="url(#viewsGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-12">No view data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Listings</CardTitle>
                </CardHeader>
                <CardContent>
                  {adsLoading ? (
                    <Skeleton className="h-48" />
                  ) : ads.length > 0 ? (
                    <div className="space-y-2">
                      {ads.slice(0, 5).map((ad) => (
                        <div key={ad.id} className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
                            {ad.ad_images?.[0]?.image_url && (
                              <img src={ad.ad_images[0].image_url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{ad.title}</p>
                            <p className="text-xs text-muted-foreground">{formatPrice(ad.price, ad.price_type)}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs capitalize">{ad.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-12">No listings yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-4">
            <Tabs defaultValue="all">
              <TabsList className="flex flex-wrap h-auto gap-1 mb-3">
                <TabsTrigger value="all">All ({ads.length})</TabsTrigger>
                <TabsTrigger value="active">Active ({filterAds('approved').length + filterAds('boosted').length + filterAds('premium').length})</TabsTrigger>
                <TabsTrigger value="sold">Sold ({filterAds('sold').length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({filterAds('pending').length})</TabsTrigger>
                <TabsTrigger value="expired">Expired ({filterAds('expired').length})</TabsTrigger>
                <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
              </TabsList>

              {['all', 'active', 'sold', 'pending', 'expired'].map((tabKey) => (
                <TabsContent key={tabKey} value={tabKey}>
                  <Card>
                    <CardContent className="p-0">
                      {adsLoading ? (
                        <div className="p-4"><Skeleton className="h-48" /></div>
                      ) : filterAds(tabKey === 'active' ? 'approved' : tabKey === 'all' ? null : tabKey).length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Listing</TableHead>
                              <TableHead className="hidden sm:table-cell">Price</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="hidden md:table-cell">Views</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(tabKey === 'active'
                              ? ads.filter((a) => ['approved', 'boosted', 'premium'].includes(a.status))
                              : tabKey === 'all'
                              ? ads
                              : filterAds(tabKey)
                            ).map((ad) => (
                              <TableRow key={ad.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded bg-muted overflow-hidden shrink-0">
                                      {ad.ad_images?.[0]?.image_url && (
                                        <img src={ad.ad_images[0].image_url} alt="" className="w-full h-full object-cover" />
                                      )}
                                    </div>
                                    <Link to={`/ad/${ad.slug}`} className="text-sm font-medium hover:underline truncate max-w-32 sm:max-w-48">
                                      {ad.title}
                                    </Link>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">{formatPrice(ad.price, ad.price_type)}</TableCell>
                                <TableCell><Badge variant="secondary" className="text-xs capitalize">{ad.status}</Badge></TableCell>
                                <TableCell className="hidden md:table-cell text-sm">{ad.views_count || 0}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/post-ad?edit=${ad.id}`)}>
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDuplicate(ad)}>
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleRenew(ad.id)} title="Renew">
                                      <RefreshCw className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleArchive(ad.id)} title="Archive">
                                      <Archive className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(ad.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-center text-muted-foreground py-12">No listings in this category</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}

              <TabsContent value="drafts">
                <Card>
                  <CardContent className="p-4">
                    {drafts.length > 0 ? (
                      <div className="space-y-2">
                        {drafts.map((draft) => (
                          <div key={draft.id} className="flex items-center gap-3 p-3 rounded-lg border">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{draft.title || 'Untitled draft'}</p>
                              <p className="text-xs text-muted-foreground">
                                {draft.status === 'scheduled' && draft.scheduled_at
                                  ? `Scheduled for ${new Date(draft.scheduled_at).toLocaleDateString()}`
                                  : `Updated ${formatDistanceToNow(new Date(draft.updated_at))} ago`}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteDraft(draft.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No saved drafts</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Scheduled Listings */}
            {schedules.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Scheduled Listings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {schedules.map((sched) => (
                      <div key={sched.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Scheduled for {new Date(sched.scheduled_at).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{sched.is_published ? 'Published' : 'Pending'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Buyer Messages & Inquiries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-3">View and respond to buyer messages</p>
                  <Link to="/messages">
                    <Button variant="outline" size="sm">Go to Messages</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Performance Insights</h3>
              <Select value={trendPeriod} onValueChange={(v) => setTrendPeriod(v as '7d' | '30d' | '90d')}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Response Rate</p>
                  <p className="text-xl font-bold">{responseMetrics?.responseRate || 0}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Avg Response Time</p>
                  <p className="text-xl font-bold">{responseMetrics?.averageResponseTime || 0}h</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
                  <p className="text-xl font-bold">{conversionRate}%</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Seller Reputation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < Math.round(profile?.seller_rating || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="text-lg font-bold">{profile?.seller_rating?.toFixed(1) || '0.0'}</p>
                    <p className="text-xs text-muted-foreground">{profile?.total_sales || 0} sales</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {listingPerformance.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Listing Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Listing</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Inquiries</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Offers</TableHead>
                        <TableHead className="text-right">Favorites</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listingPerformance.slice(0, 10).map((lp) => (
                        <TableRow key={lp.ad_id}>
                          <TableCell className="font-medium truncate max-w-32">{lp.title}</TableCell>
                          <TableCell className="text-right">{lp.views}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{lp.inquiries}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{lp.offers}</TableCell>
                          <TableCell className="text-right">{lp.favorites}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Sales</p>
                  <p className="text-lg font-bold">{formatPrice(transactionSummary.totalSales, 'fixed')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Platform Fees</p>
                  <p className="text-lg font-bold">{formatPrice(transactionSummary.totalFees, 'fixed')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Total Payouts</p>
                  <p className="text-lg font-bold">{formatPrice(transactionSummary.totalPayouts, 'fixed')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Net Revenue</p>
                  <p className="text-lg font-bold text-green-500">{formatPrice(transactionSummary.netRevenue, 'fixed')}</p>
                </CardContent>
              </Card>
            </div>

            {/* Request Payout */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Request Payout
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Amount (৳)</Label>
                    <Input
                      type="number"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payout Method</Label>
                    <Select value={payoutMethodId} onValueChange={setPayoutMethodId}>
                      <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                      <SelectContent>
                        {payoutMethods.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.method_type.replace(/_/g, ' ')} {m.display_identifier ? `(${m.display_identifier})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleRequestPayout} disabled={!payoutAmount || !payoutMethodId}>
                  Request Payout
                </Button>
              </CardContent>
            </Card>

            {/* Payout Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payout Methods</CardTitle>
              </CardHeader>
              <CardContent>
                {payoutMethods.length > 0 ? (
                  <div className="space-y-2">
                    {payoutMethods.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium capitalize">{m.method_type.replace(/_/g, ' ')}</p>
                          {m.display_identifier && <p className="text-xs text-muted-foreground">{m.display_identifier}</p>}
                        </div>
                        {m.is_default && <Badge variant="secondary">Default</Badge>}
                        {!m.is_default && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDefaultPayout(m.id)}>
                            Set Default
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deletePayoutMethod(m.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No payout methods configured</p>
                )}
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 20).map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="capitalize text-sm">{tx.transaction_type.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="text-right text-sm">{formatPrice(tx.amount, 'fixed')}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs capitalize">{tx.status}</Badge></TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No transactions yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            {/* Vacation Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Vacation className="h-4 w-4" /> Vacation Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Enable Vacation Mode</p>
                    <p className="text-xs text-muted-foreground">Hide your listings temporarily</p>
                  </div>
                  <Switch
                    checked={vacationEnabled}
                    onCheckedChange={setVacationEnabled}
                  />
                </div>
                {vacationEnabled && (
                  <div className="space-y-2">
                    <Label>Vacation Message</Label>
                    <Textarea
                      value={vacationMessage}
                      onChange={(e) => setVacationMessage(e.target.value)}
                      placeholder="We're on vacation and will be back soon!"
                      rows={2}
                    />
                  </div>
                )}
                <Button onClick={handleSaveVacation} size="sm">Save Vacation Settings</Button>
              </CardContent>
            </Card>

            {/* Shipping Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Shipping & Pickup Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="offers_shipping">Offer Shipping</Label>
                  <Switch
                    id="offers_shipping"
                    checked={shippingForm.offers_shipping}
                    onCheckedChange={(v) => setShippingForm((prev) => ({ ...prev, offers_shipping: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="offers_pickup">Offer Pickup</Label>
                  <Switch
                    id="offers_pickup"
                    checked={shippingForm.offers_pickup}
                    onCheckedChange={(v) => setShippingForm((prev) => ({ ...prev, offers_pickup: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="offers_delivery">Offer Delivery</Label>
                  <Switch
                    id="offers_delivery"
                    checked={shippingForm.offers_delivery}
                    onCheckedChange={(v) => setShippingForm((prev) => ({ ...prev, offers_delivery: v }))}
                  />
                </div>
                {shippingForm.offers_shipping && (
                  <div className="space-y-2">
                    <Label>Default Shipping Cost (৳)</Label>
                    <Input
                      type="number"
                      value={shippingForm.default_shipping_cost}
                      onChange={(e) => setShippingForm((prev) => ({ ...prev, default_shipping_cost: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                )}
                {shippingForm.offers_pickup && (
                  <>
                    <div className="space-y-2">
                      <Label>Pickup Address</Label>
                      <Input
                        value={shippingForm.pickup_address}
                        onChange={(e) => setShippingForm((prev) => ({ ...prev, pickup_address: e.target.value }))}
                        placeholder="Street address"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          value={shippingForm.pickup_city}
                          onChange={(e) => setShippingForm((prev) => ({ ...prev, pickup_city: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Division</Label>
                        <Input
                          value={shippingForm.pickup_division}
                          onChange={(e) => setShippingForm((prev) => ({ ...prev, pickup_division: e.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Estimated Handling Days</Label>
                  <Input
                    type="number"
                    value={shippingForm.estimated_handling_days}
                    onChange={(e) => setShippingForm((prev) => ({ ...prev, estimated_handling_days: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <Button onClick={handleSaveShipping} size="sm">Save Shipping Preferences</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
