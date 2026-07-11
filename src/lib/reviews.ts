import { supabase } from '@/integrations/supabase/client';

export interface Review {
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
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
}

export interface ReviewWithDetails extends Review {
  reviewer?: { full_name: string | null; avatar_url: string | null };
  replies?: ReviewReply[];
}

export interface ReviewReply {
  id: string;
  review_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

// --- Create Review ---

export async function createReview(
  adId: string,
  reviewerId: string,
  rating: number,
  title: string,
  body: string,
  images: string[] = [],
  videos: string[] = []
) {
  const { data: ad } = await supabase
    .from('ads')
    .select('user_id')
    .eq('id', adId)
    .single();

  if (!ad) return { data: null, error: { message: 'Ad not found' } };

  const isVerified = await checkVerifiedPurchase(reviewerId, adId);

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      ad_id: adId,
      reviewer_id: reviewerId,
      seller_id: ad.user_id,
      rating,
      title,
      body,
      images,
      videos,
      is_verified_purchase: isVerified,
      status: 'pending',
    })
    .select()
    .single();

  return { data, error };
}

// --- Get Reviews ---

export async function getReviews(adId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url),
      replies:review_replies(*)
    `)
    .eq('ad_id', adId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  return { data: data as ReviewWithDetails[] | null, error };
}

export async function getSellerReviews(sellerId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url),
      replies:review_replies(*)
    `)
    .eq('seller_id', sellerId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  return { data: data as ReviewWithDetails[] | null, error };
}

// --- Reply to Review ---

export async function replyToReview(reviewId: string, userId: string, body: string) {
  const { data, error } = await supabase
    .from('review_replies')
    .insert({ review_id: reviewId, user_id: userId, body })
    .select()
    .single();

  return { data, error };
}

// --- Mark Helpful ---

export async function markReviewHelpful(reviewId: string, userId: string) {
  const { data: existing } = await supabase
    .from('review_helpful')
    .select('id')
    .eq('review_id', reviewId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('review_helpful')
      .delete()
      .eq('id', existing.id);

    await supabase.rpc('decrement_helpful_count', { review_id: reviewId });
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from('review_helpful')
    .insert({ review_id: reviewId, user_id: userId });

  if (!error) {
    await supabase
      .from('reviews')
      .update({ helpful_count: (await supabase.from('reviews').select('helpful_count').eq('id', reviewId).single()).data?.helpful_count + 1 })
      .eq('id', reviewId);
  }

  return { data, error };
}

// --- Moderate Review ---

export async function moderateReview(
  reviewId: string,
  status: 'approved' | 'rejected',
  moderatorId: string,
  reason?: string
) {
  const { data, error } = await supabase
    .from('reviews')
    .update({
      status,
      moderated_by: moderatorId,
      moderated_at: new Date().toISOString(),
      appeal_reason: status === 'rejected' ? reason : null,
    })
    .eq('id', reviewId)
    .select()
    .single();

  return { data, error };
}

// --- Appeal Review ---

export async function appealReview(reviewId: string, reason: string) {
  const { data, error } = await supabase
    .from('reviews')
    .update({ status: 'appealed', appeal_reason: reason })
    .eq('id', reviewId)
    .select()
    .single();

  return { data, error };
}

// --- Verified Purchase Check ---

export async function checkVerifiedPurchase(userId: string, adId: string): Promise<boolean> {
  const { data } = await supabase
    .from('offers')
    .select('id')
    .eq('ad_id', adId)
    .eq('buyer_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  return !!data;
}

// --- Review Analytics ---

export interface ReviewAnalytics {
  averageRating: number;
  totalReviews: number;
  distribution: { rating: number; count: number }[];
  recentTrend: { date: string; avgRating: number; count: number }[];
}

export async function getReviewAnalytics(sellerId: string): Promise<ReviewAnalytics> {
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, created_at')
    .eq('seller_id', sellerId)
    .eq('status', 'approved');

  const allReviews = reviews || [];
  const totalReviews = allReviews.length;
  const averageRating = totalReviews > 0
    ? allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalReviews
    : 0;

  const distMap = new Map<number, number>();
  for (let i = 1; i <= 5; i++) distMap.set(i, 0);
  for (const r of allReviews) {
    distMap.set(r.rating, (distMap.get(r.rating) || 0) + 1);
  }
  const distribution = Array.from(distMap.entries()).map(([rating, count]) => ({ rating, count }));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = allReviews.filter((r: { created_at: string }) => new Date(r.created_at) >= thirtyDaysAgo);
  const recentTrend = [
    {
      date: new Date().toISOString().split('T')[0],
      avgRating: recent.length > 0 ? recent.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / recent.length : 0,
      count: recent.length,
    },
  ];

  return { averageRating, totalReviews, distribution, recentTrend };
}

// --- Fake Review Detection ---

export async function detectFakeReview(reviewId: string): Promise<{ isFake: boolean; reasons: string[] }> {
  const { data: review } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (!review) return { isFake: false, reasons: ['Review not found'] };

  const reasons: string[] = [];

  if (!review.is_verified_purchase) {
    reasons.push('Not a verified purchase');
  }

  const { data: userReviews } = await supabase
    .from('reviews')
    .select('id')
    .eq('reviewer_id', review.reviewer_id)
    .eq('seller_id', review.seller_id);

  if ((userReviews || []).length > 1) {
    reasons.push('Multiple reviews for same seller from same user');
  }

  if (review.rating === 5 && (!review.body || review.body.length < 10)) {
    reasons.push('5-star rating with very short or no body text');
  }

  if (review.rating === 1 && (!review.body || review.body.length < 10)) {
    reasons.push('1-star rating with very short or no body text');
  }

  const { data: recentReviews } = await supabase
    .from('reviews')
    .select('created_at')
    .eq('reviewer_id', review.reviewer_id)
    .order('created_at', { ascending: false })
    .limit(5);

  if ((recentReviews || []).length >= 3) {
    const times = recentReviews!.map((r: { created_at: string }) => new Date(r.created_at).getTime());
    const span = Math.max(...times) - Math.min(...times);
    if (span < 3600000) {
      reasons.push('Multiple reviews posted within a very short timeframe');
    }
  }

  return { isFake: reasons.length >= 2, reasons };
}
