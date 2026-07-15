# Phase 15 — Catalog (brands/models), limited admin RBAC, customer portal

## Apply schema

Run in Supabase SQL editor (after 01–16):

```sql
-- file: supabase/17_schema_v15_catalog_rbac_customer.sql
```

## Super admin vs limited admin

| Role | Sidebar |
|------|---------|
| `super_admin` | **All** tabs |
| `admin` / `moderator` / `customer_support` | Only tabs granted in `admin_tab_permissions` |

### Promote super admin

```sql
insert into public.user_roles (user_id, role)
values ('YOUR_AUTH_USER_UUID', 'super_admin');
```

### Grant limited tabs (or use Admin → Permissions UI)

```sql
insert into public.admin_tab_permissions (user_id, permission_key, granted_by)
values
  ('LIMITED_ADMIN_UUID', 'dashboard', 'SUPER_ADMIN_UUID'),
  ('LIMITED_ADMIN_UUID', 'ad_moderation', 'SUPER_ADMIN_UUID'),
  ('LIMITED_ADMIN_UUID', 'categories', 'SUPER_ADMIN_UUID');
```

The admin sidebar (`AdminLayout`) loads grants via `useAdminNavAccess` and **hides** ungranted items.

## Categories & subcategories

- Nested tree: `categories.parent_id` (admin Category Management)
- Flat children: `subcategories` (legacy / listing forms)
- Prefer `parent_id` for new work; keep both in sync when creating children.

## Brands & models

Tables: `brands`, `product_models`  
Admin UI: `/admin/brands`  
Ads columns: `ads.brand_id`, `ads.model_id`

## Customer portal additions

| Path | Purpose |
|------|---------|
| `/my/addresses` | Saved addresses |
| `/my/support` | Customer tickets |
| `/my/offers` | Sent/received offers |
| Profile strip | Shortcuts to favorites, compare, messages, etc. |

Existing customer features already in app: favorites, saved searches, messages, compare, collections, blocked sellers, preferences, activity, notifications.
