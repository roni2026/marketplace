/**
 * PriceAlertsPage — Shows listings the user is tracking for price drops.
 * Displays target price, current price, and percentage drop.
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, Trash2, TrendingDown, ArrowRight, BellOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PriceAlert {
  id: string;
  ad_id: string;
  target_price: number;
  notified: boolean;
  created_at: string;
  ads: {
    id: string; title: string; slug: string; price: number | null;
    ad_images: { image_url: string }[];
  } | null;
}

export default function PriceAlertsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('price_drop_alerts')
        .select('id, ad_id, target_price, notified, created_at, ads(id, title, slug, price, ad_images(image_url))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAlerts((data as PriceAlert[]) || []);
    } catch {
      setAlerts([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) fetchAlerts(); }, [user, fetchAlerts]);

  const handleDelete = async (alertId: string) => {
    try {
      await supabase.from('price_drop_alerts').delete().eq('id', alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success('Price alert removed');
    } catch {
      toast.error('Failed to remove alert');
    }
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const validAlerts = alerts.filter(a => a.ads !== null);
  const triggeredCount = validAlerts.filter(a => a.ads && a.ads.price !== null && a.ads.price <= a.target_price).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Price Drop Alerts</h1>
            <p className="text-muted-foreground">
              {validAlerts.length} {validAlerts.length === 1 ? 'alert' : 'alerts'}
              {triggeredCount > 0 && ` · ${triggeredCount} triggered`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : validAlerts.length === 0 ? (
          <div className="text-center py-12">
            <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-1">No price alerts set</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set a target price on any listing and we'll notify you when the price drops.
            </p>
            <Button asChild><Link to="/search">Browse Listings <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </div>
        ) : (
          <div className="space-y-3">
            {validAlerts.map(alert => {
              const ad = alert.ads!;
              const currentPrice = ad.price;
              const isTriggered = currentPrice !== null && currentPrice <= alert.target_price;
              const dropPercent = currentPrice && currentPrice < alert.target_price
                ? Math.round(((alert.target_price - currentPrice) / alert.target_price) * 100)
                : 0;
              const remaining = currentPrice && currentPrice > alert.target_price
                ? Math.round(((currentPrice - alert.target_price) / currentPrice) * 100)
                : 0;

              return (
                <Card key={alert.id} className={isTriggered ? 'border-green-500/50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link to={`/ad/${ad.slug}-${ad.id}`} className="shrink-0">
                        {ad.ad_images?.[0]?.image_url ? (
                          <img src={ad.ad_images[0].image_url} alt={ad.title} className="w-full sm:w-24 h-24 rounded-lg object-cover" />
                        ) : (
                          <div className="w-full sm:w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                            <Bell className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <Link to={`/ad/${ad.slug}-${ad.id}`} className="font-medium text-sm hover:text-primary line-clamp-1">
                            {ad.title}
                          </Link>
                          {isTriggered ? (
                            <Badge className="bg-green-600 hover:bg-green-600 gap-1 shrink-0">
                              <TrendingDown className="h-3 w-3" /> Target Hit!
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="shrink-0">Tracking</Badge>
                          )}
                        </div>

                        <div className="flex items-baseline gap-3 mb-1">
                          <div>
                            <span className="text-xs text-muted-foreground">Current: </span>
                            <span className="font-bold text-primary">৳{currentPrice?.toLocaleString() || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Target: </span>
                            <span className="font-medium">৳{alert.target_price.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {isTriggered
                              ? `Price dropped ${dropPercent}% below your target!`
                              : `Needs to drop ${remaining}% more to hit your target`
                            }
                            <span className="ml-2">· Set {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
                          </p>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(alert.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
