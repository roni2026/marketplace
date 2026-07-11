/**
 * TypeScript types for Phase 5: Advanced Search & Discovery.
 */

// =========================================================================
// Enums / Union Types
// =========================================================================

export type CollectionVisibility = 'private' | 'public';
export type DiscoverySectionType =
  | 'featured' | 'trending' | 'new_arrivals' | 'recently_viewed' | 'most_viewed'
  | 'most_favorited' | 'popular_near_you' | 'staff_picks' | 'editors_picks'
  | 'seasonal_collections' | 'flash_deals' | 'limited_time_offers'
  | 'recommended_stores' | 'featured_brands' | 'discounted' | 'ending_soon'
  | 'recently_updated' | 'sponsored';
export type SearchEntityType = 'listing' | 'category' | 'brand' | 'model' | 'seller' | 'store' | 'tag' | 'location';

// Extended sort options for Phase 5
export type SearchSortOption =
  | 'best_match' | 'most_relevant' | 'newest' | 'oldest'
  | 'lowest_price' | 'highest_price' | 'most_popular' | 'most_viewed'
  | 'most_favorited' | 'best_rated_seller' | 'nearest' | 'ending_soon'
  | 'recently_updated';

// =========================================================================
// Search History
// =========================================================================

export interface SearchHistoryRecord {
  id: string;
  user_id: string | null;
  query: string;
  filters: Record<string, unknown> | null;
  results_count: number;
  clicked_ad_id: string | null;
  session_id: string | null;
  created_at: string;
}

export interface SearchHistoryInsert {
  user_id?: string | null;
  query: string;
  filters?: Record<string, unknown>;
  results_count?: number;
  clicked_ad_id?: string | null;
  session_id?: string | null;
}

// =========================================================================
// Search Suggestions
// =========================================================================

