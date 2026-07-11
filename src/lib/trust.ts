import { supabase } from '@/integrations/supabase/client';

export interface BusinessVerification {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  license_number: string | null;
  tax_id: string | null;
  address: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  verified_at: string | null;
  verified_by: string | null;
  documents: Record<string, unknown>[];
  created_at: string;
}

export interface AddressVerification {
  id: string;
  user_id: string;
  address: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  verified_at: string | null;
  coordinates: { lat?: number; lng?: number } | null;
  created_at: string;
}

export interface SellerScore {
  id: string;
  user_id: string;
  trust_score: number;
  fraud_risk_score: number;
  reputation_score: number;
  factors: Record<string, unknown>;
  updated_at: string;
}

export interface VerificationStatus {
  business_verified: boolean;
  address_verified: boolean;
  business_verification: BusinessVerification | null;
  address_verification: AddressVerification | null;
  seller_score: SellerScore | null;
}

/**
 * Submit business verification documents
 */
export async function verifyBusiness(
  userId: string,
  data: {
    business_name: string;
    business_type: string;
    license_number?: string;
    tax_id?: string;
    address?: string;
    documents?: Record<string, unknown>[];
  }
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('business_verifications').insert({
      user_id: userId,
      business_name: data.business_name,
      business_type: data.business_type,
      license_number: data.license_number || null,
      tax_id: data.tax_id || null,
      address: data.address || null,
      documents: data.documents || [],
      verification_status: 'pending',
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Submit address verification
 */
export async function verifyAddress(
  userId: string,
  address: string,
  coordinates?: { lat: number; lng: number }
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('address_verifications').insert({
      user_id: userId,
      address,
      coordinates: coordinates || null,
      verification_status: 'pending',
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Calculate trust score from various factors
 */
export async function calculateTrustScore(userId: string): Promise<number> {
  let score = 50;
  const factors: Record<string, unknown> = {};

  // Check business verification
  const { data: business } = await supabase
    .from('business_verifications')
    .select('verification_status')
    .eq('user_id', userId)
    .eq('verification_status', 'approved')
    .maybeSingle();

  if (business) {
    score += 15;
    factors.business_verified = true;
  }

  // Check address verification
  const { data: address } = await supabase
    .from('address_verifications')
    .select('verification_status')
    .eq('user_id', userId)
    .eq('verification_status', 'approved')
    .maybeSingle();

  if (address) {
    score += 10;
    factors.address_verified = true;
  }

  // Account age
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.created_at) {
    const ageDays = Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    factors.account_age_days = ageDays;
    if (ageDays > 90) {
      score += 10;
    } else if (ageDays > 30) {
      score += 5;
    }
  }

  // Completed transactions
  const { count: completedTxns } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', userId)
    .eq('status', 'accepted');

  factors.completed_transactions = completedTxns || 0;
  score += Math.min((completedTxns || 0) * 2, 10);

  // Positive reviews
  const { count: positiveReviews } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('reviewee_id', userId)
    .gte('rating', 4);

  factors.positive_reviews = positiveReviews || 0;
  score += Math.min(positiveReviews || 0, 5);

  // Profile completeness
  const { data: fullProfile } = await supabase
    .from('profiles')
    .select('full_name, phone_number, avatar_url, division, district')
    .eq('user_id', userId)
    .maybeSingle();

  if (fullProfile) {
    const filledFields = [
      fullProfile.full_name,
      fullProfile.phone_number,
      fullProfile.avatar_url,
      fullProfile.division,
      fullProfile.district,
    ].filter(Boolean).length;
    factors.profile_completeness = filledFields;
    if (filledFields >= 5) {
      score += 5;
    }
  }

  score = Math.min(score, 100);
  factors.final_score = score;

  // Update seller_scores table
  await supabase.from('seller_scores').upsert({
    user_id: userId,
    trust_score: score,
    factors,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return score;
}

/**
 * Calculate reputation score from reviews, transactions, and reports
 */
export async function calculateReputationScore(userId: string): Promise<number> {
  let score = 50;

  // Average review rating
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('reviewee_id', userId);

  if (reviews && reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    score = (avgRating / 5) * 70;
  }

  // Completed transactions boost
  const { count: txns } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', userId)
    .eq('status', 'accepted');

  score += Math.min((txns || 0) * 2, 15);

  // Reports against user decrease score
  const { count: reports } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('reported_user_id', userId)
    .eq('status', 'resolved');

  score -= Math.min((reports || 0) * 5, 20);

  score = Math.max(0, Math.min(score, 100));

  // Update seller_scores
  await supabase.from('seller_scores').upsert({
    user_id: userId,
    reputation_score: score,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return score;
}

/**
 * Get all verification status for a user
 */
export async function getVerificationStatus(userId: string): Promise<VerificationStatus> {
  const [businessRes, addressRes, scoreRes] = await Promise.all([
    supabase
      .from('business_verifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('address_verifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('seller_scores')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  return {
    business_verified: businessRes.data?.verification_status === 'approved',
    address_verified: addressRes.data?.verification_status === 'approved',
    business_verification: businessRes.data as BusinessVerification | null,
    address_verification: addressRes.data as AddressVerification | null,
    seller_score: scoreRes.data as SellerScore | null,
  };
}

/**
 * Check if user has verified seller badge
 */
export async function isVerifiedSeller(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('seller_scores')
    .select('trust_score')
    .eq('user_id', userId)
    .maybeSingle();

  return (data?.trust_score ?? 0) >= 70;
}

/**
 * Check if user has verified business badge
 */
export async function isVerifiedBusiness(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('business_verifications')
    .select('verification_status')
    .eq('user_id', userId)
    .eq('verification_status', 'approved')
    .maybeSingle();

  return !!data;
}
