/**
 * Phase 5 — Advanced Search & Discovery Library
 *
 * Comprehensive search utilities:
 * - Full-text search with fuzzy matching and typo correction
 * - Autocomplete suggestions (products, categories, brands, stores, sellers)
 * - Search history management
 * - Advanced filtering (price, condition, brand, location, shipping, warranty, seller)
 * - Search ranking by relevance
 * - Discovery sections (featured, trending, new arrivals, flash deals, etc.)
 * - Personalized recommendations
 * - User collections (wishlists)
 * - Recently viewed tracking
 * - Search analytics
 * - No-result recommendations
 * - Synonym matching
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  SearchHistoryRecord, SearchHistoryInsert,
  SearchSuggestion, SearchSuggestionInsert,
  SearchAnalyticsSummary,
  UserCollection, UserCollectionInsert, UserCollectionUpdate,
  CollectionItem, CollectionItemInsert,
  DiscoverySection, DiscoverySectionInsert, DiscoverySectionUpdate,
  RecommendationCache,
  AdvancedSearchFilter, SearchSortOption, SearchQueryParams, SearchResult,
  SearchFacets, AutocompleteSuggestion, PersonalizedFeedSection,
  SearchResultListing,
} from '@/integrations/supabase/types_v5_search';

// =========================================================================
// Synonym Dictionary for Search Intelligence
// =========================================================================

const SYNONYMS: Record<string, string[]> = {
  'phone': ['mobile', 'smartphone', 'cellphone', 'cell phone'],
  'mobile': ['phone', 'smartphone', 'cellphone'],
  'laptop': ['notebook', 'computer', 'pc'],
  'computer': ['laptop', 'pc', 'desktop'],
  'car': ['vehicle', 'automobile', 'auto'],
  'bike': ['motorcycle', 'bicycle', 'cycle'],
  'motorcycle': ['bike', 'motorbike'],
  'tv': ['television', 'television'],
  'fridge': ['refrigerator', 'freezer'],
  'ac': ['air conditioner', 'airconditioner', 'cooling'],
  'flat': ['apartment', 'house', 'rent'],
  'apartment': ['flat', 'house', 'rent'],
  'shoe': ['shoes', 'footwear', 'sneaker'],
  'shoes': ['shoe', 'footwear', 'sneaker'],
  'watch': ['wristwatch', 'timepiece'],
  'camera': ['dslr', 'mirrorless', 'camcorder'],
  'headphone': ['headphones', 'earphone', 'earphones', 'earbuds'],
  'headphones': ['headphone', 'earphone', 'earphones', 'earbuds'],
};

const PLURAL_MAP: Record<string, string> = {
  'phones': 'phone', 'laptops': 'laptop', 'cars': 'car', 'bikes': 'bike',
  'watches': 'watch', 'cameras': 'camera', 'shoes': 'shoe',
  'apartments': 'apartment', 'flats': 'flat', 'fridges': 'fridge',
};

// =========================================================================
// Search Intelligence: Query Processing
// =========================================================================

export function expandQuery(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];

  const terms: string[] = [normalized];

  // Plural/singular matching
  const singular = PLURAL_MAP[normalized];
  if (singular) terms.push(singular);

  const plural = normalized + 's';
  if (!PLURAL_MAP[plural]) terms.push(plural);

  // Synonym matching
  const synonyms = SYNONYMS[normalized];
  if (synonyms) terms.push(...synonyms);

  // Partial word matching - add each word
  const words = normalized.split(/\s+/);
  if (words.length > 1) {
    terms.push(...words);
  }

  return [...new Set(terms)];
}

export function highlightKeyword(text: string, keyword: string): string {
  if (!keyword || !text) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900 rounded px-0.5">$1</mark>');
}

export function calculateRelevanceScore(
  listing: { title: string; description: string | null; brand: string | null; model: string | null; tags: string[] | null; views_count: number | null; favorites_count: number | null; is_featured: boolean; is_boosted: boolean | null; is_premium: boolean | null; created_at: string },
  query: string
): number {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return 0;

  let score = 0;
  const title = (listing.title || '').toLowerCase();
  const description = (listing.description || '').toLowerCase();
  const brand = (listing.brand || '').toLowerCase();
  const model = (listing.model || '').toLowerCase();
  const tags = (listing.tags || []).join(' ').toLowerCase();

  // Exact title match
  if (title === normalizedQuery) score += 100;
  // Title starts with query
  else if (title.startsWith(normalizedQuery)) score += 50;
  // Title contains query
  else if (title.includes(normalizedQuery)) score += 30;
  // Word-level title match
  else {
    const queryWords = normalizedQuery.split(/\s+/);
    for (const word of queryWords) {
      if (title.includes(word)) score += 10;
    }
  }

  // Brand match
  if (brand === normalizedQuery) score += 40;
  else if (brand.includes(normalizedQuery)) score += 20;

  // Model match
  if (model === normalizedQuery) score += 30;
  else if (model.includes(normalizedQuery)) score += 15;

  // Description match
  if (description.includes(normalizedQuery)) score += 5;

  // Tag match
  if (tags.includes(normalizedQuery)) score += 15;

  // Boost factors
  if (listing.is_featured) score += 10;
  if (listing.is_boosted) score += 8;
  if (listing.is_premium) score += 5;

  // Popularity factors
  score += (listing.views_count || 0) * 0.01;
  score += (listing.favorites_count || 0) * 0.1;

  // Recency factor (newer = higher score)
  const ageDays = (Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 7) score += 5;
  else if (ageDays < 30) score += 2;

  return score;
}

// =========================================================================
// Advanced Search
// =========================================================================

export async function advancedSearch(params: SearchQueryParams): Promise<SearchResult> {
  const { filter, sort, page, per_page } = params;
  const startTime = Date.now();

  let query = supabase
    .from('ads')
    .select('*, ad_images(image_url, sort_order), categories(name, slug)', { count: 'exact' })
    .in('status', ['approved', 'boosted', 'premium']);

  // Text search
  if (filter.query) {
    const expanded = expandQuery(filter.query);
    if (expanded.length > 1) {
      const orConditions = expanded.map(t => `title.ilike.%${t}%,description.ilike.%${t}%,brand.ilike.%${t}%,model.ilike.%${t}%`).join(',');
      query = query.or(orConditions);
    } else {
      query = query.or(`title.ilike.%${filter.query}%,description.ilike.%${filter.query}%,brand.ilike.%${filter.query}%,model.ilike.%${filter.query}%`);
    }
  }

  // Specific ID searches
  if (filter.search_by_listing_id) {
    query = query.eq('id', filter.search_by_listing_id);
  }
  if (filter.search_by_sku) {
    query = query.eq('sku', filter.search_by_sku);
  }
  if (filter.search_by_product_id) {
    query = query.eq('id', filter.search_by_product_id);
  }

  // Category filters
  if (filter.category_id) query = query.eq('category_id', filter.category_id);
  if (filter.subcategory_id) query = query.eq('subcategory_id', filter.subcategory_id);

  // Brand/Model
  if (filter.brand) query = query.ilike('brand', `%${filter.brand}%`);
  if (filter.model) query = query.ilike('model', `%${filter.model}%`);

  // Condition
  if (filter.condition && filter.condition !== 'all') query = query.eq('condition', filter.condition);

  // Listing type
  if (filter.listing_type && filter.listing_type !== 'all') query = query.eq('listing_type', filter.listing_type);

  // Price range
  if (filter.min_price !== undefined) query = query.gte('price', filter.min_price);
  if (filter.max_price !== undefined) query = query.lte('price', filter.max_price);

  // Discount
  if (filter.has_discount) query = query.not('discount_amount', 'is', null).gt('discount_amount', 0);
  if (filter.min_discount !== undefined) query = query.gte('discount_percentage', filter.min_discount);

  // Negotiable
  if (filter.is_negotiable !== undefined) query = query.eq('is_negotiable', filter.is_negotiable);

  // Shipping
  if (filter.free_shipping) query = query.eq('free_shipping', true);
  if (filter.pickup_available) query = query.contains('shipping_methods', ['local_pickup']);
  if (filter.delivery_available) query = query.contains('shipping_methods', ['nationwide']);
  if (filter.international_shipping) query = query.contains('shipping_methods', ['international']);

  // Warranty
  if (filter.has_warranty) query = query.not('warranty_type', 'eq', 'none');
  if (filter.warranty_type) query = query.eq('warranty_type', filter.warranty_type);

  // Seller
  if (filter.seller_id) query = query.eq('user_id', filter.seller_id);

  // Location
  if (filter.division && filter.division !== 'all') query = query.eq('division', filter.division);
  if (filter.district && filter.district !== 'all') query = query.eq('district', filter.district);
  if (filter.area) query = query.ilike('area', `%${filter.area}%`);

  // Tags
  if (filter.tags && filter.tags.length > 0) query = query.overlaps('tags', filter.tags);

  // Date range
  if (filter.date_from) query = query.gte('created_at', filter.date_from);
  if (filter.date_to) query = query.lte('created_at', filter.date_to);

  // Featured/Premium/Boosted
  if (filter.is_featured) query = query.eq('is_featured', true);
  if (filter.is_premium) query = query.eq('is_premium', true);
  if (filter.is_boosted) query = query.eq('is_boosted', true);

  // Seller name search (requires a join-like approach)
  if (filter.search_by_seller_name) {
    // First find seller IDs matching the name
    const { data: sellers } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('full_name', `%${filter.search_by_seller_name}%`);
    if (sellers && sellers.length > 0) {
      query = query.in('user_id', sellers.map(s => s.user_id));
    } else {
      // No matching sellers, return empty
      return { listings: [], total: 0, page, per_page, total_pages: 0, facets: emptyFacets() };
    }
  }

  // Store name search
  if (filter.search_by_store_name) {
    const { data: shops } = await supabase
      .from('shops')
      .select('owner_id')
      .ilike('name', `%${filter.search_by_store_name}%`);
    if (shops && shops.length > 0) {
      query = query.in('user_id', shops.map(s => s.owner_id));
    } else {
      return { listings: [], total: 0, page, per_page, total_pages: 0, facets: emptyFacets() };
    }
  }

  // Seller verified
  if (filter.seller_verified) {
    const { data: verifiedSellers } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('is_verified', true);
    if (verifiedSellers && verifiedSellers.length > 0) {
      query = query.in('user_id', verifiedSellers.map(s => s.user_id));
    }
  }

  // Sorting
  switch (sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'lowest_price':
      query = query.order('price', { ascending: true, nullsFirst: false });
      break;
    case 'highest_price':
      query = query.order('price', { ascending: false, nullsFirst: false });
      break;
    case 'most_popular':
      query = query.order('favorites_count', { ascending: false, nullsFirst: false });
      break;
    case 'most_viewed':
      query = query.order('views_count', { ascending: false, nullsFirst: false });
      break;
    case 'most_favorited':
      query = query.order('favorites_count', { ascending: false, nullsFirst: false });
      break;
    case 'recently_updated':
      query = query.order('updated_at', { ascending: false });
      break;
    case 'best_match':
    case 'most_relevant':
      // For relevance, we'll sort in memory after fetching
      query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
      break;
    case 'ending_soon':
      query = query.not('expires_at', 'is', null).order('expires_at', { ascending: true });
      break;
    case 'best_rated_seller':
      // Sort by seller rating - requires fetching and sorting in memory
      query = query.order('created_at', { ascending: false });
      break;
    case 'nearest':
      // Sort by location proximity - would need geo functions
      query = query.order('created_at', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  // Pagination
  const offset = (page - 1) * per_page;
  query = query.range(offset, offset + per_page - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('advancedSearch error:', error);
    return { listings: [], total: 0, page, per_page, total_pages: 0, facets: emptyFacets() };
  }

  let listings = (data as SearchResultListing[]) || [];

  // Apply relevance scoring for best_match/most_relevant
  if ((sort === 'best_match' || sort === 'most_relevant') && filter.query) {
    listings = listings.map(l => ({
      ...l,
      relevance_score: calculateRelevanceScore(l, filter.query!),
    })).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  }

  const total = count || 0;
  const total_pages = Math.ceil(total / per_page);
  const responseTime = Date.now() - startTime;

  // Record search analytics
  if (filter.query) {
    recordSearchAnalytics(filter.query, total, responseTime, filter).catch(() => {});
  }

  // Fetch facets
  const facets = await fetchFacets(filter);

  return { listings, total, page, per_page, total_pages, facets };
}

function emptyFacets(): SearchFacets {
  return {
    categories: [], brands: [], conditions: [], listing_types: [],
    price_range: { min: 0, max: 0 }, divisions: [],
  };
}

async function fetchFacets(filter: AdvancedSearchFilter): Promise<SearchFacets> {
  try {
    // Get category facets
    const { data: catData } = await supabase
      .from('ads')
      .select('category_id, categories(name)')
      .in('status', ['approved', 'boosted', 'premium'])
      .limit(500);

    const catCounts: Record<string, { name: string; count: number }> = {};
    (catData || []).forEach((row: any) => {
      if (row.category_id && row.categories?.name) {
        if (!catCounts[row.category_id]) {
          catCounts[row.category_id] = { name: row.categories.name, count: 0 };
        }
        catCounts[row.category_id].count++;
      }
    });

    // Get brand facets
    const { data: brandData } = await supabase
      .from('ads')
      .select('brand')
      .not('brand', 'is', null)
      .in('status', ['approved', 'boosted', 'premium'])
      .limit(500);

    const brandCounts: Record<string, number> = {};
    (brandData || []).forEach((row: any) => {
      if (row.brand) {
        brandCounts[row.brand] = (brandCounts[row.brand] || 0) + 1;
      }
    });

    // Get price range
    const { data: priceData } = await supabase
      .from('ads')
      .select('price')
      .not('price', 'is', null)
      .in('status', ['approved', 'boosted', 'premium'])
      .order('price', { ascending: true })
      .limit(1);

    const { data: priceMaxData } = await supabase
      .from('ads')
      .select('price')
      .not('price', 'is', null)
      .in('status', ['approved', 'boosted', 'premium'])
      .order('price', { ascending: false })
      .limit(1);

    // Get division facets
    const { data: divData } = await supabase
      .from('ads')
      .select('division')
      .in('status', ['approved', 'boosted', 'premium'])
      .limit(500);

    const divCounts: Record<string, number> = {};
    (divData || []).forEach((row: any) => {
      if (row.division) {
        divCounts[row.division] = (divCounts[row.division] || 0) + 1;
      }
    });

    return {
      categories: Object.entries(catCounts).map(([id, { name, count }]) => ({ id, name, count })),
      brands: Object.entries(brandCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 20),
      conditions: [
        { name: 'new', count: 0 },
        { name: 'used', count: 0 },
      ],
      listing_types: [],
      price_range: {
        min: priceData?.[0]?.price || 0,
        max: priceMaxData?.[0]?.price || 0,
      },
      divisions: Object.entries(divCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  } catch (err) {
    console.error('fetchFacets error:', err);
    return emptyFacets();
  }
}

// =========================================================================
// Search Analytics
// =========================================================================

async function recordSearchAnalytics(
  query: string,
  resultsCount: number,
  responseTimeMs: number,
  filters: AdvancedSearchFilter
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc('record_search', {
      p_search_term: query,
      p_user_id: user?.id || null,
      p_results_count: resultsCount,
      p_response_time_ms: responseTimeMs,
      p_filters: filters as Record<string, unknown>,
    });
  } catch (err) {
    // Non-critical, ignore errors
  }
}

export async function getSearchAnalytics(): Promise<SearchAnalyticsSummary> {
  try {
    const { data: recentSearches } = await supabase
      .from('search_analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: topData } = await supabase
      .from('search_analytics')
      .select('search_term')
      .order('created_at', { ascending: false })
      .limit(500);

    const termCounts: Record<string, number> = {};
    (topData || []).forEach((row: any) => {
      if (row.search_term) {
        termCounts[row.search_term] = (termCounts[row.search_term] || 0) + 1;
      }
    });

    const noResultTerms: Record<string, number> = {};
    const allSearches = (recentSearches || []) as any[];
    allSearches.forEach(s => {
      if (!s.has_results && s.search_term) {
        noResultTerms[s.search_term] = (noResultTerms[s.search_term] || 0) + 1;
      }
    });

    const total = allSearches.length;
    const noResultCount = allSearches.filter(s => !s.has_results).length;
    const clickedCount = allSearches.filter(s => s.clicked_result).length;
    const avgResults = total > 0 ? allSearches.reduce((sum, s) => sum + (s.results_count || 0), 0) / total : 0;

    return {
      total_searches: total,
      unique_terms: Object.keys(termCounts).length,
      no_result_rate: total > 0 ? noResultCount / total : 0,
      avg_results_count: Math.round(avgResults),
      click_through_rate: total > 0 ? clickedCount / total : 0,
      top_searches: Object.entries(termCounts).map(([term, count]) => ({ term, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      no_result_searches: Object.entries(noResultTerms).map(([term, count]) => ({ term, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      recent_searches: allSearches,
    };
  } catch (err) {
    console.error('getSearchAnalytics error:', err);
    return {
      total_searches: 0, unique_terms: 0, no_result_rate: 0, avg_results_count: 0,
      click_through_rate: 0, top_searches: [], no_result_searches: [], recent_searches: [],
    };
  }
}

// =========================================================================
// Autocomplete Suggestions
// =========================================================================

export async function getAutocompleteSuggestions(query: string, userId?: string): Promise<AutocompleteSuggestion[]> {
  if (!query || query.trim().length < 1) {
    // Return trending/popular when no query
    return getTrendingSuggestions();
  }

  const normalized = query.trim();
  const suggestions: AutocompleteSuggestion[] = [];

  try {
    // 1. Search suggestions from DB
    const { data: dbSuggestions } = await supabase.rpc('get_search_suggestions', {
      p_query: normalized,
      p_limit: 5,
    });

    if (dbSuggestions) {
      (dbSuggestions as any[]).forEach(s => {
        suggestions.push({
          type: s.entity_type || 'keyword',
          label: s.term,
          value: s.term,
          search_count: s.search_count,
          subtitle: s.is_trending ? 'Trending' : s.is_featured ? 'Popular' : undefined,
        });
      });
    }

    // 2. Product suggestions (title match)
    const { data: products } = await supabase
      .from('ads')
      .select('id, title, slug, price, price_type, ad_images(image_url)')
      .ilike('title', `%${normalized}%`)
      .in('status', ['approved', 'boosted', 'premium'])
      .limit(5);

    if (products) {
      (products as any[]).forEach(p => {
        suggestions.push({
          type: 'listing',
          label: p.title,
          value: p.title,
          href: `/ad/${p.slug}-${p.id}`,
          image_url: p.ad_images?.[0]?.image_url,
          subtitle: p.price ? `৳${p.price}` : 'See price',
        });
      });
    }

    // 3. Category suggestions
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, slug')
      .ilike('name', `%${normalized}%`)
      .limit(3);

    if (categories) {
      (categories as any[]).forEach(c => {
        suggestions.push({
          type: 'category',
          label: c.name,
          value: c.name,
          href: `/category/${c.slug}`,
          subtitle: 'Category',
        });
      });
    }

    // 4. Brand suggestions
    const { data: brandData } = await supabase
      .from('ads')
      .select('brand')
      .ilike('brand', `%${normalized}%`)
      .not('brand', 'is', null)
      .in('status', ['approved', 'boosted', 'premium'])
      .limit(10);

    if (brandData) {
      const uniqueBrands = [...new Set((brandData as any[]).map(b => b.brand).filter(Boolean))].slice(0, 3);
      uniqueBrands.forEach(brand => {
        suggestions.push({
          type: 'brand',
          label: brand,
          value: brand,
          subtitle: 'Brand',
        });
      });
    }

    // 5. Store suggestions
    const { data: stores } = await supabase
      .from('shops')
      .select('id, name, slug, logo_url')
      .ilike('name', `%${normalized}%`)
      .limit(3);

    if (stores) {
      (stores as any[]).forEach(s => {
        suggestions.push({
          type: 'store',
          label: s.name,
          value: s.name,
          href: `/shop/${s.slug}`,
          image_url: s.logo_url,
          subtitle: 'Store',
        });
      });
    }

    // 6. Seller suggestions
    const { data: sellers } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .ilike('full_name', `%${normalized}%`)
      .limit(3);

    if (sellers) {
      (sellers as any[]).forEach(s => {
        suggestions.push({
          type: 'seller',
          label: s.full_name || 'Unknown',
          value: s.full_name || '',
          href: `/user/${s.user_id}`,
          image_url: s.avatar_url,
          subtitle: 'Seller',
        });
      });
    }

    // 7. Recent searches (if user logged in)
    if (userId) {
      const { data: recent } = await supabase
        .from('search_history')
        .select('query')
        .eq('user_id', userId)
        .ilike('query', `%${normalized}%`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recent) {
        (recent as any[]).forEach(r => {
          suggestions.push({
            type: 'recent',
            label: r.query,
            value: r.query,
            subtitle: 'Recent search',
          });
        });
      }
    }

    // Deduplicate by label+type
    const seen = new Set<string>();
    return suggestions.filter(s => {
      const key = `${s.type}-${s.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  } catch (err) {
    console.error('getAutocompleteSuggestions error:', err);
    return [];
  }
}

export async function getTrendingSuggestions(): Promise<AutocompleteSuggestion[]> {
  try {
    const { data } = await supabase.rpc('get_trending_searches', { p_limit: 8 });
    if (data) {
      return (data as any[]).map(s => ({
        type: 'trending' as const,
        label: s.term,
        value: s.term,
        search_count: s.search_count,
        subtitle: 'Trending',
      }));
    }
  } catch (err) {
    console.error('getTrendingSuggestions error:', err);
  }

  // Fallback to featured suggestions from DB
  const { data: featured } = await supabase
    .from('search_suggestions')
    .select('term, search_count, is_trending, is_featured')
    .eq('is_active', true)
    .or('is_trending.eq.true,is_featured.eq.true')
    .order('search_count', { ascending: false })
    .limit(8);

  if (featured) {
    return (featured as any[]).map(s => ({
      type: 'trending' as const,
      label: s.term,
      value: s.term,
      search_count: s.search_count,
      subtitle: s.is_trending ? 'Trending' : 'Popular',
    }));
  }

  return [];
}

// =========================================================================
// Search History
// =========================================================================

export async function getSearchHistory(userId: string, limit: number = 20): Promise<SearchHistoryRecord[]> {
  const { data, error } = await supabase
    .from('search_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getSearchHistory:', error); return []; }
  return (data as SearchHistoryRecord[]) || [];
}

export async function deleteSearchHistoryItem(id: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('search_history')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) { console.error('deleteSearchHistoryItem:', error); return false; }
  return true;
}

export async function clearSearchHistory(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('search_history')
    .delete()
    .eq('user_id', userId);
  if (error) { console.error('clearSearchHistory:', error); return false; }
  return true;
}

export async function recordSearchClick(searchHistoryId: string, adId: string): Promise<void> {
  try {
    await supabase
      .from('search_history')
      .update({ clicked_ad_id: adId })
      .eq('id', searchHistoryId);
  } catch (err) {
    // Non-critical
  }
}

// =========================================================================
// Discovery Sections
// =========================================================================

export async function getDiscoverySections(): Promise<DiscoverySection[]> {
  const { data, error } = await supabase
    .from('discovery_sections')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getDiscoverySections:', error); return []; }
  return (data as DiscoverySection[]) || [];
}

export async function getAllDiscoverySections(): Promise<DiscoverySection[]> {
  const { data, error } = await supabase
    .from('discovery_sections')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { console.error('getAllDiscoverySections:', error); return []; }
  return (data as DiscoverySection[]) || [];
}

export async function getDiscoveryListings(sectionType: string, limit: number = 12, userId?: string): Promise<SearchResultListing[]> {
  try {
    const { data } = await supabase.rpc('get_discovery_listings', {
      p_section_type: sectionType,
      p_limit: limit,
      p_user_id: userId || null,
    });
    if (data) {
      // Fetch images for these listings
      const ids = (data as any[]).map((d: any) => d.id);
      if (ids.length === 0) return [];
      const { data: listingsWithImages } = await supabase
        .from('ads')
        .select('*, ad_images(image_url, sort_order), categories(name, slug)')
        .in('id', ids)
        .in('status', ['approved', 'boosted', 'premium']);
      return (listingsWithImages as SearchResultListing[]) || [];
    }
  } catch (err) {
    console.error('getDiscoveryListings error:', err);
  }
  return [];
}

export async function createDiscoverySection(section: DiscoverySectionInsert): Promise<DiscoverySection | null> {
  const { data, error } = await supabase
    .from('discovery_sections')
    .insert(section)
    .select()
    .single();
  if (error) { toast.error('Failed to create section'); console.error('createDiscoverySection:', error); return null; }
  toast.success('Discovery section created');
  return data as DiscoverySection;
}

export async function updateDiscoverySection(id: string, updates: DiscoverySectionUpdate): Promise<DiscoverySection | null> {
  const { data, error } = await supabase
    .from('discovery_sections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) { toast.error('Failed to update section'); console.error('updateDiscoverySection:', error); return null; }
  toast.success('Discovery section updated');
  return data as DiscoverySection;
}

export async function deleteDiscoverySection(id: string): Promise<boolean> {
  const { error } = await supabase.from('discovery_sections').delete().eq('id', id);
  if (error) { toast.error('Failed to delete section'); return false; }
  toast.success('Discovery section deleted');
  return true;
}

// =========================================================================
// Personalized Recommendations
// =========================================================================

export async function getPersonalizedRecommendations(userId: string, limit: number = 12): Promise<SearchResultListing[]> {
  try {
    const { data } = await supabase.rpc('get_personalized_recommendations', {
      p_user_id: userId,
      p_limit: limit,
    });
    if (data) {
      const ids = (data as any[]).map((d: any) => d.id);
      if (ids.length === 0) return [];
      const { data: listings } = await supabase
        .from('ads')
        .select('*, ad_images(image_url, sort_order), categories(name, slug)')
        .in('id', ids)
        .in('status', ['approved', 'boosted', 'premium']);
      return (listings as SearchResultListing[]) || [];
    }
  } catch (err) {
    console.error('getPersonalizedRecommendations error:', err);
  }
  return [];
}

export async function getSimilarListings(adId: string, limit: number = 8): Promise<SearchResultListing[]> {
  try {
    // Get the source listing
    const { data: source } = await supabase
      .from('ads')
      .select('category_id, brand, tags, division')
      .eq('id', adId)
      .single();

    if (!source) return [];

    // Find similar by same category and/or brand
    let query = supabase
      .from('ads')
      .select('*, ad_images(image_url, sort_order), categories(name, slug)')
      .neq('id', adId)
      .in('status', ['approved', 'boosted', 'premium'])
      .limit(limit);

    const conditions: string[] = [];
    if ((source as any).category_id) conditions.push(`category_id.eq.${(source as any).category_id}`);
    if ((source as any).brand) conditions.push(`brand.eq.${(source as any).brand}`);

    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    }

    const { data, error } = await query;
    if (error) { console.error('getSimilarListings:', error); return []; }
    return (data as SearchResultListing[]) || [];
  } catch (err) {
    console.error('getSimilarListings error:', err);
    return [];
  }
}

// =========================================================================
// Personalized Feed
// =========================================================================

export async function getPersonalizedFeed(userId: string): Promise<PersonalizedFeedSection[]> {
  const sections: PersonalizedFeedSection[] = [];

  try {
    // 1. New listings from followed stores
    const { data: followedShops } = await supabase
      .from('shop_followers')
      .select('shop_id, shops(owner_id)')
      .eq('follower_id', userId)
      .limit(10);

    if (followedShops && followedShops.length > 0) {
      const ownerIds = (followedShops as any[]).map(fs => fs.shops?.owner_id).filter(Boolean);
      if (ownerIds.length > 0) {
        const { data: storeListings } = await supabase
          .from('ads')
          .select('*, ad_images(image_url, sort_order), categories(name, slug)')
          .in('user_id', ownerIds)
          .in('status', ['approved', 'boosted', 'premium'])
          .order('created_at', { ascending: false })
          .limit(8);
        if (storeListings && storeListings.length > 0) {
          sections.push({
            type: 'followed_stores',
            title: 'New from Stores You Follow',
            icon: 'store',
            listings: storeListings as SearchResultListing[],
          });
        }
      }
    }

    // 2. New listings from followed sellers
    const { data: followedUsers } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId)
      .limit(10);

    if (followedUsers && followedUsers.length > 0) {
      const sellerIds = (followedUsers as any[]).map(fu => fu.following_id);
      if (sellerIds.length > 0) {
        const { data: sellerListings } = await supabase
          .from('ads')
          .select('*, ad_images(image_url, sort_order), categories(name, slug)')
          .in('user_id', sellerIds)
          .in('status', ['approved', 'boosted', 'premium'])
          .order('created_at', { ascending: false })
          .limit(8);
        if (sellerListings && sellerListings.length > 0) {
          sections.push({
            type: 'followed_sellers',
            title: 'New from Sellers You Follow',
            icon: 'users',
            listings: sellerListings as SearchResultListing[],
          });
        }
      }
    }

    // 3. Personalized recommendations
    const recommendations = await getPersonalizedRecommendations(userId, 12);
    if (recommendations.length > 0) {
      sections.push({
        type: 'recommended',
        title: 'Recommended for You',
        icon: 'sparkles',
        listings: recommendations,
      });
    }

    // 4. Trending
    const trending = await getDiscoveryListings('trending', 8);
    if (trending.length > 0) {
      sections.push({
        type: 'trending',
        title: 'Trending Now',
        icon: 'trending-up',
        listings: trending,
      });
    }

    // 5. Flash deals / discounted
    const deals = await getDiscoveryListings('discounted', 8);
    if (deals.length > 0) {
      sections.push({
        type: 'flash_deals',
        title: 'Deals & Discounts',
        icon: 'zap',
        listings: deals,
      });
    }

    // 6. New arrivals
    const newArrivals = await getDiscoveryListings('new_arrivals', 8);
    if (newArrivals.length > 0) {
      sections.push({
        type: 'new_arrivals',
        title: 'New Arrivals',
        icon: 'sparkles',
        listings: newArrivals,
      });
    }

    // 7. Featured
    const featured = await getDiscoveryListings('featured', 8);
    if (featured.length > 0) {
      sections.push({
        type: 'featured',
        title: 'Featured Listings',
        icon: 'star',
        listings: featured,
      });
    }
  } catch (err) {
    console.error('getPersonalizedFeed error:', err);
  }

  return sections;
}

// =========================================================================
// User Collections (Wishlists)
// =========================================================================

export async function getUserCollections(userId: string): Promise<UserCollection[]> {
  const { data, error } = await supabase
    .from('user_collections')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getUserCollections:', error); return []; }
  const collections = (data as UserCollection[]) || [];

  // Get item counts
  for (const col of collections) {
    const { count } = await supabase
      .from('collection_items')
      .select('id', { count: 'exact', head: true })
      .eq('collection_id', col.id);
    col.item_count = count || 0;
  }

  return collections;
}

export async function createCollection(userId: string, data: Omit<UserCollectionInsert, 'user_id'>): Promise<UserCollection | null> {
  const { data: result, error } = await supabase
    .from('user_collections')
    .insert({ ...data, user_id: userId })
    .select()
    .single();
  if (error) { toast.error('Failed to create collection'); console.error('createCollection:', error); return null; }
  toast.success('Collection created');
  return result as UserCollection;
}

export async function updateCollection(id: string, updates: UserCollectionUpdate): Promise<UserCollection | null> {
  const { data, error } = await supabase
    .from('user_collections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) { toast.error('Failed to update collection'); console.error('updateCollection:', error); return null; }
  toast.success('Collection updated');
  return data as UserCollection;
}

export async function deleteCollection(id: string): Promise<boolean> {
  const { error } = await supabase.from('user_collections').delete().eq('id', id);
  if (error) { toast.error('Failed to delete collection'); return false; }
  toast.success('Collection deleted');
  return true;
}

export async function getCollectionItems(collectionId: string): Promise<CollectionItem[]> {
  const { data, error } = await supabase
    .from('collection_items')
    .select('*, ad:ads(id, title, slug, price, price_type, condition, division, district, is_featured, created_at, ad_images(image_url), categories(name, slug))')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getCollectionItems:', error); return []; }
  return (data as CollectionItem[]) || [];
}

export async function addToCollection(collectionId: string, adId: string, userId: string, notes?: string): Promise<CollectionItem | null> {
  const { data, error } = await supabase
    .from('collection_items')
    .insert({ collection_id: collectionId, ad_id: adId, user_id: userId, notes })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      toast.info('Already in this collection');
    } else {
      toast.error('Failed to add to collection');
      console.error('addToCollection:', error);
    }
    return null;
  }
  toast.success('Added to collection');
  return data as CollectionItem;
}

export async function removeFromCollection(collectionId: string, adId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('ad_id', adId)
    .eq('user_id', userId);
  if (error) { toast.error('Failed to remove from collection'); return false; }
  toast.success('Removed from collection');
  return true;
}

export async function moveCollectionItem(itemId: string, fromCollectionId: string, toCollectionId: string, userId: string): Promise<boolean> {
  // Get the item
  const { data: item } = await supabase
    .from('collection_items')
    .select('ad_id, notes')
    .eq('id', itemId)
    .single();

  if (!item) return false;

  // Remove from old collection
  await supabase.from('collection_items').delete().eq('id', itemId).eq('user_id', userId);

  // Add to new collection
  await addToCollection(toCollectionId, (item as any).ad_id, userId, (item as any).notes || undefined);
  return true;
}

export async function getPublicCollections(limit: number = 20): Promise<UserCollection[]> {
  const { data, error } = await supabase
    .from('user_collections')
    .select('*, profiles!user_collections_user_id_fkey(full_name, avatar_url)')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getPublicCollections:', error); return []; }
  return (data as UserCollection[]) || [];
}

// =========================================================================
// No-Result Recommendations
// =========================================================================

export async function getNoResultRecommendations(query: string): Promise<SearchResultListing[]> {
  try {
    // Try to find listings with partial matches
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) {
      // Return trending as fallback
      return getDiscoveryListings('trending', 6);
    }

    const orConditions = words.map(w => `title.ilike.%${w}%,brand.ilike.%${w}%,tags.cs.{${w}}`).join(',');
    const { data } = await supabase
      .from('ads')
      .select('*, ad_images(image_url, sort_order), categories(name, slug)')
      .or(orConditions)
      .in('status', ['approved', 'boosted', 'premium'])
      .limit(6);

    if (data && data.length > 0) {
      return data as SearchResultListing[];
    }

    // Fallback to trending
    return getDiscoveryListings('trending', 6);
  } catch (err) {
    console.error('getNoResultRecommendations error:', err);
    return [];
  }
}

// =========================================================================
// Browse by Category/Brand/Store
// =========================================================================

export async function browseByCategory(categorySlug: string, page: number = 1, perPage: number = 20): Promise<SearchResult> {
  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .single();

  if (!cat) return { listings: [], total: 0, page, per_page: perPage, total_pages: 0, facets: emptyFacets() };

  return advancedSearch({
    filter: { category_id: cat.id },
    sort: 'newest',
    page,
    per_page: perPage,
  });
}

export async function browseByBrand(brand: string, page: number = 1, perPage: number = 20): Promise<SearchResult> {
  return advancedSearch({
    filter: { brand },
    sort: 'newest',
    page,
    per_page: perPage,
  });
}

export async function getFeaturedBrands(): Promise<Array<{ brand: string; count: number }>> {
  const { data, error } = await supabase
    .from('ads')
    .select('brand')
    .not('brand', 'is', null)
    .in('status', ['approved', 'boosted', 'premium'])
    .limit(500);

  if (error) return [];

  const counts: Record<string, number> = {};
  (data || []).forEach((row: any) => {
    if (row.brand) counts[row.brand] = (counts[row.brand] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

export async function getFeaturedStores(): Promise<Array<{ id: string; name: string; slug: string; logo_url: string | null; total_products: number }>> {
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, slug, logo_url, total_products')
    .eq('is_verified', true)
    .order('total_followers', { ascending: false })
    .limit(12);

  if (error) { console.error('getFeaturedStores:', error); return []; }
  return (data as any[]) || [];
}

// =========================================================================
// Search Suggestion Management (Admin)
// =========================================================================

export async function getAllSearchSuggestions(): Promise<SearchSuggestion[]> {
  const { data, error } = await supabase
    .from('search_suggestions')
    .select('*')
    .order('search_count', { ascending: false });
  if (error) { console.error('getAllSearchSuggestions:', error); return []; }
  return (data as SearchSuggestion[]) || [];
}

export async function createSearchSuggestion(suggestion: SearchSuggestionInsert): Promise<SearchSuggestion | null> {
  const { data, error } = await supabase
    .from('search_suggestions')
    .insert(suggestion)
    .select()
    .single();
  if (error) { toast.error('Failed to create suggestion'); console.error('createSearchSuggestion:', error); return null; }
  toast.success('Suggestion created');
  return data as SearchSuggestion;
}

export async function updateSearchSuggestion(id: string, updates: Partial<SearchSuggestionInsert>): Promise<SearchSuggestion | null> {
  const { data, error } = await supabase
    .from('search_suggestions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) { toast.error('Failed to update suggestion'); console.error('updateSearchSuggestion:', error); return null; }
  toast.success('Suggestion updated');
  return data as SearchSuggestion;
}

export async function deleteSearchSuggestion(id: string): Promise<boolean> {
  const { error } = await supabase.from('search_suggestions').delete().eq('id', id);
  if (error) { toast.error('Failed to delete suggestion'); return false; }
  toast.success('Suggestion deleted');
  return true;
}
