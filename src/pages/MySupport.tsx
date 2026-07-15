import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link, Navigate } from 'react-router-dom';

interface Ticket { id: string; subject: string; status: string; created_at: string; }

export default function MySupport() {
  const { user, isLoading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('customer_tickets')
      .select('id,subject,status,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setTickets((data as Ticket[]) || []);
  };

  useEffect(() => { if (user) load(); }, [user?.id]);
  if (!isLoading && !user) return <Navigate to="/auth" replace />;

  const create = async () => {
    if (!user || !subject.trim() || !body.trim()) return toast.error('Subject and message required');
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('customer_tickets')
        .insert({ user_id: user.id, subject: subject.trim() })
        .select('id')
        .single();
      if (error) throw error;
      const { error: mErr } = await supabase.from('customer_ticket_messages').insert({
        ticket_id: data.id, sender_id: user.id, body: body.trim(), is_staff: false,
      });
      if (mErr) throw mErr;
      toast.success('Ticket opened');
      setSubject(''); setBody('');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not create ticket (apply schema 17)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Help & support</h1>
            <p className="text-sm text-muted-foreground">Open a ticket — our team will reply here.</p>
          </div>
          <Button variant="outline" asChild><Link to="/profile">Profile</Link></Button>
        </div>

        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">New ticket</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><Label>Message</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} /></div>
            <Button onClick={create} disabled={saving}>Submit ticket</Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {tickets.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{t.subject}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <Badge variant="secondary">{t.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {tickets.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
