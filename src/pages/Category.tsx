import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { generateCategoryTitle, generateCategoryDescription } from '@/lib/seo/meta';
import { canonicalUrl, categoryUrl } from '@/lib/seo/urls';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { AdCard } from '@/components/ads/AdCard';
import { SortSelect, SortOption } from '@/components/ads/SortSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import { Filter, X, LayoutGrid, SlidersHorizontal, Tag, Truck, Shield, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  CATEGORY_DATA,
  getCategoryIcon,
  getSubcategoryIcon,
} from '@/lib/categoryData';

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
  categories: { name: string; slug: string } | null;
}

interface Category { id: string; name: string; slug: string; }
interface Subcategory { id: string; name: string; slug: string; category_id: string; }

const ALL = '__all__';
const PER_PAGE = 12;

export default function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>('newest');

  // Filters
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [division, setDivision] = useState(searchParams.get('division') || '');
  const [district, setDistrict] = useState(searchParams.get('district') || '');
  const [subcategoryId, setSubcategoryId] = useState(searchParams.get('subcategory') || '');
  const [brand, setBrand] = useState('');
  const [listingType, setListingType] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [freeShipping, setFreeShipping] = useState(false);
  const [pickupAvailable, setPickupAvailable] = useState(false);
  const [hasWarranty, setHasWarranty] = useState(false);
  const [sellerVerified, setSellerVerified] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [tags, setTags] = useState('');

  useEffect(() => { fetchCategory(); }, [slug]);

  useEffect(() => {
    if (category) fetchAds();
  }, [category, page, minPrice, maxPrice, condition, division, district, subcategoryId, sort,
      brand, listingType, isNegotiable, freeShipping, pickupAvailable, hasWarranty, sellerVerified, isFeatured, tags]);

  useEffect(() => { if (user) fetchFavorites(); }, [user]);

  const fetchCategory = async () => {
    const { data } = await supabase.from('categories').select('*').eq('slug', slug).single();
    if (data) {
      setCategory(data);
      const { data: subs } = await supabase.from('subcategories').select('*').eq('category_id', data.id);
      setSubcategories(subs || []);
    }
  };

  const fetchAds = async () => {
    if (!category) return;
    setIsLoading(true);

    let query = supabase
      .from('ads')
      .select('*, ad_images(image_url), categories(name, slug)', { count: 'exact' })
      .eq('status', 'approved')
      .eq('category_id', category.id);

    if (subcategoryId) query = query.eq('subcategory_id', subcategoryId);
    if (condition === 'new' || condition === 'used') query = query.eq('condition', condition);
    if (division) query = query.eq('division', division);
    if (district) query = query.eq('district', district);
    if (minPrice) query = query.gte('price', parseFloat(minPrice));
    if (maxPrice) query = query.lte('price', parseFloat(maxPrice));
    if (brand) query = query.ilike('brand', `%${brand}%`);
    if (listingType) query = query.eq('listing_type', listingType);
    if (isNegotiable) query = query.eq('is_negotiable', true);
    if (freeShipping) query = query.eq('free_shipping', true);
    if (pickupAvailable) query = query.contains('shipping_methods', ['local_pickup']);
    if (hasWarranty) query = query.not('warranty_type', 'eq', 'none');
    if (isFeatured) query = query.eq('is_featured', true);
    if (tags) {
      const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagArr.length > 0) query = query.overlaps('tags', tagArr);
    }

    // Seller verified
    if (sellerVerified) {
      const { data: verifiedSellers } = await supabase.from('profiles').select('user_id').eq('is_verified', true);
      if (verifiedSellers && verifiedSellers.length > 0) {
        query = query.in('user_id', verifiedSellers.map(s => s.user_id));
      }
    }

    // Sorting
    query = query.order('is_featured', { ascending: false });
    switch (sort) {
      case 'newest': query = query.order('created_at', { ascending: false }); break;
      case 'oldest': query = query.order('created_at', { ascending: true }); break;
      case 'price_asc': query = query.order('price', { ascending: true, nullsFirst: false }); break;
      case 'price_desc': query = query.order('price', { ascending: false, nullsFirst: false }); break;
      case 'most_popular': query = query.order('favorites_count', { ascending: false, nullsFirst: false }); break;
      case 'most_viewed': query = query.order('views_count', { ascending: false, nullsFirst: false }); break;
      case 'most_favorited': query = query.order('favorites_count', { ascending: false, nullsFirst: false }); break;
      case 'recently_updated': query = query.order('updated_at', { ascending: false }); break;
      case 'ending_soon': query = query.not('expires_at', 'is', null).order('expires_at', { ascending: true }); break;
      default: query = query.order('created_at', { ascending: false });
    }
    query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

    const { data, count } = await query;
    setAds((data as Ad[]) || []);
    setTotalCount(count || 0);
    setIsLoading(false);
  };

  const fetchFavorites = async () => {
    if (!user) return;
    const { data } = await supabase.from('favorites').select('ad_id').eq('user_id', user.id);
    if (data) setFavorites(data.map(f => f.ad_id));
  };

  const selectSubcategory = (id: string) => {
    const next = id === subcategoryId ? '' : id;
    setSubcategoryId(next);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (next) params.set('subcategory', next); else params.delete('subcategory');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setMinPrice(''); setMaxPrice(''); setCondition(''); setDivision(''); setDistrict('');
    setSubcategoryId(''); setBrand(''); setListingType(''); setIsNegotiable(false);
    setFreeShipping(false); setPickupAvailable(false); setHasWarranty(false);
    setSellerVerified(false); setIsFeatured(false); setTags('');
    setSearchParams({});
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / PER_PAGE);
  const activeSlug = category?.slug ?? slug;

  const activeFilterCount = [
    subcategoryId, condition, division, district, minPrice, maxPrice, brand, listingType,
    isNegotiable, freeShipping, pickupAvailable, hasWarranty, sellerVerified, isFeatured, tags,
  ].filter(Boolean).length;

  const SubcategoryChips = () => {
    if (subcategories.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => selectSubcategory('')}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            subcategoryId === '' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-accent'
          }`}>
          <LayoutGrid className="h-4 w-4" /> All
        </button>
        {subcategories.map(sub => {
          const SubIcon = getSubcategoryIcon(activeSlug, sub.slug);
          const isActive = subcategoryId === sub.id;
          return (
            <button key={sub.id} type="button" onClick={() => selectSubcategory(sub.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-accent'
              }`}>
              <SubIcon className="h-4 w-4" /> {sub.name}
            </button>
          );
        })}
      </div>
    );
  };

  const FilterPanel = () => (
    <div className="space-y-4">
      {/* Category jump */}
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={activeSlug} onValueChange={v => navigate(`/category/${v}`)}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {CATEGORY_DATA.map(c => {
              const CatIcon = getCategoryIcon(c.slug);
              return <SelectItem key={c.slug} value={c.slug}><span className="flex items-center gap-2"><CatIcon className="h-4 w-4" />{c.name}</span></SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Subcategory */}
      {subcategories.length > 0 && (
        <div className="space-y-2">
          <Label>Subcategory</Label>
          <Select value={subcategoryId || ALL} onValueChange={v => selectSubcategory(v === ALL ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="All subcategories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Subcategories</SelectItem>
              {subcategories.map(sub => (
                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Condition */}
      <div className="space-y-2">
        <Label>Condition</Label>
        <Select value={condition || ALL} onValueChange={v => setCondition(v === ALL ? '' : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="used">Used</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Listing Type */}
      <div className="space-y-2">
        <Label>Listing Type</Label>
        <Select value={listingType || ALL} onValueChange={v => setListingType(v === ALL ? '' : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Types</SelectItem>
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

      {/* Brand */}
      <div className="space-y-2">
        <Label>Brand</Label>
        <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Filter by brand" />
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <Label>Price Range (৳)</Label>
        <div className="flex gap-2">
          <Input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
          <Input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
        </div>
      </div>

      <Separator />

      {/* Toggles */}
      <div className="space-y-2">
        <div className="flex items-center gap-2"><Checkbox checked={isNegotiable} onCheckedChange={v => setIsNegotiable(!!v)} id="cat-neg" /><Label htmlFor="cat-neg" className="text-sm cursor-pointer">Negotiable</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={freeShipping} onCheckedChange={v => setFreeShipping(!!v)} id="cat-ship" /><Label htmlFor="cat-ship" className="text-sm cursor-pointer">Free Shipping</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={pickupAvailable} onCheckedChange={v => setPickupAvailable(!!v)} id="cat-pickup" /><Label htmlFor="cat-pickup" className="text-sm cursor-pointer">Pickup Available</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={hasWarranty} onCheckedChange={v => setHasWarranty(!!v)} id="cat-warranty" /><Label htmlFor="cat-warranty" className="text-sm cursor-pointer">Has Warranty</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={sellerVerified} onCheckedChange={v => setSellerVerified(!!v)} id="cat-verified" /><Label htmlFor="cat-verified" className="text-sm cursor-pointer">Verified Sellers Only</Label></div>
        <div className="flex items-center gap-2"><Checkbox checked={isFeatured} onCheckedChange={v => setIsFeatured(!!v)} id="cat-featured" /><Label htmlFor="cat-featured" className="text-sm cursor-pointer">Featured Only</Label></div>
      </div>

      <Separator />

      {/* Location */}
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

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags (comma-separated)</Label>
        <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="electronics, phone" />
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" size="sm" onClick={clearFilters} className="w-full gap-2">
          <X className="h-4 w-4" /> Clear All Filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  const CategoryIcon = getCategoryIcon(activeSlug);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={generateCategoryTitle({ name: categoryName })}
        description={generateCategoryDescription({ name: categoryName })}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Categories', url: '/categories' },
          { name: categoryName, url: `/category/${categorySlug}` },
        ]}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CategoryIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{category?.name || 'Category'}</h1>
              <p className="text-muted-foreground">{totalCount} ads found</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
                <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                <div className="mt-6"><FilterPanel /></div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {subcategories.length > 0 && <div className="mb-6"><SubcategoryChips /></div>}

        <div className="grid lg:grid-cols-4 gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-24 bg-card p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filters</h3>
                {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
              </div>
              <FilterPanel />
            </div>
          </aside>

          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
              </div>
            ) : ads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-2">No ads found matching your filters.</p>
                {activeFilterCount > 0 && <Button onClick={clearFilters} variant="outline" className="mt-2">Clear Filters</Button>}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {ads.map(ad => <AdCard key={ad.id} ad={ad} isFavorite={favorites.includes(ad.id)} />)}
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
