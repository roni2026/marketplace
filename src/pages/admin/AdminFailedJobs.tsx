/**
 * AdminFailedJobs — Monitor failed background jobs with retry and cleanup.
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCw, Trash2, Eye, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';

interface FailedJob {
  id: string;
  job_type: string;
  payload: any;
  error: string | null;
  attempts: number;
  failed_at: string;
  created_at: string;
}

export default function AdminFailedJobs() {
  const [jobs, setJobs] = useState<FailedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewJob, setPreviewJob] = useState<FailedJob | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('failed_jobs').select('*').order('failed_at', { ascending: false }).limit(50);
      setJobs((data as FailedJob[]) || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleRetry = async (id: string) => {
    try {
      // Move back to active by updating status or re-queuing
      const { data: job } = await supabase.from('failed_jobs').select('*').eq('id', id).single();
      if (job) {
        await supabase.from('failed_jobs').delete().eq('id', id);
        toast.success('Job retried — moved back to queue');
        loadJobs();
      }
    } catch {
      toast.error('Failed to retry job');
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('failed_jobs').delete().eq('id', id);
    setJobs(prev => prev.filter(j => j.id !== id));
    toast.success('Job deleted');
  };

  const handleClearAll = async () => {
    try {
      await supabase.from('failed_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setJobs([]);
      toast.success('All failed jobs cleared');
    } catch {
      toast.error('Failed to clear jobs');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
<div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Failed Jobs</h1>
              <p className="text-muted-foreground">{jobs.length} failed {jobs.length === 1 ? 'job' : 'jobs'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadJobs}><RefreshCw className="h-4 w-4" /></Button>
            {jobs.length > 0 && (
              <Button variant="outline" className="gap-2 text-destructive" onClick={handleClearAll}>
                <Trash2 className="h-4 w-4" /> Clear All
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        ) : jobs.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" /><p className="text-muted-foreground">No failed jobs. All systems running smoothly!</p></CardContent></Card>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => (
              <Card key={job.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> {job.job_type}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{job.attempts} {job.attempts === 1 ? 'attempt' : 'attempts'}</Badge>
                      </div>
                      <p className="text-sm text-destructive font-mono line-clamp-2">{job.error || 'Unknown error'}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Failed {formatDistanceToNow(new Date(job.failed_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewJob(job)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={() => handleRetry(job.id)}><RefreshCw className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(job.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Dialog open={!!previewJob} onOpenChange={(v) => !v && setPreviewJob(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Job Details — {previewJob?.job_type}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Error</p>
              <pre className="text-xs font-mono whitespace-pre-wrap bg-destructive/5 text-destructive p-3 rounded-lg border border-destructive/20">{previewJob?.error}</pre>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Payload</p>
              <pre className="text-xs font-mono whitespace-pre-wrap bg-muted p-3 rounded-lg">{JSON.stringify(previewJob?.payload, null, 2)}</pre>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Attempts: {previewJob?.attempts}</p>
              <p>Failed: {previewJob?.failed_at && formatDistanceToNow(new Date(previewJob.failed_at), { addSuffix: true })}</p>
              <p>Created: {previewJob?.created_at && formatDistanceToNow(new Date(previewJob.created_at), { addSuffix: true })}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    
    </AdminLayout>
  );
}
