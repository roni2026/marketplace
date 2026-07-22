import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
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
} from 'lucide-react';

type ProfileBits = {
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
};

const sections: {
  title: string;
  items: {
    to: string;
    label: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
  }[];
}[] = [
  {
    title: 'Shopping',
    items: [
      { to: '/favorites', label: 'Favorites', description: 'Ads you saved for later', icon: Heart },
      { to: '/recently-viewed', label: 'Recently viewed', description: 'Pick up where you left off', icon: Eye },
      { to: '/compare', label: 'Compare', description: 'Side-by-side listing comparison', icon: GitCompare },
      { to: '/price-alerts', label: 'Price alerts', description: 'Get notified when prices drop', icon: Tag },
      { to: '/saved-searches', label: 'Saved searches', description: 'Alerts for searches you care about', icon: Bookmark },
      { to: '/my/offers', label: 'My offers', description: 'Offers you’ve sent and received', icon: Tag },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/profile', label: 'Profile & settings', description: 'Name, photo, bio, preferences', icon: User },
      { to: '/my/addresses', label: 'Addresses', description: 'Delivery and meetup locations', icon: MapPin },
      { to: '/notifications', label: 'Notifications', description: 'Messages, ads, and account alerts', icon: Bell },
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
      { to: '/my-ads', label: 'My ads', description: 'All your listings in one place', icon: Package },
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
      { to: '/messages', label: 'Messages', description: 'Chats with buyers and sellers', icon: MessageCircle },
      { to: '/my/support', label: 'Customer support', description: 'Tickets and help requests', icon: LifeBuoy },
      { to: '/help', label: 'Help center', description: 'FAQs and how-tos', icon: LifeBuoy },
      { to: '/safety', label: 'Safety tips', description: 'Trade smarter and safer', icon: Shield },
    ],
  },
];

export default function CustomerPortal() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileBits | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, is_verified')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled && data) setProfile(data as ProfileBits);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayName =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'There';
  const initials = displayName
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>My account — BazarBD</title>
        <meta name="description" content="Manage your BazarBD account, orders, ads, and preferences." />
      </Helmet>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-10 pb-24 lg:pb-10 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border">
              <AvatarImage src={profile?.avatar_url || undefined} alt="" />
              <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-tight">Hi, {displayName}</h1>
                {profile?.is_verified && (
                  <Badge variant="secondary" className="font-normal">
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your account hub — ads, messages, billing, and settings.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/profile">Edit profile</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/post-ad">Post ad</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { to: '/messages', label: 'Messages', icon: MessageCircle },
            { to: '/my-ads', label: 'My ads', icon: Package },
            { to: '/favorites', label: 'Favorites', icon: Heart },
            { to: '/my/support', label: 'Support', icon: LifeBuoy },
          ].map((item) => (
            <Link key={item.to} to={item.to}>
              <Card className="h-full shadow-none hover:bg-muted/40 transition-colors">
                <CardContent className="flex flex-col items-start gap-2 p-4">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {section.title}
              </h2>
              <div className="rounded-xl border divide-y bg-card overflow-hidden">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <item.icon className="h-4 w-4 text-foreground/80" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-xs text-muted-foreground truncate">
                        {item.description}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
