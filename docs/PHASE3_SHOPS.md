# Phase 3 — Seller & Shop Membership System

## Overview

Phase 3 implements a comprehensive Seller & Shop Membership System for BazarBD. Every registered user can become an individual seller without creating a shop. Users can upgrade to a Shop Membership to unlock a dedicated branded storefront and advanced selling tools.

## Architecture

### Individual Sellers (Default)

Every registered user can sell without creating a shop. They get:

- List unlimited new and used items (subject to platform limits)
- Manage personal listings (edit, duplicate, archive, renew, delete)
- Track active, sold, pending, and expired listings
- Manage orders and inquiries
- View basic sales and listing statistics
- Receive buyer messages
- Manage shipping and pickup preferences
- Manage payout methods
- View transaction history
- Seller reputation and ratings
- Listing performance insights
- Saved listing drafts
- Listing scheduling
- Vacation mode (hide listings temporarily)

Individual sellers do **not** have:
- Public storefront, shop page, shop URL
- Shop banner, logo, branding
- Shop followers
- Advanced business analytics

### Shop Membership (Professional Sellers)

Users can upgrade to a Shop Membership to unlock:

- Dedicated public shop page with custom URL
- Shop name, logo, banner, and branding
- Business description, contact info, business hours
- Shop location, social media links
- Shop policies (shipping, return, refund, warranty)
- Featured products, product collections, shop categories
- Search within shop
- Customer reviews and shop ratings
- Verified Shop badge, Featured Shop badge
- Shop followers, shareable shop page
- SEO-optimized shop profile

#### Shop Dashboard Features

- Business overview, sales/revenue/profit dashboards
- Order management, inventory management
- Listing analytics, customer analytics, traffic analytics
- Conversion analytics, best-selling products, low stock alerts
- Marketing tools (coupon creation, promotions)
- Staff account management (Business+ tier)
- Bulk product import/export (Business+ tier)
- Store customization, shop announcements
- Vacation mode, saved product templates
- Business/financial/tax reports
- Payout management

#### Shop Verification

- Business verification
- Identity verification (KYC)
- Business license verification (optional)
- Verified Shop badge on approval
- Premium/Featured Shop badge eligibility

## Database Changes

### Migration: `supabase/schema_v3_shops.sql`

Run this migration after all previous migrations (schema.sql, schema_v2_*.sql).

### New Enums

| Enum | Values |
|------|--------|
| `shop_membership_tier` | basic, professional, business, enterprise |
| `shop_verification_status` | pending, under_review, approved, rejected, expired |
| `verification_type` | business, identity_kyc, business_license |
| `shop_coupon_type` | percentage, fixed_amount, free_shipping |
| `payout_method_type` | bank_transfer, mobile_banking, cash_pickup, paypal, stripe |
| `payout_status` | pending, processing, completed, failed, cancelled |
| `transaction_type` | sale, refund, payout, fee, subscription, adjustment |
| `transaction_status` | pending, completed, failed, refunded, disputed |
| `listing_draft_status` | draft, scheduled, published, archived |
| `bulk_job_type` | import, export |
| `bulk_job_status` | queued, processing, completed, failed, partial |
| `staff_role` | owner, manager, staff, viewer |
| `shop_report_period` | daily, weekly, monthly, quarterly, yearly |

### New Tables (22 tables)

1. **`shops`** — Main shop entity with branding, policies, SEO, and stats
2. **`shop_memberships`** — Membership tier per shop
3. **`shop_verifications`** — Verification requests (business, KYC, license)
4. **`shop_followers`** — Shop follow relationships
5. **`shop_collections`** — Curated product collections
6. **`shop_collection_items`** — Products within collections
7. **`shop_categories`** — Seller-defined categories
8. **`shop_coupons`** — Discount coupons
9. **`shop_staff`** — Staff accounts with roles
10. **`shop_analytics`** — Daily analytics aggregate
11. **`shop_reviews`** — Customer reviews for shops
12. **`listing_drafts`** — Saved listing drafts
13. **`listing_schedules`** — Scheduled listing publications
14. **`seller_vacation_modes`** — Vacation mode for individual sellers
15. **`payout_methods`** — Seller payout methods
16. **`transactions`** — All financial transactions
17. **`payouts`** — Payout requests and history
18. **`product_templates`** — Reusable listing templates
19. **`bulk_jobs`** — Bulk import/export job tracking
20. **`shop_announcements`** — Shop-wide announcements
21. **`seller_shipping_preferences`** — Shipping and pickup settings
22. **`listing_performance_insights`** — Per-listing daily performance
23. **`shop_orders`** — Shop order records

### Database Functions

