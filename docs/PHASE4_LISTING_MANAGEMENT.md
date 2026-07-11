# Phase 4 — Listing Management

## Overview

Phase 4 implements a comprehensive Listing Management system for BazarBD. It extends the existing marketplace with configurable listing types, dynamic product attributes, detailed condition reporting, advanced pricing, shipping & delivery options, warranty support, complete listing history tracking, analytics, bulk operations, enhanced search & filtering, and seller store integration.

## Architecture

### Database Migration

**File:** `supabase/schema_v4_listing_management.sql`

Run this migration after all previous migrations (`schema.sql`, `schema_v2_listings.sql`, `schema_v3_shops.sql`).

### New Enums

| Enum | Values |
|------|--------|
| `warranty_type` | none, manufacturer, seller |
| `shipping_method` | local_pickup, nationwide, international |
| `shipping_fee_type` | free, flat_rate, calculated |
| `history_action` | created, edited, price_changed, photo_changed, status_changed, renewed, relisted, marked_sold, archived, restored, deleted, duplicated, published, scheduled, paused, resumed, hidden, bulk_updated |
| `attribute_data_type` | text, number, select, multiselect, boolean, date |

### Extended `ad_status` Enum

Added values: `paused`, `hidden`, `archived` (in addition to existing: pending, approved, rejected, sold, expired, draft, boosted, premium)

### New Tables

| Table | Purpose |
|-------|---------|
| `listing_types` | Configurable listing types (admin-managed, no DB changes needed to add/remove) |
| `item_conditions` | Configurable item conditions (admin-managed) |
| `category_attributes` | Dynamic attributes per category (e.g., Storage for Electronics, Size for Fashion) |
| `listing_history` | Complete audit trail of all listing changes |
| `listing_analytics` | Daily aggregated analytics per listing |
| `bulk_listing_operations` | Tracks bulk listing operations (publish, pause, archive, delete, etc.) |

### Extended `ads` Table Columns

| Column | Type | Description |
|--------|------|-------------|
| `listing_type` | text | Type of listing (new, used, refurbished, etc.) |
| `brand` | text | Brand name |
| `model` | text | Model name |
| `tags` | text[] | Searchable tags |
| `rich_description` | text | Extended description |
| `short_description` | text | Brief one-line summary |
| `sku` | text | Stock Keeping Unit (unique per user) |
| `barcode` | text | Product barcode (unique per user) |
| `serial_number` | text | Serial number |
| `mpn` | text | Manufacturer Part Number |
| `original_price` | numeric | Original price for discount display |
| `discount_amount` | numeric | Auto-calculated discount amount |
| `discount_percentage` | numeric | Auto-calculated discount percentage |
| `is_negotiable` | boolean | Whether price is negotiable |
| `min_offer` | numeric | Minimum acceptable offer |
| `currency` | text | Currency code (default BDT) |
| `cover_image_id` | uuid | Reference to cover image |
| `shipping_methods` | shipping_method[] | Array of shipping methods |
| `shipping_fee_type` | shipping_fee_type | Free, flat rate, or calculated |
| `shipping_fee` | numeric | Shipping fee amount |
| `free_shipping` | boolean | Free shipping flag |
| `estimated_delivery_days` | int | Estimated delivery time |
| `handling_time_days` | int | Handling time |
| `delivery_locations` | text[] | Locations where delivery is available |
| `warranty_type` | warranty_type | None, manufacturer, or seller warranty |
| `warranty_duration_months` | int | Warranty duration |
| `warranty_coverage` | text | What the warranty covers |
| `warranty_terms` | text | Warranty terms & conditions |
| `product_attributes` | jsonb | Dynamic attributes based on category |
| `condition_details` | jsonb | Detailed condition information |
| `shop_id` | uuid | Reference to seller's shop |
| `deleted_at` | timestamptz | Soft delete timestamp |
| `renewed_at` | timestamptz | Last renewal timestamp |
| `sold_at` | timestamptz | Sold timestamp |
| `archived_at` | timestamptz | Archive timestamp |

### Database Functions

| Function | Purpose |
|----------|---------|
| `log_listing_history()` | Inserts a history record for a listing action |
| `record_listing_analytics()` | Upserts daily analytics for a listing (views, favorites, shares, etc.) |

### Seed Data

- 9 default listing types (New, Used, Refurbished, Open Box, Handmade, Collectibles, Vintage, Digital Products, Services)
- 11 default item conditions (Brand New through For Parts)
- Category attributes for Electronics (Storage, RAM, Processor, Screen Size, Color)
- Category attributes for Fashion (Size, Material, Gender, Color)
- Category attributes for Vehicles (Year, Mileage, Fuel Type, Transmission)
- Category attributes for Furniture (Material, Dimensions, Weight)

