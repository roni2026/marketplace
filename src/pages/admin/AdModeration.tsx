/**
 * AdModeration — Redesigned admin ad moderation with tabs, data table,
 * bulk actions, quick approve/reject, and confirmation dialogs.
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPortal } from '@/hooks/useAdminPortal';
import { exportData, downloadExport } from '@/lib/adminPortal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  FileCheck, CheckCircle2, XCircle, Trash2, Star, Zap, Eye,
  Download, Package, Clock, AlertTriangle,
} from 'lucide-react';

interface Ad {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  status: string;
  category_id: string | null;
  user_id: string;
  is_featured: boolean;
  is_boosted: boolean;
  boosted_until: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  rejection_message: string | null;
  images: string[];
  categories?: { name: string } | null;
  profiles?: { full_name: string | null; email: string | null } | null;
}

export default function AdModeration() {
  const { user } = useAuth();
  const { quickApprove, quickReject, quickFeature, quickBoost, bulkOperation, logActivity } = useAdminPortal();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, featured: 0 });
  const [confirmAction, setConfirmAction] = useState<{ type: string; adId?: string; reason?: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('ads')
      .select('*, categories(name), profiles!ads_user_id_fkey(full_name, email)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (activeTab === 'pending') query = query.eq('status', 'pending');
    else if (activeTab === 'approved') query = query.eq('status', 'approved');
    else if (activeTab === 'rejected') query = query.eq('status', 'rejected');
    else if (activeTab === 'featured') query = query.eq('is_featured', true);

    if (activeTab === 'all' && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query.limit(200);
    if (error) { toast.error('Failed to load listings'); console.error(error); }
    setAds((data as Ad[]) || []);

    const [pendingRes, approvedRes, rejectedRes, featuredRes] = await Promise.all([
      supabase.from('ads').select('id', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null),
      supabase.from('ads').select('id', { count: 'exact', head: true }).eq('status', 'approved').is('deleted_at', null),
      supabase.from('ads').select('id', { count: 'exact', head: true }).eq('status', 'rejected').is('deleted_at', null),
      supabase.from('ads').select('id', { count: 'exact', head: true }).eq('is_featured', true).is('deleted_at', null),
    ]);
    setStats({
      pending: pendingRes.count ?? 0,
      approved: approvedRes.count ?? 0,
      rejected: rejectedRes.count ?? 0,
      featured: featuredRes.count ?? 0,
    });
    setLoading(false);
  }, [activeTab, statusFilter]);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  const handleApprove = useCallback(async (adId: string) => {
    setActionLoading(adId);
    const success = await quickApprove(adId);
    if (success) setAds(prev => prev.filter(a => a.id !== adId));
    setActionLoading(null);
  }, [quickApprove]);

  const handleReject = useCallback(async (adId: string, reason: string) => {
    setActionLoading(adId);
    const success = await quickReject(adId, reason);
    if (success) setAds(prev => prev.filter(a => a.id !== adId));
    setActionLoading(null);
  }, [quickReject]);

  const handleFeature = useCallback(async (adId: string) => {
    const success = await quickFeature(adId);
    if (success) fetchAds();
  }, [quickFeature, fetchAds]);

  const handleBoost = useCallback(async (adId: string) => {
    const success = await quickBoost(adId, 7);
    if (success) fetchAds();
  }, [quickBoost, fetchAds]);

  const handleDelete = useCallback(async (adId: string) => {
    const { error } = await supabase.from('ads').update({ deleted_at: new Date().toISOString(), status: 'archived' }).eq('id', adId);
    if (error) { toast.error('Failed to delete listing'); return; }
    if (user) await logActivity('delete_listing', 'ad', adId);
    toast.success('Listing deleted');
    setAds(prev => prev.filter(a => a.id !== adId));
  }, [user, logActivity]);

  const handleBulkApprove = useCallback(async () => {
    if (!user) return;
    await bulkOperation('approve_listings', Array.from(selectedIds));
    setSelectedIds(new Set());
    fetchAds();
  }, [user, bulkOperation, selectedIds, fetchAds]);

  const handleBulkReject = useCallback(async () => {
    if (!user) return;
    await bulkOperation('reject_listings', Array.from(selectedIds));
    setSelectedIds(new Set());
    fetchAds();
  }, [user, bulkOperation, selectedIds, fetchAds]);

  const handleBulkDelete = useCallback(async () => {
    for (const id of selectedIds) {
      await supabase.from('ads').update({ deleted_at: new Date().toISOString(), status: 'archived' }).eq('id', id);
    }
    if (user) await logActivity('bulk_delete_listings', 'ad', undefined, { count: selectedIds.size });
    toast.success(`Deleted ${selectedIds.size} listings`);
    setSelectedIds(new Set());
    fetchAds();
  }, [user, selectedIds, logActivity, fetchAds]);

  const handleExport = useCallback(async () => {
    const csv = await exportData('ads', 'csv');
    if (csv) downloadExport(csv, 'listings_export.csv', 'csv');
  }, [exportData, downloadExport]);

  const handleConfirm = useCallback(() => {
    if (!confirmAction) return;
    if (confirmAction.type === 'reject' && confirmAction.adId) {
      handleReject(confirmAction.adId, rejectReason || 'Rejected by admin');
    } else if (confirmAction.type === 'delete' && confirmAction.adId) {
      handleDelete(confirmAction.adId);
    } else if (confirmAction.type === 'bulk_delete') {
      handleBulkDelete();
    }
    setConfirmAction(null);
    setRejectReason('');
  }, [confirmAction, rejectReason, handleReject, handleDelete, handleBulkDelete]);

  const statusBadge = (status: string) => {
    const variant = status === 'approved' ? 'success' : status === 'pending' ? 'warning' : status === 'rejected' ? 'destructive' : 'secondary';
    return <Badge variant={variant as any} className="text-[10px]">{status}</Badge>;
  };

  const columns: Column<Ad>[] = useMemo(() => [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      sortValue: (r) => r.title,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{r.title}</p>
            {r.images && r.images.length > 0 && (
              <p className="text-[10px] text-muted-foreground">{r.images.length} image(s)</p>
            )}
          </div>
        </div>
      ),
      exportValue: (r) => r.title,
    },
    {
      key: 'category',
      label: 'Category',
      render: (r) => <span className="text-xs text-muted-foreground">{r.categories?.name || 'Uncategorized'}</span>,
      exportValue: (r) => r.categories?.name || '',
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      sortValue: (r) => r.price,
      align: 'right',
      render: (r) => <span className="text-xs font-medium">${r.price?.toLocaleString() || 0}</span>,
      exportValue: (r) => r.price,
    },
    {
      key: 'seller',
      label: 'Seller',
      render: (r) => <span className="text-[11px] text-muted-foreground">{r.profiles?.full_name || r.profiles?.email || r.user_id.slice(0, 8)}</span>,
      exportValue: (r) => r.profiles?.full_name || r.profiles?.email || '',
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => statusBadge(r.status),
      exportValue: (r) => r.status,
    },
    {
      key: 'flags',
      label: 'Flags',
      align: 'center',
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          {r.is_featured && <Star className="h-3 w-3 text-amber-500" />}
          {r.is_boosted && <Zap className="h-3 w-3 text-purple-500" />}
          {!r.is_featured && !r.is_boosted && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      sortValue: (r) => r.created_at,
      render: (r) => <span className="text-[11px] text-muted-foreground">{format(new Date(r.created_at), 'MMM d, yyyy')}</span>,
      exportValue: (r) => r.created_at,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          {r.status === 'pending' && (
            <>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600 hover:bg-green-50 dark:hover:bg-green-950" disabled={actionLoading === r.id} onClick={() => handleApprove(r.id)} title="Approve">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" disabled={actionLoading === r.id} onClick={() => { setConfirmAction({ type: 'reject', adId: r.id }); setRejectReason(''); }} title="Reject">
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950" onClick={() => handleFeature(r.id)} title="Feature">
            <Star className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950" onClick={() => handleBoost(r.id)} title="Boost">
            <Zap className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600" onClick={() => setConfirmAction({ type: 'delete', adId: r.id })} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], [actionLoading, handleApprove, handleFeature, handleBoost]);

  return (
    <AdminLayout>
      <PageHeader
        title="Ad Moderation"
        description="Review and moderate marketplace listings"
        actions={
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        }
      />

      <StatCardGrid>
        <StatCard title="Pending" value={stats.pending} icon={Clock} color="yellow" loading={loading} />
        <StatCard title="Approved" value={stats.approved} icon={CheckCircle2} color="green" loading={loading} />
        <StatCard title="Rejected" value={stats.rejected} icon={XCircle} color="red" loading={loading} />
        <StatCard title="Featured" value={stats.featured} icon={Star} color="purple" loading={loading} />
      </StatCardGrid>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="h-8">
          <TabsTrigger value="pending" className="text-xs">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="all" className="text-xs">All Listings</TabsTrigger>
          <TabsTrigger value="approved" className="text-xs">Approved ({stats.approved})</TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs">Rejected ({stats.rejected})</TabsTrigger>
          <TabsTrigger value="featured" className="text-xs">Featured ({stats.featured})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-3">
        <DataTable
          columns={columns}
          data={ads}
          searchable
          searchPlaceholder="Search by title..."
          searchKeys={['title'] as any}
          pageSize={15}
          loading={loading}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          getRowId={(r) => r.id}
          emptyMessage="No listings found"
          onExport={handleExport}
          bulkActions={
            <>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleBulkApprove}>
                <CheckCircle2 className="h-3 w-3" /> Approve All
              </Button>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleBulkReject}>
                <XCircle className="h-3 w-3" /> Reject All
              </Button>
              <Button size="sm" variant="destructive" className="h-7 gap-1 text-xs" onClick={() => setConfirmAction({ type: 'bulk_delete' })}>
                <Trash2 className="h-3 w-3" /> Delete All
              </Button>
            </>
          }
          filters={activeTab === 'all' ? (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          ) : undefined}
        />
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) { setConfirmAction(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {confirmAction?.type === 'reject' ? 'Reject Listing' :
               confirmAction?.type === 'delete' ? 'Delete Listing' :
               confirmAction?.type === 'bulk_delete' ? 'Delete Selected Listings' : 'Confirm Action'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {confirmAction?.type === 'reject'
                ? 'Provide a reason for rejecting this listing (optional):'
                : 'This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          {confirmAction?.type === 'reject' && (
            <div className="space-y-2">
              <Label className="text-xs">Rejection Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="text-xs"
                maxLength={500}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setConfirmAction(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant={confirmAction?.type === 'reject' ? 'default' : 'destructive'}
              size="sm"
              className="h-8 text-xs"
              onClick={handleConfirm}
            >
              {confirmAction?.type === 'reject' ? 'Reject' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
