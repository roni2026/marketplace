/**
 * ReviewModeration — Enterprise-grade review moderation dashboard.
 *
 * Features:
 * - Queue tabs: All, Pending, Approved, Rejected, Appealed
 * - View modes: Table, Split-panel
 * - Filters: search, rating filter, date range
 * - Detail panel: review content, rating, seller info, reviewer info, listing info
 * - Actions: approve, reject, appeal, delete
 * - Bulk: approve all, reject all
 * - Stats: pending, approved today, rejected today, avg rating
 */
import { useEffect, useState, useCallback } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AdminBulkActions } from '@/components/admin/AdminBulkActions';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Search, Filter, CheckCircle, XCircle, Star, Eye, Download,
  ChevronLeft, ChevronRight, Columns, Table as TableIcon, SlidersHorizontal,
  MoreVertical, Trash2, Clock, MessageSquare, User, Package,
} from 'lucide-react';

interface Review {
  id: string;
  seller_id: string;
  reviewer_id: string;
  ad_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  comment: string | null;
  status: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  appeal_reason: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'appealed', label: 'Appealed' },
  { value: 'all', label: 'All' },
];

const PER_PAGE = 20;

export default function ReviewModeration() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [viewMode, setViewMode] = useState<'table' | 'split'>('table');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, rejectedToday: 0, avgRating: 0 });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{ seller: any; buyer: any; ad: any }>({ seller: null, buyer: null, ad: null });

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('reviews').select('*', { count: 'exact' });
      if (activeTab !== 'all') query = query.eq('status', activeTab);
      if (searchQuery.trim()) query = query.or(`comment.ilike.%${searchQuery}%,body.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`);
      if (ratingFilter !== 'all') {
        if (ratingFilter === 'positive') query = query.gte('rating', 4);
        else if (ratingFilter === 'negative') query = query.lte('rating', 2);
        else if (ratingFilter === 'neutral') query = query.eq('rating', 3);
      }
      query = query.order('created_at', { ascending: sort === 'oldest' });
      query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
      const { data, count } = await query;
      setReviews((data as Review[]) || []);
      setTotalCount(count || 0);

      const today = new Date().toISOString().split('T')[0];
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved').gte('updated_at', today),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'rejected').gte('updated_at', today),
      ]);
      const { data: avgData } = await supabase.from('reviews').select('rating').eq('status', 'approved');
      const avg = avgData && avgData.length > 0 ? (avgData.reduce((s, r) => s + r.rating, 0) / avgData.length).toFixed(1) : '0';
      setStats({ pending: pendingRes.count || 0, approvedToday: approvedRes.count || 0, rejectedToday: rejectedRes.count || 0, avgRating: parseFloat(avg) });
    } catch {}
    setLoading(false);
  }, [activeTab, searchQuery, ratingFilter, sort, page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { setPage(1); }, [activeTab, searchQuery, ratingFilter, sort]);

  const loadDetail = async (review: Review) => {
    try {
      const [sellerRes, buyerRes, adRes] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, is_verified, seller_rating, total_sales').eq('user_id', review.seller_id).maybeSingle(),
        supabase.from('profiles').select('full_name, avatar_url, is_verified').eq('user_id', review.reviewer_id).maybeSingle(),
        review.ad_id ? supabase.from('ads').select('title, slug, price, ad_images(image_url)').eq('id', review.ad_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setDetailData({ seller: sellerRes.data, buyer: buyerRes.data, ad: adRes.data });
    } catch {}
  };

  useEffect(() => { if (selectedReview) loadDetail(selectedReview); }, [selectedReview]);

  const handleAction = async (action: string, reviewId: string) => {
    setActionLoading(reviewId);
    try {
      const updates: Record<string, any> = {};
      switch (action) {
        case 'approve': updates.status = 'approved'; break;
        case 'reject': updates.status = 'rejected'; break;
        case 'appeal': updates.status = 'appealed'; break;
        case 'delete': await supabase.from('reviews').delete().eq('id', reviewId); setReviews(prev => prev.filter(r => r.id !== reviewId)); toast.success('Review deleted'); setActionLoading(null); return;
      }
      await supabase.from('reviews').update(updates).eq('id', reviewId);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, ...updates } : r));
      toast.success(`Review ${action}d`);
    } catch { toast.error('Failed'); }
    setActionLoading(null);
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setActionLoading('bulk');
    try {
      if (action === 'delete') { await supabase.from('reviews').delete().in('id', ids); }
      else { const updates = { status: action === 'approve' ? 'approved' : 'rejected' }; await supabase.from('reviews').update(updates).in('id', ids); }
      toast.success(`${ids.length} reviews ${action}d`); setSelectedIds(new Set()); fetchReviews();
    } catch { toast.error('Bulk action failed'); }
    setActionLoading(null);
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectAll = () => { if (selectedIds.size === reviews.length) setSelectedIds(new Set()); else setSelectedIds(new Set(reviews.map(r => r.id))); };
  const navigateReview = (dir: 'prev' | 'next') => { if (!selectedReview) return; const idx = reviews.findIndex(r => r.id === selectedReview.id); if (dir === 'prev' && idx > 0) setSelectedReview(reviews[idx - 1]); if (dir === 'next' && idx < reviews.length - 1) setSelectedReview(reviews[idx + 1]); };

  const statusBadge = (status: string) => {
    const map: Record<string, any> = { pending: 'secondary', approved: 'default', rejected: 'destructive', appealed: 'outline' };
    return <Badge variant={map[status] || 'secondary'} className="text-[10px] capitalize">{status}</Badge>;
  };

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center"><Star className="h-6 w-6" /></div>
            <div><h1 className="text-2xl font-bold">Review Moderation</h1><p className="text-muted-foreground">{totalCount} reviews</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${viewMode === 'table' ? 'bg-card shadow-sm' : ''}`} onClick={() => setViewMode('table')}><TableIcon className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${viewMode === 'split' ? 'bg-card shadow-sm' : ''}`} onClick={() => setViewMode('split')}><Columns className="h-4 w-4" /></Button>
            </div>
            <Select value={sort} onValueChange={setSort}><SelectTrigger className="w-[150px] gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest First</SelectItem><SelectItem value="oldest">Oldest First</SelectItem></SelectContent></Select>
            <Sheet>
              <SheetTrigger asChild><Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /><span className="hidden sm:inline">Filters</span></Button></SheetTrigger>
              <SheetContent side="right"><SheetHeader><SheetTitle>Filter Reviews</SheetTitle></SheetHeader>
                <div className="mt-6 space-y-4">
                  <div><Label>Search</Label><div className="relative mt-1"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search comments..." className="pl-8" /></div></div>
                  <div><Label>Rating</Label><Select value={ratingFilter} onValueChange={setRatingFilter}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Ratings</SelectItem><SelectItem value="positive">Positive (4-5★)</SelectItem><SelectItem value="neutral">Neutral (3★)</SelectItem><SelectItem value="negative">Negative (1-2★)</SelectItem></SelectContent></Select></div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-yellow-500/10 text-yellow-600 flex items-center justify-center"><Clock className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center"><CheckCircle className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.approvedToday}</p><p className="text-xs text-muted-foreground">Approved Today</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center"><XCircle className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.rejectedToday}</p><p className="text-xs text-muted-foreground">Rejected Today</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center"><Star className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.avgRating}</p><p className="text-xs text-muted-foreground">Avg Rating</p></div></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2"><TabsList className="w-max">{STATUS_TABS.map(t => <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5">{t.label}{t.value === 'pending' && stats.pending > 0 && <Badge variant="destructive" className="text-[9px] h-4 px-1">{stats.pending}</Badge>}</TabsTrigger>)}</TabsList></div>
        </Tabs>

        <div className={`grid gap-6 mt-4 ${viewMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          <div className={viewMode === 'split' ? 'min-h-[600px]' : ''}>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : reviews.length === 0 ? (
              <Card><CardContent className="p-12 text-center"><Star className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No reviews found</p></CardContent></Card>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={selectedIds.size === reviews.length && reviews.length > 0} onCheckedChange={selectAll} /></TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead className="hidden md:table-cell">Rating</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead className="w-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map(r => (
                      <TableRow key={r.id} className={`cursor-pointer hover:bg-accent/50 ${selectedReview?.id === r.id ? 'bg-accent' : ''} ${r.status === 'pending' ? 'border-l-2 border-l-yellow-500' : ''}`} onClick={() => viewMode === 'split' ? setSelectedReview(r) : undefined}>
                        <TableCell onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></TableCell>
                        <TableCell><p className="text-sm line-clamp-2">{r.body || r.comment || r.title || '(no comment)'}</p></TableCell>
                        <TableCell className="hidden md:table-cell"><div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'text-yellow-500 fill-current' : 'text-muted'}`} />)}</div></TableCell>
                        <TableCell className="hidden md:table-cell">{statusBadge(r.status)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Select defaultValue="" onValueChange={v => { if (v) handleAction(v, r.id); }}>
                            <SelectTrigger className="h-8 w-8 p-0 border-0"><MoreVertical className="h-4 w-4" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view" onClick={() => setSelectedReview(r)}>View Details</SelectItem>
                              {r.status === 'pending' && <SelectItem value="approve">Approve</SelectItem>}
                              {r.status !== 'rejected' && <SelectItem value="reject">Reject</SelectItem>}
                              <SelectItem value="delete">Delete</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="px-4 text-sm">Page {page} of {totalPages}</span>
                <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </div>

          {viewMode === 'split' && selectedReview && (
            <div className="border rounded-lg sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Review Details</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateReview('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateReview('next')}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedReview(null)}>Close</Button>
                </div>
              </div>

              {/* Rating */}
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-1 mb-2">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-6 w-6 ${i < selectedReview.rating ? 'text-yellow-500 fill-current' : 'text-muted'}`} />)}</div>
                {statusBadge(selectedReview.status)}
              </div>

              {/* Comment */}
              {selectedReview.comment && <div className="p-3 rounded-lg bg-muted/50 text-sm">{selectedReview.comment}</div>}
              {selectedReview.body && <div className="p-3 rounded-lg bg-muted/50 text-sm">{selectedReview.body}</div>}
              {selectedReview.title && <div className="p-3 rounded-lg bg-muted/50 text-sm font-medium">{selectedReview.title}</div>}

              {/* Seller */}
              {detailData.seller && (
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10"><AvatarImage src={detailData.seller.avatar_url || ''} /><AvatarFallback>{(detailData.seller.full_name || '?')[0]}</AvatarFallback></Avatar>
                  <div><p className="font-medium text-sm">Seller: {detailData.seller.full_name || 'Unknown'}</p><p className="text-xs text-muted-foreground">⭐ {detailData.seller.seller_rating || 0} · 📦 {detailData.seller.total_sales || 0} sold</p></div>
                </div>
              )}

              {/* Buyer */}
              {detailData.buyer && (
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10"><AvatarImage src={detailData.buyer.avatar_url || ''} /><AvatarFallback>{(detailData.buyer.full_name || '?')[0]}</AvatarFallback></Avatar>
                  <div><p className="font-medium text-sm">Reviewer: {detailData.buyer.full_name || 'Unknown'}</p></div>
                </div>
              )}

              {/* Listing */}
              {detailData.ad && (
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {detailData.ad.ad_images?.[0]?.image_url && <img src={detailData.ad.ad_images[0].image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                  <div><p className="font-medium text-sm">{detailData.ad.title}</p><p className="text-sm text-primary">৳{detailData.ad.price?.toLocaleString()}</p></div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">Submitted {formatDistanceToNow(new Date(selectedReview.created_at), { addSuffix: true })}</p>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {selectedReview.status === 'pending' && <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => handleAction('approve', selectedReview.id)}><CheckCircle className="h-4 w-4" /> Approve</Button>}
                {selectedReview.status !== 'rejected' && <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleAction('reject', selectedReview.id)}><XCircle className="h-4 w-4" /> Reject</Button>}
                <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => handleAction('delete', selectedReview.id)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <AdminBulkActions selectedCount={selectedIds.size} onClear={() => setSelectedIds(new Set())} onBulkAction={handleBulkAction} />

      {viewMode !== 'split' && selectedReview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedReview(null)}>
          <div className="bg-card rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="font-semibold">Review Details</h3><Button variant="ghost" size="sm" onClick={() => setSelectedReview(null)}>Close</Button></div>
            <div className="text-center py-4"><div className="flex items-center justify-center gap-1 mb-2">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-6 w-6 ${i < selectedReview.rating ? 'text-yellow-500 fill-current' : 'text-muted'}`} />)}</div>{statusBadge(selectedReview.status)}</div>
            {selectedReview.comment && <div className="p-3 rounded-lg bg-muted/50 text-sm">{selectedReview.comment}</div>}
            {selectedReview.body && <div className="p-3 rounded-lg bg-muted/50 text-sm">{selectedReview.body}</div>}
            {selectedReview.title && <div className="p-3 rounded-lg bg-muted/50 text-sm font-medium">{selectedReview.title}</div>}
            {detailData.seller && <div className="flex items-center gap-3 p-3 rounded-lg border"><Avatar className="h-10 w-10"><AvatarImage src={detailData.seller.avatar_url || ''} /><AvatarFallback>{(detailData.seller.full_name || '?')[0]}</AvatarFallback></Avatar><div><p className="font-medium text-sm">Seller: {detailData.seller.full_name}</p><p className="text-xs text-muted-foreground">⭐ {detailData.seller.seller_rating || 0}</p></div></div>}
            {detailData.buyer && <div className="flex items-center gap-3 p-3 rounded-lg border"><Avatar className="h-10 w-10"><AvatarImage src={detailData.buyer.avatar_url || ''} /><AvatarFallback>{(detailData.buyer.full_name || '?')[0]}</AvatarFallback></Avatar><div><p className="font-medium text-sm">Reviewer: {detailData.buyer.full_name}</p></div></div>}
            <p className="text-xs text-muted-foreground">Submitted {formatDistanceToNow(new Date(selectedReview.created_at), { addSuffix: true })}</p>
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {selectedReview.status === 'pending' && <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => handleAction('approve', selectedReview.id)}><CheckCircle className="h-4 w-4" /> Approve</Button>}
              {selectedReview.status !== 'rejected' && <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleAction('reject', selectedReview.id)}><XCircle className="h-4 w-4" /> Reject</Button>}
              <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => handleAction('delete', selectedReview.id)}><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
      <Footer />
    </div>
  );
}
