import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Loader2, Upload, User, BadgeCheck, Shield, Monitor, Trash2, AlertTriangle,
  Camera, Globe, Facebook, Twitter, Instagram, Linkedin, Youtube, MessageCircle, Send,
  Eye, Star, ShoppingBag, Store, Users, MessageSquare, Clock, Activity,
} from 'lucide-react';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { logAudit } from '@/lib/audit';
import { useTranslation } from 'react-i18next';
import { VerificationBadges } from '@/components/profile/VerificationBadges';
import { TrustScoreBadge } from '@/components/profile/TrustScoreBadge';
import { getBadges, formatResponseTime, formatLastActive, formatMemberSince } from '@/lib/profiles';
import type { VerificationBadge, SocialLinks as SocialLinksType } from '@/integrations/supabase/types_v2_profiles';

interface ProfileForm {
  full_name: string;
  phone_number: string;
  division: string;
  district: string;
  area: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string;
  website: string;
  social_links: SocialLinksType;
  preferred_language: string;
  preferred_currency: string;
  is_public: boolean;
  is_verified: boolean;
}

interface Session {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean | null;
  last_activity_at: string;
  created_at: string;
}

interface ProfileStatsData {
  seller_rating: number;
  buyer_rating: number;
  total_sales: number;
  total_purchases: number;
  total_followers: number;
  total_following: number;
  total_seller_reviews: number;
  total_buyer_reviews: number;
  trust_score: number;
  response_rate: number;
  avg_response_time_hours: number;
  profile_views_30d: number;
}

const CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP', 'INR', 'PKR', 'SAR', 'AED'];
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'বাংলা (Bangla)' },
];

