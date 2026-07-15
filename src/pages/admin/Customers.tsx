import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, Column } from '@/components/admin/DataTable';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { logUserAction } from '@/lib/audit';
import {
  Users, Search, Download, UserCheck, Shield, ShieldOff, BadgeCheck,
  UserX, TrendingUp, Star, MapPin,
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  division: string | null;
  district: string | null;
  is_blocked: boolean | null;
  is_verified: boolean | null;
  is_suspended: boolean | null;
  created_at: string;
  user_roles: { role: string }[];
}

export default function Customers() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) fetchUsers();
  }, [user, isAdmin, navigate]);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, user_roles(role)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setUsers((data as UserProfile[]) || []);
    setIsLoading(false);
  };

  const handleVerify = async (userId: string, current: boolean | null) => {
    const { error } = await supabase.from('profiles').update({ is_verified: !current, updated_at: new Date().toISOString() }).eq('user_id', userId);
    if (error) { toast.error('Failed to update verification'); return; }
    await logUserAction('verify', userId, { verified: !current });
    toast.success(!current ? 'User verified' : 'Verification removed');
    fetchUsers();
  };

  const handleSuspend = async (userId: string, current: boolean | null) => {
    const { error } = await supabase.from('profiles').update({
      is_suspended: !current, suspended_at: !current ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);
    if (error) { toast.error('Failed to update suspension'); return; }
    await logUserAction(!current ? 'suspend' : 'unsuspend', userId);
    toast.success(!current ? 'User suspended' : 'User unsuspended');
    fetchUsers();
  };

  const handleBulkVerify = async () => {
    if (selectedIds.size === 0) return;
    const { error } = await supabase.from('profiles').update({ is_verified: true, updated_at: new Date().toISOString() }).in('user_id', [...selectedIds]);
    if (error) { toast.error('Failed to verify users'); return; }
    toast.success(`${selectedIds.size} users verified`);
    setSelectedIds(new Set());
    fetchUsers();
  };

  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && !u.user_roles?.some(r => r.role === roleFilter)) return false;
    if (statusFilter === 'verified' && !u.is_verified) return false;
    if (statusFilter === 'suspended' && !u.is_suspended) return false;
    if (statusFilter === 'active' && (u.is_suspended || u.is_blocked)) return false;
    return true;
  });

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const columns: Column<UserProfile>[] = [
    {
      key: 'full_name', label: 'User', sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name || 'User'} className="h-full w-full object-cover" /> : null}
            <AvatarFallback className="text-xs">{(u.full_name || '?')[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate flex items-center gap-1">
              {u.full_name || 'Unknown'}
              {u.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />}
            </p>
            <p className="text-xs text-muted-foreground">{u.phone_number || 'No phone'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'district', label: 'Location', sortable: true,
      render: (u) => (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {u.district ? `${u.district}, ${u.division || ''}` : '—'}
        </span>
      ),
    },
    {
      key: 'user_roles', label: 'Roles',
      render: (u) => (
        <div className="flex gap-1 flex-wrap">
          {u.user_roles?.map((r, i) => (
            <Badge key={i} variant="secondary" className="text-xs capitalize">{r.role.replace(/_/g, ' ')}</Badge>
          )) || <span className="text-muted-foreground text-xs">No roles</span>}
        </div>
      ),
    },
    {
      key: 'is_verified', label: 'Status', sortable: true,
      render: (u) => {
        if (u.is_suspended) return <Badge variant="destructive" className="text-xs">Suspended</Badge>;
        if (u.is_blocked) return <Badge variant="destructive" className="text-xs">Blocked</Badge>;
        if (u.is_verified) return <Badge className="text-xs bg-blue-500 hover:bg-blue-500">Verified</Badge>;
        return <Badge variant="secondary" className="text-xs">Active</Badge>;
      },
    },
    {
      key: 'created_at', label: 'Joined', sortable: true,
      render: (u) => <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</span>,
    },
    {
      key: 'actions', label: 'Actions',
      render: (u) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleVerify(u.user_id, u.is_verified); }} title={u.is_verified ? 'Remove verification' : 'Verify'}>
            <BadgeCheck className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleSuspend(u.user_id, u.is_suspended); }} title={u.is_suspended ? 'Unsuspend' : 'Suspend'}>
            {u.is_suspended ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Customers"
        description="Manage all marketplace users, verification, and account status"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Users' }, { label: 'Customers' }]}
        actions={<Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Export</Button>}
      />

      <StatCardGrid>
        <StatCard title="Total Users" value={users.length} icon={Users} color="blue" loading={isLoading} />
        <StatCard title="Verified" value={users.filter(u => u.is_verified).length} icon={BadgeCheck} color="green" loading={isLoading} />
        <StatCard title="Suspended" value={users.filter(u => u.is_suspended).length} icon={UserX} color="red" loading={isLoading} />
        <StatCard title="New This Week" value={users.filter(u => new Date(u.created_at) > new Date(Date.now() - 7 * 86400000)).length} icon={TrendingUp} color="purple" loading={isLoading} />
      </StatCardGrid>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={filteredUsers}
          searchable
          searchPlaceholder="Search users..."
          searchKeys={['full_name', 'phone_number', 'district', 'division']}
          loading={isLoading}
          selectable
          getRowId={(u) => u.user_id}
          bulkActions={
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleBulkVerify}>
              Verify All
            </Button>
          }
          toolbarActions={
            <>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                  <SelectItem value="buyer">Buyer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />
      </div>
    </AdminLayout>
  );
}
