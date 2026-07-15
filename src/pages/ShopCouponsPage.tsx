/**
 * ShopCouponsPage — Create and manage shop coupons for discounts.
 * Available for Professional+ tiers.
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Tag, Plus, Trash2, Edit, Copy, Calendar, Percent, DollarSign, Truck, Lock, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Coupon {
  id: string;
  code: string;
  coupon_type: string;
  value: number;
  min_purchase: number | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

const COUPON_TYPES = [
  { value: 'percentage', label: 'Percentage Discount', icon: Percent },
  { value: 'fixed_amount', label: 'Fixed Amount Off', icon: DollarSign },
  { value: 'free_shipping', label: 'Free Shipping', icon: Truck },
];

export default function ShopCouponsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: '', coupon_type: 'percentage', value: '', min_purchase: '', max_uses: '', expires_at: '',
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: shopData } = await supabase.from('shops').select('*').eq('owner_id', user.id).single();
      if (shopData) {
        setShop(shopData);
        const { data: couponData } = await supabase.from('shop_coupons').select('*').eq('shop_id', shopData.id).order('created_at', { ascending: false });
        setCoupons((couponData as Coupon[]) || []);
      }
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(prev => ({ ...prev, code }));
  };

  const handleSave = async () => {
    if (!shop || !form.code.trim()) { toast.error('Coupon code is required'); return; }
    if (form.coupon_type !== 'free_shipping' && !form.value) { toast.error('Value is required'); return; }

    try {
      const payload = {
        shop_id: shop.id,
        code: form.code.toUpperCase().trim(),
        coupon_type: form.coupon_type,
        value: form.coupon_type === 'free_shipping' ? 0 : parseFloat(form.value),
        min_purchase: form.min_purchase ? parseFloat(form.min_purchase) : null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        is_active: true,
        starts_at: new Date().toISOString(),
        expires_at: form.expires_at || null,
      };

      if (editing) {
        await supabase.from('shop_coupons').update(payload).eq('id', editing.id);
        toast.success('Coupon updated');
      } else {
        const { error } = await supabase.from('shop_coupons').insert(payload);
        if (error) {
          if (error.code === '23505') { toast.error('Coupon code already exists'); return; }
          throw error;
        }
        toast.success('Coupon created');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ code: '', coupon_type: 'percentage', value: '', min_purchase: '', max_uses: '', expires_at: '' });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save coupon');
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('shop_coupons').update({ is_active: !active }).eq('id', id);
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !active } : c));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('shop_coupons').delete().eq('id', id);
    setCoupons(prev => prev.filter(c => c.id !== id));
    toast.success('Coupon deleted');
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Coupon code copied');
  };

  const handleEdit = (coupon: Coupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      coupon_type: coupon.coupon_type,
      value: String(coupon.value),
      min_purchase: coupon.min_purchase ? String(coupon.min_purchase) : '',
      max_uses: coupon.max_uses ? String(coupon.max_uses) : '',
      expires_at: coupon.expires_at ? format(new Date(coupon.expires_at), 'yyyy-MM-dd') : '',
    });
    setShowForm(true);
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const canUseCoupons = shop && ['professional', 'business', 'enterprise'].includes(shop.membership_tier);

  const couponTypeLabel = (type: string) => {
    const t = COUPON_TYPES.find(c => c.value === type);
    return t?.label || type;
  };

  const couponValueDisplay = (c: Coupon) => {
    if (c.coupon_type === 'percentage') return `${c.value}% OFF`;
    if (c.coupon_type === 'fixed_amount') return `৳${c.value} OFF`;
    return 'FREE SHIPPING';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Shop Coupons</h1>
              <p className="text-muted-foreground">{coupons.length} coupons · {coupons.filter(c => c.is_active).length} active</p>
            </div>
          </div>
          {canUseCoupons && (
            <Button onClick={() => { setEditing(null); setForm({ code: '', coupon_type: 'percentage', value: '', min_purchase: '', max_uses: '', expires_at: '' }); setShowForm(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Create Coupon
            </Button>
          )}
        </div>

        {!canUseCoupons && !loading && (
          <Card className="mb-6 bg-muted/50">
            <CardContent className="p-6 text-center">
              <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">Coupons are a Professional feature</p>
              <p className="text-sm text-muted-foreground mb-4">Upgrade to Professional or higher to create discount coupons.</p>
              <Button asChild><Link to="/membership-plans">View Plans</Link></Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        ) : coupons.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><Tag className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No coupons yet</p></CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {coupons.map(coupon => {
              const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
              const isExhausted = coupon.max_uses && coupon.used_count >= coupon.max_uses;
              return (
                <Card key={coupon.id} className={!coupon.is_active || isExpired || isExhausted ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-lg font-bold font-mono bg-muted px-2 py-0.5 rounded">{coupon.code}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(coupon.code)}><Copy className="h-3 w-3" /></Button>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{couponTypeLabel(coupon.coupon_type)}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch checked={coupon.is_active} onCheckedChange={() => handleToggle(coupon.id, coupon.is_active)} />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(coupon)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(coupon.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="font-bold text-primary">{couponValueDisplay(coupon)}</span>
                      </div>
                      {coupon.min_purchase && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Min Purchase</span>
                          <span>৳{coupon.min_purchase.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Used</span>
                        <span>{coupon.used_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}</span>
                      </div>
                      {coupon.expires_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Expires</span>
                          <span className={isExpired ? 'text-destructive' : ''}>{format(new Date(coupon.expires_at), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      {isExpired ? <Badge variant="destructive" className="text-[10px] gap-1"><XCircle className="h-3 w-3" /> Expired</Badge> :
                       isExhausted ? <Badge variant="outline" className="text-[10px] gap-1"><XCircle className="h-3 w-3" /> Exhausted</Badge> :
                       coupon.is_active ? <Badge variant="default" className="text-[10px] gap-1"><CheckCircle className="h-3 w-3" /> Active</Badge> :
                       <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="h-3 w-3" /> Paused</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">Created {formatDistanceToNow(new Date(coupon.created_at), { addSuffix: true })}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <MobileNav />
      <Footer />

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
            <DialogDescription>{editing ? 'Update coupon details' : 'Create a discount coupon for your shop'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Coupon Code</Label>
              <div className="flex gap-2">
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER2026" className="font-mono" maxLength={20} />
                <Button variant="outline" onClick={generateCode}>Generate</Button>
              </div>
            </div>

            <div>
              <Label>Discount Type</Label>
              <Select value={form.coupon_type} onValueChange={v => setForm({ ...form, coupon_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUPON_TYPES.map(t => {
                    const Icon = t.icon;
                    return <SelectItem key={t.value} value={t.value}><span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {t.label}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            {form.coupon_type !== 'free_shipping' && (
              <div>
                <Label>{form.coupon_type === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (৳)'}</Label>
                <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.coupon_type === 'percentage' ? '10' : '500'} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min Purchase (৳)</Label>
                <Input type="number" value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: e.target.value })} placeholder="0" />
              </div>
              <div>
                <Label>Max Uses</Label>
                <Input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} placeholder="Unlimited" />
              </div>
            </div>

            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Update' : 'Create'} Coupon</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
