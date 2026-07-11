# Phase 2 — User Profiles & Reputation

## Overview

Phase 2 implements a complete user profile and reputation system for BazarBD, including public profiles, seller/buyer profiles, verification badges, follows, reviews, trust scores, and reputation metrics.

## Database Changes

### Migration: `supabase/schema_v2_profiles.sql`

Run this migration after `schema.sql`, `schema_v2_social.sql`, and `schema_v2_trust.sql`.

#### New Columns on `profiles` Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `banner_url` | text | null | Profile banner image URL |
| `bio` | text | null | User biography |
| `website` | text | null | Personal website URL |
| `social_links` | jsonb | `{}` | Social media links (facebook, twitter, instagram, linkedin, youtube, whatsapp, telegram) |
| `preferred_language` | text | `'en'` | User's preferred language |
| `preferred_currency` | text | `'BDT'` | User's preferred currency |
| `last_active_at` | timestamptz | `now()` | Last activity timestamp (auto-updated via trigger) |
| `response_rate` | numeric | 0 | Percentage of messages responded to |
| `avg_response_time_hours` | numeric | 0 | Average response time in hours |
| `seller_rating` | numeric | 0 | Average seller rating (1-5) |
| `buyer_rating` | numeric | 0 | Average buyer rating (1-5) |
| `total_sales` | int | 0 | Total completed sales |
| `total_purchases` | int | 0 | Total completed purchases |
| `total_followers` | int | 0 | Number of followers |
| `total_following` | int | 0 | Number of users being followed |
| `total_reviews` | int | 0 | Total reviews received |
| `is_public` | boolean | true | Whether profile is publicly visible |

#### New Tables

1. **`verification_badges`** — Stores verification badge types per user
   - Badge types: `email_verified`, `phone_verified`, `id_verified`, `address_verified`, `business_verified`, `premium_seller`, `top_rated`, `trusted_buyer`
   - Unique constraint on `(user_id, badge_type)`

2. **`user_follows`** — General follow system (follower → following)
   - Prevents self-follows via CHECK constraint
   - Unique constraint on `(follower_id, following_id)`

3. **`buyer_reviews`** — Reviews that sellers write about buyers
   - Rating 1-5, title, body, verified transaction flag
   - Links to ad_id for transaction context

4. **`profile_views`** — Analytics for profile page visits
   - Tracks viewer (if authenticated) and timestamp

5. **`profile_stats`** — Denormalized stats cache for performance
   - Updated automatically via triggers and `refresh_profile_stats()` function

#### Database Functions

- `calculate_seller_rating(uuid)` — Average rating from approved reviews
- `calculate_buyer_rating(uuid)` — Average rating from approved buyer reviews
- `count_sales(uuid)` — Count of sold ads
- `count_purchases(uuid)` — Count of accepted offers on sold ads
- `count_followers(uuid)` — Follower count
- `count_following(uuid)` — Following count
- `count_seller_reviews(uuid)` — Approved seller review count
- `count_buyer_reviews(uuid)` — Approved buyer review count
- `refresh_profile_stats(uuid)` — Recalculates and caches all profile stats

#### Triggers

- `trg_update_last_active` — Updates `last_active_at` on session activity
- `trg_refresh_stats_follow_insert` — Auto-refresh stats on new follow
- `trg_refresh_stats_follow_delete` — Auto-refresh stats on unfollow
- `trg_refresh_stats_review_insert` — Auto-refresh stats on new review
- `trg_refresh_stats_buyer_review_insert` — Auto-refresh stats on new buyer review
- `trg_refresh_stats_ad_sold` — Auto-refresh stats when ad status changes to 'sold'

#### Trust Score Calculation

Trust score is a 0-100 value calculated as:
- Base: 50
- Seller rating × 5 (max +25)
- Buyer rating × 2 (max +10)
- Sales count × 0.5 (max +5)
- Follower count × 0.2 (max +5)
- Seller review count × 0.3 (max +5)
- Capped at 100

## Architecture

### TypeScript Types (`src/integrations/supabase/types_v2_profiles.ts`)

- `ExtendedProfile` — Full profile with all Phase 2 fields
- `PublicProfile` — Public-facing profile view with stats and badges
- `VerificationBadge` — Badge record type
- `UserFollow` — Follow relationship type
- `BuyerReview` / `BuyerReviewWithDetails` — Buyer review types
- `ProfileStats` — Cached stats type
- `SocialLinks` — Normalized social links type
- `BadgeType` — Union of all badge types

### Library Layer (`src/lib/profiles.ts`)

All profile-related API operations:

