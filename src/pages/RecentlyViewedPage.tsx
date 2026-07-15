/**
 * RecentlyViewedPage — Dedicated page for recently viewed listings.
 * Grid view with clear history and remove individual item options.
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { AdCard } from '@/components/ads/AdCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { History, Trash2, ArrowRight, X } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RecentlyViewedAd {
  id: string;
  ad_id: string;
  viewed_at: string;
  ads: {
    id: string; title: string; slug: string; price: number | null; price_type: string;
    condition: string; division: string; district: string; is_featured: boolean;
    is_premium: boolean | null; is_boosted: boolean | null; views_count: number | null;
    favorites_count: number | null; brand: string | null; created_at: string;
    ad_images: { image_url: string }[]; categories: { name: string; slug: string } | null;
  } | null;
}

export default function RecentlyViewedPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<RecentlyViewedAd[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recently_viewed')
        .select('id, ad_id, viewed_at, ads(id, title, slug, price, price_type, condition, division, district, is_featured, is_premium, is_boosted, views_count, favorites_count, brand, created_at, ad_images(image_url), categories(name, slug))')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(48);
      if (error) throw error;
      setItems((data as RecentlyViewedAd[]) || []);
    } catch {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem('recently_viewed_ads');
        if (raw) {
          const ids = JSON.parse(raw) as string[];
          if (ids.length > 0) {
            const { data: adData } = await supabase
              .from('ads')
              .select('id, title, slug, price, price_type, condition, division, district, is_featured, is_premium, is_boosted, views_count, favorites_count, brand, created_at, ad_images(image_url), categories(name, slug)')
              .in('id', ids)
              .in('status', ['approved', 'boosted', 'premium']);
            setItems((adData || []).map((ad: any) => ({ id: ad.id, ad_id: ad.id, viewed_at: ad.created_at, ads: ad })));
          }
        }
      } catch {}
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchItems(); }, [user, fetchItems]);

  const handleRemove = async (itemId: string) => {
    try {
      await supabase.from('recently_viewed').delete().eq('id', itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
      toast.success('Removed from recently viewed');
    } catch {
      toast.error('Failed to remove');
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    try {
      await supabase.from('recently_viewed').delete().eq('user_id', user.id);
      localStorage.removeItem('recently_viewed_ads');
      setItems([]);
      toast.success('Recently viewed history cleared');
    } catch {
      toast.error('Failed to clear history');
    }
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const validItems = items.filter(i => i.ads !== null);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Recently Viewed</h1>
              <p className="text-muted-foreground">{validItems.length} {validItems.length === 1 ? 'listing' : 'listings'}</p>
            </div>
          </div>

          {validItems.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Trash2 className="h-4 w-4" /> Clear History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all recently viewed?</AlertDialogTitle>
                  <AlertDialogDescription>This will remove all items from your recently viewed history. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
          </div>
        ) : validItems.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-1">No recently viewed listings</h3>
            <p className="text-sm text-muted-foreground mb-4">Listings you view will appear here for easy access.</p>
            <Button asChild><Link to="/search">Browse Listings <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {validItems.map(item => (
              <div key={item.id} className="relative group">
                <AdCard ad={item.ads as any} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 z-10 h-8 w-8 bg-card/80 hover:bg-card opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(item.id); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
