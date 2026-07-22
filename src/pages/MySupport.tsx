import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  CheckCircle2,
} from 'lucide-react';

type TicketStatus = 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: TicketStatus | string;
  priority: TicketPriority | string;
  category: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  body: string;
  is_staff: boolean | null;
  created_at: string;
}

const CATEGORIES = [
  { value: 'account', label: 'Account & login' },
  { value: 'listings', label: 'Listings & ads' },
  { value: 'payments', label: 'Payments & membership' },
  { value: 'orders', label: 'Orders & offers' },
  { value: 'safety', label: 'Safety & reports' },
  { value: 'technical', label: 'Technical issue' },
  { value: 'other', label: 'Something else' },
] as const;

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_on_user: 'Needs your reply',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_CLASS: Record<string, string> = {
  open: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20',
  in_progress: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/20',
  waiting_on_user: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20',
  resolved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  closed: 'bg-muted text-muted-foreground border-border',
};

function statusBadge(status: string) {
  return (
    <Badge variant="outline" className={`font-normal capitalize ${STATUS_CLASS[status] || ''}`}>
      {STATUS_LABEL[status] || status.replace(/_/g, ' ')}
    </Badge>
  );
}

function isOpenStatus(status: string) {
  return ['open', 'in_progress', 'waiting_on_user'].includes(status);
}

