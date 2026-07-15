import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, Column } from '@/components/admin/DataTable';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { formatPrice } from '@/lib/constants';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Package, Search, Download, Upload, Plus, Star, Eye, Heart,
  TrendingUp, DollarSign, ShoppingCart, AlertTriangle, Tag,
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  price_type: string;
  status: string;
  condition: string;
  is_featured: boolean;
  views_count: number;
  created_at: string;
  categories: { name: string } | null;
  profiles: { full_name: string | null } | null;
  ad_images: { image_url: string }[];
}

export default function Products() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) fetchProducts();
  }, [user, isAdmin, navigate]);

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('ads')
      .select('*, ad_images(image_url), categories(name), profiles!ads_user_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(200);
    setProducts((data as Product[]) || []);
    setIsLoading(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const { error } = await supabase.from('ads').delete().in('id', [...selectedIds]);
    if (error) { toast.error('Failed to delete products'); return; }
    toast.success(`${selectedIds.size} products deleted`);
    setSelectedIds(new Set());
    fetchProducts();
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const { error } = await supabase.from('ads').update({ status: 'approved', updated_at: new Date().toISOString() }).in('id', [...selectedIds]);
    if (error) { toast.error('Failed to approve products'); return; }
    toast.success(`${selectedIds.size} products approved`);
    setSelectedIds(new Set());
    fetchProducts();
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const columns: Column<Product>[] = [
    {
      key: 'title', label: 'Product', sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
            <img src={p.ad_images?.[0]?.image_url || '/placeholder.svg'} alt={p.title} className="w-full h-full object-cover" onError={e => { e.currentTarget.src = '/placeholder.svg'; }} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{p.title}</p>
            <p className="text-xs text-muted-foreground">{p.categories?.name || 'Uncategorized'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'price', label: 'Price', sortable: true,
      render: (p) => <span className="font-medium text-sm">{formatPrice(p.price, p.price_type)}</span>,
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (p) => {
        const colors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          sold: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        };
        return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[p.status] || 'bg-gray-100'}`}>{p.status}</span>;
      },
    },
    {
      key: 'condition', label: 'Condition', sortable: true,
      render: (p) => <span className="text-sm capitalize">{p.condition}</span>,
    },
    {
      key: 'views_count', label: 'Views', sortable: true,
      render: (p) => <span className="text-sm tabular-nums">{p.views_count || 0}</span>,
    },
    {
      key: 'is_featured', label: 'Featured',
      render: (p) => p.is_featured ? <Star className="h-4 w-4 text-yellow-500 fill-current" /> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      render: (p) => <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>,
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Products"
        description="Manage all marketplace listings, bulk actions, and inventory"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Marketplace' }, { label: 'Products' }]}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Export</Button>
            <Button variant="outline" size="sm" className="gap-2"><Upload className="h-3.5 w-3.5" /> Import</Button>
            <Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Add Product</Button>
          </>
        }
      />

      <StatCardGrid>
        <StatCard title="Total Products" value={products.length} icon={Package} color="blue" loading={isLoading} />
        <StatCard title="Approved" value={products.filter(p => p.status === 'approved').length} icon={TrendingUp} color="green" loading={isLoading} />
        <StatCard title="Pending" value={products.filter(p => p.status === 'pending').length} icon={AlertTriangle} color="yellow" loading={isLoading} />
        <StatCard title="Featured" value={products.filter(p => p.is_featured).length} icon={Star} color="purple" loading={isLoading} />
      </StatCardGrid>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={products}
          searchable
          searchPlaceholder="Search products..."
          searchKeys={['title', 'status', 'condition']}
          loading={isLoading}
          selectable
          getRowId={(p) => p.id}
          bulkActions={
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleBulkApprove}>Approve</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={handleBulkDelete}>Delete</Button>
            </>
          }
          onRowClick={(p) => navigate(`/ad/${p.slug}`)}
        />
      </div>
    </AdminLayout>
  );
}
