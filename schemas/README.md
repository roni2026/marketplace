# BazarBD — Supabase Database Schema (Rebuilt)

This is the **clean, consolidated** set of Supabase schema files for the BazarBD
marketplace. It replaces the old `supabase/` folder which had deprecated duplicate
files and confusing numbering.

## Quick Start

Run these files **in numeric order** (01 → 17) in the Supabase SQL Editor:

```
01_core.sql          → 02_social.sql        → 03_profiles.sql
→ 04_trust_safety.sql → 05_listings.sql      → 06_cms.sql
→ 07_system.sql       → 08_shops.sql         → 09_listing_mgmt.sql
→ 10_search.sql       → 11_marketplace.sql   → 12_messaging.sql
→ 13_notifications.sql → 14_admin_portal.sql → 15_catalog_rbac.sql
→ 16_permissions.sql  → 17_admin_access.sql
```

Every file is **idempotent** — safe to re-run without throwing `already exists` errors.

## File Overview

| Order | File | Purpose | Tables |
|-------|------|---------|--------|
| 01 | `01_core.sql` | Core enums, profiles, categories, ads, roles, base RLS + `handle_new_user` trigger | categories, subcategories, profiles, user_roles, ads, ad_images, favorites, reports, audit_logs, notifications, messages, saved_searches, offers, support_tickets, support_ticket_messages, user_sessions, login_attempts, ad_stats |
| 02 | `02_social.sql` | Social/messaging base tables | message_reactions, message_attachments, quick_replies, auto_responses, conversation_templates, reviews, review_replies, review_helpful, seller_analytics, seller_scores, product_comparisons, recently_sold, price_drops, recommendations, saved_carts, buying_reminders |
| 03 | `03_profiles.sql` | Extended profile fields, badges, follows, profile views/stats | verification_badges, user_follows, buyer_reviews, profile_views, profile_stats (+ ALTER profiles) |
| 04 | `04_trust_safety.sql` | Trust & verification, fraud detection, permissions | business_verifications, address_verifications, seller_verifications, fraud_flags, device_fingerprints, ip_reputation, blacklisted_items, shadow_bans, permission_overrides |
| 05 | `05_listings.sql` | Listing variants, templates, price history, media, locations | listing_variants, listing_templates, price_history, price_drop_alerts, ad_media, ad_locations, regions, cities, media_library, image_optimizations |
| 06 | `06_cms.sql` | CMS, notification preferences, workflow, SEO | notification_preferences, notification_schedule, workflow_rules, workflow_logs, cron_jobs, banners, homepage_sections, landing_pages, faq_entries, blog_posts, static_pages, terms_versions, privacy_versions, seo_settings, redirects, sitemap_entries |
| 07 | `07_system.sql` | System tables, admin tools, API mgmt, monitoring | admin_bookmarks, admin_notes, admin_reminders, admin_impersonation_logs, api_tokens, api_logs, webhooks, error_logs, system_health, email_queue, failed_jobs, backup_history, feature_flags, consent_logs, terms_acceptance, translation_keys, translations, accessibility_settings, scheduled_reports, custom_reports |
| 08 | `08_shops.sql` | Shops, memberships, verification, staff, coupons, analytics, orders, reviews, payouts, transactions | shops, shop_memberships, shop_verifications, shop_followers, shop_collections, shop_collection_items, shop_categories, shop_coupons, shop_staff, shop_analytics, shop_announcements, listing_drafts, listing_schedules, seller_vacation_modes, payout_methods, transactions, payouts, product_templates, bulk_jobs, shop_orders, seller_shipping_preferences, listing_performance_insights, shop_reviews |
| 09 | `09_listing_mgmt.sql` | Listing management, types, attributes, history, analytics, bulk ops | listing_types, item_conditions, category_attributes, listing_history, listing_analytics, bulk_listing_operations (+ ALTER ads) |
| 10 | `10_search.sql` | Search history, suggestions, analytics, collections, discovery, recommendations | search_history, search_suggestions, search_analytics, user_collections, collection_items, discovery_sections, recommendation_cache (+ ALTER ads for search vector) |
| 11 | `11_marketplace.sql` | Marketplace experience: favorites, blocking, hidden listings, activity, sponsored | user_favorites, blocked_users, hidden_listings, category_followers, seller_reports, sponsored_listings, user_activity, qr_code_scans, user_preferences, recently_viewed |
| 12 | `12_messaging.sql` | Advanced messaging: conversations, typing, presence, reports, edit history | conversations, typing_indicators, user_presence, message_reports, message_edit_history, conversation_mute_settings (+ ALTER messages) |
| 13 | `13_notifications.sql` | Full notification system: push, email, SMS, templates, delivery logs, quiet hours | push_subscriptions, email_logs, sms_logs, notifications (extended), quiet_hours, notification_templates, notification_delivery_logs, admin_notifications_v13, notification_summary_queue (+ ALTER notifications) |
| 14 | `14_admin_portal.sql` | Admin portal: dashboard widgets, activity log, health metrics, notifications, bulk ops, preferences | admin_dashboard_widgets, admin_activity_log, system_health_metrics, admin_notifications, admin_bulk_operations, admin_preferences |
| 15 | `15_catalog_rbac.sql` | Brands, product models, admin tab RBAC, customer portal | brands, product_models, admin_tab_catalog, admin_tab_permissions, customer_addresses, customer_recently_viewed, customer_tickets, customer_ticket_messages (+ ALTER ads) |
| 16 | `16_permissions.sql` | Table-level GRANTs for anon/authenticated roles (fixes 403 errors) | (GRANT statements only) |
| 17 | `17_admin_access.sql` | Admin bootstrap, security-definer helpers, RLS on user_roles | (Functions + policies: has_role, is_admin, is_staff, get_my_roles, am_i_admin) |

