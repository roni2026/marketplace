import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Skeleton } from '@/components/ui/skeleton';
import { AdCard } from '@/components/ads/AdCard';
import { Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

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
  categories?: { name: string; slug: string } | null;
}

export default function Favorites() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      // First get favorite ad IDs
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

      // Then fetch the ads with their images and categories
      const { data: adData, error: adError } = await supabase
        .from('ads')
        .select(`
          id, title, slug, price, price_type, condition, division, district,
          is_featured, created_at,
          ad_images(image_url),
          categories(name, slug)
        `)
        .in('id', adIds)
        .order('created_at', { ascending: false });

      if (adError) throw adError;

      // Filter out any null/undefined entries from failed joins
      setAds((adData || []).filter((a: any) => a !== null));
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setAds([]);
    }
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
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
        <div className="flex items-center gap-3 mb-6">
          <Heart className="h-6 w-6 text-destructive" />
          <h1 className="text-2xl font-bold">{t('nav.favorites', 'Favorites')}</h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-semibold mb-2">No Favorites Yet</h3>
            <p className="text-muted-foreground mb-4">
              Save ads you're interested in by tapping the heart icon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} isFavorite={true} onFavoriteToggle={fetchFavorites} />
            ))}
          </div>
        )}
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
