import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import {
  Package, Eye, Heart, Share2, MessageSquare, TrendingUp, Activity, Clock,
  FileText, DollarSign, Edit, RefreshCw, Archive, Eye as EyeIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ListingRow {
  id: string;
  title: string;
  status: string;
  condition: string;
  price: number | null;
  views_count: number | null;
  favorites_count: number | null;
  shares_count: number | null;
  offers_count: number | null;
  created_at: string;
  updated_at: string;
  categories: { name: string } | null;
  profiles: { full_name: string | null } | null;
}

interface HistoryRow {
  id: string;
  action: string;
  field_name: string | null;
  created_at: string;
  ads: { title: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  approved: '#22c55e', pending: '#eab308', draft: '#94a3b8', sold: '#3b82f6',
  expired: '#ef4444', paused: '#f97316', hidden: '#a855f7', archived: '#64748b',
  boosted: '#22c55e', premium: '#22c55e', rejected: '#ef4444', scheduled: '#8b5cf6',
};

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: FileText, edited: Edit, price_changed: DollarSign, photo_changed: EyeIcon,
  status_changed: Activity, renewed: RefreshCw, relisted: RefreshCw, marked_sold: Package,
  archived: Archive, restored: RefreshCw, deleted: TrashIcon, duplicated: FileText,
  published: FileText, scheduled: Clock, paused: Clock, resumed: PlayIcon, hidden: EyeIcon,
};

import { Trash2 as TrashIcon, PlayCircle as PlayIcon } from 'lucide-react';

export default function ListingAnalytics() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    const [listingsRes, historyRes] = await Promise.all([
      supabase
        .from('ads')
        .select('*, categories(name), profiles!ads_user_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('listing_history')
        .select('*, ads(title)')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    setListings((listingsRes.data as ListingRow[]) || []);
    setHistory((historyRes.data as HistoryRow[]) || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { navigate('/'); return; }
    if (isAdmin) fetchData();
  }, [user, isAdmin, navigate, fetchData]);

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  // Calculate stats
  const totalListings = listings.length;
  const activeListings = listings.filter(l => ['approved', 'boosted', 'premium'].includes(l.status)).length;
  const draftListings = listings.filter(l => l.status === 'draft').length;
  const soldListings = listings.filter(l => l.status === 'sold').length;
  const expiredListings = listings.filter(l => l.status === 'expired').length;
  const totalViews = listings.reduce((sum, l) => sum + (l.views_count || 0), 0);
  const totalFavorites = listings.reduce((sum, l) => sum + (l.favorites_count || 0), 0);
  const totalShares = listings.reduce((sum, l) => sum + (l.shares_count || 0), 0);
  const totalMessages = listings.reduce((sum, l) => sum + (l.offers_count || 0), 0);

  const formatNum = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  // Status distribution
  const statusCounts: Record<string, number> = {};
  listings.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] || '#94a3b8' }));

  // Category distribution
  const catCounts: Record<string, number> = {};
  listings.forEach(l => {
    const catName = l.categories?.name || 'Uncategorized';
    catCounts[catName] = (catCounts[catName] || 0) + 1;
  });
  const categoryData = Object.entries(catCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

  // Top performing
  const filtered = statusFilter === 'all' ? listings : listings.filter(l => l.status === statusFilter);
  const topListings = [...filtered].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 20);

  return (
    <AdminLayout>
      <PageHeader
        title="Listing Analytics"
        description="Marketplace-wide listing performance and trends"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Listing Analytics' }]}
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview Stats */}
          <StatCardGrid>
            <StatCard title="Total Listings" value={formatNum(totalListings)} icon={Package} />
            <StatCard title="Active" value={formatNum(activeListings)} icon={TrendingUp} />
            <StatCard title="Drafts" value={formatNum(draftListings)} icon={FileText} />
            <StatCard title="Sold" value={formatNum(soldListings)} icon={Package} />
            <StatCard title="Expired" value={formatNum(expiredListings)} icon={Clock} />
            <StatCard title="Total Views" value={formatNum(totalViews)} icon={Eye} />
            <StatCard title="Favorites" value={formatNum(totalFavorites)} icon={Heart} />
            <StatCard title="Shares" value={formatNum(totalShares)} icon={Share2} />
            <StatCard title="Messages" value={formatNum(totalMessages)} icon={MessageSquare} />
          </StatCardGrid>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base">Listing Status Distribution</CardTitle></CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} label={(e: any) => `${e.name}: ${e.value}`}>
                        {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-12">No data available</p>}
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base">Listings by Category (Top 10)</CardTitle></CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-12">No data available</p>}
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Listings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Top Performing Listings</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Favorites</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead className="text-right">Messages</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topListings.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium max-w-xs truncate">{l.title}</TableCell>
                        <TableCell className="text-sm">{l.categories?.name || '—'}</TableCell>
                        <TableCell className="text-sm">{l.profiles?.full_name || '—'}</TableCell>
                        <TableCell className="text-right">{l.views_count || 0}</TableCell>
                        <TableCell className="text-right">{l.favorites_count || 0}</TableCell>
                        <TableCell className="text-right">{l.shares_count || 0}</TableCell>
                        <TableCell className="text-right">{l.offers_count || 0}</TableCell>
                        <TableCell><Badge variant="outline" style={{ borderColor: STATUS_COLORS[l.status], color: STATUS_COLORS[l.status] }}>{l.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</TableCell>
                      </TableRow>
                    ))}
                    {topListings.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No listings found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Recent Listing Activity</CardTitle></CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map(h => {
                    const Icon = ACTION_ICONS[h.action] || Activity;
                    return (
                      <div key={h.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{h.action.replace(/_/g, ' ')}</span>
                            {h.ads?.title && <span className="text-muted-foreground"> on {h.ads.title}</span>}
                            {h.field_name && <span className="text-muted-foreground text-xs"> ({h.field_name})</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-center text-muted-foreground py-8">No recent activity</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
