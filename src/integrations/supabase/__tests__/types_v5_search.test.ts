import { describe, it, expect } from 'vitest';
import type {
  SearchHistoryRecord, SearchSuggestion, SearchSuggestionInsert,
  SearchAnalyticsSummary, UserCollection, UserCollectionInsert, UserCollectionUpdate,
  CollectionItem, CollectionItemInsert, DiscoverySection, DiscoverySectionInsert,
  DiscoverySectionUpdate, RecommendationCache, AdvancedSearchFilter, SearchSortOption,
  SearchQueryParams, SearchResult, SearchFacets, AutocompleteSuggestion,
  PersonalizedFeedSection, SearchResultListing, CollectionVisibility,
  DiscoverySectionType, SearchEntityType,
} from '@/integrations/supabase/types_v5_search';

describe('Phase 5 Type Definitions', () => {
  it('CollectionVisibility supports private and public', () => {
    const v: CollectionVisibility = 'private';
    expect(v).toBe('private');
  });

  it('DiscoverySectionType covers all section types', () => {
    const types: DiscoverySectionType[] = [
      'featured', 'trending', 'new_arrivals', 'recently_viewed', 'most_viewed',
      'most_favorited', 'popular_near_you', 'staff_picks', 'editors_picks',
      'seasonal_collections', 'flash_deals', 'limited_time_offers',
      'recommended_stores', 'featured_brands', 'discounted', 'ending_soon',
      'recently_updated', 'sponsored',
    ];
    expect(types).toHaveLength(18);
  });

  it('SearchEntityType covers all entity types', () => {
    const types: SearchEntityType[] = ['listing', 'category', 'brand', 'model', 'seller', 'store', 'tag', 'location'];
    expect(types).toHaveLength(8);
  });

  it('SearchSortOption covers all sort options', () => {
    const sorts: SearchSortOption[] = [
      'best_match', 'most_relevant', 'newest', 'oldest',
      'lowest_price', 'highest_price', 'most_popular', 'most_viewed',
      'most_favorited', 'best_rated_seller', 'nearest', 'ending_soon',
      'recently_updated',
    ];
    expect(sorts).toHaveLength(13);
  });

  it('SearchHistoryRecord has all fields', () => {
    const record: SearchHistoryRecord = {
      id: 'h-1', user_id: 'u-1', query: 'iphone', filters: {},
      results_count: 10, clicked_ad_id: null, session_id: null, created_at: '2024-01-01',
    };
    expect(record.query).toBe('iphone');
  });

  it('SearchSuggestion has all fields', () => {
    const suggestion: SearchSuggestion = {
      id: 's-1', term: 'iPhone', entity_type: 'listing', search_count: 100,
      result_count: 50, is_featured: true, is_trending: false, is_active: true,
      category_id: null, icon: null, metadata: null,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(suggestion.term).toBe('iPhone');
    expect(suggestion.is_featured).toBe(true);
  });

  it('UserCollection has all fields', () => {
    const collection: UserCollection = {
      id: 'c-1', user_id: 'u-1', name: 'My Favorites', description: 'Best items',
      visibility: 'private', cover_image_url: null, is_default: false, sort_order: 0,
      created_at: '2024-01-01', updated_at: '2024-01-01', item_count: 5,
    };
    expect(collection.name).toBe('My Favorites');
    expect(collection.item_count).toBe(5);
  });

  it('CollectionItem has all fields', () => {
    const item: CollectionItem = {
      id: 'ci-1', collection_id: 'c-1', ad_id: 'ad-1', user_id: 'u-1',
      notes: 'Great deal', sort_order: 0, created_at: '2024-01-01',
    };
    expect(item.ad_id).toBe('ad-1');
    expect(item.notes).toBe('Great deal');
  });

  it('DiscoverySection has all fields', () => {
    const section: DiscoverySection = {
      id: 'd-1', title: 'Featured', section_type: 'featured', subtitle: 'Top picks',
      icon: 'star', is_active: true, sort_order: 1, config: null,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    };
    expect(section.section_type).toBe('featured');
  });

  it('AdvancedSearchFilter supports all filter fields', () => {
    const filter: AdvancedSearchFilter = {
      query: 'iphone', category_id: 'cat-1', brand: 'Apple', condition: 'new',
      min_price: 50000, max_price: 150000, has_discount: true,
      free_shipping: true, has_warranty: true, seller_verified: true,
      division: 'Dhaka', tags: ['phone'], is_featured: true,
    };
    expect(filter.query).toBe('iphone');
    expect(filter.min_price).toBe(50000);
  });

  it('SearchQueryParams combines filter, sort, and pagination', () => {
    const params: SearchQueryParams = {
      filter: { query: 'test' }, sort: 'newest', page: 1, per_page: 20,
    };
    expect(params.page).toBe(1);
    expect(params.sort).toBe('newest');
  });

  it('SearchResult includes listings, pagination, and facets', () => {
    const result: SearchResult = {
      listings: [], total: 100, page: 1, per_page: 20, total_pages: 5,
      facets: { categories: [], brands: [], conditions: [], listing_types: [], price_range: { min: 0, max: 0 }, divisions: [] },
    };
    expect(result.total).toBe(100);
    expect(result.total_pages).toBe(5);
  });

  it('AutocompleteSuggestion supports all types', () => {
    const suggestions: AutocompleteSuggestion[] = [
      { type: 'listing', label: 'iPhone', value: 'iPhone', href: '/ad/1' },
      { type: 'category', label: 'Electronics', value: 'Electronics', href: '/category/electronics' },
      { type: 'brand', label: 'Apple', value: 'Apple' },
      { type: 'store', label: 'Apple Store', value: 'Apple Store', href: '/shop/apple' },
      { type: 'trending', label: 'iPhone 15', value: 'iPhone 15', search_count: 500 },
      { type: 'recent', label: 'samsung', value: 'samsung' },
    ];
    expect(suggestions).toHaveLength(6);
  });

  it('PersonalizedFeedSection has title, icon, and listings', () => {
    const section: PersonalizedFeedSection = {
      type: 'recommended', title: 'Recommended for You', icon: 'sparkles', listings: [],
    };
    expect(section.title).toBe('Recommended for You');
  });

  it('SearchAnalyticsSummary has all metrics', () => {
    const summary: SearchAnalyticsSummary = {
      total_searches: 1000, unique_terms: 500, no_result_rate: 0.15,
      avg_results_count: 25, click_through_rate: 0.3,
      top_searches: [], no_result_searches: [], recent_searches: [],
    };
    expect(summary.total_searches).toBe(1000);
    expect(summary.no_result_rate).toBe(0.15);
  });
});
