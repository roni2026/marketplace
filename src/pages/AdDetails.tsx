import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { generateListingTitle, generateListingDescription } from '@/lib/seo/meta';
import { buildProduct } from '@/lib/seo/structuredData';
import { canonicalUrl, listingUrl } from '@/lib/seo/urls';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useOffers } from '@/hooks/useOffers';
import { formatPrice } from '@/lib/constants';
import { formatDistanceToNow, format } from 'date-fns';
import { MapPin, Clock, User, Phone, Heart, Flag, MessageCircle, Eye, BadgeCheck, Tag, Zap, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea as UITextarea } from '@/components/ui/textarea';
import { AdGallery } from '@/components/ads/AdGallery';
import { ShareButton } from '@/components/ads/ShareButton';
import { SimilarAds } from '@/components/ads/SimilarAds';
import { ListingDetail } from '@/components/listings/ListingDetail';
import { logAudit } from '@/lib/audit';
import { useTranslation } from 'react-i18next';

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
  is_premium: boolean | null;
  is_boosted: boolean | null;
  is_urgent: boolean | null;
  views_count: number | null;
  favorites_count: number | null;
  shares_count: number | null;
  offers_count: number | null;
  call_clicks: number | null;
  whatsapp_clicks: number | null;
  contact_phone: string | null;
  secondary_phone: string | null;
  created_at: string;
  user_id: string;
  category_id: string;
  ad_images: { id: string; image_url: string; sort_order: number }[];
  categories: { name: string; slug: string } | null;
  subcategories: { name: string; slug: string } | null;
}

interface Profile {
  full_name: string | null;
  phone_number: string | null;
  secondary_phone: string | null;
  avatar_url: string | null;
  created_at: string | null;
  is_verified: boolean | null;
}