export default function MySupport() {
  const { user, isLoading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'new' | 'thread'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  // new ticket form
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('account');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [creating, setCreating] = useState(false);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) || null,
    [tickets, selectedId],
  );

  const loadTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id,user_id,subject,description,status,priority,category,resolution,created_at,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setTickets((data as Ticket[]) || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load tickets';
      toast.error(msg);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadTickets();
  }, [user, loadTickets]);

  const openThread = async (ticketId: string) => {
    setSelectedId(ticketId);
    setView('thread');
    setLoadingThread(true);
    setReply('');
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('id,ticket_id,user_id,body,is_staff,created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data as TicketMessage[]) || []);
      // mark as read-ish: if waiting on user and they open, no auto status change
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not load conversation');
      setMessages([]);
    } finally {
      setLoadingThread(false);
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const createTicket = async () => {
    if (!user) return;
    if (!subject.trim() || !body.trim()) {
      toast.error('Add a subject and a short description.');
      return;
    }
    setCreating(true);
    try {
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          description: body.trim(),
          category,
          priority,
          status: 'open',
        })
        .select('id,user_id,subject,description,status,priority,category,resolution,created_at,updated_at')
        .single();
      if (error) throw error;

      // Seed first message so admin and customer share one thread
      const { error: mErr } = await supabase.from('support_ticket_messages').insert({
        ticket_id: ticket.id,
        user_id: user.id,
        body: body.trim(),
        is_staff: false,
      });
      if (mErr) throw mErr;

      toast.success('Ticket opened — we’ll reply here.');
      setSubject('');
      setBody('');
      setCategory('account');
      setPriority('medium');
      await loadTickets();
      await openThread(ticket.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not create ticket');
    } finally {
      setCreating(false);
    }
  };

  const sendReply = async () => {
    if (!user || !selected || !reply.trim()) return;
    if (selected.status === 'closed') {
      toast.error('This ticket is closed. Reopen it to reply.');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selected.id,
          user_id: user.id,
          body: reply.trim(),
          is_staff: false,
        })
        .select('id,ticket_id,user_id,body,is_staff,created_at')
        .single();
      if (error) throw error;

      // Customer reply → back to open / in_progress for staff
      const nextStatus =
        selected.status === 'resolved' || selected.status === 'waiting_on_user'
          ? 'open'
          : selected.status;
      await supabase
        .from('support_tickets')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', selected.id);

      setMessages((prev) => [...prev, data as TicketMessage]);
      setReply('');
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? { ...t, status: nextStatus, updated_at: new Date().toISOString() }
            : t,
        ),
      );
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not send reply');
    } finally {
      setSending(false);
    }
  };

  const reopenTicket = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .eq('id', selected.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Ticket reopened');
    setTickets((prev) =>
      prev.map((t) =>
        t.id === selected.id ? { ...t, status: 'open', updated_at: new Date().toISOString() } : t,
      ),
    );
  };

  const closeTicket = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', selected.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Ticket closed');
    setTickets((prev) =>
      prev.map((t) =>
        t.id === selected.id ? { ...t, status: 'closed', updated_at: new Date().toISOString() } : t,
      ),
    );
  };

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const openCount = tickets.filter((t) => isOpenStatus(t.status)).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Support — BazarBD</title>
      </Helmet>
      <Header />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-6 md:py-8 pb-24 lg:pb-10">
        {/* List header */}
        {view === 'list' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                  <h1 className="text-2xl font-semibold tracking-tight">Help & support</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  Same tickets our team sees in admin — reply here anytime.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/help">
                    <HelpCircle className="h-4 w-4 mr-1.5" />
                    Help center
                  </Link>
                </Button>
                <Button size="sm" onClick={() => setView('new')} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  New ticket
                </Button>
              </div>
            </div>

            {!loading && openCount > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                {openCount} open ticket{openCount === 1 ? '' : 's'}
              </p>
            )}

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <Card className="shadow-none border-dashed">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium mb-1">No tickets yet</p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    Stuck on a listing, payment, or account issue? Open a ticket and we’ll follow up here.
                  </p>
                  <Button onClick={() => setView('new')}>Open a ticket</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-xl border bg-card divide-y overflow-hidden">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openThread(t.id)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium truncate">{t.subject}</span>
                        {statusBadge(t.status)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        {t.category && (
                          <>
                            <span className="capitalize">{t.category.replace(/_/g, ' ')}</span>
                            <span>·</span>
                          </>
                        )}
                        <Clock className="h-3 w-3" />
                        Updated {formatDistanceToNow(new Date(t.updated_at || t.created_at), { addSuffix: true })}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link to="/account" className="text-primary underline-offset-4 hover:underline">
                My account
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link to="/contact" className="text-primary underline-offset-4 hover:underline">
                Contact
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link to="/safety" className="text-primary underline-offset-4 hover:underline">
                Safety tips
              </Link>
            </div>
          </>
        )}

        {/* New ticket */}
        {view === 'new' && (
          <>
            <button
              type="button"
              onClick={() => setView('list')}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to tickets
            </button>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">New support ticket</h1>
            <p className="text-sm text-muted-foreground mb-6">
              A bit of detail goes a long way — include listing links or order info if you have them.
            </p>
            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What do you need help with?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low — whenever you can</SelectItem>
                        <SelectItem value="medium">Normal</SelectItem>
                        <SelectItem value="high">High — blocking me</SelectItem>
                        <SelectItem value="urgent">Urgent — safety or payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Short summary"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Describe the issue</Label>
                  <Textarea
                    id="body"
                    rows={6}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="What happened, what you expected, and any error messages…"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={createTicket} disabled={creating}>
                    {creating ? 'Submitting…' : 'Submit ticket'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setView('list')}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Thread */}
        {view === 'thread' && selected && (
          <>
            <button
              type="button"
              onClick={() => {
                setView('list');
                setSelectedId(null);
                setMessages([]);
              }}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All tickets
            </button>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight mb-2 break-words">{selected.subject}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  {statusBadge(selected.status)}
                  {selected.category && (
                    <Badge variant="secondary" className="font-normal capitalize">
                      {selected.category.replace(/_/g, ' ')}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground capitalize">
                    {selected.priority} priority
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => openThread(selected.id)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
                {selected.status === 'closed' || selected.status === 'resolved' ? (
                  <Button type="button" size="sm" variant="outline" onClick={reopenTicket}>
                    Reopen
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" onClick={closeTicket}>
                    Close
                  </Button>
                )}
              </div>
            </div>

            {/* Original description */}
            <Card className="shadow-none mb-4">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Original request</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{selected.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Opened {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                </p>
                {selected.resolution && (
                  <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Resolution</p>
                      <p className="text-sm mt-0.5">{selected.resolution}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-3 mb-4 min-h-[120px]">
              {loadingThread ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 rounded-lg" />
                  <Skeleton className="h-16 rounded-lg ml-8" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No replies yet — you’ll see staff responses here.
                </p>
              ) : (
                messages.map((msg) => {
                  const mine = msg.user_id === user?.id && !msg.is_staff;
                  const staff = !!msg.is_staff;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${staff ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                          staff
                            ? 'bg-muted rounded-bl-md'
                            : 'bg-primary text-primary-foreground rounded-br-md'
                        }`}
                      >
                        <p className="text-[11px] opacity-70 mb-0.5">
                          {staff ? 'Support team' : 'You'}
                        </p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        <p className={`text-[10px] mt-1 ${staff ? 'text-muted-foreground' : 'opacity-70'}`}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={threadEndRef} />
            </div>

            {selected.status !== 'closed' ? (
              <div className="sticky bottom-16 lg:bottom-4 rounded-xl border bg-card p-3 shadow-sm space-y-2">
                <Textarea
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply…"
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sending ? 'Sending…' : 'Send reply'}
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="shadow-none border-dashed">
                <CardContent className="py-4 text-center text-sm text-muted-foreground">
                  This ticket is closed.{' '}
                  <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={reopenTicket}>
                    Reopen it
                  </button>{' '}
                  if you still need help.
                </CardContent>
              </Card>
            )}
          </>
        )}

        {view === 'thread' && !selected && !loading && (
          <p className="text-sm text-muted-foreground">
            Ticket not found.{' '}
            <button type="button" className="text-primary underline" onClick={() => setView('list')}>
              Back
            </button>
          </p>
        )}
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
