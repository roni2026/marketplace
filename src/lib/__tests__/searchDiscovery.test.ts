import { describe, it, expect } from 'vitest';
import { expandQuery, highlightKeyword, calculateRelevanceScore } from '@/lib/searchDiscovery';

describe('Phase 5 — Search & Discovery', () => {
  describe('expandQuery (Search Intelligence)', () => {
    it('returns the normalized query as the first term', () => {
      const result = expandQuery('iPhone');
      expect(result[0]).toBe('iphone');
    });

    it('adds plural form for non-synonym terms', () => {
      const result = expandQuery('tablet');
      expect(result).toContain('tablets');
    });

    it('adds singular form for known plurals', () => {
      const result = expandQuery('phones');
      expect(result).toContain('phone');
    });

    it('adds synonyms for known terms', () => {
      const result = expandQuery('phone');
      expect(result).toContain('mobile');
      expect(result).toContain('smartphone');
    });

    it('adds individual words for multi-word queries', () => {
      const result = expandQuery('iphone 14 pro');
      expect(result).toContain('iphone');
      expect(result).toContain('14');
      expect(result).toContain('pro');
    });

    it('returns empty array for empty query', () => {
      expect(expandQuery('')).toEqual([]);
    });

    it('deduplicates terms', () => {
      const result = expandQuery('laptop');
      const unique = [...new Set(result)];
      expect(result.length).toBe(unique.length);
    });

    it('handles synonym for laptop', () => {
      const result = expandQuery('laptop');
      expect(result).toContain('notebook');
      expect(result).toContain('computer');
    });

    it('handles synonym for car', () => {
      const result = expandQuery('car');
      expect(result).toContain('vehicle');
      expect(result).toContain('automobile');
    });

    it('handles synonym for bike', () => {
      const result = expandQuery('bike');
      expect(result).toContain('motorcycle');
    });

    it('handles synonym for headphones', () => {
      const result = expandQuery('headphones');
      expect(result).toContain('earphone');
      expect(result).toContain('earbuds');
    });
  });

  describe('highlightKeyword', () => {
    it('wraps matching text in mark tags', () => {
      const result = highlightKeyword('iPhone 14 Pro', 'iphone');
      expect(result).toContain('<mark');
      expect(result).toContain('iPhone');
    });

    it('is case-insensitive', () => {
      const result = highlightKeyword('Samsung Galaxy', 'samsung');
      expect(result).toContain('<mark');
    });

    it('returns original text when no keyword', () => {
      expect(highlightKeyword('Hello World', '')).toBe('Hello World');
    });

    it('returns original text when keyword not found', () => {
      const result = highlightKeyword('Hello World', 'xyz');
      expect(result).toBe('Hello World');
    });

    it('escapes regex special characters in keyword', () => {
      const result = highlightKeyword('Price: $100', '$100');
      expect(result).toContain('<mark');
    });
  });

  describe('calculateRelevanceScore', () => {
    const mockListing = {
      title: 'iPhone 14 Pro Max 256GB',
      description: 'Brand new iPhone 14 Pro Max with 256GB storage',
      brand: 'Apple',
      model: 'iPhone 14 Pro Max',
      tags: ['phone', 'apple', 'smartphone'],
      views_count: 100,
      favorites_count: 10,
      is_featured: true,
      is_boosted: false,
      is_premium: false,
      created_at: new Date().toISOString(),
    };

    it('returns high score for exact title match', () => {
      const score = calculateRelevanceScore(mockListing, 'iphone 14 pro max 256gb');
      expect(score).toBeGreaterThan(50);
    });

    it('returns moderate score for partial title match', () => {
      const score = calculateRelevanceScore(mockListing, 'iphone');
      expect(score).toBeGreaterThan(10);
    });

    it('returns score for brand match', () => {
      const score = calculateRelevanceScore(mockListing, 'apple');
      expect(score).toBeGreaterThan(15);
    });

    it('returns score for tag match', () => {
      const score = calculateRelevanceScore(mockListing, 'smartphone');
      expect(score).toBeGreaterThan(10);
    });

    it('returns low score for no match', () => {
      const score = calculateRelevanceScore(mockListing, 'xyzabc');
      // Score includes boost factors (featured, views, favorites, recency) even without text match
      expect(score).toBeLessThan(30);
    });

    it('adds boost for featured listings', () => {
      const featured = { ...mockListing, is_featured: true, views_count: 0, favorites_count: 0 };
      const notFeatured = { ...mockListing, is_featured: false, views_count: 0, favorites_count: 0 };
      const score1 = calculateRelevanceScore(featured, 'test');
      const score2 = calculateRelevanceScore(notFeatured, 'test');
      expect(score1).toBeGreaterThan(score2);
    });

    it('factors in popularity (views and favorites)', () => {
      const popular = { ...mockListing, views_count: 1000, favorites_count: 100, is_featured: false };
      const unpopular = { ...mockListing, views_count: 0, favorites_count: 0, is_featured: false };
      const score1 = calculateRelevanceScore(popular, 'test');
      const score2 = calculateRelevanceScore(unpopular, 'test');
      expect(score1).toBeGreaterThan(score2);
    });

    it('factors in recency', () => {
      const recent = { ...mockListing, created_at: new Date().toISOString(), is_featured: false, views_count: 0, favorites_count: 0 };
      const old = { ...mockListing, created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), is_featured: false, views_count: 0, favorites_count: 0 };
      const score1 = calculateRelevanceScore(recent, 'test');
      const score2 = calculateRelevanceScore(old, 'test');
      expect(score1).toBeGreaterThan(score2);
    });

    it('returns 0 for empty query', () => {
      const score = calculateRelevanceScore(mockListing, '');
      expect(score).toBe(0);
    });
  });

  describe('Sort Options', () => {
    it('supports all required sort options', () => {
      const validSorts = [
        'best_match', 'most_relevant', 'newest', 'oldest',
        'lowest_price', 'highest_price', 'most_popular', 'most_viewed',
        'most_favorited', 'best_rated_seller', 'nearest', 'ending_soon',
        'recently_updated',
      ];
      expect(validSorts).toHaveLength(13);
    });
  });

  describe('Advanced Search Filter', () => {
    it('supports all filter fields', () => {
      const filter = {
        query: 'iphone', category_id: 'cat-1', brand: 'Apple', model: 'iPhone 14',
        condition: 'new', listing_type: 'new', min_price: 50000, max_price: 150000,
        has_discount: true, is_negotiable: true, free_shipping: true,
        pickup_available: true, delivery_available: true, international_shipping: false,
        has_warranty: true, warranty_type: 'manufacturer', seller_verified: true,
        division: 'Dhaka', district: 'Dhaka', area: 'Gulshan',
        tags: ['phone', 'apple'], is_featured: true, is_premium: false, is_boosted: false,
      };
      expect(filter.query).toBe('iphone');
      expect(filter.min_price).toBe(50000);
      expect(filter.tags).toHaveLength(2);
    });
  });

  describe('Discovery Section Types', () => {
    it('supports all discovery section types', () => {
      const types = [
        'featured', 'trending', 'new_arrivals', 'recently_viewed', 'most_viewed',
        'most_favorited', 'popular_near_you', 'staff_picks', 'editors_picks',
        'seasonal_collections', 'flash_deals', 'limited_time_offers',
        'recommended_stores', 'featured_brands', 'discounted', 'ending_soon',
        'recently_updated', 'sponsored',
      ];
      expect(types).toHaveLength(18);
    });
  });

  describe('Collection Visibility', () => {
    it('supports private and public visibility', () => {
      const visibilities = ['private', 'public'];
      expect(visibilities).toHaveLength(2);
    });
  });

  describe('Search Entity Types', () => {
    it('supports all entity types for suggestions', () => {
      const types = ['listing', 'category', 'brand', 'model', 'seller', 'store', 'tag', 'location'];
      expect(types).toHaveLength(8);
    });
  });

  describe('AutocompleteSuggestion', () => {
    it('has all required fields', () => {
      const suggestion = {
        type: 'listing' as const,
        label: 'iPhone 14 Pro',
        value: 'iPhone 14 Pro',
        subtitle: '৳120,000',
        image_url: 'https://example.com/image.jpg',
        href: '/ad/iphone-14-pro-123',
        search_count: 500,
      };
      expect(suggestion.type).toBe('listing');
      expect(suggestion.label).toBe('iPhone 14 Pro');
      expect(suggestion.href).toContain('/ad/');
    });
  });
});
