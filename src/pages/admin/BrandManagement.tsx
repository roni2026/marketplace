/**
 * BrandManagement — CRUD for brands + product models (category-aware),
 * with CSV import / export and a downloadable template.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, Download, Upload, FileText } from 'lucide-react';

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

/** Minimal CSV parser that supports quoted fields and embedded commas/newlines. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((v) => v.trim() !== '')) rows.push(row); }
  return rows;
}

function csvCell(v: string) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const CSV_HEADERS = ['brand_name', 'brand_slug', 'category', 'model_name', 'model_slug', 'active'];

export default function BrandManagement() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showBrand, setShowBrand] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [modelBrandId, setModelBrandId] = useState<string | null>(null);
  const [brandForm, setBrandForm] = useState({ name: '', slug: '', logo_url: '', category_id: 'none', is_active: true, sort_order: '0' });
  const [modelForm, setModelForm] = useState({ name: '', slug: '', is_active: true });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      toast.error(e?.message || 'Failed to load brands (run schema 15 if tables are missing)');
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

  const categoryName = useCallback((id: string | null) => categories.find((c) => c.id === id)?.name || '', [categories]);

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
    setEditingModel(null);
    setModelBrandId(brandId);
    setModelForm({ name: '', slug: '', is_active: true });
    setShowModel(true);
  };
  const openEditModel = (m: Model) => {
    setEditingModel(m);
    setModelBrandId(m.brand_id);
    setModelForm({ name: m.name, slug: m.slug, is_active: m.is_active });
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
      if (editingModel) {
        const { error } = await supabase.from('product_models').update(payload).eq('id', editingModel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('product_models').insert(payload);
        if (error) throw error;
      }
      toast.success('Model saved');
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

  // ---- CSV: template, export, import -------------------------------------
  const downloadTemplate = () => {
    const rows = [
      CSV_HEADERS.join(','),
      ['Samsung', 'samsung', 'Electronics', 'Galaxy S24', 'galaxy-s24', 'true'].join(','),
      ['Samsung', 'samsung', 'Electronics', 'Galaxy A55', 'galaxy-a55', 'true'].join(','),
      ['Toyota', 'toyota', 'Vehicles', 'Corolla', 'corolla', 'true'].join(','),
    ].join('\n');
    downloadFile('brand_models_template.csv', rows);
    toast.success('Template downloaded');
  };

  const exportCSV = () => {
    const lines = [CSV_HEADERS.join(',')];
    for (const b of brands) {
      const kids = modelsByBrand.get(b.id) || [];
      if (kids.length === 0) {
        lines.push([b.name, b.slug, categoryName(b.category_id), '', '', b.is_active ? 'true' : 'false'].map(csvCell).join(','));
      } else {
        for (const m of kids) {
          lines.push([b.name, b.slug, categoryName(b.category_id), m.name, m.slug, m.is_active ? 'true' : 'false'].map(csvCell).join(','));
        }
      }
    }
    downloadFile('brand_models_export.csv', lines.join('\n'));
    toast.success(`Exported ${brands.length} brands`);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error('CSV has no data rows');
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (name: string) => header.indexOf(name);
      const iBrand = idx('brand_name');
      const iBrandSlug = idx('brand_slug');
      const iCategory = idx('category');
      const iModel = idx('model_name');
      const iModelSlug = idx('model_slug');
      const iActive = idx('active');
      if (iBrand === -1) throw new Error('Missing required column: brand_name');

      const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
      // De-dup brands within the file.
      const brandDefs = new Map<string, { name: string; slug: string; category_id: string | null }>();
      const modelDefs: { brandSlug: string; name: string; slug: string; is_active: boolean }[] = [];

      for (let r = 1; r < rows.length; r++) {
        const cols = rows[r];
        const bName = (cols[iBrand] || '').trim();
        if (!bName) continue;
        const bSlug = (iBrandSlug !== -1 ? cols[iBrandSlug] : '')?.trim() || slugify(bName);
        const catId = iCategory !== -1 ? (catByName.get((cols[iCategory] || '').trim().toLowerCase()) || null) : null;
        if (!brandDefs.has(bSlug)) brandDefs.set(bSlug, { name: bName, slug: bSlug, category_id: catId });
        const mName = iModel !== -1 ? (cols[iModel] || '').trim() : '';
        if (mName) {
          const mSlug = (iModelSlug !== -1 ? cols[iModelSlug] : '')?.trim() || slugify(mName);
          const activeRaw = iActive !== -1 ? (cols[iActive] || '').trim().toLowerCase() : 'true';
          modelDefs.push({ brandSlug: bSlug, name: mName, slug: mSlug, is_active: !['false', '0', 'no'].includes(activeRaw) });
        }
      }

      // Upsert brands by slug.
      const brandPayload = Array.from(brandDefs.values()).map((b, i) => ({
        name: b.name, slug: b.slug, category_id: b.category_id, is_active: true, sort_order: i,
      }));
      const { error: bErr } = await supabase.from('brands').upsert(brandPayload, { onConflict: 'slug' });
      if (bErr) throw bErr;

      // Re-fetch to resolve brand ids by slug.
      const { data: freshBrands, error: fErr } = await supabase.from('brands').select('id,slug');
      if (fErr) throw fErr;
      const idBySlug = new Map((freshBrands || []).map((b: any) => [b.slug, b.id]));

      // Upsert models by (brand_id, slug).
      const modelPayload = modelDefs
        .map((m) => ({ brand_id: idBySlug.get(m.brandSlug), name: m.name, slug: m.slug, is_active: m.is_active }))
        .filter((m) => !!m.brand_id);
      if (modelPayload.length) {
        const { error: mErr } = await supabase.from('product_models').upsert(modelPayload, { onConflict: 'brand_id,slug' });
        if (mErr) throw mErr;
      }

      toast.success(`Imported ${brandPayload.length} brands and ${modelPayload.length} models`);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminLayout>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
      <PageHeader
        title="Brands & Models"
        description="Structure listings by brand and model under categories. Import/export via CSV."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={downloadTemplate}><FileText className="h-4 w-4 mr-1" /> Template</Button>
            <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
            <Button size="sm" variant="outline" onClick={handleImportClick} disabled={importing}>
              <Upload className="h-4 w-4 mr-1" /> {importing ? 'Importing…' : 'Import CSV'}
            </Button>
            <Button size="sm" onClick={openCreateBrand}><Plus className="h-4 w-4 mr-1" /> Add brand</Button>
          </div>
        }
      />
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : brands.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No brands yet. Add a brand manually, or download the template and import a CSV to bulk-load
          brands and models (e.g. Samsung, Apple, Toyota, Yamaha…).
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
                        <span>
                          {m.name} <span className="text-muted-foreground text-xs">/{m.slug}</span>
                          {!m.is_active && <Badge variant="secondary" className="ml-2 text-[10px]">Inactive</Badge>}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditModel(m)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteModel(m.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
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
          <DialogHeader><DialogTitle>{editingModel ? 'Edit model' : 'New model'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value, slug: editingModel ? modelForm.slug : slugify(e.target.value) })} /></div>
            <div><Label>Slug</Label><Input value={modelForm.slug} onChange={(e) => setModelForm({ ...modelForm, slug: e.target.value })} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={modelForm.is_active} onCheckedChange={(v) => setModelForm({ ...modelForm, is_active: v })} /></div>
          </div>
          <DialogFooter><Button onClick={saveModel}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
