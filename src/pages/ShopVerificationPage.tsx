/**
 * ShopVerificationPage — Business verification flow with document upload,
 * status tracking, and verification checklist.
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Shield, CheckCircle, Clock, XCircle, Upload, FileText, Building2, CreditCard, MapPin, Phone, Award, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Verification {
  id: string;
  verification_type: string;
  status: string;
  business_name: string | null;
  license_number: string | null;
  tax_id: string | null;
  address: string | null;
  documents: any[];
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

const VERIFICATION_STEPS = [
  { id: 'business_info', label: 'Business Information', icon: Building2, description: 'Provide your business details' },
  { id: 'license', label: 'Business License', icon: FileText, description: 'Upload your trade license' },
  { id: 'tax_id', label: 'Tax Registration', icon: CreditCard, description: 'Provide your TIN/BIN number' },
  { id: 'address', label: 'Business Address', icon: MapPin, description: 'Verify your business location' },
  { id: 'phone', label: 'Phone Verification', icon: Phone, description: 'Verify your business phone' },
];

export default function ShopVerificationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    business_name: '',
    business_type: 'individual',
    license_number: '',
    tax_id: '',
    address: '',
    phone: '',
  });
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: shopData } = await supabase.from('shops').select('*').eq('owner_id', user.id).single();
      if (shopData) setShop(shopData);

      const { data: verData } = await supabase
        .from('shop_verifications')
        .select('*')
        .eq('shop_id', shopData?.id)
        .order('submitted_at', { ascending: false });
      setVerifications((verData as Verification[]) || []);
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shop) return;

    try {
      const fileName = `verification/${shop.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('ad-media').upload(fileName, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('ad-media').getPublicUrl(fileName);
      setUploadedDocs(prev => [...prev, urlData.publicUrl]);
      toast.success('Document uploaded');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    }
  };

  const handleSubmit = async () => {
    if (!shop) { toast.error('Create a shop first'); return; }
    if (!form.business_name.trim()) { toast.error('Business name is required'); return; }
    if (uploadedDocs.length === 0) { toast.error('Upload at least one document'); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('shop_verifications').insert({
        shop_id: shop.id,
        verification_type: 'business_license',
        status: 'pending',
        business_name: form.business_name.trim(),
        license_number: form.license_number.trim() || null,
        tax_id: form.tax_id.trim() || null,
        address: form.address.trim() || null,
        documents: uploadedDocs,
        submitted_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Verification submitted! We will review it within 2-3 business days.');
      setForm({ business_name: '', business_type: 'individual', license_number: '', tax_id: '', address: '', phone: '' });
      setUploadedDocs([]);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit verification');
    }
    setSubmitting(false);
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const activeVerification = verifications.find(v => v.status === 'pending' || v.status === 'under_review');
  const approvedVerification = verifications.find(v => v.status === 'approved');
  const isVerified = !!approvedVerification || shop?.is_verified;

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending Review' },
      under_review: { variant: 'secondary', icon: Clock, label: 'Under Review' },
      approved: { variant: 'default', icon: CheckCircle, label: 'Approved' },
      rejected: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
      expired: { variant: 'outline', icon: AlertCircle, label: 'Expired' },
    };
    const cfg = map[status] || map.pending;
    const Icon = cfg.icon;
    return <Badge variant={cfg.variant} className="gap-1"><Icon className="h-3 w-3" /> {cfg.label}</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Shop Verification</h1>
            <p className="text-muted-foreground">Get verified to build trust with buyers</p>
          </div>
        </div>

        {/* Verification status banner */}
        {loading ? (
          <Skeleton className="h-20 rounded-lg mb-6" />
        ) : isVerified ? (
          <Card className="mb-6 bg-green-500/5 border-green-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">Your shop is verified!</p>
                <p className="text-sm text-muted-foreground">The verified badge appears on your shop and listings</p>
              </div>
              <Badge className="bg-green-600 gap-1 ml-auto"><Award className="h-3 w-3" /> Verified</Badge>
            </CardContent>
          </Card>
        ) : activeVerification ? (
          <Card className="mb-6 bg-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="font-medium">Verification under review</p>
                <p className="text-sm text-muted-foreground">Submitted {activeVerification.submitted_at && formatDistanceToNow(new Date(activeVerification.submitted_at), { addSuffix: true })}</p>
              </div>
              {statusBadge(activeVerification.status)}
            </CardContent>
          </Card>
        ) : null}

        {/* Verification steps */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Verification Checklist</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {VERIFICATION_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isDone = isVerified || (activeVerification && i < 3);
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isDone ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                  }`}>
                    {isDone ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Verification form (only if not verified and no pending) */}
        {!isVerified && !activeVerification && !loading && (
          <Card>
            <CardHeader><CardTitle className="text-base">Submit Verification</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Business Name *</Label>
                <Input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="e.g. Rahman Electronics Ltd." />
              </div>

              <div>
                <Label>Business Type</Label>
                <Select value={form.business_type} onValueChange={v => setForm({ ...form, business_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual / Sole Proprietor</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="company">Private Limited Company</SelectItem>
                    <SelectItem value="corporation">Corporation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Trade License Number</Label>
                  <Input value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} placeholder="License number" />
                </div>
                <div>
                  <Label>TIN / BIN Number</Label>
                  <Input value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} placeholder="Tax ID" />
                </div>
              </div>

              <div>
                <Label>Business Address</Label>
                <Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} placeholder="Full business address" />
              </div>

              <Separator />

              {/* Document upload */}
              <div>
                <Label>Upload Documents</Label>
                <p className="text-xs text-muted-foreground mb-2">Upload your trade license, TIN certificate, or other supporting documents</p>
                <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload (PDF, JPG, PNG)</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUploadDoc} className="hidden" />
                </label>
                {uploadedDocs.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {uploadedDocs.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg border">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm flex-1 truncate">Document {i + 1}</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : 'Submit for Verification'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Verification history */}
        {verifications.length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Verification History</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {verifications.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{v.business_name || 'Verification'}</p>
                    <p className="text-xs text-muted-foreground">Submitted {formatDistanceToNow(new Date(v.submitted_at), { addSuffix: true })}</p>
                    {v.reviewer_notes && <p className="text-xs text-muted-foreground mt-1">Note: {v.reviewer_notes}</p>}
                  </div>
                  {statusBadge(v.status)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
