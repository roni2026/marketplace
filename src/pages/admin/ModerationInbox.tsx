/**
 * ModerationInbox — single work queue for ads, reports, reviews,
 * message reports, fraud flags, and open support tickets.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ChevronRight,
  FileCheck,
  Flag,
  HeadphonesIcon,
  Inbox,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
} from 'lucide-react';

type ItemType = 'ad' | 'report' | 'review' | 'message_report' | 'fraud' | 'ticket';

interface QueueItem {
  id: string;
  type: ItemType;
  title: string;
  subtitle: string;
  status: string;
  priority: number; // higher = more urgent
  created_at: string;
  href: string;
  meta?: string;
}

const TYPE_META: Record<
  ItemType,
  { label: string; icon: typeof Flag; tone: string; hrefBase: string }
> = {
  ad: {
    label: 'Ad',
    icon: FileCheck,
    tone: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/20',
    hrefBase: '/admin/ads',
  },
  report: {
    label: 'Report',
    icon: Flag,
    tone: 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/20',
    hrefBase: '/admin/reports',
  },
  review: {
    label: 'Review',
    icon: Star,
    tone: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/20',
    hrefBase: '/admin/reviews',
  },
  message_report: {
    label: 'Message',
    icon: MessageSquare,
    tone: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/20',
    hrefBase: '/admin/messages',
  },
  fraud: {
    label: 'Fraud',
    icon: ShieldAlert,
    tone: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20',
    hrefBase: '/admin/fraud',
  },
  ticket: {
    label: 'Ticket',
    icon: HeadphonesIcon,
    tone: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20',
    hrefBase: '/admin/support',
  },
};

function safeCount(error: { message?: string } | null, count: number | null) {
  if (error) return 0;
  return count ?? 0;
}

export default function ModerationInbox() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ItemType>('all');
  const [query, setQuery] = useState('');
  const [counts, setCounts] = useState({
    ad: 0,
    report: 0,
    review: 0,
    message_report: 0,
    fraud: 0,
    ticket: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        adsRes,
        reportsRes,
        reviewsRes,
        msgReportsRes,
        fraudRes,
        ticketsRes,
        adCount,
        reportCount,
        reviewCount,
        msgCount,
        fraudCount,
        ticketCount,
      ] = await Promise.all([
        supabase
          .from('ads')
          .select('id, title, status, created_at, user_id, division, district')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(40),
        supabase
          .from('reports')
          .select('id, reason, reason_code, status, created_at, ad_id, user_id')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(40),
        supabase
          .from('reviews')
          .select('id, title, body, rating, status, created_at, seller_id, reviewer_id')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(40),
        supabase
          .from('message_reports')
          .select('id, reason, description, status, created_at, reported_user_id, reporter_id')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(40),
        supabase
          .from('fraud_flags')
          .select('id, flag_type, description, severity, resolved, created_at, user_id')
          .eq('resolved', false)
          .order('created_at', { ascending: true })
          .limit(40),
        supabase
          .from('support_tickets')
          .select('id, subject, status, priority, created_at, user_id, category')
          .in('status', ['open', 'in_progress', 'waiting_on_user'])
          .order('created_at', { ascending: true })
          .limit(40),
        supabase.from('ads').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('message_reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('fraud_flags')
          .select('id', { count: 'exact', head: true })
          .eq('resolved', false),
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress', 'waiting_on_user']),
      ]);

      let fraudRows = (fraudRes.data as any[]) || [];
      let fraudTotal = safeCount(fraudCount.error, fraudCount.count);
      if (fraudRes.error) {
        fraudRows = [];
        fraudTotal = 0;
      }

      const queue: QueueItem[] = [];

      for (const ad of (adsRes.data as any[]) || []) {
        queue.push({
          id: ad.id,
          type: 'ad',
          title: ad.title || 'Untitled ad',
          subtitle: [ad.division, ad.district].filter(Boolean).join(' · ') || 'Pending listing',
          status: ad.status,
          priority: 80,
          created_at: ad.created_at,
          href: '/admin/ads',
          meta: ad.id.slice(0, 8),
        });
      }

      for (const r of (reportsRes.data as any[]) || []) {
        queue.push({
          id: r.id,
          type: 'report',
          title: r.reason || r.reason_code || 'User report',
          subtitle: r.reason_code ? `Code: ${r.reason_code}` : 'Listing report',
          status: r.status,
          priority: 90,
          created_at: r.created_at,
          href: '/admin/reports',
          meta: r.ad_id ? `ad ${String(r.ad_id).slice(0, 8)}` : undefined,
        });
      }

      for (const rev of (reviewsRes.data as any[]) || []) {
        queue.push({
          id: rev.id,
          type: 'review',
          title: rev.title || `${rev.rating}★ review`,
          subtitle: (rev.body || '').slice(0, 100) || 'Awaiting moderation',
          status: rev.status,
          priority: 50,
          created_at: rev.created_at,
          href: '/admin/reviews',
        });
      }

      for (const mr of (msgReportsRes.data as any[]) || []) {
        queue.push({
          id: mr.id,
          type: 'message_report',
          title: `Message report · ${String(mr.reason || 'flagged').replace(/_/g, ' ')}`,
          subtitle: (mr.description || 'Reported conversation').slice(0, 120),
          status: mr.status,
          priority: 85,
          created_at: mr.created_at,
          href: '/admin/messages',
        });
      }

      for (const f of fraudRows) {
        const sev = String(f.severity || '').toLowerCase();
        queue.push({
          id: f.id,
          type: 'fraud',
          title: String(f.flag_type || 'Fraud flag').replace(/_/g, ' '),
          subtitle: (f.description || (f.severity ? `Severity: ${f.severity}` : 'Risk signal')).slice(0, 120),
          status: f.resolved ? 'resolved' : 'open',
          priority: sev === 'critical' || sev === 'high' ? 100 : 70,
          created_at: f.created_at,
          href: '/admin/fraud',
        });
      }

      for (const t of (ticketsRes.data as any[]) || []) {
        const pr = String(t.priority || 'medium');
        queue.push({
          id: t.id,
          type: 'ticket',
          title: t.subject || 'Support ticket',
          subtitle: [t.category, t.status].filter(Boolean).join(' · '),
          status: t.status,
          priority: pr === 'urgent' ? 95 : pr === 'high' ? 75 : 40,
          created_at: t.created_at,
          href: '/admin/support',
        });
      }

      // Oldest + highest priority first
      queue.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setItems(queue);
      setCounts({
        ad: safeCount(adCount.error, adCount.count),
        report: safeCount(reportCount.error, reportCount.count),
        review: safeCount(reviewCount.error, reviewCount.count),
        message_report: safeCount(msgCount.error, msgCount.count),
        fraud: fraudTotal,
        ticket: safeCount(ticketCount.error, ticketCount.count),
      });
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to load moderation inbox');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin) load();
  }, [user, isAdmin, navigate, load]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter !== 'all' && item.type !== filter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = `${item.title} ${item.subtitle} ${item.status} ${item.meta || ''} ${item.type}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, filter, query]);

  const totalOpen =
    counts.ad + counts.report + counts.review + counts.message_report + counts.fraud + counts.ticket;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Moderation inbox"
        description="Everything waiting on staff — ads, reports, reviews, messages, fraud, and tickets"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Moderation inbox' },
        ]}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={load}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <StatCardGrid>
        <StatCard title="Open total" value={totalOpen} icon={Inbox} color="blue" loading={loading} />
        <StatCard title="Ads" value={counts.ad} icon={FileCheck} color="yellow" loading={loading} />
        <StatCard title="Reports" value={counts.report} icon={Flag} color="red" loading={loading} />
        <StatCard title="Reviews" value={counts.review} icon={Star} color="yellow" loading={loading} />
        <StatCard
          title="Messages"
          value={counts.message_report}
          icon={MessageSquare}
          color="blue"
          loading={loading}
        />
        <StatCard title="Fraud" value={counts.fraud} icon={AlertTriangle} color="red" loading={loading} />
        <StatCard
          title="Tickets"
          value={counts.ticket}
          icon={HeadphonesIcon}
          color="green"
          loading={loading}
        />
      </StatCardGrid>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search queue…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/ads">Ad queue</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/reports">Reports</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/support">Support</Link>
          </Button>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
          <TabsTrigger value="ad">Ads ({counts.ad})</TabsTrigger>
          <TabsTrigger value="report">Reports ({counts.report})</TabsTrigger>
          <TabsTrigger value="review">Reviews ({counts.review})</TabsTrigger>
          <TabsTrigger value="message_report">Messages ({counts.message_report})</TabsTrigger>
          <TabsTrigger value="fraud">Fraud ({counts.fraud})</TabsTrigger>
          <TabsTrigger value="ticket">Tickets ({counts.ticket})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="shadow-none">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium text-foreground">Inbox zero</p>
              <p className="text-sm mt-1">Nothing waiting in this filter.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => {
                const meta = TYPE_META[item.type];
                const Icon = meta.icon;
                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={item.href}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">{item.title}</span>
                        <Badge variant="outline" className={`font-normal text-[10px] ${meta.tone}`}>
                          {meta.label}
                        </Badge>
                        <Badge variant="secondary" className="font-normal text-[10px] capitalize">
                          {String(item.status).replace(/_/g, ' ')}
                        </Badge>
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {item.subtitle}
                        {item.meta ? ` · ${item.meta}` : ''}
                        {' · '}
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        This inbox is a triage board. Open an item to take action in its dedicated tool (approve, resolve,
        ban, reply).
      </p>
    </AdminLayout>
  );
}
