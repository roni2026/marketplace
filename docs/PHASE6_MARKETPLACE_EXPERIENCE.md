# Phase 6 — Marketplace Experience

## Overview

Phase 6 implements a comprehensive Marketplace Experience system for BazarBD. It extends the existing favorites, follows, compare, saved searches, and reporting features with: extended favorites (sellers/stores/brands/categories), seller blocking, hidden listings, category following, QR code sharing, enhanced reporting (listing + seller), sponsored listings, user activity tracking, engagement statistics, user preferences, and privacy controls.

## Architecture

### Database Migration

**File:** `supabase/schema_v6_marketplace_experience.sql`

Run this migration after all previous migrations.

### New Enums

| Enum | Values |
|------|--------|
| `favorite_entity_type` | listing, seller, store, brand, category |
| `activity_type` | 23 values covering all user interactions |
| `report_target_type` | listing, seller |
| `sponsored_placement` | search_results, category_page, homepage, discovery |

### New Tables

| Table | Purpose |
|-------|---------|
| `user_favorites` | Extended favorites for listings, sellers, stores, brands, categories |
| `blocked_users` | Seller blocking with reason tracking |
| `hidden_listings` | User-hidden listings with reason |
| `category_followers` | Category following with notification preferences |
| `seller_reports` | Seller-specific reports separate from listing reports |
| `sponsored_listings` | Sponsored listing placements with budget/impression tracking |
| `user_activity` | User activity tracking (views, favorites, shares, follows, etc.) |
| `qr_code_scans` | QR code scan tracking per listing |
| `user_preferences` | User notification and privacy preferences |
| `recently_viewed` | Server-side recently viewed tracking |

### Database Functions

| Function | Purpose |
|----------|---------|
| `record_user_activity()` | Insert a user activity record |
| `record_recently_viewed()` | Upsert a recently viewed record |
| `get_sponsored_listings()` | Fetch active sponsored listings by placement |

## Frontend Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/integrations/supabase/types_v6_marketplace.ts` | TypeScript types + report reason constants |
| `src/lib/marketplaceExperience.ts` | Core library: favorites, blocking, hiding, category follows, reports, sponsored, activity, preferences, sharing, QR codes |
| `src/hooks/useMarketplaceExperience.ts` | React hook wrapping all marketplace experience functions |
| `src/components/marketplace/ShareDialog.tsx` | Share dialog with social platforms and QR code |
| `src/components/marketplace/ReportDialog.tsx` | Report dialog for listings and sellers |
| `src/pages/UserPreferences.tsx` | User preferences and privacy controls |
| `src/pages/BlockedSellers.tsx` | Blocked sellers management |
| `src/pages/HiddenListings.tsx` | Hidden listings management |
| `src/pages/UserActivity.tsx` | User activity history |
| `src/pages/admin/SponsoredListings.tsx` | Admin sponsored listings management |
| `src/pages/admin/SellerReports.tsx` | Admin seller report review |
| `src/lib/__tests__/marketplaceExperience.test.ts` | Tests for share URLs, QR codes, report reasons |
| `src/integrations/supabase/__tests__/types_v6_marketplace.test.ts` | Tests for type definitions |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Added routes for /preferences, /blocked-sellers, /hidden-listings, /activity, /admin/sponsored-listings, /admin/seller-reports |
| `src/components/admin/AdminLayout.tsx` | Added "Sponsored Listings" and "Seller Reports" nav items |

### Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/preferences` | Authenticated | User notification and privacy preferences |
| `/blocked-sellers` | Authenticated | Manage blocked sellers |
| `/hidden-listings` | Authenticated | Manage hidden listings |
| `/activity` | Authenticated | View activity history |
| `/admin/sponsored-listings` | Admin | Manage sponsored listings |
| `/admin/seller-reports` | Admin | Review seller reports |

## Features

### Wishlist (via Phase 5 Collections)

The existing Phase 5 Collections system provides: multiple wishlists, create/rename/delete, move items between collections, public/private visibility, share, and item counts.

### Favorites

- **Listings**: via existing `favorites` table + new `user_favorites` table
- **Sellers**: favorite sellers with quick toggle
- **Stores**: favorite stores
- **Brands**: favorite brands
- **Categories**: favorite categories
- Favorite counter and recently favorited tracking

### Saved Searches

Existing Phase 1+ saved searches with: save/rename/delete/edit, notification toggle, unlimited saved searches.

### Recently Viewed

- Client-side localStorage tracking (existing)
- Server-side tracking via `recently_viewed` table
- Remove individual items
- Clear history
- Resume browsing

### Compare Products

Existing compare system with: up to 4 products, side-by-side comparison, remove products, price/brand/model/condition/category/seller comparison.

### Follow Sellers

Existing `user_follows` table + `seller_followers` table for following/unfollowing sellers.

### Follow Stores

Existing `shop_followers` table for following/unfollowing stores.

### Follow Categories

New `category_followers` table with notification preferences for new listings.

### Sharing

- Copy Link, QR Code, WhatsApp, Facebook, Messenger, X (Twitter), Telegram, Email, SMS, Native share
- QR code generation, download, and print
- Share tracking via user activity

### QR Code Sharing

- Generate unique QR codes for every listing
- Download QR code as image
- Print QR code
- Scan tracking via `qr_code_scans` table

### Listing Actions

Save, favorite, share, copy link, print, open seller profile, visit store, contact seller, report listing, block seller.

### Reporting System

- **Listing reports**: 13 reason codes (prohibited item, counterfeit, scam, misleading, incorrect category, duplicate, stolen, inappropriate, offensive, spam, wrong price, fake images, other)
- **Seller reports**: 8 reason codes (fraud, fake products, harassment, abuse, spam, policy violations, counterfeit goods, other misconduct)
- Custom comments, screenshot uploads, status tracking, admin review queue

### Seller Blocking

Block/unblock sellers, hide blocked sellers' listings, stop messages, manage blocked list.

### Hidden Listings

Hide/unhide listings, manage hidden listings list.

### Sponsored Listings

- Placements: search results, category pages, homepage, discovery
- Configurable promotion periods, priority, budget tracking
- Impression and click tracking
- Admin management interface

### User Activity Tracking

23 activity types: views, favorites, shares, comparisons, follows, hides, blocks, reports, wishlist actions, QR scans, contact seller, store visits, saved searches.

### Engagement Statistics

Per-listing: views, unique visitors, wishlist count, favorite count, share count, compare count, QR code scans, contact seller clicks, store visits.

### Privacy & User Controls

- Clear recently viewed history
- Manage wishlist privacy
- Manage followed sellers and stores
- Manage blocked sellers
- Manage hidden listings
- Control notification preferences (8 toggles)
- Control privacy settings (activity tracking, public collections, recently viewed)
- Default wishlist visibility setting

## Future Expansion

The architecture supports:
- Public user profiles
- Community reviews
- Product discussions
- Live shopping events
- Livestream product showcases
- Referral and affiliate sharing
- Rewards and loyalty programs
- Gamification and achievement badges
- Personalized marketplace activity feed
