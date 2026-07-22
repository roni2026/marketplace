/**
 * AdminComplianceDashboard — GDPR consent logs, terms acceptance, data deletion requests.
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, FileText, CheckCircle, Download, Search, AlertTriangle, Users, FileCheck } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminComplianceDashboard() {
  const [consentLogs, setConsentLogs] = useState<any[]>([]);
  const [termsAcceptance, setTermsAcceptance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ totalConsents: 0, totalAccepted: 0, pendingDeletion: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        supabase.from('consent_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('terms_acceptance').select('*').order('accepted_at', { ascending: false }).limit(50),
      ]);
      setConsentLogs(c.data || []);
      setTermsAcceptance(t.data || []);

      // Stats
      const { count: consentCount } = await supabase.from('consent_logs').select('*', { count: 'exact', head: true });
      const { count: acceptedCount } = await supabase.from('terms_acceptance').select('*', { count: 'exact', head: true }).eq('accepted', true);
      setStats({ totalConsents: consentCount || 0, totalAccepted: acceptedCount || 0, pendingDeletion: 0 });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExportUser = async () => {
    if (!searchQuery.trim()) { toast.error('Enter a user UUID'); return; }
    try {
      toast.success('Exporting user data...');
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', searchQuery).single();
      const { data: ads } = await supabase.from('ads').select('*').eq('user_id', searchQuery);
      const { data: favorites } = await supabase.from('favorites').select('*').eq('user_id', searchQuery);
      const { data: messages } = await supabase.from('messages').select('*').or(`sender_id.eq.${searchQuery},receiver_id.eq.${searchQuery}`);

      const exportData = { profile, ads, favorites, messages, exported_at: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user_data_${searchQuery.slice(0, 8)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('User data exported');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
<div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Compliance Dashboard</h1>
            <p className="text-muted-foreground">GDPR consent, terms acceptance, and data management</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><CheckCircle className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{stats.totalConsents}</p><p className="text-xs text-muted-foreground">Consent Records</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center"><FileCheck className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{stats.totalAccepted}</p><p className="text-xs text-muted-foreground">Terms Accepted</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center"><AlertTriangle className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{stats.pendingDeletion}</p><p className="text-xs text-muted-foreground">Pending Deletions</p></div></CardContent></Card>
        </div>

        <Tabs defaultValue="data_export">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="data_export" className="flex-1 gap-2"><Download className="h-4 w-4" /> Data Export</TabsTrigger>
            <TabsTrigger value="consents" className="flex-1 gap-2"><CheckCircle className="h-4 w-4" /> Consent Logs</TabsTrigger>
            <TabsTrigger value="terms" className="flex-1 gap-2"><FileText className="h-4 w-4" /> Terms Acceptance</TabsTrigger>
          </TabsList>

          <TabsContent value="data_export">
            <Card>
              <CardHeader><CardTitle className="text-base">Export User Data (GDPR)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Export all data associated with a user. This includes profile, ads, favorites, and messages.</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Enter user UUID..." className="pl-8 font-mono" />
                  </div>
                  <Button onClick={handleExportUser} className="gap-2"><Download className="h-4 w-4" /> Export</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consents">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : consentLogs.length === 0 ? (
              <Card><CardContent className="p-8 text-center"><CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No consent logs</p></CardContent></Card>
            ) : (
              <div className="space-y-2">
                {consentLogs.map(log => (
                  <Card key={log.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{log.consent_type || 'Consent'}</p>
                        <p className="text-xs text-muted-foreground">{log.user_id?.slice(0, 8)}... · {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
                      </div>
                      <Badge variant={log.granted ? 'default' : 'destructive'} className="text-[10px]">{log.granted ? 'Granted' : 'Denied'}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="terms">
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : termsAcceptance.length === 0 ? (
              <Card><CardContent className="p-8 text-center"><FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No terms acceptance records</p></CardContent></Card>
            ) : (
              <div className="space-y-2">
                {termsAcceptance.map(t => (
                  <Card key={t.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t.terms_version || 'Terms v1'}</p>
                        <p className="text-xs text-muted-foreground">{t.user_id?.slice(0, 8)}... · {t.accepted_at && formatDistanceToNow(new Date(t.accepted_at), { addSuffix: true })}</p>
                      </div>
                      <Badge variant={t.accepted ? 'default' : 'secondary'} className="text-[10px] gap-1">
                        {t.accepted ? <><CheckCircle className="h-3 w-3" /> Accepted</> : 'Pending'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
    </AdminLayout>
  );
}
