/**
 * AdminEmailQueue — View queued emails, retry failed sends, preview content.
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, RefreshCw, Eye, AlertCircle, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  body_html: string | null;
  body_text: string | null;
}

const STATUS_ICONS: Record<string, any> = {
  sent: CheckCircle, delivered: CheckCircle, pending: Clock,
  failed: XCircle, bounced: AlertCircle, read: Eye,
};

export default function AdminEmailQueue() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewEmail, setPreviewEmail] = useState<EmailLog | null>(null);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(50);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data } = await query;
      setEmails((data as EmailLog[]) || []);
    } catch {}
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadEmails(); }, [loadEmails]);

  const handleRetry = async (id: string) => {
    try {
      await supabase.from('email_logs').update({ status: 'pending', error_message: null }).eq('id', id);
      toast.success('Email queued for retry');
      loadEmails();
    } catch {
      toast.error('Failed to retry');
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: any; icon: any }> = {
      sent: { variant: 'default', icon: CheckCircle },
      delivered: { variant: 'default', icon: CheckCircle },
      pending: { variant: 'secondary', icon: Clock },
      failed: { variant: 'destructive', icon: XCircle },
      bounced: { variant: 'destructive', icon: AlertCircle },
      read: { variant: 'default', icon: Eye },
    };
    const cfg = map[status] || { variant: 'secondary', icon: Mail };
    const Icon = cfg.icon;
    return <Badge variant={cfg.variant} className="gap-1 capitalize"><Icon className="h-3 w-3" /> {status}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Email Queue</h1>
              <p className="text-muted-foreground">{emails.length} emails</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadEmails}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : emails.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No emails found</p></CardContent></Card>
        ) : (
          <div className="space-y-2">
            {emails.map(email => (
              <Card key={email.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{email.subject || '(no subject)'}</p>
                      {statusBadge(email.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">To: {email.to_email}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}</p>
                    {email.error_message && <p className="text-xs text-destructive mt-1">Error: {email.error_message}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewEmail(email)}><Eye className="h-4 w-4" /></Button>
                    {(email.status === 'failed' || email.status === 'bounced') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRetry(email.id)}><Send className="h-4 w-4" /></Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Email Preview */}
      <Dialog open={!!previewEmail} onOpenChange={(v) => !v && setPreviewEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{previewEmail?.subject || 'Email Preview'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <p><span className="text-muted-foreground">To:</span> {previewEmail?.to_email}</p>
              <p><span className="text-muted-foreground">Status:</span> {previewEmail && statusBadge(previewEmail.status)}</p>
              <p><span className="text-muted-foreground">Sent:</span> {previewEmail?.sent_at ? formatDistanceToNow(new Date(previewEmail.sent_at), { addSuffix: true }) : 'Not sent'}</p>
            </div>
            <div className="border rounded-lg p-4 bg-muted/50">
              {previewEmail?.body_html ? (
                <div dangerouslySetInnerHTML={{ __html: previewEmail.body_html }} />
              ) : previewEmail?.body_text ? (
                <pre className="text-sm whitespace-pre-wrap font-sans">{previewEmail.body_text}</pre>
              ) : (
                <p className="text-muted-foreground text-sm">No email body content</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
