import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ComponentType } from 'react';
import {
  User,
  Heart,
  MessageCircle,
  Bell,
  Package,
  MapPin,
  Tag,
  LifeBuoy,
  Settings2,
  Eye,
  GitCompare,
  Bookmark,
  Shield,
  CreditCard,
  Store,
  ChevronRight,
  Clock,
  Ban,
  EyeOff,
  Activity,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

type ProfileBits = {
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  phone_number: string | null;
};

type HubStats = {
  unreadMessages: number;
  unreadNotifications: number;
  pendingOffersReceived: number;
  pendingOffersSent: number;
  activeAds: number;
  pendingAds: number;
  draftAds: number;
  openTickets: number;
  favorites: number;
  priceAlerts: number;
  membershipTier: string | null;
  membershipStatus: string | null;
};

const emptyStats: HubStats = {
  unreadMessages: 0,
  unreadNotifications: 0,
  pendingOffersReceived: 0,
  pendingOffersSent: 0,
  activeAds: 0,
  pendingAds: 0,
  draftAds: 0,
  openTickets: 0,
  favorites: 0,
  priceAlerts: 0,
  membershipTier: null,
  membershipStatus: null,
};

type NavItem = {
  to: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  badgeKey?: keyof HubStats;
  badgeTone?: 'default' | 'warn' | 'muted';
};

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Shopping',
    items: [
      { to: '/favorites', label: 'Favorites', description: 'Ads you saved for later', icon: Heart, badgeKey: 'favorites', badgeTone: 'muted' },
      { to: '/recently-viewed', label: 'Recently viewed', description: 'Pick up where you left off', icon: Eye },
      { to: '/compare', label: 'Compare', description: 'Side-by-side listing comparison', icon: GitCompare },
      { to: '/price-alerts', label: 'Price alerts', description: 'Get notified when prices drop', icon: Tag, badgeKey: 'priceAlerts', badgeTone: 'muted' },
      { to: '/saved-searches', label: 'Saved searches', description: 'Alerts for searches you care about', icon: Bookmark },
      {
        to: '/my/offers',
        label: 'My offers',
        description: 'Offers you’ve sent and received',
        icon: Tag,
        badgeKey: 'pendingOffersReceived',
        badgeTone: 'warn',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/profile', label: 'Profile & settings', description: 'Name, photo, bio, preferences', icon: User },
      { to: '/my/addresses', label: 'Addresses', description: 'Delivery and meetup locations', icon: MapPin },
      {
        to: '/notifications',
        label: 'Notifications',
        description: 'Messages, ads, and account alerts',
        icon: Bell,
        badgeKey: 'unreadNotifications',
        badgeTone: 'default',
      },
      { to: '/notification-preferences', label: 'Notification preferences', description: 'Choose what you hear about', icon: Settings2 },
      { to: '/preferences', label: 'Browse preferences', description: 'Language, categories, feed', icon: Settings2 },
      { to: '/activity', label: 'Account activity', description: 'Recent actions on your account', icon: Activity },
      { to: '/blocked-sellers', label: 'Blocked sellers', description: 'People you don’t want to hear from', icon: Ban },
      { to: '/hidden-listings', label: 'Hidden listings', description: 'Ads you’ve hidden from results', icon: EyeOff },
    ],
  },
  {
    title: 'Selling',
    items: [
      {
        to: '/my-ads',
        label: 'My ads',
        description: 'All your listings in one place',
        icon: Package,
        badgeKey: 'pendingAds',
        badgeTone: 'warn',
      },
      { to: '/seller-portal', label: 'Seller portal', description: 'Orders, payouts, performance', icon: Store },
      { to: '/seller-dashboard', label: 'Seller analytics', description: 'Views, inquiries, revenue trends', icon: Activity },
      { to: '/post-ad', label: 'Post an ad', description: 'List something new in a few minutes', icon: Package },
      { to: '/shop-dashboard', label: 'Shop dashboard', description: 'If you run a shop brand', icon: Store },
    ],
  },
  {
    title: 'Billing & help',
    items: [
      { to: '/membership-plans', label: 'Membership plans', description: 'Upgrade limits and perks', icon: CreditCard },
      { to: '/membership-benefits', label: 'Membership benefits', description: 'What each plan includes', icon: CreditCard },
      { to: '/billing', label: 'Billing history', description: 'Invoices and past payments', icon: Clock },
      {
        to: '/messages',
        label: 'Messages',
        description: 'Chats with buyers and sellers',
        icon: MessageCircle,
        badgeKey: 'unreadMessages',
        badgeTone: 'default',
      },
      {
        to: '/my/support',
        label: 'Customer support',
        description: 'Tickets and help requests',
        icon: LifeBuoy,
        badgeKey: 'openTickets',
        badgeTone: 'warn',
      },
      { to: '/help', label: 'Help center', description: 'FAQs and how-tos', icon: LifeBuoy },
      { to: '/safety', label: 'Safety tips', description: 'Trade smarter and safer', icon: Shield },
    ],
  },
];

function countOrZero(error: { message?: string } | null, count: number | null) {
  // Missing table / RLS — fail soft so the hub still loads
  if (error) return 0;
  return count ?? 0;
}

