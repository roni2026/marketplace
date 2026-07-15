-- BazarBD — Phase 4: Listing Management
-- schema_v4_listing_management.sql
-- Run after schema.sql, schema_v2_listings.sql, schema_v3_shops.sql
-- -------------------------------------------------------------------------
-- Adds: configurable listing types, category attributes, condition details,
-- warranty info, shipping info, listing history, listing analytics,
-- search/filter indexes, bulk operations support, listing type config.
-- Extends ads table with brand, model, tags, SKU, barcode, serial_number,
-- mpn, rich_description, original_price, discount, negotiable, min_offer,
-- currency, listing_type, cover_image_id, shipping fields, warranty fields.
-- -------------------------------------------------------------------------

-- =========================================================================
-- Enum additions
-- =========================================================================

alter type public.ad_status add value if not exists 'paused';

alter type public.ad_status add value if not exists 'hidden';

alter type public.ad_status add value if not exists 'archived';

do $ptype$ begin
create type public.warranty_type as enum ('none', 'manufacturer', 'seller');
exception when duplicate_object then null;
end $ptype$;

do $ptype$ begin
create type public.shipping_method as enum ('local_pickup', 'nationwide', 'international');
exception when duplicate_object then null;
end $ptype$;

do $ptype$ begin
create type public.shipping_fee_type as enum ('free', 'flat_rate', 'calculated');
exception when duplicate_object then null;
end $ptype$;

do $ptype$ begin
create type public.history_action as enum (
 'created', 'edited', 'price_changed', 'photo_changed', 'status_changed',
 'renewed', 'relisted', 'marked_sold', 'archived', 'restored',
 'deleted', 'duplicated', 'published', 'scheduled', 'paused', 'resumed',
 'hidden', 'bulk_updated'
 );
exception when duplicate_object then null;
end $ptype$;

do $ptype$ begin
create type public.attribute_data_type as enum ('text', 'number', 'select', 'multiselect', 'boolean', 'date');
exception when duplicate_object then null;
end $ptype$;

-- =========================================================================
-- Extend ads table with Phase 4 columns
-- =========================================================================

alter table public.ads
 add column if not exists listing_type text default 'new',
 add column if not exists brand text,
 add column if not exists model text,
 add column if not exists tags text[] default '{}',
 add column if not exists rich_description text,
 add column if not exists short_description text,
 add column if not exists sku text,
 add column if not exists barcode text,
 add column if not exists serial_number text,
 add column if not exists mpn text,
 add column if not exists original_price numeric,
 add column if not exists discount_amount numeric,
 add column if not exists discount_percentage numeric,
 add column if not exists is_negotiable boolean default false,
 add column if not exists min_offer numeric,
 add column if not exists currency text default 'BDT',
 add column if not exists cover_image_id uuid,
 add column if not exists shipping_methods public.shipping_method[] default '{}',
 add column if not exists shipping_fee_type public.shipping_fee_type default 'free',
 add column if not exists shipping_fee numeric default 0,
 add column if not exists free_shipping boolean default false,
 add column if not exists estimated_delivery_days int,
 add column if not exists handling_time_days int,
 add column if not exists delivery_locations text[] default '{}',
 add column if not exists warranty_type public.warranty_type default 'none',
 add column if not exists warranty_duration_months int,
 add column if not exists warranty_coverage text,
 add column if not exists warranty_terms text,
 add column if not exists product_attributes jsonb default '{}'::jsonb,
 add column if not exists condition_details jsonb default '{}'::jsonb,
 add column if not exists shop_id uuid,
 add column if not exists deleted_at timestamptz,
 add column if not exists renewed_at timestamptz,
 add column if not exists sold_at timestamptz,
 add column if not exists archived_at timestamptz;

-- Add unique constraints for SKU and barcode (per user)
create unique index if not exists idx_ads_sku_user on public.ads (sku, user_id) where sku is not null;
create unique index if not exists idx_ads_barcode_user on public.ads (barcode, user_id) where barcode is not null;

