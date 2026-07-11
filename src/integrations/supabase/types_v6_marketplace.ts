/**
 * TypeScript types for Phase 6: Marketplace Experience.
 */

export type FavoriteEntityType = 'listing' | 'seller' | 'store' | 'brand' | 'category';
export type ActivityType =
  | 'view' | 'favorite' | 'unfavorite' | 'share' | 'compare' | 'follow_seller'
  | 'unfollow_seller' | 'follow_store' | 'unfollow_store' | 'follow_category'
  | 'unfollow_category' | 'hide_listing' | 'unhide_listing' | 'block_seller'
  | 'unblock_seller' | 'report_listing' | 'report_seller' | 'wishlist_add'
  | 'wishlist_remove' | 'qr_scan' | 'contact_seller' | 'visit_store' | 'save_search';
export type ReportTargetType = 'listing' | 'seller';
export type SponsoredPlacement = 'search_results' | 'category_page' | 'homepage' | 'discovery';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

// =========================================================================
// Extended Favorites
// =========================================================================

export interface UserFavorite {
  id: string;
  user_id: string;
  entity_type: FavoriteEntityType;
  entity_id: string;
  created_at: string;
}

export interface UserFavoriteInsert {
  user_id: string;
  entity_type: FavoriteEntityType;
  entity_id: string;
}

// =========================================================================
// Blocked Users
// =========================================================================

export interface BlockedUser {
  id: string;
  user_id: string;
  blocked_user_id: string;
  reason: string | null;
  created_at: string;
  blocked_user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// =========================================================================
// Hidden Listings
// =========================================================================

export interface HiddenListing {
  id: string;
  user_id: string;
  ad_id: string;
  reason: string | null;
  created_at: string;
  ad?: {
    id: string;
    title: string;
    slug: string;
    price: number | null;
    price_type: string;
    ad_images: { image_url: string }[];
  } | null;
}

// =========================================================================
// Category Followers
// =========================================================================

export interface CategoryFollower {
  id: string;
  user_id: string;
  category_id: string;
  notify_on_new: boolean;
  created_at: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  } | null;
}

// =========================================================================
// Seller Reports
// =========================================================================

export interface SellerReport {
  id: string;
  reporter_id: string;
  seller_id: string;
  reason: string;
  reason_code: string;
  description: string | null;
  screenshot_urls: string[];
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface SellerReportInsert {
  reporter_id: string;
  seller_id: string;
  reason: string;
  reason_code: string;
  description?: string | null;
  screenshot_urls?: string[];
}

// =========================================================================
// Sponsored Listings
// =========================================================================

export interface SponsoredListing {
  id: string;
  ad_id: string;
  sponsor_name: string | null;
  placement: SponsoredPlacement;
  priority: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  created_at: string;
  updated_at: string;
}

export interface SponsoredListingInsert {
  ad_id: string;
  sponsor_name?: string | null;
  placement?: SponsoredPlacement;
  priority?: number;
  is_active?: boolean;
  starts_at?: string;
  ends_at?: string | null;
  budget?: number;
}

// =========================================================================
// User Activity
// =========================================================================

export interface UserActivityRecord {
  id: string;
  user_id: string | null;
  activity_type: ActivityType;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// =========================================================================
// QR Code Scans
// =========================================================================

export interface QRCodeScan {
  id: string;
  ad_id: string;
  scanned_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// =========================================================================
// User Preferences
// =========================================================================

export interface UserPreferences {
  id: string;
  user_id: string;
  notify_new_listings: boolean;
  notify_price_drops: boolean;
  notify_seller_new_listings: boolean;
  notify_store_new_products: boolean;
  notify_category_new_listings: boolean;
  notify_expiring_listings: boolean;
  notify_messages: boolean;
  notify_offers: boolean;
  show_recently_viewed: boolean;
  allow_public_collections: boolean;
  allow_activity_tracking: boolean;
  default_wishlist_visibility: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesUpdate {
  notify_new_listings?: boolean;
  notify_price_drops?: boolean;
  notify_seller_new_listings?: boolean;
  notify_store_new_products?: boolean;
  notify_category_new_listings?: boolean;
  notify_expiring_listings?: boolean;
  notify_messages?: boolean;
  notify_offers?: boolean;
  show_recently_viewed?: boolean;
  allow_public_collections?: boolean;
  allow_activity_tracking?: boolean;
  default_wishlist_visibility?: string;
}

// =========================================================================
// Recently Viewed (server-side)
// =========================================================================

export interface RecentlyViewedRecord {
  id: string;
  user_id: string | null;
  ad_id: string;
  viewed_at: string;
}

// =========================================================================
// Listing Report Reasons
// =========================================================================

export const LISTING_REPORT_REASONS = [
  { code: 'prohibited_item', label: 'Prohibited Item' },
  { code: 'counterfeit_item', label: 'Counterfeit Item' },
  { code: 'scam_fraud', label: 'Scam or Fraud' },
  { code: 'misleading_description', label: 'Misleading Description' },
  { code: 'incorrect_category', label: 'Incorrect Category' },
  { code: 'duplicate_listing', label: 'Duplicate Listing' },
  { code: 'stolen_item', label: 'Stolen Item' },
  { code: 'inappropriate_content', label: 'Inappropriate Content' },
  { code: 'offensive_language', label: 'Offensive Language' },
  { code: 'spam', label: 'Spam' },
  { code: 'wrong_price', label: 'Wrong Price' },
  { code: 'fake_images', label: 'Fake Images' },
  { code: 'other', label: 'Other' },
] as const;

export const SELLER_REPORT_REASONS = [
  { code: 'fraud', label: 'Fraud' },
  { code: 'fake_products', label: 'Fake Products' },
  { code: 'harassment', label: 'Harassment' },
  { code: 'abuse', label: 'Abuse' },
  { code: 'spam', label: 'Spam' },
  { code: 'policy_violations', label: 'Policy Violations' },
  { code: 'counterfeit_goods', label: 'Counterfeit Goods' },
  { code: 'other_misconduct', label: 'Other Misconduct' },
] as const;

// =========================================================================
// Engagement Statistics
// =========================================================================

export interface EngagementStats {
  views: number;
  unique_visitors: number;
  wishlist_count: number;
  favorite_count: number;
  share_count: number;
  compare_count: number;
  qr_code_scans: number;
  contact_seller_clicks: number;
  store_visits: number;
}

// =========================================================================
// Share Platform
// =========================================================================

export type SharePlatform =
  | 'copy_link' | 'qr_code' | 'facebook' | 'messenger' | 'whatsapp'
  | 'twitter' | 'telegram' | 'instagram' | 'email' | 'sms' | 'native';

export interface ShareOption {
  platform: SharePlatform;
  label: string;
  icon: string;
  color: string;
}
