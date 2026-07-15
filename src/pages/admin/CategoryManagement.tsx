/**
 * CategoryManagement — Admin category CRUD with nested tree, SEO fields, and dialogs.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FolderTree, Plus, Edit2, Trash2, ChevronRight, ChevronDown, Download } from 'lucide-react';
import { exportData, downloadExport } from '@/lib/adminPortal';

interface Category {
  id: string; name: string; slug: string; parent_id: string | null;
  icon: string | null; is_active: boolean; sort_order: number;
  seo_title: string | null; seo_description: string | null; created_at: string;
}

export default function CategoryManagement() {
  const { user } = useAuth();
  const { logActivity } = useAdminPortal();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', parent_id: 'none', icon: '', sort_order: '0', is_active: true, seo_title: '', seo_description: '' });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    setCategories((data as Category[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const rootCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories]);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleEdit = (cat: Category) => {
    setEditing(cat);
    setFormData({ name: cat.name, slug: cat.slug, parent_id: cat.parent_id || 'none', icon: cat.icon || '', sort_order: String(cat.sort_order), is_active: cat.is_active, seo_title: cat.seo_title || '', seo_description: cat.seo_description || '' });
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setFormData({ name: '', slug: '', parent_id: 'none', icon: '', sort_order: '0', is_active: true, seo_title: '', seo_description: '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
      parent_id: formData.parent_id === 'none' ? null : formData.parent_id,
      icon: formData.icon || null,
      sort_order: parseInt(formData.sort_order) || 0,
      is_active: formData.is_active,
      seo_title: formData.seo_title || null,
      seo_description: formData.seo_description || null,
    };
    if (editing) {
      const { error } = await supabase.from('categories').update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update category'); return; }
      // Keep legacy subcategories table in sync when using parent_id nesting.
      if (payload.parent_id) {
        await supabase.from('subcategories').delete().eq('slug', payload.slug);
        await supabase.from('subcategories').insert({
          category_id: payload.parent_id,
          name: payload.name,
          slug: payload.slug,
        });
      }
      if (user) await logActivity('update_category', 'category', editing.id, { name: formData.name });
      toast.success('Category updated');
    } else {
      const { data: created, error } = await supabase.from('categories').insert(payload).select('id').single();
      if (error) { toast.error('Failed to create category'); return; }
      if (payload.parent_id && created?.id) {
        await supabase.from('subcategories').insert({
          category_id: payload.parent_id,
          name: payload.name,
          slug: payload.slug,
        });
      }
      if (user) await logActivity('create_category', 'category', created?.id, { name: formData.name });
      toast.success('Category created');
    }
    setShowForm(false);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    const children = getChildren(id);
    if (children.length > 0) { toast.error('Cannot delete category with subcategories'); setConfirmDelete(null); return; }
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast.error('Failed to delete category'); return; }
    if (user) await logActivity('delete_category', 'category', id);
    toast.success('Category deleted');
    setConfirmDelete(null);
    fetchCategories();
  };

  const handleExport = async () => {
    const csv = await exportData('categories', 'csv');
    if (csv) downloadExport(csv, 'categories_export.csv', 'csv');
  };

  const renderCategory = (cat: Category, level: number = 0) => {
    const children = getChildren(cat.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(cat.id);
    return (
      <div key={cat.id}>
        <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2 hover:bg-accent/30" style={{ paddingLeft: `${12 + level * 20}px` }}>
          {hasChildren ? (
            <button onClick={() => toggleExpand(cat.id)} className="text-muted-foreground">{isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</button>
          ) : <span className="w-3.5" />}
          <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex-1 text-xs font-medium">{cat.name}</span>
          <Badge variant="secondary" className="text-[9px]">{cat.slug}</Badge>
          <Badge variant={cat.is_active ? 'success' : 'secondary'} className="text-[9px]">{cat.is_active ? 'Active' : 'Inactive'}</Badge>
          <span className="text-[10px] text-muted-foreground">Order: {cat.sort_order}</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEdit(cat)}><Edit2 className="h-3 w-3" /></Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600" onClick={() => setConfirmDelete(cat.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
        {isExpanded && hasChildren && children.map(child => renderCategory(child, level + 1))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <PageHeader title="Category Management" description={`${categories.length} categories`} actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExport}><Download className="h-3.5 w-3.5" /> Export</Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAdd}><Plus className="h-3.5 w-3.5" /> Add Category</Button>
        </div>
      } />
      <StatCardGrid>
        <StatCard title="Total Categories" value={categories.length} icon={FolderTree} color="blue" loading={loading} />
        <StatCard title="Active" value={categories.filter(c => c.is_active).length} icon={FolderTree} color="green" loading={loading} />
        <StatCard title="Inactive" value={categories.filter(c => !c.is_active).length} icon={FolderTree} color="red" loading={loading} />
        <StatCard title="Root Categories" value={rootCategories.length} icon={FolderTree} color="purple" loading={loading} />
      </StatCardGrid>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-md border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">{editing ? 'Edit Category' : 'New Category'}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><Label className="text-xs">Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Slug</Label><Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="auto-generated" className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Parent Category</Label>
              <Select value={formData.parent_id} onValueChange={(v) => setFormData({ ...formData, parent_id: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /><SelectContent><SelectItem value="none">None (Root)</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></SelectTrigger>
              </Select>
            </div>
            <div><Label className="text-xs">Icon (emoji or URL)</Label><Input value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Sort Order</Label><Input type="number" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })} className="h-8 text-xs" /></div>
            <div className="flex items-center gap-2 pt-5"><Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} /><Label className="text-xs">Active</Label></div>
            <div><Label className="text-xs">SEO Title</Label><Input value={formData.seo_title} onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })} className="h-8 text-xs" maxLength={60} /></div>
            <div><Label className="text-xs">SEO Description</Label><Input value={formData.seo_description} onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })} className="h-8 text-xs" maxLength={160} /></div>
          </div>
          <div className="mt-3 flex justify-end gap-2"><Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" size="sm" className="h-8 text-xs">{editing ? 'Update' : 'Create'}</Button></div>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-md border border-border bg-card">
        {loading ? <div className="space-y-2 p-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div> :
         rootCategories.length === 0 ? <p className="py-12 text-center text-xs text-muted-foreground">No categories found</p> :
         rootCategories.map(cat => renderCategory(cat))}
      </div>

      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Delete Category</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">This will permanently delete this category. Listings in this category will be uncategorized.</p>
          <DialogFooter><Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
