import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useShop } from '@/hooks/useShop';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import { sanitizeText } from '@/lib/validation';
import {
  submitVerification,
  getVerifications,
  checkVerificationStatus,
  getVerificationRequirements,
  type VerificationRequirement,
} from '@/lib/shopVerification';
import {
  createShopCoupon,
  deleteShopCoupon,
  createShopCollection,
  deleteShopCollection,
  createShopCategory,
  deleteShopCategory,
  createShopAnnouncement,
  deleteShopAnnouncement,
  createShopStaff,
  removeShopStaff,
} from '@/lib/shop';
import type {
  ShopVerification,
  VerificationType,
  ShopCouponType,
} from '@/integrations/supabase/types_v3_shops';
import {
  Settings, ShieldCheck, Ticket, FolderTree, Users,
  Megaphone, Plus, Trash2, Check, Clock, XCircle, Loader2,
  Store, Save, FileCheck, Upload,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ShopSettings() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { shop, isLoading: shopLoading, updateShop, toggleVacation, coupons, categories, staff, fetchShop } = useShop();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'general';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [vacationEnabled, setVacationEnabled] = useState(false);
  const [vacationMessage, setVacationMessage] = useState('');

  // Verification state
  const [verifications, setVerifications] = useState<ShopVerification[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<{
    isVerified: boolean;
    pendingTypes: VerificationType[];
    approvedTypes: VerificationType[];
  }>({ isVerified: false, pendingTypes: [], approvedTypes: [] });
  const [selectedVerificationType, setSelectedVerificationType] = useState<VerificationType>('business');
  const [verificationForm, setVerificationForm] = useState<Record<string, string>>({});
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  // Coupon form
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    coupon_type: 'percentage' as ShopCouponType,
    value: 0,
    max_uses: '',
    expires_at: '',
  });

  // Collection form
  const [collectionForm, setCollectionForm] = useState({ name: '', description: '' });

  // Category form
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '' });

  // Announcement form
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '' });

  // Staff form
  const [staffForm, setStaffForm] = useState({ email: '', role: 'staff' as const });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    location_division: '',
    location_city: '',
    location_address: '',
    shipping_policy: '',
    return_policy: '',
    refund_policy: '',
    warranty_info: '',
    announcement: '',
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !shopLoading && !shop) {
      navigate('/shop-setup');
    }
  }, [shop, shopLoading, authLoading, navigate]);

  useEffect(() => {
    if (shop) {
      setEditForm({
        name: shop.name,
        description: shop.description || '',
        contact_email: shop.contact_email || '',
        contact_phone: shop.contact_phone || '',
        location_division: shop.location_division || '',
        location_city: shop.location_city || '',
        location_address: shop.location_address || '',
        shipping_policy: shop.shipping_policy || '',
        return_policy: shop.return_policy || '',
        refund_policy: shop.refund_policy || '',
        warranty_info: shop.warranty_info || '',
        announcement: shop.announcement || '',
      });
      setVacationEnabled(shop.is_vacation_mode);
      setVacationMessage(shop.vacation_message || '');
    }
  }, [shop]);

  const fetchVerificationData = useCallback(async () => {
    if (!shop) return;
    const [verifs, status] = await Promise.all([
      getVerifications(shop.id),
      checkVerificationStatus(shop.id),
    ]);
    setVerifications(verifs);
    setVerificationStatus(status);
  }, [shop]);

  useEffect(() => {
    fetchVerificationData();
  }, [fetchVerificationData]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateShop({
      name: sanitizeText(editForm.name),
      description: editForm.description || null,
      contact_email: editForm.contact_email || null,
      contact_phone: editForm.contact_phone || null,
      location_division: editForm.location_division || null,
      location_city: editForm.location_city || null,
      location_address: editForm.location_address || null,
      shipping_policy: editForm.shipping_policy || null,
      return_policy: editForm.return_policy || null,
      refund_policy: editForm.refund_policy || null,
      warranty_info: editForm.warranty_info || null,
      announcement: editForm.announcement || null,
    });
    setIsSaving(false);
  };

  const handleSaveVacation = async () => {
    await toggleVacation(vacationEnabled, vacationMessage || undefined);
  };

  const handleSubmitVerification = async () => {
    if (!shop) return;
    setIsSubmittingVerification(true);
    const requirements = getVerificationRequirements(selectedVerificationType);
    const submittedData: Record<string, unknown> = {};
    for (const field of requirements.fields) {
      if (field.type !== 'file' && verificationForm[field.name]) {
        submittedData[field.name] = verificationForm[field.name];
      }
    }
    await submitVerification(shop.id, selectedVerificationType, {
      submittedData,
      documentUrls: [],
    });
    setIsSubmittingVerification(false);
    setVerificationForm({});
    fetchVerificationData();
  };

  const handleCreateCoupon = async () => {
    if (!shop || !couponForm.code) return;
    await createShopCoupon(shop.id, {
      shop_id: shop.id,
      code: couponForm.code,
      description: couponForm.description || null,
      coupon_type: couponForm.coupon_type,
      value: couponForm.value,
      max_uses: couponForm.max_uses ? parseInt(couponForm.max_uses) : null,
      expires_at: couponForm.expires_at || null,
    });
    setCouponForm({ code: '', description: '', coupon_type: 'percentage', value: 0, max_uses: '', expires_at: '' });
    fetchShop();
  };

  const handleCreateCollection = async () => {
    if (!shop || !collectionForm.name) return;
    await createShopCollection(shop.id, {
      shop_id: shop.id,
      name: collectionForm.name,
      description: collectionForm.description || null,
    });
    setCollectionForm({ name: '', description: '' });
    fetchShop();
  };

  const handleCreateCategory = async () => {
    if (!shop || !categoryForm.name) return;
    const slug = categoryForm.slug || categoryForm.name.toLowerCase().replace(/\s+/g, '-');
    await createShopCategory(shop.id, {
      shop_id: shop.id,
      name: categoryForm.name,
      slug,
    });
    setCategoryForm({ name: '', slug: '' });
    fetchShop();
  };

  const handleCreateAnnouncement = async () => {
    if (!shop || !announcementForm.title) return;
    await createShopAnnouncement(shop.id, {
      shop_id: shop.id,
      title: announcementForm.title,
      body: announcementForm.body || null,
    });
    setAnnouncementForm({ title: '', body: '' });
    fetchShop();
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

  if (!shop) return null;

  const verificationRequirements: VerificationRequirement = getVerificationRequirements(selectedVerificationType);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Shop Settings — {shop.name}</title>
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Shop Settings</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="vacation">Vacation</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Shop Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Shop Name</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input type="email" value={editForm.contact_email} onChange={(e) => setEditForm((p) => ({ ...p, contact_email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input value={editForm.contact_phone} onChange={(e) => setEditForm((p) => ({ ...p, contact_phone: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Division</Label>
                    <Select value={editForm.location_division} onValueChange={(v) => setEditForm((p) => ({ ...p, location_division: v, location_city: '' }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>District</Label>
                    <Select value={editForm.location_city} onValueChange={(v) => setEditForm((p) => ({ ...p, location_city: v }))} disabled={!editForm.location_division}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{(DISTRICTS[editForm.location_division] || []).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={editForm.location_address} onChange={(e) => setEditForm((p) => ({ ...p, location_address: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Announcement</Label>
                  <Textarea value={editForm.announcement} onChange={(e) => setEditForm((p) => ({ ...p, announcement: e.target.value }))} rows={2} placeholder="Shop-wide announcement shown to visitors" />
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Shop Policies</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Shipping Policy</Label>
                  <Textarea value={editForm.shipping_policy} onChange={(e) => setEditForm((p) => ({ ...p, shipping_policy: e.target.value }))} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Return Policy</Label>
                  <Textarea value={editForm.return_policy} onChange={(e) => setEditForm((p) => ({ ...p, return_policy: e.target.value }))} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Refund Policy</Label>
                  <Textarea value={editForm.refund_policy} onChange={(e) => setEditForm((p) => ({ ...p, refund_policy: e.target.value }))} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Warranty Information</Label>
                  <Textarea value={editForm.warranty_info} onChange={(e) => setEditForm((p) => ({ ...p, warranty_info: e.target.value }))} rows={3} />
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Policies
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Shop Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={verificationStatus.isVerified ? 'bg-blue-500 hover:bg-blue-500' : ''}>
                    {verificationStatus.isVerified ? 'Verified Shop' : 'Unverified'}
                  </Badge>
                  {verificationStatus.approvedTypes.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      <Check className="h-3 w-3" /> {t.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>

                {/* Submit new verification */}
                <div className="space-y-3 border rounded-lg p-4">
                  <h4 className="text-sm font-semibold">Submit Verification</h4>
                  <Select value={selectedVerificationType} onValueChange={(v) => setSelectedVerificationType(v as VerificationType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business Verification</SelectItem>
                      <SelectItem value="identity_kyc">Identity Verification (KYC)</SelectItem>
                      <SelectItem value="business_license">Business License</SelectItem>
                    </SelectContent>
                  </Select>

                  <p className="text-sm text-muted-foreground">{verificationRequirements.description}</p>

                  <div className="space-y-3">
                    {verificationRequirements.fields.map((field) => (
                      <div key={field.name} className="space-y-1">
                        <Label className="text-sm">{field.label}{field.required && ' *'}</Label>
                        {field.type === 'textarea' ? (
                          <Textarea
                            value={verificationForm[field.name] || ''}
                            onChange={(e) => setVerificationForm((p) => ({ ...p, [field.name]: e.target.value }))}
                            rows={2}
                          />
                        ) : field.type === 'file' ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              placeholder="Document URL"
                              value={verificationForm[field.name] || ''}
                              onChange={(e) => setVerificationForm((p) => ({ ...p, [field.name]: e.target.value }))}
                            />
                            <Button variant="outline" size="sm" className="gap-1">
                              <Upload className="h-3.5 w-3.5" /> Upload
                            </Button>
                          </div>
                        ) : (
                          <Input
                            value={verificationForm[field.name] || ''}
                            onChange={(e) => setVerificationForm((p) => ({ ...p, [field.name]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleSubmitVerification} disabled={isSubmittingVerification} className="gap-2">
                    {isSubmittingVerification ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                    Submit for Review
                  </Button>
                </div>

                {/* Existing verifications */}
                {verifications.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Verification History</h4>
                    {verifications.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <FileCheck className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium capitalize">{v.verification_type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge variant={v.status === 'approved' ? 'default' : v.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {v.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {v.status === 'approved' && <Check className="h-3 w-3 mr-1" />}
                          {v.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                          {v.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Ticket className="h-4 w-4" /> Create Coupon</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Code</Label>
                    <Input value={couponForm.code} onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" />
                  </div>
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={couponForm.coupon_type} onValueChange={(v) => setCouponForm((p) => ({ ...p, coupon_type: v as ShopCouponType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                        <SelectItem value="free_shipping">Free Shipping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Value</Label>
                    <Input type="number" value={couponForm.value} onChange={(e) => setCouponForm((p) => ({ ...p, value: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Max Uses</Label>
                    <Input type="number" value={couponForm.max_uses} onChange={(e) => setCouponForm((p) => ({ ...p, max_uses: e.target.value }))} placeholder="Unlimited" />
                  </div>
                  <div className="space-y-1">
                    <Label>Expires</Label>
                    <Input type="date" value={couponForm.expires_at} onChange={(e) => setCouponForm((p) => ({ ...p, expires_at: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={handleCreateCoupon} className="gap-2"><Plus className="h-4 w-4" /> Create Coupon</Button>
              </CardContent>
            </Card>

            {coupons.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Active Coupons</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {coupons.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Ticket className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-mono font-medium">{c.code}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.coupon_type === 'percentage' ? `${c.value}%` : c.coupon_type === 'fixed_amount' ? `৳${c.value}` : 'Free Shipping'}
                            {' · '}{c.used_count}/{c.max_uses || '∞'} used
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => { deleteShopCoupon(c.id); fetchShop(); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Collections Tab */}
          <TabsContent value="collections" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Create Collection</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={collectionForm.name} onChange={(e) => setCollectionForm((p) => ({ ...p, name: e.target.value }))} placeholder="Summer Collection" />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea value={collectionForm.description} onChange={(e) => setCollectionForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
                </div>
                <Button onClick={handleCreateCollection} className="gap-2"><Plus className="h-4 w-4" /> Create</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><FolderTree className="h-4 w-4" /> Create Category</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="Electronics" />
                </div>
                <Button onClick={handleCreateCategory} className="gap-2"><Plus className="h-4 w-4" /> Create</Button>
              </CardContent>
            </Card>
            {categories.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border">
                        <span className="text-sm">{c.name}</span>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => { deleteShopCategory(c.id); fetchShop(); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4" /> Create Announcement</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={announcementForm.title} onChange={(e) => setAnnouncementForm((p) => ({ ...p, title: e.target.value }))} placeholder="Summer Sale!" />
                </div>
                <div className="space-y-1">
                  <Label>Body</Label>
                  <Textarea value={announcementForm.body} onChange={(e) => setAnnouncementForm((p) => ({ ...p, body: e.target.value }))} rows={2} />
                </div>
                <Button onClick={handleCreateAnnouncement} className="gap-2"><Plus className="h-4 w-4" /> Create</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Staff Management</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Add staff members to help manage your shop.</p>
                {staff.length > 0 && (
                  <div className="space-y-2">
                    {staff.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium capitalize">{s.role}</p>
                          <p className="text-xs text-muted-foreground">{s.user_id.slice(0, 8)}...</p>
                        </div>
                        {s.role !== 'owner' && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => { removeShopStaff(s.id); fetchShop(); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vacation Tab */}
          <TabsContent value="vacation" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Vacation Mode</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Enable Vacation Mode</p>
                    <p className="text-xs text-muted-foreground">Temporarily hide your shop and listings</p>
                  </div>
                  <Switch checked={vacationEnabled} onCheckedChange={setVacationEnabled} />
                </div>
                {vacationEnabled && (
                  <div className="space-y-1">
                    <Label>Vacation Message</Label>
                    <Textarea value={vacationMessage} onChange={(e) => setVacationMessage(e.target.value)} rows={2} placeholder="We'll be back soon!" />
                  </div>
                )}
                <Button onClick={handleSaveVacation} size="sm">Save</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex items-center gap-2">
          <Link to="/shop-dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              <Store className="h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
