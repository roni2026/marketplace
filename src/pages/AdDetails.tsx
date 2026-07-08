import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { formatPrice } from '@/lib/constants';
import { formatDistanceToNow, format } from 'date-fns';
import { MapPin, Clock, User, Phone, Heart, Flag, MessageCircle, Eye, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AdGallery } from '@/components/ads/AdGallery';
import { ShareButton } from '@/components/ads/ShareButton';
import { SimilarAds } from '@/components/ads/SimilarAds';

interface Ad {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | null;
  price_type: string;
  condition: string;
  division: string;
  district: string;
  area: string | null;
  is_featured: boolean;
  created_at: string;
  user_id: string;
  category_id: string;
  views_count: number | null;
  ad_images: { id: string; image_url: string; sort_order: number }[];
  categories: { name: string; slug: string } | null;
  subcategories: { name: string; slug: string } | null;
}

interface Profile {
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export default function AdDetails() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { recordView } = useRecentlyViewed();
  const [ad, setAd] = useState<Ad | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Extract ID from slug (format: title-slug-uuid)
  const adId = slug?.split('-').pop() || '';

  useEffect(() => {
    fetchAd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adId]);

  useEffect(() => {
    if (user && ad) {
      checkFavorite();
      fetchFavorites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ad]);

  const fetchAd = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*, ad_images(*), categories(name, slug), subcategories(name, slug)')
        .eq('id', adId)
        .single();

      if (error) throw error;
      
      setAd(data as Ad);
      recordView(data.id);
      
      // Fetch seller profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone_number, avatar_url, created_at')
        .eq('user_id', data.user_id)
        .single();
      
      setSeller(profile);

      // Increment view count
      await supabase
        .from('ads')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', adId);
    } catch (error) {
      console.error('Error fetching ad:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkFavorite = async () => {
    if (!user || !ad) return;
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('ad_id', ad.id)
      .maybeSingle();
    setIsFavorite(!!data);
  };

  const fetchFavorites = async () => {
    if (!user) return;
    const { data } = await supabase.from('favorites').select('ad_id').eq('user_id', user.id);
    if (data) setFavorites(data.map((f) => f.ad_id));
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Please login to save favorites');
      return;
    }
    if (!ad) return;

    if (isFavorite) {
      await supabase.from('favorites').delete().eq('ad_id', ad.id).eq('user_id', user.id);
      setIsFavorite(false);
      toast.success('Removed from favorites');
    } else {
      await supabase.from('favorites').insert({ ad_id: ad.id, user_id: user.id });
      setIsFavorite(true);
      toast.success('Added to favorites');
    }
  };

  const handleReport = async () => {
    if (!user) {
      toast.error('Please login to report an ad');
      return;
    }
    if (!reportReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    if (!ad) return;

    setIsReporting(true);
    try {
      await supabase.from('reports').insert({
        user_id: user.id,
        ad_id: ad.id,
        reason: reportReason,
      });
      toast.success('Report submitted. Thank you for helping keep BazarBD safe.');
      setReportReason('');
    } catch (error) {
      toast.error('Failed to submit report');
    } finally {
      setIsReporting(false);
    }
  };

  const images = ad?.ad_images?.slice().sort((a, b) => a.sort_order - b.sort_order) || [];
  const whatsappNumber = seller?.phone_number?.replace(/[^0-9]/g, '');

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold">Ad not found</h1>
          <p className="text-muted-foreground mt-2">This ad may have been removed or doesn't exist.</p>
          <Link to="/">
            <Button className="mt-4">Go Home</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{ad.title} — BazarBD</title>
        <meta name="description" content={ad.description?.slice(0, 155) || ad.title} />
        <meta property="og:title" content={ad.title} />
        {images[0] && <meta property="og:image" content={images[0].image_url} />}
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex gap-2 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          {ad.categories && (
            <>
              <Link to={`/category/${ad.categories.slug}`} className="hover:text-primary">
                {ad.categories.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="truncate">{ad.title}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Images */}
          <div className="lg:col-span-2 space-y-4">
            <AdGallery images={images} title={ad.title} isFeatured={ad.is_featured} />

            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-4">Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {ad.description || 'No description provided.'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl font-bold">{ad.title}</h1>
                  <Badge variant="secondary" className="capitalize shrink-0">
                    {ad.condition}
                  </Badge>
                </div>

                <p className="text-3xl font-bold text-primary">
                  {formatPrice(ad.price, ad.price_type)}
                </p>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{ad.area ? `${ad.area}, ` : ''}{ad.district}, {ad.division}</span>
                </div>

                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Posted {formatDistanceToNow(new Date(ad.created_at), { addSuffix: true })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {(ad.views_count || 0) + 1} views
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={toggleFavorite}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
                    {isFavorite ? 'Saved' : 'Save'}
                  </Button>
                  <ShareButton title={ad.title} text={`Check out this ad on BazarBD: ${ad.title}`} />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Report this ad">
                        <Flag className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Report this ad</DialogTitle>
                        <DialogDescription>
                          Please tell us why you're reporting this ad
                        </DialogDescription>
                      </DialogHeader>
                      <Textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Describe the issue..."
                        rows={4}
                      />
                      <Button onClick={handleReport} disabled={isReporting}>
                        Submit Report
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold">Seller Information</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {seller?.avatar_url ? (
                      <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium flex items-center gap-1 truncate">
                      {seller?.full_name || 'Anonymous'}
                      {seller?.phone_number && (
                        <BadgeCheck className="h-4 w-4 text-primary shrink-0" aria-label="Verified contact" />
                      )}
                    </p>
                    {seller?.created_at && (
                      <p className="text-xs text-muted-foreground">
                        Member since {format(new Date(seller.created_at), 'MMM yyyy')}
                      </p>
                    )}
                  </div>
                </div>

                {seller?.phone_number && (
                  <div className="space-y-2">
                    {showPhone ? (
                      <Button className="w-full gap-2" asChild>
                        <a href={`tel:${seller.phone_number}`}>
                          <Phone className="h-4 w-4" />
                          {seller.phone_number}
                        </a>
                      </Button>
                    ) : (
                      <Button className="w-full gap-2" onClick={() => setShowPhone(true)}>
                        <Phone className="h-4 w-4" />
                        Reveal Phone Number
                      </Button>
                    )}
                    {whatsappNumber && (
                      <Button variant="outline" className="w-full gap-2" asChild>
                        <a
                          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                            `Hi, I'm interested in your ad "${ad.title}" on BazarBD.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Message on WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Safety Tips */}
            <Card className="bg-primary/5">
              <CardContent className="p-4 text-sm">
                <h4 className="font-semibold mb-2">Safety Tips</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Meet in a public place</li>
                  <li>• Check the item before paying</li>
                  <li>• Don't pay in advance</li>
                  <li>• Beware of unrealistic offers</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {ad.categories && (
          <SimilarAds categoryId={ad.category_id} excludeAdId={ad.id} favorites={favorites} />
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
