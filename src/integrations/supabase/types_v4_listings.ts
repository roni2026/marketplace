/**
 * TypeScript types for Phase 4: Listing Management.
 * These complement the base types in types.ts and v2/v3 types.
 */

// =========================================================================
// Enums / Union Types
// =========================================================================

export type WarrantyType = 'none' | 'manufacturer' | 'seller';
export type ShippingMethod = 'local_pickup' | 'nationwide' | 'international';
export type ShippingFeeType = 'free' | 'flat_rate' | 'calculated';
export type HistoryAction =
  | 'created' | 'edited' | 'price_changed' | 'photo_changed' | 'status_changed'
  | 'renewed' | 'relisted' | 'marked_sold' | 'archived' | 'restored'
  | 'deleted' | 'duplicated' | 'published' | 'scheduled' | 'paused'
  | 'resumed' | 'hidden' | 'bulk_updated';
export type AttributeDataType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'date';

// Extended ad status including Phase 4 additions
export type ListingStatus =
  | 'draft' | 'pending' | 'approved' | 'scheduled' | 'paused'
  | 'hidden' | 'sold' | 'expired' | 'archived' | 'rejected'
  | 'boosted' | 'premium';

// =========================================================================
// Configurable Listing Types
// =========================================================================

export interface ListingType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  is_digital: boolean;
  is_service: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListingTypeInsert {
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_digital?: boolean;
  is_service?: boolean;
}

export interface ListingTypeUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_digital?: boolean;
  is_service?: boolean;
}

// =========================================================================
// Configurable Item Conditions
// =========================================================================

