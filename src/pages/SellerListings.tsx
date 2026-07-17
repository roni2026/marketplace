import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { useListingManagement } from '@/hooks/useListingManagement';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/constants';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus, Search, Edit, Copy, Pause, Play, Archive, Trash2, RefreshCw, Eye,
  MoreVertical, History, Share2, DollarSign, Package, CheckSquare, X, ChevronLeft,
} from 'lucide-react';

interface Ad {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  price_type: string;
  status: string;
  condition: string;
  listing_type: string | null;
  brand: string | null;
  model: string | null;
  division: string;
  district: string;
  views_count: number | null;
  created_at: string;
  ad_images: { image_url: string; sort_order: number }[];
  categories: { name: string; slug: string } | null;
}

interface Category { id: string; name: string; slug: string; }

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  approved: 'default', boosted: 'default', premium: 'default',
  pending: 'secondary', draft: 'secondary', archived: 'secondary',
  sold: 'outline', expired: 'destructive', paused: 'outline', hidden: 'secondary',
  rejected: 'destructive', scheduled: 'outline',
};

export default function SellerListings() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const {
    bulkOperation, fetchHistory, duplicateListing, pauseListing, resumeListing,
    markAsSold, renewListing, archiveListing, restoreListing, deleteListing,
    softDeleteListing, shareListing,
  } = useListingManagement();

  const [ads, setAds] = useState<Ad[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Dialogs
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [deleteAdId, setDeleteAdId] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkPriceType, setBulkPriceType] = useState('fixed');
  const [bulkCategoryId, setBulkCategoryId] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const fetchAds = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ads')
      .select('*, ad_images(image_url, sort_order), categories(name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setAds((data as Ad[]) || []);
    setIsLoading(false);
  }, [user]);

  const fetchCats = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setCategories((data as Category[]) || []);
  }, []);

  useEffect(() => {
    if (user) { fetchAds(); fetchCats(); }
  }, [user, fetchAds, fetchCats]);

  // Filtering
  const filteredAds = ads.filter(ad => {
    if (searchTerm && !ad.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter !== 'all' && ad.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && ad.categories?.slug !== categoryFilter) return false;
    if (typeFilter !== 'all' && ad.listing_type !== typeFilter) return false;
    return true;
  });

  // Stats
  const stats = {
    total: ads.length,
    active: ads.filter(a => ['approved', 'boosted', 'premium'].includes(a.status)).length,
    drafts: ads.filter(a => a.status === 'draft').length,
    sold: ads.filter(a => a.status === 'sold').length,
    paused: ads.filter(a => a.status === 'paused').length,
    expired: ads.filter(a => a.status === 'expired').length,
  };

  // Selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAds.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredAds.map(a => a.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Bulk actions
  const handleBulk = async (operation: any, params?: Record<string, unknown>) => {
    if (selectedIds.size === 0) return;
    await bulkOperation(operation, [...selectedIds], params);
    clearSelection();
    fetchAds();
  };

  // Single actions
  const handleAction = async (action: string, ad: Ad) => {
    switch (action) {
      case 'edit':
        navigate(`/post-ad-v4?edit=${ad.id}`);
        break;
      case 'duplicate':
        await duplicateListing(ad.id);
        fetchAds();
        break;
      case 'pause':
        await pauseListing(ad.id);
        fetchAds();
        break;
      case 'resume':
        await resumeListing(ad.id);
        fetchAds();
        break;
      case 'sold':
        await markAsSold(ad.id);
        fetchAds();
        break;
      case 'renew':
        await renewListing(ad.id);
        fetchAds();
        break;
      case 'archive':
        await archiveListing(ad.id);
        fetchAds();
        break;
      case 'restore':
        await restoreListing(ad.id);
        fetchAds();
        break;
      case 'share': {
        const url = await shareListing(ad.id);
        if (url) {
          if (navigator.share) navigator.share({ url, title: ad.title });
          else { navigator.clipboard.writeText(url); toast.success('Link copied'); }
        }
        break;
      }
      case 'history':
        setHistoryLoading(true);
        setShowHistoryDialog(true);
        const records = await fetchHistory(ad.id);
        setHistoryRecords(records as any[]);
        setHistoryLoading(false);
        break;
    }
  };

  const handleDelete = async () => {
    if (!deleteAdId) return;
    await softDeleteListing(deleteAdId);
    setDeleteAdId(null);
    fetchAds();
  };

  const handleBulkPriceUpdate = async () => {
    const price = parseFloat(bulkPrice);
    if (isNaN(price)) { toast.error('Invalid price'); return; }
    await handleBulk('bulk_price_update', { price, price_type: bulkPriceType });
    setShowPriceDialog(false);
    setBulkPrice('');
  };

  const handleBulkCategoryChange = async () => {
    if (!bulkCategoryId) { toast.error('Select a category'); return; }
    await handleBulk('bulk_category_change', { category_id: bulkCategoryId });
    setShowCategoryDialog(false);
    setBulkCategoryId('');
  };

  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <Link to="/seller-portal" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1">
              <ChevronLeft className="h-4 w-4" /> Back to Seller Portal
            </Link>
            <h1 className="text-2xl font-bold">Listing Management</h1>
            <p className="text-sm text-muted-foreground">Manage all your listings in one place</p>
          </div>
          <Button onClick={() => navigate('/post-ad')} className="gap-2"><Plus className="h-4 w-4" /> Create New Listing</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, icon: Package },
            { label: 'Active', value: stats.active, icon: Eye },
            { label: 'Drafts', value: stats.drafts, icon: Edit },
            { label: 'Sold', value: stats.sold, icon: CheckSquare },
            { label: 'Paused', value: stats.paused, icon: Pause },
            { label: 'Expired', value: stats.expired, icon: RefreshCw },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search listings..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="approved">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="used">Used</SelectItem>
              <SelectItem value="refurbished">Refurbished</SelectItem>
              <SelectItem value="open-box">Open Box</SelectItem>
              <SelectItem value="handmade">Handmade</SelectItem>
              <SelectItem value="collectibles">Collectibles</SelectItem>
              <SelectItem value="vintage">Vintage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-border mx-1" />
            <Button size="sm" variant="outline" onClick={() => handleBulk('bulk_publish')} className="gap-1.5"><CheckSquare className="h-3.5 w-3.5" /> Publish</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulk('bulk_pause')} className="gap-1.5"><Pause className="h-3.5 w-3.5" /> Pause</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulk('bulk_archive')} className="gap-1.5"><Archive className="h-3.5 w-3.5" /> Archive</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulk('bulk_delete')} className="gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulk('bulk_renew')} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Renew</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulk('bulk_relist')} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Relist</Button>
            <Button size="sm" variant="outline" onClick={() => setShowPriceDialog(true)} className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Price Update</Button>
            <Button size="sm" variant="outline" onClick={() => setShowCategoryDialog(true)} className="gap-1.5"><Package className="h-3.5 w-3.5" /> Change Category</Button>
            <Button size="sm" variant="ghost" onClick={clearSelection} className="ml-auto gap-1.5"><X className="h-3.5 w-3.5" /> Clear</Button>
          </div>
        )}

        {/* Listings Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : filteredAds.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No listings found</p>
                <Button onClick={() => navigate('/post-ad')} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Create Your First Listing</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"><Checkbox checked={selectedIds.size === filteredAds.length && filteredAds.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                      <TableHead>Listing</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAds.map(ad => (
                      <TableRow key={ad.id}>
                        <TableCell><Checkbox checked={selectedIds.has(ad.id)} onCheckedChange={() => toggleSelect(ad.id)} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-md bg-muted overflow-hidden shrink-0">
                              {ad.ad_images?.[0]?.image_url ? (
                                <img src={ad.ad_images[0].image_url} alt={ad.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate max-w-xs">{ad.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {ad.brand && `${ad.brand} · `}
                                {ad.categories?.name || 'Uncategorized'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{formatPrice(ad.price, ad.price_type)}</TableCell>
                        <TableCell><Badge variant={STATUS_BADGE_VARIANT[ad.status] || 'secondary'} className="capitalize">{ad.status}</Badge></TableCell>
                        <TableCell className="text-sm capitalize">{ad.listing_type || '—'}</TableCell>
                        <TableCell className="text-right text-sm">{ad.views_count || 0}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(ad.created_at), { addSuffix: true })}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleAction('edit', ad)} className="gap-2"><Edit className="h-4 w-4" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction('duplicate', ad)} className="gap-2"><Copy className="h-4 w-4" /> Duplicate</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction('share', ad)} className="gap-2"><Share2 className="h-4 w-4" /> Share</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction('history', ad)} className="gap-2"><History className="h-4 w-4" /> View History</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {['approved', 'boosted', 'premium'].includes(ad.status) && (
                                <DropdownMenuItem onClick={() => handleAction('pause', ad)} className="gap-2"><Pause className="h-4 w-4" /> Pause</DropdownMenuItem>
                              )}
                              {ad.status === 'paused' && (
                                <DropdownMenuItem onClick={() => handleAction('resume', ad)} className="gap-2"><Play className="h-4 w-4" /> Resume</DropdownMenuItem>
                              )}
                              {!['sold', 'expired', 'archived'].includes(ad.status) && (
                                <DropdownMenuItem onClick={() => handleAction('sold', ad)} className="gap-2"><CheckSquare className="h-4 w-4" /> Mark as Sold</DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleAction('renew', ad)} className="gap-2"><RefreshCw className="h-4 w-4" /> Renew</DropdownMenuItem>
                              {ad.status === 'sold' && (
                                <DropdownMenuItem onClick={() => handleAction('resume', ad)} className="gap-2"><RefreshCw className="h-4 w-4" /> Relist</DropdownMenuItem>
                              )}
                              {ad.status === 'archived' && (
                                <DropdownMenuItem onClick={() => handleAction('restore', ad)} className="gap-2"><RefreshCw className="h-4 w-4" /> Restore</DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleAction('archive', ad)} className="gap-2"><Archive className="h-4 w-4" /> Archive</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteAdId(ad.id)} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
      <MobileNav />

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Listing History</DialogTitle></DialogHeader>
          {historyLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : historyRecords.length > 0 ? (
            <div className="space-y-2">
              {historyRecords.map((h: any) => (
                <div key={h.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <History className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{h.action.replace(/_/g, ' ')}</p>
                    {h.field_name && <p className="text-xs text-muted-foreground">Field: {h.field_name}</p>}
                    {h.previous_value && h.new_value && (
                      <div className="mt-1 text-xs">
                        <span className="text-red-500 line-through">{JSON.stringify(h.previous_value).slice(0, 100)}</span>
                        <span className="mx-1">→</span>
                        <span className="text-green-600">{JSON.stringify(h.new_value).slice(0, 100)}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-center text-muted-foreground py-8">No history records</p>}
        </DialogContent>
      </Dialog>

      {/* Bulk Price Update Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Bulk Price Update</DialogTitle><DialogDescription>Update price for {selectedIds.size} selected listings</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>New Price</Label>
              <Input type="number" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Price Type</Label>
              <Select value={bulkPriceType} onValueChange={setBulkPriceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="negotiable">Negotiable</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkPriceUpdate}>Update Prices</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Category Change Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Bulk Category Change</DialogTitle><DialogDescription>Change category for {selectedIds.size} selected listings</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>New Category</Label>
              <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkCategoryChange}>Change Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAdId} onOpenChange={(open) => !open && setDeleteAdId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>This will archive the listing. You can restore it later from archived listings.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
