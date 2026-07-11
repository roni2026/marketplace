import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
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

const MOCK_INVENTORY: InventoryItem[] = Array.from({ length: 30 }, (_, i) => {
  const stock = Math.floor(Math.random() * 100);
  const reorder = 20;
  return {
    id: `inv_${i}`,
    name: `Product ${i + 1}`,
    stock,
    reorder_level: reorder,
    status: stock === 0 ? 'out_of_stock' : stock < reorder ? 'low_stock' : 'in_stock',
    warehouse: ['Dhaka Central', 'Chittagong', 'Sylhet'][i % 3],
    sku: `SKU-${(1000 + i).toString()}`,
  };
});

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
      setItems(MOCK_INVENTORY);
      setIsLoading(false);
    }
  }, [user, isAdmin, navigate]);

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const filtered = items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()));
  const lowStock = items.filter(i => i.status === 'low_stock').length;
  const outOfStock = items.filter(i => i.status === 'out_of_stock').length;
  const totalStock = items.reduce((s, i) => s + i.stock, 0);

  const chartData = Array.from({ length: 14 }, (_, i) => ({
    date: format(subDays(new Date(), 13 - i), 'MMM d'),
    stock: Math.floor(Math.random() * 500) + 200,
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
          filtered.slice(0, 15).map(item => (
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
