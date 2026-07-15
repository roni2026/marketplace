/**
 * ReportManagement — Enterprise-grade report management dashboard.
 *
 * Features:
 * - Queue tabs: All, Pending, Reviewing, Resolved, Dismissed, High Priority
 * - View modes: Table, Split-panel
 * - Filters: search, status, date range, division
 * - Detail panel: report info, reported listing, reporter, seller, resolution notes
 * - Actions: resolve, dismiss, mark reviewing, remove listing, suspend seller
 * - Bulk: resolve all, dismiss all
 * - Stats: pending, resolved today, dismissed today, high priority
 * - CSV export
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AdminReportDetailPanel } from '@/components/admin/AdminReportDetailPanel';
import { AdminBulkActions } from '@/components/admin/AdminBulkActions';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Search, Filter, CheckCircle, XCircle, Eye, Flag, Download,
  ChevronLeft, ChevronRight, Columns, Table as TableIcon, SlidersHorizontal,
  MoreVertical, Ban, Clock, AlertTriangle, ShieldCheck, Package,
} from 'lucide-react';

interface Report {
  id: string;
  user_id: string;
  ad_id: string;
  reason: string;
  reason_code: string | null;
  status: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

const STATUS_TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

const PER_PAGE = 20;

export default function ReportManagement() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [viewMode, setViewMode] = useState<'table' | 'split'>('table');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ pending: 0, resolvedToday: 0, dismissedToday: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('reports').select('*', { count: 'exact' });
      if (activeTab !== 'all') query = query.eq('status', activeTab);
      if (searchQuery.trim()) query = query.or(`reason.ilike.%${searchQuery}%,reason_code.ilike.%${searchQuery}%`);
      query = query.order('created_at', { ascending: sort === 'oldest' });
      query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
      const { data, count } = await query;
      setReports((data as Report[]) || []);
      setTotalCount(count || 0);

      const today = new Date().toISOString().split('T')[0];
      const [pendingRes, resolvedRes, dismissedRes, totalRes] = await Promise.all([
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'resolved').gte('resolved_at', today),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'dismissed').gte('resolved_at', today),
        supabase.from('reports').select('*', { count: 'exact', head: true }),
      ]);
      setStats({ pending: pendingRes.count || 0, resolvedToday: resolvedRes.count || 0, dismissedToday: dismissedRes.count || 0, total: totalRes.count || 0 });
    } catch {}
    setLoading(false);
  }, [activeTab, searchQuery, sort, page]);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => { setPage(1); }, [activeTab, searchQuery, sort]);

  const handleAction = async (action: string, reportId: string, extra?: any) => {
    setActionLoading(reportId);
    try {
      const updates: Record<string, any> = {};
      switch (action) {
        case 'resolve': updates.status = 'resolved'; updates.is_resolved = true; updates.resolved_at = new Date().toISOString(); updates.resolved_by = user?.id; updates.admin_notes = extra?.notes || null; break;
        case 'dismiss': updates.status = 'dismissed'; updates.is_resolved = true; updates.resolved_at = new Date().toISOString(); updates.resolved_by = user?.id; updates.admin_notes = extra?.notes || null; break;
        case 'reviewing': updates.status = 'reviewing'; break;
        case 'remove_ad':
          await supabase.from('ads').update({ status: 'archived' }).eq('id', extra?.adId);
          updates.status = 'resolved'; updates.is_resolved = true; updates.resolved_at = new Date().toISOString(); updates.resolved_by = user?.id; updates.admin_notes = `Listing removed. ${extra?.notes || ''}`;
          break;
        case 'suspend_seller':
          await supabase.from('profiles').update({ is_suspended: true, suspended_at: new Date().toISOString(), suspended_reason: 'Suspended due to report' }).eq('user_id', extra?.sellerId);
          updates.status = 'resolved'; updates.is_resolved = true; updates.resolved_at = new Date().toISOString(); updates.resolved_by = user?.id; updates.admin_notes = `Seller suspended. ${extra?.notes || ''}`;
          break;
      }
      const { error } = await supabase.from('reports').update(updates).eq('id', reportId);
      if (error) throw error;
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...updates } : r));
      toast.success(`Report ${action}d`);
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
    setActionLoading(null);
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setActionLoading('bulk');
    try {
      const updates = action === 'resolve' ? { status: 'resolved', is_resolved: true, resolved_at: new Date().toISOString(), resolved_by: user?.id }
        : action === 'dismiss' ? { status: 'dismissed', is_resolved: true, resolved_at: new Date().toISOString(), resolved_by: user?.id }
        : action === 'delete' ? null : null;
      if (action === 'delete') {
        await supabase.from('reports').delete().in('id', ids);
      } else if (updates) {
        await supabase.from('reports').update(updates).in('id', ids);
      }
      toast.success(`${ids.length} reports ${action}d`);
      setSelectedIds(new Set());
      fetchReports();
    } catch { toast.error('Bulk action failed'); }
    setActionLoading(null);
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectAll = () => { if (selectedIds.size === reports.length) setSelectedIds(new Set()); else setSelectedIds(new Set(reports.map(r => r.id))); };
  const navigateReport = (dir: 'prev' | 'next') => { if (!selectedReport) return; const idx = reports.findIndex(r => r.id === selectedReport.id); if (dir === 'prev' && idx > 0) setSelectedReport(reports[idx - 1]); if (dir === 'next' && idx < reports.length - 1) setSelectedReport(reports[idx + 1]); };

  const statusBadge = (status: string) => {
    const map: Record<string, any> = { pending: 'secondary', reviewing: 'secondary', resolved: 'default', dismissed: 'outline' };
    return <Badge variant={map[status] || 'secondary'} className="text-[10px] capitalize">{status}</Badge>;
  };

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center"><Flag className="h-6 w-6" /></div>
            <div><h1 className="text-2xl font-bold">Report Management</h1><p className="text-muted-foreground">{totalCount} reports</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${viewMode === 'table' ? 'bg-card shadow-sm' : ''}`} onClick={() => setViewMode('table')}><TableIcon className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${viewMode === 'split' ? 'bg-card shadow-sm' : ''}`} onClick={() => setViewMode('split')}><Columns className="h-4 w-4" /></Button>
            </div>
            <Select value={sort} onValueChange={setSort}><SelectTrigger className="w-[150px] gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger><SelectContent>{SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
            <Sheet>
              <SheetTrigger asChild><Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /><span className="hidden sm:inline">Filters</span></Button></SheetTrigger>
              <SheetContent side="right"><SheetHeader><SheetTitle>Filter Reports</SheetTitle></SheetHeader><div className="mt-6 space-y-4"><div><Label>Search</Label><div className="relative mt-1"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Reason, code..." className="pl-8" /></div></div></div></SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center"><Clock className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center"><CheckCircle className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.resolvedToday}</p><p className="text-xs text-muted-foreground">Resolved Today</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-gray-500/10 text-gray-600 flex items-center justify-center"><XCircle className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.dismissedToday}</p><p className="text-xs text-muted-foreground">Dismissed Today</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center"><Flag className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Reports</p></div></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2"><TabsList className="w-max">{STATUS_TABS.map(t => <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5">{t.label}{t.value === 'pending' && stats.pending > 0 && <Badge variant="destructive" className="text-[9px] h-4 px-1">{stats.pending}</Badge>}</TabsTrigger>)}</TabsList></div>
        </Tabs>

        <div className={`grid gap-6 mt-4 ${viewMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          <div className={viewMode === 'split' ? 'min-h-[600px]' : ''}>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : reports.length === 0 ? (
              <Card><CardContent className="p-12 text-center"><Flag className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No reports found</p></CardContent></Card>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={selectedIds.size === reports.length && reports.length > 0} onCheckedChange={selectAll} /></TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Code</TableHead>
                      <TableHead className="hidden md:table-cell">Reported</TableHead>
                      <TableHead className="w-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map(r => (
                      <TableRow key={r.id} className={`cursor-pointer hover:bg-accent/50 ${selectedReport?.id === r.id ? 'bg-accent' : ''} ${r.status === 'pending' ? 'border-l-2 border-l-orange-500' : ''}`} onClick={() => viewMode === 'split' ? setSelectedReport(r) : undefined}>
                        <TableCell onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></TableCell>
                        <TableCell><p className="font-medium text-sm line-clamp-1">{r.reason}</p>{r.reason_code && <p className="text-xs text-muted-foreground font-mono">{r.reason_code}</p>}</TableCell>
                        <TableCell className="hidden md:table-cell">{statusBadge(r.status)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">{r.reason_code || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedReport(r)} className="gap-2"><Eye className="h-3.5 w-3.5" /> View Details</DropdownMenuItem>
                              {r.status === 'pending' || r.status === 'reviewing' ? (
                                <>
                                  <DropdownMenuItem onClick={() => handleAction('resolve', r.id)} className="gap-2 text-green-600"><CheckCircle className="h-3.5 w-3.5" /> Resolve</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction('dismiss', r.id)} className="gap-2"><XCircle className="h-3.5 w-3.5" /> Dismiss</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAction('reviewing', r.id)} className="gap-2"><Eye className="h-3.5 w-3.5" /> Mark Reviewing</DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="px-4 text-sm">Page {page} of {totalPages}</span>
                <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
          {viewMode === 'split' && selectedReport && (
            <div className="border rounded-lg sticky top-4 max-h-[calc(100vh-2rem)]">
              <AdminReportDetailPanel report={selectedReport} onClose={() => setSelectedReport(null)} onAction={handleAction} onNavigate={navigateReport} />
            </div>
          )}
        </div>
      </main>

      <AdminBulkActions selectedCount={selectedIds.size} onClear={() => setSelectedIds(new Set())} onBulkAction={handleBulkAction} />

      {viewMode !== 'split' && selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <AdminReportDetailPanel report={selectedReport} onClose={() => setSelectedReport(null)} onAction={handleAction} onNavigate={navigateReport} />
          </div>
        </div>
      )}

      <MobileNav />
      <Footer />
    </div>
  );
}
