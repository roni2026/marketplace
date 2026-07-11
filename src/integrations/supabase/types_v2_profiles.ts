// BazarBD — Phase 2: User Profiles & Reputation types
// types_v2_profiles.ts

export type BadgeType =
  | 'email_verified'
  | 'phone_verified'
  | 'id_verified'
  | 'address_verified'
  | 'business_verified'
  | 'premium_seller'
  | 'top_rated'
  | 'trusted_buyer';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'appealed';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface VerificationBadge {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  is_active: boolean;
  awarded_at: string;
  awarded_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface BuyerReview {
  id: string;
  buyer_id: string;
  seller_id: string;
  ad_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_transaction: boolean;
  helpful_count: number;
  status: ReviewStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
}

export interface BuyerReviewWithDetails extends BuyerReview {
  buyer?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  ad?: {
    title: string | null;
  } | null;
}

export interface ProfileView {
  id: string;
  profile_user_id: string;
  viewer_id: string | null;
  viewer_ip: string | null;
  created_at: string;
}

export interface ProfileStats {
  user_id: string;
  seller_rating: number;
  buyer_rating: number;
  total_sales: number;
  total_purchases: number;
  total_followers: number;
  total_following: number;
  total_seller_reviews: number;
  total_buyer_reviews: number;
  trust_score: number;
  response_rate: number;
  avg_response_time_hours: number;
  profile_views_30d: number;
  updated_at: string;
}

// Extended profile with all Phase 2 fields
export interface ExtendedProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  website: string | null;
  social_links: Record<string, string>;
  preferred_language: string;
  preferred_currency: string;
  division: string | null;
  district: string | null;
  area: string | null;
  is_verified: boolean | null;
  is_public: boolean | null;
  is_blocked: boolean | null;
  is_suspended: boolean | null;
  last_active_at: string | null;
  response_rate: number | null;
  avg_response_time_hours: number | null;
  seller_rating: number | null;
  buyer_rating: number | null;
  total_sales: number | null;
  total_purchases: number | null;
  total_followers: number | null;
  total_following: number | null;
  total_reviews: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Public profile view — what other users see
export interface PublicProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  website: string | null;
  social_links: Record<string, string>;
  preferred_language: string;
  preferred_currency: string;
  division: string | null;
  district: string | null;
  area: string | null;
  is_verified: boolean;
  seller_rating: number;
  buyer_rating: number;
  total_sales: number;
  total_purchases: number;
  total_followers: number;
  total_following: number;
  total_reviews: number;
  trust_score: number;
  response_rate: number;
  avg_response_time_hours: number;
  last_active_at: string | null;
  created_at: string;
  badges: VerificationBadge[];
  stats: ProfileStats | null;
}

export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  whatsapp?: string;
  telegram?: string;
  website?: string;
}