export default function CustomerPortal() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileBits | null>(null);
  const [stats, setStats] = useState<HubStats>(emptyStats);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHub = useCallback(async () => {
    if (!user) return;

    const uid = user.id;

    const profileReq = supabase
      .from('profiles')
      .select('full_name, avatar_url, is_verified, phone_number')
      .eq('user_id', uid)
      .maybeSingle();

    const unreadMessagesReq = supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', uid)
      .eq('is_read', false);

    const unreadNotificationsReq = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('is_read', false);

    const offersReceivedReq = supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', uid)
      .eq('status', 'pending');

    const offersSentReq = supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', uid)
      .eq('status', 'pending');

    const activeAdsReq = supabase
      .from('ads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .in('status', ['approved', 'boosted', 'premium']);

    const pendingAdsReq = supabase
      .from('ads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('status', 'pending');

    const draftAdsReq = supabase
      .from('ads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('status', 'draft');

    const openTicketsReq = supabase
      .from('customer_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .in('status', ['open', 'pending', 'in_progress', 'waiting_on_user']);

    const favoritesReq = supabase
      .from('favorites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid);

    const priceAlertsReq = supabase
      .from('price_drop_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid);

    const shopReq = supabase
      .from('shops')
      .select('id, membership_tier')
      .eq('owner_id', uid)
      .maybeSingle();

    const membershipByUserReq = supabase
      .from('shop_memberships')
      .select('tier, is_active, shop_id')
      .eq('user_id', uid)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const [
      profileRes,
      msgRes,
      notifRes,
      offerInRes,
      offerOutRes,
      activeAdsRes,
      pendingAdsRes,
      draftAdsRes,
      ticketsRes,
      favRes,
      alertsRes,
      shopRes,
      membershipRes,
    ] = await Promise.all([
      profileReq,
      unreadMessagesReq,
      unreadNotificationsReq,
      offersReceivedReq,
      offersSentReq,
      activeAdsReq,
      pendingAdsReq,
      draftAdsReq,
      openTicketsReq,
      favoritesReq,
      priceAlertsReq,
      shopReq,
      membershipByUserReq,
    ]);

    if (profileRes.data) setProfile(profileRes.data as ProfileBits);

    let membershipTier: string | null = null;
    let membershipStatus: string | null = null;

    const shop = shopRes.data as { id: string; membership_tier?: string | null } | null;
    // App code sometimes stores tier on shops even if base schema is lean
    if (shop?.membership_tier && shop.membership_tier !== 'free') {
      membershipTier = shop.membership_tier;
      membershipStatus = 'active';
    }

    const membership = membershipRes.data as { tier?: string; is_active?: boolean } | null;
    if (membership?.is_active && membership.tier) {
      membershipTier = membership.tier;
      membershipStatus = 'active';
    } else if (shop?.id) {
      const { data: m } = await supabase
        .from('shop_memberships')
        .select('tier, is_active')
        .eq('shop_id', shop.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (m && (m as { is_active?: boolean }).is_active) {
        membershipTier = (m as { tier?: string }).tier || membershipTier;
        membershipStatus = 'active';
      }
    }

    setStats({
      unreadMessages: countOrZero(msgRes.error, msgRes.count),
      unreadNotifications: countOrZero(notifRes.error, notifRes.count),
      pendingOffersReceived: countOrZero(offerInRes.error, offerInRes.count),
      pendingOffersSent: countOrZero(offerOutRes.error, offerOutRes.count),
      activeAds: countOrZero(activeAdsRes.error, activeAdsRes.count),
      pendingAds: countOrZero(pendingAdsRes.error, pendingAdsRes.count),
      draftAds: countOrZero(draftAdsRes.error, draftAdsRes.count),
      openTickets: countOrZero(ticketsRes.error, ticketsRes.count),
      favorites: countOrZero(favRes.error, favRes.count),
      priceAlerts: countOrZero(alertsRes.error, alertsRes.count),
      membershipTier,
      membershipStatus,
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoadingStats(true);
      try {
        await loadHub();
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loadHub]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadHub();
    } finally {
      setRefreshing(false);
    }
  };

  const displayName =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'there';
  const initials = displayName
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const attention = useMemo(() => {
    const items: { to: string; label: string; detail: string; tone: 'default' | 'warn' }[] = [];
    if (stats.unreadMessages > 0) {
      items.push({
        to: '/messages',
        label: 'Unread messages',
        detail: `${stats.unreadMessages} waiting`,
        tone: 'default',
      });
    }
    if (stats.pendingOffersReceived > 0) {
      items.push({
        to: '/my/offers',
        label: 'Offers to review',
        detail: `${stats.pendingOffersReceived} pending`,
        tone: 'warn',
      });
    }
    if (stats.pendingAds > 0) {
      items.push({
        to: '/my-ads',
        label: 'Ads in review',
        detail: `${stats.pendingAds} pending`,
        tone: 'warn',
      });
    }
    if (stats.openTickets > 0) {
      items.push({
        to: '/my/support',
        label: 'Open support tickets',
        detail: `${stats.openTickets} open`,
        tone: 'warn',
      });
    }
    if (stats.unreadNotifications > 0) {
      items.push({
        to: '/notifications',
        label: 'Notifications',
        detail: `${stats.unreadNotifications} unread`,
        tone: 'default',
      });
    }
    if (!profile?.is_verified) {
      items.push({
        to: '/profile',
        label: 'Finish verification',
        detail: 'Verified sellers get more trust',
        tone: 'default',
      });
    }
    if (!profile?.phone_number) {
      items.push({
        to: '/profile',
        label: 'Add a phone number',
        detail: 'Buyers reach you faster',
        tone: 'default',
      });
    }
    return items;
  }, [stats, profile]);

  const formatBadge = (key?: keyof HubStats) => {
    if (!key) return null;
    const val = stats[key];
    if (typeof val !== 'number' || val <= 0) return null;
    return val > 99 ? '99+' : String(val);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>My account — BazarBD</title>
        <meta name="description" content="Manage your BazarBD account, orders, ads, and preferences." />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-10 pb-24 lg:pb-10 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border">
              <AvatarImage src={profile?.avatar_url || undefined} alt="" />
              <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-tight">Hi, {displayName}</h1>
                {profile?.is_verified ? (
                  <Badge variant="secondary" className="font-normal gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    Unverified
                  </Badge>
                )}
                {stats.membershipTier && (
                  <Badge className="font-normal capitalize">{stats.membershipTier} plan</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your account hub — what’s waiting, and where to go next.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={refreshing || loadingStats}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/profile">Edit profile</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/post-ad">Post ad</Link>
            </Button>
          </div>
        </div>

        {/* Snapshot strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { to: '/messages', label: 'Messages', value: stats.unreadMessages, hint: 'unread', icon: MessageCircle },
            { to: '/my/offers', label: 'Offers in', value: stats.pendingOffersReceived, hint: 'to review', icon: Tag },
            { to: '/my-ads', label: 'Live ads', value: stats.activeAds, hint: 'active', icon: Package },
            { to: '/my-ads', label: 'In review', value: stats.pendingAds, hint: 'pending', icon: Clock },
            { to: '/my/support', label: 'Tickets', value: stats.openTickets, hint: 'open', icon: LifeBuoy },
            { to: '/favorites', label: 'Saved', value: stats.favorites, hint: 'favorites', icon: Heart },
          ].map((card) => (
            <Link key={card.label} to={card.to}>
              <Card className="h-full shadow-none hover:bg-muted/40 transition-colors">
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <card.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {loadingStats ? (
                      <Skeleton className="h-5 w-8" />
                    ) : (
                      <span className="text-lg font-semibold tabular-nums">{card.value}</span>
                    )}
                  </div>
                  <p className="text-xs font-medium leading-tight">{card.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{card.hint}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Needs attention */}
        {!loadingStats && attention.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold">Needs your attention</h2>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] divide-y divide-amber-500/15 overflow-hidden">
              {attention.map((item) => (
                <Link
                  key={item.label + item.to}
                  to={item.to}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-amber-500/10 transition-colors"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.detail}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loadingStats && attention.length === 0 && (
          <Card className="mb-8 shadow-none border-dashed">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">You’re all caught up</p>
                <p className="text-xs text-muted-foreground">No pending offers, tickets, or unread messages.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { to: '/messages', label: 'Messages', icon: MessageCircle, badge: stats.unreadMessages },
            { to: '/my-ads', label: 'My ads', icon: Package, badge: stats.pendingAds },
            { to: '/favorites', label: 'Favorites', icon: Heart, badge: stats.favorites },
            { to: '/my/support', label: 'Support', icon: LifeBuoy, badge: stats.openTickets },
          ].map((item) => (
            <Link key={item.to} to={item.to}>
              <Card className="h-full shadow-none hover:bg-muted/40 transition-colors">
                <CardContent className="flex items-center gap-2 p-4">
                  <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 justify-center tabular-nums">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Full directory */}
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {section.title}
              </h2>
              <div className="rounded-xl border divide-y bg-card overflow-hidden">
                {section.items.map((item) => {
                  const badge = formatBadge(item.badgeKey);
                  return (
                    <Link
                      key={item.to + item.label}
                      to={item.to}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <item.icon className="h-4 w-4 text-foreground/80" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{item.label}</span>
                        <span className="block text-xs text-muted-foreground truncate">{item.description}</span>
                      </span>
                      {badge && (
                        <Badge
                          variant={item.badgeTone === 'warn' ? 'destructive' : 'secondary'}
                          className="h-5 min-w-5 px-1.5 justify-center tabular-nums font-normal"
                        >
                          {badge}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Selling snapshot footer */}
        {(stats.activeAds > 0 || stats.draftAds > 0 || stats.pendingOffersSent > 0) && (
          <Card className="mt-8 shadow-none">
            <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Selling snapshot · </span>
                {stats.activeAds} live
                {stats.draftAds > 0 && ` · ${stats.draftAds} drafts`}
                {stats.pendingOffersSent > 0 && ` · ${stats.pendingOffersSent} offers you sent still open`}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/seller-portal">Open seller portal</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
