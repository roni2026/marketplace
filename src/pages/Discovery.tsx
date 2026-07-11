/**
 * Discovery — Discovery page with curated listing sections,
 * personalized feed, featured brands/stores, and browse by category.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { AdCard } from '@/components/ads/AdCard';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { RecentlyViewed } from '@/components/home/RecentlyViewed';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import { useSearchDiscovery } from '@/hooks/useSearchDiscovery';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, TrendingUp, Sparkles, Star, Zap, Eye, Heart, RefreshCw,
  Store, Tag, ChevronRight, Package, Award, Percent, Clock, Flame,
  ChevronLeft, ArrowRight,
} from 'lucide-react';
import type { SearchResultListing, DiscoverySection, PersonalizedFeedSection } from '@/integrations/supabase/types_v5_search';

interface Category { id: string; name: string; slug: string; icon: string | null; }

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'star': Star, 'sparkles': Sparkles, 'trending-up': TrendingUp, 'eye': Eye,
  'heart': Heart, 'zap': Zap, 'percent': Percent, 'refresh-cw': RefreshCw,
  'award': Award, 'tag': Tag, 'clock': Clock, 'flame': Flame, 'store': Store,
  'package': Package,
};

function ListingRow({ title, subtitle, icon, listings, viewAllLink }: {
  title: string; subtitle?: string; icon?: string;
  listings: SearchResultListing[]; viewAllLink?: string;
}) {
  const navigate = useNavigate();
  const Icon = icon ? ICON_MAP[icon] || Package : Package;

  if (!listings || listings.length === 0) return null;

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {viewAllLink && (
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate(viewAllLink)}>
            View All <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'thin' }}>
        {listings.map(ad => (
          <div key={ad.id} className="snap-start shrink-0 w-44 sm:w-52 md:w-56">
            <AdCard ad={ad as any} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Discovery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    discoverySections, fetchDiscoverySections, fetchDiscoveryListings,
    personalizedFeed, fetchPersonalizedFeed,
    featuredBrands, fetchFeaturedBrands,
    featuredStores, fetchFeaturedStores,
  } = useSearchDiscovery();

  const [categories, setCategories] = useState<Category[]>([]);
  const [sectionListings, setSectionListings] = useState<Record<string, SearchResultListing[]>>({});
  const [flashDeals, setFlashDeals] = useState<SearchResultListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchDiscoverySections();
      await fetchFeaturedBrands();
      await fetchFeaturedStores();

      const { data: catData } = await supabase.from('categories').select('id, name, slug, icon').order('sort_order');
      if (catData) setCategories(catData as Category[]);

      if (user) {
        await fetchPersonalizedFeed();
        const { data: favData } = await supabase.from('favorites').select('ad_id').eq('user_id', user.id);
        if (favData) setFavorites(favData.map(f => f.ad_id));
      }

      setIsLoading(false);
    };
    loadData();
  }, [user, fetchDiscoverySections, fetchFeaturedBrands, fetchFeaturedStores, fetchPersonalizedFeed]);

  // Load listings for each discovery section
  useEffect(() => {
    if (discoverySections.length === 0) return;
    const loadSections = async () => {
      const entries: Record<string, SearchResultListing[]> = {};
      for (const section of discoverySections) {
        const listings = await fetchDiscoveryListings(section.section_type, 10);
        entries[section.section_type] = listings;
      }
      setSectionListings(entries);

      // Load flash deals separately
      const deals = await fetchDiscoveryListings('flash_deals', 10);
      setFlashDeals(deals);
    };
    loadSections();
  }, [discoverySections, fetchDiscoveryListings]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Helmet>
        <title>Discover — BazarBD</title>
        <meta name="description" content="Discover trending, featured, and new listings on BazarBD" />
      </Helmet>

      <div className="container mx-auto px-4 max-w-7xl">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background py-12 md:py-16 -mx-4 px-4 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Discover Something New</h1>
            <p className="text-muted-foreground">Explore trending listings, great deals, and curated collections</p>
          </div>
          <div className="max-w-2xl mx-auto">
            <SearchAutocomplete
              placeholder="Search for anything..."
              className="w-full"
              onSelect={s => {
                if (s.href) navigate(s.href);
                else navigate(`/search?q=${encodeURIComponent(s.value)}`);
              }}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['iPhone', 'Laptop', 'Motorcycle', 'Flat', 'Furniture'].map(term => (
              <button
                key={term}
                onClick={() => navigate(`/search?q=${term}`)}
                className="px-3 py-1 rounded-full bg-card border border-border text-sm hover:border-primary hover:text-primary transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </section>

        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="flex gap-3 overflow-hidden">
                  {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-56 w-44 sm:w-52 shrink-0 rounded-lg" />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Personalized Feed (logged in users) */}
            {user && personalizedFeed.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">For You</h2>
                </div>
                {personalizedFeed.map((section: PersonalizedFeedSection) => (
                  <ListingRow
                    key={section.type}
                    title={section.title}
                    icon={section.icon}
                    listings={section.listings}
                    viewAllLink="/search"
                  />
                ))}
              </div>
            )}

            {/* Discovery Sections */}
            {discoverySections.map(section => {
              const listings = sectionListings[section.section_type] || [];
              if (listings.length === 0) return null;
              return (
                <ListingRow
                  key={section.id}
                  title={section.title}
                  subtitle={section.subtitle || undefined}
                  icon={section.icon || undefined}
                  listings={listings}
                  viewAllLink={`/search?sort=${section.section_type === 'new_arrivals' ? 'newest' : section.section_type === 'most_viewed' ? 'most_viewed' : 'best_match'}`}
                />
              );
            })}

            {/* Flash Deals */}
            {flashDeals.length > 0 && (
              <section className="py-6">
                <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-9 w-9 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Flame className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold">Flash Deals</h2>
                          <Badge variant="destructive" className="text-xs">HOT</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Limited-time offers — grab them fast!</p>
                      </div>
                    </div>
                    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2">
                      {flashDeals.map(ad => (
                        <div key={ad.id} className="snap-start shrink-0 w-44 sm:w-52">
                          <AdCard ad={ad as any} isFavorite={favorites.includes(ad.id)} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Featured Brands */}
            {featuredBrands.length > 0 && (
              <section className="py-6">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">Featured Brands</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {featuredBrands.slice(0, 12).map(brand => (
                    <button
                      key={brand.brand}
                      onClick={() => navigate(`/search?brand=${encodeURIComponent(brand.brand)}`)}
                      className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:shadow-md hover:border-primary transition-all"
                    >
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">{brand.brand.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-sm">{brand.brand}</span>
                      <span className="text-xs text-muted-foreground">{brand.count} listings</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Featured Stores */}
            {featuredStores.length > 0 && (
              <section className="py-6">
                <div className="flex items-center gap-2 mb-4">
                  <Store className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">Featured Stores</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {featuredStores.map(store => (
                    <button
                      key={store.id}
                      onClick={() => navigate(`/shop/${store.slug}`)}
                      className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:shadow-md hover:border-primary transition-all shrink-0 w-40"
                    >
                      <div className="h-14 w-14 rounded-full bg-muted overflow-hidden">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                            {store.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-sm text-center truncate w-full">{store.name}</span>
                      <span className="text-xs text-muted-foreground">{store.total_products} products</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Recently Viewed */}
            <RecentlyViewed favorites={favorites} />

            {/* Browse by Category */}
            <section className="py-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold">Browse by Category</h2>
              </div>
              <CategoryGrid categories={categories} />
            </section>
          </>
        )}
      </div>
      <Footer />
      <MobileNav />
    </div>
  );
}
