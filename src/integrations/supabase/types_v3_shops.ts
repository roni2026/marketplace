/**
 * TypeScript types for Phase 3: Seller & Shop Membership System.
 * These complement the base types in types.ts and v2 types.
 */

// =========================================================================
// Enums / Union Types
// =========================================================================

export type ShopMembershipTier = 'basic' | 'professional' | 'business' | 'enterprise';
export type ShopVerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
export type VerificationType = 'business' | 'identity_kyc' | 'business_license';
export type ShopCouponType = 'percentage' | 'fixed_amount' | 'free_shipping';
export type PayoutMethodType = 'bank_transfer' | 'mobile_banking' | 'cash_pickup' | 'paypal' | 'stripe';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type TransactionType = 'sale' | 'refund' | 'payout' | 'fee' | 'subscription' | 'adjustment';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'disputed';
export type ListingDraftStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type BulkJobType = 'import' | 'export';
export type BulkJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'partial';
export type StaffRole = 'owner' | 'manager' | 'staff' | 'viewer';
export type ShopReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type ShopOrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type ShopPaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';

// =========================================================================
// Shop
// =========================================================================

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_hours: Record<string, unknown>;
  location_address: string | null;
  location_city: string | null;
  location_division: string | null;
  location_lat: number | null;
  location_lng: number | null;
  social_links: Record<string, string>;
  shipping_policy: string | null;
  return_policy: string | null;
  refund_policy: string | null;
  warranty_info: string | null;
  is_verified: boolean;
  is_featured: boolean;
  is_premium: boolean;
  is_vacation_mode: boolean;
  vacation_message: string | null;
  vacation_until: string | null;
  announcement: string | null;
  announcement_expires_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  total_followers: number;
  total_products: number;
  total_sales: number;
  total_revenue: number;
  avg_rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export interface ShopInsert {
  owner_id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  banner_url?: string | null;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  business_hours?: Record<string, unknown>;
  location_address?: string | null;
  location_city?: string | null;
  location_division?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  social_links?: Record<string, string>;
  shipping_policy?: string | null;
  return_policy?: string | null;
  refund_policy?: string | null;
  warranty_info?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
}

export interface ShopUpdate {
  name?: string;
  slug?: string;
  logo_url?: string | null;
  banner_url?: string | null;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  business_hours?: Record<string, unknown>;
  location_address?: string | null;
  location_city?: string | null;
  location_division?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  social_links?: Record<string, string>;
  shipping_policy?: string | null;
  return_policy?: string | null;
  refund_policy?: string | null;
  warranty_info?: string | null;
  is_vacation_mode?: boolean;
  vacation_message?: string | null;
  vacation_until?: string | null;
  announcement?: string | null;
  announcement_expires_at?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
}

// =========================================================================
// Shop Membership
// =========================================================================

