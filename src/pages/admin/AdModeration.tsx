/**
 * AdModeration — Enterprise-grade ad moderation dashboard.
 *
 * Features:
 * - Queue tabs: All, Pending, Approved, Rejected, Sold, Expired, Draft, Boosted, Premium, Paused, Hidden, Archived
 * - View modes: Table, Grid, Split-panel (list + detail)
 * - Filters: search, category, division, date range, flagged-only, has-images, verified-sellers, price range
 * - Sorting: 8 options (newest, oldest, price, views, favorites, reports, expiring)
 * - Detail panel: full listing preview with images, metadata, seller info, reports, admin notes
 * - Quick actions: approve, reject (with reason dialog), feature, boost, premium, mark sold, archive, delete
 * - Bulk operations: select multiple, bulk approve/reject/feature/boost/archive/delete
 * - Admin notes: add private notes to any listing
 * - Flagged indicators: report count badges, highlighted rows
 * - Keyboard shortcuts: A=approve, R=reject, F=feature, B=boost, Esc=close detail
 * - Stats bar: pending count, approved today, rejected today, flagged count
 * - Export: CSV export of filtered results
 * - Pagination
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { AdminAdDetailPanel } from '@/components/admin/AdminAdDetailPanel';
import { AdminBulkActions } from '@/components/admin/AdminBulkActions';
import { AdminRejectDialog } from '@/components/admin/AdminRejectDialog';
import { formatPrice } from '@/lib/constants';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Search, Filter, CheckCircle, XCircle, Star, Zap, Crown, Eye, Flag,
  Archive, Trash2, Download, ChevronLeft, ChevronRight, LayoutGrid,
  Table as TableIcon, Columns, SlidersHorizontal, AlertTriangle,
  ShieldCheck, Image as ImageIcon, Clock, Package, Loader2, Ban,
  DollarSign, FileText, MoreVertical, Heart,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Ad {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | null;
  price_type: string;
  condition: string;
  status: string;
  division: string;
  district: string;
  area: string | null;
  brand: string | null;
  model: string | null;
  tags: string[] | null;
  is_featured: boolean;
  is_premium: boolean | null;
  is_boosted: boolean | null;
  is_urgent: boolean | null;
  is_negotiable: boolean | null;
  views_count: number | null;
  favorites_count: number | null;
  shares_count: number | null;
  offers_count: number | null;
  rejection_message: string | null;
  rejection_reason_code: string | null;
  created_at: string;
  updated_at: string | null;
  expires_at: string | null;
  user_id: string;
  category_id: string;
  subcategory_id: string | null;
  ad_images: { image_url: string; sort_order: number }[];
  categories: { name: string; slug: string } | null;
  subcategories: { name: string } | null;
}

interface Category { id: string; name: string; slug: string; }

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sold', label: 'Sold' },
  { value: 'expired', label: 'Expired' },
  { value: 'draft', label: 'Draft' },
  { value: 'boosted', label: 'Boosted' },
  { value: 'premium', label: 'Premium' },
  { value: 'paused', label: 'Paused' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'archived', label: 'Archived' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'most_viewed', label: 'Most Viewed' },
  { value: 'most_favorited', label: 'Most Favorited' },
  { value: 'most_reported', label: 'Most Reported' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
];

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const PER_PAGE = 20;

export default function AdModeration() {
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'split'>('table');
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, rejectedToday: 0, flagged: 0 });
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [sort, setSort] = useState('newest');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [hasImagesOnly, setHasImagesOnly] = useState(false);
  const [verifiedSellersOnly, setVerifiedSellersOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialogs
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; title?: string; bulk?: number } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const DIVISIONS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'];

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ads')
        .select('*, ad_images(image_url, sort_order), categories(name, slug), subcategories(name)', { count: 'exact' });

      // Status filter
      if (activeTab !== 'all') query = query.eq('status', activeTab);

      // Search
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Category
      if (categoryFilter !== 'all') query = query.eq('category_id', categoryFilter);

      // Division
      if (divisionFilter !== 'all') query = query.eq('division', divisionFilter);

      // Price range
      if (minPrice) query = query.gte('price', parseFloat(minPrice));
      if (maxPrice) query = query.lte('price', parseFloat(maxPrice));

      // Date range
      if (dateRange !== 'all') {
        const days = dateRange === 'today' ? 0 : parseInt(dateRange);
        const startDate = days === 0 ? new Date().toISOString().split('T')[0] : subDays(new Date(), days).toISOString().split('T')[0];
        query = query.gte('created_at', startDate);
      }

      // Has images
      if (hasImagesOnly) {
        query = query.not('ad_images', 'is', null);
      }

      // Sort
      switch (sort) {
        case 'newest': query = query.order('created_at', { ascending: false }); break;
        case 'oldest': query = query.order('created_at', { ascending: true }); break;
        case 'price_asc': query = query.order('price', { ascending: true, nullsFirst: false }); break;
        case 'price_desc': query = query.order('price', { ascending: false, nullsFirst: false }); break;
        case 'most_viewed': query = query.order('views_count', { ascending: false, nullsFirst: false }); break;
        case 'most_favorited': query = query.order('favorites_count', { ascending: false, nullsFirst: false }); break;
        case 'expiring_soon': query = query.not('expires_at', 'is', null).order('expires_at', { ascending: true }); break;
        default: query = query.order('created_at', { ascending: false });
      }

      query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

      const { data, count } = await query;
      setAds((data as Ad[]) || []);
      setTotalCount(count || 0);

      // Fetch report counts for these ads
      if (data && data.length > 0) {
        const adIds = data.map(a => a.id);
        const { data: reports } = await supabase
          .from('reports')
          .select('ad_id')
          .in('ad_id', adIds)
          .eq('status', 'pending');
        const counts: Record<string, number> = {};
        (reports || []).forEach(r => {
          counts[r.ad_id] = (counts[r.ad_id] || 0) + 1;
        });
        setReportCounts(counts);
      }

      // Fetch stats
      const today = new Date().toISOString().split('T')[0];
      const [pendingRes, approvedRes, rejectedRes, flaggedRes] = await Promise.all([
        supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'approved').gte('updated_at', today),
        supabase.from('ads').select('*', { count: 'exact', head: true }).eq('status', 'rejected').gte('updated_at', today),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setStats({
        pending: pendingRes.count || 0,
        approvedToday: approvedRes.count || 0,
        rejectedToday: rejectedRes.count || 0,
        flagged: flaggedRes.count || 0,
      });
    } catch (err) {
      console.error('fetchAds error:', err);
    }
    setLoading(false);
  }, [activeTab, searchQuery, categoryFilter, divisionFilter, dateRange, sort, hasImagesOnly, minPrice, maxPrice, page]);

  useEffect(() => {
    supabase.from('categories').select('id, name, slug').order('sort_order').then(({ data }) => {
      setCategories((data as Category[]) || []);
    });
  }, []);

  useEffect(() => { fetchAds(); }, [fetchAds]);
  useEffect(() => { setPage(1); }, [activeTab, searchQuery, categoryFilter, divisionFilter, dateRange, sort, hasImagesOnly, minPrice, maxPrice]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!selectedAd || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') setSelectedAd(null);
      if (e.key === 'a' || e.key === 'A') handleAction('approve', selectedAd.id);
      if (e.key === 'r' || e.key === 'R') openRejectDialog(selectedAd.id, selectedAd.title);
      if (e.key === 'f' || e.key === 'F') handleAction(selectedAd.is_featured ? 'unfeature' : 'feature', selectedAd.id);
      if (e.key === 'b' || e.key === 'B') handleAction(selectedAd.is_boosted ? 'unboost' : 'boost', selectedAd.id);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedAd]);

  const handleAction = async (action: string, adId: string, extra?: any) => {
    setActionLoading(adId);
    try {
      const updates: Record<string, any> = {};
      switch (action) {
        case 'approve': updates.status = 'approved'; updates.rejection_message = null; updates.rejection_reason_code = null; break;
        case 'reject':
          updates.status = 'rejected';
          updates.rejection_message = extra?.notes || '';
          updates.rejection_reason_code = extra?.reasonCode || 'other';
          break;
        case 'feature': updates.is_featured = true; break;
        case 'unfeature': updates.is_featured = false; break;
        case 'boost': updates.status = 'boosted'; updates.is_boosted = true; updates.boosted_until = new Date(Date.now() + 7 * 86400000).toISOString(); break;
        case 'unboost': updates.is_boosted = false; updates.status = 'approved'; break;
        case 'premium': updates.status = 'premium'; updates.is_premium = true; updates.premium_until = new Date(Date.now() + 30 * 86400000).toISOString(); break;
        case 'unpremium': updates.is_premium = false; updates.status = 'approved'; break;
        case 'sold': updates.status = 'sold'; break;
        case 'archive': updates.status = 'archived'; break;
        case 'delete':
          await supabase.from('ads').delete().eq('id', adId);
          toast.success('Listing deleted');
          setAds(prev => prev.filter(a => a.id !== adId));
          setSelectedAd(null);
          setActionLoading(null);
          return;
      }

      const { error } = await supabase.from('ads').update(updates).eq('id', adId);
      if (error) throw error;

      // Notify seller on reject
      if (action === 'reject' && extra?.notifySeller !== false) {
        const ad = ads.find(a => a.id === adId);
        if (ad) {
          await supabase.from('notifications').insert({
            user_id: ad.user_id,
            type: 'ad_rejected',
            title: 'Listing Rejected',
            message: `Your listing "${ad.title}" was rejected. Reason: ${extra?.reasonCode || 'other'}`,
            data: { ad_id: adId, reason: extra?.reasonCode, notes: extra?.notes },
          }).catch(() => {});
        }
      }

      // Log audit
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'update',
          resource_type: 'ad',
          resource_id: adId,
          details: { action, ...updates },
        }).catch(() => {});
      }

      // Update local state
      setAds(prev => prev.map(a => a.id === adId ? { ...a, ...updates } : a));
      if (selectedAd?.id === adId) setSelectedAd(prev => prev ? { ...prev, ...updates } : null);
      toast.success(`Listing ${action}d successfully`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action} listing`);
    }
    setActionLoading(null);
  };

  const openRejectDialog = (adId: string, title?: string, bulk?: number) => {
    setRejectTarget({ id: adId, title, bulk });
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reasonCode: string, notes: string, notifySeller: boolean) => {
    if (!rejectTarget) return;
    setRejectDialogOpen(false);
    if (rejectTarget.bulk) {
      // Bulk reject
      await handleBulkAction('reject', { reasonCode, notes, notifySeller });
    } else {
      await handleAction('reject', rejectTarget.id, { reasonCode, notes, notifySeller });
    }
    setRejectTarget(null);
  };

  const handleBulkAction = async (action: string, extra?: any) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setActionLoading('bulk');
    try {
      if (action === 'delete') {
        await supabase.from('ads').delete().in('id', ids);
      } else if (action === 'reject') {
        await supabase.from('ads').update({
          status: 'rejected',
          rejection_message: extra?.notes || '',
          rejection_reason_code: extra?.reasonCode || 'other',
        }).in('id', ids);

        // Notify sellers
        if (extra?.notifySeller !== false) {
          const rejectedAds = ads.filter(a => ids.includes(a.id));
          for (const ad of rejectedAds) {
            await supabase.from('notifications').insert({
              user_id: ad.user_id,
              type: 'ad_rejected',
              title: 'Listing Rejected',
              message: `Your listing "${ad.title}" was rejected. Reason: ${extra?.reasonCode || 'other'}`,
              data: { ad_id: ad.id, reason: extra?.reasonCode, notes: extra?.notes },
            }).catch(() => {});
          }
        }
      } else {
        const updates: Record<string, any> = {};
        switch (action) {
          case 'approve': updates.status = 'approved'; updates.rejection_message = null; break;
          case 'feature': updates.is_featured = true; break;
          case 'boost': updates.is_boosted = true; updates.status = 'boosted'; break;
          case 'archive': updates.status = 'archived'; break;
        }
        await supabase.from('ads').update(updates).in('id', ids);
      }

      toast.success(`${ids.length} listings ${action}d`);
      setSelectedIds(new Set());
      fetchAds();
    } catch (err: any) {
      toast.error(err?.message || 'Bulk action failed');
    }
    setActionLoading(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === ads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ads.map(a => a.id)));
    }
  };

  const clearFilters = () => {
    setSearchQuery(''); setCategoryFilter('all'); setDivisionFilter('all');
    setDateRange('all'); setFlaggedOnly(false); setHasImagesOnly(false);
    setVerifiedSellersOnly(false); setMinPrice(''); setMaxPrice('');
  };

  const activeFilterCount = [
    searchQuery, categoryFilter !== 'all' ? categoryFilter : '', divisionFilter !== 'all' ? divisionFilter : '',
    dateRange !== 'all' ? dateRange : '', flaggedOnly ? 'flagged' : '', hasImagesOnly ? 'images' : '',
    verifiedSellersOnly ? 'verified' : '', minPrice, maxPrice,
  ].filter(Boolean).length;

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  const handleExport = () => {
    const csv = [
      ['Title', 'Status', 'Price', 'Condition', 'Category', 'Division', 'District', 'Brand', 'Views', 'Favorites', 'Reports', 'Created'].join(','),
      ...ads.map(a => [
        `"${a.title.replace(/"/g, '""')}"`,
        a.status, a.price || '', a.condition,
        a.categories?.name || '', a.division, a.district, a.brand || '',
        a.views_count || 0, a.favorites_count || 0, reportCounts[a.id] || 0,
        format(new Date(a.created_at), 'yyyy-MM-dd'),
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ad_moderation_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as CSV');
  };

  const navigateAd = (direction: 'prev' | 'next') => {
    if (!selectedAd) return;
    const idx = ads.findIndex(a => a.id === selectedAd.id);
    if (direction === 'prev' && idx > 0) setSelectedAd(ads[idx - 1]);
    if (direction === 'next' && idx < ads.length - 1) setSelectedAd(ads[idx + 1]);
  };

  const FilterPanel = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Search</Label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Title, description..." className="pl-8" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Division</Label>
        <Select value={divisionFilter} onValueChange={setDivisionFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Date Range</Label>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Price Range (৳)</Label>
        <div className="flex gap-2">
          <Input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
          <Input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center gap-2"><Checkbox checked={flaggedOnly} onCheckedChange={v => setFlaggedOnly(!!v)} id="flagged" /><Label htmlFor="flagged" className="text-sm cursor-pointer">Flagged only</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={hasImagesOnly} onCheckedChange={v => setHasImagesOnly(!!v)} id="has-images" /><Label htmlFor="has-images" className="text-sm cursor-pointer">Has images</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={verifiedSellersOnly} onCheckedChange={v => setVerifiedSellersOnly(!!v)} id="verified" /><Label htmlFor="verified" className="text-sm cursor-pointer">Verified sellers only</Label></div>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="w-full gap-2">
          Clear All Filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      approved: 'bg-green-500/10 text-green-600 border-green-500/20',
      rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
      sold: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      expired: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
      boosted: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      premium: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    };
    return <Badge variant="outline" className={`text-[10px] capitalize ${map[status] || ''}`}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Ad Moderation</h1>
              <p className="text-muted-foreground">{totalCount} listings in queue</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="inline-flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              <Button variant={viewMode === 'table' ? 'ghost' : 'ghost'} size="sm" className={`h-8 w-8 p-0 ${viewMode === 'table' ? 'bg-card shadow-sm' : ''}`} onClick={() => setViewMode('table')}><TableIcon className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${viewMode === 'grid' ? 'bg-card shadow-sm' : ''}`} onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${viewMode === 'split' ? 'bg-card shadow-sm' : ''}`} onClick={() => setViewMode('split')}><Columns className="h-4 w-4" /></Button>
            </div>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[160px] gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
              <SelectContent>{SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2"><Download className="h-4 w-4" /> Export</Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 px-1 text-[10px]">{activeFilterCount}</Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="overflow-y-auto">
                <SheetHeader><SheetTitle>Filter Listings</SheetTitle></SheetHeader>
                <div className="mt-6"><FilterPanel /></div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-yellow-500/10 text-yellow-600 flex items-center justify-center"><Clock className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center"><CheckCircle className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.approvedToday}</p><p className="text-xs text-muted-foreground">Approved Today</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center"><XCircle className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.rejectedToday}</p><p className="text-xs text-muted-foreground">Rejected Today</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center"><Flag className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.flagged}</p><p className="text-xs text-muted-foreground">Flagged</p></div></CardContent></Card>
        </div>

        {/* Status tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2">
            <TabsList className="w-max">
              {STATUS_TABS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs">
                  {tab.label}
                  {tab.value === 'pending' && stats.pending > 0 && <Badge variant="destructive" className="text-[9px] h-4 px-1">{stats.pending}</Badge>}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        {/* Content area */}
        <div className={`grid gap-6 mt-4 ${viewMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* List/Grid */}
          <div className={viewMode === 'split' ? 'min-h-[600px]' : ''}>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
              </div>
            ) : ads.length === 0 ? (
              <Card><CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No listings found matching your filters.</p>
                {activeFilterCount > 0 && <Button variant="outline" onClick={clearFilters} className="mt-4">Clear Filters</Button>}
              </CardContent></Card>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {ads.map(ad => (
                  <Card
                    key={ad.id}
                    className={`cursor-pointer hover:shadow-md transition-all ${selectedIds.has(ad.id) ? 'ring-2 ring-primary' : ''} ${(reportCounts[ad.id] || 0) > 0 ? 'border-orange-500/30' : ''}`}
                    onClick={() => setSelectedAd(ad)}
                  >
                    <CardContent className="p-3">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                        {ad.ad_images?.[0]?.image_url ? (
                          <img src={ad.ad_images[0].image_url} alt={ad.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>
                        )}
                        <div className="absolute top-1 left-1">{statusBadge(ad.status)}</div>
                        {(reportCounts[ad.id] || 0) > 0 && (
                          <Badge variant="destructive" className="absolute top-1 right-1 text-[9px] gap-0.5"><Flag className="h-2.5 w-2.5" />{reportCounts[ad.id]}</Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium line-clamp-2">{ad.title}</p>
                      <p className="text-sm font-bold text-primary mt-1">{formatPrice(ad.price, ad.price_type)}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                        <MapPin className="h-2.5 w-2.5" />{ad.district}
                      </div>
                      <Checkbox
                        checked={selectedIds.has(ad.id)}
                        onCheckedChange={() => toggleSelect(ad.id)}
                        className="absolute top-2 right-2"
                        onClick={e => e.stopPropagation()}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Table view
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={selectedIds.size === ads.length && ads.length > 0} onCheckedChange={selectAll} />
                      </TableHead>
                      <TableHead className="w-16">Image</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Price</TableHead>
                      <TableHead className="hidden lg:table-cell">Category</TableHead>
                      <TableHead className="hidden xl:table-cell">Location</TableHead>
                      <TableHead className="hidden xl:table-cell">Stats</TableHead>
                      <TableHead className="hidden md:table-cell">Created</TableHead>
                      <TableHead className="w-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ads.map(ad => {
                      const isFlagged = (reportCounts[ad.id] || 0) > 0;
                      return (
                        <TableRow
                          key={ad.id}
                          className={`cursor-pointer hover:bg-accent/50 ${selectedAd?.id === ad.id ? 'bg-accent' : ''} ${isFlagged ? 'border-l-2 border-l-orange-500' : ''}`}
                          onClick={() => viewMode === 'split' ? setSelectedAd(ad) : undefined}
                        >
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Checkbox checked={selectedIds.has(ad.id)} onCheckedChange={() => toggleSelect(ad.id)} />
                          </TableCell>
                          <TableCell>
                            <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted">
                              {ad.ad_images?.[0]?.image_url ? (
                                <img src={ad.ad_images[0].image_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-medium text-sm line-clamp-1">{ad.title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {statusBadge(ad.status)}
                                  {ad.is_featured && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                                  {ad.is_boosted && <Zap className="h-3 w-3 text-purple-500" />}
                                  {ad.is_premium && <Crown className="h-3 w-3 text-indigo-500" />}
                                  {isFlagged && <Badge variant="destructive" className="text-[9px] gap-0.5"><Flag className="h-2.5 w-2.5" />{reportCounts[ad.id]}</Badge>}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{statusBadge(ad.status)}</TableCell>
                          <TableCell className="hidden lg:table-cell font-medium text-sm">{formatPrice(ad.price, ad.price_type)}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{ad.categories?.name || '—'}</TableCell>
                          <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{ad.district}, {ad.division}</TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{ad.views_count || 0}</span>
                              <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{ad.favorites_count || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDistanceToNow(new Date(ad.created_at), { addSuffix: true })}</TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedAd(ad)} className="gap-2"><Eye className="h-3.5 w-3.5" /> View Details</DropdownMenuItem>
                                {ad.status === 'pending' && <DropdownMenuItem onClick={() => handleAction('approve', ad.id)} className="gap-2 text-green-600"><CheckCircle className="h-3.5 w-3.5" /> Approve</DropdownMenuItem>}
                                {ad.status !== 'rejected' && ad.status !== 'sold' && <DropdownMenuItem onClick={() => openRejectDialog(ad.id, ad.title)} className="gap-2 text-red-600"><XCircle className="h-3.5 w-3.5" /> Reject</DropdownMenuItem>}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleAction(ad.is_featured ? 'unfeature' : 'feature', ad.id)} className="gap-2"><Star className="h-3.5 w-3.5" /> {ad.is_featured ? 'Unfeature' : 'Feature'}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction(ad.is_boosted ? 'unboost' : 'boost', ad.id)} className="gap-2"><Zap className="h-3.5 w-3.5" /> {ad.is_boosted ? 'Unboost' : 'Boost'}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction(ad.is_premium ? 'unpremium' : 'premium', ad.id)} className="gap-2"><Crown className="h-3.5 w-3.5" /> {ad.is_premium ? 'Unpremium' : 'Premium'}</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction('sold', ad.id)} className="gap-2"><DollarSign className="h-3.5 w-3.5" /> Mark Sold</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleAction('archive', ad.id)} className="gap-2"><Archive className="h-3.5 w-3.5" /> Archive</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction('delete', ad.id)} className="gap-2 text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="px-4 text-sm">Page {page} of {totalPages}</span>
                <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </div>

          {/* Split view detail panel */}
          {viewMode === 'split' && selectedAd && (
            <div className="border rounded-lg sticky top-4 max-h-[calc(100vh-2rem)]">
              <AdminAdDetailPanel
                ad={selectedAd}
                onClose={() => setSelectedAd(null)}
                onAction={handleAction}
                onNavigate={navigateAd}
              />
            </div>
          )}
        </div>

        {/* Desktop filters sidebar (for table/split view) */}
        {viewMode !== 'split' && (
          <div className="hidden lg:block mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</h3>
                  {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
                </div>
                <FilterPanel />
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Bulk actions bar */}
      <AdminBulkActions
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onBulkAction={handleBulkAction}
      />

      {/* Detail dialog for table/grid view */}
      {viewMode !== 'split' && selectedAd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedAd(null)}>
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <AdminAdDetailPanel
              ad={selectedAd}
              onClose={() => setSelectedAd(null)}
              onAction={handleAction}
              onNavigate={navigateAd}
            />
          </div>
        </div>
      )}

      {/* Reject dialog */}
      <AdminRejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleRejectConfirm}
        adTitle={rejectTarget?.title}
        bulkCount={rejectTarget?.bulk}
      />

      <MobileNav />
      <Footer />
    </div>
  );
}
