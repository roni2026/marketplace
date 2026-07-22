import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { LifeBuoy, Search, User, Send, UserCheck, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  assigned_to: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null; phone_number?: string | null } | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  body: string;
  is_staff: boolean | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  waiting_on_user: 'bg-purple-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
};

export default function SupportPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [resolution, setResolution] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      // Prefer join; fall back if FK name differs in deployed DB
      let { data, error } = await supabase
        .from('support_tickets')
        .select('*, profiles!support_tickets_user_id_fkey(full_name, avatar_url, phone_number)')
        .order('updated_at', { ascending: false });

      if (error) {
        const plain = await supabase
          .from('support_tickets')
          .select('*')
          .order('updated_at', { ascending: false });
        data = plain.data;
        error = plain.error;
      }
      if (error) throw error;

      let rows = (data as Ticket[]) || [];

      // Hydrate profiles if join failed
      if (rows.length && !rows[0]?.profiles) {
        const ids = [...new Set(rows.map((r) => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, phone_number')
          .in('user_id', ids);
        const map = new Map(
          (profiles || []).map((p: { user_id: string; full_name: string | null; avatar_url: string | null; phone_number?: string | null }) => [
            p.user_id,
            p,
          ]),
        );
        rows = rows.map((r) => ({
          ...r,
          profiles: map.get(r.user_id)
            ? {
                full_name: map.get(r.user_id)!.full_name,
                avatar_url: map.get(r.user_id)!.avatar_url,
                phone_number: map.get(r.user_id)!.phone_number,
              }
            : null,
        }));
      }

      setTickets(rows);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load tickets');
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin) fetchTickets();
  }, [user, isAdmin, navigate, fetchTickets]);

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setResolution(ticket.resolution || '');
    setShowTicketDialog(true);
    setReplyText('');

    let { data: msgs, error } = await supabase
      .from('support_ticket_messages')
      .select('*, profiles!support_ticket_messages_user_id_fkey(full_name)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });

    if (error) {
      const plain = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });
      msgs = plain.data;
    }

    let list = (msgs as TicketMessage[]) || [];
    if (list.length && !list[0]?.profiles) {
      const ids = [...new Set(list.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ids);
      const map = new Map((profiles || []).map((p: { user_id: string; full_name: string | null }) => [p.user_id, p]));
      list = list.map((m) => ({
        ...m,
        profiles: map.get(m.user_id) ? { full_name: map.get(m.user_id)!.full_name } : null,
      }));
    }
    setTicketMessages(list);

    // Auto-claim open tickets when staff opens them
    if (ticket.status === 'open' && user && (!ticket.assigned_to || ticket.assigned_to === user.id)) {
      await supabase
        .from('support_tickets')
        .update({
          status: 'in_progress',
          assigned_to: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);
      setSelectedTicket((prev) =>
        prev ? { ...prev, status: 'in_progress', assigned_to: user.id } : null,
      );
      fetchTickets();
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket || !user) return;
    setSending(true);
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          body: replyText.trim(),
          is_staff: true,
        })
        .select('*')
        .single();

      if (error) throw error;

      setTicketMessages((prev) => [
        ...prev,
        {
          ...(data as TicketMessage),
          profiles: { full_name: 'Support' },
        },
      ]);
      setReplyText('');

      await supabase
        .from('support_tickets')
        .update({
          status: 'waiting_on_user',
          assigned_to: selectedTicket.assigned_to || user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTicket.id);

      // Best-effort customer notification
      await supabase.from('notifications').insert({
        user_id: selectedTicket.user_id,
        type: 'ticket_update',
        title: 'Support replied',
        message: `New reply on “${selectedTicket.subject}”`,
        data: { ticket_id: selectedTicket.id },
      });

      setSelectedTicket((prev) =>
        prev ? { ...prev, status: 'waiting_on_user', assigned_to: prev.assigned_to || user.id } : null,
      );
      toast.success('Reply sent — customer notified');
      fetchTickets();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    const payload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'resolved' && resolution.trim()) {
      payload.resolution = resolution.trim();
    }
    const { error } = await supabase.from('support_tickets').update(payload).eq('id', ticketId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Ticket marked as ${status.replace(/_/g, ' ')}`);
    fetchTickets();
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) =>
        prev
          ? {
              ...prev,
              status,
              resolution: (payload.resolution as string) || prev.resolution,
            }
          : null,
      );
    }

    // Notify customer of status change
    const t = tickets.find((x) => x.id === ticketId) || selectedTicket;
    if (t) {
      await supabase.from('notifications').insert({
        user_id: t.user_id,
        type: 'ticket_update',
        title: 'Ticket status updated',
        message: `“${t.subject}” is now ${status.replace(/_/g, ' ')}`,
        data: { ticket_id: ticketId, status },
      });
    }
  };

  const updateTicketPriority = async (ticketId: string, priority: string) => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', ticketId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Priority → ${priority}`);
    fetchTickets();
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) => (prev ? { ...prev, priority } : null));
    }
  };

  const assignToMe = async (ticketId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to: user.id,
        status: selectedTicket?.status === 'open' ? 'in_progress' : selectedTicket?.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Assigned to you');
    fetchTickets();
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) =>
        prev
          ? {
              ...prev,
              assigned_to: user.id,
              status: prev.status === 'open' ? 'in_progress' : prev.status,
            }
          : null,
      );
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  const filteredTickets = tickets.filter((ticket) => {
    if (activeTab !== 'all' && ticket.status !== activeTab) return false;
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    if (searchTerm) {
      const text = `${ticket.subject} ${ticket.description} ${ticket.category || ''} ${ticket.profiles?.full_name || ''} ${ticket.profiles?.phone_number || ''}`;
      if (!text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    waiting_on_user: tickets.filter((t) => t.status === 'waiting_on_user').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    closed: tickets.filter((t) => t.status === 'closed').length,
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <LifeBuoy className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Support tickets</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Same queue customers use at <span className="font-mono text-xs">/my/support</span>
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchTickets}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Open', value: counts.open },
          { label: 'In progress', value: counts.in_progress },
          { label: 'Waiting on user', value: counts.waiting_on_user },
          { label: 'Resolved', value: counts.resolved },
        ].map((s) => (
          <Card key={s.label} className="shadow-none">
            <CardContent className="p-3">
              <p className="text-xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subject, user, phone…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="waiting_on_user">Waiting on user</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="open">Open ({counts.open})</TabsTrigger>
          <TabsTrigger value="in_progress">In progress ({counts.in_progress})</TabsTrigger>
          <TabsTrigger value="waiting_on_user">Waiting ({counts.waiting_on_user})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({counts.closed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card className="shadow-none">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <LifeBuoy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-foreground">No tickets here</p>
                  <p className="text-sm mt-1">New customer tickets from /my/support show up automatically.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id} className="cursor-pointer" onClick={() => openTicket(ticket)}>
                          <TableCell className="font-medium max-w-[220px] truncate">{ticket.subject}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={ticket.profiles?.avatar_url || undefined} />
                                <AvatarFallback>
                                  <User className="h-3 w-3" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm truncate">{ticket.profiles?.full_name || 'Unknown'}</p>
                                {ticket.profiles?.phone_number && (
                                  <p className="text-[11px] text-muted-foreground">{ticket.profiles.phone_number}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs capitalize text-muted-foreground">
                            {(ticket.category || '—').replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_COLORS[ticket.status] || 'bg-gray-500'} text-white capitalize text-xs`}>
                              {ticket.status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${PRIORITY_COLORS[ticket.priority] || 'bg-gray-500'} text-white capitalize text-xs`}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(ticket.updated_at || ticket.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openTicket(ticket);
                              }}
                            >
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{selectedTicket.subject}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge className={`${STATUS_COLORS[selectedTicket.status] || 'bg-gray-500'} text-white capitalize`}>
                    {selectedTicket.status.replace(/_/g, ' ')}
                  </Badge>
                  <Badge className={`${PRIORITY_COLORS[selectedTicket.priority] || 'bg-gray-500'} text-white capitalize`}>
                    {selectedTicket.priority}
                  </Badge>
                  {selectedTicket.category && (
                    <Badge variant="secondary" className="capitalize">
                      {selectedTicket.category.replace(/_/g, ' ')}
                    </Badge>
                  )}
                  {selectedTicket.assigned_to === user?.id && (
                    <Badge variant="outline" className="gap-1">
                      <UserCheck className="h-3 w-3" /> You
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>{selectedTicket.profiles?.full_name || 'Customer'}</span>
                  {selectedTicket.profiles?.phone_number && (
                    <>
                      <span>·</span>
                      <span>{selectedTicket.profiles.phone_number}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>
                    Opened {formatDistanceToNow(new Date(selectedTicket.created_at), { addSuffix: true })}
                  </span>
                </div>

                <div className="bg-muted rounded-lg p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Original request</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {ticketMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No thread messages yet.</p>
                  ) : (
                    ticketMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.is_staff ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            msg.is_staff ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}
                        >
                          <p className="text-[11px] opacity-70 mb-0.5">
                            {msg.is_staff ? 'Staff' : msg.profiles?.full_name || 'Customer'}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                          <p className={`text-[10px] mt-1 ${msg.is_staff ? 'opacity-70' : 'text-muted-foreground'}`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {selectedTicket.status !== 'closed' && (
                  <div className="space-y-2 border-t pt-4">
                    <Textarea
                      placeholder="Write a staff reply…"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={selectedTicket.status}
                        onValueChange={(v) => updateTicketStatus(selectedTicket.id, v)}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In progress</SelectItem>
                          <SelectItem value="waiting_on_user">Waiting on user</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={selectedTicket.priority}
                        onValueChange={(v) => updateTicketPriority(selectedTicket.id, v)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedTicket.assigned_to !== user?.id && (
                        <Button type="button" variant="outline" size="sm" onClick={() => assignToMe(selectedTicket.id)}>
                          Assign to me
                        </Button>
                      )}
                      <Button onClick={handleReply} disabled={!replyText.trim() || sending} className="gap-2 ml-auto">
                        <Send className="h-4 w-4" />
                        {sending ? 'Sending…' : 'Send reply'}
                      </Button>
                    </div>
                    {(selectedTicket.status === 'resolved' || selectedTicket.status === 'in_progress') && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Resolution note (optional)</label>
                        <Textarea
                          rows={2}
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          placeholder="What fixed it?"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                        >
                          Save as resolved
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
