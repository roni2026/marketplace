/**
 * MessageModeration — Enterprise-grade message moderation dashboard.
 *
 * Features:
 * - Queue tabs: All, Flagged, Under Review, Resolved, Contains Keywords
 * - View modes: Table, Split-panel
 * - Filters: search (message body), sender/receiver, date range, keyword filter
 * - Detail panel: message content, sender info, receiver info, conversation context
 * - Actions: flag, unflag, delete message, suspend sender, warn user
 * - Bulk: flag all, delete all, resolve all
 * - Stats: total messages, flagged, under review, resolved today
 * - Keyword scanning: highlight flagged keywords in messages
 */
import { useEffect, useState, useCallback } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AdminBulkActions } from '@/components/admin/AdminBulkActions';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Search, Filter, CheckCircle, XCircle, Eye, Flag, Download,
  ChevronLeft, ChevronRight, Columns, Table as TableIcon, SlidersHorizontal,
  MoreVertical, Trash2, Clock, MessageSquare, Ban, AlertTriangle,
  Shield, User,
} from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  ad_id: string | null;
  body: string;
  is_read: boolean;
  status: string | null;
  created_at: string;
}

const STATUS_TABS = [
  { value: 'all', label: 'All Messages' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'reviewing', label: 'Under Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'unread', label: 'Unread' },
];

const FLAG_KEYWORDS = ['scam', 'fake', 'fraud', 'cheat', 'illegal', 'weapon', 'drug', 'money laundering', 'external payment', 'meet outside', 'cash only no receipt'];

const PER_PAGE = 20;

export default function MessageModeration() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'split'>('table');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ total: 0, flagged: 0, reviewing: 0, resolvedToday: 0 });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('7d');
  const [sort, setSort] = useState('newest');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{ sender: any; receiver: any; ad: any }>({ sender: null, receiver: null, ad: null });

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('messages').select('*', { count: 'exact' });
      if (activeTab === 'flagged') query = query.eq('status', 'flagged');
      else if (activeTab === 'reviewing') query = query.eq('status', 'reviewing');
      else if (activeTab === 'resolved') query = query.eq('status', 'resolved');
      else if (activeTab === 'unread') query = query.eq('is_read', false);

      if (searchQuery.trim()) query = query.ilike('body', `%${searchQuery}%`);
      if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        query = query.gte('created_at', subDays(new Date(), days).toISOString());
      }

      query = query.order('created_at', { ascending: sort === 'oldest' });
      query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
      const { data, count } = await query;
      setMessages((data as Message[]) || []);
      setTotalCount(count || 0);

      const today = new Date().toISOString().split('T')[0];
      const [totalRes, flaggedRes, reviewingRes, resolvedRes] = await Promise.all([
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'flagged'),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'reviewing'),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('status', 'resolved').gte('updated_at', today),
      ]);
      setStats({ total: totalRes.count || 0, flagged: flaggedRes.count || 0, reviewing: reviewingRes.count || 0, resolvedToday: resolvedRes.count || 0 });
    } catch {}
    setLoading(false);
  }, [activeTab, searchQuery, dateRange, sort, page]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { setPage(1); }, [activeTab, searchQuery, dateRange, sort]);

  const loadDetail = async (msg: Message) => {
    try {
      const [senderRes, receiverRes, adRes] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, is_verified, is_suspended, phone_number').eq('user_id', msg.sender_id).single(),
        supabase.from('profiles').select('full_name, avatar_url, is_verified, is_suspended, phone_number').eq('user_id', msg.receiver_id).single(),
        msg.ad_id ? supabase.from('ads').select('title, slug, price').eq('id', msg.ad_id).single() : Promise.resolve({ data: null }),
      ]);
      setDetailData({ sender: senderRes.data, receiver: receiverRes.data, ad: adRes.data });
    } catch {}
  };

  useEffect(() => { if (selectedMessage) loadDetail(selectedMessage); }, [selectedMessage]);

  const handleAction = async (action: string, messageId: string) => {
    setActionLoading(messageId);
    try {
      switch (action) {
        case 'flag': await supabase.from('messages').update({ status: 'flagged' }).eq('id', messageId); break;
        case 'unflag': await supabase.from('messages').update({ status: null }).eq('id', messageId); break;
        case 'reviewing': await supabase.from('messages').update({ status: 'reviewing' }).eq('id', messageId); break;
        case 'resolve': await supabase.from('messages').update({ status: 'resolved' }).eq('id', messageId); break;
        case 'delete': await supabase.from('messages').delete().eq('id', messageId); setMessages(prev => prev.filter(m => m.id !== messageId)); toast.success('Message deleted'); setActionLoading(null); return;
        case 'suspend_sender':
          if (detailData.sender) {
            await supabase.from('profiles').update({ is_suspended: true, suspended_at: new Date().toISOString(), suspended_reason: 'Suspended for message violation' }).eq('user_id', selectedMessage?.sender_id);
            toast.success('Sender suspended');
          }
          break;
      }
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: action === 'unflag' ? null : action } : m));
      toast.success(`Message ${action}ed`);
    } catch { toast.error('Failed'); }
    setActionLoading(null);
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setActionLoading('bulk');
    try {
      if (action === 'delete') { await supabase.from('messages').delete().in('id', ids); }
      else { const status = action === 'flag' ? 'flagged' : action === 'resolve' ? 'resolved' : 'reviewing'; await supabase.from('messages').update({ status }).in('id', ids); }
      toast.success(`${ids.length} messages ${action}ed`); setSelectedIds(new Set()); fetchReports();
    } catch { toast.error('Bulk action failed'); }
    setActionLoading(null);
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectAll = () => { if (selectedIds.size === messages.length) setSelectedIds(new Set()); else setSelectedIds(new Set(messages.map(m => m.id))); };
  const navigateMessage = (dir: 'prev' | 'next') => { if (!selectedMessage) return; const idx = messages.findIndex(m => m.id === selectedMessage.id); if (dir === 'prev' && idx > 0) setSelectedMessage(messages[idx - 1]); if (dir === 'next' && idx < messages.length - 1) setSelectedMessage(messages[idx + 1]); };

  const highlightKeywords = (text: string) => {
    let result = text;
    FLAG_KEYWORDS.forEach(kw => {
      const regex = new RegExp(`(${kw})`, 'gi');
      result = result.replace(regex, '<mark class="bg-red-500/20 text-red-600 rounded px-0.5">$1</mark>');
    });
    return result;
  };

  const hasFlaggedKeywords = (text: string) => FLAG_KEYWORDS.some(kw => text.toLowerCase().includes(kw));

  const statusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary" className="text-[10px]">Normal</Badge>;
    const map: Record<string, any> = { flagged: 'destructive', reviewing: 'secondary', resolved: 'default' };
    return <Badge variant={map[status] || 'secondary'} className="text-[10px] capitalize">{status}</Badge>;
  };

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return (
    <AdminLayout>
      <div className="space-y-4">
<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center"><MessageSquare className="h-6 w-6" /></div>
            <div><h1 className="text-2xl font-bold">Message Moderation</h1><p className="text-muted-foreground">{totalCount} messages</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${viewMode === 'table' ? 'bg-card shadow-sm' : ''}`} onClick={() => setViewMode('table')}><TableIcon className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${viewMode === 'split' ? 'bg-card shadow-sm' : ''}`} onClick={() => setViewMode('split')}><Columns className="h-4 w-4" /></Button>
            </div>
            <Select value={sort} onValueChange={setSort}><SelectTrigger className="w-[150px] gap-2"><SlidersHorizontal className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest First</SelectItem><SelectItem value="oldest">Oldest First</SelectItem></SelectContent></Select>
            <Sheet>
              <SheetTrigger asChild><Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /><span className="hidden sm:inline">Filters</span></Button></SheetTrigger>
              <SheetContent side="right"><SheetHeader><SheetTitle>Filter Messages</SheetTitle></SheetHeader>
                <div className="mt-6 space-y-4">
                  <div><Label>Search</Label><div className="relative mt-1"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search message body..." className="pl-8" /></div></div>
                  <div><Label>Date Range</Label><Select value={dateRange} onValueChange={setDateRange}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Today</SelectItem><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem><SelectItem value="all">All Time</SelectItem></SelectContent></Select></div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center"><MessageSquare className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.total.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Messages</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center"><Flag className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.flagged}</p><p className="text-xs text-muted-foreground">Flagged</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-yellow-500/10 text-yellow-600 flex items-center justify-center"><Eye className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.reviewing}</p><p className="text-xs text-muted-foreground">Under Review</p></div></CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center"><CheckCircle className="h-4 w-4" /></div><div><p className="text-xl font-bold">{stats.resolvedToday}</p><p className="text-xs text-muted-foreground">Resolved Today</p></div></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2"><TabsList className="w-max">{STATUS_TABS.map(t => <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5">{t.label}{t.value === 'flagged' && stats.flagged > 0 && <Badge variant="destructive" className="text-[9px] h-4 px-1">{stats.flagged}</Badge>}</TabsTrigger>)}</TabsList></div>
        </Tabs>

        <div className={`grid gap-6 mt-4 ${viewMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          <div className={viewMode === 'split' ? 'min-h-[600px]' : ''}>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : messages.length === 0 ? (
              <Card><CardContent className="p-12 text-center"><MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No messages found</p></CardContent></Card>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={selectedIds.size === messages.length && messages.length > 0} onCheckedChange={selectAll} /></TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead className="w-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map(m => {
                      const flagged = m.status === 'flagged' || hasFlaggedKeywords(m.body);
                      return (
                        <TableRow key={m.id} className={`cursor-pointer hover:bg-accent/50 ${selectedMessage?.id === m.id ? 'bg-accent' : ''} ${flagged ? 'border-l-2 border-l-red-500' : ''}`} onClick={() => viewMode === 'split' ? setSelectedMessage(m) : undefined}>
                          <TableCell onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.has(m.id)} onCheckedChange={() => toggleSelect(m.id)} /></TableCell>
                          <TableCell>
                            <p className={`text-sm line-clamp-1 ${flagged ? 'text-red-600' : ''}`}>{m.body}</p>
                            {hasFlaggedKeywords(m.body) && <Badge variant="destructive" className="text-[9px] gap-0.5 mt-0.5"><AlertTriangle className="h-2.5 w-2.5" /> Keywords</Badge>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{statusBadge(m.status)}</TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Select defaultValue="" onValueChange={v => { if (v && v !== 'view') handleAction(v, m.id); }}>
                              <SelectTrigger className="h-8 w-8 p-0 border-0"><MoreVertical className="h-4 w-4" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="view" onClick={() => setSelectedMessage(m)}>View Details</SelectItem>
                                {m.status !== 'flagged' && <SelectItem value="flag">Flag</SelectItem>}
                                {m.status === 'flagged' && <SelectItem value="unflag">Unflag</SelectItem>}
                                <SelectItem value="reviewing">Mark Reviewing</SelectItem>
                                <SelectItem value="resolve">Resolve</SelectItem>
                                <SelectItem value="delete">Delete</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

          {viewMode === 'split' && selectedMessage && (
            <div className="border rounded-lg sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Message Details</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMessage('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMessage('next')}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)}>Close</Button>
                </div>
              </div>

              {statusBadge(selectedMessage.status)}

              {/* Message content with keyword highlighting */}
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightKeywords(selectedMessage.body) }} />
              </div>

              {/* Sender */}
              {detailData.sender && (
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10"><AvatarImage src={detailData.sender.avatar_url || ''} /><AvatarFallback>{(detailData.sender.full_name || '?')[0]}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">From: {detailData.sender.full_name || 'Unknown'}</p>
                      {detailData.sender.is_verified && <Shield className="h-3 w-3 text-green-500" />}
                      {detailData.sender.is_suspended && <Badge variant="destructive" className="text-[10px]">Suspended</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{detailData.sender.phone_number || 'No phone'}</p>
                  </div>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleAction('suspend_sender', selectedMessage.id)}><Ban className="h-3.5 w-3.5" /> Suspend</Button>
                </div>
              )}

              {/* Receiver */}
              {detailData.receiver && (
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10"><AvatarImage src={detailData.receiver.avatar_url || ''} /><AvatarFallback>{(detailData.receiver.full_name || '?')[0]}</AvatarFallback></Avatar>
                  <div><p className="font-medium text-sm">To: {detailData.receiver.full_name || 'Unknown'}</p><p className="text-xs text-muted-foreground">{detailData.receiver.phone_number || 'No phone'}</p></div>
                </div>
              )}

              {/* Related listing */}
              {detailData.ad && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Related Listing</p>
                  <p className="font-medium text-sm">{detailData.ad.title}</p>
                  <p className="text-sm text-primary">৳{detailData.ad.price?.toLocaleString()}</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">Sent {formatDistanceToNow(new Date(selectedMessage.created_at), { addSuffix: true })}</p>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {selectedMessage.status !== 'flagged' && <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleAction('flag', selectedMessage.id)}><Flag className="h-4 w-4" /> Flag</Button>}
                {selectedMessage.status === 'flagged' && <Button size="sm" variant="outline" className="gap-1" onClick={() => handleAction('unflag', selectedMessage.id)}><CheckCircle className="h-4 w-4" /> Unflag</Button>}
                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleAction('resolve', selectedMessage.id)}><CheckCircle className="h-4 w-4" /> Resolve</Button>
                <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => handleAction('delete', selectedMessage.id)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AdminBulkActions selectedCount={selectedIds.size} onClear={() => setSelectedIds(new Set())} onBulkAction={handleBulkAction} />

      {viewMode !== 'split' && selectedMessage && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedMessage(null)}>
          <div className="bg-card rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="font-semibold">Message Details</h3><Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)}>Close</Button></div>
            {statusBadge(selectedMessage.status)}
            <div className="p-4 rounded-lg bg-muted/50"><p className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightKeywords(selectedMessage.body) }} /></div>
            {detailData.sender && <div className="flex items-center gap-3 p-3 rounded-lg border"><Avatar className="h-10 w-10"><AvatarImage src={detailData.sender.avatar_url || ''} /><AvatarFallback>{(detailData.sender.full_name || '?')[0]}</AvatarFallback></Avatar><div><p className="font-medium text-sm">From: {detailData.sender.full_name}</p><p className="text-xs text-muted-foreground">{detailData.sender.phone_number}</p></div></div>}
            {detailData.receiver && <div className="flex items-center gap-3 p-3 rounded-lg border"><Avatar className="h-10 w-10"><AvatarImage src={detailData.receiver.avatar_url || ''} /><AvatarFallback>{(detailData.receiver.full_name || '?')[0]}</AvatarFallback></Avatar><div><p className="font-medium text-sm">To: {detailData.receiver.full_name}</p></div></div>}
            <p className="text-xs text-muted-foreground">Sent {formatDistanceToNow(new Date(selectedMessage.created_at), { addSuffix: true })}</p>
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {selectedMessage.status !== 'flagged' && <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleAction('flag', selectedMessage.id)}><Flag className="h-4 w-4" /> Flag</Button>}
              <Button size="sm" variant="outline" className="gap-1" onClick={() => handleAction('resolve', selectedMessage.id)}><CheckCircle className="h-4 w-4" /> Resolve</Button>
              <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => handleAction('delete', selectedMessage.id)}><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
          </div>
        </div>
      )}

      
    </AdminLayout>
  );
}
