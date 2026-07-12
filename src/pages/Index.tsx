import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { HeroBanner } from '@/components/home/HeroBanner';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { AdSection } from '@/components/home/AdSection';
import { RecentlyViewed } from '@/components/home/RecentlyViewed';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { CATEGORY_DATA } from '@/lib/categoryData';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

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

const Index = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredAds, setFeaturedAds] = useState<Ad[]>([]);
  const [recentAds, setRecentAds] = useState<Ad[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [categoriesRes, featuredRes, recentRes] = await Promise.all([
        supabase.from('categories').select('id, name, slug, icon, sort_order').order('sort_order'),
        supabase
          .from('ads')
          .select('*, ad_images(image_url), categories(name, slug)')
          .eq('status', 'approved')
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('ads')
          .select('*, ad_images(image_url), categories(name, slug)')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (featuredRes.data) setFeaturedAds(featuredRes.data as Ad[]);
      if (recentRes.data) setRecentAds(recentRes.data as Ad[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
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

  // Use fallback categories if DB is empty
  const displayCategories = categories.length > 0
    ? categories
    : CATEGORY_DATA.slice(0, 12).map(c => ({ id: c.id, name: c.name, slug: c.slug, icon: null }));

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{t('homepage.title')}</title>
        <meta
          name="description"
          content={t('homepage.description')}
        />
      </Helmet>
      <Header />
      <main className="flex-1 pb-16 lg:pb-0">
        <HeroBanner />
        
        {/* Mobile: Horizontal scrollable category strip with tiny icons */}
        <div className="lg:hidden border-b border-border bg-card">
          <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide" style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1 shrink-0 w-16">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
              ))
            ) : (
              displayCategories.slice(0, 12).map((category) => {
                const fallback = CATEGORY_DATA.find(c => c.slug === category.slug || c.name === category.name);
                const Icon = fallback?.icon;
                return (
                  <Link
                    key={category.id}
                    to={`/category/${category.slug}`}
                    className="flex flex-col items-center gap-1 shrink-0 w-16 group"
                  >
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95 ${fallback?.color || 'bg-primary/10'}`}>
                      {Icon ? (
                        <Icon className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-bold text-primary">
                          {category.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight line-clamp-1 w-full">
                      {category.name}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="container mx-auto px-4">
          {/* Desktop: Full category grid */}
          <div className="hidden lg:block">
            {isLoading ? (
              <div className="py-8">
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="grid grid-cols-8 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              </div>
            ) : (
              <CategoryGrid categories={categories} />
            )}
          </div>

          {/* Ads sections - shown on all screen sizes */}
          {isLoading ? (
            <div className="py-8">
              <Skeleton className="h-8 w-48 mb-6" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <AdSection 
                title={t('homepage.featuredAds')} 
                ads={featuredAds} 
                favorites={favorites}
              />
              <AdSection 
                title={t('homepage.recentAds')} 
                ads={recentAds} 
                viewAllLink="/search"
                favorites={favorites}
              />
              <RecentlyViewed favorites={favorites} />
            </>
          )}
        </div>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
};

export default Index;
