import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { DataTable, Column } from '@/components/admin/DataTable';
import { toast } from 'sonner';
import { logAudit } from '@/lib/audit';
import {
  Store, Search, ShieldCheck, Star, Package, Users,
  TrendingUp, CheckCircle, XCircle, Eye, DollarSign,
} from 'lucide-react';

interface Shop {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_verified: boolean;
  is_featured: boolean;
  is_premium: boolean;
  is_vacation_mode: boolean;
  total_followers: number;
  total_products: number;
  total_sales: number;
  total_revenue: number;
  avg_rating: number;
  total_reviews: number;
  created_at: string;
  owner_name?: string | null;
}

export default function ShopManagement() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) fetchShops();
  }, [user, isAdmin, navigate]);

  const fetchShops = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*, owner:profiles!shops_owner_id_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((s: any) => ({
        ...s,
        owner_name: s.owner?.full_name || null,
      }));
      setShops(mapped as Shop[]);
    } catch (err) {
      console.error('fetchShops error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFeatured = async (shopId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('shops')
        .update({ is_featured: !current })
        .eq('id', shopId);
      if (error) throw error;
      toast.success(`Shop ${!current ? 'featured' : 'unfeatured'}`);
      await logAudit({ action: 'update', resourceType: 'shop', resourceId: shopId, details: { is_featured: !current } });
      fetchShops();
    } catch (err) {
      toast.error('Failed to update shop');
    }
  };

  const handleToggleVerified = async (shopId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('shops')
        .update({ is_verified: !current })
        .eq('id', shopId);
      if (error) throw error;
      toast.success(`Shop ${!current ? 'verified' : 'unverified'}`);
      await logAudit({ action: 'verify', resourceType: 'shop', resourceId: shopId, details: { is_verified: !current } });
      fetchShops();
    } catch (err) {
      toast.error('Failed to update verification');
    }
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const filteredShops = shops.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Shop>[] = [
    {
      key: 'name', label: 'Shop', sortable: true,
      render: (s) => (
        <div className="flex items-center gap-2">
          {s.logo_url ? (
            <img src={s.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="h-4 w-4 text-primary" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{s.name}</p>
            <p className="text-xs text-muted-foreground">/{s.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'owner_name', label: 'Owner', sortable: true,
      render: (s) => <span className="text-sm">{s.owner_name || 'Unknown'}</span>,
    },
    {
      key: 'total_products', label: 'Products', sortable: true,
      render: (s) => <span className="text-sm tabular-nums">{s.total_products}</span>,
    },
    {
      key: 'total_sales', label: 'Sales', sortable: true,
      render: (s) => <span className="text-sm tabular-nums">{s.total_sales}</span>,
    },
    {
      key: 'avg_rating', label: 'Rating', sortable: true,
      render: (s) => (
        <span className="text-sm flex items-center gap-1">
          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
          {s.avg_rating}
        </span>
      ),
    },
    {
      key: 'is_verified', label: 'Verified', sortable: true,
      render: (s) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => handleToggleVerified(s.id, s.is_verified)}
        >
          {s.is_verified ? (
            <span className="flex items-center gap-1 text-blue-600"><CheckCircle className="h-3.5 w-3.5" /> Verified</span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground"><XCircle className="h-3.5 w-3.5" /> Unverified</span>
          )}
        </Button>
      ),
    },
    {
      key: 'is_featured', label: 'Featured', sortable: true,
      render: (s) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => handleToggleFeatured(s.id, s.is_featured)}
        >
          {s.is_featured ? (
            <span className="flex items-center gap-1 text-purple-600"><Star className="h-3.5 w-3.5" /> Featured</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Button>
      ),
    },
    {
      key: 'created_at', label: 'Created', sortable: true,
      render: (s) => <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>,
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Shop Management"
        description="Manage all shops, verifications, and memberships"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Marketplace' }, { label: 'Shops' }]}
      />

      <StatCardGrid>
        <StatCard title="Total Shops" value={shops.length} icon={Store} color="blue" loading={isLoading} />
        <StatCard title="Verified" value={shops.filter((s) => s.is_verified).length} icon={ShieldCheck} color="green" loading={isLoading} />
        <StatCard title="Featured" value={shops.filter((s) => s.is_featured).length} icon={Star} color="purple" loading={isLoading} />
        <StatCard title="Total Revenue" value={`৳${shops.reduce((sum, s) => sum + s.total_revenue, 0).toLocaleString()}`} icon={DollarSign} color="orange" loading={isLoading} />
      </StatCardGrid>

      <div className="mt-6">
        <Input
          placeholder="Search shops by name or URL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md mb-4"
        />
        <DataTable
          columns={columns}
          data={filteredShops}
          searchable={false}
          loading={isLoading}
          getRowId={(s) => s.id}
          onRowClick={(s) => navigate(`/shop/${s.slug}`)}
        />
      </div>
    </AdminLayout>
  );
}
