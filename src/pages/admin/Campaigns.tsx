import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { format, subDays } from 'date-fns';
import {
  Mail, Bell, Download, Plus, Send, Eye, MousePointerClick,
  TrendingUp, Users, MessageSquare,
} from 'lucide-react';
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'push' | 'sms';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
  sent: number;
  opened: number;
  clicked: number;
  created_at: string;
}

// Campaigns are fetched from the database (notifications table or a dedicated campaigns table).
// If no campaigns table exists, we show an empty state with a call-to-action.

export default function Campaigns() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { /* stay on page — AdminRoute already gates access */ return; }
    if (isAdmin) {
      fetchCampaigns();
    }
  }, [user, isAdmin, navigate]);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      // Try to fetch from a campaigns table if it exists
      const { data, error } = await supabase
        .from('notifications')
        .select('id, notification_type, title, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        // Map notifications to campaign format
        const mapped: Campaign[] = data.map((n: any) => ({
          id: n.id,
          name: n.title || 'Untitled Campaign',
          type: n.notification_type === 'ticket_update' ? 'email' : 'push',
          status: 'completed' as const,
          sent: 1,
          opened: 0,
          clicked: 0,
          created_at: n.created_at,
        }));
        setCampaigns(mapped);
      } else {
        setCampaigns([]);
      }
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setCampaigns([]);
    }
    setIsLoading(false);
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const totalSent = campaigns.reduce((s, c) => s + c.sent, 0);
  const totalOpened = campaigns.reduce((s, c) => s + c.opened, 0);
  const totalClicked = campaigns.reduce((s, c) => s + c.clicked, 0);
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
  const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0';

  const chartData = Array.from({ length: 14 }, (_, i) => ({
    date: format(subDays(new Date(), 13 - i), 'MMM d'),
    sent: campaigns.filter(c => format(new Date(c.created_at), 'MMM d') === format(subDays(new Date(), 13 - i), 'MMM d')).reduce((s, c) => s + c.sent, 0),
    opened: campaigns.filter(c => format(new Date(c.created_at), 'MMM d') === format(subDays(new Date(), 13 - i), 'MMM d')).reduce((s, c) => s + c.opened, 0),
  }));

  return (
    <AdminLayout>
      <PageHeader
        title="Marketing Campaigns"
        description="Email campaigns, push notifications, and SMS marketing"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Marketing' }, { label: 'Campaigns' }]}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Export</Button>
            <Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New Campaign</Button>
          </>
        }
      />

      <StatCardGrid>
        <StatCard title="Total Sent" value={totalSent.toLocaleString()} icon={Send} color="blue" loading={isLoading} />
        <StatCard title="Open Rate" value={`${openRate}%`} icon={Eye} color="green" trend={3.2} trendLabel="vs last week" loading={isLoading} />
        <StatCard title="Click Rate" value={`${clickRate}%`} icon={MousePointerClick} color="purple" loading={isLoading} />
        <StatCard title="Active Campaigns" value={campaigns.filter(c => c.status === 'active').length} icon={TrendingUp} color="orange" loading={isLoading} />
      </StatCardGrid>

      <Card className="mt-6">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Campaign Performance (14 days)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-56 w-full" /> : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(220 70% 56%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(220 70% 56%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} interval={2} />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} width={40} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="sent" name="Sent" stroke="hsl(220 70% 56%)" fill="url(#colorSent)" strokeWidth={2} />
                  <Area type="monotone" dataKey="opened" name="Opened" stroke="hsl(142 71% 45%)" fill="url(#colorOpened)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold">All Campaigns</h2>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold text-lg mb-2">No Campaigns Yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first marketing campaign to get started.</p>
              <Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> New Campaign</Button>
            </CardContent>
          </Card>
        ) : (
          campaigns.map(c => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {c.type === 'email' ? <Mail className="h-5 w-5 text-primary" /> : c.type === 'push' ? <Bell className="h-5 w-5 text-primary" /> : <MessageSquare className="h-5 w-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{c.name}</p>
                    <Badge variant="outline" className="text-xs capitalize">{c.type}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Sent: <span className="font-medium text-foreground">{c.sent.toLocaleString()}</span></span>
                    <span>Opened: <span className="font-medium text-foreground">{c.opened.toLocaleString()}</span></span>
                    <span>Clicked: <span className="font-medium text-foreground">{c.clicked.toLocaleString()}</span></span>
                    {c.sent > 0 && <span>Open rate: <span className="font-medium text-green-600 dark:text-green-400">{((c.opened / c.sent) * 100).toFixed(1)}%</span></span>}
                  </div>
                </div>
                <div>
                  {c.status === 'active' && <Badge className="text-xs bg-green-500 hover:bg-green-500">Active</Badge>}
                  {c.status === 'scheduled' && <Badge className="text-xs bg-blue-500 hover:bg-blue-500">Scheduled</Badge>}
                  {c.status === 'draft' && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                  {c.status === 'completed' && <Badge variant="outline" className="text-xs">Completed</Badge>}
                  {c.status === 'paused' && <Badge variant="destructive" className="text-xs">Paused</Badge>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
