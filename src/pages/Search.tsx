import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { AdCard } from '@/components/ads/AdCard';
import { SortSelect, SortOption } from '@/components/ads/SortSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import { Bookmark, SlidersHorizontal, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  is_premium: boolean | null;
  is_boosted: boolean | null;
  is_urgent: boolean | null;
  created_at: string;
  ad_images: { image_url: string }[];
  categories: { name: string; slug: string } | null;
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { user } = useAuth();
  const { saveSearch } = useSavedSearches();
  const { t } = useTranslation();
  
  const [ads, setAds] = useState<Ad[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>('newest');
  const perPage = 12;

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || 'all');
  const [division, setDivision] = useState(searchParams.get('division') || 'all');
  const [district, setDistrict] = useState(searchParams.get('district') || 'all');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || 'all');
  const [categories, setCategories] = useState<{id: string; name: string}[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchAds();
  }, [query, page, sort, minPrice, maxPrice, condition, division, district, categoryId]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name').order('sort_order');
    if (data) setCategories(data);
  };

  const fetchAds = async () => {
    setIsLoading(true);
    
    let dbQuery = supabase
      .from('ads')
      .select('*, ad_images(image_url), categories(name, slug)', { count: 'exact' })
      .in('status', ['approved', 'boosted', 'premium']);

    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }
    if (minPrice) {
      dbQuery = dbQuery.gte('price', parseFloat(minPrice));
    }
    if (maxPrice) {
      dbQuery = dbQuery.lte('price', parseFloat(maxPrice));
    }
    if (condition !== 'all') {
      dbQuery = dbQuery.eq('condition', condition);
    }
    if (division !== 'all') {
      dbQuery = dbQuery.eq('division', division);
    }
    if (district !== 'all') {
      dbQuery = dbQuery.eq('district', district);
    }
    if (categoryId !== 'all') {
      dbQuery = dbQuery.eq('category_id', categoryId);
    }

    dbQuery = dbQuery.order('is_featured', { ascending: false });
    dbQuery = dbQuery.order('is_premium', { ascending: false });
    dbQuery = dbQuery.order('is_boosted', { ascending: false });
    if (sort === 'price_asc') {
      dbQuery = dbQuery.order('price', { ascending: true, nullsFirst: false });
    } else if (sort === 'price_desc') {
      dbQuery = dbQuery.order('price', { ascending: false, nullsFirst: false });
    } else {
      dbQuery = dbQuery.order('created_at', { ascending: false });
    }
    dbQuery = dbQuery.range((page - 1) * perPage, page * perPage - 1);

    const { data, count } = await dbQuery;
    
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

  const handleSaveSearch = async () => {
    if (!user) {
      toast.error(t('toast.pleaseLoginSaveSearch'));
      return;
    }
    if (!saveSearchName.trim()) {
      toast.error(t('toast.enterSearchName'));
      return;
    }

    const { error } = await saveSearch({
      name: saveSearchName.trim(),
      query: query || undefined,
      category_id: categoryId !== 'all' ? categoryId : undefined,
      min_price: minPrice ? parseFloat(minPrice) : undefined,
      max_price: maxPrice ? parseFloat(maxPrice) : undefined,
      condition: condition !== 'all' ? condition : undefined,
      division: division !== 'all' ? division : undefined,
      district: district !== 'all' ? district : undefined,
    });

    if (error) {
      toast.error(t('toast.searchSaveFailed'));
    } else {
      toast.success(t('toast.searchSaved'));
      setShowSaveDialog(false);
      setSaveSearchName('');
    }
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setCondition('all');
    setDivision('all');
    setDistrict('all');
    setCategoryId('all');
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / perPage);
  const activeFilterCount = [minPrice, maxPrice, condition !== 'all' ? condition : '', division !== 'all' ? division : '', district !== 'all' ? district : '', categoryId !== 'all' ? categoryId : ''].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{query ? t('search.searchResults', { query }) : t('search.allAds')} — BazarBD</title>
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {query ? t('search.searchResults', { query }) : t('search.allAds')}
            </h1>
            <p className="text-muted-foreground">{t('search.adsFound', { count: totalCount })}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t('search.filters')}
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {user && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowSaveDialog(true)}
              >
                <Bookmark className="h-4 w-4" />
                {t('search.saveSearch')}
              </Button>
            )}
            <SortSelect value={sort} onChange={(v) => { setSort(v); setPage(1); }} />
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mb-6 p-4 bg-card border border-border rounded-lg space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{t('search.minPrice')}</Label>
                <Input
                  type="number"
                  value={minPrice}
                  onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('search.maxPrice')}</Label>
                <Input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                  placeholder="∞"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('search.condition')}</Label>
                <Select value={condition} onValueChange={(v) => { setCondition(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('search.any')}</SelectItem>
                    <SelectItem value="new">{t('postAd.new')}</SelectItem>
                    <SelectItem value="used">{t('postAd.used')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('search.category')}</Label>
                <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('search.allCategories')}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('search.division')}</Label>
                <Select value={division} onValueChange={(v) => { setDivision(v); setDistrict('all'); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('search.allDivisions')}</SelectItem>
                    {DIVISIONS.map((div) => (
                      <SelectItem key={div} value={div}>{div}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('search.district')}</Label>
                <Select value={district} onValueChange={(v) => { setDistrict(v); setPage(1); }} disabled={division === 'all'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('search.allDistricts')}</SelectItem>
                    {(DISTRICTS[division] || []).map((dist) => (
                      <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t('search.clearFilters')}
              </Button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('search.noResults')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {ads.map((ad) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  isFavorite={favorites.includes(ad.id)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  {t('search.previous')}
                </Button>
                <span className="flex items-center px-4">
                  {t('search.page', { current: page, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  {t('search.next')}
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('search.saveThisSearch')}</DialogTitle>
            <DialogDescription>
              {t('search.saveSearchDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="searchName">{t('search.searchName')}</Label>
              <Input
                id="searchName"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder="e.g., iPhone 13 in Dhaka"
              />
            </div>
            <Button onClick={handleSaveSearch} className="w-full gap-2">
              <Save className="h-4 w-4" />
              {t('search.saveSearch')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MobileNav />
      <Footer />
    </div>
  );
}
