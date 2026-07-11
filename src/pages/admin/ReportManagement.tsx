import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import { Flag, Check, X, Eye, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { logReportAction } from '@/lib/audit';

interface Report {
  id: string;
  user_id: string;
  ad_id: string;
  reason: string;
  reason_code: string | null;
  status: string;
  admin_notes: string | null;
  is_resolved: boolean | null;
  created_at: string;
  updated_at: string;
  ads: { title: string; slug: string } | null;
  profiles: { full_name: string | null } | null;
}

const REPORT_REASONS = [
  { code: 'spam', label: 'Spam or scam' },
  { code: 'prohibited', label: 'Prohibited item' },
  { code: 'fraud', label: 'Fraudulent listing' },
  { code: 'inappropriate', label: 'Inappropriate content' },
  { code: 'misleading', label: 'Misleading information' },
  { code: 'duplicate', label: 'Duplicate listing' },
  { code: 'harassment', label: 'Harassment' },
  { code: 'other', label: 'Other' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500 hover:bg-yellow-500 text-white',
  reviewing: 'bg-blue-500 hover:bg-blue-500 text-white',
  resolved: 'bg-green-600 hover:bg-green-600 text-white',
  dismissed: 'bg-gray-500 hover:bg-gray-500 text-white',
};

export default function ReportManagement() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (isAdmin === false) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      fetchReports();
    }
  }, [user, isAdmin, navigate, activeTab]);

  const fetchReports = async () => {
    setIsLoading(true);
    let query = supabase
      .from('reports')
      .select('*, ads(title, slug), profiles!reports_user_id_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (activeTab !== 'all') {
      query = query.eq('status', activeTab);
    }

    const { data } = await query;
    setReports((data as Report[]) || []);
    setIsLoading(false);
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    const { error } = await supabase
      .from('reports')
      .update({
        status,
        is_resolved: status === 'resolved' || status === 'dismissed',
        resolved_by: user?.id,
        resolved_at: (status === 'resolved' || status === 'dismissed') ? new Date().toISOString() : null,
        admin_notes: adminNotes[reportId] || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      toast.error('Failed to update report');
    } else {
      await logReportAction(status === 'resolved' ? 'resolve' : 'update', reportId, { status });
      toast.success(`Report marked as ${status}`);
      fetchReports();
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-64 w-64" />
      </div>
    );
  }

  const filterByStatus = (status: string) => reports.filter(r => r.status === status);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Report Management</h1>
        <p className="text-muted-foreground">Review and resolve user reports</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({filterByStatus('pending').length})</TabsTrigger>
          <TabsTrigger value="reviewing">Reviewing ({filterByStatus('reviewing').length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({filterByStatus('resolved').length})</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed ({filterByStatus('dismissed').length})</TabsTrigger>
          <TabsTrigger value="all">All ({reports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Flag className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No reports found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${STATUS_COLORS[report.status] || 'bg-gray-500'} capitalize`}>
                            {report.status}
                          </Badge>
                          {report.reason_code && (
                            <Badge variant="secondary" className="capitalize">
                              {REPORT_REASONS.find(r => r.code === report.reason_code)?.label || report.reason_code}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        <p className="text-sm font-medium">
                          Reported by: {report.profiles?.full_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Reason: {report.reason}
                        </p>
                        {report.ads && (
                          <Link to={`/ad/${report.ads.slug}-${report.ad_id}`} className="text-sm text-primary hover:underline mt-1 inline-block">
                            View ad: {report.ads.title}
                          </Link>
                        )}
                        {report.admin_notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            Admin notes: {report.admin_notes}
                          </p>
                        )}

                        {/* Admin notes input */}
                        {report.status === 'pending' || report.status === 'reviewing' ? (
                          <div className="mt-3 space-y-2">
                            <Label className="text-xs">Admin Notes</Label>
                            <Textarea
                              value={adminNotes[report.id] || ''}
                              onChange={(e) => setAdminNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                              placeholder="Add notes about this report..."
                              rows={2}
                            />
                          </div>
                        ) : null}
                      </div>

                      {(report.status === 'pending' || report.status === 'reviewing') && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => updateReportStatus(report.id, 'reviewing')}
                          >
                            <Eye className="h-4 w-4" />
                            Review
                          </Button>
                          <Button
                            size="sm"
                            className="gap-2 bg-green-600 hover:bg-green-600"
                            onClick={() => updateReportStatus(report.id, 'resolved')}
                          >
                            <Check className="h-4 w-4" />
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => updateReportStatus(report.id, 'dismissed')}
                          >
                            <X className="h-4 w-4" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