- `getMyProfile(userId)` — Fetch own full profile
- `updateMyProfile(userId, updates)` — Update own profile (with audit logging)
- `getPublicProfile(userId)` — Fetch public profile + stats + badges (records profile view)
- `uploadBanner(userId, file)` — Upload banner to Supabase storage
- `followUser(followerId, followingId)` — Follow a user
- `unfollowUser(followerId, followingId)` — Unfollow a user
- `isFollowing(followerId, followingId)` — Check follow status
- `getFollowers(userId, page, perPage)` — Paginated followers list
- `getFollowing(userId, page, perPage)` — Paginated following list
- `getBadges(userId)` — Get active verification badges
- `requestBadge(userId, badgeType, metadata)` — Request a verification badge
- `createBuyerReview(sellerId, buyerId, rating, title, body, adId?)` — Create buyer review
- `getBuyerReviews(buyerId, page, perPage)` — Get reviews about a buyer
- `getSellerReviews(sellerId, page, perPage)` — Get reviews about a seller
- `getProfileStats(userId)` — Get cached profile stats
- `refreshProfileStats(userId)` — Trigger stats refresh
- `parseSocialLinks(raw)` — Normalize social links object
- `getBadgeInfo(badgeType)` — Get badge display info (label, icon, color)
- `formatResponseTime(hours)` — Format hours to human-readable string
- `formatLastActive(timestamp)` — Format last active timestamp
- `formatMemberSince(timestamp)` — Format member since date

### Hooks

- `useProfile()` — Own profile state, update, banner upload, stats refresh
- `useFollows(targetUserId?)` — Follow/unfollow, followers list, following list
- `useProfileReviews(userId)` — Seller reviews, buyer reviews, review submission

### Components (`src/components/profile/`)

- `ProfileBanner` — Banner image, avatar, name, badges, follow button
- `ProfileStats` — Grid of reputation metrics (rating, sales, followers, trust score, etc.)
- `ProfileReviews` — Tabbed seller/buyer reviews display
- `VerificationBadges` — Badge display with icons and labels
- `TrustScoreBadge` — Color-coded trust score indicator
- `SocialLinks` — Social media link icons
- `FollowButton` — Reusable follow/unfollow button

### Pages

- `Profile.tsx` (updated) — Settings page with tabs:
  - **Profile**: Banner, avatar, name, phone, location, public toggle (existing fields preserved)
  - **About**: Bio, website
  - **Social**: Facebook, Twitter, Instagram, LinkedIn, YouTube, WhatsApp, Telegram
  - **Preferences**: Language, currency
  - **Stats**: Read-only reputation metrics with refresh button
  - Active sessions and danger zone preserved

- `PublicProfile.tsx` (new) — Public profile page at `/user/:userId`:
  - Banner, avatar, name, verification badges
  - Bio, website, social links
  - Full stats grid (seller rating, buyer rating, sales, purchases, followers, following, reviews, trust score, response rate, avg response time)
  - Follow/unfollow button
  - Send message button
  - User's listings grid
  - Tabbed seller/buyer reviews

### Routes

- `/profile` — Own profile settings (authenticated, preserved)
- `/user/:userId` — Public profile view (public)

### Updated Files

- `App.tsx` — Added PublicProfile import and route
- `Header.tsx` — Added "Public Profile" link in user dropdown
- `AdDetails.tsx` — Seller info now links to `/user/:userId`
- `useAuth.tsx` — Extended ProfileData interface and fetch query with new fields; updated profile completion calculation
- `admin/Sellers.tsx` — Shows real seller rating, sales count, trust score; links to public profile
- `i18n/en.json` — 47 new translation keys
- `i18n/bn.json` — 47 new Bangla translations

### Tests

- `src/lib/__tests__/profiles.test.ts` — Unit tests for pure functions (parseSocialLinks, getBadgeInfo, formatResponseTime, formatLastActive, formatMemberSince)
- `src/components/profile/__tests__/TrustScoreBadge.test.tsx` — Component tests for TrustScoreBadge

## Features Implemented

✅ Public profiles (`/user/:userId`)
✅ Seller profile (rating, sales count, listings)
✅ Buyer profile (rating, purchase count)
✅ Verification badges (8 types with icons)
✅ Profile photo and banner upload
✅ Bio (500 char limit)
✅ Join date / Member since
✅ Seller rating (from approved reviews)
✅ Buyer rating (from approved buyer reviews)
✅ Number of sales
✅ Number of purchases
✅ Followers
✅ Following
✅ Reviews (seller + buyer tabs)
✅ Trust score (0-100, weighted calculation)
✅ Response rate
✅ Average response time
✅ Last active (auto-updated via trigger)
✅ Social links (7 platforms)
✅ Preferred language and currency
✅ Profile views analytics (30-day window)
✅ Follow/unfollow system
✅ Auto-refreshing stats via database triggers
✅ Responsive UI (mobile-first, dark mode)
✅ i18n support (English + Bangla)
✅ Admin seller management with real reputation data
✅ Unit tests
✅ Component tests

## Running the Migration

```bash
# Apply the migration in Supabase SQL editor or via CLI:
supabase db execute --file supabase/schema_v2_profiles.sql
```

## Running Tests

```bash
npx vitest run src/lib/__tests__/profiles.test.ts
npx vitest run src/components/profile/__tests__/TrustScoreBadge.test.tsx
```