export default function AdDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { recordView } = useRecentlyViewed();
  const { t } = useTranslation();
  const [ad, setAd] = useState<Ad | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [callClicks, setCallClicks] = useState(0);
  const [whatsappClicks, setWhatsappClicks] = useState(0);
  const [showSafetyPopup, setShowSafetyPopup] = useState(false);
  const [safetyKeyword, setSafetyKeyword] = useState<string | null>(null);

  const SAFETY_KEYWORDS = [
    'advance payment',
    'pay in advance',
    'send money',
    'wire transfer',
    'western union',
    'moneygram',
    'crypto',
    'bitcoin',
    'gift card',
    'upfront fee',
    'registration fee',
    'shipping fee',
    'customs fee',
    'lottery',
    'prize winner',
    'inheritance',
    'loan offer',
    'investment opportunity',
    'double your money',
    'guaranteed return',
  ];

  // Extract UUID from the URL param. The URL format is typically
  // /ad/<slug>-<uuid> e.g. /ad/panir-bottle-c7478557-1d6a-46fb-9f56-e9648f8844f7
  // A UUID is 8-4-4-4-12 hex chars (36 chars with hyphens). We can't use
  // split('-').pop() because UUIDs themselves contain hyphens.
  const uuidMatch = slug?.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  const adId = uuidMatch?.[1] || '';
  const { makeOffer } = useOffers(adId);

  useEffect(() => {
    fetchAd();
    // Scroll to top when entering an ad page
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (user && ad) {
      checkFavorite();
      fetchFavorites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ad]);

  useEffect(() => {
    if (!ad) return;
    const text = `${ad.title} ${ad.description || ''}`.toLowerCase();
    const found = SAFETY_KEYWORDS.find((kw) => text.includes(kw));
    if (found) {
      setSafetyKeyword(found);
      setShowSafetyPopup(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad]);

  const fetchAd = async () => {
    setIsLoading(true);
    setAd(null);
    try {
      let data: Ad | null = null;

      // Attempt 1: query by extracted UUID (from end of URL param)
      if (adId) {
        const res = await supabase
          .from('ads')
          .select('*, ad_images(*), categories(name, slug), subcategories(name, slug)')
          .eq('id', adId)
          .maybeSingle();
        if (res.data) data = res.data as Ad;
      }

      // Attempt 2: query by full slug (handles /ad/some-slug without UUID)
      if (!data && slug) {
        const res = await supabase
          .from('ads')
          .select('*, ad_images(*), categories(name, slug), subcategories(name, slug)')
          .eq('slug', slug)
          .maybeSingle();
        if (res.data) data = res.data as Ad;
      }

      // Attempt 3: slug without the UUID suffix (e.g. "panir-bottle" from
      // "panir-bottle-c7478557-...") — the DB slug column might store just the title slug
      if (!data && slug && adId) {
        const slugWithoutUuid = slug.replace(/-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '');
        if (slugWithoutUuid && slugWithoutUuid !== slug) {
          const res = await supabase
            .from('ads')
            .select('*, ad_images(*), categories(name, slug), subcategories(name, slug)')
            .eq('slug', slugWithoutUuid)
            .maybeSingle();
          if (res.data) data = res.data as Ad;
        }
      }

      if (!data) {
        setIsLoading(false);
        return;
      }

      setAd(data);
      recordView(data.id);

      // Fetch seller profile, increment view count, and track stats in parallel
      const profilePromise = supabase
        .from('profiles')
        .select('full_name, phone_number, secondary_phone, avatar_url, created_at, is_verified')
        .eq('user_id', data.user_id)
        .maybeSingle();

      const viewCountPromise = supabase
        .from('ads')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', data.id);

      const statsPromise = supabase
        .from('ad_stats')
        .upsert({
          ad_id: data.id,
          stat_date: new Date().toISOString().slice(0, 10),
          views: 1,
        }, { onConflict: 'ad_id,stat_date' });

      const auditPromise = user
        ? logAudit({ action: 'update', resourceType: 'ad_view', resourceId: data.id })
        : Promise.resolve();

      const [profileResult] = await Promise.all([profilePromise, viewCountPromise, statsPromise, auditPromise]);

      setSeller(profileResult.data);
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
      toast.error(t('toast.pleaseLoginFavorites'));
      return;
    }
    if (!ad) return;

    if (isFavorite) {
      await supabase.from('favorites').delete().eq('ad_id', ad.id).eq('user_id', user.id);
      setIsFavorite(false);
      toast.success(t('toast.removedFromFavorites'));
      // Decrement favorites count
      await supabase
        .from('ads')
        .update({ favorites_count: Math.max((ad.favorites_count || 0) - 1, 0) })
        .eq('id', ad.id);
    } else {
      await supabase.from('favorites').insert({ ad_id: ad.id, user_id: user.id });
      setIsFavorite(true);
      toast.success(t('toast.addedToFavorites'));
      // Increment favorites count
      await supabase
        .from('ads')
        .update({ favorites_count: (ad.favorites_count || 0) + 1 })
        .eq('id', ad.id);
    }
  };

  const handleShare = async () => {
    if (!ad) return;
    // Increment share count
    await supabase
      .from('ads')
      .update({ shares_count: (ad.shares_count || 0) + 1 })
      .eq('id', ad.id);
  };

  const handleReport = async () => {
    if (!user) {
      toast.error(t('toast.pleaseLoginReport'));
      return;
    }
    if (!reportReason.trim()) {
      toast.error(t('toast.provideReason'));
      return;
    }
    if (!ad) return;

    setIsReporting(true);
    try {
      await supabase.from('reports').insert({
        user_id: user.id,
        ad_id: ad.id,
        reason: reportReason,
        status: 'pending',
      });
      toast.success(t('toast.reportSubmitted'));
      setReportReason('');
    } catch (error) {
      toast.error(t('toast.reportFailed'));
    } finally {
      setIsReporting(false);
    }
  };

  const handleOffer = async () => {
    if (!user) {
      toast.error(t('toast.pleaseLoginOffer'));
      return;
    }
    if (!ad || !offerAmount) return;

    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('toast.validAmount'));
      return;
    }

    const { error } = await makeOffer({
      adId: ad.id,
      sellerId: ad.user_id,
      amount,
      message: offerMessage,
    });

    if (error) {
      toast.error(t('toast.offerFailed'));
    } else {
      toast.success(t('toast.offerSent'));
      setShowOfferDialog(false);
      setOfferAmount('');
      setOfferMessage('');
    }
  };

  const trackCallClick = async () => {
    if (!ad) return;
    setCallClicks((c) => c + 1);
    await supabase
      .from('ads')
      .update({ call_clicks: (ad.call_clicks || 0) + 1 })
      .eq('id', ad.id);
  };

  const trackWhatsAppClick = async () => {
    if (!ad) return;
    setWhatsappClicks((c) => c + 1);
    await supabase
      .from('ads')
      .update({ whatsapp_clicks: (ad.whatsapp_clicks || 0) + 1 })
      .eq('id', ad.id);
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast.error(t('toast.pleaseLoginMessage'));
      return;
    }
    if (!ad || !messageText.trim()) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: ad.user_id,
      ad_id: ad.id,
      body: messageText.trim(),
    });

    if (error) {
      toast.error(t('toast.messageFailed'));
    } else {
      // Create notification for seller
      await supabase.from('notifications').insert({
        user_id: ad.user_id,
        type: 'new_message',
        title: 'New Message',
        message: `You have a new message about "${ad.title}"`,
        data: { ad_id: ad.id },
      }).catch(() => {});
      toast.success(t('toast.messageSent'));
      setShowMessageDialog(false);
      setMessageText('');
    }
  };

  const images = ad?.ad_images?.slice().sort((a, b) => a.sort_order - b.sort_order) || [];
  // Prefer the ad's contact_phone, fall back to the seller's profile phone_number
  const displayPhone = ad?.contact_phone || seller?.phone_number || null;
  const displaySecondaryPhone = ad?.secondary_phone || seller?.secondary_phone || null;
  const whatsappNumber = displayPhone?.replace(/[^0-9]/g, '');
  const isOwnAd = user?.id === ad?.user_id;

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
          <h1 className="text-2xl font-bold">{t('ad.adNotFound')}</h1>
          <p className="text-muted-foreground mt-2">{t('ad.adNotFoundDesc')}</p>
          <Link to="/">
            <Button className="mt-4">{t('ad.goHome')}</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={generateListingTitle(ad)}
        description={generateListingDescription(ad)}
        type="product"
        image={images[0]?.image_url}
        canonical={canonicalUrl(listingUrl(ad.slug || ad.id))}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: ad.categories?.name || 'Category', url: `/category/${ad.categories?.slug || ''}` },
          { name: ad.title, url: listingUrl(ad.slug || ad.id) },
        ]}
        structuredData={buildProduct({
          id: ad.id,
          title: ad.title,
          slug: ad.slug,
          price: ad.price,
          price_type: ad.price_type,
          condition: ad.condition,
          description: ad.description,
          created_at: ad.created_at,
          images: ad.ad_images,
        })}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex gap-2 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-primary">{t('nav.home')}</Link>
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
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />
                  {t('ad.description')}
                </h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {ad.description || t('ad.noDescription')}
                </p>
              </CardContent>
            </Card>

            {/* Phase 4 Extended Details */}
            <ListingDetail ad={ad as any} />
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-border/60 shadow-md overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl font-bold leading-tight">{ad.title}</h1>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <Badge variant="secondary" className="capitalize">
                      {ad.condition}
                    </Badge>
                    {ad.is_urgent && (
                      <Badge className="bg-red-600 hover:bg-red-600 text-white gap-1">
                        <Zap className="h-3 w-3" />
                        {t('ad.urgent')}
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-3xl font-extrabold text-primary tracking-tight">
                  {formatPrice(ad.price, ad.price_type)}
                </p>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{ad.area ? `${ad.area}, ` : ''}{ad.district}, {ad.division}</span>
                </div>

                <div className="flex items-center gap-4 text-muted-foreground text-sm flex-wrap">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Posted {formatDistanceToNow(new Date(ad.created_at), { addSuffix: true })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {(ad.views_count || 0) + 1} views
                  </span>
                  {(ad.favorites_count || 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      {ad.favorites_count}
                    </span>
                  )}
                  {(ad.shares_count || 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      {ad.shares_count} shares
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={toggleFavorite}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-destructive text-destructive' : ''}`} />
                    {isFavorite ? t('ad.saved') : t('ad.save')}
                  </Button>
                  <div onClick={handleShare}>
                    <ShareButton title={ad.title} text={`Check out this ad on SohojKenaBeca: ${ad.title}`} />
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Report this ad">
                        <Flag className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('ad.reportAd')}</DialogTitle>
                        <DialogDescription>
                          {t('ad.reportAdDesc')}
                        </DialogDescription>
                      </DialogHeader>
                      <UITextarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder={t('ad.reportPlaceholder')}
                        rows={4}
                      />
                      <Button onClick={handleReport} disabled={isReporting}>
                        {t('ad.submitReport')}
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Offer & Message buttons */}
                {!isOwnAd && (
                  <div className="flex gap-2">
                    <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1 gap-2">
                          <Tag className="h-4 w-4" />
                          {t('ad.makeOffer')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t('ad.makeAnOffer')}</DialogTitle>
                          <DialogDescription>
                            {t('ad.makeOfferDesc')}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="offerAmount">{t('ad.offerAmount')}</Label>
                            <Input
                              id="offerAmount"
                              type="number"
                              value={offerAmount}
                              onChange={(e) => setOfferAmount(e.target.value)}
                              placeholder={t('ad.offerPlaceholder')}
                              min={0}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="offerMsg">{t('ad.messageOptional')}</Label>
                            <UITextarea
                              id="offerMsg"
                              value={offerMessage}
                              onChange={(e) => setOfferMessage(e.target.value)}
                              placeholder={t('ad.offerMsgPlaceholder')}
                              rows={3}
                            />
                          </div>
                          <Button onClick={handleOffer} className="w-full">
                            {t('ad.submitOffer')}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => {
                        if (!user) { navigate('/auth'); return; }
                        setShowMessageDialog(true);
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {t('ad.message')}
                    </Button>
                  </div>
                )}

                {/* Message Dialog — always in DOM so seller card button can open it */}
                <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('ad.sendMessage')}</DialogTitle>
                      <DialogDescription>
                        {t('ad.sendMessageDesc')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="msgText">{t('ad.message')}</Label>
                        <UITextarea
                          id="msgText"
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder={t('ad.messagePlaceholder')}
                          rows={4}
                        />
                      </div>
                      <Button onClick={handleSendMessage} className="w-full gap-2">
                        <Send className="h-4 w-4" />
                        {t('ad.send')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold">{t('ad.sellerInfo')}</h3>
                <div className="flex items-center gap-3">
                  <Link to={ad?.user_id ? `/user/${ad.user_id}` : '#'} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {seller?.avatar_url ? (
                        <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium flex items-center gap-1 truncate">
                        {seller?.full_name || t('ad.anonymous')}
                        {seller?.is_verified && (
                          <BadgeCheck className="h-4 w-4 text-primary shrink-0" aria-label="Verified seller" />
                        )}
                      </p>
                      {seller?.created_at && (
                        <p className="text-xs text-muted-foreground">
                          Member since {format(new Date(seller.created_at), 'MMM yyyy')}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>

                {displayPhone && (
                  <div className="space-y-2">
                    {showPhone ? (
                      <Button className="w-full gap-2" asChild onClick={trackCallClick}>
                        <a href={`tel:${displayPhone}`}>
                          <Phone className="h-4 w-4" />
                          {displayPhone}
                        </a>
                      </Button>
                    ) : (
                      <Button className="w-full gap-2" onClick={() => setShowPhone(true)}>
                        <Phone className="h-4 w-4" />
                        {t('ad.revealPhone')}
                      </Button>
                    )}
                    {callClicks > 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        {callClicks} {callClicks === 1 ? 'call' : 'calls'}
                      </p>
                    )}
                    {displaySecondaryPhone && showPhone && (
                      <Button variant="outline" className="w-full gap-2" asChild>
                        <a href={`tel:${displaySecondaryPhone}`}>
                          <Phone className="h-4 w-4" />
                          {displaySecondaryPhone}
                        </a>
                      </Button>
                    )}
                    {whatsappNumber && (
                      <Button variant="outline" className="w-full gap-2" asChild onClick={trackWhatsAppClick}>
                        <a
                          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                            `Hi, I'm interested in your ad "${ad.title}" on SohojKenaBeca.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {t('ad.whatsapp')}
                        </a>
                      </Button>
                    )}
                    {whatsappClicks > 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        {whatsappClicks} {whatsappClicks === 1 ? 'whatsapp click' : 'whatsapp clicks'}
                      </p>
                    )}
                  </div>
                )}
                {!isOwnAd && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      if (!user) { navigate('/auth'); return; }
                      setShowMessageDialog(true);
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t('ad.message')}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Safety Tips */}
            <Card className="bg-primary/5">
              <CardContent className="p-4 text-sm">
                <h4 className="font-semibold mb-2">{t('ad.safetyTips')}</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• {t('ad.safetyTip1')}</li>
                  <li>• {t('ad.safetyTip2')}</li>
                  <li>• {t('ad.safetyTip3')}</li>
                  <li>• {t('ad.safetyTip4')}</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Safety Popup */}
        <Dialog open={showSafetyPopup} onOpenChange={setShowSafetyPopup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                {t('ad.safetyWarning', 'Safety Warning')}
              </DialogTitle>
              <DialogDescription>
                {t('ad.safetyWarningDesc', 'We detected a potentially suspicious keyword in this ad listing. Please proceed with caution.')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('ad.safetyKeywordDetected', 'Detected keyword')}: <span className="font-semibold text-foreground">"{safetyKeyword}"</span>
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• {t('ad.safetyTip1')}</li>
                <li>• {t('ad.safetyTip2')}</li>
                <li>• {t('ad.safetyTip3')}</li>
                <li>• {t('ad.safetyTip4')}</li>
              </ul>
              <Button onClick={() => setShowSafetyPopup(false)} className="w-full">
                {t('ad.understand', 'I understand')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {ad.categories && (
          <SimilarAds categoryId={ad.category_id} excludeAdId={ad.id} favorites={favorites} />
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