export interface SearchSuggestion {
  id: string;
  term: string;
  entity_type: SearchEntityType;
  search_count: number;
  result_count: number;
  is_featured: boolean;
  is_trending: boolean;
  is_active: boolean;
  category_id: string | null;
  icon: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SearchSuggestionInsert {
  term: string;
  entity_type?: SearchEntityType;
  search_count?: number;
  is_featured?: boolean;
  is_trending?: boolean;
  is_active?: boolean;
  category_id?: string | null;
  icon?: string | null;
  metadata?: Record<string, unknown> | null;
}

// =========================================================================
// Search Analytics
// =========================================================================

export interface SearchAnalyticsRecord {
  id: string;
  search_term: string;
  user_id: string | null;
  results_count: number;
  has_results: boolean;
  clicked_result: boolean;
  clicked_ad_id: string | null;
  response_time_ms: number | null;
  filters: Record<string, unknown> | null;
  created_at: string;
}

export interface SearchAnalyticsSummary {
  total_searches: number;
  unique_terms: number;
  no_result_rate: number;
  avg_results_count: number;
  click_through_rate: number;
  top_searches: Array<{ term: string; count: number }>;
  no_result_searches: Array<{ term: string; count: number }>;
  recent_searches: SearchAnalyticsRecord[];
}

// =========================================================================
// User Collections (Wishlists)
// =========================================================================

export interface UserCollection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  visibility: CollectionVisibility;
  cover_image_url: string | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface UserCollectionInsert {
  user_id: string;
  name: string;
  description?: string | null;
  visibility?: CollectionVisibility;
  cover_image_url?: string | null;
  is_default?: boolean;
  sort_order?: number;
}

export interface UserCollectionUpdate {
  name?: string;
  description?: string | null;
  visibility?: CollectionVisibility;
  cover_image_url?: string | null;
  sort_order?: number;
}

// =========================================================================
// Collection Items
// =========================================================================

export interface CollectionItem {
  id: string;
  collection_id: string;
  ad_id: string;
  user_id: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
  ad?: {
    id: string;
    title: string;
    slug: string;
    price: number | null;
    price_type: string;
    condition: string;
    division: string;
    district: string;
    is_featured: boolean;
    created_at: string;
    ad_images: { image_url: string }[];
    categories: { name: string; slug: string } | null;
  };
}

export interface CollectionItemInsert {
  collection_id: string;
  ad_id: string;
  user_id: string;
  notes?: string | null;
  sort_order?: number;
}

// =========================================================================
// Discovery Sections
// =========================================================================

export interface DiscoverySection {
  id: string;
  title: string;
  section_type: DiscoverySectionType;
  subtitle: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DiscoverySectionInsert {
  title: string;
  section_type: DiscoverySectionType;
  subtitle?: string | null;
  icon?: string | null;
  is_active?: boolean;
  sort_order?: number;
  config?: Record<string, unknown> | null;
}

export interface DiscoverySectionUpdate {
  title?: string;
  subtitle?: string | null;
  icon?: string | null;
  is_active?: boolean;
  sort_order?: number;
  config?: Record<string, unknown> | null;
}

// =========================================================================
// Recommendation Cache
// =========================================================================

export interface RecommendationCache {
  id: string;
  user_id: string;
  recommendation_type: string;
  ad_id: string;
  score: number;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  expires_at: string;
}

// =========================================================================
// Advanced Search Filter
// =========================================================================

export interface AdvancedSearchFilter {
  query?: string;
  category_id?: string;
  subcategory_id?: string;
  brand?: string;
  model?: string;
  condition?: string;
  listing_type?: string;
  min_price?: number;
  max_price?: number;
  has_discount?: boolean;
  min_discount?: number;
  is_negotiable?: boolean;
  free_shipping?: boolean;
  pickup_available?: boolean;
  delivery_available?: boolean;
  international_shipping?: boolean;
  has_warranty?: boolean;
  warranty_type?: string;
  seller_id?: string;
  seller_verified?: boolean;
  seller_type?: 'business' | 'individual';
  min_store_rating?: number;
  seller_location?: string;
  division?: string;
  district?: string;
  area?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  is_featured?: boolean;
  is_premium?: boolean;
  is_boosted?: boolean;
  search_by_sku?: string;
  search_by_product_id?: string;
  search_by_listing_id?: string;
  search_by_seller_name?: string;
  search_by_store_name?: string;
  radius_km?: number;
  latitude?: number;
  longitude?: number;
}

// =========================================================================
// Search Query Params
// =========================================================================

export interface SearchQueryParams {
  filter: AdvancedSearchFilter;
  sort: SearchSortOption;
  page: number;
  per_page: number;
}

export interface SearchResult {
  listings: SearchResultListing[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  facets: SearchFacets;
}

export interface SearchResultListing {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | null;
  original_price: number | null;
  discount_percentage: number | null;
  price_type: string;
  is_negotiable: boolean | null;
  condition: string;
  listing_type: string | null;
  brand: string | null;
  model: string | null;
  tags: string[] | null;
  division: string;
  district: string;
  area: string | null;
  is_featured: boolean;
  is_premium: boolean | null;
  is_boosted: boolean | null;
  views_count: number | null;
  favorites_count: number | null;
  created_at: string;
  updated_at: string;
  ad_images: { image_url: string; sort_order: number }[];
  categories: { name: string; slug: string } | null;
  free_shipping: boolean | null;
  shipping_methods: string[] | null;
  warranty_type: string | null;
  user_id: string;
  relevance_score?: number;
}

// =========================================================================
// Search Facets (for filter aggregation)
// =========================================================================

export interface SearchFacets {
  categories: Array<{ id: string; name: string; count: number }>;
  brands: Array<{ name: string; count: number }>;
  conditions: Array<{ name: string; count: number }>;
  listing_types: Array<{ name: string; count: number }>;
  price_range: { min: number; max: number };
  divisions: Array<{ name: string; count: number }>;
}

// =========================================================================
// Autocomplete Suggestion
// =========================================================================

export interface AutocompleteSuggestion {
  type: 'listing' | 'category' | 'brand' | 'model' | 'seller' | 'store' | 'tag' | 'location' | 'keyword' | 'trending' | 'recent';
  label: string;
  value: string;
  subtitle?: string;
  image_url?: string;
  href?: string;
  search_count?: number;
}

// =========================================================================
// Personalized Feed
// =========================================================================

export interface PersonalizedFeedSection {
  type: string;
  title: string;
  icon: string;
  listings: SearchResultListing[];
  view_all_link?: string;
}

// =========================================================================
// Notification Types for Search
// =========================================================================

export interface SearchNotification {
  id: string;
  type: 'new_listing_match' | 'price_drop' | 'back_in_stock' | 'new_seller_listing' | 'new_store_listing' | 'expiring_listing';
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}
