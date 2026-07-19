import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Skeleton } from '@/components/ui/skeleton';
import { AdCard } from '@/components/ads/AdCard';
import { SortSelect, SortOption } from '@/components/ads/SortSelect';
import { InlineSearchBar } from '@/components/search/InlineSearchBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DIVISIONS, DISTRICTS, formatPrice } from '@/lib/constants';
import { Heart, Search, X, Filter, SlidersHorizontal, Package, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';

interface Ad {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  price_type: string;
  condition: string;
  division: string;
  district: string;
  is_featured: boolean;
  is_premium?: boolean | null;
  is_boosted?: boolean | null;
  views_count?: number | null;
  favorites_count?: number | null;
  brand?: string | null;
  created_at: string;
  ad_images: { image_url: string }[];
  categories?: { name: string; slug: string } | null;
}

const ALL = '__all__';
const PER_PAGE = 12;

export default function Favorites() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [brand, setBrand] = useState('');
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [sort, setSort] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchFavorites();
    }
  }, [user, authLoading, navigate]);

  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const { data: favData, error: favError } = await supabase
        .from('favorites')
        .select('ad_id')
        .eq('user_id', user!.id);

      if (favError) throw favError;

      if (!favData || favData.length === 0) {
        setAds([]);
        setIsLoading(false);
        return;
      }

      const adIds = favData.map(f => f.ad_id);

      let query = supabase
        .from('ads')
        .select(`
          id, title, slug, price, price_type, condition, division, district,
          is_featured, is_premium, is_boosted, views_count, favorites_count,
          brand, created_at,
          ad_images(image_url),
          categories(name, slug)
        `)
        .in('id', adIds);

      const { data: adData, error: adError } = await query;

      if (adError) throw adError;

      setAds((adData || []).filter((a: any) => a !== null) as Ad[]);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setAds([]);
    }
    setIsLoading(false);
  };

  // Apply client-side filters and sorting
  const filteredAds = useCallback(() => {
    let result = [...ads];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(ad =>
        ad.title.toLowerCase().includes(q) ||
        (ad.brand || '').toLowerCase().includes(q)
      );
    }

    // Price range
    if (minPrice) result = result.filter(ad => ad.price !== null && ad.price >= parseFloat(minPrice));
    if (maxPrice) result = result.filter(ad => ad.price !== null && ad.price <= parseFloat(maxPrice));

    // Condition
    if (condition) result = result.filter(ad => ad.condition === condition);

    // Location
    if (division) result = result.filter(ad => ad.division === division);
    if (district) result = result.filter(ad => ad.district === district);

    // Brand
    if (brand.trim()) result = result.filter(ad => (ad.brand || '').toLowerCase().includes(brand.toLowerCase()));

    // Featured
    if (onlyFeatured) result = result.filter(ad => ad.is_featured);

    // Sort
    switch (sort) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'price_asc':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'most_viewed':
        result.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        break;
      case 'most_favorited':
        result.sort((a, b) => (b.favorites_count || 0) - (a.favorites_count || 0));
        break;
      case 'recently_updated':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [ads, searchQuery, minPrice, maxPrice, condition, division, district, brand, onlyFeatured, sort]);

  const displayedAds = filteredAds();
  const totalPages = Math.ceil(displayedAds.length / PER_PAGE);
  const paginatedAds = displayedAds.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [searchQuery, minPrice, maxPrice, condition, division, district, brand, onlyFeatured, sort]);

  const activeFilterCount = [
    searchQuery, minPrice, maxPrice, condition, division, district, brand, onlyFeatured,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery(''); setMinPrice(''); setMaxPrice(''); setCondition('');
    setDivision(''); setDistrict(''); setBrand(''); setOnlyFeatured(false);
  };

  const FilterPanel = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Search in favorites</Label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by title or brand" className="pl-8" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Condition</Label>
        <Select value={condition || ALL} onValueChange={v => setCondition(v === ALL ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Any condition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="used">Used</SelectItem>
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

      <div className="space-y-2">
        <Label>Brand</Label>
        <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Filter by brand" />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Location</Label>
        <Select value={division || ALL} onValueChange={v => { setDivision(v === ALL ? '' : v); setDistrict(''); }}>
          <SelectTrigger><SelectValue placeholder="Any division" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any Division</SelectItem>
            {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        {division && (
          <Select value={district || ALL} onValueChange={v => setDistrict(v === ALL ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Any district" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any District</SelectItem>
              {(DISTRICTS[division] || []).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox checked={onlyFeatured} onCheckedChange={v => setOnlyFeatured(!!v)} id="fav-featured" />
          <Label htmlFor="fav-featured" className="text-sm cursor-pointer">Featured only</Label>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="w-full gap-2">
          <X className="h-4 w-4" /> Clear All Filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">My Favorites</h1>
              <p className="text-muted-foreground">{displayedAds.length} saved {displayedAds.length === 1 ? 'item' : 'items'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <InlineSearchBar />
            <SortSelect value={sort} onChange={v => { setSort(v); setPage(1); }} />
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
                <SheetHeader><SheetTitle>Filter Favorites</SheetTitle></SheetHeader>
                <div className="mt-6"><FilterPanel /></div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 bg-card p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filters</h3>
                {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
              </div>
              <FilterPanel />
            </div>
          </aside>

          {/* Ads Grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
              </div>
            ) : paginatedAds.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-1">
                  {ads.length === 0 ? 'No favorites yet' : 'No results match your filters'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {ads.length === 0 ? 'Browse listings and tap the heart icon to save them here.' : 'Try adjusting your filters.'}
                </p>
                {ads.length === 0 ? (
                  <Button onClick={() => navigate('/search')}>Browse Listings</Button>
                ) : activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
                ) : null}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {paginatedAds.map(ad => <AdCard key={ad.id} ad={ad} isFavorite={true} />)}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-4 text-sm">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
