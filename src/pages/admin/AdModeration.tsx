/**
 * AdModeration — Enterprise moderation dashboard with queue workspace.
 *
 * Two modes:
 * 1. Queue mode (default): shows pending ads list. Clicking one opens the
 *    ModerationWorkspace for continuous queue navigation.
 * 2. Workspace mode: full-screen single-ad review with auto-advance.
 *
 * Also retains table/grid view for browsing all statuses.
 */
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Search, CheckCircle, XCircle, Eye, Flag, Archive, Trash2,
  LayoutGrid, Table as TableIcon, Columns, AlertTriangle,
  ShieldCheck, Image as ImageIcon, Clock, Package, Loader2,
  Heart, MoreVertical, ChevronLeft, ChevronRight, Zap, Crown, Star,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ModerationWorkspace } from '@/components/admin/ModerationWorkspace';
import { AdminRejectDialog } from '@/components/admin/AdminRejectDialog';
import {
  startModerationSession, endModerationSession, getActiveSession,
  updateSessionStats, type ModerationSession,
} from '@/lib/moderation';

interface AdImage {
  id: string;
  image_url: string;
  sort_order: number;
}

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
  is_negotiable: boolean | null;
  views_count: number | null;
  favorites_count: number | null;
  shares_count: number | null;
  rejection_message: string | null;
  rejection_reason_code: string | null;
  created_at: string;
  updated_at: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  user_id: string;
  ad_images: AdImage[];
  categories: { name: string; slug: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const PAGE_SIZE = 50;

export default function AdModeration() {
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('member');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'workspace'>('table');
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [shopOwnerIds, setShopOwnerIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; title?: string; bulk?: number } | null>(null);
  const [session, setSession] = useState<ModerationSession | null>(null);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, approvals: 0, rejections: 0, skipped: 0, escalated: 0 });
  const sessionRef = useRef<string | null>(null);

  // =========================================================================
  // Session Management
  // =========================================================================

  useEffect(() => {
    if (!user) return;
    // Try to resume an existing session
    getActiveSession(user.id).then(existing => {
      if (existing) {
        setSession(existing);
        sessionRef.current = existing.id;
      }
    });
  }, [user]);

  const ensureSession = useCallback(async () => {
    if (!user) return null;
    if (sessionRef.current) return sessionRef.current;

    const pendingCount = await supabase
      .from('ads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const s = await startModerationSession(user.id, user.email || 'Moderator', pendingCount.count || 0);
    if (s) {
      setSession(s);
      sessionRef.current = s.id;
      return s.id;
    }
    return null;
  }, [user]);

  // =========================================================================
  // Data Fetching
  // =========================================================================

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch shop owner IDs for queue routing
      const { data: shopsData } = await supabase.from('shops').select('owner_id');
      const shopIds = new Set((shopsData || []).map(s => s.owner_id));
      setShopOwnerIds(shopIds);

      let query = supabase
        .from('ads')
        .select('*, ad_images(image_url, sort_order, id), categories(name, slug)', { count: 'exact' })
        .order('created_at', { ascending: true });

      // Queue-based filtering
      if (activeTab === 'member') {
        // Ads from shop owners or subscribers — status pending, not edited resubmit
        query = query.eq('status', 'pending').neq('rejection_reason_code', 'edited_resubmit');
      } else if (activeTab === 'general') {
        // Ads from normal customers — status pending, not edited resubmit
        query = query.eq('status', 'pending').neq('rejection_reason_code', 'edited_resubmit');
      } else if (activeTab === 'listing') {
        // Ads from users who exceeded their limit (no limit yet — same as general for now)
        query = query.eq('status', 'pending').neq('rejection_reason_code', 'edited_resubmit');
      } else if (activeTab === 'edited') {
        // Ads that were edited and need re-review
        query = query.eq('status', 'pending').eq('rejection_reason_code', 'edited_resubmit');
      } else if (activeTab === 'verify') {
        // Auto-approved ads that need verification
        query = query.eq('status', 'auto_approved');
      } else if (activeTab === 'all') {
        // All statuses
      } else {
        query = query.eq('status', activeTab);
      }

      if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);

      query = query.limit(PAGE_SIZE);
      const { data, error, count } = await query;

      if (error) throw error;

      let filteredAds = (data as Ad[]) || [];

      // Client-side filtering for member vs general based on shop ownership
      if (activeTab === 'member') {
        filteredAds = filteredAds.filter(a => shopIds.has(a.user_id));
      } else if (activeTab === 'general') {
        filteredAds = filteredAds.filter(a => !shopIds.has(a.user_id));
      }

      setAds(filteredAds);
      setTotalCount(filteredAds.length);
    } catch (err) {
      console.error('fetchAds error:', err);
    }
    setLoading(false);
  }, [activeTab, searchQuery]);

  useEffect(() => {
    supabase.from('categories').select('id, name, slug').order('sort_order').then(({ data }) => {
      setCategories((data as Category[]) || []);
    });
  }, []);

  useEffect(() => { fetchAds(); }, [fetchAds]);
  useEffect(() => { setPage(1); }, [activeTab, searchQuery]);

  // =========================================================================
  // Queue Navigation
  // =========================================================================

  const openInWorkspace = async (ad: Ad, index: number) => {
    setSelectedAd(ad);
    setCurrentIndex(index);
    setViewMode('workspace');
    // Start or resume session when entering workspace from queue
    if (activeTab === 'member' || activeTab === 'general' || activeTab === 'listing' || activeTab === 'edited' || activeTab === 'verify' || activeTab === 'all') {
      await ensureSession();
    }
  };

  const navigateNext = useCallback(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < ads.length) {
      setCurrentIndex(nextIdx);
      setSelectedAd(ads[nextIdx]);
    } else {
      // Try to load more
      toast.info('No more ads in queue');
    }
  }, [currentIndex, ads]);

  const navigatePrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setSelectedAd(ads[prevIdx]);
    }
  }, [currentIndex, ads]);

  const handleActionComplete = useCallback(async (action: string) => {
    // Update session stats
    if (sessionRef.current) {
      if (action === 'approve') {
        setSessionStats(prev => ({ ...prev, approvals: prev.approvals + 1, reviewed: prev.reviewed + 1 }));
        await updateSessionStats(sessionRef.current, 'ads_reviewed');
        await updateSessionStats(sessionRef.current, 'approvals');
      } else if (action === 'reject') {
        setSessionStats(prev => ({ ...prev, rejections: prev.rejections + 1, reviewed: prev.reviewed + 1 }));
        await updateSessionStats(sessionRef.current, 'ads_reviewed');
        await updateSessionStats(sessionRef.current, 'rejections');
      } else if (action === 'skip') {
        setSessionStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
        await updateSessionStats(sessionRef.current, 'skipped');
      } else if (action === 'escalate') {
        setSessionStats(prev => ({ ...prev, escalated: prev.escalated + 1 }));
        await updateSessionStats(sessionRef.current, 'escalated');
      } else {
        setSessionStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));
        await updateSessionStats(sessionRef.current, 'ads_reviewed');
      }
    }

    // Remove the current ad from the list and load next
    const newAds = ads.filter(a => a.id !== selectedAd?.id);
    setAds(newAds);
    setTotalCount(prev => Math.max(0, prev - 1));

    if (newAds.length > 0) {
      // Load next ad (same index position, since we removed current)
      const nextAd = newAds[Math.min(currentIndex, newAds.length - 1)];
      setSelectedAd(nextAd);
      // Keep currentIndex as is — the next ad slides into position
    } else {
      // Queue empty
      setSelectedAd(null);
      setViewMode('table');
      toast.success('Queue complete! All ads reviewed.');
    }
  }, [ads, selectedAd, currentIndex]);

  const exitWorkspace = useCallback(() => {
    setViewMode('table');
    setSelectedAd(null);
    fetchAds(); // Refresh the list
  }, [fetchAds]);

  // =========================================================================
  // Table Actions (for non-workspace mode)
  // =========================================================================

  const handleTableAction = async (action: string, adId: string, extra?: any) => {
    setActionLoading(adId);
    try {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (action === 'approve') updates.status = 'approved';
      else if (action === 'reject') {
        updates.status = 'rejected';
        if (extra?.reasonCode) updates.rejection_reason_code = extra.reasonCode;
        if (extra?.notes) updates.rejection_message = extra.notes;
      }
      else if (action === 'sold') updates.status = 'sold';
      else if (action === 'archive') updates.status = 'draft';
      else if (action === 'delete') {
        await supabase.from('ads').delete().eq('id', adId);
        setAds(prev => prev.filter(a => a.id !== adId));
        toast.success('Listing deleted');
        setActionLoading(null);
        return;
      }
      else if (action === 'feature') updates.is_featured = true;
      else if (action === 'unfeature') updates.is_featured = false;
      else if (action === 'boost') { updates.is_boosted = true; updates.status = 'boosted'; }
      else if (action === 'unboost') updates.is_boosted = false;
      else if (action === 'premium') { updates.is_premium = true; updates.status = 'premium'; }
      else if (action === 'unpremium') updates.is_premium = false;

      const { error } = await supabase.from('ads').update(updates).eq('id', adId);
      if (error) throw error;

      setAds(prev => prev.map(a => a.id === adId ? { ...a, ...updates } as Ad : a));
      toast.success(`Listing ${action}d`);

      // Notify seller for approve/reject
      if (action === 'approve' || action === 'reject') {
        const ad = ads.find(a => a.id === adId);
        if (ad) {
          try {
            await supabase.from('notifications').insert({
              user_id: ad.user_id,
              type: action === 'approve' ? 'ad_approved' : 'ad_rejected',
              title: action === 'approve' ? 'Your ad has been approved' : 'Your ad was rejected',
              body: `"${ad.title}"`,
            });
          } catch {}
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Action failed');
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
    await handleTableAction('reject', rejectTarget.id, { reasonCode, notes, notifySeller });
    setRejectTarget(null);
  };

  const [page, setPage] = useState(1);

  // =========================================================================
  // Render: Workspace Mode
  // =========================================================================

  if (viewMode === 'workspace' && selectedAd) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1">
          <ModerationWorkspace
            ad={selectedAd}
            categories={categories}
            queuePosition={currentIndex + 1}
            queueTotal={totalCount}
            sessionId={sessionRef.current}
            enteredFromQueue={['member', 'general', 'listing', 'edited', 'verify'].includes(activeTab)}
            onActionComplete={handleActionComplete}
            onNavigateNext={navigateNext}
            onNavigatePrev={navigatePrev}
            onClose={exitWorkspace}
          />
        </div>
        <MobileNav />
        <Footer />
      </div>
    );
  }

  // =========================================================================
  // Render: Table/Grid Mode
  // =========================================================================

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 lg:pb-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Ad Moderation</h1>
              <p className="text-sm text-muted-foreground">
                {totalCount} {activeTab === 'member' ? 'member' : activeTab === 'general' ? 'general' : activeTab === 'listing' ? 'listing' : activeTab === 'edited' ? 'edited' : activeTab === 'verify' ? 'verify' : 'total'} ads
                {session && ` · Session: ${sessionStats.reviewed} reviewed, ${sessionStats.approvals} approved, ${sessionStats.rejections} rejected`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border bg-card p-0.5">
              <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => setViewMode('table')}>
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => setViewMode('grid')}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Queue tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <div className="overflow-x-auto pb-2">
            <TabsList className="w-max">
              <TabsTrigger value="member" className="gap-1.5">
                <Crown className="h-3.5 w-3.5" /> Member
              </TabsTrigger>
              <TabsTrigger value="general" className="gap-1.5">
                <Package className="h-3.5 w-3.5" /> General
              </TabsTrigger>
              <TabsTrigger value="listing" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Listing
              </TabsTrigger>
              <TabsTrigger value="edited" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Edited
              </TabsTrigger>
              <TabsTrigger value="verify" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Verify
              </TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {/* Content */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : ads.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-1">No ads found</h3>
              <p className="text-sm text-muted-foreground">
                {['member', 'general', 'listing', 'edited', 'verify'].includes(activeTab) ? 'The queue is empty!' : `No ${activeTab} ads match your filters.`}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ads.map((ad, idx) => (
              <Card key={ad.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openInWorkspace(ad, idx)}>
                <CardContent className="p-3">
                  <div className="aspect-square rounded-lg bg-muted mb-2 overflow-hidden">
                    {ad.ad_images?.[0] ? (
                      <img src={ad.ad_images[0].image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground opacity-30" /></div>
                    )}
                  </div>
                  <h4 className="text-sm font-medium line-clamp-1">{ad.title}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{formatPrice(ad.price)}</span>
                    <Badge variant="secondary" className="text-xs capitalize">{ad.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Table view */
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stats</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad, idx) => (
                  <TableRow
                    key={ad.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => openInWorkspace(ad, idx)}
                  >
                    <TableCell>
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                        {ad.ad_images?.[0] ? (
                          <img src={ad.ad_images[0].image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground opacity-30" /></div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm line-clamp-1">{ad.title}</div>
                      <div className="text-xs text-muted-foreground">{ad.division}, {ad.district}</div>
                    </TableCell>
                    <TableCell className="text-sm">{formatPrice(ad.price)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">{ad.status}</Badge>
                      {ad.is_featured && <Star className="inline h-3 w-3 ml-1 text-amber-500" />}
                      {ad.is_boosted && <Zap className="inline h-3 w-3 ml-1 text-blue-500" />}
                      {ad.is_premium && <Crown className="inline h-3 w-3 ml-1 text-purple-500" />}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{ad.views_count || 0}</span>
                        <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{ad.favorites_count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ad.created_at))} ago
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openInWorkspace(ad, idx)} className="gap-2">
                            <Eye className="h-3.5 w-3.5" /> Open in Workspace
                          </DropdownMenuItem>
                          {ad.status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleTableAction('approve', ad.id)} className="gap-2 text-green-600">
                              <CheckCircle className="h-3.5 w-3.5" /> Approve
                            </DropdownMenuItem>
                          )}
                          {ad.status !== 'rejected' && ad.status !== 'sold' && (
                            <DropdownMenuItem onClick={() => openRejectDialog(ad.id, ad.title)} className="gap-2 text-destructive">
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleTableAction(ad.is_featured ? 'unfeature' : 'feature', ad.id)} className="gap-2">
                            <Star className="h-3.5 w-3.5" /> {ad.is_featured ? 'Unfeature' : 'Feature'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTableAction(ad.is_boosted ? 'unboost' : 'boost', ad.id)} className="gap-2">
                            <Zap className="h-3.5 w-3.5" /> {ad.is_boosted ? 'Unboost' : 'Boost'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTableAction(ad.is_premium ? 'unpremium' : 'premium', ad.id)} className="gap-2">
                            <Crown className="h-3.5 w-3.5" /> {ad.is_premium ? 'Unpremium' : 'Premium'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleTableAction('archive', ad.id)} className="gap-2">
                            <Archive className="h-3.5 w-3.5" /> Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTableAction('delete', ad.id)} className="gap-2 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Queue hint */}
        {['member', 'general', 'listing', 'edited', 'verify'].includes(activeTab) && ads.length > 0 && !loading && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
            <strong>Tip:</strong> Click any ad to open the moderation workspace. After approving or rejecting, the next ad loads automatically — no need to return to the list.
          </div>
        )}
      </main>

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
