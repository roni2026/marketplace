import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useListingManagement } from '@/hooks/useListingManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Edit, Trash2, ArrowUp, ArrowDown, Tag, CheckSquare, FolderTree, Loader2, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Category { id: string; name: string; slug: string; }

export default function ListingManagement() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const {
    allListingTypes, allItemConditions, categoryAttributes,
    fetchAllListingTypes, fetchAllItemConditions, fetchCategoryAttributes,
    createListingType, updateListingType, deleteListingType,
    createItemCondition, updateItemCondition, deleteItemCondition,
    createCategoryAttribute, updateCategoryAttribute, deleteCategoryAttribute,
  } = useListingManagement();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showConditionDialog, setShowConditionDialog] = useState(false);
  const [showAttrDialog, setShowAttrDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // Form state
  const [typeForm, setTypeForm] = useState({ name: '', slug: '', description: '', sort_order: 0, is_active: true, is_digital: false, is_service: false });
  const [condForm, setCondForm] = useState({ name: '', slug: '', description: '', sort_order: 0, is_active: true });
  const [attrForm, setAttrForm] = useState({ name: '', slug: '', data_type: 'text', is_required: false, is_filterable: false, options: '', unit: '', sort_order: 0 });

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) {
      Promise.all([
        fetchAllListingTypes(),
        fetchAllItemConditions(),
        supabase.from('categories').select('*').order('sort_order'),
      ]).then(([, , catRes]) => {
        if (catRes.data) {
          setCategories(catRes.data);
          if (catRes.data.length > 0) {
            setSelectedCategoryId(catRes.data[0].id);
          }
        }
        setIsLoading(false);
      });
    }
  }, [user, isAdmin, navigate, fetchAllListingTypes, fetchAllItemConditions]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchCategoryAttributes(selectedCategoryId);
    }
  }, [selectedCategoryId, fetchCategoryAttributes]);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

  // Listing Type handlers
  const openTypeDialog = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setTypeForm({ name: item.name, slug: item.slug, description: item.description || '', sort_order: item.sort_order, is_active: item.is_active, is_digital: item.is_digital, is_service: item.is_service });
    } else {
      setEditingItem(null);
      setTypeForm({ name: '', slug: '', description: '', sort_order: allListingTypes.length + 1, is_active: true, is_digital: false, is_service: false });
    }
    setShowTypeDialog(true);
  };

  const handleSaveType = async () => {
    if (!typeForm.name || !typeForm.slug) { toast.error('Name and slug are required'); return; }
    if (editingItem) {
      await updateListingType(editingItem.id, { ...typeForm, description: typeForm.description || null });
    } else {
      await createListingType({ ...typeForm, description: typeForm.description || null });
    }
    setShowTypeDialog(false);
    fetchAllListingTypes();
  };

  // Condition handlers
  const openCondDialog = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setCondForm({ name: item.name, slug: item.slug, description: item.description || '', sort_order: item.sort_order, is_active: item.is_active });
    } else {
      setEditingItem(null);
      setCondForm({ name: '', slug: '', description: '', sort_order: allItemConditions.length + 1, is_active: true });
    }
    setShowConditionDialog(true);
  };

  const handleSaveCond = async () => {
    if (!condForm.name || !condForm.slug) { toast.error('Name and slug are required'); return; }
    if (editingItem) {
      await updateItemCondition(editingItem.id, { ...condForm, description: condForm.description || null });
    } else {
      await createItemCondition({ ...condForm, description: condForm.description || null });
    }
    setShowConditionDialog(false);
    fetchAllItemConditions();
  };

  // Attribute handlers
  const openAttrDialog = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setAttrForm({ name: item.name, slug: item.slug, data_type: item.data_type, is_required: item.is_required, is_filterable: item.is_filterable, options: (item.options || []).join(', '), unit: item.unit || '', sort_order: item.sort_order });
    } else {
      setEditingItem(null);
      setAttrForm({ name: '', slug: '', data_type: 'text', is_required: false, is_filterable: false, options: '', unit: '', sort_order: categoryAttributes.length + 1 });
    }
    setShowAttrDialog(true);
  };

  const handleSaveAttr = async () => {
    if (!attrForm.name || !attrForm.slug || !selectedCategoryId) { toast.error('Name and slug are required'); return; }
    const optionsArray = attrForm.options ? attrForm.options.split(',').map(s => s.trim()).filter(Boolean) : [];
    const payload = {
      category_id: selectedCategoryId,
      name: attrForm.name,
      slug: attrForm.slug,
      data_type: attrForm.data_type as any,
      is_required: attrForm.is_required,
      is_filterable: attrForm.is_filterable,
      options: optionsArray,
      unit: attrForm.unit || null,
      sort_order: attrForm.sort_order,
    };
    if (editingItem) {
      await updateCategoryAttribute(editingItem.id, payload);
    } else {
      await createCategoryAttribute(payload);
    }
    setShowAttrDialog(false);
    fetchCategoryAttributes(selectedCategoryId);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'listingType') await deleteListingType(deleteTarget.id);
    else if (deleteTarget.type === 'condition') await deleteItemCondition(deleteTarget.id);
    else if (deleteTarget.type === 'attribute') {
      await deleteCategoryAttribute(deleteTarget.id);
      if (selectedCategoryId) fetchCategoryAttributes(selectedCategoryId);
    }
    setDeleteTarget(null);
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Listing Management"
        description="Configure listing types, item conditions, and category attributes"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Listing Management' }]}
      />

      <Tabs defaultValue="types" className="space-y-4">
        <TabsList>
          <TabsTrigger value="types" className="gap-2"><Tag className="h-4 w-4" /> Listing Types</TabsTrigger>
          <TabsTrigger value="conditions" className="gap-2"><CheckSquare className="h-4 w-4" /> Conditions</TabsTrigger>
          <TabsTrigger value="attributes" className="gap-2"><FolderTree className="h-4 w-4" /> Attributes</TabsTrigger>
        </TabsList>

        {/* Listing Types Tab */}
        <TabsContent value="types" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Manage the types of listings sellers can create</p>
            <Button onClick={() => openTypeDialog()} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Listing Type</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Sort</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-center">Digital</TableHead>
                        <TableHead className="text-center">Service</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allListingTypes.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{t.slug}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{t.description || '—'}</TableCell>
                          <TableCell className="text-center">{t.sort_order}</TableCell>
                          <TableCell className="text-center">{t.is_active ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                          <TableCell className="text-center">{t.is_digital ? <Badge variant="outline">Yes</Badge> : '—'}</TableCell>
                          <TableCell className="text-center">{t.is_service ? <Badge variant="outline">Yes</Badge> : '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openTypeDialog(t)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'listingType', id: t.id, name: t.name })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {allListingTypes.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No listing types configured</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conditions Tab */}
        <TabsContent value="conditions" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Manage item conditions available to sellers</p>
            <Button onClick={() => openCondDialog()} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Condition</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Sort</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allItemConditions.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{c.slug}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.description || '—'}</TableCell>
                          <TableCell className="text-center">{c.sort_order}</TableCell>
                          <TableCell className="text-center">{c.is_active ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openCondDialog(c)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'condition', id: c.id, name: c.name })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {allItemConditions.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No conditions configured</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attributes Tab */}
        <TabsContent value="attributes" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex-1 max-w-xs">
              <Label className="text-xs mb-1.5 block">Select Category</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => openAttrDialog()} size="sm" className="gap-2" disabled={!selectedCategoryId}><Plus className="h-4 w-4" /> Add Attribute</Button>
            </div>
          </div>
          <Card>
            <CardContent className="p-0">
              {isLoading || !selectedCategoryId ? (
                <div className="p-6 space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Data Type</TableHead>
                        <TableHead className="text-center">Required</TableHead>
                        <TableHead className="text-center">Filterable</TableHead>
                        <TableHead>Options</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-center">Sort</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryAttributes.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{a.slug}</TableCell>
                          <TableCell><Badge variant="outline">{a.data_type}</Badge></TableCell>
                          <TableCell className="text-center">{a.is_required ? <Badge variant="default">Yes</Badge> : '—'}</TableCell>
                          <TableCell className="text-center">{a.is_filterable ? <Badge variant="default">Yes</Badge> : '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{(a.options || []).join(', ') || '—'}</TableCell>
                          <TableCell className="text-xs">{a.unit || '—'}</TableCell>
                          <TableCell className="text-center">{a.sort_order}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openAttrDialog(a)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'attribute', id: a.id, name: a.name })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {categoryAttributes.length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No attributes configured for this category</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Listing Type Dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Listing Type' : 'Add Listing Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value, slug: editingItem ? typeForm.slug : generateSlug(e.target.value) })} placeholder="e.g. New" />
            </div>
            <div>
              <Label>Slug *</Label>
              <Input value={typeForm.slug} onChange={e => setTypeForm({ ...typeForm, slug: e.target.value })} placeholder="new" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={typeForm.description} onChange={e => setTypeForm({ ...typeForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={typeForm.sort_order} onChange={e => setTypeForm({ ...typeForm, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={typeForm.is_active} onCheckedChange={v => setTypeForm({ ...typeForm, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={typeForm.is_digital} onCheckedChange={v => setTypeForm({ ...typeForm, is_digital: v })} />
                <Label>Digital Product</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={typeForm.is_service} onCheckedChange={v => setTypeForm({ ...typeForm, is_service: v })} />
                <Label>Service</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTypeDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveType}>{editingItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Condition Dialog */}
      <Dialog open={showConditionDialog} onOpenChange={setShowConditionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Condition' : 'Add Condition'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={condForm.name} onChange={e => setCondForm({ ...condForm, name: e.target.value, slug: editingItem ? condForm.slug : generateSlug(e.target.value) })} placeholder="e.g. Brand New" />
            </div>
            <div>
              <Label>Slug *</Label>
              <Input value={condForm.slug} onChange={e => setCondForm({ ...condForm, slug: e.target.value })} placeholder="brand-new" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={condForm.description} onChange={e => setCondForm({ ...condForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={condForm.sort_order} onChange={e => setCondForm({ ...condForm, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={condForm.is_active} onCheckedChange={v => setCondForm({ ...condForm, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConditionDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCond}>{editingItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attribute Dialog */}
      <Dialog open={showAttrDialog} onOpenChange={setShowAttrDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Attribute' : 'Add Attribute'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={attrForm.name} onChange={e => setAttrForm({ ...attrForm, name: e.target.value, slug: editingItem ? attrForm.slug : generateSlug(e.target.value) })} placeholder="e.g. Storage" />
            </div>
            <div>
              <Label>Slug *</Label>
              <Input value={attrForm.slug} onChange={e => setAttrForm({ ...attrForm, slug: e.target.value })} placeholder="storage" />
            </div>
            <div>
              <Label>Data Type</Label>
              <Select value={attrForm.data_type} onValueChange={v => setAttrForm({ ...attrForm, data_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="select">Select (single)</SelectItem>
                  <SelectItem value="multiselect">Multi-Select</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(attrForm.data_type === 'select' || attrForm.data_type === 'multiselect') && (
              <div>
                <Label>Options (comma-separated)</Label>
                <Input value={attrForm.options} onChange={e => setAttrForm({ ...attrForm, options: e.target.value })} placeholder="16GB, 32GB, 64GB" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit</Label>
                <Input value={attrForm.unit} onChange={e => setAttrForm({ ...attrForm, unit: e.target.value })} placeholder="kg, inches" />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={attrForm.sort_order} onChange={e => setAttrForm({ ...attrForm, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={attrForm.is_required} onCheckedChange={v => setAttrForm({ ...attrForm, is_required: v })} />
                <Label>Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={attrForm.is_filterable} onCheckedChange={v => setAttrForm({ ...attrForm, is_filterable: v })} />
                <Label>Filterable</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttrDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAttr}>{editingItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete this item.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
