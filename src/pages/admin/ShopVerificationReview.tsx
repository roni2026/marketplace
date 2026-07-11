import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';
import { getAllVerifications, reviewVerification } from '@/lib/shopVerification';
import type { ShopVerification, ShopVerificationStatus, VerificationType } from '@/integrations/supabase/types_v3_shops';
import { toast } from 'sonner';
import {
  ShieldCheck, Clock, CheckCircle, XCircle, FileCheck,
  Store, Search, AlertCircle,
} from 'lucide-react';

interface VerificationWithShop extends ShopVerification {
  shop: { id: string; name: string; slug: string; logo_url: string | null } | null;
}

export default function ShopVerificationReview() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<VerificationWithShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [reviewDialog, setReviewDialog] = useState<{ verification: VerificationWithShop | null; decision: 'approved' | 'rejected' | null }>({ verification: null, decision: null });
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isAdmin === false) { navigate('/'); return; }
    if (isAdmin) fetchVerifications();
  }, [user, isAdmin, navigate]);

  const fetchVerifications = async () => {
    setIsLoading(true);
    try {
      const data = await getAllVerifications();
      setVerifications(data as VerificationWithShop[]);
    } catch (err) {
      console.error('fetchVerifications error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewDialog.verification || !reviewDialog.decision || !user) return;
    setIsReviewing(true);
    try {
      await reviewVerification(
        reviewDialog.verification.id,
        reviewDialog.decision,
        user.id,
        reviewNotes,
        reviewDialog.decision === 'rejected' ? rejectionReason : undefined
      );
      setReviewDialog({ verification: null, decision: null });
      setReviewNotes('');
      setRejectionReason('');
      fetchVerifications();
    } catch (err) {
      toast.error('Failed to review verification');
    } finally {
      setIsReviewing(false);
    }
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-64 w-64" /></div>;
  }

  const filterByStatus = (status: ShopVerificationStatus | 'all') => {
    if (status === 'all') return verifications;
    return verifications.filter((v) => v.status === status);
  };

  const pending = filterByStatus('pending');
  const underReview = filterByStatus('under_review');
  const approved = filterByStatus('approved');
  const rejected = filterByStatus('rejected');

  const renderVerificationCard = (v: VerificationWithShop) => (
    <Card key={v.id}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {v.shop?.logo_url ? (
              <img src={v.shop.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{v.shop?.name || 'Unknown Shop'}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {v.verification_type.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-muted-foreground">
                Submitted {new Date(v.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Badge variant={v.status === 'approved' ? 'default' : v.status === 'rejected' ? 'destructive' : 'secondary'}>
            {v.status.replace(/_/g, ' ')}
          </Badge>
        </div>

        {v.submitted_data && Object.keys(v.submitted_data).length > 0 && (
          <div className="mt-3 space-y-1">
            {Object.entries(v.submitted_data).map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}: </span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        {v.document_urls && v.document_urls.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{v.document_urls.length} document(s) submitted</span>
          </div>
        )}

        {v.rejection_reason && (
          <div className="mt-3 p-2 rounded bg-destructive/10 text-xs text-destructive">
            <strong>Rejection reason:</strong> {v.rejection_reason}
          </div>
        )}

        {(v.status === 'pending' || v.status === 'under_review') && (
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1 h-7"
              onClick={() => { setReviewDialog({ verification: v, decision: 'approved' }); setReviewNotes(''); setRejectionReason(''); }}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1 h-7"
              onClick={() => { setReviewDialog({ verification: v, decision: 'rejected' }); setReviewNotes(''); setRejectionReason(''); }}
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <PageHeader
        title="Shop Verification Review"
        description="Review and approve shop verification requests"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Marketplace' }, { label: 'Verification' }]}
      />

      <StatCardGrid>
        <StatCard title="Pending" value={pending.length} icon={Clock} color="yellow" loading={isLoading} />
        <StatCard title="Under Review" value={underReview.length} icon={AlertCircle} color="blue" loading={isLoading} />
        <StatCard title="Approved" value={approved.length} icon={CheckCircle} color="green" loading={isLoading} />
        <StatCard title="Rejected" value={rejected.length} icon={XCircle} color="red" loading={isLoading} />
      </StatCardGrid>

      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="under_review">Under Review ({underReview.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
            <TabsTrigger value="all">All ({verifications.length})</TabsTrigger>
          </TabsList>

          {['pending', 'under_review', 'approved', 'rejected', 'all'].map((tab) => (
            <TabsContent key={tab} value={tab}>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : filterByStatus(tab as ShopVerificationStatus | 'all').length > 0 ? (
                <div className="space-y-3">
                  {filterByStatus(tab as ShopVerificationStatus | 'all').map(renderVerificationCard)}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No verifications in this category</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog.verification} onOpenChange={(open) => !open && setReviewDialog({ verification: null, decision: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.decision === 'approved' ? 'Approve' : 'Reject'} Verification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Shop: <span className="font-medium text-foreground">{reviewDialog.verification?.shop?.name}</span>
              </p>
              <p className="text-sm text-muted-foreground capitalize">
                Type: <span className="font-medium text-foreground">{reviewDialog.verification?.verification_type.replace(/_/g, ' ')}</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Review Notes</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Internal notes about this verification..."
                rows={3}
              />
            </div>
            {reviewDialog.decision === 'rejected' && (
              <div className="space-y-2">
                <Label>Rejection Reason (shown to shop owner)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this verification was rejected..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog({ verification: null, decision: null })}>
              Cancel
            </Button>
            <Button
              variant={reviewDialog.decision === 'approved' ? 'default' : 'destructive'}
              onClick={handleReview}
              disabled={isReviewing || (reviewDialog.decision === 'rejected' && !rejectionReason)}
            >
              {isReviewing ? 'Processing...' : reviewDialog.decision === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
