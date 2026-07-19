# Phase — Admin Permissions & Universal Ad Search

Adds a professional role-based permission system and a powerful universal admin
ad-search tool. Built on top of the existing RBAC (`user_roles`,
`admin_tab_permissions`, `permission_overrides`) and the immutable
`moderation_actions` audit trail.

## 1. Database migration

Run **`supabase/21_phase20_admin_permissions_ad_search.sql`** in the Supabase SQL
editor (idempotent, safe to re-run). It also lives in the canonical schema set as
`schemas/18_ad_search_rbac.sql`.

It creates:

| Object | Purpose |
|--------|---------|
| Trigram + btree indexes on `ads` / `profiles` | Fast, indexed search (title, slug, phone, email, status, category, created_at). |
| `role_default_permissions` | Backend source of truth for RBAC defaults (mirrors `permissions_v2.ts`). |
| `has_app_permission(uuid, text)` / `can_i(text)` | Backend permission check: super_admin ⇒ true, then per-user override, then role default. |
| `is_super_admin(uuid)` | Strict super-admin check. |
| `search_ads_admin(...)` | Server-side universal search — auto type detection, filters, sorting, pagination. `SECURITY DEFINER`, admin-only. |
| `admin_moderate_ad(ad, action, reason, note)` | Backend-enforced **and** audited moderation (approve / reject / delete / restore / boost). Writes a `moderation_actions` row. |
| RLS tightening | Only **super_admin** may write `permission_overrides` (was admin). |
| `admin_tab_catalog` row `ad_search` | Makes the new tab grantable to limited admins. |

## 2. Role-based admin access control

- **Only Super Admin** can open **Permissions** (`/admin/permissions`) — the route
  is wrapped with `<AdminRoute superAdminOnly>`; everyone else gets **403 Forbidden**.
- `AdminRoute` now enforces per-tab grants for **every** `/admin/*` route: limited
  admins only reach tabs granted in `admin_tab_permissions`; typing a URL directly
  yields a 403 (`src/components/auth/Forbidden.tsx`).
- Backend independently enforces the same rules (RLS + `SECURITY DEFINER` RPCs) —
  hiding UI is never the only guard.
- Every permission / tab change is written to `audit_logs`.

## 3. Universal Ad Search — `/admin/ads/search`

Sidebar: **Ads → Ad Search**. One large search box auto-detects the input:

| Input example | Detected as |
|---------------|-------------|
| `iphone-15-pro-max-128gb` | Listing slug |
| `01912345678` | Seller phone |
| `seller@gmail.com` | Seller email |
| `Galaxy S24` | Title |
| `A123456` | Ad ID |

- **Phone / Email search** return every ad from that number/email regardless of
  status (pending, approved, rejected, expired, deleted/hidden, boosted, draft…),
  newest first.
- **Title search** is partial, case-insensitive, multi-keyword, with trigram typo
  tolerance.
- **Slug search** locates the exact listing immediately.
- Compact enterprise table: thumbnail, ad id, title, category, seller, phone,
  email, price, colored status badge, created, updated, actions (View / Edit /
  Moderate / Audit Log).
- Compact filters: status, category, subcategory, division, district, shop, date
  range, price range, sort — all applied server-side without page reload.
- **Server-side pagination**, 50 / page, filters preserved across pages.
- 300 ms debounced input, sticky search/filter header, sticky table header.

## 4. Ad details drawer

Clicking a row opens a right-side drawer with listing + seller information,
images, description, price, condition, contact details, timeline, current status,
quick moderation actions (permission-gated), and the full **audit log**
(newest first) showing staff name, role, date, time, action, previous → new value
and notes.

## Files

- `src/lib/adSearch.ts` — detection, server search, details, audited moderation.
- `src/pages/admin/AdSearch.tsx` — the search page.
- `src/components/admin/AdDetailsDrawer.tsx` — details + audit-log drawer.
- `src/components/auth/AdminPageGuard.tsx`, `Forbidden.tsx` — 403 enforcement.
- `src/hooks/useMyPermissions.ts` — effective-permission loader for UI gating.
