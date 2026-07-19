/**
 * AdPromotions — admin-configurable catalog of ad promotion products.
 *
 * Super admins / admins can create, edit, enable/disable and delete promotion
 * types (duration, pricing, priority, benefits, badge styling, placement).
 * These rows drive the seller-facing Promote dialog and the mirrored ad flags.
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import {
  listPromotionTypes, upsertPromotionType, setPromotionTypeActive, deletePromotionType,
  promotionBadgeClass, formatPromotionPrice, PROMOTION_BADGE_COLORS, PROMOTION_PLACEMENTS,
  type PromotionType, type PromotionTypeInput,
} from '@/lib/adPromotions';
import { logAudit } from '@/lib/audit';

const EMPTY: PromotionTypeInput = {
  key: '',
  name: '',
  description: '',
  badge_label: '',
  badge_color: 'slate',
  icon: 'megaphone',
  placement: 'listing',
  priority: 0,
  default_duration_days: 7,
  price: 0,
  currency: 'BDT',
  benefits: [],
  is_slot_limited: false,
  max_active_slots: null,
  is_active: true,
  sort_order: 0,
};

export default function AdPromotions() {
  const [types, setTypes] = useState<PromotionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionType | null>(null);
  const [form, setForm] = useState<PromotionTypeInput>(EMPTY);
  const [benefitsText, setBenefitsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromotionType | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setTypes(await listPromotionTypes());
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load promotions (run schema 22)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setBenefitsText('');
    setDialogOpen(true);
  };

  const openEdit = (t: PromotionType) => {
    setEditing(t);
    setForm({
      key: t.key, name: t.name, description: t.description ?? '',
      badge_label: t.badge_label ?? '', badge_color: t.badge_color, icon: t.icon ?? '',
      placement: t.placement, priority: t.priority, default_duration_days: t.default_duration_days,
      price: t.price, currency: t.currency, benefits: t.benefits,
      is_slot_limited: t.is_slot_limited, max_active_slots: t.max_active_slots,
      is_active: t.is_active, sort_order: t.sort_order,
    });
    setBenefitsText((t.benefits || []).join('\n'));
    setDialogOpen(true);
  };

  const set = <K extends keyof PromotionTypeInput>(k: K, v: PromotionTypeInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.key.trim() || !form.name.trim()) {
      toast.error('Key and name are required');
      return;
    }
    setSaving(true);
    try {
      const benefits = benefitsText.split('\n').map((s) => s.trim()).filter(Boolean);
      const { error } = await upsertPromotionType({
        ...form,
        key: form.key.trim().toLowerCase().replace(/\s+/g, '_'),
        benefits,
        max_active_slots: form.is_slot_limited ? form.max_active_slots ?? null : null,
        id: editing?.id,
      });
      if (error) throw error;
      await logAudit({
        action: editing ? 'update' : 'create',
        resourceType: 'promotion_type',
        resourceId: editing?.id,
        details: { key: form.key, name: form.name },
      });
      toast.success(editing ? 'Promotion updated' : 'Promotion created');
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: PromotionType) => {
    const { error } = await setPromotionTypeActive(t.id, !t.is_active);
    if (error) { toast.error(error.message); return; }
    setTypes((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: !x.is_active } : x)));
    void logAudit({ action: 'update', resourceType: 'promotion_type', resourceId: t.id, details: { is_active: !t.is_active } });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await deletePromotionType(deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    void logAudit({ action: 'delete', resourceType: 'promotion_type', resourceId: deleteTarget.id, details: { key: deleteTarget.key } });
    toast.success('Promotion deleted');
    setDeleteTarget(null);
    await load();
  };

  const activeCount = useMemo(() => types.filter((t) => t.is_active).length, [types]);

  return (
    <AdminLayout>
      <PageHeader
        title="Ad Promotions"
        description="Configure the promotion products sellers can buy to boost their ads."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Ads' }, { label: 'Ad Promotions' }]}
        actions={
          <Button size="sm" className="h-8 gap-1 text-xs" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> New Promotion
          </Button>
        }
      />

      <div className="mb-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Megaphone className="h-3.5 w-3.5" />
        {loading ? 'Loading…' : `${types.length} promotion types · ${activeCount} active`}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-[11px]">Promotion</TableHead>
                <TableHead className="h-8 text-[11px]">Badge</TableHead>
                <TableHead className="h-8 text-[11px]">Placement</TableHead>
                <TableHead className="h-8 text-[11px]">Priority</TableHead>
                <TableHead className="h-8 text-[11px]">Duration</TableHead>
                <TableHead className="h-8 text-[11px]">Price</TableHead>
                <TableHead className="h-8 text-[11px]">Active</TableHead>
                <TableHead className="h-8 text-right text-[11px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8} className="py-2"><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              ) : types.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">No promotion types yet. Create your first one.</TableCell></TableRow>
              ) : (
                types.map((t) => (
                  <TableRow key={t.id} className="text-[13px]">
                    <TableCell className="py-1.5">
                      <div className="font-medium">{t.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{t.key}</div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      {t.badge_label
                        ? <Badge variant="outline" className={`h-5 px-1.5 text-[10px] ${promotionBadgeClass(t.badge_color)}`}>{t.badge_label}</Badge>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="py-1.5 text-[12px] capitalize">{t.placement.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="py-1.5 text-[12px]">{t.priority}</TableCell>
                    <TableCell className="py-1.5 text-[12px]">{t.default_duration_days}d</TableCell>
                    <TableCell className="py-1.5 text-[12px] font-medium">{formatPromotionPrice(t.price, t.currency)}</TableCell>
                    <TableCell className="py-1.5">
                      <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={() => setDeleteTarget(t)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? 'Edit Promotion' : 'New Promotion'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Name</Label>
              <Input className="h-8 text-sm" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Featured Ad" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Key</Label>
              <Input className="h-8 font-mono text-xs" value={form.key} onChange={(e) => set('key', e.target.value)} placeholder="featured_ad" disabled={!!editing} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Placement</Label>
              <Select value={form.placement} onValueChange={(v) => set('placement', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROMOTION_PLACEMENTS.map((p) => <SelectItem key={p} value={p} className="text-xs capitalize">{p.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea className="min-h-[56px] text-sm" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Badge label</Label>
              <Input className="h-8 text-sm" value={form.badge_label ?? ''} onChange={(e) => set('badge_label', e.target.value)} placeholder="Featured" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Badge color</Label>
              <Select value={form.badge_color} onValueChange={(v) => set('badge_color', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROMOTION_BADGE_COLORS.map((c) => <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Icon (lucide)</Label>
              <Input className="h-8 text-sm" value={form.icon ?? ''} onChange={(e) => set('icon', e.target.value)} placeholder="star" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Input type="number" className="h-8 text-sm" value={form.priority ?? 0} onChange={(e) => set('priority', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duration (days)</Label>
              <Input type="number" className="h-8 text-sm" value={form.default_duration_days ?? 7} onChange={(e) => set('default_duration_days', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price</Label>
              <Input type="number" className="h-8 text-sm" value={form.price ?? 0} onChange={(e) => set('price', Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Currency</Label>
              <Input className="h-8 text-sm" value={form.currency ?? 'BDT'} onChange={(e) => set('currency', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sort order</Label>
              <Input type="number" className="h-8 text-sm" value={form.sort_order ?? 0} onChange={(e) => set('sort_order', Number(e.target.value))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Benefits (one per line)</Label>
              <Textarea className="min-h-[72px] text-sm" value={benefitsText} onChange={(e) => setBenefitsText(e.target.value)} placeholder={'Featured badge on the listing\nHigher placement in results'} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label className="text-xs">Slot limited</Label>
              <Switch checked={!!form.is_slot_limited} onCheckedChange={(v) => set('is_slot_limited', v)} />
            </div>
            {form.is_slot_limited && (
              <div className="space-y-1">
                <Label className="text-xs">Max active slots</Label>
                <Input type="number" className="h-8 text-sm" value={form.max_active_slots ?? 0} onChange={(e) => set('max_active_slots', Number(e.target.value))} />
              </div>
            )}
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label className="text-xs">Active</Label>
              <Switch checked={!!form.is_active} onCheckedChange={(v) => set('is_active', v)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the promotion product from the catalog. Existing ad promotions that reference it are kept for history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
