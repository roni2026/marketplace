# BazarBD — Supabase database schema

Run these files **in numeric order** (01 → 16) in the Supabase SQL Editor (or
via `supabase db execute --file <file>`). Every file is **idempotent** — it can
be re-run safely without throwing `already exists` errors, so it is fine to run
the whole sequence again after a change.

| Order | File | Purpose |
|-------|------|---------|
| 01 | `01_schema.sql` | Core enums, `profiles`, `categories`, ads, roles, base RLS + `handle_new_user` trigger |
| 02 | `02_schema_v2_social.sql` | Messaging/social base tables |
| 03 | `03_schema_v2_profiles.sql` | Extended profile fields, badges, follows |
| 04 | `04_schema_v2_trust.sql` | Reviews, reports, trust & safety |
| 05 | `05_schema_v2_listings.sql` | Listing attributes and extensions |
| 06 | `06_schema_v2_cms.sql` | CMS / content tables |
| 07 | `07_schema_v2_system.sql` | System, logging, settings |
| 08 | `08_schema_v3_shops.sql` | Shops, memberships, staff, coupons |
| 09 | `09_schema_v4_listing_management.sql` | Listing management, discounts |
| 10 | `10_schema_v5_search_discovery.sql` | Full-text search vector + discovery functions |
| 11 | `11_schema_v6_marketplace_experience.sql` | Marketplace experience features |
| 12 | `12_schema_v8_messaging.sql` | Advanced messaging |
| 13 | `13_schema_v13_notifications.sql` | Notifications + realtime publication |
| 14 | `14_schema_v14_admin_portal.sql` | Admin portal |
| 15 | `15_adminaccess.sql` | (Optional) grant an admin role to your user — edit the UID first |
| 16 | `16_fix_permissions.sql` | Grant table access to `anon` / `authenticated` roles |

## Notes

- **Ordering matters.** Later files reference tables, types and columns created
  by earlier ones (e.g. `10_…` adds a search vector to `ads` and uses the
  `discount_percentage` column added in `09_…`), so always run top-to-bottom.
- **Idempotency.** `CREATE TYPE` statements are wrapped in guarded `DO` blocks,
  `CREATE TABLE/INDEX` use `IF NOT EXISTS`, and every policy/trigger is dropped
  before it is re-created. Re-running any file (or the whole set) is safe.
- **`15_adminaccess.sql`** is safe to run as-is: while the placeholder UID is
  unchanged it just prints a notice and does nothing. Replace the UID to grant
  yourself the `super_admin` role, then re-run it.
- The old, **unnumbered** `schema*.sql` files are deprecated pointers only — do
  not run them. The numbered `01…16` files above are the single source of truth.