-- =========================================================================
-- Configurable Listing Types (admin-managed, no DB schema changes needed)
-- =========================================================================

create table if not exists public.listing_types (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 slug text not null unique,
 description text,
 icon text,
 sort_order int default 0,
 is_active boolean default true,
 is_digital boolean default false,
 is_service boolean default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

-- Configurable Item Conditions (admin-managed)
create table if not exists public.item_conditions (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 slug text not null unique,
 description text,
 sort_order int default 0,
 is_active boolean default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

-- =========================================================================
-- Category Attributes (dynamic attributes per category)
-- =========================================================================

create table if not exists public.category_attributes (
 id uuid primary key default gen_random_uuid(),
 category_id uuid not null references public.categories(id) on delete cascade,
 name text not null,
 slug text not null,
 data_type public.attribute_data_type not null default 'text',
 is_required boolean default false,
 is_filterable boolean default false,
 options text[] default '{}',
 unit text,
 sort_order int default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (category_id, slug)
);

-- =========================================================================
-- Listing History (complete audit trail per listing)
-- =========================================================================

create table if not exists public.listing_history (
 id uuid primary key default gen_random_uuid(),
 ad_id uuid not null references public.ads(id) on delete cascade,
 user_id uuid references auth.users(id) on delete set null,
 action public.history_action not null,
 previous_value jsonb,
 new_value jsonb,
 field_name text,
 notes text,
 created_at timestamptz not null default now()
);

create index if not exists idx_listing_history_ad_id on public.listing_history(ad_id);
create index if not exists idx_listing_history_action on public.listing_history(action);
create index if not exists idx_listing_history_created_at on public.listing_history(created_at desc);

-- =========================================================================
-- Listing Analytics (detailed per-listing metrics)
-- =========================================================================

create table if not exists public.listing_analytics (
 id uuid primary key default gen_random_uuid(),
 ad_id uuid not null references public.ads(id) on delete cascade,
 stat_date date not null default current_date,
 total_views int default 0,
 unique_visitors int default 0,
 favorites int default 0,
 shares int default 0,
 messages_received int default 0,
 contact_clicks int default 0,
 inquiries int default 0,
 created_at timestamptz not null default now(),
 unique (ad_id, stat_date)
);

create index if not exists idx_listing_analytics_ad_id on public.listing_analytics(ad_id);
create index if not exists idx_listing_analytics_date on public.listing_analytics(stat_date);

-- =========================================================================
-- Listing Variants (extend existing table with Phase 4 fields)
-- =========================================================================

alter table public.listing_variants
 add column if not exists image_url text,
 add column if not exists is_available boolean default true,
 add column if not exists sort_order int default 0;

-- =========================================================================
-- Bulk Operation Jobs (track bulk listing operations)
-- =========================================================================

create table if not exists public.bulk_listing_operations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 operation text not null,
 ad_ids uuid[] not null default '{}',
 parameters jsonb default '{}'::jsonb,
 status text default 'pending',
 total_count int default 0,
 success_count int default 0,
 failure_count int default 0,
 error_details jsonb default '[]'::jsonb,
 created_at timestamptz not null default now(),
 completed_at timestamptz
);

create index if not exists idx_bulk_ops_user_id on public.bulk_listing_operations(user_id);
create index if not exists idx_bulk_ops_status on public.bulk_listing_operations(status);

-- =========================================================================
-- Search & Filter Indexes on ads table
-- =========================================================================

create index if not exists idx_ads_brand on public.ads (brand) where brand is not null;
create index if not exists idx_ads_model on public.ads (model) where model is not null;
create index if not exists idx_ads_listing_type on public.ads (listing_type);
create index if not exists idx_ads_tags on public.ads using gin (tags);
create index if not exists idx_ads_condition on public.ads (condition);
create index if not exists idx_ads_price on public.ads (price);
create index if not exists idx_ads_negotiable on public.ads (is_negotiable);
create index if not exists idx_ads_shop_id on public.ads (shop_id) where shop_id is not null;
create index if not exists idx_ads_deleted_at on public.ads (deleted_at) where deleted_at is not null;
create index if not exists idx_ads_updated_at on public.ads (updated_at desc);
create index if not exists idx_ads_status_combined on public.ads (status, category_id, division);
create index if not exists idx_ads_product_attributes on public.ads using gin (product_attributes);

-- =========================================================================
-- Updated At trigger for new tables
-- =========================================================================

create or replace function public.update_updated_at_v4()
returns trigger
language plpgsql
as $func$
begin
 new.updated_at = now();
 return new;
end;
$func$;

drop trigger if exists trg_listing_types_updated_at on public.listing_types;
create trigger trg_listing_types_updated_at before update on public.listing_types
 for each row execute procedure public.update_updated_at_v4();

drop trigger if exists trg_item_conditions_updated_at on public.item_conditions;
create trigger trg_item_conditions_updated_at before update on public.item_conditions
 for each row execute procedure public.update_updated_at_v4();

drop trigger if exists trg_category_attributes_updated_at on public.category_attributes;
create trigger trg_category_attributes_updated_at before update on public.category_attributes
 for each row execute procedure public.update_updated_at_v4();

-- =========================================================================
-- Function to log listing history
-- =========================================================================

create or replace function public.log_listing_history(
 p_ad_id uuid,
 p_user_id uuid,
 p_action public.history_action,
 p_previous_value jsonb default null,
 p_new_value jsonb default null,
 p_field_name text default null,
 p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $func$
begin
 insert into public.listing_history (ad_id, user_id, action, previous_value, new_value, field_name, notes)
 values (p_ad_id, p_user_id, p_action, p_previous_value, p_new_value, p_field_name, p_notes);
end;
$func$;

-- =========================================================================
-- Function to record listing analytics
-- =========================================================================

create or replace function public.record_listing_analytics(
 p_ad_id uuid,
 p_metric text,
 p_increment int default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $func$
begin
 insert into public.listing_analytics (ad_id, stat_date, total_views, unique_visitors, favorites, shares, messages_received, contact_clicks, inquiries)
 values (p_ad_id, current_date, 0, 0, 0, 0, 0, 0, 0)
 on conflict (ad_id, stat_date) do update
 set
 total_views = case when p_metric = 'view' then listing_analytics.total_views + p_increment else listing_analytics.total_views end,
 unique_visitors = case when p_metric = 'unique_view' then listing_analytics.unique_visitors + p_increment else listing_analytics.unique_visitors end,
 favorites = case when p_metric = 'favorite' then listing_analytics.favorites + p_increment else listing_analytics.favorites end,
 shares = case when p_metric = 'share' then listing_analytics.shares + p_increment else listing_analytics.shares end,
 messages_received = case when p_metric = 'message' then listing_analytics.messages_received + p_increment else listing_analytics.messages_received end,
 contact_clicks = case when p_metric = 'contact_click' then listing_analytics.contact_clicks + p_increment else listing_analytics.contact_clicks end,
 inquiries = case when p_metric = 'inquiry' then listing_analytics.inquiries + p_increment else listing_analytics.inquiries end;
end;
$func$;

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.listing_types enable row level security;
alter table public.item_conditions enable row level security;
alter table public.category_attributes enable row level security;
alter table public.listing_history enable row level security;
alter table public.listing_analytics enable row level security;
alter table public.bulk_listing_operations enable row level security;

-- Listing types: public read, admin write
drop policy if exists "Public can view listing types" on public.listing_types;
create policy "Public can view listing types" on public.listing_types for select using (true);
drop policy if exists "Admins manage listing types" on public.listing_types;
create policy "Admins manage listing types" on public.listing_types for all
 using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Item conditions: public read, admin write
drop policy if exists "Public can view item conditions" on public.item_conditions;
create policy "Public can view item conditions" on public.item_conditions for select using (true);
drop policy if exists "Admins manage item conditions" on public.item_conditions;
create policy "Admins manage item conditions" on public.item_conditions for all
 using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Category attributes: public read, admin write
drop policy if exists "Public can view category attributes" on public.category_attributes;
create policy "Public can view category attributes" on public.category_attributes for select using (true);
drop policy if exists "Admins manage category attributes" on public.category_attributes;
create policy "Admins manage category attributes" on public.category_attributes for all
 using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Listing history: ad owner and admins can view, ad owner can insert
drop policy if exists "Ad owner views listing history" on public.listing_history;
create policy "Ad owner views listing history" on public.listing_history for select
 using (exists (select 1 from public.ads where ads.id = listing_history.ad_id and (ads.user_id = auth.uid() or public.is_admin(auth.uid()))));
drop policy if exists "Ad owner inserts listing history" on public.listing_history;
create policy "Ad owner inserts listing history" on public.listing_history for insert
 with check (exists (select 1 from public.ads where ads.id = listing_history.ad_id and ads.user_id = auth.uid()) or public.is_admin(auth.uid()));

-- Listing analytics: ad owner and admins can view, system inserts
drop policy if exists "Ad owner views listing analytics" on public.listing_analytics;
create policy "Ad owner views listing analytics" on public.listing_analytics for select
 using (exists (select 1 from public.ads where ads.id = listing_analytics.ad_id and (ads.user_id = auth.uid() or public.is_admin(auth.uid()))));
drop policy if exists "System inserts listing analytics" on public.listing_analytics;
create policy "System inserts listing analytics" on public.listing_analytics for insert with check (true);
drop policy if exists "Ad owner updates listing analytics" on public.listing_analytics;
create policy "Ad owner updates listing analytics" on public.listing_analytics for update
 using (exists (select 1 from public.ads where ads.id = listing_analytics.ad_id and ads.user_id = auth.uid()));

-- Bulk listing operations: only owner
drop policy if exists "Users manage own bulk operations" on public.bulk_listing_operations;
create policy "Users manage own bulk operations" on public.bulk_listing_operations for all
 using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================================
-- GRANT permissions
-- =========================================================================

grant select on public.listing_types to anon, authenticated;
grant select, insert, update, delete on public.listing_types to authenticated;

grant select on public.item_conditions to anon, authenticated;
grant select, insert, update, delete on public.item_conditions to authenticated;

grant select on public.category_attributes to anon, authenticated;
grant select, insert, update, delete on public.category_attributes to authenticated;

grant select, insert on public.listing_history to authenticated;
grant select, insert, update on public.listing_analytics to authenticated;
grant select, insert, update, delete on public.bulk_listing_operations to authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

grant execute on function public.log_listing_history(uuid, uuid, public.history_action, jsonb, jsonb, text, text) to authenticated;
grant execute on function public.record_listing_analytics(uuid, text, int) to authenticated;

-- =========================================================================
-- Seed default listing types
-- =========================================================================

insert into public.listing_types (name, slug, description, sort_order, is_active) values
 ('New', 'new', 'Brand new, never used items', 1, true),
 ('Used', 'used', 'Pre-owned items in various conditions', 2, true),
 ('Refurbished', 'refurbished', 'Professionally restored to working condition', 3, true),
 ('Open Box', 'open-box', 'Opened but unused or barely used items', 4, true),
 ('Handmade', 'handmade', 'Handcrafted items made by the seller', 5, true),
 ('Collectibles', 'collectibles', 'Rare and collectible items', 6, true),
 ('Vintage', 'vintage', 'Antique and vintage items', 7, true),
 ('Digital Products', 'digital-products', 'Digital goods delivered electronically', 8, true),
 ('Services', 'services', 'Professional and personal services', 9, true)
on conflict (slug) do nothing;

-- Seed default item conditions
insert into public.item_conditions (name, slug, description, sort_order, is_active) values
 ('Brand New', 'brand-new', 'Sealed, never opened', 1, true),
 ('Like New', 'like-new', 'Opened but appears unused', 2, true),
 ('Excellent', 'excellent', 'Very minor signs of use', 3, true),
 ('Very Good', 'very-good', 'Lightly used with minor wear', 4, true),
 ('Good', 'good', 'Used with visible wear but fully functional', 5, true),
 ('Fair', 'fair', 'Significant wear but functional', 6, true),
 ('Used', 'used', 'Normal wear from regular use', 7, true),
 ('Refurbished', 'refurbished', 'Professionally restored', 8, true),
 ('Open Box', 'open-box', 'Opened, may have minor marks', 9, true),
 ('Damaged', 'damaged', 'Has damage, may need repair', 10, true),
 ('For Parts', 'for-parts', 'Not functional, suitable for parts only', 11, true)
on conflict (slug) do nothing;

-- Seed default category attributes for Electronics
insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Storage', 'storage', 'select', false, true, ARRAY['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'], null, 1
from public.categories c where c.slug = 'electronics' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'storage'
);

insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'RAM', 'ram', 'select', false, true, ARRAY['2GB', '4GB', '6GB', '8GB', '12GB', '16GB', '32GB', '64GB'], null, 2
from public.categories c where c.slug = 'electronics' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'ram'
);

insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Processor', 'processor', 'text', false, true, ARRAY[]::text[], null, 3
from public.categories c where c.slug = 'electronics' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'processor'
);

insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Screen Size', 'screen-size', 'text', false, true, ARRAY[]::text[], 'inches', 4
from public.categories c where c.slug = 'electronics' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'screen-size'
);

insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Color', 'color', 'text', false, true, ARRAY[]::text[], null, 5
from public.categories c where c.slug = 'electronics' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'color'
);

-- Seed default category attributes for Fashion
insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Size', 'size', 'select', true, true, ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'], null, 1
from public.categories c where c.slug = 'fashion' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'size'
);

insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Material', 'material', 'text', false, true, ARRAY[]::text[], null, 2
from public.categories c where c.slug = 'fashion' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'material'
);

insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Gender', 'gender', 'select', false, true, ARRAY['Men', 'Women', 'Unisex', 'Kids'], null, 3
from public.categories c where c.slug = 'fashion' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'gender'
);

insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Color', 'color', 'text', false, true, ARRAY[]::text[], null, 4
from public.categories c where c.slug = 'fashion' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'color'
);

-- Seed default category attributes for Vehicles
insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Year', 'year', 'number', true, true, ARRAY[]::text[], null, 1
from public.categories c where c.slug = 'vehicles' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'year'
);

insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Mileage', 'mileage', 'number', false, true, ARRAY[]::text[], 'km', 2
from public.categories c where c.slug = 'vehicles' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'mileage'
);

insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Fuel Type', 'fuel-type', 'select', false, true, ARRAY['Petrol', 'Diesel', 'CNG', 'Hybrid', 'Electric'], null, 3
from public.categories c where c.slug = 'vehicles' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'fuel-type'
);

insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Transmission', 'transmission', 'select', false, true, ARRAY['Manual', 'Automatic', 'CVT'], null, 4
from public.categories c where c.slug = 'vehicles' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'transmission'
);

-- Seed default category attributes for Furniture
insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Material', 'material', 'text', false, true, ARRAY[]::text[], null, 1
from public.categories c where c.slug = 'furniture' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'material'
);

insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Dimensions', 'dimensions', 'text', false, false, ARRAY[]::text[], null, 2
from public.categories c where c.slug = 'furniture' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'dimensions'
);

insert into public.category_attributes (category_id, name, slug, data_type, is_required, is_filterable, options, unit, sort_order)
select c.id, 'Weight', 'weight', 'number', false, false, ARRAY[]::text[], 'kg', 3
from public.categories c where c.slug = 'furniture' and not exists (
 select 1 from public.category_attributes ca where ca.category_id = c.id and ca.slug = 'weight'
);

-- =========================================================================
-- Storage bucket (create via Supabase dashboard or CLI)
-- ad-media-v4 — public bucket for Phase 4 listing media with WebP support
-- =========================================================================