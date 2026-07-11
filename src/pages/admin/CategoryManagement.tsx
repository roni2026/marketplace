import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import { FolderTree, Plus, Edit, Trash2, ChevronRight, Search } from 'lucide-react';
import { generateSlug } from '@/lib/constants';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number | null;
  meta_title: string | null;
  meta_description: string | null;
  is_active: boolean | null;
  subcategories: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}

const CATEGORY_ICONS = [
  'Smartphone', 'Car', 'Home', 'Briefcase', 'Shirt', 'Wrench', 'Sofa', 'GraduationCap',
  'Laptop', 'Camera', 'Gamepad2', 'Bike', 'Boat', 'Plane', 'Building', 'Dog', 'Cat',
  'Book', 'Music', 'PaintBucket', 'Hammer', 'Scissors', 'Pill', 'Dumbbell',
];

export default function CategoryManagement() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubcategory, setIsSubcategory] = useState(false);
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('Smartphone');
  const [sortOrder, setSortOrder] = useState('0');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchCategories();
    }
  }, [user, isAdmin, navigate]);

  const fetchCategories = async () => {
    setIsLoading(true);
    const [catRes, subRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('subcategories').select('*'),
    ]);

    const cats = (catRes.data as Category[]) || [];
    const subs = (subRes.data as Subcategory[]) || [];

    // Group subcategories under their parent categories
    const grouped = cats.map(cat => ({
      ...cat,
      subcategories: subs.filter(s => s.category_id === cat.id),
    }));

    setCategories(grouped);
    setSubcategories(subs);
    setIsLoading(false);
  };

  const openAddDialog = (isSub: boolean = false, parentId?: string) => {
    setEditingCategory(null);
    setIsSubcategory(isSub);
    setParentCategoryId(parentId || '');
    setName('');
    setSlug('');
    setIcon('Smartphone');
    setSortOrder('0');
    setMetaTitle('');
    setMetaDescription('');
    setIsActive(true);
    setShowDialog(true);
  };

  const openEditDialog = (category: Category, isSub: boolean = false) => {
    setEditingCategory(category);
    setIsSubcategory(isSub);
    setParentCategoryId(category.parent_id || '');
    setName(category.name);
    setSlug(category.slug);
    setIcon(category.icon || 'Smartphone');
    setSortOrder(String(category.sort_order || 0));
    setMetaTitle(category.meta_title || '');
    setMetaDescription(category.meta_description || '');
    setIsActive(category.is_active ?? true);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    const finalSlug = slug.trim() || generateSlug(name);
    const payload = {
      name: name.trim(),
      slug: finalSlug,
      icon,
      sort_order: parseInt(sortOrder) || 0,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    if (editingCategory) {
      if (isSubcategory) {
        const { error } = await supabase
          .from('subcategories')
          .update({ name: name.trim(), slug: finalSlug })
          .eq('id', editingCategory.id);
        if (error) {
          toast.error('Failed to update subcategory');
        } else {
          toast.success('Subcategory updated');
        }
      } else {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id);
        if (error) {
          toast.error('Failed to update category');
        } else {
          toast.success('Category updated');
        }
      }
    } else {
      if (isSubcategory) {
        const { error } = await supabase
          .from('subcategories')
          .insert({
            name: name.trim(),
            slug: finalSlug,
            category_id: parentCategoryId,
          });
        if (error) {
          toast.error('Failed to create subcategory');
        } else {
          toast.success('Subcategory created');
        }
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(payload);
        if (error) {
          toast.error('Failed to create category');
        } else {
          toast.success('Category created');
        }
      }
    }

    setShowDialog(false);
    fetchCategories();
  };

  const handleDelete = async (id: string, isSub: boolean) => {
    const table = isSub ? 'subcategories' : 'categories';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Deleted successfully');
      fetchCategories();
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  const filteredCategories = categories.filter(c => 
    !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Category Management</h1>
          <p className="text-muted-foreground">Manage categories, subcategories, icons, and SEO</p>
        </div>
        <Button className="gap-2" onClick={() => openAddDialog()}>
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderTree className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No categories found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCategories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs">{category.icon?.slice(0, 2) || '📁'}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{category.name}</h3>
                        {category.is_active === false && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">/{category.slug}</p>
                      {category.meta_title && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          SEO: {category.meta_title}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openAddDialog(true, category.id)}
                      title="Add subcategory"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(category.id, false)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Subcategories */}
                {category.subcategories.length > 0 && (
                  <div className="mt-3 pl-13 space-y-1 border-l-2 border-border ml-5">
                    {category.subcategories.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between gap-2 py-1.5 pl-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{sub.name}</span>
                          <span className="text-xs text-muted-foreground">/{sub.slug}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditDialog(sub as unknown as Category, true)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(sub.id, true)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit' : 'Add'} {isSubcategory ? 'Subcategory' : 'Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingCategory) setSlug(generateSlug(e.target.value));
                }}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated"
              />
            </div>
            {!isSubcategory && (
              <>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={icon} onValueChange={setIcon}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_ICONS.map((ic) => (
                        <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Active</Label>
                    <Select value={isActive ? 'true' : 'false'} onValueChange={(v) => setIsActive(v === 'true')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">SEO Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="SEO title for search engines"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDesc">SEO Meta Description</Label>
                  <Input
                    id="metaDesc"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="SEO description for search engines"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