## Frontend Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/integrations/supabase/types_v4_listings.ts` | TypeScript types for all Phase 4 entities |
| `src/lib/listingManagement.ts` | Core listing management library (CRUD, actions, bulk ops, search, validation, analytics) |
| `src/hooks/useListingManagement.ts` | React hook wrapping the listing management library |
| `src/pages/PostAdV4.tsx` | 8-step listing creation/editing wizard |
| `src/pages/SellerListings.tsx` | Comprehensive seller listing management page with bulk operations |
| `src/pages/admin/ListingManagement.tsx` | Admin page for managing listing types, conditions, and category attributes |
| `src/pages/admin/ListingAnalytics.tsx` | Admin analytics page for marketplace-wide listing performance |
| `src/components/listings/ListingDetail.tsx` | Extended listing detail display component |
| `src/lib/__tests__/listingManagement.test.ts` | Tests for listing management logic |
| `src/integrations/supabase/__tests__/types_v4_listings.test.ts` | Tests for type definitions |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Added routes for `/post-ad-v4`, `/seller-listings`, `/admin/listing-management`, `/admin/listing-analytics` |
| `src/components/admin/AdminLayout.tsx` | Added "Listing Management" and "Listing Analytics" nav items |
| `src/pages/AdDetails.tsx` | Integrated `ListingDetail` component for extended listing information |

### Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/post-ad-v4` | Authenticated | Enhanced listing creation wizard (8 steps) |
| `/seller-listings` | Authenticated | Seller listing management with bulk operations |
| `/admin/listing-management` | Admin | Configure listing types, conditions, category attributes |
| `/admin/listing-analytics` | Admin | View marketplace-wide listing analytics |

## Features

### Supported Listing Types

Configurable via admin panel — administrators can add, remove, reorder, activate/deactivate listing types without database changes. Default types: New, Used, Refurbished, Open Box, Handmade, Collectibles, Vintage, Digital Products, Services.

### Listing Media

- Unlimited photos (configurable max, default 10)
- Drag-and-drop uploads with multiple file selection
- Image reordering (up/down buttons)
- Cover image selection (star icon)
- File validation (type, size)
- Image preview thumbnails
- Automatic URL generation for Supabase storage

### Basic Information

All fields supported: title, short description, rich description, brand, model, category, subcategory, tags, item condition, SKU, barcode, serial number, MPN, listing type.

### Product Attributes

Dynamic attributes per category, configurable by admin. Supports data types: text, number, select, multiselect, boolean, date. Attributes can be marked as required and/or filterable.

### Item Condition

Configurable conditions (11 defaults). Detailed condition reporting via `condition_details` JSONB: cosmetic condition, functional condition, missing accessories, repairs, defects, scratches, additional notes.

### Product Variants

Extended variant support with: name, SKU, barcode, serial number, price, stock, attributes, image, availability, sort order.

### Pricing

Selling price, original price (for discount display), auto-calculated discount amount and percentage, negotiable flag, minimum offer, currency selection. Price history tracked via existing `price_history` table.

### Shipping & Delivery

Local pickup, nationwide shipping, international shipping. Shipping fee types: free, flat rate, calculated. Estimated delivery days, handling time, delivery locations.

### Warranty

Three types: none, manufacturer warranty, seller warranty. Includes duration (months), coverage, and terms & conditions.

### Listing Status

Supported: Draft, Pending Review, Active (approved), Scheduled, Paused, Hidden, Sold, Expired, Archived, Rejected, Boosted, Premium.

### Listing Actions

Sellers can: Save Draft, Publish, Schedule Publishing, Edit, Pause, Resume, Hide, Mark as Sold, Renew, Relist Sold, Relist Expired, Duplicate, Archive, Restore, Delete, Share, Copy Link.

### Search & Filtering

Filter by: category, subcategory, brand, model, price range, condition, listing type, seller, location (division/district), tags, date range, text search.

Sort by: newest, oldest, lowest price, highest price, most popular, most viewed, recently updated.

### Seller Store Integration

Each listing displays seller information: name, avatar, verification badge, rating, location, join date, active listings count, followers count. If the seller has a shop, shows store name, logo, and link to storefront. Store policies (shipping, return, refund, warranty) are displayed.

### Listing Analytics

Per-listing analytics: total views, unique visitors, favorites, shares, messages received, contact button clicks, inquiries, listing age. Daily breakdown available.

### Bulk Listing Management

Supported bulk operations: bulk edit, bulk publish, bulk pause, bulk archive, bulk delete, bulk relist, bulk renew, bulk category change, bulk price update, bulk shipping update. Operations are tracked in `bulk_listing_operations` table with success/failure counts.

### Listing History

Complete audit trail: listing created, every edit, price changes, photo changes, status changes, renewals, relists, sold status, archived status, deleted/restored actions. Each record includes timestamp, user, previous value, new value, and field name.

### Validation

Before publishing: required field validation, duplicate listing detection, missing image warning, invalid price validation, invalid category validation, duplicate SKU validation, duplicate barcode validation, unsupported file validation, file size validation.

## Future Expansion

The architecture supports future features without major redesign:
- Video uploads (media_type enum already includes 'video')
- 360° product viewer (media_type enum already includes '360')
- Auctions (extensible via new table)
- Product bundles (extensible via new table)
- Rental listings (extensible via listing_type configuration)
- Multi-language listings (extensible via jsonb fields)
- Multi-currency support (currency field already in place)
- Live selling (extensible via new table)
- Subscription products (extensible via listing_type with is_digital flag)
- Digital product delivery (listing_type with is_digital flag)
- Store inventory synchronization (extensible via existing shop system)
- Cross-platform listing synchronization (extensible via bulk_jobs table)
