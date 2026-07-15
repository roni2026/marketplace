/**
 * BrandManagement — CRUD for brands + product models (category-aware).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight } from 'lucide-react';

interface Brand {
  id: string; name: string; slug: string; logo_url: string | null;
  category_id: string | null; is_active: boolean; sort_order: number;
}
interface Model {
  id: string; brand_id: string; name: string; slug: string; is_active: boolean;
}
interface Category { id: string; name: string; }

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function BrandManagement() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showBrand, setShowBrand] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [modelBrandId, setModelBrandId] = useState<string | null>(null);
  const [brandForm, setBrandForm] = useState({ name: '', slug: '', logo_url: '', category_id: 'none', is_active: true, sort_order: '0' });
  const [modelForm, setModelForm] = useState({ name: '', slug: '', is_active: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, m, c] = await Promise.all([
        supabase.from('brands').select('*').order('sort_order'),
        supabase.from('product_models').select('*').order('name'),
        supabase.from('categories').select('id,name').order('name'),
      ]);
      if (b.error) throw b.error;
      if (m.error) throw m.error;
      setBrands((b.data as Brand[]) || []);
      setModels((m.data as Model[]) || []);
      setCategories((c.data as Category[]) || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load brands (run schema 17 if tables are missing)');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const modelsByBrand = useMemo(() => {
    const map = new Map<string, Model[]>();
    for (const m of models) {
      const list = map.get(m.brand_id) || [];
      list.push(m);
      map.set(m.brand_id, list);
    }
    return map;
  }, [models]);

  const openCreateBrand = () => {
    setEditingBrand(null);
    setBrandForm({ name: '', slug: '', logo_url: '', category_id: 'none', is_active: true, sort_order: '0' });
    setShowBrand(true);
  };
  const openEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setBrandForm({
      name: b.name, slug: b.slug, logo_url: b.logo_url || '',
      category_id: b.category_id || 'none', is_active: b.is_active, sort_order: String(b.sort_order ?? 0),
    });
    setShowBrand(true);
  };

  const saveBrand = async () => {
    if (!brandForm.name.trim()) return toast.error('Name required');
    const payload = {
      name: brandForm.name.trim(),
      slug: brandForm.slug.trim() || slugify(brandForm.name),
      logo_url: brandForm.logo_url || null,
      category_id: brandForm.category_id === 'none' ? null : brandForm.category_id,
      is_active: brandForm.is_active,
      sort_order: parseInt(brandForm.sort_order, 10) || 0,
      updated_at: new Date().toISOString(),
    };
    try {
      if (editingBrand) {
        const { error } = await supabase.from('brands').update(payload).eq('id', editingBrand.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('brands').insert(payload);
        if (error) throw error;
      }
      toast.success('Brand saved');
      setShowBrand(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    }
  };

  const deleteBrand = async (id: string) => {
    if (!confirm('Delete this brand and its models?')) return;
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); load(); }
  };

  const openCreateModel = (brandId: string) => {
    setModelBrandId(brandId);
    setModelForm({ name: '', slug: '', is_active: true });
    setShowModel(true);
  };

  const saveModel = async () => {
    if (!modelBrandId || !modelForm.name.trim()) return;
    const payload = {
      brand_id: modelBrandId,
      name: modelForm.name.trim(),
      slug: modelForm.slug.trim() || slugify(modelForm.name),
      is_active: modelForm.is_active,
    };
    try {
      const { error } = await supabase.from('product_models').insert(payload);
      if (error) throw error;
      toast.success('Model added');
      setShowModel(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    }
  };

  const deleteModel = async (id: string) => {
    const { error } = await supabase.from('product_models').delete().eq('id', id);
    if (error) toast.error(error.message);
    else load();
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Brands & Models"
        description="Structure listings by brand and model under categories."
        actions={<Button size="sm" onClick={openCreateBrand}><Plus className="h-4 w-4 mr-1" /> Add brand</Button>}
      />
      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : brands.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No brands yet. Add Apple, Samsung, Xiaomi… then attach models (iPhone 15, Galaxy S24…).
        </div>
      ) : (
        <div className="space-y-2">
          {brands.map((b) => {
            const open = !!expanded[b.id];
            const kids = modelsByBrand.get(b.id) || [];
            return (
              <div key={b.id} className="rounded-lg border bg-card">
                <div className="flex items-center gap-2 p-3">
                  <button type="button" className="p-1" onClick={() => setExpanded((e) => ({ ...e, [b.id]: !e[b.id] }))}>
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{b.name}</span>
                      {!b.is_active && <Badge variant="secondary">Inactive</Badge>}
                      <Badge variant="outline" className="text-[10px]">{kids.length} models</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{b.slug}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openCreateModel(b.id)}>Add model</Button>
                  <Button size="icon" variant="ghost" onClick={() => openEditBrand(b)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteBrand(b.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
                {open && (
                  <div className="border-t px-4 py-2 space-y-1">
                    {kids.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No models yet.</p>
                    ) : kids.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-1.5 text-sm">
                        <span>{m.name} <span className="text-muted-foreground text-xs">/{m.slug}</span></span>
                        <Button size="icon" variant="ghost" onClick={() => deleteModel(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showBrand} onOpenChange={setShowBrand}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingBrand ? 'Edit brand' : 'New brand'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value, slug: brandForm.slug || slugify(e.target.value) })} /></div>
            <div><Label>Slug</Label><Input value={brandForm.slug} onChange={(e) => setBrandForm({ ...brandForm, slug: e.target.value })} /></div>
            <div><Label>Logo URL</Label><Input value={brandForm.logo_url} onChange={(e) => setBrandForm({ ...brandForm, logo_url: e.target.value })} /></div>
            <div>
              <Label>Primary category</Label>
              <Select value={brandForm.category_id} onValueChange={(v) => setBrandForm({ ...brandForm, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={brandForm.is_active} onCheckedChange={(v) => setBrandForm({ ...brandForm, is_active: v })} /></div>
          </div>
          <DialogFooter><Button onClick={saveBrand}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showModel} onOpenChange={setShowModel}>
        <DialogContent>
          <DialogHeader><DialogTitle>New model</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value, slug: slugify(e.target.value) })} /></div>
            <div><Label>Slug</Label><Input value={modelForm.slug} onChange={(e) => setModelForm({ ...modelForm, slug: e.target.value })} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={modelForm.is_active} onCheckedChange={(v) => setModelForm({ ...modelForm, is_active: v })} /></div>
          </div>
          <DialogFooter><Button onClick={saveModel}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
