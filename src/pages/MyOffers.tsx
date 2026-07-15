import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link, Navigate } from 'react-router-dom';
import { formatPrice } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown, Clock, Check, X, Search, Filter, SlidersHorizontal, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

interface Offer {
  id: string;
  ad_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  message?: string | null;
  status: string;
  expires_at?: string | null;
  created_at: string;
  ads?: { title: string; slug: string; price: number | null; ad_images: { image_url: string }[] } | null;
}

const ALL = '__all__';
const PER_PAGE = 10;

export default function MyOffers() {
  const { user, isLoading } = useAuth();
  const [sent, setSent] = useState<Offer[]>([]);
  const [received, setReceived] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const [s, r] = await Promise.all([
          supabase.from('offers').select('*, ads(title,slug,price,ad_images(image_url))').eq('buyer_id', user.id).order('created_at', { ascending: false }),
          supabase.from('offers').select('*, ads(title,slug,price,ad_images(image_url))').eq('seller_id', user.id).order('created_at', { ascending: false }),
        ]);
        if (s.error) {
          const s2 = await supabase.from('offers').select('*, ads(title,slug,price,ad_images(image_url))').eq('user_id', user.id).order('created_at', { ascending: false });
          setSent(s2.data || []);
        } else setSent(s.data || []);
        if (!r.error) setReceived(r.data || []);
      } catch (e: any) {
        toast.error(e?.message || 'Offers unavailable');
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const handleAccept = async (offerId: string) => {
    setActionLoading(offerId);
    try {
      const { error } = await supabase.from('offers').update({ status: 'accepted' }).eq('id', offerId);
      if (error) throw error;
      setReceived(prev => prev.map(o => o.id === offerId ? { ...o, status: 'accepted' } : o));
      toast.success('Offer accepted');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to accept offer');
    }
    setActionLoading(null);
  };

  const handleReject = async (offerId: string) => {
    setActionLoading(offerId);
    try {
      const { error } = await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId);
      if (error) throw error;
      setReceived(prev => prev.map(o => o.id === offerId ? { ...o, status: 'rejected' } : o));
      toast.success('Offer rejected');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject offer');
    }
    setActionLoading(null);
  };

  const handleCancel = async (offerId: string) => {
    setActionLoading(offerId);
    try {
      const { error } = await supabase.from('offers').update({ status: 'expired' }).eq('id', offerId);
      if (error) throw error;
      setSent(prev => prev.map(o => o.id === offerId ? { ...o, status: 'expired' } : o));
      toast.success('Offer cancelled');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to cancel offer');
    }
    setActionLoading(null);
  };

  const filterAndSort = (offers: Offer[]): Offer[] => {
    let result = [...offers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => o.ads?.title?.toLowerCase().includes(q) || o.message?.toLowerCase().includes(q));
    }
    if (statusFilter) result = result.filter(o => o.status === statusFilter);
    if (minAmount) result = result.filter(o => o.amount >= parseFloat(minAmount));
    if (maxAmount) result = result.filter(o => o.amount <= parseFloat(maxAmount));

    switch (sort) {
      case 'newest': result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'highest': result.sort((a, b) => b.amount - a.amount); break;
      case 'lowest': result.sort((a, b) => a.amount - b.amount); break;
    }
    return result;
  };

  const filteredSent = filterAndSort(sent);
  const filteredReceived = filterAndSort(received);

  const activeFilterCount = [searchQuery, statusFilter, minAmount, maxAmount].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery(''); setStatusFilter(''); setMinAmount(''); setMaxAmount('');
  };

  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, minAmount, maxAmount, sort]);

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      accepted: { variant: 'default', label: 'Accepted' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      expired: { variant: 'outline', label: 'Expired' },
    };
    const cfg = map[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  const FilterControls = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Search</Label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by listing title or message" className="pl-8" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={statusFilter || ALL} onValueChange={v => setStatusFilter(v === ALL ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Amount Range (৳)</Label>
        <div className="flex gap-2">
          <Input type="number" placeholder="Min" value={minAmount} onChange={e => setMinAmount(e.target.value)} />
          <Input type="number" placeholder="Max" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sort By</Label>
        <Select value={sort} onValueChange={v => setSort(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="highest">Highest Amount First</SelectItem>
            <SelectItem value="lowest">Lowest Amount First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="w-full gap-2">
          <X className="h-4 w-4" /> Clear Filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  const OfferCard = ({ offer, isReceived }: { offer: Offer; isReceived: boolean }) => {
    const adPrice = offer.ads?.price;
    const diff = adPrice ? offer.amount - adPrice : 0;
    const diffPercent = adPrice ? Math.round((diff / adPrice) * 100) : 0;

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Image */}
            {offer.ads?.ad_images?.[0]?.image_url && (
              <Link to={`/ad/${offer.ads.slug}`} className="shrink-0">
                <img
                  src={offer.ads.ad_images[0].image_url}
                  alt={offer.ads.title}
                  className="w-full sm:w-24 h-24 rounded-lg object-cover"
                />
              </Link>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <Link to={`/ad/${offer.ads?.slug || ''}`} className="font-medium text-sm hover:text-primary line-clamp-1">
                  {offer.ads?.title || 'Unknown listing'}
                </Link>
                {statusBadge(offer.status)}
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-lg font-bold text-primary">৳{new Intl.NumberFormat('en-BD').format(offer.amount)}</span>
                {adPrice && (
                  <span className="text-xs text-muted-foreground">
                    List: ৳{new Intl.NumberFormat('en-BD').format(adPrice)}
                    {diff !== 0 && (
                      <span className={`ml-1 ${diff < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        ({diff < 0 ? <ArrowDownRight className="inline h-3 w-3" /> : <ArrowUpRight className="inline h-3 w-3" />}
                        {Math.abs(diffPercent)}%)
                      </span>
                    )}
                  </span>
                )}
              </div>

              {offer.message && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-1">"{offer.message}"</p>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                {offer.expires_at && new Date(offer.expires_at) > new Date() && (
                  <span className="ml-2">Expires {formatDistanceToNow(new Date(offer.expires_at), { addSuffix: true })}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            {isReceived && offer.status === 'pending' && (
              <div className="flex sm:flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  className="gap-1 flex-1 sm:flex-none"
                  onClick={() => handleAccept(offer.id)}
                  disabled={actionLoading === offer.id}
                >
                  <Check className="h-4 w-4" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 flex-1 sm:flex-none"
                  onClick={() => handleReject(offer.id)}
                  disabled={actionLoading === offer.id}
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
              </div>
            )}
            {!isReceived && offer.status === 'pending' && (
              <div className="shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => handleCancel(offer.id)}
                  disabled={actionLoading === offer.id}
                >
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const OfferList = ({ offers, isReceived, empty }: { offers: Offer[]; isReceived: boolean; empty: string }) => {
    const paginated = offers.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const totalPages = Math.ceil(offers.length / PER_PAGE);

    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      );
    }

    if (offers.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-8">{empty}</p>;
    }

    return (
      <div className="space-y-3">
        {paginated.map(o => <OfferCard key={o.id} offer={o} isReceived={isReceived} />)}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-4 text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (!isLoading && !user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Offers</h1>
          <Button variant="outline" asChild><Link to="/profile">Profile</Link></Button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1" />
          <Select value={sort} onValueChange={v => setSort(v as any)}>
            <SelectTrigger className="w-[180px] gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Amount First</SelectItem>
              <SelectItem value="lowest">Lowest Amount First</SelectItem>
            </SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 relative">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 px-1 text-[10px]">{activeFilterCount}</Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto">
              <SheetHeader><SheetTitle>Filter Offers</SheetTitle></SheetHeader>
              <div className="mt-6"><FilterControls /></div>
            </SheetContent>
          </Sheet>
        </div>

        <Tabs defaultValue="received">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="received" className="flex-1">
              Received ({filteredReceived.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex-1">
              Sent ({filteredSent.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received">
            <OfferList offers={filteredReceived} isReceived={true} empty="No offers on your listings yet." />
          </TabsContent>

          <TabsContent value="sent">
            <OfferList offers={filteredSent} isReceived={false} empty="You have not made any offers yet." />
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
