/**
 * HiddenListings — Manage hidden listings page.
 */

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { useMarketplaceExperience } from '@/hooks/useMarketplaceExperience';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { EyeOff, Eye, ChevronLeft, Package } from 'lucide-react';

export default function HiddenListings() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { hiddenListings, fetchHiddenListings, unhideListing } = useMarketplaceExperience();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) { fetchHiddenListings().then(() => setIsLoading(false)); }
  }, [user, fetchHiddenListings]);

  const handleUnhide = async (adId: string) => {
    await unhideListing(adId);
  };

  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/preferences')} className="gap-1 mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Preferences
        </Button>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <EyeOff className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Hidden Listings</h1>
            <p className="text-sm text-muted-foreground">Listings you've hidden from your search results</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : hiddenListings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No hidden listings</p>
              <Button variant="outline" onClick={() => navigate('/search')} className="mt-4">Browse Marketplace</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {hiddenListings.map(h => (
              <Card key={h.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="h-16 w-16 rounded-md bg-muted overflow-hidden shrink-0">
                    {h.ad?.ad_images?.[0]?.image_url ? (
                      <img src={h.ad.ad_images[0].image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center"><Package className="h-6 w-6 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {h.ad ? (
                      <Link to={`/ad/${h.ad.slug}-${h.ad.id}`} className="font-medium text-sm hover:underline truncate block">
                        {h.ad.title}
                      </Link>
                    ) : (
                      <p className="font-medium text-sm">Listing no longer available</p>
                    )}
                    <p className="text-sm text-muted-foreground">{h.ad ? formatPrice(h.ad.price, h.ad.price_type) : ''}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">Hidden</Badge>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}</span>
                    </div>
                    {h.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {h.reason}</p>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleUnhide(h.ad_id)} className="gap-1.5 shrink-0">
                    <Eye className="h-3.5 w-3.5" /> Unhide
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
      <MobileNav />
    </div>
  );
}
