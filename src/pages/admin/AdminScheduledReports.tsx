/**
 * AdminScheduledReports — Schedule recurring reports that are auto-emailed.
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Plus, Trash2, Mail, Clock, FileText, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ScheduledReport {
  id: string;
  name: string;
  report_type: string;
  frequency: string;
  recipients: string[];
  is_active: boolean;
  last_run: string | null;
  next_run: string | null;
  created_at: string;
}

const REPORT_TYPES = [
  { value: 'user_growth', label: 'User Growth Report' },
  { value: 'listing_stats', label: 'Listing Statistics' },
  { value: 'revenue_summary', label: 'Revenue Summary' },
  { value: 'moderation_queue', label: 'Moderation Queue Status' },
  { value: 'search_analytics', label: 'Search Analytics' },
  { value: 'seller_performance', label: 'Seller Performance' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function AdminScheduledReports() {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', report_type: 'user_growth', frequency: 'weekly', recipients: '' });

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('scheduled_reports').select('*').order('created_at', { ascending: false });
      setReports((data as ScheduledReport[]) || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.recipients.trim()) { toast.error('Name and recipients are required'); return; }
    const recipients = form.recipients.split(',').map(r => r.trim()).filter(Boolean);
    try {
      const { data, error } = await supabase.from('scheduled_reports').insert({
        name: form.name.trim(),
        report_type: form.report_type,
        frequency: form.frequency,
        recipients,
        is_active: true,
      }).select().single();
      if (error) throw error;
      setReports(prev => [data as ScheduledReport, ...prev]);
      setForm({ name: '', report_type: 'user_growth', frequency: 'weekly', recipients: '' });
      setShowForm(false);
      toast.success('Scheduled report created');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create report');
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('scheduled_reports').update({ is_active: !active }).eq('id', id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, is_active: !active } : r));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('scheduled_reports').delete().eq('id', id);
    setReports(prev => prev.filter(r => r.id !== id));
    toast.success('Report schedule deleted');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-20 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Scheduled Reports</h1>
              <p className="text-muted-foreground">{reports.length} scheduled</p>
            </div>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" /> Schedule Report
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">New Scheduled Report</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Report Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Weekly User Growth" /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Report Type</Label>
                  <Select value={form.report_type} onValueChange={v => setForm({ ...form, report_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Recipients (comma-separated emails)</Label><Input value={form.recipients} onChange={e => setForm({ ...form, recipients: e.target.value })} placeholder="admin@bazarbd.com, team@bazarbd.com" /></div>
              <div className="flex gap-2">
                <Button onClick={handleCreate}>Create Schedule</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        ) : reports.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No scheduled reports</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <Card key={report.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-primary" />
                        <p className="font-medium text-sm">{report.name}</p>
                        <Badge variant={report.is_active ? 'default' : 'secondary'} className="text-[10px]">{report.is_active ? 'Active' : 'Paused'}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {report.frequency}</span>
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {report.recipients?.length || 0} recipient(s)</span>
                        {report.last_run && <span>Last run: {formatDistanceToNow(new Date(report.last_run), { addSuffix: true })}</span>}
                        {report.next_run && <span>Next: {formatDistanceToNow(new Date(report.next_run), { addSuffix: true })}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={report.is_active} onCheckedChange={() => handleToggle(report.id, report.is_active)} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(report.id)}>
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
