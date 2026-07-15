-- BazarBD — Phase 15: Catalog (brands/models), limited-admin RBAC tabs, customer portal
-- Run AFTER 01..16 schemas.
-- ============================================================================
-- 1) Nested categories already exist (categories.parent_id + subcategories).
-- 2) Brands + product models for structured listing attributes.
-- 3) Super-admin vs limited-admin: admin_tab_permissions grants which /admin tabs show.
-- 4) Customer portal: addresses, purchase intents, support tickets (customer-facing),
--    recently viewed, notification preferences already partially exist — we add gaps.
-- ============================================================================

-- =========================================================================
-- Roles: ensure super_admin is first-class
-- =========================================================================
-- user_roles.role is text/enum depending on install; we store free text roles.
-- Convention: 'super_admin' | 'admin' | 'moderator' | 'customer_support' | 'seller' | 'buyer'

-- =========================================================================
-- Brands & models
-- =========================================================================
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  description text,
  website text,
  category_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  slug text not null,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create index if not exists brands_active_idx on public.brands (is_active, sort_order);
create index if not exists product_models_brand_idx on public.product_models (brand_id);

-- Optional structured fields on ads (safe additive columns)
alter table public.ads add column if not exists brand_id uuid references public.brands(id) on delete set null;
alter table public.ads add column if not exists model_id uuid references public.product_models(id) on delete set null;
create index if not exists ads_brand_idx on public.ads (brand_id);
create index if not exists ads_model_idx on public.ads (model_id);

-- =========================================================================
-- Admin tab permissions (limited admin access)
-- =========================================================================
-- Super admins (role = super_admin) bypass this table and see every tab.
-- Limited admins (role = admin / moderator / customer_support) only see tabs
-- whose permission_key is granted here.
create table if not exists public.admin_tab_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_key text not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, permission_key)
);

create index if not exists admin_tab_permissions_user_idx on public.admin_tab_permissions (user_id);

comment on table public.admin_tab_permissions is
  'Per-user grants for /admin navigation tabs. Super admins ignore this table.';

-- Catalog of known admin tab keys (documentation + optional UI source)
create table if not exists public.admin_tab_catalog (
  permission_key text primary key,
  label text not null,
  section text not null,
  href text not null,
  sort_order int not null default 0
);

insert into public.admin_tab_catalog (permission_key, label, section, href, sort_order) values
  ('dashboard', 'Dashboard', 'Overview', '/admin', 10),
  ('search', 'Global Search', 'Overview', '/admin/search', 20),
  ('bulk_operations', 'Bulk Operations', 'Overview', '/admin/bulk-operations', 30),
  ('activity_log', 'Activity Log', 'Overview', '/admin/activity-log', 40),
  ('analytics', 'Analytics', 'Overview', '/admin/analytics', 50),
  ('reporting', 'Reports', 'Overview', '/admin/reporting', 60),
  ('products', 'Products', 'Marketplace', '/admin/products', 110),
  ('listing_management', 'Listing Management', 'Marketplace', '/admin/listing-management', 120),
  ('listing_analytics', 'Listing Analytics', 'Marketplace', '/admin/listing-analytics', 130),
  ('search_analytics', 'Search Analytics', 'Marketplace', '/admin/search-analytics', 140),
  ('sponsored_listings', 'Sponsored Listings', 'Marketplace', '/admin/sponsored-listings', 150),
  ('ad_moderation', 'Ad Moderation', 'Marketplace', '/admin/ads', 160),
  ('categories', 'Categories', 'Marketplace', '/admin/categories', 170),
  ('brands', 'Brands & Models', 'Marketplace', '/admin/brands', 175),
  ('inventory', 'Inventory', 'Marketplace', '/admin/inventory', 180),
  ('users', 'User Management', 'Users & Sellers', '/admin/users', 210),
  ('customers', 'Customers', 'Users & Sellers', '/admin/customers', 220),
  ('sellers', 'Sellers', 'Users & Sellers', '/admin/sellers', 230),
  ('seller_reports', 'Seller Reports', 'Users & Sellers', '/admin/seller-reports', 240),
  ('shops', 'Shop Management', 'Users & Sellers', '/admin/shops', 250),
  ('shop_verifications', 'Shop Verifications', 'Users & Sellers', '/admin/shop-verifications', 260),
  ('trust', 'Trust & Verification', 'Users & Sellers', '/admin/trust', 270),
  ('reports', 'Report Queue', 'Moderation', '/admin/reports', 310),
  ('reviews', 'Review Moderation', 'Moderation', '/admin/reviews', 320),
  ('messages', 'Message Moderation', 'Moderation', '/admin/messages', 330),
  ('fraud', 'Fraud Detection', 'Moderation', '/admin/fraud', 340),
  ('media', 'Media Library', 'Moderation', '/admin/media', 350),
  ('transactions', 'Transactions', 'Payments', '/admin/transactions', 410),
  ('orders', 'Orders', 'Payments', '/admin/orders', 420),
  ('payouts', 'Payouts', 'Payments', '/admin/payouts', 430),
  ('coupons', 'Coupons', 'Payments', '/admin/coupons', 440),
  ('campaigns', 'Campaigns', 'Payments', '/admin/campaigns', 450),
  ('cms', 'CMS', 'Content', '/admin/cms', 510),
  ('seo', 'SEO', 'Content', '/admin/seo', 520),
  ('support', 'Support Tickets', 'Support', '/admin/support', 610),
  ('permissions', 'Permissions', 'Security', '/admin/permissions', 710),
  ('audit', 'Audit Log', 'Security', '/admin/audit', 720),
  ('monitoring', 'System Monitoring', 'System', '/admin/monitoring', 810),
  ('api_logs', 'API Logs', 'System', '/admin/api-logs', 820),
  ('workflow', 'Workflow Automation', 'System', '/admin/workflow', 830),
  ('tools', 'Admin Tools', 'System', '/admin/tools', 840),
  ('compliance', 'Compliance', 'System', '/admin/compliance', 850),
  ('developer', 'Developer', 'System', '/admin/developer', 860),
  ('backup', 'Backup & Recovery', 'System', '/admin/backup', 870),
  ('settings', 'Settings', 'System', '/admin/settings', 880)
