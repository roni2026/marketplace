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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useShop } from '@/hooks/useShop';
import { formatPrice } from '@/lib/constants';
import {
  getShopBusinessOverview,
  getShopRevenueChart,
  getShopTrafficChart,
  getShopConversionChart,
  getBestSellingProducts,
  getLowStockAlerts,
  getShopCustomerAnalytics,
  getShopInventorySummary,
  getShopOrders,
  type BusinessOverview,
  type BestSellingProduct,
  type LowStockAlert,
  type CustomerAnalytics,
  type InventorySummary,
} from '@/lib/shopAnalytics';
import type { ShopOrder } from '@/integrations/supabase/types_v3_shops';
import {
  DollarSign, TrendingUp, Package, Users, Star, ShoppingCart,
  BarChart3, AlertTriangle, Eye, Activity, Settings, Ticket,
  Plus, ShieldCheck, ArrowLeft,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, Line, LineChart,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

export default function ShopDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { shop, isLoading: shopLoading } = useShop();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [overview, setOverview] = useState<BusinessOverview | null>(null);
  const [revenueChart, setRevenueChart] = useState<{ date: string; revenue: number; profit: number }[]>([]);
  const [trafficChart, setTrafficChart] = useState<{ date: string; views: number; unique_visitors: number }[]>([]);
  const [conversionChart, setConversionChart] = useState<{ date: string; conversions: number; conversion_rate: number }[]>([]);
  const [bestProducts, setBestProducts] = useState<BestSellingProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [customers, setCustomers] = useState<CustomerAnalytics | null>(null);
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !shopLoading && !shop) {
      navigate('/shop-setup');
    }
  }, [shop, shopLoading, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!shop) return;
    setIsLoadingData(true);
    try {
      const [ov, rev, traffic, conv, products, stock, cust, inv, ords] = await Promise.all([
        getShopBusinessOverview(shop.id),
        getShopRevenueChart(shop.id, period),
        getShopTrafficChart(shop.id, period),
        getShopConversionChart(shop.id, period),
        getBestSellingProducts(shop.id, 10),
        getLowStockAlerts(shop.id),
        getShopCustomerAnalytics(shop.id),
        getShopInventorySummary(shop.id),
        getShopOrders(shop.id, { limit: 20 }),
      ]);
      setOverview(ov);
      setRevenueChart(rev);
      setTrafficChart(traffic);
      setConversionChart(conv);
      setBestProducts(products);
      setLowStock(stock);
      setCustomers(cust);
      setInventory(inv);
      setOrders(ords);
    } catch (err) {
      console.error('ShopDashboard fetch error:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [shop, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (authLoading || shopLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-semibold mb-2">No shop yet</h1>
          <p className="text-muted-foreground mb-6">Set up your shop to unlock the dashboard, staff tools, and analytics.</p>
          <Link to="/shop-setup" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Create shop</Link>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  const statCards = [
    { title: 'Total Revenue', value: formatPrice(overview?.total_revenue || 0, 'fixed'), icon: DollarSign, color: 'text-green-500' },
    { title: 'Total Profit', value: formatPrice(overview?.total_profit || 0, 'fixed'), icon: TrendingUp, color: 'text-blue-500' },
    { title: 'Total Orders', value: overview?.total_orders || 0, icon: ShoppingCart, color: 'text-purple-500' },
    { title: 'Avg Order Value', value: formatPrice(overview?.avg_order_value || 0, 'fixed'), icon: DollarSign, color: 'text-orange-500' },
    { title: 'Conversion Rate', value: `${overview?.conversion_rate || 0}%`, icon: Activity, color: 'text-cyan-500' },
    { title: 'Total Products', value: overview?.total_products || 0, icon: Package, color: 'text-pink-500' },
    { title: 'Followers', value: overview?.total_followers || 0, icon: Users, color: 'text-indigo-500' },
    { title: 'Avg Rating', value: `${overview?.avg_rating || 0}★`, icon: Star, color: 'text-yellow-500' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Shop Dashboard — {shop.name}</title>
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{shop.name}</h1>
                {shop.is_verified && (
                  <Badge className="bg-blue-500 hover:bg-blue-500 gap-1">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </Badge>
                )}
                {shop.is_featured && (
                  <Badge className="bg-purple-500 hover:bg-purple-500">Featured</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Shop Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/shop/${shop.slug}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="h-4 w-4" /> View Shop
              </Button>
            </Link>
            <Link to="/shop-settings">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" /> Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {statCards.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.title}</p>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Period Selector */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Analytics</h2>
          <Select value={period} onValueChange={(v) => setPeriod(v as '7d' | '30d' | '90d')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sales">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <Skeleton className="h-64" />
                ) : revenueChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={revenueChart}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(142 71% 45%)" fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-16">No sales data yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Best-Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <Skeleton className="h-48" />
                ) : bestProducts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Views</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bestProducts.map((p) => (
                        <TableRow key={p.ad_id}>
                          <TableCell className="font-medium">{p.title}</TableCell>
                          <TableCell className="text-right">{formatPrice(p.price, 'fixed')}</TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{p.views}</TableCell>
                          <TableCell className="text-right">{formatPrice(p.revenue, 'fixed')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No products sold yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue vs Profit</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <Skeleton className="h-64" />
                ) : revenueChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueChart}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="hsl(220 70% 56%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-16">No revenue data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            {inventory && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Products</p>
                    <p className="text-xl font-bold">{inventory.total_products}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">In Stock</p>
                    <p className="text-xl font-bold text-green-500">{inventory.in_stock}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Low Stock</p>
                    <p className="text-xl font-bold text-yellow-500">{inventory.low_stock}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Out of Stock</p>
                    <p className="text-xl font-bold text-red-500">{inventory.out_of_stock}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <Skeleton className="h-48" />
                ) : lowStock.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Variant</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStock.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell>{item.variant_name || '—'}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={item.stock === 0 ? 'destructive' : 'secondary'}>
                              {item.stock}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No low stock alerts</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            {customers && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Customers</p>
                    <p className="text-xl font-bold">{customers.total_customers}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Repeat Customers</p>
                    <p className="text-xl font-bold">{customers.repeat_customers}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Avg Order Value</p>
                    <p className="text-xl font-bold">{formatPrice(customers.avg_order_value, 'fixed')}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Customers</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <Skeleton className="h-48" />
                ) : customers && customers.top_customers.length > 0 ? (
                  <div className="space-y-3">
                    {customers.top_customers.map((c) => (
                      <div key={c.buyer_id} className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={c.avatar_url || undefined} />
                          <AvatarFallback>{c.full_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.full_name || 'Anonymous'}</p>
                          <p className="text-xs text-muted-foreground">{c.total_orders} orders</p>
                        </div>
                        <Badge variant="secondary">{formatPrice(c.total_spent, 'fixed')}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No customers yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Traffic Tab */}
          <TabsContent value="traffic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Views & Unique Visitors</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <Skeleton className="h-64" />
                ) : trafficChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trafficChart}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="views" stroke="hsl(220 70% 56%)" strokeWidth={2} />
                      <Line type="monotone" dataKey="unique_visitors" stroke="hsl(280 65% 60%)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-16">No traffic data yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <Skeleton className="h-64" />
                ) : conversionChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={conversionChart}>
                      <defs>
                        <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(25 95% 53%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(25 95% 53%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="conversions" stroke="hsl(25 95% 53%)" fill="url(#convGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-16">No conversion data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <Skeleton className="h-48" />
                ) : orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">{o.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatPrice(o.total_amount, 'fixed')}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {new Date(o.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No orders yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/shop-settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" /> Shop Settings
            </Button>
          </Link>
          <Link to="/shop-staff">
            <Button variant="outline" size="sm">Staff</Button>
          </Link>
          <Link to="/shop-analytics">
            <Button variant="outline" size="sm">Analytics</Button>
          </Link>
          <Link to="/shop-coupons">
            <Button variant="outline" size="sm" className="gap-2">
              <Ticket className="h-4 w-4" /> Create Coupon
            </Button>
          </Link>
          <Link to="/post-ad">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </Link>
          <Link to="/shop-verification">
            <Button variant="outline" size="sm" className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Verification
            </Button>
          </Link>
        </div>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