export interface ItemConditionConfig {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemConditionConfigInsert {
  name: string;
  slug: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface ItemConditionConfigUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

// =========================================================================
// Category Attributes
// =========================================================================

export interface CategoryAttribute {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  data_type: AttributeDataType;
  is_required: boolean;
  is_filterable: boolean;
  options: string[];
  unit: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryAttributeInsert {
  category_id: string;
  name: string;
  slug: string;
  data_type?: AttributeDataType;
  is_required?: boolean;
  is_filterable?: boolean;
  options?: string[];
  unit?: string | null;
  sort_order?: number;
}

export interface CategoryAttributeUpdate {
  name?: string;
  slug?: string;
  data_type?: AttributeDataType;
  is_required?: boolean;
  is_filterable?: boolean;
  options?: string[];
  unit?: string | null;
  sort_order?: number;
}

// =========================================================================
// Listing History
// =========================================================================

export interface ListingHistoryRecord {
  id: string;
  ad_id: string;
  user_id: string | null;
  action: HistoryAction;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  field_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface ListingHistoryInsert {
  ad_id: string;
  user_id: string;
  action: HistoryAction;
  previous_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  field_name?: string | null;
  notes?: string | null;
}

// =========================================================================
// Listing Analytics
// =========================================================================

export interface ListingAnalyticsRecord {
  id: string;
  ad_id: string;
  stat_date: string;
  total_views: number;
  unique_visitors: number;
  favorites: number;
  shares: number;
  messages_received: number;
  contact_clicks: number;
  inquiries: number;
  created_at: string;
}

export interface ListingAnalyticsSummary {
  total_views: number;
  unique_visitors: number;
  favorites: number;
  shares: number;
  messages_received: number;
  contact_clicks: number;
  inquiries: number;
  listing_age_days: number;
  daily_breakdown: ListingAnalyticsRecord[];
}

// =========================================================================
// Extended Listing (ads table with Phase 4 fields)
// =========================================================================

export interface ExtendedListing {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  rich_description: string | null;
  short_description: string | null;
  category_id: string;
  subcategory_id: string | null;
  price: number | null;
  original_price: number | null;
  discount_amount: number | null;
  discount_percentage: number | null;
  price_type: string;
  is_negotiable: boolean;
  min_offer: number | null;
  currency: string;
  condition: string;
  listing_type: string;
  brand: string | null;
  model: string | null;
  tags: string[];
  sku: string | null;
  barcode: string | null;
  serial_number: string | null;
  mpn: string | null;
  product_attributes: Record<string, unknown>;
  condition_details: Record<string, unknown>;
  division: string;
  district: string;
  area: string | null;
  status: string;
  shop_id: string | null;
  cover_image_id: string | null;
  shipping_methods: ShippingMethod[];
  shipping_fee_type: ShippingFeeType;
  shipping_fee: number;
  free_shipping: boolean;
  estimated_delivery_days: number | null;
  handling_time_days: number | null;
  delivery_locations: string[];
  warranty_type: WarrantyType;
  warranty_duration_months: number | null;
  warranty_coverage: string | null;
  warranty_terms: string | null;
  is_featured: boolean;
  is_premium: boolean;
  is_boosted: boolean;
  is_urgent: boolean;
  boosted_until: string | null;
  premium_until: string | null;
  expires_at: string | null;
  scheduled_at: string | null;
  views_count: number;
  favorites_count: number;
  shares_count: number;
  offers_count: number;
  deleted_at: string | null;
  renewed_at: string | null;
  sold_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

// =========================================================================
// Extended Listing Variant (with Phase 4 fields)
// =========================================================================

export interface ExtendedListingVariant {
  id: string;
  ad_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  serial_number: string | null;
  price: number | null;
  stock: number | null;
  attributes: Record<string, unknown> | null;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ExtendedListingVariantInsert {
  ad_id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  serial_number?: string | null;
  price?: number | null;
  stock?: number | null;
  attributes?: Record<string, unknown> | null;
  image_url?: string | null;
  is_available?: boolean;
  sort_order?: number;
}

export interface ExtendedListingVariantUpdate {
  name?: string;
  sku?: string | null;
  barcode?: string | null;
  serial_number?: string | null;
  price?: number | null;
  stock?: number | null;
  attributes?: Record<string, unknown> | null;
  image_url?: string | null;
  is_available?: boolean;
  sort_order?: number;
}

// =========================================================================
// Bulk Listing Operations
// =========================================================================

export interface BulkListingOperation {
  id: string;
  user_id: string;
  operation: string;
  ad_ids: string[];
  parameters: Record<string, unknown> | null;
  status: string;
  total_count: number;
  success_count: number;
  failure_count: number;
  error_details: Array<{ ad_id: string; error: string }>;
  created_at: string;
  completed_at: string | null;
}

export type BulkOperationType =
  | 'bulk_edit' | 'bulk_publish' | 'bulk_pause' | 'bulk_archive'
  | 'bulk_delete' | 'bulk_relist' | 'bulk_renew'
  | 'bulk_category_change' | 'bulk_price_update' | 'bulk_shipping_update';

// =========================================================================
// Condition Details
// =========================================================================

export interface ConditionDetails {
  cosmetic_condition?: string;
  functional_condition?: string;
  missing_accessories?: string;
  repairs?: string;
  defects?: string;
  scratches?: string;
  additional_notes?: string;
}

// =========================================================================
// Listing Validation
// =========================================================================

export interface ListingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ListingValidationContext {
  title: string;
  description: string;
  price: number | null;
  price_type: string;
  category_id: string;
  images: { url: string }[];
  sku?: string | null;
  barcode?: string | null;
  user_id: string;
  ad_id?: string;
  division?: string;
  district?: string;
}

// =========================================================================
// Search & Filter Types
// =========================================================================

export interface ListingFilter {
  category_id?: string;
  subcategory_id?: string;
  brand?: string;
  model?: string;
  min_price?: number;
  max_price?: number;
  condition?: string;
  listing_type?: string;
  seller_id?: string;
  division?: string;
  district?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
}

export type SortOption =
  | 'newest' | 'oldest' | 'lowest_price' | 'highest_price'
  | 'most_popular' | 'most_viewed' | 'recently_updated';

export interface ListingQueryParams {
  filter: ListingFilter;
  sort: SortOption;
  page: number;
  per_page: number;
}

export interface ListingQueryResult {
  listings: ExtendedListing[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// =========================================================================
// Seller Store Integration
// =========================================================================

export interface SellerStoreInfo {
  seller_name: string | null;
  seller_avatar: string | null;
  seller_verified: boolean;
  seller_location: string | null;
  seller_join_date: string | null;
  seller_rating: number;
  store_name: string | null;
  store_logo: string | null;
  store_slug: string | null;
  store_policies: {
    shipping_policy: string | null;
    return_policy: string | null;
    refund_policy: string | null;
    warranty_info: string | null;
  } | null;
  active_listings_count: number;
  followers_count: number;
  verification_badge: boolean;
}