## Total Stats

- **168 tables**
- **51 enum types**
- **65 functions**
- All with RLS policies and GRANT statements

## Important Notes

### Ordering Matters
Later files reference tables, types, and columns created by earlier files.
Always run top-to-bottom.

### Idempotency
- `CREATE TYPE` statements are wrapped in guarded `DO` blocks
- `CREATE TABLE/INDEX` use `IF NOT EXISTS`
- Every policy/trigger is dropped before re-creation
- Re-running any file (or the whole set) is safe

### Admin Access
`17_admin_access.sql` is safe to run as-is. To actually grant yourself admin:
1. Find your User UID in Supabase Dashboard → Authentication → Users
2. Edit `v_uid` in the file (replace `YOUR-USER-UID-HERE`)
3. Re-run the file in Supabase SQL Editor

### Storage Buckets
Create these via Supabase Dashboard or CLI:
- `ad-images` — public bucket for ad photos
- `avatars` — public bucket for user avatars
- `ad-media` — public bucket for ad images, videos, 360 media
- `media-library` — public bucket for user media library
- `ad-media-v4` — public bucket for Phase 4 listing media with WebP support

### /admin Route
The `/admin` route is a client-side SPA route. For it to work:
1. **Hosting SPA rewrite**: `/* → /index.html` (200) — already configured in `vercel.json`, `netlify.toml`, `render.yaml`, and `public/_redirects`
2. **Supabase RLS**: `user_roles` must be readable by the user themselves — handled in `17_admin_access.sql`
3. **Admin role**: Your user must have `super_admin` or `admin` in `user_roles` — grant via `17_admin_access.sql`
4. **Emergency fallback**: Set `VITE_ADMIN_USER_IDS=<your-uuid>` env var on your hosting platform

## Migration from Old `supabase/` Folder

If you already ran the old `supabase/` schemas, these new files are safe to run
on top — they use the same `IF NOT EXISTS` / `DROP ... IF EXISTS` patterns.
No data will be lost.

The old `supabase/` folder files map to these new files:
- `01_schema.sql` → `01_core.sql`
- `02_schema_v2_social.sql` → `02_social.sql`
- `03_schema_v2_profiles.sql` → `03_profiles.sql`
- `04_schema_v2_trust.sql` → `04_trust_safety.sql`
- `05_schema_v2_listings.sql` → `05_listings.sql`
- `06_schema_v2_cms.sql` → `06_cms.sql`
- `07_schema_v2_system.sql` → `07_system.sql`
- `08_schema_v3_shops.sql` → `08_shops.sql`
- `09_schema_v4_listing_management.sql` → `09_listing_mgmt.sql`
- `10_schema_v5_search_discovery.sql` → `10_search.sql`
- `11_schema_v6_marketplace_experience.sql` → `11_marketplace.sql`
- `12_schema_v8_messaging.sql` → `12_messaging.sql`
- `13_schema_v13_notifications.sql` → `13_notifications.sql`
- `14_schema_v14_admin_portal.sql` → `14_admin_portal.sql`
- `15_adminaccess.sql` + `18_fix_super_admin_access.sql` + `19_admin_bootstrap_and_cloudinary_notes.sql` → `17_admin_access.sql`
- `16_fix_permissions.sql` → `16_permissions.sql`
- `17_schema_v15_catalog_rbac_customer.sql` → `15_catalog_rbac.sql`
