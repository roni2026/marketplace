/**
 * AdminWebhooks — Configure outgoing webhooks and view delivery logs.
 */
import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Webhook, Plus, Trash2, WebhookIcon, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string | null;
  created_at: string;
}

const WEBHOOK_EVENTS = [
  'ad.created', 'ad.approved', 'ad.rejected', 'ad.sold',
  'user.signup', 'user.suspended', 'user.verified',
  'offer.created', 'offer.accepted', 'offer.rejected',
  'message.sent', 'report.created', 'report.resolved',
];

export default function AdminWebhooks() {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', secret: '' });
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('webhooks').select('*').order('created_at', { ascending: false });
      setWebhooks((data as Webhook[]) || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.url.trim()) { toast.error('Name and URL are required'); return; }
    if (selectedEvents.length === 0) { toast.error('Select at least one event'); return; }
    try {
      const { data, error } = await supabase.from('webhooks').insert({
        name: form.name.trim(),
        url: form.url.trim(),
        events: selectedEvents,
        secret: form.secret.trim() || null,
        is_active: true,
      }).select().single();
      if (error) throw error;
      setWebhooks(prev => [data as Webhook, ...prev]);
      setForm({ name: '', url: '', secret: '' });
      setSelectedEvents([]);
      setShowForm(false);
      toast.success('Webhook created');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create webhook');
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('webhooks').update({ is_active: !active }).eq('id', id);
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, is_active: !active } : w));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('webhooks').delete().eq('id', id);
    setWebhooks(prev => prev.filter(w => w.id !== id));
    toast.success('Webhook deleted');
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Webhook className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Webhooks</h1>
              <p className="text-muted-foreground">{webhooks.length} configured</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Webhook
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">New Webhook</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Slack Notifications" /></div>
                <div><Label>URL</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://hooks.slack.com/..." /></div>
              </div>
              <div><Label>Secret (optional)</Label><Input value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })} placeholder="Signing secret" /></div>
              <div>
                <Label>Events</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {WEBHOOK_EVENTS.map(event => (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggleEvent(event)}
                      className={`px-2 py-1 rounded-md text-xs font-mono border transition-colors ${
                        selectedEvents.includes(event) ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary'
                      }`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate}>Create Webhook</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        ) : webhooks.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><WebhookIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No webhooks configured</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {webhooks.map(hook => (
              <Card key={hook.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{hook.name}</p>
                        <Badge variant={hook.is_active ? 'default' : 'secondary'} className="text-[10px]">{hook.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate font-mono">{hook.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {hook.events?.map(event => <Badge key={event} variant="outline" className="text-[10px] font-mono">{event}</Badge>)}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Created {formatDistanceToNow(new Date(hook.created_at), { addSuffix: true })}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={hook.is_active} onCheckedChange={() => handleToggle(hook.id, hook.is_active)} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(hook.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}
