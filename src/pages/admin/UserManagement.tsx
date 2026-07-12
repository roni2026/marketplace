/**
 * UserManagement — Redesigned admin user management with data table,
 * filters, bulk actions, export, and confirmation dialogs.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { exportData, downloadExport } from '@/lib/adminPortal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Users, Ban, UserCheck, Trash2, Download, Eye, Shield, Star,
  AlertTriangle, CheckCircle2, XCircle, MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  created_at: string;
  last_login_at: string | null;
  deleted_at: string | null;
}

export default function UserManagement() {
  const { user } = useAuth();
  const { quickSuspend, quickUnsuspend, quickVerify, bulkOperation, logActivity } = useAdminPortal();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, suspended: 0, verified: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId?: string; reason?: string } | null>(null);
  const [reasonText, setReasonText] = useState('');

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (statusFilter === 'suspended') query = query.eq('is_suspended', true);
    else if (statusFilter === 'verified') query = query.eq('is_verified', true);
    else if (statusFilter === 'unverified') query = query.eq('is_verified', false);
    const { data, error } = await query.limit(200);
    if (error) { toast.error('Failed to load users'); console.error(error); }
    setProfiles((data as Profile[]) || []);

    const [totalRes, activeRes, suspendedRes, verifiedRes] = await Promise.all([
      supabase.from('profiles').select('user_id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('profiles').select('user_id', { count: 'exact', head: true }).is('deleted_at', null).eq('is_suspended', false),
      supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('is_suspended', true),
      supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('is_verified', true),
    ]);
    setStats({
      total: totalRes.count ?? 0,
      active: activeRes.count ?? 0,
      suspended: suspendedRes.count ?? 0,
      verified: verifiedRes.count ?? 0,
    });
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleSuspend = useCallback(async (userId: string, reason: string) => {
    const success = await quickSuspend(userId, reason);
    if (success) fetchProfiles();
  }, [quickSuspend, fetchProfiles]);

  const handleUnsuspend = useCallback(async (userId: string) => {
    const success = await quickUnsuspend(userId);
    if (success) fetchProfiles();
  }, [quickUnsuspend, fetchProfiles]);

  const handleVerify = useCallback(async (userId: string) => {
    const success = await quickVerify(userId);
    if (success) fetchProfiles();
  }, [quickVerify, fetchProfiles]);

  const handleDelete = useCallback(async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('user_id', userId);
    if (error) { toast.error('Failed to delete user'); return; }
    if (user) await logActivity('delete_user', 'user', userId);
    toast.success('User deleted');
    fetchProfiles();
  }, [user, logActivity, fetchProfiles]);

  const handleBulkSuspend = useCallback(async () => {
    if (!user) return;
    await bulkOperation('suspend_users', Array.from(selectedIds), { reason: 'Bulk suspension by admin' });
    setSelectedIds(new Set());
    fetchProfiles();
  }, [user, bulkOperation, selectedIds, fetchProfiles]);

  const handleBulkVerify = useCallback(async () => {
    if (!user) return;
    await bulkOperation('verify_users', Array.from(selectedIds));
    setSelectedIds(new Set());
    fetchProfiles();
  }, [user, bulkOperation, selectedIds, fetchProfiles]);

  const handleBulkDelete = useCallback(async () => {
    for (const id of selectedIds) {
      await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('user_id', id);
    }
    if (user) await logActivity('bulk_delete_users', 'user', undefined, { count: selectedIds.size });
    toast.success(`Deleted ${selectedIds.size} users`);
    setSelectedIds(new Set());
    fetchProfiles();
  }, [user, selectedIds, logActivity, fetchProfiles]);

  const handleExport = useCallback(async () => {
    const csv = await exportData('profiles', 'csv');
    if (csv) downloadExport(csv, 'users_export.csv', 'csv');
  }, [exportData, downloadExport]);

  const handleConfirm = useCallback(() => {
    if (!confirmAction) return;
    if (confirmAction.type === 'suspend' && confirmAction.userId) {
      handleSuspend(confirmAction.userId, reasonText || 'Suspended by admin');
    } else if (confirmAction.type === 'delete' && confirmAction.userId) {
      handleDelete(confirmAction.userId);
    } else if (confirmAction.type === 'bulk_delete') {
      handleBulkDelete();
    }
    setConfirmAction(null);
    setReasonText('');
  }, [confirmAction, reasonText, handleSuspend, handleDelete, handleBulkDelete]);

  const columns: Column<Profile>[] = useMemo(() => [
    {
      key: 'full_name',
      label: 'Name',
      sortable: true,
      sortValue: (r) => r.full_name || '',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {(r.full_name?.[0] || r.email?.[0] || '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{r.full_name || 'Unnamed'}</p>
            {r.is_verified && <BadgeCheck className="inline h-3 w-3 text-blue-500" />}
          </div>
        </div>
      ),
      exportValue: (r) => r.full_name || '',
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      sortValue: (r) => r.email || '',
      render: (r) => <span className="text-xs text-muted-foreground">{r.email || '—'}</span>,
      exportValue: (r) => r.email || '',
    },
    {
      key: 'is_suspended',
      label: 'Status',
      sortable: true,
      sortValue: (r) => r.is_suspended ? '1' : '0',
      render: (r) => (
        <Badge variant={r.is_suspended ? 'destructive' : 'success'} className="text-[10px]">
          {r.is_suspended ? 'Suspended' : 'Active'}
        </Badge>
      ),
      exportValue: (r) => r.is_suspended ? 'Suspended' : 'Active',
    },
    {
      key: 'is_verified',
      label: 'Verified',
      align: 'center',
      render: (r) => r.is_verified
        ? <CheckCircle2 className="inline h-3.5 w-3.5 text-green-500" />
        : <span className="text-muted-foreground">—</span>,
      exportValue: (r) => r.is_verified ? 'Yes' : 'No',
    },
    {
      key: 'created_at',
      label: 'Joined',
      sortable: true,
      sortValue: (r) => r.created_at,
      render: (r) => <span className="text-[11px] text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy')}</span>,
      exportValue: (r) => r.created_at,
    },
    {
      key: 'last_login_at',
      label: 'Last Login',
      sortable: true,
      sortValue: (r) => r.last_login_at || '',
      render: (r) => <span className="text-[11px] text-muted-foreground">{r.last_login_at ? format(new Date(r.last_login_at), 'MMM d, yyyy') : 'Never'}</span>,
      exportValue: (r) => r.last_login_at || 'Never',
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem className="text-xs" onClick={() => toast.info(`User: ${r.full_name || r.email}`)}>
                <Eye className="mr-2 h-3 w-3" /> View Details
              </DropdownMenuItem>
              {r.is_suspended ? (
                <DropdownMenuItem className="text-xs" onClick={() => handleUnsuspend(r.user_id)}>
                  <UserCheck className="mr-2 h-3 w-3" /> Unsuspend
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="text-xs" onClick={() => { setConfirmAction({ type: 'suspend', userId: r.user_id }); setReasonText(''); }}>
                  <Ban className="mr-2 h-3 w-3" /> Suspend
                </DropdownMenuItem>
              )}
              {!r.is_verified && (
                <DropdownMenuItem className="text-xs" onClick={() => handleVerify(r.user_id)}>
                  <Shield className="mr-2 h-3 w-3" /> Verify
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-red-600" onClick={() => setConfirmAction({ type: 'delete', userId: r.user_id })}>
                <Trash2 className="mr-2 h-3 w-3" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [handleUnsuspend, handleVerify]);

  return (
    <AdminLayout>
      <PageHeader
        title="User Management"
        description={`${stats.total} total users`}
        actions={
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        }
      />

      <StatCardGrid>
        <StatCard title="Total Users" value={stats.total} icon={Users} color="blue" loading={loading} />
        <StatCard title="Active" value={stats.active} icon={UserCheck} color="green" loading={loading} />
        <StatCard title="Suspended" value={stats.suspended} icon={Ban} color="red" loading={loading} />
        <StatCard title="Verified" value={stats.verified} icon={Shield} color="purple" loading={loading} />
      </StatCardGrid>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={profiles}
          searchable
          searchPlaceholder="Search by name or email..."
          searchKeys={['full_name', 'email'] as any}
          pageSize={15}
          loading={loading}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          getRowId={(r) => r.user_id}
          emptyMessage="No users found"
          bulkActions={
            <>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleBulkVerify}>
                <Shield className="h-3 w-3" /> Verify All
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleBulkSuspend}>
                <Ban className="h-3 w-3" /> Suspend All
              </Button>
              <Button size="sm" variant="destructive" className="h-7 gap-1 text-xs" onClick={() => setConfirmAction({ type: 'bulk_delete' })}>
                <Trash2 className="h-3 w-3" /> Delete All
              </Button>
            </>
          }
          filters={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) { setConfirmAction(null); setReasonText(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {confirmAction?.type === 'suspend' ? 'Suspend User' :
               confirmAction?.type === 'delete' ? 'Delete User' :
               confirmAction?.type === 'bulk_delete' ? 'Delete Selected Users' : 'Confirm Action'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {confirmAction?.type === 'delete' || confirmAction?.type === 'bulk_delete'
                ? 'This will permanently remove the user(s). This action cannot be undone.'
                : 'Provide a reason for suspending this user (optional):'}
            </DialogDescription>
          </DialogHeader>
          {(confirmAction?.type === 'suspend') && (
            <div className="space-y-2">
              <Label className="text-xs">Reason</Label>
              <Textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Reason for suspension..."
                className="text-xs"
                maxLength={500}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setConfirmAction(null); setReasonText(''); }}>
              Cancel
            </Button>
            <Button
              variant={confirmAction?.type === 'suspend' ? 'default' : 'destructive'}
              size="sm"
              className="h-8 text-xs"
              onClick={handleConfirm}
            >
              {confirmAction?.type === 'suspend' ? 'Suspend' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
