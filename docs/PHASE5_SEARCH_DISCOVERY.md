# Phase 5 — Advanced Search & Discovery

## Overview

Phase 5 implements a comprehensive Advanced Search & Discovery system for BazarBD. It adds full-text search with fuzzy matching, autocomplete suggestions, search intelligence (synonyms, plurals, typo correction), advanced filtering, discovery sections, personalized recommendations, user collections (wishlists), search analytics, and a personalized feed.

## Architecture

### Database Migration

**File:** `supabase/schema_v5_search_discovery.sql`

Run this migration after all previous migrations (`schema.sql`, `schema_v2_*.sql`, `schema_v3_shops.sql`, `schema_v4_listing_management.sql`).

### New Enums

| Enum | Values |
|------|--------|
| `collection_visibility` | private, public |
| `discovery_section_type` | featured, trending, new_arrivals, recently_viewed, most_viewed, most_favorited, popular_near_you, staff_picks, editors_picks, seasonal_collections, flash_deals, limited_time_offers, recommended_stores, featured_brands, discounted, ending_soon, recently_updated, sponsored |
| `search_entity_type` | listing, category, brand, model, seller, store, tag, location |

### New Tables

| Table | Purpose |
|-------|---------|
| `search_history` | Per-user search history with filters and click tracking |
| `search_suggestions` | Trending/popular search terms with featured/trending flags |
| `search_analytics` | Search performance tracking (results count, response time, click-through) |
| `user_collections` | User wishlists/collections with private/public visibility |
| `collection_items` | Listings saved to collections |
| `discovery_sections` | Configurable discovery sections for the Discovery page |
| `recommendation_cache` | Cached personalized recommendations per user |

### Full-Text Search

- Generated `search_vector` tsvector column on `ads` table (title weight A, description weight B, brand/model weight C, tags weight D)
- GIN index on `search_vector` for fast full-text search
- Trigram indexes (`pg_trgm`) on title, brand, model for fuzzy/partial matching

### Database Functions

| Function | Purpose |
|----------|---------|
| `record_search()` | Track search analytics + increment suggestion count + insert search history |
| `get_search_suggestions()` | Autocomplete suggestions with similarity matching |
| `get_trending_searches()` | Top searches in the last 7 days |
| `get_personalized_recommendations()` | Recommendations based on user favorites and views |
| `get_discovery_listings()` | Listings for a specific discovery section type |

### Seed Data

- 10 default discovery sections (Featured, New Arrivals, Trending, Most Viewed, Most Favorited, Flash Deals, Discounted, Recently Updated, Staff Picks, Featured Brands)
- 12 initial search suggestions (iPhone, Samsung Galaxy, Laptop, Motorcycle, etc.)

## Frontend Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/integrations/supabase/types_v5_search.ts` | TypeScript types for all Phase 5 entities |
| `src/lib/searchDiscovery.ts` | Core search & discovery library (search, autocomplete, history, discovery, recommendations, collections, analytics) |
| `src/hooks/useSearchDiscovery.ts` | React hook wrapping the search discovery library |
| `src/components/search/SearchAutocomplete.tsx` | Reusable autocomplete component with keyboard navigation |
| `src/pages/AdvancedSearch.tsx` | Advanced search page with filters, facets, infinite scroll |
| `src/pages/Discovery.tsx` | Discovery page with curated sections and personalized feed |
| `src/pages/Collections.tsx` | User collections (wishlists) management page |
| `src/pages/admin/SearchAnalytics.tsx` | Admin search analytics, suggestion & discovery section management |
| `src/lib/__tests__/searchDiscovery.test.ts` | Tests for search intelligence logic |
| `src/integrations/supabase/__tests__/types_v5_search.test.ts` | Tests for type definitions |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Added routes for `/search` (AdvancedSearch), `/discover`, `/collections`, `/admin/search-analytics` |
| `src/components/admin/AdminLayout.tsx` | Added "Search & Discovery" nav item |

### Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/search` | Public | Advanced search with filters, facets, infinite scroll |
| `/discover` | Public | Discovery page with curated sections and personalized feed |
| `/collections` | Authenticated | User collections (wishlists) management |
| `/admin/search-analytics` | Admin | Search analytics, suggestion management, discovery section config |

## Features

### Search System

- **Full-text search** across listings, categories, brands, models, sellers, stores, tags, and locations
- **Instant search results** with autocomplete suggestions while typing
- **Keyword highlighting** in search results
- **Partial keyword matching** via trigram indexes
- **Exact phrase search** support
- **Search by SKU**, Product ID, Seller Name, Store Name, Brand, Model, Category, Tag, Location, Condition, Listing ID

### Search Intelligence

- **Synonym matching**: phone↔mobile↔smartphone, laptop↔notebook↔computer, car↔vehicle, bike↔motorcycle, etc.
- **Plural/singular matching**: automatic pluralization and singularization
- **Partial word matching**: trigram-based fuzzy search
- **Search ranking by relevance**: weighted scoring (title > brand > model > tags > description + boost factors)
- **No-result recommendations**: suggests similar listings when search returns 0 results

### Search Suggestions

- Autocomplete suggestions while typing: products, categories, brands, stores, sellers
- Trending searches and popular keywords
- Recent searches (per user)
- Search suggestion management (admin)

### Search History

- View recent searches
- Delete individual searches
- Clear all search history
- Save searches with custom names
- Notification support for saved searches (via existing saved_searches table)

### Browsing

- Browse by categories, subcategories, brands, stores
- Discovery sections: featured, trending, new arrivals, recently viewed, most viewed, most favorited, flash deals, discounted, recently updated, staff picks
- Featured brands and stores

### Filters

- Product: category, subcategory, brand, model, condition, listing type
- Price: range, discount, negotiable
- Availability: listing type, warranty
- Seller: verified, business/individual, store rating, location
- Shipping: free shipping, pickup, delivery, international
- Listing: date listed, recently updated, featured, premium, boosted
- Location: division, district, area

### Sorting

- Best Match, Most Relevant, Newest, Oldest, Lowest Price, Highest Price, Most Popular, Most Viewed, Most Favorited, Best Rated Seller, Nearest, Ending Soon, Recently Updated

### Discovery

- Dedicated discovery page with curated sections
- Flash deals with special styling
- Featured brands grid
- Featured stores carousel
- Browse by category
- Recently viewed section

### Recommendation System

- Based on recently viewed items, favorite categories, favorite brands, favorite stores, saved items
- Similar products
- Products from same seller
- Trending in user's location
- Recently discounted products

### Personalized Feed

- New listings from followed stores
- New listings from followed sellers
- Recently listed in favorite categories
- Recommended products
- Trending products
- Nearby listings
- Recently discounted items
- Featured listings

### User Collections (Wishlists)

- Create multiple custom collections
- Public and private visibility
- Add/remove listings from collections
- Move listings between collections
- Share public collections via link
- Default "Favorites" collection

### Search Analytics (Admin)

- Total searches, unique terms, no-result rate, average results, click-through rate
- Top searches table
- No-result searches table (content gap identification)
- Recent search activity feed
- Search suggestion management (CRUD with featured/trending/active toggles)
- Discovery section management (CRUD with reordering)

### Performance

- Infinite scrolling with IntersectionObserver
- Debounced autocomplete (200ms)
- Search result caching via recommendation_cache table
- GIN indexes for full-text search
- Trigram indexes for fuzzy matching
- Faceted search with aggregated counts

## Future Expansion

The architecture supports:
- Voice search
- Image search
- Barcode/QR code search
- Visual similarity search
- OCR text search
- Multi-language search
- AI-powered semantic search
- Personalized ranking
- Search analytics dashboard (extended)
- Search advertising and promoted results
- Map view with product pins and clustered markers
