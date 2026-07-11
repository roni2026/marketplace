import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Offer {
  id: string;
  ad_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  message: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  ads?: { title: string; slug: string; price: number | null } | null;
  buyer?: { full_name: string | null; avatar_url: string | null } | null;
}

export function useOffers(adId?: string) {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOffers = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    let query = supabase
      .from('offers')
      .select('*, ads(title, slug, price)')
      .order('created_at', { ascending: false });

    if (adId) {
      query = query.eq('ad_id', adId);
    } else {
      query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    }

    const { data } = await query;

    if (data && !adId) {
      // Fetch buyer profiles for received offers
      const buyerIds = [...new Set((data as Offer[]).map((o) => o.buyer_id))];
      if (buyerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', buyerIds);
        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
        for (const offer of (data as Offer[])) {
          const p = profileMap.get(offer.buyer_id);
          if (p) {
            offer.buyer = { full_name: p.full_name, avatar_url: p.avatar_url };
          }
        }
      }
    }

    setOffers((data as Offer[]) || []);
    setIsLoading(false);
  }, [user, adId]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const makeOffer = useCallback(async (params: {
    adId: string;
    sellerId: string;
    amount: number;
    message?: string;
  }) => {
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('offers')
      .insert({
        ad_id: params.adId,
        buyer_id: user.id,
        seller_id: params.sellerId,
        amount: params.amount,
        message: params.message || null,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (!error) {
      // Update ad offers count
      await supabase.rpc('increment_offers_count', { ad_id: params.adId }).catch(() => {});
      // Create notification for seller
      await supabase.from('notifications').insert({
        user_id: params.sellerId,
        type: 'new_offer',
        title: 'New Offer',
        message: `You received a new offer of ৳${params.amount} on your ad`,
        data: { ad_id: params.adId, offer_id: data?.id },
      }).catch(() => {});
      fetchOffers();
    }
    return { data, error };
  }, [user, fetchOffers]);

  const respondToOffer = useCallback(async (offerId: string, status: 'accepted' | 'rejected') => {
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('offers')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', offerId)
      .select()
      .single();

    if (!error && data) {
      // Notify buyer
      const notifType = status === 'accepted' ? 'offer_accepted' : 'offer_rejected';
      await supabase.from('notifications').insert({
        user_id: data.buyer_id,
        type: notifType,
        title: status === 'accepted' ? 'Offer Accepted' : 'Offer Rejected',
        message: status === 'accepted'
          ? 'Your offer has been accepted!'
          : 'Your offer has been rejected.',
        data: { ad_id: data.ad_id, offer_id: data.id },
      }).catch(() => {});
      fetchOffers();
    }
    return { data, error };
  }, [user, fetchOffers]);

  return {
    offers,
    isLoading,
    makeOffer,
    respondToOffer,
    refetch: fetchOffers,
  };
}