export interface ShopMembership {
  id: string;
  shop_id: string;
  user_id: string;
  tier: ShopMembershipTier;
  listing_limit: number;
  is_active: boolean;
  started_at: string;
  expires_at: string | null;
  monthly_fee: number;
  auto_renew: boolean;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopMembershipInsert {
  shop_id: string;
  user_id: string;
  tier?: ShopMembershipTier;
  listing_limit?: number;
  expires_at?: string | null;
  monthly_fee?: number;
  auto_renew?: boolean;
  payment_method?: string | null;
}

// =========================================================================
// Shop Verification
// =========================================================================

export interface ShopVerification {
  id: string;
  shop_id: string;
  verification_type: VerificationType;
  status: ShopVerificationStatus;
  submitted_data: Record<string, unknown>;
  document_urls: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopVerificationInsert {
  shop_id: string;
  verification_type: VerificationType;
  submitted_data?: Record<string, unknown>;
  document_urls?: string[];
}

// =========================================================================
// Shop Follower
// =========================================================================

export interface ShopFollower {
  id: string;
  shop_id: string;
  follower_id: string;
  created_at: string;
}

// =========================================================================
// Shop Collection
// =========================================================================

export interface ShopCollection {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ShopCollectionInsert {
  shop_id: string;
  name: string;
  description?: string | null;
  cover_image_url?: string | null;
  is_featured?: boolean;
  sort_order?: number;
}

export interface ShopCollectionItem {
  id: string;
  collection_id: string;
  ad_id: string;
  sort_order: number;
  created_at: string;
}

// =========================================================================
// Shop Category
// =========================================================================

export interface ShopCategory {
  id: string;
  shop_id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface ShopCategoryInsert {
  shop_id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  sort_order?: number;
}

// =========================================================================
// Shop Coupon
// =========================================================================

export interface ShopCoupon {
  id: string;
  shop_id: string;
  code: string;
  description: string | null;
  coupon_type: ShopCouponType;
  value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  applicable_ad_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ShopCouponInsert {
  shop_id: string;
  code: string;
  description?: string | null;
  coupon_type?: ShopCouponType;
  value: number;
  min_order_amount?: number;
  max_uses?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  applicable_ad_ids?: string[] | null;
}

// =========================================================================
// Shop Staff
// =========================================================================

export interface ShopStaff {
  id: string;
  shop_id: string;
  user_id: string;
  role: StaffRole;
  permissions: Record<string, unknown>;
  invited_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopStaffInsert {
  shop_id: string;
  user_id: string;
  role?: StaffRole;
  permissions?: Record<string, unknown>;
  invited_by?: string | null;
}

// =========================================================================
// Shop Analytics
// =========================================================================

export interface ShopAnalytics {
  id: string;
  shop_id: string;
  stat_date: string;
  views: number;
  unique_visitors: number;
  inquiries: number;
  orders: number;
  conversions: number;
  revenue: number;
  profit: number;
  new_followers: number;
  created_at: string;
}

// =========================================================================
// Shop Review
// =========================================================================

export interface ShopReview {
  id: string;
  shop_id: string;
  reviewer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'appealed';
  seller_reply: string | null;
  seller_replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopReviewInsert {
  shop_id: string;
  reviewer_id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  is_verified_purchase?: boolean;
}

// =========================================================================
// Listing Draft
// =========================================================================

export interface ListingDraft {
  id: string;
  user_id: string;
  shop_id: string | null;
  title: string | null;
  description: string | null;
  category_id: string | null;
  price: number | null;
  price_type: string;
  condition: string;
  division: string | null;
  district: string | null;
  area: string | null;
  images: unknown[];
  metadata: Record<string, unknown>;
  status: ListingDraftStatus;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingDraftInsert {
  user_id: string;
  shop_id?: string | null;
  title?: string | null;
  description?: string | null;
  category_id?: string | null;
  price?: number | null;
  price_type?: string;
  condition?: string;
  division?: string | null;
  district?: string | null;
  area?: string | null;
  images?: unknown[];
  metadata?: Record<string, unknown>;
  status?: ListingDraftStatus;
  scheduled_at?: string | null;
}

export interface ListingDraftUpdate {
  title?: string | null;
  description?: string | null;
  category_id?: string | null;
  price?: number | null;
  price_type?: string;
  condition?: string;
  division?: string | null;
  district?: string | null;
  area?: string | null;
  images?: unknown[];
  metadata?: Record<string, unknown>;
  status?: ListingDraftStatus;
  scheduled_at?: string | null;
}

// =========================================================================
// Listing Schedule
// =========================================================================

export interface ListingSchedule {
  id: string;
  ad_id: string;
  user_id: string;
  scheduled_at: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface ListingScheduleInsert {
  ad_id: string;
  user_id: string;
  scheduled_at: string;
}

// =========================================================================
// Seller Vacation Mode
// =========================================================================

export interface SellerVacationMode {
  id: string;
  user_id: string;
  is_active: boolean;
  message: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerVacationModeUpdate {
  is_active?: boolean;
  message?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
}

// =========================================================================
// Payout Method
// =========================================================================

export interface PayoutMethod {
  id: string;
  user_id: string;
  method_type: PayoutMethodType;
  is_default: boolean;
  is_verified: boolean;
  details: Record<string, unknown>;
  display_identifier: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutMethodInsert {
  user_id: string;
  method_type: PayoutMethodType;
  is_default?: boolean;
  details?: Record<string, unknown>;
  display_identifier?: string | null;
}

// =========================================================================
// Transaction
// =========================================================================

export interface Transaction {
  id: string;
  user_id: string;
  shop_id: string | null;
  ad_id: string | null;
  transaction_type: TransactionType;
  status: TransactionStatus;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  payment_method: string | null;
  reference_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// =========================================================================
// Payout
// =========================================================================

export interface Payout {
  id: string;
  user_id: string;
  shop_id: string | null;
  payout_method_id: string | null;
  amount: number;
  fee: number;
  net_amount: number;
  status: PayoutStatus;
  reference_id: string | null;
  notes: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

// =========================================================================
// Product Template
// =========================================================================

export interface ProductTemplate {
  id: string;
  user_id: string;
  shop_id: string | null;
  name: string;
  category_id: string | null;
  default_title: string | null;
  default_description: string | null;
  default_price: number | null;
  default_price_type: string;
  default_condition: string;
  default_fields: Record<string, unknown>;
  default_images: unknown[];
  created_at: string;
  updated_at: string;
}

export interface ProductTemplateInsert {
  user_id: string;
  shop_id?: string | null;
  name: string;
  category_id?: string | null;
  default_title?: string | null;
  default_description?: string | null;
  default_price?: number | null;
  default_price_type?: string;
  default_condition?: string;
  default_fields?: Record<string, unknown>;
  default_images?: unknown[];
}

// =========================================================================
// Bulk Job
// =========================================================================

export interface BulkJob {
  id: string;
  user_id: string;
  shop_id: string | null;
  job_type: BulkJobType;
  status: BulkJobStatus;
  file_url: string | null;
  result_url: string | null;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  error_log: unknown[];
  created_at: string;
  completed_at: string | null;
}

// =========================================================================
// Shop Announcement
// =========================================================================

export interface ShopAnnouncement {
  id: string;
  shop_id: string;
  title: string;
  body: string | null;
  type: string;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopAnnouncementInsert {
  shop_id: string;
  title: string;
  body?: string | null;
  type?: string;
  is_active?: boolean;
  starts_at?: string;
  expires_at?: string | null;
}

// =========================================================================
// Seller Shipping Preferences
// =========================================================================

export interface SellerShippingPreferences {
  id: string;
  user_id: string;
  shop_id: string | null;
  offers_shipping: boolean;
  offers_pickup: boolean;
  offers_delivery: boolean;
  default_shipping_cost: number;
  free_shipping_threshold: number | null;
  shipping_regions: string[];
  pickup_address: string | null;
  pickup_city: string | null;
  pickup_division: string | null;
  pickup_instructions: string | null;
  estimated_handling_days: number;
  created_at: string;
  updated_at: string;
}

export interface SellerShippingPreferencesUpdate {
  offers_shipping?: boolean;
  offers_pickup?: boolean;
  offers_delivery?: boolean;
  default_shipping_cost?: number;
  free_shipping_threshold?: number | null;
  shipping_regions?: string[];
  pickup_address?: string | null;
  pickup_city?: string | null;
  pickup_division?: string | null;
  pickup_instructions?: string | null;
  estimated_handling_days?: number;
}

// =========================================================================
// Listing Performance Insights
// =========================================================================

export interface ListingPerformanceInsight {
  id: string;
  ad_id: string;
  user_id: string;
  stat_date: string;
  views: number;
  unique_views: number;
  inquiries: number;
  offers: number;
  favorites: number;
  shares: number;
  conversion_rate: number;
  created_at: string;
}

// =========================================================================
// Shop Order
// =========================================================================

export interface ShopOrder {
  id: string;
  shop_id: string;
  buyer_id: string;
  ad_id: string | null;
  order_number: string;
  status: ShopOrderStatus;
  payment_status: ShopPaymentStatus;
  amount: number;
  shipping_cost: number;
  total_amount: number;
  shipping_address: Record<string, unknown> | null;
  coupon_id: string | null;
  discount_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// =========================================================================
// Membership Tier Configuration
// =========================================================================

export interface MembershipTierConfig {
  tier: ShopMembershipTier;
  name: string;
  price: number;
  listing_limit: number;
  features: string[];
  analytics_level: 'basic' | 'advanced' | 'enterprise';
  allows_staff: boolean;
  allows_bulk_import: boolean;
  allows_coupons: boolean;
  allows_custom_url: boolean;
  allows_featured_badge: boolean;
  allows_premium_badge: boolean;
  max_staff: number;
  color: string;
}

export const MEMBERSHIP_TIERS: MembershipTierConfig[] = [
  {
    tier: 'basic',
    name: 'Basic Shop',
    price: 0,
    listing_limit: 50,
    features: [
      'Dedicated public shop page',
      'Custom shop URL',
      'Shop name, logo, and banner',
      'Business description',
      'Contact information',
      'Shop policies',
      'Basic analytics',
      'Shop followers',
      'Customer reviews',
      'Shareable shop page',
    ],
    analytics_level: 'basic',
    allows_staff: false,
    allows_bulk_import: false,
    allows_coupons: false,
    allows_custom_url: true,
    allows_featured_badge: false,
    allows_premium_badge: false,
    max_staff: 0,
    color: 'blue',
  },
  {
    tier: 'professional',
    name: 'Professional Shop',
    price: 499,
    listing_limit: 500,
    features: [
      'Everything in Basic Shop',
      'Advanced analytics dashboard',
      'Sales, revenue & profit dashboards',
      'Listing analytics',
      'Customer analytics',
      'Traffic & conversion analytics',
      'Best-selling products',
      'Low stock alerts',
      'Coupon creation',
      'Promotions and discounts',
      'Shop categories',
      'Product collections',
      'Featured products',
      'Search within shop',
      'SEO-optimized shop profile',
      'Shop announcements',
    ],
    analytics_level: 'advanced',
    allows_staff: false,
    allows_bulk_import: false,
    allows_coupons: true,
    allows_custom_url: true,
    allows_featured_badge: false,
    allows_premium_badge: false,
    max_staff: 0,
    color: 'purple',
  },
  {
    tier: 'business',
    name: 'Business Shop',
    price: 1499,
    listing_limit: 5000,
    features: [
      'Everything in Professional Shop',
      'Staff account management (up to 5)',
      'Bulk product import/export',
      'Store customization',
      'Saved product templates',
      'Business reports',
      'Financial reports',
      'Tax reports',
      'Payout management',
      'Inventory management',
      'Marketing tools',
      'Premium Shop badge',
      'Featured Shop eligibility',
      'Business hours display',
      'Shop location with map',
      'Social media links',
      'Warranty information',
    ],
    analytics_level: 'advanced',
    allows_staff: true,
    allows_bulk_import: true,
    allows_coupons: true,
    allows_custom_url: true,
    allows_featured_badge: true,
    allows_premium_badge: true,
    max_staff: 5,
    color: 'orange',
  },
  {
    tier: 'enterprise',
    name: 'Enterprise Shop',
    price: 4999,
    listing_limit: -1, // unlimited
    features: [
      'Everything in Business Shop',
      'Unlimited staff accounts',
      'Unlimited listings',
      'Enterprise analytics',
      'Advanced conversion analytics',
      'Custom integrations',
      'Priority support',
      'Featured Shop badge',
      'Premium Shop badge',
      'Verified Shop badge',
      'Dedicated account manager',
      'Custom branding options',
      'API access for bulk operations',
      'Advanced SEO tools',
    ],
    analytics_level: 'enterprise',
    allows_staff: true,
    allows_bulk_import: true,
    allows_coupons: true,
    allows_custom_url: true,
    allows_featured_badge: true,
    allows_premium_badge: true,
    max_staff: -1, // unlimited
    color: 'gold',
  },
];

export function getMembershipTierConfig(tier: ShopMembershipTier): MembershipTierConfig {
  return MEMBERSHIP_TIERS.find((t) => t.tier === tier) || MEMBERSHIP_TIERS[0];
}

// =========================================================================
// Business Hours Type
// =========================================================================

export interface BusinessHourEntry {
  open: string;
  close: string;
  closed: boolean;
}

export type BusinessHours = Record<string, BusinessHourEntry>;

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '10:00', close: '16:00', closed: false },
  sunday: { open: '00:00', close: '00:00', closed: true },
};
