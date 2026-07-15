import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { logUserAction } from '@/lib/audit';
import {
  Store, Search, Download, ShieldCheck, Star, TrendingUp, Package,
  Eye, AlertTriangle, CheckCircle, XCircle, FileText, DollarSign,
} from 'lucide-react';

interface Seller {
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  division: string | null;
  district: string | null;
  is_verified: boolean | null;
  is_suspended: boolean | null;
  created_at: string;
  ad_count?: number;
  seller_rating?: number;
  total_sales?: number;
  total_followers?: number;
  trust_score?: number;
  response_rate?: number;
  bio?: string | null;
}

export default function Sellers() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) fetchSellers();
  }, [user, isAdmin, navigate]);

  const fetchSellers = async () => {
    setIsLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*, user_roles(role)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Get ad counts per seller
    const { data: adCounts } = await supabase
      .from('ads')
      .select('user_id');

    const countMap = new Map<string, number>();
    (adCounts || []).forEach((a: any) => {
      countMap.set(a.user_id, (countMap.get(a.user_id) || 0) + 1);
    });

    // Get profile stats for reputation data
    const sellerUserIds = ((profiles as any[]) || [])
      .filter(p => p.user_roles?.some((r: any) => ['seller', 'admin', 'super_admin'].includes(r.role)) || (countMap.get(p.user_id) || 0) > 0)
      .map(p => p.user_id);

    const { data: statsData } = await supabase
      .from('profile_stats')
      .select('*')
      .in('user_id', sellerUserIds);

    const statsMap = new Map<string, any>();
    (statsData || []).forEach((s: any) => statsMap.set(s.user_id, s));

    const sellersWithCounts = ((profiles as any[]) || [])
      .filter(p => p.user_roles?.some((r: any) => ['seller', 'admin', 'super_admin'].includes(r.role)) || (countMap.get(p.user_id) || 0) > 0)
      .map(p => {
        const stats = statsMap.get(p.user_id);
        return {
          ...p,
          ad_count: countMap.get(p.user_id) || 0,
          seller_rating: p.seller_rating || stats?.seller_rating || 0,
          total_sales: p.total_sales || stats?.total_sales || 0,
          total_followers: p.total_followers || stats?.total_followers || 0,
          trust_score: stats?.trust_score || 50,
          response_rate: p.response_rate || stats?.response_rate || 0,
          bio: p.bio || null,
        };
      });

    setSellers(sellersWithCounts);
    setIsLoading(false);
  };

  const handleVerify = async (userId: string, current: boolean | null) => {
    const { error } = await supabase.from('profiles').update({ is_verified: !current, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (error) { toast.error('Failed'); return; }
    await logUserAction('verify', userId, { verified: !current });
    toast.success(!current ? 'Seller verified' : 'Verification removed');
    fetchSellers();
  };

  const filteredSellers = sellers.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.full_name?.toLowerCase().includes(q) || s.phone_number?.includes(q) || s.district?.toLowerCase().includes(q);
  });

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Sellers"
        description="Manage seller accounts, verification, KYC, and performance"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }, { label: 'Sellers' }]}
        actions={<Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Export</Button>}
      />

      <StatCardGrid>
        <StatCard title="Total Sellers" value={sellers.length} icon={Store} color="blue" loading={isLoading} />
        <StatCard title="Verified" value={sellers.filter(s => s.is_verified).length} icon={ShieldCheck} color="green" loading={isLoading} />
        <StatCard title="Suspended" value={sellers.filter(s => s.is_suspended).length} icon={AlertTriangle} color="red" loading={isLoading} />
        <StatCard title="Total Listings" value={sellers.reduce((sum, s) => sum + (s.ad_count || 0), 0)} icon={Package} color="purple" loading={isLoading} />
      </StatCardGrid>

      <div className="flex items-center gap-2 mt-6 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sellers..." className="pl-8 h-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      ) : filteredSellers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No sellers found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSellers.map(seller => (
            <Card key={seller.user_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    {seller.avatar_url ? <img src={seller.avatar_url} alt={seller.full_name || 'Seller'} className="h-full w-full object-cover" /> : null}
                    <AvatarFallback>{(seller.full_name || '?')[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-sm truncate">{seller.full_name || 'Unknown'}</h3>
                      {seller.is_verified && <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{seller.phone_number || 'No phone'}</p>
                    <p className="text-xs text-muted-foreground">{seller.district || 'Unknown location'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 rounded-lg bg-accent/50">
                    <p className="text-lg font-bold">{seller.ad_count || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Listings</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-accent/50">
                    <p className="text-lg font-bold">{seller.seller_rating ? seller.seller_rating.toFixed(1) : '—'}</p>
                    <p className="text-[10px] text-muted-foreground">Rating</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-accent/50">
                    <p className="text-lg font-bold">{seller.total_sales || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Sales</p>
                  </div>
                </div>

                {/* Trust Score */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Trust Score</span>
                    <span className="text-xs font-medium">{Math.round(seller.trust_score || 50)}/100</span>
                  </div>
                  <Progress value={seller.trust_score || 50} className="h-1.5" />
                </div>

                <div className="flex items-center gap-2">
                  {seller.is_suspended ? (
                    <Badge variant="destructive" className="text-xs">Suspended</Badge>
                  ) : seller.is_verified ? (
                    <Badge className="text-xs bg-blue-500 hover:bg-blue-500">Verified Seller</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Unverified</Badge>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleVerify(seller.user_id, seller.is_verified)}>
                      {seller.is_verified ? 'Revoke' : 'Verify'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View Profile" onClick={() => navigate(`/user/${seller.user_id}`)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
