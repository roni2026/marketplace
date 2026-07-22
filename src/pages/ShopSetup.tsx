import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useShop } from '@/hooks/useShop';
import {
  MEMBERSHIP_TIERS,
  getMembershipTierConfig,
  DEFAULT_BUSINESS_HOURS,
  type ShopMembershipTier,
  type BusinessHours,
} from '@/integrations/supabase/types_v3_shops';
import { DIVISIONS, DISTRICTS, generateSlug } from '@/lib/constants';
import { sanitizeText } from '@/lib/validation';
import {
  Store, Check, ChevronRight, ChevronLeft, Loader2,
  Package, Star, Zap, Crown, Shield, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

export default function ShopSetup() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { shop, isLoading: shopLoading, createShop } = useShop();
  const [step, setStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTier, setSelectedTier] = useState<ShopMembershipTier>('basic');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    location_division: '',
    location_city: '',
    location_address: '',
    logo_url: '',
    banner_url: '',
    shipping_policy: '',
    return_policy: '',
    refund_policy: '',
    warranty_info: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    social_links: {
      facebook: '',
      instagram: '',
      twitter: '',
      whatsapp: '',
      youtube: '',
    } as Record<string, string>,
  });
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !shopLoading && shop) {
      navigate('/shop-dashboard');
    }
  }, [shop, shopLoading, authLoading, navigate]);

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name && !formData.slug) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [formData.name, formData.slug]);

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: generateSlug(value),
    }));
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 0:
        if (!selectedTier) {
          toast.error('Please select a membership plan');
          return false;
        }
        return true;
      case 1:
        if (!formData.name.trim()) {
          toast.error('Shop name is required');
          return false;
        }
        if (!formData.slug.trim()) {
          toast.error('Shop URL is required');
          return false;
        }
        return true;
      case 2:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCreate = async () => {
    if (!user) return;
    setIsCreating(true);
    try {
      const tierConfig = getMembershipTierConfig(selectedTier);
      const shop = await createShop({
        owner_id: user.id,
        name: sanitizeText(formData.name),
        slug: formData.slug,
        description: formData.description || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        business_hours: businessHours as unknown as Record<string, unknown>,
        location_division: formData.location_division || null,
        location_city: formData.location_city || null,
        location_address: formData.location_address || null,
        social_links: formData.social_links,
        logo_url: formData.logo_url || null,
        banner_url: formData.banner_url || null,
        shipping_policy: formData.shipping_policy || null,
        return_policy: formData.return_policy || null,
        refund_policy: formData.refund_policy || null,
        warranty_info: formData.warranty_info || null,
        seo_title: formData.seo_title || null,
        seo_description: formData.seo_description || null,
        seo_keywords: formData.seo_keywords ? formData.seo_keywords.split(',').map((k) => k.trim()) : null,
      });

      if (shop) {
        // Update membership tier if not basic
        if (selectedTier !== 'basic') {
          const { supabase } = await import('@/integrations/supabase/client');
          await supabase
            .from('shop_memberships')
            .update({
              tier: selectedTier,
              listing_limit: tierConfig.listing_limit,
              monthly_fee: tierConfig.price,
            })
            .eq('shop_id', shop.id);
        }
        toast.success('Shop created successfully!');
        navigate('/shop-dashboard');
      }
    } catch (err) {
      console.error('Shop creation error:', err);
      toast.error('Failed to create shop');
    } finally {
      setIsCreating(false);
    }
  };

  if (authLoading || shopLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96" />
        </div>
        <Footer />
      </div>
    );
  }

  if (shop) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 text-center max-w-md">
          <h1 className="text-xl font-semibold mb-2">You already have a shop</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage it from your dashboard or settings instead of creating another one.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-2">
            <Button asChild><Link to="/shop-dashboard">Shop dashboard</Link></Button>
            <Button asChild variant="outline"><Link to="/shop-settings">Shop settings</Link></Button>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  const tierIcons = { basic: Package, professional: Zap, business: Star, enterprise: Crown };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Create Your Shop — Marketplace</title>
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Create Your Shop</h1>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8">
          {['Plan', 'Information', 'Branding', 'Review'].map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    i <= step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-sm hidden sm:inline ${i <= step ? 'font-medium' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Choose Plan */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choose Your Membership Plan</h2>
            <p className="text-sm text-muted-foreground">Select a plan that fits your business needs. You can upgrade anytime.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MEMBERSHIP_TIERS.map((tier) => {
                const TierIcon = tierIcons[tier.tier];
                const isSelected = selectedTier === tier.tier;
                return (
                  <Card
                    key={tier.tier}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedTier(tier.tier)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg bg-${tier.color}-500/10`}>
                            <TierIcon className={`h-5 w-5 text-${tier.color}-500`} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{tier.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {tier.listing_limit === -1 ? 'Unlimited' : tier.listing_limit} listings
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-2xl font-bold mb-3">
                        ৳{tier.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </p>
                      <ul className="space-y-1.5">
                        {tier.features.slice(0, 6).map((feat, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{feat}</span>
                          </li>
                        ))}
                        {tier.features.length > 6 && (
                          <li className="text-xs text-primary">+{tier.features.length - 6} more features</li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Shop Information */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Shop Information</h2>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Shop Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="My Awesome Shop"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Shop URL *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/shop/</span>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="my-awesome-shop"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Business Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Tell customers about your business..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="shop@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Contact Phone</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, contact_phone: e.target.value }))}
                      placeholder="+880..."
                    />
                  </div>
                </div>

                {/* Business Hours */}
                <div className="space-y-2">
                  <Label>Business Hours</Label>
                  <div className="space-y-2">
                    {DAYS.map((day) => {
                      const hours = businessHours[day];
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <div className="w-24 text-sm">{DAY_LABELS[day]}</div>
                          <Checkbox
                            checked={!hours.closed}
                            onCheckedChange={(checked) =>
                              setBusinessHours((prev) => ({
                                ...prev,
                                [day]: { ...prev[day], closed: !checked },
                              }))
                            }
                          />
                          {!hours.closed ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                type="time"
                                value={hours.open}
                                onChange={(e) =>
                                  setBusinessHours((prev) => ({
                                    ...prev,
                                    [day]: { ...prev[day], open: e.target.value },
                                  }))
                                }
                                className="w-32"
                              />
                              <span className="text-muted-foreground">to</span>
                              <Input
                                type="time"
                                value={hours.close}
                                onChange={(e) =>
                                  setBusinessHours((prev) => ({
                                    ...prev,
                                    [day]: { ...prev[day], close: e.target.value },
                                  }))
                                }
                                className="w-32"
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Closed</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Division</Label>
                    <Select
                      value={formData.location_division}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, location_division: v, location_city: '' }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                      <SelectContent>
                        {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>City/District</Label>
                    <Select
                      value={formData.location_city}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, location_city: v }))}
                      disabled={!formData.location_division}
                    >
                      <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                      <SelectContent>
                        {(DISTRICTS[formData.location_division] || []).map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location_address">Address</Label>
                  <Input
                    id="location_address"
                    value={formData.location_address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location_address: e.target.value }))}
                    placeholder="Street address"
                  />
                </div>

                {/* Social Links */}
                <div className="space-y-2">
                  <Label>Social Media Links</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['facebook', 'instagram', 'twitter', 'whatsapp', 'youtube'].map((platform) => (
                      <Input
                        key={platform}
                        value={formData.social_links[platform] || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            social_links: { ...prev.social_links, [platform]: e.target.value },
                          }))
                        }
                        placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Branding */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Shop Branding & Policies</h2>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo_url">Logo URL</Label>
                    <Input
                      id="logo_url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
                      placeholder="https://..."
                    />
                    {formData.logo_url && (
                      <img src={formData.logo_url} alt="Logo preview" className="h-16 w-16 rounded-lg object-cover" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="banner_url">Banner URL</Label>
                    <Input
                      id="banner_url"
                      value={formData.banner_url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, banner_url: e.target.value }))}
                      placeholder="https://..."
                    />
                    {formData.banner_url && (
                      <img src={formData.banner_url} alt="Banner preview" className="h-20 w-full rounded-lg object-cover" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipping_policy">Shipping Policy</Label>
                  <Textarea
                    id="shipping_policy"
                    value={formData.shipping_policy}
                    onChange={(e) => setFormData((prev) => ({ ...prev, shipping_policy: e.target.value }))}
                    placeholder="Describe your shipping methods, costs, and delivery times..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return_policy">Return Policy</Label>
                  <Textarea
                    id="return_policy"
                    value={formData.return_policy}
                    onChange={(e) => setFormData((prev) => ({ ...prev, return_policy: e.target.value }))}
                    placeholder="Describe your return conditions and process..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refund_policy">Refund Policy</Label>
                  <Textarea
                    id="refund_policy"
                    value={formData.refund_policy}
                    onChange={(e) => setFormData((prev) => ({ ...prev, refund_policy: e.target.value }))}
                    placeholder="Describe your refund process and timelines..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warranty_info">Warranty Information</Label>
                  <Textarea
                    id="warranty_info"
                    value={formData.warranty_info}
                    onChange={(e) => setFormData((prev) => ({ ...prev, warranty_info: e.target.value }))}
                    placeholder="Describe warranty coverage for your products..."
                    rows={3}
                  />
                </div>

                {/* SEO */}
                <div className="space-y-2">
                  <Label htmlFor="seo_title">SEO Title</Label>
                  <Input
                    id="seo_title"
                    value={formData.seo_title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seo_title: e.target.value }))}
                    placeholder="SEO optimized title for search engines"
                    maxLength={60}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seo_description">SEO Description</Label>
                  <Textarea
                    id="seo_description"
                    value={formData.seo_description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seo_description: e.target.value }))}
                    placeholder="Meta description for search engines"
                    rows={2}
                    maxLength={160}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seo_keywords">SEO Keywords (comma-separated)</Label>
                  <Input
                    id="seo_keywords"
                    value={formData.seo_keywords}
                    onChange={(e) => setFormData((prev) => ({ ...prev, seo_keywords: e.target.value }))}
                    placeholder="electronics, gadgets, accessories"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review & Create</h2>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Membership Plan</h3>
                  <div className="flex items-center gap-2">
                    <Badge>{getMembershipTierConfig(selectedTier).name}</Badge>
                    <span className="text-sm">৳{getMembershipTierConfig(selectedTier).price}/mo</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Shop Information</h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div><dt className="inline text-muted-foreground">Name: </dt><dd className="inline font-medium">{formData.name}</dd></div>
                    <div><dt className="inline text-muted-foreground">URL: </dt><dd className="inline font-medium">/shop/{formData.slug}</dd></div>
                    {formData.contact_email && <div><dt className="inline text-muted-foreground">Email: </dt><dd className="inline">{formData.contact_email}</dd></div>}
                    {formData.contact_phone && <div><dt className="inline text-muted-foreground">Phone: </dt><dd className="inline">{formData.contact_phone}</dd></div>}
                    {formData.location_city && <div><dt className="inline text-muted-foreground">Location: </dt><dd className="inline">{formData.location_city}, {formData.location_division}</dd></div>}
                  </dl>
                </div>
                {formData.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Description</h3>
                    <p className="text-sm">{formData.description}</p>
                  </div>
                )}
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="text-sm text-center">
                    Ready to create your shop? Click the button below to get started.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" onClick={handleBack} disabled={step === 0} className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext} className="gap-2">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
              Create Shop
            </Button>
          )}
        </div>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
