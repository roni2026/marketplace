import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { AdCard } from '@/components/ads/AdCard';
import { SortSelect, SortOption } from '@/components/ads/SortSelect';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import { Filter, X, LayoutGrid } from 'lucide-react';
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
  created_at: string;
  ad_images: { image_url: string }[];
  categories: { name: string; slug: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}

// Sentinel used by the Select components. Radix <SelectItem /> forbids an empty
// string value, so we map the "no filter" option to this token and convert it
// back to '' in state.
const ALL = '__all__';

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
  const perPage = 12;

  // Filters
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [division, setDivision] = useState(searchParams.get('division') || '');
  const [district, setDistrict] = useState(searchParams.get('district') || '');
  const [subcategoryId, setSubcategoryId] = useState(searchParams.get('subcategory') || '');

  useEffect(() => {
    fetchCategory();
  }, [slug]);

  useEffect(() => {
    if (category) {
      fetchAds();
    }
  }, [category, page, minPrice, maxPrice, condition, division, district, subcategoryId, sort]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchCategory = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();

    if (data) {
      setCategory(data);

      const { data: subs } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', data.id);

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

    query = query.order('is_featured', { ascending: false });
    if (sort === 'price_asc') {
      query = query.order('price', { ascending: true, nullsFirst: false });
    } else if (sort === 'price_desc') {
      query = query.order('price', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    query = query.range((page - 1) * perPage, page * perPage - 1);

    const { data, count } = await query;

    setAds(data as Ad[] || []);
    setTotalCount(count || 0);
    setIsLoading(false);
  };

  const fetchFavorites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('favorites')
      .select('ad_id')
      .eq('user_id', user.id);
    if (data) {
      setFavorites(data.map(f => f.ad_id));
    }
  };

  // Persist the current subcategory selection to the URL (keeps other params).
  const syncSubcategoryParam = (id: string) => {
    const params = new URLSearchParams(searchParams);
    if (id) params.set('subcategory', id);
    else params.delete('subcategory');
    setSearchParams(params);
  };

  // Select / toggle a subcategory (used by both the chips and the dropdown).
  const selectSubcategory = (id: string) => {
    const next = id === subcategoryId ? '' : id;
    setSubcategoryId(next);
    setPage(1);
    syncSubcategoryParam(next);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (condition) params.set('condition', condition);
    if (division) params.set('division', division);
    if (district) params.set('district', district);
    if (subcategoryId) params.set('subcategory', subcategoryId);
    setSearchParams(params);
    setPage(1);
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setCondition('');
    setDivision('');
    setDistrict('');
    setSubcategoryId('');
    setSearchParams({});
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / perPage);
  const activeSlug = category?.slug ?? slug;

  // Selectable subcategory chips shown right under the category header, so
  // subcategories become clickable as soon as a category is opened.
  const SubcategoryChips = () => {
    if (subcategories.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectSubcategory('')}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            subcategoryId === ''
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          All
        </button>
        {subcategories.map((sub) => {
          const SubIcon = getSubcategoryIcon(activeSlug, sub.slug);
          const isActive = subcategoryId === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => selectSubcategory(sub.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <SubIcon className="h-4 w-4" />
              {sub.name}
            </button>
          );
        })}
      </div>
    );
  };

  const FilterPanel = () => (
    <div className="space-y-4">
      {/* Category selector — lets users jump to another category from filters */}
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={activeSlug} onValueChange={(v) => navigate(`/category/${v}`)}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_DATA.map((c) => {
              const CatIcon = getCategoryIcon(c.slug);
              return (
                <SelectItem key={c.slug} value={c.slug}>
                  <span className="flex items-center gap-2">
                    <CatIcon className="h-4 w-4" />
                    {c.name}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {subcategories.length > 0 && (
        <div className="space-y-2">
          <Label>Subcategory</Label>
          <Select
            value={subcategoryId || ALL}
            onValueChange={(v) => selectSubcategory(v === ALL ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All subcategories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All subcategories</SelectItem>
              {subcategories.map((sub) => {
                const SubIcon = getSubcategoryIcon(activeSlug, sub.slug);
                return (
                  <SelectItem key={sub.id} value={sub.id}>
                    <span className="flex items-center gap-2">
                      <SubIcon className="h-4 w-4" />
                      {sub.name}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Condition</Label>
        <Select value={condition || ALL} onValueChange={(v) => setCondition(v === ALL ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Any condition" />
          </SelectTrigger>
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
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Division</Label>
        <Select
          value={division || ALL}
          onValueChange={(v) => {
            setDivision(v === ALL ? '' : v);
            setDistrict('');
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any division" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any</SelectItem>
            {DIVISIONS.map((div) => (
              <SelectItem key={div} value={div}>{div}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {division && (
        <div className="space-y-2">
          <Label>District</Label>
          <Select value={district || ALL} onValueChange={(v) => setDistrict(v === ALL ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Any district" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any</SelectItem>
              {(DISTRICTS[division] || []).map((dist) => (
                <SelectItem key={dist} value={dist}>{dist}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={applyFilters} className="flex-1">Apply</Button>
        <Button onClick={clearFilters} variant="outline">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const CategoryIcon = getCategoryIcon(activeSlug);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{category?.name || 'Category'} — BazarBD</title>
      </Helmet>
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
            <SortSelect value={sort} onChange={(v) => { setSort(v); setPage(1); }} />

            {/* Mobile Filter Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterPanel />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Selectable subcategory chips */}
        {subcategories.length > 0 && (
          <div className="mb-6">
            <SubcategoryChips />
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 bg-card p-4 rounded-lg border">
              <h3 className="font-semibold mb-4">Filters</h3>
              <FilterPanel />
            </div>
          </aside>

          {/* Ads Grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : ads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No ads found in this category.</p>
                <Button onClick={clearFilters} variant="outline" className="mt-4">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {ads.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      isFavorite={favorites.includes(ad.id)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
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
