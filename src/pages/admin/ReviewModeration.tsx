import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getReviewAnalytics, ReviewAnalytics } from '@/lib/reviews';
import { formatDistanceToNow } from 'date-fns';
import { Check, X, AlertCircle, Star, ThumbsUp, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface ReviewItem {
  id: string;
  ad_id: string | null;
  reviewer_id: string;
  seller_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  videos: string[];
  is_verified_purchase: boolean;
  helpful_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'appealed';
  appeal_reason: string | null;
  created_at: string;
  reviewer?: { full_name: string | null; avatar_url: string | null };
  ads?: { title: string } | null;
}

export default function ReviewModeration() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [pendingReviews, setPendingReviews] = useState<ReviewItem[]>([]);
  const [appealedReviews, setAppealedReviews] = useState<ReviewItem[]>([]);
  const [reportedReviews, setReportedReviews] = useState<ReviewItem[]>([]);
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [appealDialogOpen, setAppealDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      if (isAdmin === false) {
        navigate('/');
        return;
      }
      if (isAdmin) {
        fetchAll();
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchPending(), fetchAppealed(), fetchReported(), fetchAnalyticsSummary()]);
    setIsLoading(false);
  }, []);

  const fetchPending = async () => {
    const { data } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url),
        ads(title)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPendingReviews((data as ReviewItem[]) || []);
  };

  const fetchAppealed = async () => {
    const { data } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url),
        ads(title)
      `)
      .eq('status', 'appealed')
      .order('created_at', { ascending: false });
    setAppealedReviews((data as ReviewItem[]) || []);
  };

  const fetchReported = async () => {
    const { data: reports } = await supabase
      .from('reports')
      .select('resource_id')
      .eq('resource_type', 'review')
      .eq('status', 'pending');

    if (!reports || reports.length === 0) {
      setReportedReviews([]);
      return;
    }

    const reviewIds = reports.map((r: { resource_id: string }) => r.resource_id);
    const { data } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url),
        ads(title)
      `)
      .in('id', reviewIds)
      .order('created_at', { ascending: false });
    setReportedReviews((data as ReviewItem[]) || []);
  };

  const fetchAnalyticsSummary = async () => {
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating, created_at, seller_id')
      .eq('status', 'approved');

    const totalReviews = (allReviews || []).length;
    const averageRating = totalReviews > 0
      ? (allReviews || []).reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalReviews
      : 0;

    const distMap = new Map<number, number>();
    for (let i = 1; i <= 5; i++) distMap.set(i, 0);
    for (const r of (allReviews || [])) {
      distMap.set(r.rating, (distMap.get(r.rating) || 0) + 1);
    }
    const distribution = Array.from(distMap.entries()).map(([rating, count]) => ({ rating, count }));

    setAnalytics({
      averageRating,
      totalReviews,
      distribution,
      recentTrend: [],
    });
  };

  const handleApprove = async (reviewId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('reviews')
      .update({
        status: 'approved',
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (error) {
      toast.error('Failed to approve review');
      return;
    }
    toast.success('Review approved');
    fetchAll();
  };

  const handleReject = async () => {
    if (!user || !selectedReview) return;
    const { error } = await supabase
      .from('reviews')
      .update({
        status: 'rejected',
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
        appeal_reason: rejectReason,
      })
      .eq('id', selectedReview.id);

    if (error) {
      toast.error('Failed to reject review');
      return;
    }
    toast.success('Review rejected');
    setRejectDialogOpen(false);
    setSelectedReview(null);
    setRejectReason('');
    fetchAll();
  };

  const handleResolveAppeal = async (reviewId: string, approve: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from('reviews')
      .update({
        status: approve ? 'approved' : 'rejected',
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (error) {
      toast.error('Failed to resolve appeal');
      return;
    }
    toast.success(`Appeal ${approve ? 'approved' : 'denied'}`);
    fetchAll();
  };

  const openRejectDialog = (review: ReviewItem) => {
    setSelectedReview(review);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const renderReviewCard = (review: ReviewItem, actions: React.ReactNode) => (
    <Card key={review.id} className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.reviewer?.avatar_url || undefined} />
            <AvatarFallback>{review.reviewer?.full_name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium text-sm">{review.reviewer?.full_name || 'Anonymous'}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                  {review.ads && ` · ${review.ads.title}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                  />
                ))}
              </div>
            </div>

            {review.title && <p className="font-semibold mt-2">{review.title}</p>}
            {review.body && <p className="text-sm text-muted-foreground mt-1">{review.body}</p>}

            {review.images && review.images.length > 0 && (
              <div className="flex gap-2 mt-3">
                {review.images.slice(0, 4).map((img, i) => (
                  <img key={i} src={img} alt={`Review ${i + 1}`} className="h-16 w-16 rounded object-cover" />
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-3">
              {review.is_verified_purchase && (
                <Badge variant="default" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Verified Purchase
                </Badge>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ThumbsUp className="h-3 w-3" />
                {review.helpful_count}
              </span>
              {review.appeal_reason && (
                <span className="flex items-center gap-1 text-xs text-orange-600">
                  <AlertCircle className="h-3 w-3" />
                  Appeal: {review.appeal_reason}
                </span>
              )}
            </div>

            {actions && <div className="flex gap-2 mt-4">{actions}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (authLoading || isLoading) {
    return (
      <AdminLayout>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Review Moderation</h1>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Approved Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{analytics.totalReviews}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold flex items-center gap-1">
                {analytics.averageRating.toFixed(1)}
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {analytics.distribution.reverse().map((d) => (
                  <div key={d.rating} className="flex items-center gap-2 text-xs">
                    <span className="w-4">{d.rating}★</span>
                    <div className="flex-1 bg-muted rounded h-2 overflow-hidden">
                      <div
                        className="bg-yellow-400 h-full"
                        style={{ width: `${analytics.totalReviews > 0 ? (d.count / analytics.totalReviews) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-8 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingReviews.length})
          </TabsTrigger>
          <TabsTrigger value="appealed">
            Appealed ({appealedReviews.length})
          </TabsTrigger>
          <TabsTrigger value="reported">
            Reported ({reportedReviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No pending reviews</p>
              </CardContent>
            </Card>
          ) : (
            pendingReviews.map((review) =>
              renderReviewCard(review, (
                <>
                  <Button size="sm" onClick={() => handleApprove(review.id)}>
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => openRejectDialog(review)}>
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </>
              ))
            )
          )}
        </TabsContent>

        <TabsContent value="appealed" className="mt-6">
          {appealedReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No appealed reviews</p>
              </CardContent>
            </Card>
          ) : (
            appealedReviews.map((review) =>
              renderReviewCard(review, (
                <>
                  <Button size="sm" onClick={() => handleResolveAppeal(review.id, true)}>
                    <Check className="h-4 w-4 mr-1" />
                    Approve Appeal
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleResolveAppeal(review.id, false)}>
                    <X className="h-4 w-4 mr-1" />
                    Deny Appeal
                  </Button>
                </>
              ))
            )
          )}
        </TabsContent>

        <TabsContent value="reported" className="mt-6">
          {reportedReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No reported reviews</p>
              </CardContent>
            </Card>
          ) : (
            reportedReviews.map((review) =>
              renderReviewCard(review, (
                <>
                  <Button size="sm" onClick={() => handleApprove(review.id)}>
                    <Check className="h-4 w-4 mr-1" />
                    Keep (Approve)
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => openRejectDialog(review)}>
                    <X className="h-4 w-4 mr-1" />
                    Remove (Reject)
                  </Button>
                </>
              ))
            )
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Review</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this review. The reviewer will be able to appeal.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>
              Reject Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
