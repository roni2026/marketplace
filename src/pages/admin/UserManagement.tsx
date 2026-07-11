import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Search, Download, User, Shield, ShieldOff, BadgeCheck, Trash2, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { logUserAction } from '@/lib/audit';

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

export default function UserManagement() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      fetchUsers();
    }
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

  const filteredUsers = users.filter(u => {
    if (searchTerm) {
      const text = `${u.full_name || ''} ${u.phone_number || ''} ${u.division || ''} ${u.district || ''}`;
      if (!text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    }
    if (roleFilter !== 'all') {
      if (!u.user_roles?.some(r => r.role === roleFilter)) return false;
    }
    if (statusFilter === 'verified' && !u.is_verified) return false;
    if (statusFilter === 'suspended' && !u.is_suspended) return false;
    if (statusFilter === 'blocked' && !u.is_blocked) return false;
    if (statusFilter === 'active' && (u.is_suspended || u.is_blocked)) return false;
    return true;
  });

  const handleVerify = async (userId: string, current: boolean | null) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: !current, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) {
      toast.error('Failed to update verification');
    } else {
      await logUserAction('verify', userId, { verified: !current });
      toast.success(!current ? 'User verified' : 'Verification removed');
      fetchUsers();
    }
  };

  const handleSuspend = async (userId: string, current: boolean | null) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_suspended: !current,
        suspended_at: !current ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (error) {
      toast.error('Failed to update suspension');
    } else {
      await logUserAction(!current ? 'suspend' : 'unsuspend', userId);
      toast.success(!current ? 'User suspended' : 'User unsuspended');
      fetchUsers();
    }
  };

  const handleBulkVerify = async () => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .in('user_id', selectedIds);
    if (error) {
      toast.error('Failed to verify users');
    } else {
      toast.success(`${selectedIds.length} users verified`);
      setSelectedIds([]);
      fetchUsers();
    }
  };

  const handleBulkSuspend = async () => {
    if (selectedIds.length === 0) return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: true, suspended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in('user_id', selectedIds);
    if (error) {
      toast.error('Failed to suspend users');
    } else {
      toast.success(`${selectedIds.length} users suspended`);
      setSelectedIds([]);
      fetchUsers();
    }
  };

  const handleExport = () => {
    const csv = ['Name,Phone,Division,District,Verified,Suspended,Created'];
    filteredUsers.forEach(u => {
      csv.push([
        u.full_name || 'Unknown',
        u.phone_number || '',
        u.division || '',
        u.district || '',
        u.is_verified ? 'Yes' : 'No',
        u.is_suspended ? 'Yes' : 'No',
        new Date(u.created_at).toISOString().split('T')[0],
      ].join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Users exported');
  };

  const toggleSelect = (userId: string) => {
    setSelectedIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage users, verification, and suspensions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="customer_support">Support</SelectItem>
            <SelectItem value="seller">Seller</SelectItem>
            <SelectItem value="buyer">Buyer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-card border border-border rounded-lg">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleBulkVerify}>
            <BadgeCheck className="h-4 w-4" />
            Verify All
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={handleBulkSuspend}>
            <UserX className="h-4 w-4" />
            Suspend All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
            Clear
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(u.user_id)}
                          onCheckedChange={() => toggleSelect(u.user_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {u.full_name || 'Unknown'}
                              {u.is_verified && <BadgeCheck className="h-3 w-3 text-primary inline ml-1" />}
                            </p>
                            <p className="text-xs text-muted-foreground">{u.phone_number || 'No phone'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.district ? `${u.district}, ${u.division || ''}` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.user_roles?.map((r, i) => (
                            <Badge key={i} variant="secondary" className="text-xs capitalize">
                              {r.role.replace(/_/g, ' ')}
                            </Badge>
                          )) || <span className="text-xs text-muted-foreground">No roles</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.is_suspended ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : u.is_blocked ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : u.is_verified ? (
                          <Badge className="bg-green-600 hover:bg-green-600 text-white">Verified</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleVerify(u.user_id, u.is_verified)}
                            title={u.is_verified ? 'Remove verification' : 'Verify user'}
                          >
                            <BadgeCheck className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSuspend(u.user_id, u.is_suspended)}
                            title={u.is_suspended ? 'Unsuspend' : 'Suspend user'}
                          >
                            {u.is_suspended ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