const SOCIAL_PLATFORMS = [
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'twitter', label: 'Twitter / X', icon: Twitter },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { key: 'youtube', label: 'YouTube', icon: Youtube },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'telegram', label: 'Telegram', icon: Send },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, profileCompletion, refreshProfile } = useAuth();
  const { profile: extendedProfile, stats, updateProfile, uploadProfileBanner, refreshStats } = useProfile();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'about' | 'social' | 'preferences' | 'stats'>('profile');
  const [profile, setProfile] = useState<ProfileForm>({
    full_name: '',
    phone_number: '',
    division: '',
    district: '',
    area: '',
    avatar_url: null,
    banner_url: null,
    bio: '',
    website: '',
    social_links: {},
    preferred_language: 'en',
    preferred_currency: 'BDT',
    is_public: true,
    is_verified: false,
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [badges, setBadges] = useState<VerificationBadge[]>([]);
  const [profileStats, setProfileStats] = useState<ProfileStatsData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSessions();
      fetchBadges();
    }
  }, [user]);

  useEffect(() => {
    if (stats) {
      setProfileStats({
        seller_rating: stats.seller_rating,
        buyer_rating: stats.buyer_rating,
        total_sales: stats.total_sales,
        total_purchases: stats.total_purchases,
        total_followers: stats.total_followers,
        total_following: stats.total_following,
        total_seller_reviews: stats.total_seller_reviews,
        total_buyer_reviews: stats.total_buyer_reviews,
        trust_score: stats.trust_score,
        response_rate: stats.response_rate,
        avg_response_time_hours: stats.avg_response_time_hours,
        profile_views_30d: stats.profile_views_30d,
      });
    }
  }, [stats]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setProfile({
        full_name: data.full_name || '',
        phone_number: data.phone_number || '',
        division: data.division || '',
        district: data.district || '',
        area: data.area || '',
        avatar_url: data.avatar_url,
        banner_url: data.banner_url,
        bio: data.bio || '',
        website: data.website || '',
        social_links: data.social_links || {},
        preferred_language: data.preferred_language || 'en',
        preferred_currency: data.preferred_currency || 'BDT',
        is_public: data.is_public ?? true,
        is_verified: data.is_verified,
      });
    }
    setIsLoading(false);
  };

  const fetchSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setSessions((data as Session[]) || []);
  };

  const fetchBadges = async () => {
    if (!user) return;
    const { data } = await getBadges(user.id);
    setBadges(data);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const fileName = `${user.id}/${Date.now()}-avatar`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
      toast.success(t('toast.avatarUploaded'));
    } catch (error) {
      toast.error(t('toast.avatarUploadFailed'));
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const { url, error } = await uploadProfileBanner(file);
    if (error) {
      toast.error(t('profile.bannerUploadFailed'));
    } else if (url) {
      setProfile(prev => ({ ...prev, banner_url: url }));
      toast.success(t('profile.bannerUploaded'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        division: profile.division,
        district: profile.district,
        area: profile.area,
        avatar_url: profile.avatar_url,
        banner_url: profile.banner_url,
        bio: profile.bio,
        website: profile.website,
        social_links: profile.social_links,
        preferred_language: profile.preferred_language,
        preferred_currency: profile.preferred_currency,
        is_public: profile.is_public,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    setIsSaving(false);

    if (error) {
      toast.error(t('toast.profileUpdateFailed'));
    } else {
      toast.success(t('toast.profileUpdated'));
      refreshProfile();
      refreshStats();
    }
  };

  const handleSocialLinkChange = (key: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      social_links: { ...prev.social_links, [key]: value },
    }));
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error(t('toast.accountDeleteFailed'));
    } else {
      await logAudit({ action: 'delete', resourceType: 'user', resourceId: user.id });
      toast.success(t('toast.accountDeleted'));
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);
    fetchSessions();
    toast.success(t('toast.sessionRevoked'));
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* Customer portal shortcuts */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3 flex flex-wrap gap-2 text-sm">
          <a className="underline-offset-4 hover:underline" href="/my/addresses">Addresses</a>
          <span className="text-muted-foreground">·</span>
          <a className="underline-offset-4 hover:underline" href="/my/offers">Offers</a>
          <span className="text-muted-foreground">·</span>
          <a className="underline-offset-4 hover:underline" href="/my/support">Support</a>
          <span className="text-muted-foreground">·</span>
          <a className="underline-offset-4 hover:underline" href="/favorites">Favorites</a>
          <span className="text-muted-foreground">·</span>
          <a className="underline-offset-4 hover:underline" href="/saved-searches">Saved searches</a>
          <span className="text-muted-foreground">·</span>
          <a className="underline-offset-4 hover:underline" href="/compare">Compare</a>
          <span className="text-muted-foreground">·</span>
          <a className="underline-offset-4 hover:underline" href="/messages">Messages</a>
        </div>
      </div>
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Completion */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{t('profile.profileCompletion')}</h3>
                <span className="text-2xl font-bold text-primary">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {profileCompletion < 100
                  ? t('profile.completeProfile')
                  : t('profile.profileComplete')}
              </p>
            </CardContent>
          </Card>

          {/* Verification Status + Badges */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {profile.is_verified ? (
                    <BadgeCheck className="h-8 w-8 text-primary" />
                  ) : (
                    <Shield className="h-8 w-8 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {profile.is_verified ? t('profile.verifiedAccount') : t('profile.notVerified')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profile.is_verified
                        ? t('profile.verifiedDesc')
                        : t('profile.notVerifiedDesc')}
                    </p>
                  </div>
                </div>
                {!profile.is_verified && (
                  <Badge variant="secondary">{t('profile.pending')}</Badge>
                )}
              </div>
              {badges.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">{t('profile.badges')}</p>
                  <VerificationBadges badges={badges} size="sm" />
                </div>
              )}
              {profileStats && (
                <div className="pt-2 border-t border-border">
                  <TrustScoreBadge score={profileStats.trust_score} size="md" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Form with Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.myProfile')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="w-full flex-wrap h-auto">
                  <TabsTrigger value="profile">{t('profile.tabProfile')}</TabsTrigger>
                  <TabsTrigger value="about">{t('profile.tabAbout')}</TabsTrigger>
                  <TabsTrigger value="social">{t('profile.tabSocial')}</TabsTrigger>
                  <TabsTrigger value="preferences">{t('profile.tabPreferences')}</TabsTrigger>
                  <TabsTrigger value="stats">{t('profile.tabStats')}</TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                  {/* Tab: Profile (existing fields preserved) */}
                  <TabsContent value="profile" className="space-y-6 mt-0">
                    {/* Banner */}
                    <div className="relative h-28 sm:h-36 rounded-lg overflow-hidden bg-gradient-to-r from-primary/20 to-primary/5">
                      {profile.banner_url && (
                        <img src={profile.banner_url} alt="Banner" className="h-full w-full object-cover" />
                      )}
                      <label className="absolute bottom-2 right-2 cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                        <div className="flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-sm px-2.5 py-1 text-white text-xs font-medium hover:bg-black/70 transition-colors">
                          <Camera className="h-3.5 w-3.5" />
                          {t('profile.editBanner')}
                        </div>
                      </label>
                    </div>

                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-8 w-8" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Label htmlFor="avatar" className="cursor-pointer">
                          <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <Upload className="h-4 w-4" />
                            {t('profile.uploadPhoto')}
                          </div>
                        </Label>
                        <input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB</p>
                      </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('profile.fullName')}</Label>
                      <Input
                        id="name"
                        value={profile.full_name || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder={t('profile.namePlaceholder')}
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('profile.phoneNumber')}</Label>
                      <Input
                        id="phone"
                        value={profile.phone_number || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                        placeholder={t('profile.phonePlaceholder')}
                      />
                    </div>

                    {/* Location */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('profile.division')}</Label>
                        <Select
                          value={profile.division || ''}
                          onValueChange={(v) => setProfile(prev => ({ ...prev, division: v, district: '' }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('profile.selectDivision')} />
                          </SelectTrigger>
                          <SelectContent>
                            {DIVISIONS.map((div) => (
                              <SelectItem key={div} value={div}>{div}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('profile.district')}</Label>
                        <Select
                          value={profile.district || ''}
                          onValueChange={(v) => setProfile(prev => ({ ...prev, district: v }))}
                          disabled={!profile.division}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('profile.selectDistrict')} />
                          </SelectTrigger>
                          <SelectContent>
                            {(DISTRICTS[profile.division || ''] || []).map((dist) => (
                              <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="area">{t('profile.area')}</Label>
                      <Input
                        id="area"
                        value={profile.area || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, area: e.target.value }))}
                        placeholder={t('profile.areaPlaceholder')}
                      />
                    </div>

                    {/* Public profile toggle */}
                    <div className="flex items-center justify-between gap-4 py-2">
                      <div>
                        <Label htmlFor="public">{t('profile.publicProfile')}</Label>
                        <p className="text-xs text-muted-foreground">{t('profile.publicProfileDesc')}</p>
                      </div>
                      <Switch
                        id="public"
                        checked={profile.is_public}
                        onCheckedChange={(checked) => setProfile(prev => ({ ...prev, is_public: checked }))}
                      />
                    </div>
                  </TabsContent>

                  {/* Tab: About (bio, website) */}
                  <TabsContent value="about" className="space-y-6 mt-0">
                    <div className="space-y-2">
                      <Label htmlFor="bio">{t('profile.bio')}</Label>
                      <Textarea
                        id="bio"
                        value={profile.bio}
                        onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder={t('profile.bioPlaceholder')}
                        rows={5}
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground text-right">{profile.bio.length}/500</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">{t('profile.website')}</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website"
                          type="url"
                          value={profile.website}
                          onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://example.com"
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab: Social Links */}
                  <TabsContent value="social" className="space-y-4 mt-0">
                    {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon }) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={`social-${key}`} className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </Label>
                        <Input
                          id={`social-${key}`}
                          value={(profile.social_links as Record<string, string>)[key] || ''}
                          onChange={(e) => handleSocialLinkChange(key, e.target.value)}
                          placeholder={
                            key === 'whatsapp' ? '+8801XXXXXXXXX' :
                            key === 'telegram' ? '@username' :
                            'https://...'
                          }
                        />
                      </div>
                    ))}
                  </TabsContent>

                  {/* Tab: Preferences */}
                  <TabsContent value="preferences" className="space-y-6 mt-0">
                    <div className="space-y-2">
                      <Label>{t('profile.preferredLanguage')}</Label>
                      <Select
                        value={profile.preferred_language}
                        onValueChange={(v) => setProfile(prev => ({ ...prev, preferred_language: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('profile.preferredCurrency')}</Label>
                      <Select
                        value={profile.preferred_currency}
                        onValueChange={(v) => setProfile(prev => ({ ...prev, preferred_currency: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((cur) => (
                            <SelectItem key={cur} value={cur}>{cur}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  {/* Tab: Stats (read-only reputation metrics) */}
                  <TabsContent value="stats" className="space-y-4 mt-0">
                    {profileStats ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <StatBox icon={Star} label={t('profile.sellerRating')} value={profileStats.seller_rating > 0 ? profileStats.seller_rating.toFixed(1) : 'N/A'} color="text-amber-500" />
                          <StatBox icon={ShoppingBag} label={t('profile.buyerRating')} value={profileStats.buyer_rating > 0 ? profileStats.buyer_rating.toFixed(1) : 'N/A'} color="text-blue-500" />
                          <StatBox icon={Store} label={t('profile.totalSales')} value={profileStats.total_sales} color="text-green-500" />
                          <StatBox icon={ShoppingBag} label={t('profile.totalPurchases')} value={profileStats.total_purchases} color="text-purple-500" />
                          <StatBox icon={Users} label={t('profile.followers')} value={profileStats.total_followers} color="text-indigo-500" />
                          <StatBox icon={Users} label={t('profile.following')} value={profileStats.total_following} color="text-cyan-500" />
                          <StatBox icon={MessageSquare} label={t('profile.sellerReviews')} value={profileStats.total_seller_reviews} color="text-orange-500" />
                          <StatBox icon={MessageSquare} label={t('profile.buyerReviews')} value={profileStats.total_buyer_reviews} color="text-rose-500" />
                          <StatBox icon={Activity} label={t('profile.responseRate')} value={profileStats.response_rate > 0 ? `${Math.round(profileStats.response_rate)}%` : 'N/A'} color="text-pink-500" />
                          <StatBox icon={Clock} label={t('profile.avgResponseTime')} value={formatResponseTime(profileStats.avg_response_time_hours)} color="text-teal-500" />
                          <StatBox icon={Eye} label={t('profile.profileViews30d')} value={profileStats.profile_views_30d} color="text-sky-500" />
                          <StatBox icon={Shield} label={t('profile.trustScore')} value={`${Math.round(profileStats.trust_score)}/100`} color="text-emerald-500" />
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => refreshStats()} className="w-full">
                          {t('profile.refreshStats')}
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">{t('profile.noStats')}</p>
                    )}
                  </TabsContent>

                  {/* Save button (always visible) */}
                  {activeTab !== 'stats' && (
                    <Button type="submit" className="w-full" disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {t('profile.saveChanges')}
                    </Button>
                  )}
                </form>
              </Tabs>
            </CardContent>
          </Card>

          {/* Device Management / Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="h-5 w-5" />
                {t('profile.activeSessions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('profile.noSessions')}</p>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.user_agent || t('profile.unknownDevice')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.ip_address || t('profile.unknownIP')} · {t('profile.active')} {formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}
                      </p>
                    </div>
                    {session.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0"
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t('profile.dangerZone')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">{t('profile.deleteAccount')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('profile.deleteAccountDesc')}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/50">
                      {t('profile.delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('profile.deleteAccountConfirm')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('profile.deleteAccountWarning')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('profile.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground">
                        {t('profile.deleteAccountButton')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) {
  return (
    <div className="border border-border rounded-lg p-3 flex flex-col items-center text-center gap-1">
      <Icon className={`h-5 w-5 ${color}`} />
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
