// BazarBD — Phase 2: useProfileReviews hook
// hooks/useProfileReviews.ts

import { useState, useCallback, useEffect } from 'react';
import {
  getBuyerReviews,
  getSellerReviews,
  createBuyerReview,
} from '@/lib/profiles';
import type { BuyerReviewWithDetails } from '@/integrations/supabase/types_v2_profiles';

interface SellerReviewWithDetails {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  reviewer: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  ad: {
    title: string | null;
  } | null;
}

export function useProfileReviews(userId?: string) {
  const [sellerReviews, setSellerReviews] = useState<SellerReviewWithDetails[]>([]);
  const [buyerReviews, setBuyerReviews] = useState<BuyerReviewWithDetails[]>([]);
  const [sellerReviewsTotal, setSellerReviewsTotal] = useState(0);
  const [buyerReviewsTotal, setBuyerReviewsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'seller' | 'buyer'>('seller');

  const fetchSellerReviews = useCallback(async (page = 1, perPage = 10) => {
    if (!userId) return;
    setIsLoading(true);
    const { data, total } = await getSellerReviews(userId, page, perPage);
    setSellerReviews(data as SellerReviewWithDetails[]);
    setSellerReviewsTotal(total);
    setIsLoading(false);
  }, [userId]);

  const fetchBuyerReviews = useCallback(async (page = 1, perPage = 10) => {
    if (!userId) return;
    setIsLoading(true);
    const { data, total } = await getBuyerReviews(userId, page, perPage);
    setBuyerReviews(data);
    setBuyerReviewsTotal(total);
    setIsLoading(false);
  }, [userId]);

  const submitBuyerReview = useCallback(async (
    sellerId: string,
    buyerId: string,
    rating: number,
    title: string,
    body: string,
    adId?: string | null
  ): Promise<{ error: { message: string } | null }> => {
    setIsSubmitting(true);
    const { error } = await createBuyerReview(sellerId, buyerId, rating, title, body, adId);
    setIsSubmitting(false);
    return { error };
  }, []);

  useEffect(() => {
    if (userId) {
      fetchSellerReviews();
      fetchBuyerReviews();
    }
  }, [userId, fetchSellerReviews, fetchBuyerReviews]);

  return {
    sellerReviews,
    buyerReviews,
    sellerReviewsTotal,
    buyerReviewsTotal,
    isLoading,
    isSubmitting,
    activeTab,
    setActiveTab,
    fetchSellerReviews,
    fetchBuyerReviews,
    submitBuyerReview,
  };
}
