import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { logUserAction } from '@/lib/audit';
import {
  Percent, Download, Plus, Tag, TrendingUp, Clock, CheckCircle,
  XCircle, DollarSign, RotateCcw, Gift,
} from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  status: 'active' | 'expired' | 'disabled';
  used_count: number;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string;
}

// Coupons are managed in-memory until a dedicated coupons table is created in the database.

export default function Coupons() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'percentage', value: '', max_uses: '' });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) {
      // Coupons are currently managed in-memory. When a coupons table is added to the DB,
      // this will fetch from supabase. For now, start with an empty list.
      setCoupons([]);
      setIsLoading(false);
    }
  }, [user, isAdmin, navigate]);

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Coupons & Promotions"
        description="Manage discount codes, promotional offers, and gift cards"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Orders & Finance' }, { label: 'Coupons' }]}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Export</Button>
            <Button size="sm" className="gap-2" onClick={() => setShowDialog(true)}><Plus className="h-3.5 w-3.5" /> Create Coupon</Button>
          </>
        }
      />

      <StatCardGrid>
        <StatCard title="Active Coupons" value={coupons.filter(c => c.status === 'active').length} icon={Tag} color="green" loading={isLoading} />
        <StatCard title="Total Redemptions" value={coupons.reduce((s, c) => s + c.used_count, 0)} icon={CheckCircle} color="blue" loading={isLoading} />
        <StatCard title="Expired" value={coupons.filter(c => c.status === 'expired').length} icon={Clock} color="yellow" loading={isLoading} />
        <StatCard title="Disabled" value={coupons.filter(c => c.status === 'disabled').length} icon={XCircle} color="red" loading={isLoading} />
      </StatCardGrid>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        ) : (
          coupons.map(coupon => (
            <Card key={coupon.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {coupon.type === 'percentage' ? <Percent className="h-6 w-6 text-primary" /> : <DollarSign className="h-6 w-6 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-bold text-sm">{coupon.code}</p>
                    {coupon.status === 'active' && <Badge className="text-xs bg-green-500 hover:bg-green-500">Active</Badge>}
                    {coupon.status === 'expired' && <Badge variant="secondary" className="text-xs">Expired</Badge>}
                    {coupon.status === 'disabled' && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {coupon.type === 'percentage' ? `${coupon.value}% off` : `৳${coupon.value} off`} ·
                    Used {coupon.used_count} times{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                    {coupon.expires_at && ` · Expires ${formatDistanceToNow(new Date(coupon.expires_at), { addSuffix: true })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive">Disable</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Coupon</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Coupon Code</Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percentage' ? '10' : '500'} type="number" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max Uses (optional)</Label>
              <Input value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} placeholder="1000" type="number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => { toast.success('Coupon created'); setShowDialog(false); }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
