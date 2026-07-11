import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  createReview as createReviewFn,
  getReviews as getReviewsFn,
  getSellerReviews as getSellerReviewsFn,
  replyToReview as replyToReviewFn,
  markReviewHelpful as markReviewHelpfulFn,
  moderateReview as moderateReviewFn,
  appealReview as appealReviewFn,
  getReviewAnalytics as getReviewAnalyticsFn,
  ReviewWithDetails,
  ReviewAnalytics,
} from '@/lib/reviews';
import { toast } from 'sonner';

export function useReviews(adId?: string) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!adId) return;
    setIsLoading(true);
    setError(null);
    const { data, error } = await getReviewsFn(adId);
    if (error) {
      setError(error.message);
    } else {
      setReviews(data || []);
    }
    setIsLoading(false);
  }, [adId]);

  const fetchReviewAnalytics = useCallback(async (sellerId: string) => {
    setError(null);
    const data = await getReviewAnalyticsFn(sellerId);
    setAnalytics(data);
  }, []);

  const createReview = useCallback(async (
    rating: number,
    title: string,
    body: string,
    images: string[] = [],
    videos: string[] = []
  ) => {
    if (!user || !adId) return { error: 'Not authenticated' };
    const { data, error } = await createReviewFn(adId, user.id, rating, title, body, images, videos);
    if (error) {
      toast.error(error.message || 'Failed to create review');
      return { error };
    }
    toast.success('Review submitted for moderation');
    fetchReviews();
    return { data, error: null };
  }, [user, adId, fetchReviews]);

  const replyToReview = useCallback(async (reviewId: string, body: string) => {
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await replyToReviewFn(reviewId, user.id, body);
    if (error) {
      toast.error(error.message || 'Failed to reply');
      return { error };
    }
    toast.success('Reply posted');
    fetchReviews();
    return { data, error: null };
  }, [user, fetchReviews]);

  const markHelpful = useCallback(async (reviewId: string) => {
    if (!user) return { error: 'Not authenticated' };
    const { error } = await markReviewHelpfulFn(reviewId, user.id);
    if (error) {
      toast.error('Failed to mark as helpful');
      return { error };
    }
    fetchReviews();
    return { error: null };
  }, [user, fetchReviews]);

  const moderateReview = useCallback(async (
    reviewId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ) => {
    if (!user) return { error: 'Not authenticated' };
    const { error } = await moderateReviewFn(reviewId, status, user.id, reason);
    if (error) {
      toast.error(error.message || 'Failed to moderate review');
      return { error };
    }
    toast.success(`Review ${status}`);
    fetchReviews();
    return { error: null };
  }, [user, fetchReviews]);

  const appealReview = useCallback(async (reviewId: string, reason: string) => {
    const { error } = await appealReviewFn(reviewId, reason);
    if (error) {
      toast.error(error.message || 'Failed to appeal review');
      return { error };
    }
    toast.success('Review appealed');
    fetchReviews();
    return { error: null };
  }, [fetchReviews]);

  useEffect(() => {
    if (adId) {
      fetchReviews();
    }
  }, [adId, fetchReviews]);

  return {
    reviews,
    analytics,
    isLoading,
    error,
    fetchReviews,
    fetchReviewAnalytics,
    createReview,
    replyToReview,
    markHelpful,
    moderateReview,
    appealReview,
  };
}