on conflict (permission_key) do update set
  label = excluded.label,
  section = excluded.section,
  href = excluded.href,
  sort_order = excluded.sort_order;

-- =========================================================================
-- Customer portal gaps
-- =========================================================================
create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text default 'Home',
  full_name text,
  phone text,
  division text,
  district text,
  area text,
  address_line text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_addresses_user_idx on public.customer_addresses (user_id);

create table if not exists public.customer_recently_viewed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (user_id, ad_id)
);

-- Customer support tickets (if not already present as support_tickets)
create table if not exists public.customer_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  status text not null default 'open', -- open | pending | resolved | closed
  priority text not null default 'normal',
  related_ad_id uuid references public.ads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.customer_tickets(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  body text not null,
  is_staff boolean not null default false,
  created_at timestamptz not null default now()
);

-- Offers inbox helper view is optional; table offers should already exist.

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.brands enable row level security;
alter table public.product_models enable row level security;
alter table public.admin_tab_permissions enable row level security;
alter table public.admin_tab_catalog enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.customer_recently_viewed enable row level security;
alter table public.customer_tickets enable row level security;
alter table public.customer_ticket_messages enable row level security;

-- Public read brands/models
drop policy if exists brands_public_read on public.brands;
create policy brands_public_read on public.brands for select using (is_active = true or auth.role() = 'authenticated');
drop policy if exists models_public_read on public.product_models;
create policy models_public_read on public.product_models for select using (is_active = true or auth.role() = 'authenticated');

-- Staff manage brands/models (any user with admin/super_admin role)
drop policy if exists brands_staff_all on public.brands;
create policy brands_staff_all on public.brands for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin'))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin'))
);
drop policy if exists models_staff_all on public.product_models;
create policy models_staff_all on public.product_models for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin'))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin'))
);

-- Tab catalog readable by staff
drop policy if exists admin_tab_catalog_read on public.admin_tab_catalog;
create policy admin_tab_catalog_read on public.admin_tab_catalog for select using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','moderator','customer_support'))
);

-- Users can read their own tab grants; super_admin can manage all
drop policy if exists admin_tab_perms_select on public.admin_tab_permissions;
create policy admin_tab_perms_select on public.admin_tab_permissions for select using (
  user_id = auth.uid()
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'super_admin')
);
drop policy if exists admin_tab_perms_write on public.admin_tab_permissions;
create policy admin_tab_perms_write on public.admin_tab_permissions for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'super_admin')
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'super_admin')
);

-- Customer addresses / recently viewed / tickets: owner only
drop policy if exists customer_addresses_own on public.customer_addresses;
create policy customer_addresses_own on public.customer_addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists customer_rv_own on public.customer_recently_viewed;
create policy customer_rv_own on public.customer_recently_viewed for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists customer_tickets_own on public.customer_tickets;
create policy customer_tickets_own on public.customer_tickets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists customer_ticket_msgs_own on public.customer_ticket_messages;
create policy customer_ticket_msgs_own on public.customer_ticket_messages for select using (
  exists (select 1 from public.customer_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','customer_support'))
);
drop policy if exists customer_ticket_msgs_insert on public.customer_ticket_messages;
create policy customer_ticket_msgs_insert on public.customer_ticket_messages for insert with check (
  exists (select 1 from public.customer_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('super_admin','admin','customer_support'))
);

-- Grants
grant select on public.brands, public.product_models, public.admin_tab_catalog to anon, authenticated;
grant select, insert, update, delete on public.brands, public.product_models to authenticated;
grant select, insert, update, delete on public.admin_tab_permissions to authenticated;
grant select, insert, update, delete on public.customer_addresses, public.customer_recently_viewed, public.customer_tickets, public.customer_ticket_messages to authenticated;

-- Helper: promote a user to super_admin (run manually with real uuid)
-- insert into public.user_roles (user_id, role) values ('<uuid>', 'super_admin')
--   on conflict do nothing;
