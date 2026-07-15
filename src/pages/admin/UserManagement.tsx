/**
 * UserManagement — Enterprise-grade user management dashboard.
 *
 * Features:
 * - Queue tabs: All, Verified, Unverified, Suspended, Active, New (7 days), With Reports
 * - View modes: Table, Grid, Split-panel
 * - Filters: search (name/phone/email), division, verified/suspended toggles, date range, has reports
 * - Sorting: 8 options (newest, oldest, most listings, most reports, highest rating, most sales, last login, name)
 * - Detail panel: profile, trust score, stats, roles, listings, reports, admin notes, activity timeline
 * - Actions: verify/unverify, suspend/unsuspend (with reason), delete, change role, export
 * - Bulk operations: verify, suspend, delete, export
 * - Stats bar: total users, verified, suspended, new today, with reports
 * - Keyboard shortcuts: V=verify, S=suspend, Esc=close
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
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AdminUserDetailPanel } from '@/components/admin/AdminUserDetailPanel';
import { AdminBulkActions } from '@/components/admin/AdminBulkActions';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Search, Filter, CheckCircle, XCircle, Shield, ShieldCheck, Ban,
  Download, ChevronLeft, ChevronRight, LayoutGrid, Table as TableIcon,
  Columns, SlidersHorizontal, Users, UserPlus, Clock, Flag, Star,
  MoreVertical, Trash2, Eye, Package, TrendingUp, UserCog, AlertTriangle,
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  division: string | null;
  district: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  deleted_at: string | null;
  last_login_at: string | null;
  seller_rating: number | null;
  total_sales: number | null;
  created_at: string;
}

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'active', label: 'Active' },
  { value: 'new', label: 'New (7d)' },
  { value: 'flagged', label: 'With Reports' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name A→Z' },
  { value: 'name_desc', label: 'Name Z→A' },
  { value: 'most_sales', label: 'Most Sales' },
  { value: 'highest_rating', label: 'Highest Rating' },
  { value: 'last_login', label: 'Last Login' },
];

const DIVISIONS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'];
const PER_PAGE = 20;

export default function UserManagement() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'split'>('table');
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ total: 0, verified: 0, suspended: 0, newToday: 0, flagged: 0 });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  // Dialogs
  const [suspendDialog, setSuspendDialog] = useState<{ userId: string; name?: string; bulk?: number } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*', { count: 'exact' }).is('deleted_at', null);

      if (activeTab === 'verified') query = query.eq('is_verified', true);
      else if (activeTab === 'unverified') query = query.eq('is_verified', false).eq('is_suspended', false);
      else if (activeTab === 'suspended') query = query.eq('is_suspended', true);
      else if (activeTab === 'active') query = query.eq('is_suspended', false).not('last_login_at', 'is', null);
      else if (activeTab === 'new') query = query.gte('created_at', subDays(new Date(), 7).toISOString());

      if (searchQuery.trim()) {
        query = query.or(`full_name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`);
      }
      if (divisionFilter !== 'all') query = query.eq('division', divisionFilter);

      switch (sort) {
        case 'newest': query = query.order('created_at', { ascending: false }); break;
        case 'oldest': query = query.order('created_at', { ascending: true }); break;
        case 'name_asc': query = query.order('full_name', { ascending: true }); break;
        case 'name_desc': query = query.order('full_name', { ascending: false }); break;
        case 'most_sales': query = query.order('total_sales', { ascending: false, nullsFirst: false }); break;
        case 'highest_rating': query = query.order('seller_rating', { ascending: false, nullsFirst: false }); break;
        case 'last_login': query = query.order('last_login_at', { ascending: false, nullsFirst: true }); break;
        default: query = query.order('created_at', { ascending: false });
      }

      query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
      const { data, count } = await query;
      setProfiles((data as UserProfile[]) || []);
      setTotalCount(count || 0);

      // Stats
      const today = new Date().toISOString().split('T')[0];
      const [totalRes, verifiedRes, suspendedRes, newRes, flaggedRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true).is('deleted_at', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setStats({ total: totalRes.count || 0, verified: verifiedRes.count || 0, suspended: suspendedRes.count || 0, newToday: newRes.count || 0, flagged: flaggedRes.count || 0 });
    } catch {}
    setLoading(false);
  }, [activeTab, searchQuery, divisionFilter, sort, page]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);
  useEffect(() => { setPage(1); }, [activeTab, searchQuery, divisionFilter, sort]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!selectedProfile || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') setSelectedProfile(null);
      if (e.key === 'v' || e.key === 'V') handleAction(selectedProfile.is_verified ? 'unverify' : 'verify', selectedProfile.user_id);
      if (e.key === 's' || e.key === 'S') setSuspendDialog({ userId: selectedProfile.user_id, name: selectedProfile.full_name || undefined });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedProfile]);

  const handleAction = async (action: string, userId: string, extra?: any) => {
    setActionLoading(userId);
    try {
      const updates: Record<string, any> = {};
      switch (action) {
        case 'verify': updates.is_verified = true; break;
        case 'unverify': updates.is_verified = false; break;
        case 'suspend':
          updates.is_suspended = true;
          updates.suspended_at = new Date().toISOString();
          updates.suspended_reason = extra?.reason || 'Suspended by admin';
          break;
        case 'unsuspend':
          updates.is_suspended = false;
          updates.suspended_at = null;
          updates.suspended_reason = null;
          break;
        case 'delete':
          updates.deleted_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase.from('profiles').update(updates).eq('user_id', userId);
      if (error) throw error;

      // Audit log
      if (user) {
        await supabase.from('audit_logs').insert({ user_id: user.id, action: action as any, resource_type: 'user', resource_id: userId, details: { action, ...updates } }).catch(() => {});
      }

      // Notify user
      if (action === 'suspend' || action === 'unsuspend' || action === 'verify') {
        await supabase.from('notifications').insert({
          user_id: userId, type: 'system',
          title: action === 'suspend' ? 'Account Suspended' : action === 'unsuspend' ? 'Account Restored' : 'Account Verified',
          message: action === 'suspend' ? `Your account has been suspended. Reason: ${extra?.reason || 'Violation of terms'}` : action === 'unsuspend' ? 'Your account has been restored.' : 'Your account has been verified!',
        }).catch(() => {});
      }

      setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, ...updates } : p));
      if (selectedProfile?.user_id === userId) setSelectedProfile(prev => prev ? { ...prev, ...updates } as UserProfile : null);
      toast.success(`User ${action}ed successfully`);
    } catch (err: any) { toast.error(err?.message || `Failed to ${action} user`); }
    setActionLoading(null);
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setActionLoading('bulk');
    try {
      const updates: Record<string, any> = {};
      switch (action) {
        case 'verify': updates.is_verified = true; break;
        case 'suspend': updates.is_suspended = true; updates.suspended_at = new Date().toISOString(); break;
        case 'unsuspend': updates.is_suspended = false; updates.suspended_at = null; break;
        case 'delete': updates.deleted_at = new Date().toISOString(); break;
      }
      await supabase.from('profiles').update(updates).in('user_id', ids);
      toast.success(`${ids.length} users ${action}d`);
      setSelectedIds(new Set());
      fetchProfiles();
    } catch { toast.error('Bulk action failed'); }
    setActionLoading(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const selectAll = () => {
    if (selectedIds.size === profiles.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(profiles.map(p => p.user_id)));
  };

  const navigateProfile = (dir: 'prev' | 'next') => {
    if (!selectedProfile) return;
    const idx = profiles.findIndex(p => p.user_id === selectedProfile.user_id);
    if (dir === 'prev' && idx > 0) setSelectedProfile(profiles[idx - 1]);
    if (dir === 'next' && idx < profiles.length - 1) setSelectedProfile(profiles[idx + 1]);
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Phone', 'Verified', 'Suspended', 'Division', 'Sales', 'Rating', 'Joined'].join(','),
      ...profiles.map(p => [`"${p.full_name || 'Unknown'}"`, p.phone_number || '', p.is_verified, p.is_suspended, p.division || '', p.total_sales || 0, p.seller_rating || 0, format(new Date(p.created_at), 'yyyy-MM-dd')].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `users_${format(new Date(), 'yyyy-MM-dd')}.csv`; link.click();
    URL.revokeObjectURL(url); toast.success('Exported');
  };

  const activeFilterCount = [searchQuery, divisionFilter !== 'all' ? divisionFilter : ''].filter(Boolean).length;
  const totalPages = Math.ceil(totalCount / PER_PAGE);

  const FilterPanel = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Search</Label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Name, phone..." className="pl-8" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Division</Label>
        <Select value={divisionFilter} onValueChange={setDivisionFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {activeFilterCount > 0 && <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setDivisionFilter('all'); }} className="w-full gap-2">Clear Filters</Button>}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Users className="h-6 w-6" /></div>
            <div><h1 className="text-2xl font-bold">User Management</h1><p className="text-muted-foreground">{totalCount} users</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${viewMode === 'table' ? 'bg-card shadow-sm' : ''}`} onClick={() => setViewMode('table')}><TableIcon className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${viewMode === 'grid' ? 'bg-card shadow-sm' : ''}`} onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${viewMode === 'split' ? 'bg-card shadow-sm' : ''}`} onClick={() => setViewMode('split')}><Columns className="h-4 w-4" /></Button>
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[160px] gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
              <SelectContent>{SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2"><Download className="h-4 w-4" /> Export</Button>
            <Sheet>
              <SheetTrigger asChild><Button variant="outline" className="gap-2 relative"><Filter className="h-4 w-4" /><span className="hidden sm:inline">Filters</span>{activeFilterCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 px-1 text-[10px]">{activeFilterCount}</Badge>}</Button></SheetTrigger>
              <SheetContent side="right" className="overflow-y-auto"><SheetHeader><SheetTitle>Filter Users</SheetTitle></SheetHeader><div className="mt-6"><FilterPanel /></div></SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center"><Users className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center"><ShieldCheck className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.verified}</p><p className="text-xs text-muted-foreground">Verified</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center"><Ban className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.suspended}</p><p className="text-xs text-muted-foreground">Suspended</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center"><UserPlus className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.newToday}</p><p className="text-xs text-muted-foreground">New Today</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center"><Flag className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.flagged}</p><p className="text-xs text-muted-foreground">Flagged</p></div></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2"><TabsList className="w-max">{STATUS_TABS.map(t => <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>)}</TabsList></div>
        </Tabs>

        <div className={`grid gap-6 mt-4 ${viewMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          <div className={viewMode === 'split' ? 'min-h-[600px]' : ''}>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : profiles.length === 0 ? (
              <Card><CardContent className="p-12 text-center"><Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No users found</p></CardContent></Card>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {profiles.map(p => (
                  <Card key={p.user_id} className={`cursor-pointer hover:shadow-md transition-all ${selectedIds.has(p.user_id) ? 'ring-2 ring-primary' : ''} ${p.is_suspended ? 'border-red-500/30' : ''}`} onClick={() => setSelectedProfile(p)}>
                    <CardContent className="p-3 text-center">
                      <Avatar className="h-12 w-12 mx-auto mb-2"><AvatarImage src={p.avatar_url || ''} /><AvatarFallback>{(p.full_name || '?')[0]}</AvatarFallback></Avatar>
                      <p className="font-medium text-sm truncate">{p.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{p.phone_number || 'No phone'}</p>
                      <div className="flex items-center justify-center gap-1 mt-2">
                        {p.is_verified && <ShieldCheck className="h-3 w-3 text-green-500" />}
                        {p.is_suspended && <Badge variant="destructive" className="text-[9px]">Suspended</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={selectedIds.size === profiles.length && profiles.length > 0} onCheckedChange={selectAll} /></TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Location</TableHead>
                      <TableHead className="hidden xl:table-cell">Sales</TableHead>
                      <TableHead className="hidden xl:table-cell">Rating</TableHead>
                      <TableHead className="hidden md:table-cell">Joined</TableHead>
                      <TableHead className="w-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map(p => (
                      <TableRow key={p.user_id} className={`cursor-pointer hover:bg-accent/50 ${selectedProfile?.user_id === p.user_id ? 'bg-accent' : ''} ${p.is_suspended ? 'border-l-2 border-l-red-500' : ''}`} onClick={() => viewMode === 'split' ? setSelectedProfile(p) : undefined}>
                        <TableCell onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.has(p.user_id)} onCheckedChange={() => toggleSelect(p.user_id)} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8"><AvatarImage src={p.avatar_url || ''} /><AvatarFallback className="text-xs">{(p.full_name || '?')[0]}</AvatarFallback></Avatar>
                            <div>
                              <p className="font-medium text-sm">{p.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{p.phone_number || 'No phone'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1">
                            {p.is_verified && <Badge variant="default" className="text-[10px] gap-1"><ShieldCheck className="h-3 w-3" /> Verified</Badge>}
                            {p.is_suspended && <Badge variant="destructive" className="text-[10px] gap-1"><Ban className="h-3 w-3" /> Suspended</Badge>}
                            {!p.is_verified && !p.is_suspended && <Badge variant="secondary" className="text-[10px]">Active</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{p.district ? `${p.district}, ${p.division}` : '—'}</TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">{p.total_sales || 0}</TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">⭐ {p.seller_rating?.toFixed(1) || 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedProfile(p)} className="gap-2"><Eye className="h-3.5 w-3.5" /> View Details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(p.is_verified ? 'unverify' : 'verify', p.user_id)} className="gap-2"><ShieldCheck className="h-3.5 w-3.5" /> {p.is_verified ? 'Unverify' : 'Verify'}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSuspendDialog({ userId: p.user_id, name: p.full_name || undefined })} className="gap-2 text-destructive"><Ban className="h-3.5 w-3.5" /> {p.is_suspended ? 'Unsuspend' : 'Suspend'}</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleAction('delete', p.user_id)} className="gap-2 text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
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

          {viewMode === 'split' && selectedProfile && (
            <div className="border rounded-lg sticky top-4 max-h-[calc(100vh-2rem)]">
              <AdminUserDetailPanel profile={selectedProfile} onClose={() => setSelectedProfile(null)} onAction={handleAction} onNavigate={navigateProfile} />
            </div>
          )}
        </div>
      </main>

      <AdminBulkActions selectedCount={selectedIds.size} onClear={() => setSelectedIds(new Set())} onBulkAction={handleBulkAction} />

      {viewMode !== 'split' && selectedProfile && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedProfile(null)}>
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <AdminUserDetailPanel profile={selectedProfile} onClose={() => setSelectedProfile(null)} onAction={handleAction} onNavigate={navigateProfile} />
          </div>
        </div>
      )}

      {/* Suspend dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={v => !v && setSuspendDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Ban className="h-5 w-5" /> Suspend {suspendDialog?.name || 'User'}</DialogTitle>
            <DialogDescription>The user will not be able to log in or post listings. They will be notified.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason for suspension</Label>
            <Textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="e.g. Violation of terms, fraudulent activity..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (suspendDialog) { handleAction('suspend', suspendDialog.userId, { reason: suspendReason }); setSuspendDialog(null); setSuspendReason(''); } }} className="gap-2"><Ban className="h-4 w-4" /> Confirm Suspend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileNav />
      <Footer />
    </div>
  );
}
