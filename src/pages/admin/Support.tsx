import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { LifeBuoy, Search, User, Send } from 'lucide-react';
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
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
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

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) {
      fetchTickets();
    }
  }, [user, isAdmin, navigate]);

  const fetchTickets = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('*, profiles!support_tickets_user_id_fkey(full_name, avatar_url)')
      .order('created_at', { ascending: false });
    setTickets((data as Ticket[]) || []);
    setIsLoading(false);
  };

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowTicketDialog(true);
    const { data: msgs } = await supabase
      .from('support_ticket_messages')
      .select('*, profiles!support_ticket_messages_user_id_fkey(full_name)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setTicketMessages((msgs as TicketMessage[]) || []);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket || !user) return;
    const { data } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        body: replyText.trim(),
        is_staff: true,
      })
      .select('*, profiles!support_ticket_messages_user_id_fkey(full_name)')
      .single();

    if (data) {
      setTicketMessages(prev => [...prev, data as TicketMessage]);
      setReplyText('');
      // Update ticket status to waiting_on_user
      await supabase
        .from('support_tickets')
        .update({ status: 'waiting_on_user', updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);
      // Notify user
      await supabase.from('notifications').insert({
        user_id: selectedTicket.user_id,
        type: 'ticket_update',
        title: 'Support Ticket Updated',
        message: `Your ticket "${selectedTicket.subject}" has a new response`,
        data: { ticket_id: selectedTicket.id },
      }).catch(() => {});
      toast.success('Reply sent');
      fetchTickets();
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId);
    toast.success(`Ticket marked as ${status.replace(/_/g, ' ')}`);
    fetchTickets();
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status } : null);
    }
  };

  const updateTicketPriority = async (ticketId: string, priority: string) => {
    await supabase
      .from('support_tickets')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', ticketId);
    toast.success(`Priority updated to ${priority}`);
    fetchTickets();
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, priority } : null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  const filteredTickets = tickets.filter(ticket => {
    if (activeTab !== 'all' && ticket.status !== activeTab) return false;
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    if (searchTerm) {
      const text = `${ticket.subject} ${ticket.description} ${ticket.profiles?.full_name || ''}`;
      if (!text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    waiting_on_user: tickets.filter(t => t.status === 'waiting_on_user').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <LifeBuoy className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Support Tickets</h1>
        </div>
        <p className="text-muted-foreground">Manage customer support requests</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
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
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting_on_user">Waiting on User</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="open">Open ({counts.open})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({counts.in_progress})</TabsTrigger>
          <TabsTrigger value="waiting_on_user">Waiting ({counts.waiting_on_user})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({counts.closed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
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
                  <p>No support tickets found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium max-w-xs truncate">
                            {ticket.subject}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={ticket.profiles?.avatar_url || undefined} />
                                <AvatarFallback>
                                  <User className="h-3 w-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{ticket.profiles?.full_name || 'Unknown'}</span>
                            </div>
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
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => openTicket(ticket)}>
                              View
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

      {/* Ticket Detail Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTicket.subject}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`${STATUS_COLORS[selectedTicket.status] || 'bg-gray-500'} text-white capitalize`}>
                    {selectedTicket.status.replace(/_/g, ' ')}
                  </Badge>
                  <Badge className={`${PRIORITY_COLORS[selectedTicket.priority] || 'bg-gray-500'} text-white capitalize`}>
                    {selectedTicket.priority}
                  </Badge>
                </div>

                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm">{selectedTicket.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    by {selectedTicket.profiles?.full_name || 'Unknown'} · {formatDistanceToNow(new Date(selectedTicket.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  {ticketMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_staff ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          msg.is_staff ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        <p className={`text-xs mt-1 ${
                          msg.is_staff ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {msg.is_staff ? 'Staff' : msg.profiles?.full_name || 'User'} · {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply */}
                <div className="space-y-2">
                  <Label>Reply as Staff</Label>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                  />
                </div>

                {/* Status & Priority Controls */}
                <div className="flex flex-wrap gap-3">
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(v) => updateTicketStatus(selectedTicket.id, v)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting_on_user">Waiting on User</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedTicket.priority}
                    onValueChange={(v) => updateTicketPriority(selectedTicket.id, v)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleReply} disabled={!replyText.trim()} className="gap-2 ml-auto">
                    <Send className="h-4 w-4" />
                    Send Reply
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
