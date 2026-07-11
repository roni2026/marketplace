// BazarBD — Phase 2: PublicProfile page
// pages/PublicProfile.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, MessageCircle, MapPin, Calendar, Globe, User, ArrowLeft, Store, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFollows } from '@/hooks/useFollows';
import { getPublicProfile } from '@/lib/profiles';
import { ProfileBanner } from '@/components/profile/ProfileBanner';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { ProfileReviews } from '@/components/profile/ProfileReviews';
import { SocialLinks } from '@/components/profile/SocialLinks';
import { TrustScoreBadge } from '@/components/profile/TrustScoreBadge';
import { formatMemberSince } from '@/lib/profiles';
import type { PublicProfile as PublicProfileType } from '@/integrations/supabase/types_v2_profiles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface UserAd {
  id: string;
  title: string;
  price: number | null;
  price_type: string;
  status: string;
  created_at: string;
  image_url: string | null;
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<PublicProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userAds, setUserAds] = useState<UserAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);

  const { isFollowingTarget, isToggling, toggleFollow, followersCount } = useFollows(userId);

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (userId) fetchUserAds();
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    setIsLoading(true);
    const { data, error } = await getPublicProfile(userId);
    if (error) {
      toast.error(t('profile.profileLoadError'));
      setIsLoading(false);
      return;
    }
    if (!data) {
      toast.error(t('profile.profileNotFound'));
      navigate('/');
      setIsLoading(false);
      return;
    }
    setProfile(data);
    setIsLoading(false);
  };

  const fetchUserAds = async () => {
    if (!userId) return;
    setAdsLoading(true);
    const { data: ads } = await supabase
      .from('ads')
      .select('id, title, price, price_type, status, created_at')
      .eq('user_id', userId)
      .in('status', ['approved', 'sold', 'boosted', 'premium'])
      .order('created_at', { ascending: false })
      .limit(12);

    if (ads && ads.length > 0) {
      const adIds = ads.map((a: any) => a.id);
      const { data: images } = await supabase
        .from('ad_images')
        .select('ad_id, image_url')
        .in('ad_id', adIds)
        .order('sort_order', { ascending: true });

      const imageMap = new Map<string, string>();
      (images || []).forEach((img: any) => {
        if (!imageMap.has(img.ad_id)) {
          imageMap.set(img.ad_id, img.image_url);
        }
      });

      setUserAds(
        ads.map((a: any) => ({
          ...a,
          image_url: imageMap.get(a.id) || null,
        }))
      );
    } else {
      setUserAds([]);
    }
    setAdsLoading(false);
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }
    const { error } = await toggleFollow();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isFollowingTarget ? t('profile.unfollowed') : t('profile.followed'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-40 sm:h-56 rounded-xl" />
            <Skeleton className="h-24 sm:h-32 rounded-full w-24 sm:w-32 -mt-12" />
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  if (!profile) return null;

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>{profile.full_name || 'User'} — BazarBD</title>
        <meta name="description" content={profile.bio || `${profile.full_name}'s profile on BazarBD`} />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 lg:pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back button */}
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>

          {/* Banner + Avatar + Name */}
          <ProfileBanner
            profile={profile}
            isOwnProfile={isOwnProfile}
            isFollowing={isFollowingTarget}
            isTogglingFollow={isToggling}
            onFollowToggle={handleFollowToggle}
          />

          {/* Bio + Trust Score + Social Links */}
          <div className="space-y-4">
            {profile.bio && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{profile.bio}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <TrustScoreBadge score={profile.trust_score} size="md" />
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
            </div>

            <SocialLinks links={profile.social_links} />
          </div>

          {/* Stats Grid */}
          <ProfileStats profile={profile} />

          {/* Action buttons */}
          {!isOwnProfile && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  if (!currentUser) {
                    navigate('/auth');
                    return;
                  }
                  navigate('/messages');
                }}
              >
                <MessageCircle className="h-4 w-4" />
                {t('profile.sendMessage')}
              </Button>
              <Button
                variant={isFollowingTarget ? 'outline' : 'default'}
                className="flex-1 gap-2"
                onClick={handleFollowToggle}
                disabled={isToggling}
              >
                {isToggling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowingTarget ? (
                  t('profile.following')
                ) : (
                  t('profile.follow')
                )}
              </Button>
            </div>
          )}

          {/* User's Listings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Store className="h-5 w-5" />
                {t('profile.listings')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {adsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                  ))}
                </div>
              ) : userAds.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('profile.noListings')}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {userAds.map((ad) => (
                    <Link
                      key={ad.id}
                      to={`/ad/${ad.id}`}
                      className="group border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-square bg-muted overflow-hidden">
                        {ad.image_url ? (
                          <img
                            src={ad.image_url}
                            alt={ad.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{ad.title}</p>
                        <p className="text-xs text-primary font-semibold mt-0.5">
                          {ad.price_type === 'free'
                            ? 'Free'
                            : ad.price
                            ? `৳${new Intl.NumberFormat('en-BD').format(ad.price)}`
                            : 'Contact'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviews */}
          <ProfileReviews userId={userId!} />
        </div>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