- `count_shop_followers(uuid)` — Get follower count
- `count_shop_products(uuid)` — Get product count
- `calculate_shop_rating(uuid)` — Calculate average rating
- `refresh_shop_stats(uuid)` — Refresh all shop stats
- `update_updated_at_v3()` — Auto-update timestamp trigger
- `is_active_or_owner()` — RLS helper for shop visibility

### RLS Policies

All tables have Row Level Security enabled with policies that:
- Allow public viewing of active shops, collections, categories, coupons, announcements, reviews
- Restrict management operations to shop owners and authorized staff
- Restrict verification review to admins
- Restrict personal data (payouts, transactions, drafts) to owners

## Frontend Changes

### New Pages

| Page | Route | Description |
|------|-------|-------------|
| SellerPortal | `/seller-portal` | Comprehensive seller hub for individual sellers |
| ShopSetup | `/shop-setup` | Multi-step shop creation wizard |
| ShopDashboard | `/shop-dashboard` | Analytics dashboard for shop owners |
| ShopSettings | `/shop-settings` | Shop configuration (general, policies, verification, coupons, etc.) |
| PublicShopPage | `/shop/:slug` | Public-facing shop storefront |
| ShopManagement | `/admin/shops` | Admin shop management |
| ShopVerificationReview | `/admin/shop-verifications` | Admin verification review |

### New Hooks

- `useShop()` — Shop state management (shop data, collections, categories, coupons, etc.)
- `useSellerFeatures()` — Seller features (drafts, schedules, vacation, payouts, transactions, shipping, templates)

### New Library Files

- `src/lib/shop.ts` — Shop CRUD, followers, collections, categories, coupons, announcements, reviews, staff (40 functions)
- `src/lib/sellerMembership.ts` — Listing drafts, schedules, vacation mode, payouts, transactions, shipping, templates, bulk jobs (35 functions)
- `src/lib/shopAnalytics.ts` — Analytics, reports, business overview (13 functions)
- `src/lib/shopVerification.ts` — Verification submission, review, requirements (10 functions)

### New Types

- `src/integrations/supabase/types_v3_shops.ts` — All Phase 3 TypeScript types and membership tier configuration

### Updated Files

- `src/App.tsx` — Added 7 new routes
- `src/components/layout/Header.tsx` — Added Seller Portal link in user dropdown
- `src/components/admin/AdminLayout.tsx` — Added Shops and Shop Verifications in admin sidebar

## Membership Plans

| Tier | Price (৳/mo) | Listing Limit | Key Features |
|------|-------------|---------------|--------------|
| Basic | 0 | 50 | Shop page, URL, branding, basic analytics |
| Professional | 499 | 500 | Advanced analytics, coupons, collections, SEO |
| Business | 1,499 | 5,000 | Staff accounts, bulk import/export, reports, premium badge |
| Enterprise | 4,999 | Unlimited | Unlimited staff, enterprise analytics, API access, priority support |

## Tests

```bash
# Run Phase 3 tests
npx vitest run src/integrations/supabase/__tests__/types_v3_shops.test.ts
npx vitest run src/lib/__tests__/shopVerification.test.ts
npx vitest run src/lib/__tests__/shopAnalytics.test.ts
```

## Running the Migration

```bash
# Apply the migration in Supabase SQL editor or via CLI:
supabase db execute --file supabase/schema_v3_shops.sql
```

## File Summary

### Database
- `supabase/schema_v3_shops.sql` — 22 new tables, enums, functions, RLS policies, indexes, triggers

### TypeScript Types
- `src/integrations/supabase/types_v3_shops.ts` — All Phase 3 types + membership tier config

### Library Functions (98 functions total)
- `src/lib/shop.ts` — 40 functions
- `src/lib/sellerMembership.ts` — 35 functions
- `src/lib/shopAnalytics.ts` — 13 functions
- `src/lib/shopVerification.ts` — 10 functions

### React Hooks
- `src/hooks/useShop.ts`
- `src/hooks/useSellerFeatures.ts`

### Pages (7 new pages)
- `src/pages/SellerPortal.tsx`
- `src/pages/ShopSetup.tsx`
- `src/pages/ShopDashboard.tsx`
- `src/pages/ShopSettings.tsx`
- `src/pages/PublicShopPage.tsx`
- `src/pages/admin/ShopManagement.tsx`
- `src/pages/admin/ShopVerificationReview.tsx`

### Tests (3 test files)
- `src/integrations/supabase/__tests__/types_v3_shops.test.ts`
- `src/lib/__tests__/shopVerification.test.ts`
- `src/lib/__tests__/shopAnalytics.test.ts`

### Documentation
- `docs/PHASE3_SHOPS.md` — This file
