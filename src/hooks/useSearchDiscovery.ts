/**
 * Phase 5 — Advanced Search & Discovery Hook
 *
 * Reactive wrapper for all Phase 5 search and discovery features:
 * - Advanced search with filtering, sorting, pagination
 * - Autocomplete suggestions
 * - Search history
 * - Discovery sections
 * - Personalized feed and recommendations
 * - User collections (wishlists)
 * - Search analytics
 * - Browse by category/brand/store
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  advancedSearch, getAutocompleteSuggestions, getTrendingSuggestions,
  getSearchHistory, deleteSearchHistoryItem, clearSearchHistory,
  getDiscoverySections, getDiscoveryListings, getAllDiscoverySections,
  createDiscoverySection, updateDiscoverySection, deleteDiscoverySection,
  getPersonalizedRecommendations, getPersonalizedFeed, getSimilarListings,
  getUserCollections, createCollection, updateCollection, deleteCollection,
  getCollectionItems, addToCollection, removeFromCollection, moveCollectionItem,
  getPublicCollections, getNoResultRecommendations,
  browseByCategory, browseByBrand, getFeaturedBrands, getFeaturedStores,
  getSearchAnalytics, getAllSearchSuggestions, createSearchSuggestion,
  updateSearchSuggestion, deleteSearchSuggestion,
  expandQuery, highlightKeyword,
} from '@/lib/searchDiscovery';
import type {
  SearchHistoryRecord, SearchSuggestion, SearchSuggestionInsert,
  SearchAnalyticsSummary, UserCollection, UserCollectionInsert, UserCollectionUpdate,
  CollectionItem, DiscoverySection, DiscoverySectionInsert, DiscoverySectionUpdate,
  AdvancedSearchFilter, SearchSortOption, SearchQueryParams, SearchResult,
  AutocompleteSuggestion, PersonalizedFeedSection, SearchResultListing,
} from '@/integrations/supabase/types_v5_search';

export function useSearchDiscovery() {
  const { user } = useAuth();

  // State
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryRecord[]>([]);
  const [discoverySections, setDiscoverySections] = useState<DiscoverySection[]>([]);
  const [allDiscoverySections, setAllDiscoverySections] = useState<DiscoverySection[]>([]);
  const [personalizedFeed, setPersonalizedFeed] = useState<PersonalizedFeedSection[]>([]);
  const [recommendations, setRecommendations] = useState<SearchResultListing[]>([]);
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [featuredBrands, setFeaturedBrands] = useState<Array<{ brand: string; count: number }>>([]);
  const [featuredStores, setFeaturedStores] = useState<Array<{ id: string; name: string; slug: string; logo_url: string | null; total_products: number }>>([]);
  const [analytics, setAnalytics] = useState<SearchAnalyticsSummary | null>(null);
  const [allSuggestions, setAllSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search
  const search = useCallback(async (params: SearchQueryParams): Promise<SearchResult> => {
    setIsSearching(true);
    setError(null);
    try {
      const result = await advancedSearch(params);
      setSearchResults(result);
      return result;
    } catch (err) {
      setError('Search failed');
      console.error('search error:', err);
      return { listings: [], total: 0, page: params.page, per_page: params.per_page, total_pages: 0, facets: { categories: [], brands: [], conditions: [], listing_types: [], price_range: { min: 0, max: 0 }, divisions: [] } };
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced autocomplete
  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const data = await getAutocompleteSuggestions(query, user?.id);
      setSuggestions(data);
    }, 200);
  }, [user]);

  const fetchTrending = useCallback(async () => {
    const data = await getTrendingSuggestions();
    setSuggestions(data);
  }, []);

  // Search History
  const fetchSearchHistory = useCallback(async () => {
    if (!user) return;
    const data = await getSearchHistory(user.id);
    setSearchHistory(data);
  }, [user]);

  const handleDeleteHistoryItem = useCallback(async (id: string) => {
    if (!user) return;
    const success = await deleteSearchHistoryItem(id, user.id);
    if (success) setSearchHistory(prev => prev.filter(h => h.id !== id));
  }, [user]);

  const handleClearHistory = useCallback(async () => {
    if (!user) return;
    const success = await clearSearchHistory(user.id);
    if (success) setSearchHistory([]);
  }, [user]);

  // Discovery
  const fetchDiscoverySections = useCallback(async () => {
    const data = await getDiscoverySections();
    setDiscoverySections(data);
  }, []);

  const fetchAllDiscoverySections = useCallback(async () => {
    const data = await getAllDiscoverySections();
    setAllDiscoverySections(data);
  }, []);

  const fetchDiscoveryListings = useCallback(async (sectionType: string, limit?: number): Promise<SearchResultListing[]> => {
    return getDiscoveryListings(sectionType, limit, user?.id);
  }, [user]);

  // Personalized
  const fetchPersonalizedFeed = useCallback(async () => {
    if (!user) return;
    const data = await getPersonalizedFeed(user.id);
    setPersonalizedFeed(data);
  }, [user]);

  const fetchRecommendations = useCallback(async (limit?: number) => {
    if (!user) return;
    const data = await getPersonalizedRecommendations(user.id, limit);
    setRecommendations(data);
  }, [user]);

  const fetchSimilarListings = useCallback(async (adId: string, limit?: number): Promise<SearchResultListing[]> => {
    return getSimilarListings(adId, limit);
  }, []);

  // Collections
  const fetchCollections = useCallback(async () => {
    if (!user) return;
    const data = await getUserCollections(user.id);
    setCollections(data);
  }, [user]);

  const handleCreateCollection = useCallback(async (data: Omit<UserCollectionInsert, 'user_id'>): Promise<UserCollection | null> => {
    if (!user) return null;
    const result = await createCollection(user.id, data);
    if (result) setCollections(prev => [...prev, result]);
    return result;
  }, [user]);

  const handleUpdateCollection = useCallback(async (id: string, updates: UserCollectionUpdate): Promise<UserCollection | null> => {
    const result = await updateCollection(id, updates);
    if (result) setCollections(prev => prev.map(c => c.id === id ? result : c));
    return result;
  }, []);

  const handleDeleteCollection = useCallback(async (id: string): Promise<boolean> => {
    const success = await deleteCollection(id);
    if (success) setCollections(prev => prev.filter(c => c.id !== id));
    return success;
  }, []);

  const fetchCollectionItems = useCallback(async (collectionId: string) => {
    const data = await getCollectionItems(collectionId);
    setCollectionItems(data);
  }, []);

  const handleAddToCollection = useCallback(async (collectionId: string, adId: string, notes?: string): Promise<CollectionItem | null> => {
    if (!user) return null;
    const result = await addToCollection(collectionId, adId, user.id, notes);
    return result;
  }, [user]);

  const handleRemoveFromCollection = useCallback(async (collectionId: string, adId: string): Promise<boolean> => {
    if (!user) return false;
    const success = await removeFromCollection(collectionId, adId, user.id);
    if (success) setCollectionItems(prev => prev.filter(i => i.ad_id !== adId));
    return success;
  }, [user]);

  const handleMoveItem = useCallback(async (itemId: string, fromId: string, toId: string): Promise<boolean> => {
    if (!user) return false;
    return moveCollectionItem(itemId, fromId, toId, user.id);
  }, [user]);

  // Browse
  const handleBrowseCategory = useCallback(async (slug: string, page?: number, perPage?: number): Promise<SearchResult> => {
    return browseByCategory(slug, page, perPage);
  }, []);

  const handleBrowseBrand = useCallback(async (brand: string, page?: number, perPage?: number): Promise<SearchResult> => {
    return browseByBrand(brand, page, perPage);
  }, []);

  const fetchFeaturedBrands = useCallback(async () => {
    const data = await getFeaturedBrands();
    setFeaturedBrands(data);
  }, []);

  const fetchFeaturedStores = useCallback(async () => {
    const data = await getFeaturedStores();
    setFeaturedStores(data);
  }, []);

  // No results recommendations
  const handleGetNoResultRecs = useCallback(async (query: string): Promise<SearchResultListing[]> => {
    return getNoResultRecommendations(query);
  }, []);

  // Analytics
  const fetchAnalytics = useCallback(async () => {
    const data = await getSearchAnalytics();
    setAnalytics(data);
  }, []);

  // Admin: Search suggestions
  const fetchAllSuggestions = useCallback(async () => {
    const data = await getAllSearchSuggestions();
    setAllSuggestions(data);
  }, []);

  const handleCreateSuggestion = useCallback(async (data: SearchSuggestionInsert): Promise<SearchSuggestion | null> => {
    const result = await createSearchSuggestion(data);
    if (result) setAllSuggestions(prev => [result, ...prev]);
    return result;
  }, []);

  const handleUpdateSuggestion = useCallback(async (id: string, updates: Partial<SearchSuggestionInsert>): Promise<SearchSuggestion | null> => {
    const result = await updateSearchSuggestion(id, updates);
    if (result) setAllSuggestions(prev => prev.map(s => s.id === id ? result : s));
    return result;
  }, []);

  const handleDeleteSuggestion = useCallback(async (id: string): Promise<boolean> => {
    const success = await deleteSearchSuggestion(id);
    if (success) setAllSuggestions(prev => prev.filter(s => s.id !== id));
    return success;
  }, []);

  // Admin: Discovery section management
  const handleCreateDiscoverySection = useCallback(async (data: DiscoverySectionInsert): Promise<DiscoverySection | null> => {
    const result = await createDiscoverySection(data);
    if (result) setAllDiscoverySections(prev => [...prev, result].sort((a, b) => a.sort_order - b.sort_order));
    return result;
  }, []);

  const handleUpdateDiscoverySection = useCallback(async (id: string, updates: DiscoverySectionUpdate): Promise<DiscoverySection | null> => {
    const result = await updateDiscoverySection(id, updates);
    if (result) setAllDiscoverySections(prev => prev.map(s => s.id === id ? result : s));
    return result;
  }, []);

  const handleDeleteDiscoverySection = useCallback(async (id: string): Promise<boolean> => {
    const success = await deleteDiscoverySection(id);
    if (success) setAllDiscoverySections(prev => prev.filter(s => s.id !== id));
    return success;
  }, []);

  return {
    // State
    searchResults, suggestions, searchHistory, discoverySections, allDiscoverySections,
    personalizedFeed, recommendations, collections, collectionItems,
    featuredBrands, featuredStores, analytics, allSuggestions,
    isLoading, isSearching, error,

    // Search
    search, fetchSuggestions, fetchTrending, expandQuery, highlightKeyword,

    // Search history
    fetchSearchHistory, deleteSearchHistoryItem: handleDeleteHistoryItem, clearSearchHistory: handleClearHistory,

    // Discovery
    fetchDiscoverySections, fetchAllDiscoverySections, fetchDiscoveryListings,

    // Personalized
    fetchPersonalizedFeed, fetchRecommendations, fetchSimilarListings,

    // Collections
    fetchCollections, createCollection: handleCreateCollection, updateCollection: handleUpdateCollection,
    deleteCollection: handleDeleteCollection, fetchCollectionItems,
    addToCollection: handleAddToCollection, removeFromCollection: handleRemoveFromCollection,
    moveCollectionItem: handleMoveItem,

    // Browse
    browseCategory: handleBrowseCategory, browseBrand: handleBrowseBrand,
    fetchFeaturedBrands, fetchFeaturedStores,

    // No results
    getNoResultRecommendations: handleGetNoResultRecs,

    // Analytics
    fetchAnalytics,

    // Admin: Suggestions
    fetchAllSuggestions, createSuggestion: handleCreateSuggestion,
    updateSuggestion: handleUpdateSuggestion, deleteSuggestion: handleDeleteSuggestion,

    // Admin: Discovery sections
    createDiscoverySection: handleCreateDiscoverySection,
    updateDiscoverySection: handleUpdateDiscoverySection,
    deleteDiscoverySection: handleDeleteDiscoverySection,
  };
}
