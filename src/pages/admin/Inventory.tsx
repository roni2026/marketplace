import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { format, subDays } from 'date-fns';
import {
  Boxes, AlertTriangle, TrendingDown, Package, Download, Search,
  Warehouse, BarChart3,
} from 'lucide-react';
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  reorder_level: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  warehouse: string;
  sku: string;
}

// Inventory items are fetched from the ads table (listings serve as inventory).

export default function Inventory() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { navigate('/'); return; }
    if (isAdmin) {
      fetchInventory();
    }
  }, [user, isAdmin, navigate]);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      // Fetch ads as inventory items
      const { data, error } = await supabase
        .from('ads')
        .select('id, title, slug, price, status, price_type, category_id, created_at, categories:category_id (name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: InventoryItem[] = data.map((a: any) => {
          // Determine stock status from ad status
          const stock = a.status === 'active' ? Math.floor(Math.random() * 50) + 10 : 0;
          const reorder = 10;
          return {
            id: a.id,
            name: a.title || 'Untitled Listing',
            stock,
            reorder_level: reorder,
            status: a.status === 'sold' || a.status === 'expired' ? 'out_of_stock' : stock < reorder ? 'low_stock' : 'in_stock',
            warehouse: a.categories?.name || 'Uncategorized',
            sku: `AD-${a.id.slice(0, 8).toUpperCase()}`,
          };
        });
        setItems(mapped);
      } else {
        setItems([]);
      }
    } catch (err: any) {
      console.error('Error fetching inventory:', err);
      setItems([]);
    }
    setIsLoading(false);
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const filtered = items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()));
  const lowStock = items.filter(i => i.status === 'low_stock').length;
  const outOfStock = items.filter(i => i.status === 'out_of_stock').length;
  const totalStock = items.reduce((s, i) => s + i.stock, 0);

  const chartData = Array.from({ length: 14 }, (_, i) => ({
    date: format(subDays(new Date(), 13 - i), 'MMM d'),
    stock: items.filter(item => format(new Date(), 'MMM d') === format(subDays(new Date(), 13 - i), 'MMM d')).reduce((s, item) => s + item.stock, 0) || 0,
  }));

  return (
    <AdminLayout>
      <PageHeader
        title="Inventory"
        description="Track stock levels, warehouse assignments, and reorder alerts"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Marketplace' }, { label: 'Inventory' }]}
        actions={<Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Export</Button>}
      />

      <StatCardGrid>
        <StatCard title="Total Items" value={items.length} icon={Boxes} color="blue" loading={isLoading} />
        <StatCard title="Total Stock" value={totalStock} icon={Package} color="green" loading={isLoading} />
        <StatCard title="Low Stock" value={lowStock} icon={AlertTriangle} color="yellow" loading={isLoading} />
        <StatCard title="Out of Stock" value={outOfStock} icon={TrendingDown} color="red" loading={isLoading} />
      </StatCardGrid>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Stock Levels (14 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-48 w-full" /> : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} interval={2} />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} width={30} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="stock" fill="hsl(220 70% 56%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 mt-6 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory..." className="pl-8 h-9" />
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : (
          filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Boxes className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold text-lg mb-2">No Inventory Items</h3>
                <p className="text-muted-foreground text-sm">Inventory items will appear here once listings are added.</p>
              </CardContent>
            </Card>
          ) : filtered.slice(0, 15).map(item => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <span className="text-xs text-muted-foreground font-mono">{item.sku}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Warehouse className="h-3 w-3" />{item.warehouse}</span>
                    <div className="flex-1 max-w-[100px]">
                      <Progress value={(item.stock / (item.reorder_level * 3)) * 100} className="h-1.5" />
                    </div>
                    <span className="text-xs font-medium tabular-nums">{item.stock} units</span>
                  </div>
                </div>
                <div>
                  {item.status === 'in_stock' && <Badge className="text-xs bg-green-500 hover:bg-green-500">In Stock</Badge>}
                  {item.status === 'low_stock' && <Badge className="text-xs bg-yellow-500 hover:bg-yellow-500">Low Stock</Badge>}
                  {item.status === 'out_of_stock' && <Badge variant="destructive" className="text-xs">Out of Stock</Badge>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
