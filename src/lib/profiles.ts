// BazarBD — Phase 2: User Profiles & Reputation
// lib/profiles.ts
// All profile-related API operations: CRUD, follows, badges, reviews, stats.

import { supabase } from '@/integrations/supabase/client';
import { isCloudinaryConfigured, uploadToCloudinary } from '@/lib/cloudinary';
import type {
  ExtendedProfile,
  PublicProfile,
  VerificationBadge,
  BuyerReview,
  BuyerReviewWithDetails,
  ProfileStats,
  SocialLinks,
  BadgeType,
} from '@/integrations/supabase/types_v2_profiles';
import { logAudit } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Profile CRUD
// ---------------------------------------------------------------------------

/**
 * Fetch the current user's full profile (all fields).
 */
export async function getMyProfile(userId: string): Promise<{ data: ExtendedProfile | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return { data: data as ExtendedProfile | null, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Update the current user's profile. Only allows editing own profile.
 */
export async function updateMyProfile(
  userId: string,
  updates: Partial<Pick<ExtendedProfile,
    | 'full_name'
    | 'phone_number'
    | 'secondary_phone'
    | 'avatar_url'
    | 'banner_url'
    | 'bio'
    | 'website'
    | 'social_links'
    | 'preferred_language'
    | 'preferred_currency'
    | 'division'
    | 'district'
    | 'area'
    | 'is_public'
  >>
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) throw error;

    await logAudit({
      action: 'update',
      resourceType: 'profile',
      resourceId: userId,
      details: { fields: Object.keys(updates) },
    });

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Fetch a public profile by user ID. Returns combined profile + stats + badges.
 */
export async function getPublicProfile(userId: string): Promise<{ data: PublicProfile | null; error: Error | null }> {
  try {
    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return { data: null, error: null };

    // Fetch badges
    const { data: badges, error: badgesError } = await supabase
      .from('verification_badges')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (badgesError) throw badgesError;

    // Fetch profile stats
    const { data: stats, error: statsError } = await supabase
      .from('profile_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (statsError) throw statsError;

    // Record profile view (fire and forget)
    supabase.from('profile_views').insert({ profile_user_id: userId }).then(() => {});

    const publicProfile: PublicProfile = {
      user_id: profile.user_id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      banner_url: profile.banner_url,
      bio: profile.bio,
      website: profile.website,
      social_links: profile.social_links || {},
      preferred_language: profile.preferred_language || 'en',
      preferred_currency: profile.preferred_currency || 'BDT',
      division: profile.division,
      district: profile.district,
      area: profile.area,
      is_verified: profile.is_verified ?? false,
      seller_rating: profile.seller_rating ?? 0,
      buyer_rating: profile.buyer_rating ?? 0,
      total_sales: profile.total_sales ?? 0,
      total_purchases: profile.total_purchases ?? 0,
      total_followers: profile.total_followers ?? 0,
      total_following: profile.total_following ?? 0,
      total_reviews: profile.total_reviews ?? 0,
      trust_score: stats?.trust_score ?? 50,
      response_rate: profile.response_rate ?? 0,
      avg_response_time_hours: profile.avg_response_time_hours ?? 0,
      last_active_at: profile.last_active_at,
      created_at: profile.created_at,
      badges: (badges as VerificationBadge[]) || [],
      stats: stats as ProfileStats | null,
    };

    return { data: publicProfile, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// ---------------------------------------------------------------------------
// Banner upload
// ---------------------------------------------------------------------------

/**
 * Upload a banner image to Supabase storage and return the public URL.
 */
export async function uploadBanner(
  userId: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  try {
    if (isCloudinaryConfigured()) {
      const up = await uploadToCloudinary(file, {
        folder: `bazarbd/banners/${userId}`,
        tags: ['banner', userId],
      });
      return { url: up.secure_url, error: null };
    }

    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${userId}/${Date.now()}-banner.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

/**
 * Follow a user.
 */
export async function followUser(followerId: string, followingId: string): Promise<{ error: Error | null }> {
  try {
    if (followerId === followingId) {
      return { error: new Error('Cannot follow yourself') };
    }

    const { error } = await supabase
      .from('user_follows')
      .insert({ follower_id: followerId, following_id: followingId });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Unfollow a user.
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Check if the current user is following a target user.
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get a list of followers for a user.
 */
export async function getFollowers(
  userId: string,
  page = 1,
  perPage = 20
): Promise<{ data: { follower_id: string; full_name: string | null; avatar_url: string | null; created_at: string }[]; total: number; error: Error | null }> {
  try {
    const offset = (page - 1) * perPage;

    const { data: follows, error: followError } = await supabase
      .from('user_follows')
      .select('follower_id, created_at')
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (followError) throw followError;

    const followerIds = (follows || []).map((f: any) => f.follower_id);
    if (followerIds.length === 0) return { data: [], total: 0, error: null };

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', followerIds);

    if (profileError) throw profileError;

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const result = (follows || []).map((f: any) => {
      const p = profileMap.get(f.follower_id);
      return {
        follower_id: f.follower_id,
        full_name: p?.full_name || null,
        avatar_url: p?.avatar_url || null,
        created_at: f.created_at,
      };
    });

    const { count } = await supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId);

    return { data: result, total: count || 0, error: null };
  } catch (error) {
    return { data: [], total: 0, error: error as Error };
  }
}

/**
 * Get a list of users that a user is following.
 */
export async function getFollowing(
  userId: string,
  page = 1,
  perPage = 20
): Promise<{ data: { following_id: string; full_name: string | null; avatar_url: string | null; created_at: string }[]; total: number; error: Error | null }> {
  try {
    const offset = (page - 1) * perPage;

    const { data: follows, error: followError } = await supabase
      .from('user_follows')
      .select('following_id, created_at')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (followError) throw followError;

    const followingIds = (follows || []).map((f: any) => f.following_id);
    if (followingIds.length === 0) return { data: [], total: 0, error: null };

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', followingIds);

    if (profileError) throw profileError;

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const result = (follows || []).map((f: any) => {
      const p = profileMap.get(f.following_id);
      return {
        following_id: f.following_id,
        full_name: p?.full_name || null,
        avatar_url: p?.avatar_url || null,
        created_at: f.created_at,
      };
    });

    const { count } = await supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId);

    return { data: result, total: count || 0, error: null };
  } catch (error) {
    return { data: [], total: 0, error: error as Error };
  }
}

// ---------------------------------------------------------------------------
// Verification Badges
// ---------------------------------------------------------------------------

/**
 * Get all active badges for a user.
 */
export async function getBadges(userId: string): Promise<{ data: VerificationBadge[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('verification_badges')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('awarded_at', { ascending: false });

    if (error) throw error;
    return { data: (data as VerificationBadge[]) || [], error: null };
  } catch (error) {
    return { data: [], error: error as Error };
  }
}

/**
 * Request a verification badge (user submits request, admin approves).
 */
export async function requestBadge(
  userId: string,
  badgeType: BadgeType,
  metadata?: Record<string, unknown>
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('verification_badges')
      .insert({
        user_id: userId,
        badge_type: badgeType,
        is_active: false,
        metadata: metadata || {},
      });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

// ---------------------------------------------------------------------------
// Buyer Reviews
// ---------------------------------------------------------------------------

/**
 * Create a buyer review (seller reviews a buyer).
 */
export async function createBuyerReview(
  sellerId: string,
  buyerId: string,
  rating: number,
  title: string,
  body: string,
  adId?: string | null
): Promise<{ data: BuyerReview | null; error: { message: string } | null }> {
  try {
    if (rating < 1 || rating > 5) {
      return { data: null, error: { message: 'Rating must be between 1 and 5' } };
    }

    const { data, error } = await supabase
      .from('buyer_reviews')
      .insert({
        seller_id: sellerId,
        buyer_id: buyerId,
        ad_id: adId || null,
        rating,
        title,
        body,
        is_verified_transaction: !!adId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return { data: data as BuyerReview, error: null };
  } catch (error) {
    return { data: null, error: { message: (error as Error).message } };
  }
}

/**
 * Get buyer reviews for a user (reviews about them as a buyer).
 */
export async function getBuyerReviews(
  buyerId: string,
  page = 1,
  perPage = 10
): Promise<{ data: BuyerReviewWithDetails[]; total: number; error: Error | null }> {
  try {
    const offset = (page - 1) * perPage;

    const { data, error } = await supabase
      .from('buyer_reviews')
      .select(`
        *,
        buyer:profiles!buyer_reviews_buyer_id_fkey(full_name, avatar_url),
        ad:ads(title)
      `)
      .eq('buyer_id', buyerId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) throw error;

    const { count } = await supabase
      .from('buyer_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', buyerId)
      .eq('status', 'approved');

    return { data: (data as BuyerReviewWithDetails[]) || [], total: count || 0, error: null };
  } catch (error) {
    return { data: [], total: 0, error: error as Error };
  }
}

/**
 * Get seller reviews for a user (reviews about them as a seller).
 */
export async function getSellerReviews(
  sellerId: string,
  page = 1,
  perPage = 10
): Promise<{ data: any[]; total: number; error: Error | null }> {
  try {
    const offset = (page - 1) * perPage;

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url),
        ad:ads(title)
      `)
      .eq('seller_id', sellerId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) throw error;

    const { count } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'approved');

    return { data: data || [], total: count || 0, error: null };
  } catch (error) {
    return { data: [], total: 0, error: error as Error };
  }
}

// ---------------------------------------------------------------------------
// Profile Stats
// ---------------------------------------------------------------------------

/**
 * Get cached profile stats for a user.
 */
export async function getProfileStats(userId: string): Promise<{ data: ProfileStats | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('profile_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return { data: data as ProfileStats | null, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Manually trigger a profile stats refresh.
 */
export async function refreshProfileStats(userId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.rpc('refresh_profile_stats', { target_user_id: userId });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format social links into a normalized object.
 */
export function parseSocialLinks(raw: Record<string, any> | null | undefined): SocialLinks {
  if (!raw) return {};
  return {
    facebook: raw.facebook || raw.facebook_url || undefined,
    twitter: raw.twitter || raw.twitter_url || raw.x || undefined,
    instagram: raw.instagram || raw.instagram_url || undefined,
    linkedin: raw.linkedin || raw.linkedin_url || undefined,
    youtube: raw.youtube || raw.youtube_url || undefined,
    whatsapp: raw.whatsapp || raw.whatsapp_number || undefined,
    telegram: raw.telegram || raw.telegram_url || undefined,
    website: raw.website || undefined,
  };
}

/**
 * Get the badge display info (icon name, label, color).
 */
export function getBadgeInfo(badgeType: BadgeType): { label: string; icon: string; color: string } {
  const map: Record<BadgeType, { label: string; icon: string; color: string }> = {
    email_verified: { label: 'Email Verified', icon: 'mail-check', color: 'text-blue-500' },
    phone_verified: { label: 'Phone Verified', icon: 'phone', color: 'text-green-500' },
    id_verified: { label: 'ID Verified', icon: 'id-card', color: 'text-purple-500' },
    address_verified: { label: 'Address Verified', icon: 'map-pin', color: 'text-orange-500' },
    business_verified: { label: 'Business Verified', icon: 'building', color: 'text-indigo-500' },
    premium_seller: { label: 'Premium Seller', icon: 'crown', color: 'text-yellow-500' },
    top_rated: { label: 'Top Rated', icon: 'star', color: 'text-amber-500' },
    trusted_buyer: { label: 'Trusted Buyer', icon: 'shield-check', color: 'text-teal-500' },
  };
  return map[badgeType] || { label: badgeType, icon: 'badge-check', color: 'text-gray-500' };
}

/**
 * Format response time from hours to a human-readable string.
 */
export function formatResponseTime(hours: number): string {
  if (hours <= 0) return 'N/A';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours)} hr`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''}`;
}

/**
 * Format last active timestamp to a human-readable string.
 */
export function formatLastActive(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

/**
 * Format member since date.
 */
export function formatMemberSince(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}
