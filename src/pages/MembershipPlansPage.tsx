/**
 * MembershipPlansPage — Dedicated page showing all membership tiers with
 * feature comparison, pricing, and upgrade flow.
 *
 * Tiers: Free, Basic, Professional, Business, Enterprise
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Link, Navigate } from 'react-router-dom';
import {
  Check, X, Crown, Zap, Building2, Rocket, Sparkles, TrendingUp,
  Star, Shield, BarChart3, Users, Tag, Eye, MessageSquare, Package,
  CreditCard, Calendar, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MembershipTier {
  id: string;
  name: string;
  price: number;
  billing_cycle: string;
  description: string;
  features: string[];
  limits: {
    max_listings: number;
    max_featured: number;
    max_boosted: number;
    commission_rate: number;
    analytics_access: string;
    priority_support: boolean;
    verified_badge: boolean;
    custom_shop: boolean;
    bulk_upload: boolean;
    api_access: boolean;
  };
  is_popular?: boolean;
}

const TIERS: MembershipTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    billing_cycle: 'forever',
    description: 'Perfect for casual sellers just getting started',
    features: [
      'Up to 5 active listings',
      'Basic listing analytics',
      'Standard search placement',
      'Community support',
    ],
    limits: {
      max_listings: 5, max_featured: 0, max_boosted: 0, commission_rate: 5,
      analytics_access: 'basic', priority_support: false, verified_badge: false,
      custom_shop: false, bulk_upload: false, api_access: false,
    },
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 299,
    billing_cycle: 'month',
    description: 'For regular sellers who want more visibility',
    features: [
      'Up to 25 active listings',
      '1 featured listing per month',
      '1 boosted listing per month',
      'Advanced analytics dashboard',
      'Lower commission (4%)',
      'Email support',
    ],
    limits: {
      max_listings: 25, max_featured: 1, max_boosted: 1, commission_rate: 4,
      analytics_access: 'advanced', priority_support: false, verified_badge: false,
      custom_shop: false, bulk_upload: false, api_access: false,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 799,
    billing_cycle: 'month',
    description: 'For power sellers and small shops',
    features: [
      'Up to 100 active listings',
      '5 featured listings per month',
      '3 boosted listings per month',
      'Full analytics + export',
      'Lower commission (3%)',
      'Verified seller badge',
      'Custom shop page',
      'Priority support',
      'Bulk listing upload (CSV)',
    ],
    limits: {
      max_listings: 100, max_featured: 5, max_boosted: 3, commission_rate: 3,
      analytics_access: 'full', priority_support: true, verified_badge: true,
      custom_shop: true, bulk_upload: true, api_access: false,
    },
    is_popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 1999,
    billing_cycle: 'month',
    description: 'For established businesses with high volume',
    features: [
      'Unlimited active listings',
      '20 featured listings per month',
      '10 boosted listings per month',
      'Full analytics + API access',
      'Lowest commission (2%)',
      'Verified business badge',
      'Custom shop + branding',
      'Dedicated account manager',
      'Bulk upload + API',
      'Staff accounts (up to 5)',
    ],
    limits: {
      max_listings: -1, max_featured: 20, max_boosted: 10, commission_rate: 2,
      analytics_access: 'full', priority_support: true, verified_badge: true,
      custom_shop: true, bulk_upload: true, api_access: true,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 4999,
    billing_cycle: 'month',
    description: 'For large-scale operations and marketplaces',
    features: [
      'Everything in Business',
      'Unlimited featured & boosted',
      'Zero commission',
      'White-label option',
      'Custom integrations',
      'Unlimited staff accounts',
      'SLA guarantee (99.9%)',
      'Dedicated infrastructure',
      'Custom analytics reports',
    ],
    limits: {
      max_listings: -1, max_featured: -1, max_boosted: -1, commission_rate: 0,
      analytics_access: 'full', priority_support: true, verified_badge: true,
      custom_shop: true, bulk_upload: true, api_access: true,
    },
  },
];

const TIER_ICONS: Record<string, any> = {
  free: Package, basic: Zap, professional: Rocket, business: Building2, enterprise: Crown,
};

const TIER_COLORS: Record<string, string> = {
  free: 'bg-gray-500/10 text-gray-500',
  basic: 'bg-blue-500/10 text-blue-500',
  professional: 'bg-purple-500/10 text-purple-500',
  business: 'bg-orange-500/10 text-orange-500',
  enterprise: 'bg-yellow-500/10 text-yellow-500',
};

export default function MembershipPlansPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeDialog, setUpgradeDialog] = useState<MembershipTier | null>(null);
  const [processing, setProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      if (shopData) {
        setShop(shopData);
        setCurrentTier(shopData.membership_tier || 'free');
      }

      const { data: membership } = await supabase
        .from('shop_memberships')
        .select('*')
        .eq('shop_id', shopData?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (membership) {
        setCurrentTier(membership.tier);
      }
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handleUpgrade = async (tier: MembershipTier) => {
    if (!user) { toast.error('Please login to upgrade'); return; }
    if (tier.id === currentTier) { toast.info('You are already on this plan'); return; }
    if (tier.price === 0) {
      // Downgrade to free
      try {
        setProcessing(true);
        await supabase.from('shop_memberships').insert({
          shop_id: shop?.id,
          tier: tier.id,
          status: 'active',
          started_at: new Date().toISOString(),
        });
        if (shop) {
          await supabase.from('shops').update({ membership_tier: tier.id }).eq('id', shop.id);
        }
        setCurrentTier(tier.id);
        toast.success(`Switched to ${tier.name} plan`);
        setUpgradeDialog(null);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to switch plan');
      }
      setProcessing(false);
      return;
    }
    setUpgradeDialog(tier);
  };

  const confirmUpgrade = async () => {
    if (!upgradeDialog || !user) return;
    setProcessing(true);
    try {
      // Create membership record
      await supabase.from('shop_memberships').insert({
        shop_id: shop?.id || null,
        tier: upgradeDialog.id,
        status: 'pending',
        billing_cycle: billingCycle,
        amount: billingCycle === 'yearly' ? upgradeDialog.price * 10 : upgradeDialog.price, // 2 months free yearly
        started_at: new Date().toISOString(),
      });

      // Update shop tier
      if (shop) {
        await supabase.from('shops').update({ membership_tier: upgradeDialog.id }).eq('id', shop.id);
      }

      toast.success(`${upgradeDialog.name} plan activated! Welcome aboard.`);
      setCurrentTier(upgradeDialog.id);
      setUpgradeDialog(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upgrade');
    }
    setProcessing(false);
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const yearlyPrice = (tier: MembershipTier) => tier.price > 0 ? tier.price * 10 : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" /> Membership Plans
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Unlock more listings, lower commissions, and advanced tools as you grow.
            Cancel or change anytime.
          </p>

          {/* Billing cycle toggle */}
          <div className="inline-flex items-center gap-2 mt-6 bg-muted rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', billingCycle === 'monthly' ? 'bg-card shadow-sm' : 'text-muted-foreground')}
            >Monthly</button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors gap-1 flex items-center', billingCycle === 'yearly' ? 'bg-card shadow-sm' : 'text-muted-foreground')}
            >
              Yearly <Badge className="bg-green-600 text-[10px] ml-1">2 months free</Badge>
            </button>
          </div>
        </div>

        {/* Current plan banner */}
        {loading ? (
          <Skeleton className="h-16 rounded-lg mb-6" />
        ) : currentTier !== 'free' && (
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', TIER_COLORS[currentTier])}>
                  {(() => { const Icon = TIER_ICONS[currentTier] || Package; return <Icon className="h-5 w-5" />; })()}
                </div>
                <div>
                  <p className="font-medium">Current Plan: <span className="capitalize">{currentTier}</span></p>
                  <p className="text-xs text-muted-foreground">You can upgrade or downgrade at any time</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild><Link to="/shop-settings">Manage</Link></Button>
            </CardContent>
          </Card>
        )}

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {TIERS.map(tier => {
            const Icon = TIER_ICONS[tier.id];
            const isCurrent = currentTier === tier.id;
            const price = billingCycle === 'yearly' ? yearlyPrice(tier) : tier.price;

            return (
              <Card
                key={tier.id}
                className={cn(
                  'relative flex flex-col',
                  tier.is_popular && 'border-primary shadow-lg scale-[1.02]',
                  isCurrent && 'ring-2 ring-primary'
                )}
              >
                {tier.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary gap-1"><Star className="h-3 w-3" /> Most Popular</Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-2">
                    <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Current</Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className={cn('h-12 w-12 rounded-xl mx-auto flex items-center justify-center mb-2', TIER_COLORS[tier.id])}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  <p className="text-xs text-muted-foreground h-8">{tier.description}</p>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  {/* Price */}
                  <div className="text-center mb-4">
                    {tier.price === 0 ? (
                      <p className="text-3xl font-bold">Free</p>
                    ) : (
                      <>
                        <p className="text-3xl font-bold">৳{price.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {billingCycle === 'yearly' ? 'per year' : 'per month'}
                        </p>
                      </>
                    )}
                  </div>

                  <Separator className="mb-3" />

                  {/* Features */}
                  <ul className="space-y-2 flex-1 mb-4">
                    {tier.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    onClick={() => handleUpgrade(tier)}
                    disabled={isCurrent}
                    variant={tier.is_popular ? 'default' : 'outline'}
                    className="w-full"
                  >
                    {isCurrent ? 'Current Plan' : tier.price === 0 ? 'Switch to Free' : `Upgrade to ${tier.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 font-medium">Feature</th>
                  {TIERS.map(t => (
                    <th key={t.id} className="text-center py-3 font-medium capitalize">{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Max Listings', key: 'max_listings', format: (v: number) => v === -1 ? 'Unlimited' : String(v) },
                  { label: 'Featured per Month', key: 'max_featured', format: (v: number) => v === -1 ? 'Unlimited' : String(v) },
                  { label: 'Boosted per Month', key: 'max_boosted', format: (v: number) => v === -1 ? 'Unlimited' : String(v) },
                  { label: 'Commission Rate', key: 'commission_rate', format: (v: number) => `${v}%` },
                  { label: 'Analytics', key: 'analytics_access', format: (v: string) => v.charAt(0).toUpperCase() + v.slice(1) },
                  { label: 'Verified Badge', key: 'verified_badge', format: (v: boolean) => v ? <Check className="h-4 w-4 text-green-500 inline" /> : <X className="h-4 w-4 text-muted-foreground inline" /> },
                  { label: 'Custom Shop', key: 'custom_shop', format: (v: boolean) => v ? <Check className="h-4 w-4 text-green-500 inline" /> : <X className="h-4 w-4 text-muted-foreground inline" /> },
                  { label: 'Bulk Upload', key: 'bulk_upload', format: (v: boolean) => v ? <Check className="h-4 w-4 text-green-500 inline" /> : <X className="h-4 w-4 text-muted-foreground inline" /> },
                  { label: 'API Access', key: 'api_access', format: (v: boolean) => v ? <Check className="h-4 w-4 text-green-500 inline" /> : <X className="h-4 w-4 text-muted-foreground inline" /> },
                  { label: 'Priority Support', key: 'priority_support', format: (v: boolean) => v ? <Check className="h-4 w-4 text-green-500 inline" /> : <X className="h-4 w-4 text-muted-foreground inline" /> },
                ].map(row => (
                  <tr key={row.key} className="border-b last:border-0">
                    <td className="py-3 font-medium">{row.label}</td>
                    {TIERS.map(t => (
                      <td key={t.id} className="text-center py-3">
                        {row.format((t.limits as any)[row.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* FAQ */}
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-bold text-center">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              { q: 'Can I change plans anytime?', a: 'Yes! You can upgrade, downgrade, or cancel at any time. Changes take effect immediately.' },
              { q: 'What happens to my listings if I downgrade?', a: 'Your excess listings will be marked as "paused" but not deleted. Upgrade again to reactivate them.' },
              { q: 'Do you offer refunds?', a: 'We offer a 7-day money-back guarantee on all paid plans. No questions asked.' },
              { q: 'Is there a setup fee?', a: 'No setup fees. You only pay the monthly or yearly subscription price.' },
              { q: 'Can I pay yearly?', a: 'Yes! Pay yearly and get 2 months free compared to monthly billing.' },
              { q: 'Do you offer custom enterprise plans?', a: 'Contact us at enterprise@bazarbd.com for custom pricing and features.' },
            ].map((faq, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="font-medium text-sm mb-1">{faq.q}</p>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <MobileNav />
      <Footer />

      {/* Upgrade confirmation dialog */}
      <Dialog open={!!upgradeDialog} onOpenChange={(v) => !v && setUpgradeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {upgradeDialog && (() => { const Icon = TIER_ICONS[upgradeDialog.id]; return <Icon className="h-5 w-5 text-primary" />; })()}
              Upgrade to {upgradeDialog?.name}
            </DialogTitle>
            <DialogDescription>
              {upgradeDialog?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{upgradeDialog?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Billing</span>
                <span className="font-medium capitalize">{billingCycle}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-primary">
                  ৳{(billingCycle === 'yearly' ? yearlyPrice(upgradeDialog!) : upgradeDialog?.price || 0).toLocaleString()}
                </span>
              </div>
              {billingCycle === 'yearly' && upgradeDialog && upgradeDialog.price > 0 && (
                <p className="text-xs text-green-600">You save ৳{(upgradeDialog.price * 2).toLocaleString()} with yearly billing!</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Payment will be processed securely
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialog(null)}>Cancel</Button>
            <Button onClick={confirmUpgrade} disabled={processing} className="gap-2">
              {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : 'Confirm Upgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
