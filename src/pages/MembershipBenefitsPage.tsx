/**
 * MembershipBenefitsPage — Detailed breakdown of what each tier includes,
 * with interactive feature explorer and ROI calculator.
 */
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import {
  Crown, Zap, Building2, Rocket, Package, TrendingUp, Calculator,
  Eye, Star, Shield, BarChart3, Users, Tag, MessageSquare, Headphones,
  Upload, Code, Store, Award, Clock, DollarSign,
} from 'lucide-react';

const BENEFIT_CATEGORIES = [
  {
    title: 'Listing Power',
    icon: Package,
    benefits: [
      { name: 'Active Listings', free: '5', basic: '25', pro: '100', business: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Featured Listings/mo', free: '0', basic: '1', pro: '5', business: '20', enterprise: 'Unlimited' },
      { name: 'Boosted Listings/mo', free: '0', basic: '1', pro: '3', business: '10', enterprise: 'Unlimited' },
      { name: 'Bulk Upload (CSV)', free: false, basic: false, pro: true, business: true, enterprise: true },
      { name: 'Scheduled Listings', free: false, basic: true, pro: true, business: true, enterprise: true },
      { name: 'Listing Templates', free: '3', basic: '10', pro: '50', business: 'Unlimited', enterprise: 'Unlimited' },
    ],
  },
  {
    title: 'Analytics & Insights',
    icon: BarChart3,
    benefits: [
      { name: 'View Count', free: true, basic: true, pro: true, business: true, enterprise: true },
      { name: 'Favorites Count', free: true, basic: true, pro: true, business: true, enterprise: true },
      { name: 'Conversion Rate', free: false, basic: true, pro: true, business: true, enterprise: true },
      { name: 'Revenue Analytics', free: false, basic: false, pro: true, business: true, enterprise: true },
      { name: 'Custom Reports', free: false, basic: false, pro: false, business: true, enterprise: true },
      { name: 'API Access', free: false, basic: false, pro: false, business: true, enterprise: true },
      { name: 'Data Export', free: false, basic: false, pro: true, business: true, enterprise: true },
    ],
  },
  {
    title: 'Shop & Branding',
    icon: Store,
    benefits: [
      { name: 'Custom Shop Page', free: false, basic: false, pro: true, business: true, enterprise: true },
      { name: 'Custom Logo & Banner', free: false, basic: false, pro: true, business: true, enterprise: true },
      { name: 'Shop Collections', free: false, basic: false, pro: true, business: true, enterprise: true },
      { name: 'Shop Announcements', free: false, basic: true, pro: true, business: true, enterprise: true },
      { name: 'White-label Option', free: false, basic: false, pro: false, business: false, enterprise: true },
      { name: 'Staff Accounts', free: '0', basic: '0', pro: '1', business: '5', enterprise: 'Unlimited' },
    ],
  },
  {
    title: 'Trust & Verification',
    icon: Shield,
    benefits: [
      { name: 'Verified Seller Badge', free: false, basic: false, pro: true, business: true, enterprise: true },
      { name: 'Business Verification', free: false, basic: false, pro: false, business: true, enterprise: true },
      { name: 'Priority Moderation', free: false, basic: false, pro: true, business: true, enterprise: true },
      { name: 'Fraud Protection', free: 'Basic', basic: 'Basic', pro: 'Advanced', business: 'Advanced', enterprise: 'Premium' },
    ],
  },
  {
    title: 'Support',
    icon: Headphones,
    benefits: [
      { name: 'Community Forum', free: true, basic: true, pro: true, business: true, enterprise: true },
      { name: 'Email Support', free: false, basic: true, pro: true, business: true, enterprise: true },
      { name: 'Priority Support', free: false, basic: false, pro: true, business: true, enterprise: true },
      { name: 'Dedicated Manager', free: false, basic: false, pro: false, business: true, enterprise: true },
      { name: 'SLA Guarantee', free: false, basic: false, pro: false, business: false, enterprise: '99.9%' },
      { name: 'Response Time', free: '72h', basic: '48h', pro: '24h', business: '4h', enterprise: '1h' },
    ],
  },
  {
    title: 'Commission & Fees',
    icon: DollarSign,
    benefits: [
      { name: 'Commission Rate', free: '5%', basic: '4%', pro: '3%', business: '2%', enterprise: '0%' },
      { name: 'Payment Processing', free: '3%', basic: '3%', pro: '2.5%', business: '2%', enterprise: '1.5%' },
      { name: 'Payout Frequency', free: 'Monthly', basic: 'Bi-weekly', pro: 'Weekly', business: 'Daily', enterprise: 'Instant' },
      { name: 'Min Payout', free: '৳1000', basic: '৳500', pro: '৳200', business: '৳100', enterprise: 'No min' },
    ],
  },
];

const fmtVal = (v: any) => {
  if (v === true) return <span className="text-green-600 font-medium">✓</span>;
  if (v === false) return <span className="text-muted-foreground">—</span>;
  return <span className="font-medium">{v}</span>;
};

export default function MembershipBenefitsPage() {
  const [monthlySales, setMonthlySales] = useState('50000');
  const [monthlyListings, setMonthlyListings] = useState('20');

  const sales = parseFloat(monthlySales) || 0;
  const listings = parseInt(monthlyListings) || 0;

  const calcSavings = (tierCommission: number, currentCommission: number) => {
    const currentFee = sales * (currentCommission / 100);
    const tierFee = sales * (tierCommission / 100);
    return Math.round(currentFee - tierFee);
  };

  const roiData = [
    { tier: 'Free', commission: 5, price: 0, color: 'text-gray-500' },
    { tier: 'Basic', commission: 4, price: 299, color: 'text-blue-500' },
    { tier: 'Professional', commission: 3, price: 799, color: 'text-purple-500' },
    { tier: 'Business', commission: 2, price: 1999, color: 'text-orange-500' },
    { tier: 'Enterprise', commission: 0, price: 4999, color: 'text-yellow-500' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Membership Benefits</h1>
          <p className="text-muted-foreground">Explore everything you get with each plan</p>
        </div>

        <Tabs defaultValue="benefits">
          <TabsList className="w-full max-w-md mx-auto mb-6">
            <TabsTrigger value="benefits" className="flex-1">Benefits Explorer</TabsTrigger>
            <TabsTrigger value="roi" className="flex-1 gap-2"><Calculator className="h-4 w-4" /> ROI Calculator</TabsTrigger>
          </TabsList>

          {/* Benefits Explorer */}
          <TabsContent value="benefits" className="space-y-6">
            {BENEFIT_CATEGORIES.map(cat => {
              const CatIcon = cat.icon;
              return (
                <Card key={cat.title}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CatIcon className="h-5 w-5 text-primary" /> {cat.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Feature</th>
                          <th className="text-center py-2 font-medium">Free</th>
                          <th className="text-center py-2 font-medium">Basic</th>
                          <th className="text-center py-2 font-medium text-primary">Pro</th>
                          <th className="text-center py-2 font-medium">Business</th>
                          <th className="text-center py-2 font-medium">Enterprise</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.benefits.map((b: any) => (
                          <tr key={b.name} className="border-b last:border-0">
                            <td className="py-2.5 text-muted-foreground">{b.name}</td>
                            <td className="text-center py-2.5">{fmtVal(b.free)}</td>
                            <td className="text-center py-2.5">{fmtVal(b.basic)}</td>
                            <td className="text-center py-2.5 bg-primary/5">{fmtVal(b.pro)}</td>
                            <td className="text-center py-2.5">{fmtVal(b.business)}</td>
                            <td className="text-center py-2.5">{fmtVal(b.enterprise)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              );
            })}

            <div className="text-center">
              <Button asChild size="lg"><Link to="/membership-plans">View Plans & Pricing</Link></Button>
            </div>
          </TabsContent>

          {/* ROI Calculator */}
          <TabsContent value="roi">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> Commission Savings Calculator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Monthly Sales Volume (৳)</Label>
                    <Input type="number" value={monthlySales} onChange={e => setMonthlySales(e.target.value)} placeholder="50000" />
                  </div>
                  <div>
                    <Label>Monthly Active Listings</Label>
                    <Input type="number" value={monthlyListings} onChange={e => setMonthlyListings(e.target.value)} placeholder="20" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium">Your estimated monthly costs by plan:</p>
                  {roiData.map(tier => {
                    const commissionFee = Math.round(sales * (tier.commission / 100));
                    const totalCost = tier.price + commissionFee;
                    const savingsVsFree = calcSavings(tier.commission, 5);
                    const isBest = tier.tier === 'Professional';

                    return (
                      <div
                        key={tier.tier}
                        className={`flex items-center justify-between p-4 rounded-lg border ${isBest ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg bg-muted flex items-center justify-center ${tier.color}`}>
                            {tier.tier === 'Free' && <Package className="h-4 w-4" />}
                            {tier.tier === 'Basic' && <Zap className="h-4 w-4" />}
                            {tier.tier === 'Professional' && <Rocket className="h-4 w-4" />}
                            {tier.tier === 'Business' && <Building2 className="h-4 w-4" />}
                            {tier.tier === 'Enterprise' && <Crown className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tier.tier}</p>
                            <p className="text-xs text-muted-foreground">
                              ৳{tier.price}/mo + {tier.commission}% commission
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">৳{totalCost.toLocaleString()}/mo</p>
                          {savingsVsFree > 0 && (
                            <p className="text-xs text-green-600">Save ৳{savingsVsFree}/mo vs Free</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">💡 How to read this</p>
                  <p>Commission is calculated on your monthly sales volume. Higher tiers have lower commission rates,
                  so the more you sell, the more you save by upgrading. The "total cost" includes the subscription fee plus commission.</p>
                </div>

                <Button asChild className="w-full"><Link to="/membership-plans">Choose Your Plan</Link></Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
