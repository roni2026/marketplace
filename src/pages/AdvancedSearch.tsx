/**
 * AdvancedSearch — Comprehensive search page with autocomplete,
 * advanced filters, facets, infinite scroll, and no-result recommendations.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { AdCard } from '@/components/ads/AdCard';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import { useSearchDiscovery } from '@/hooks/useSearchDiscovery';
import { useAuth } from '@/hooks/useAuth';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { supabase } from '@/integrations/supabase/client';
import { DIVISIONS, DISTRICTS, formatPrice } from '@/lib/constants';
import { highlightKeyword } from '@/lib/searchDiscovery';
import {
  Card, CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Search, SlidersHorizontal, X, ChevronDown, ChevronUp, MapPin, Tag,
  DollarSign, Truck, Shield, Star, Eye, Heart, Clock, Save, History,
  Trash2, TrendingUp, Package, Store, Sparkles, Filter, Loader2,
  AlertCircle, ChevronRight,
} from 'lucide-react';
import type {
  AdvancedSearchFilter, SearchSortOption, SearchResultListing,
} from '@/integrations/supabase/types_v5_search';

interface Category { id: string; name: string; slug: string; }
interface Subcategory { id: string; name: string; category_id: string; }

const SORT_OPTIONS: Array<{ value: SearchSortOption; label: string }> = [
  { value: 'best_match', label: 'Best Match' },
  { value: 'most_relevant', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'lowest_price', label: 'Lowest Price' },
  { value: 'highest_price', label: 'Highest Price' },
  { value: 'most_popular', label: 'Most Popular' },
  { value: 'most_viewed', label: 'Most Viewed' },
  { value: 'most_favorited', label: 'Most Favorited' },
  { value: 'recently_updated', label: 'Recently Updated' },
  { value: 'ending_soon', label: 'Ending Soon' },
];

const PER_PAGE = 20;

export default function AdvancedSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { saveSearch } = useSavedSearches();
  const { search, searchResults, isSearching, getNoResultRecommendations } = useSearchDiscovery();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [noResultRecs, setNoResultRecs] = useState<SearchResultListing[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || 'all');
  const [subcategoryId, setSubcategoryId] = useState('all');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState(searchParams.get('condition') || 'all');
  const [listingType, setListingType] = useState('all');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [freeShipping, setFreeShipping] = useState(false);
  const [pickupAvailable, setPickupAvailable] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [internationalShipping, setInternationalShipping] = useState(false);
  const [hasWarranty, setHasWarranty] = useState(false);
  const [warrantyType, setWarrantyType] = useState('all');
  const [sellerVerified, setSellerVerified] = useState(false);
  const [division, setDivision] = useState(searchParams.get('division') || 'all');
  const [district, setDistrict] = useState(searchParams.get('district') || 'all');
  const [area, setArea] = useState('');
  const [tags, setTags] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isBoosted, setIsBoosted] = useState(false);
  const [sort, setSort] = useState<SearchSortOption>('best_match');
  const [page, setPage] = useState(1);
  const [allListings, setAllListings] = useState<SearchResultListing[]>([]);

  // Fetch categories
  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      if (data) setCategories(data as Category[]);
    });
    supabase.from('subcategories').select('*').then(({ data }) => {
      if (data) setSubcategories(data as Subcategory[]);
    });
  }, []);

  // Fetch favorites
  useEffect(() => {
    if (user) {
      supabase.from('favorites').select('ad_id').eq('user_id', user.id).then(({ data }) => {
        if (data) setFavorites(data.map(f => f.ad_id));
      });
    }
  }, [user]);

  // Build filter and search
  const doSearch = useCallback(async (pageNum: number, append: boolean) => {
    const filter: AdvancedSearchFilter = {
      query: query.trim() || undefined,
      category_id: categoryId !== 'all' ? categoryId : undefined,
      subcategory_id: subcategoryId !== 'all' ? subcategoryId : undefined,
      brand: brand || undefined,
      model: model || undefined,
      condition: condition !== 'all' ? condition : undefined,
      listing_type: listingType !== 'all' ? listingType : undefined,
      min_price: minPrice ? parseFloat(minPrice) : undefined,
      max_price: maxPrice ? parseFloat(maxPrice) : undefined,
      has_discount: hasDiscount || undefined,
      is_negotiable: isNegotiable || undefined,
      free_shipping: freeShipping || undefined,
      pickup_available: pickupAvailable || undefined,
      delivery_available: deliveryAvailable || undefined,
      international_shipping: internationalShipping || undefined,
      has_warranty: hasWarranty || undefined,
      warranty_type: warrantyType !== 'all' ? warrantyType : undefined,
      seller_verified: sellerVerified || undefined,
      division: division !== 'all' ? division : undefined,
      district: district !== 'all' ? district : undefined,
      area: area || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      is_featured: isFeatured || undefined,
      is_premium: isPremium || undefined,
      is_boosted: isBoosted || undefined,
    };

    const result = await search({ filter, sort, page: pageNum, per_page: PER_PAGE });

    if (append) {
      setAllListings(prev => [...prev, ...result.listings]);
    } else {
      setAllListings(result.listings);
    }

    // Handle no results
    if (result.total === 0 && query.trim()) {
      const recs = await getNoResultRecommendations(query);
      setNoResultRecs(recs);
    } else {
      setNoResultRecs([]);
    }
  }, [query, categoryId, subcategoryId, brand, model, condition, listingType, minPrice, maxPrice,
      hasDiscount, isNegotiable, freeShipping, pickupAvailable, deliveryAvailable, internationalShipping,
      hasWarranty, warrantyType, sellerVerified, division, district, area, tags, dateFrom, dateTo,
      isFeatured, isPremium, isBoosted, sort, search, getNoResultRecommendations]);

  // Trigger search on filter/sort change
  useEffect(() => {
    setPage(1);
    doSearch(1, false);
  }, [doSearch]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && searchResults && page < searchResults.total_pages && !isSearching) {
          const nextPage = page + 1;
          setLoadingMore(true);
          doSearch(nextPage, true).finally(() => {
            setPage(nextPage);
            setLoadingMore(false);
          });
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [searchResults, page, isSearching, doSearch]);

  const filteredSubcats = subcategories.filter(s => s.category_id === categoryId);

  const clearFilters = () => {
    setCategoryId('all'); setSubcategoryId('all'); setBrand(''); setModel('');
    setCondition('all'); setListingType('all'); setMinPrice(''); setMaxPrice('');
    setHasDiscount(false); setIsNegotiable(false); setFreeShipping(false);
    setPickupAvailable(false); setDeliveryAvailable(false); setInternationalShipping(false);
    setHasWarranty(false); setWarrantyType('all'); setSellerVerified(false);
    setDivision('all'); setDistrict('all'); setArea(''); setTags('');
    setDateFrom(''); setDateTo(''); setIsFeatured(false); setIsPremium(false); setIsBoosted(false);
  };

  const activeFilterCount = [
    categoryId !== 'all', subcategoryId !== 'all', brand, model, condition !== 'all',
    listingType !== 'all', minPrice, maxPrice, hasDiscount, isNegotiable, freeShipping,
    pickupAvailable, deliveryAvailable, internationalShipping, hasWarranty, warrantyType !== 'all',
    sellerVerified, division !== 'all', district !== 'all', area, tags, dateFrom, dateTo,
    isFeatured, isPremium, isBoosted,
  ].filter(Boolean).length;

  const handleSaveSearch = async () => {
    if (!saveName.trim()) { toast.error('Enter a name for this search'); return; }
    await saveSearch({
      name: saveName,
      query: query || undefined,
      category_id: categoryId !== 'all' ? categoryId : undefined,
      min_price: minPrice ? parseFloat(minPrice) : undefined,
      max_price: maxPrice ? parseFloat(maxPrice) : undefined,
      condition: condition !== 'all' ? condition as 'new' | 'used' : undefined,
      division: division !== 'all' ? division : undefined,
      district: district !== 'all' ? district : undefined,
      notify_on_match: false,
    });
    toast.success('Search saved');
    setShowSaveDialog(false);
    setSaveName('');
  };

  const FilterPanel = () => (
    <div className="space-y-4">
      {/* Category */}
      <div>
        <Label className="text-xs font-medium">Category</Label>
        <Select value={categoryId} onValueChange={v => { setCategoryId(v); setSubcategoryId('all'); }}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Subcategory */}
      {categoryId !== 'all' && filteredSubcats.length > 0 && (
        <div>
          <Label className="text-xs font-medium">Subcategory</Label>
          <Select value={subcategoryId} onValueChange={setSubcategoryId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="All subcategories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subcategories</SelectItem>
              {filteredSubcats.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Brand & Model */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Brand</Label>
          <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Any brand" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs font-medium">Model</Label>
          <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Any model" className="mt-1" />
        </div>
      </div>

      {/* Condition & Listing Type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Condition</Label>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="used">Used</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium">Listing Type</Label>
          <Select value={listingType} onValueChange={setListingType}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-xs font-medium">Price Range</Label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <Input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min" />
          <Input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max" />
        </div>
      </div>

      <Separator />

      {/* Toggles */}
      <div className="space-y-2">
        <div className="flex items-center gap-2"><Checkbox checked={hasDiscount} onCheckedChange={(v) => setHasDiscount(!!v)} id="discount" /><Label htmlFor="discount" className="text-sm cursor-pointer">Has Discount</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={isNegotiable} onCheckedChange={(v) => setIsNegotiable(!!v)} id="negotiable" /><Label htmlFor="negotiable" className="text-sm cursor-pointer">Negotiable</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={freeShipping} onCheckedChange={(v) => setFreeShipping(!!v)} id="free-ship" /><Label htmlFor="free-ship" className="text-sm cursor-pointer">Free Shipping</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={pickupAvailable} onCheckedChange={(v) => setPickupAvailable(!!v)} id="pickup" /><Label htmlFor="pickup" className="text-sm cursor-pointer">Pickup Available</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={deliveryAvailable} onCheckedChange={(v) => setDeliveryAvailable(!!v)} id="delivery" /><Label htmlFor="delivery" className="text-sm cursor-pointer">Delivery Available</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={internationalShipping} onCheckedChange={(v) => setInternationalShipping(!!v)} id="intl" /><Label htmlFor="intl" className="text-sm cursor-pointer">International Shipping</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={hasWarranty} onCheckedChange={(v) => setHasWarranty(!!v)} id="warranty" /><Label htmlFor="warranty" className="text-sm cursor-pointer">Has Warranty</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={sellerVerified} onCheckedChange={(v) => setSellerVerified(!!v)} id="verified" /><Label htmlFor="verified" className="text-sm cursor-pointer">Verified Sellers Only</Label></div>
      </div>

      {hasWarranty && (
        <div>
          <Label className="text-xs font-medium">Warranty Type</Label>
          <Select value={warrantyType} onValueChange={setWarrantyType}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warranty Types</SelectItem>
              <SelectItem value="manufacturer">Manufacturer</SelectItem>
              <SelectItem value="seller">Seller</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      {/* Location */}
      <div>
        <Label className="text-xs font-medium">Location</Label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <Select value={division} onValueChange={v => { setDivision(v); setDistrict('all'); }}>
            <SelectTrigger><SelectValue placeholder="Division" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={district} onValueChange={setDistrict} disabled={division === 'all'}>
            <SelectTrigger><SelectValue placeholder="District" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {division !== 'all' && DISTRICTS[division]?.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Input value={area} onChange={e => setArea(e.target.value)} placeholder="Area (optional)" className="mt-2" />
      </div>

      {/* Tags */}
      <div>
        <Label className="text-xs font-medium">Tags (comma-separated)</Label>
        <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="electronics, phone" className="mt-1" />
      </div>

      {/* Featured/Premium/Boosted */}
      <div className="space-y-2">
        <div className="flex items-center gap-2"><Checkbox checked={isFeatured} onCheckedChange={(v) => setIsFeatured(!!v)} id="featured" /><Label htmlFor="featured" className="text-sm cursor-pointer">Featured Only</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={isPremium} onCheckedChange={(v) => setIsPremium(!!v)} id="premium" /><Label htmlFor="premium" className="text-sm cursor-pointer">Premium Only</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={isBoosted} onCheckedChange={(v) => setIsBoosted(!!v)} id="boosted" /><Label htmlFor="boosted" className="text-sm cursor-pointer">Boosted Only</Label></div>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="w-full gap-2">
          <X className="h-4 w-4" /> Clear All Filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Helmet>
        <title>Search — BazarBD</title>
        <meta name="description" content="Search and filter listings on BazarBD" />
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <SearchAutocomplete
              value={query}
              onChange={setQuery}
              placeholder="Search listings, brands, categories, stores..."
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Select value={sort} onValueChange={v => setSort(v as SearchSortOption)}>
              <SelectTrigger className="w-[170px] gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {user && (
              <Button variant="outline" size="icon" onClick={() => setShowSaveDialog(true)} title="Save search">
                <Save className="h-4 w-4" />
              </Button>
            )}
            {/* Mobile filter toggle */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden relative">
                  <Filter className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 px-1 text-[10px]">{activeFilterCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <div className="p-4">
                  <h3 className="font-semibold mb-4">Filters</h3>
                  <FilterPanel />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <Card className="sticky top-20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</h3>
                  {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
                </div>
                <FilterPanel />
              </CardContent>
            </Card>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {isSearching ? 'Searching...' : `${searchResults?.total || 0} results found`}
                {query && <span className="ml-1">for "{query}"</span>}
              </p>
            </div>

            {/* Loading state */}
            {isSearching && allListings.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
              </div>
            ) : allListings.length === 0 ? (
              /* No results */
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-1">No results found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {query ? `We couldn't find anything for "${query}". Try adjusting your filters.` : 'Try adjusting your filters to see more results.'}
                </p>
                {activeFilterCount > 0 && (
                  <Button variant="outline" onClick={clearFilters} className="gap-2 mb-6">
                    <X className="h-4 w-4" /> Clear Filters
                  </Button>
                )}

                {/* No-result recommendations */}
                {noResultRecs.length > 0 && (
                  <div className="max-w-4xl mx-auto mt-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">You might like these instead</h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                      {noResultRecs.map(ad => (
                        <AdCard key={ad.id} ad={ad as any} isFavorite={favorites.includes(ad.id)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Results grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {allListings.map(ad => (
                    <AdCard
                      key={ad.id}
                      ad={ad as any}
                      isFavorite={favorites.includes(ad.id)}
                    />
                  ))}
                </div>

                {/* Infinite scroll sentinel */}
                {searchResults && page < searchResults.total_pages && (
                  <div ref={sentinelRef} className="py-8 flex justify-center">
                    {loadingMore ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <Button variant="outline" onClick={() => {
                        const next = page + 1;
                        setLoadingMore(true);
                        doSearch(next, true).finally(() => { setPage(next); setLoadingMore(false); });
                      }}>Load More</Button>
                    )}
                  </div>
                )}

                {searchResults && page >= searchResults.total_pages && allListings.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">You've reached the end of the results</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
      <MobileNav />

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save This Search</DialogTitle>
            <DialogDescription>Get notified when new listings match your search criteria</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Search Name</Label>
              <Input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="e.g. iPhone 14 in Dhaka" />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Query: {query || 'None'}</p>
              {categoryId !== 'all' && <p>Category: {categories.find(c => c.id === categoryId)?.name}</p>}
              {minPrice && <p>Min Price: ৳{minPrice}</p>}
              {maxPrice && <p>Max Price: ৳{maxPrice}</p>}
              {division !== 'all' && <p>Location: {division}{district !== 'all' ? `, ${district}` : ''}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSearch}>Save Search</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
