-- BazarBD — Phase 6: Marketplace Experience
-- schema_v6_marketplace_experience.sql
-- Run after all previous migrations.
-- -------------------------------------------------------------------------
-- Adds: extended favorites (sellers/stores/brands/categories), seller
-- blocking, hidden listings, category followers, seller reports,
-- sponsored listings, user activity tracking, QR code scans,
-- enhanced engagement stats, user preferences.
-- -------------------------------------------------------------------------

-- =========================================================================
-- Enum additions
-- =========================================================================

create type public.favorite_entity_type as enum ('listing', 'seller', 'store', 'brand', 'category');

create type public.activity_type as enum (
    'view', 'favorite', 'unfavorite', 'share', 'compare', 'follow_seller',
    'unfollow_seller', 'follow_store', 'unfollow_store', 'follow_category',
    'unfollow_category', 'hide_listing', 'unhide_listing', 'block_seller',
    'unblock_seller', 'report_listing', 'report_seller', 'wishlist_add',
    'wishlist_remove', 'qr_scan', 'contact_seller', 'visit_store', 'save_search'
  );

create type public.report_target_type as enum ('listing', 'seller');

create type public.sponsored_placement as enum ('search_results', 'category_page', 'homepage', 'discovery');

-- =========================================================================
-- Extended Favorites (listings, sellers, stores, brands, categories)
-- =========================================================================

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type public.favorite_entity_type not null,
  entity_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create index if not exists idx_user_favorites_user on public.user_favorites(user_id);
create index if not exists idx_user_favorites_user_type on public.user_favorites(user_id, entity_type);
create index if not exists idx_user_favorites_entity on public.user_favorites(entity_type, entity_id);

-- =========================================================================
-- Blocked Sellers
-- =========================================================================

create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);

create index if not exists idx_blocked_users_user on public.blocked_users(user_id);
create index if not exists idx_blocked_users_blocked on public.blocked_users(blocked_user_id);

-- =========================================================================
-- Hidden Listings
-- =========================================================================

create table if not exists public.hidden_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (user_id, ad_id)
);

create index if not exists idx_hidden_listings_user on public.hidden_listings(user_id);
create index if not exists idx_hidden_listings_ad on public.hidden_listings(ad_id);

-- =========================================================================
-- Category Followers
-- =========================================================================

create table if not exists public.category_followers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  notify_on_new boolean default true,
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);

create index if not exists idx_category_followers_user on public.category_followers(user_id);
create index if not exists idx_category_followers_category on public.category_followers(category_id);

-- =========================================================================
-- Seller Reports (separate from listing reports)
-- =========================================================================

create table if not exists public.seller_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  reason_code text not null,
  description text,
  screenshot_urls text[] default '{}',
  status public.report_status not null default 'pending',
  admin_notes text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  is_resolved boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_seller_reports_reporter on public.seller_reports(reporter_id);
create index if not exists idx_seller_reports_seller on public.seller_reports(seller_id);
create index if not exists idx_seller_reports_status on public.seller_reports(status);

-- =========================================================================
-- Sponsored Listings
-- =========================================================================

create table if not exists public.sponsored_listings (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  sponsor_name text,
  placement public.sponsored_placement not null default 'search_results',
  priority int default 0,
  is_active boolean default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  budget numeric default 0,
  spent numeric default 0,
  impressions int default 0,
  clicks int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sponsored_listings_ad on public.sponsored_listings(ad_id);
create index if not exists idx_sponsored_listings_active on public.sponsored_listings(is_active, placement);
create index if not exists idx_sponsored_listings_dates on public.sponsored_listings(starts_at, ends_at);

-- =========================================================================
-- User Activity Tracking
-- =========================================================================

create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  activity_type public.activity_type not null,
  entity_type text,
  entity_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_activity_user on public.user_activity(user_id);
create index if not exists idx_user_activity_type on public.user_activity(activity_type);
create index if not exists idx_user_activity_created on public.user_activity(created_at desc);
create index if not exists idx_user_activity_entity on public.user_activity(entity_type, entity_id);

-- =========================================================================
-- QR Code Scans
-- =========================================================================

create table if not exists public.qr_code_scans (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  scanned_by uuid references auth.users(id) on delete set null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_qr_scans_ad on public.qr_code_scans(ad_id);
create index if not exists idx_qr_scans_created on public.qr_code_scans(created_at desc);

-- =========================================================================
-- User Preferences (marketplace notification and privacy controls)
-- =========================================================================

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  notify_new_listings boolean default true,
  notify_price_drops boolean default true,
  notify_seller_new_listings boolean default true,
  notify_store_new_products boolean default true,
  notify_category_new_listings boolean default true,
  notify_expiring_listings boolean default true,
  notify_messages boolean default true,
  notify_offers boolean default true,
  show_recently_viewed boolean default true,
  allow_public_collections boolean default true,
  allow_activity_tracking boolean default true,
  default_wishlist_visibility text default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_preferences_user on public.user_preferences(user_id);

-- =========================================================================
-- Recently Viewed (server-side, extends client-side localStorage)
-- =========================================================================

create table if not exists public.recently_viewed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (user_id, ad_id)
);

create index if not exists idx_recently_viewed_user on public.recently_viewed(user_id);
create index if not exists idx_recently_viewed_user_viewed on public.recently_viewed(user_id, viewed_at desc);

-- =========================================================================
-- Updated At triggers
-- =========================================================================

create or replace function public.update_updated_at_v6()
returns trigger
language plpgsql
as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$;

drop trigger if exists trg_seller_reports_updated_at on public.seller_reports;
create trigger trg_seller_reports_updated_at before update on public.seller_reports
  for each row execute procedure public.update_updated_at_v6();

drop trigger if exists trg_sponsored_listings_updated_at on public.sponsored_listings;
create trigger trg_sponsored_listings_updated_at before update on public.sponsored_listings
  for each row execute procedure public.update_updated_at_v6();

drop trigger if exists trg_user_preferences_updated_at on public.user_preferences;
create trigger trg_user_preferences_updated_at before update on public.user_preferences
  for each row execute procedure public.update_updated_at_v6();

-- =========================================================================
-- Function: record_user_activity
-- =========================================================================

create or replace function public.record_user_activity(
  p_user_id uuid,
  p_activity_type public.activity_type,
  p_entity_type text default null,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.user_activity (user_id, activity_type, entity_type, entity_id, metadata)
  values (p_user_id, p_activity_type, p_entity_type, p_entity_id, p_metadata);
end;
$func$;

-- =========================================================================
-- Function: record_recently_viewed
-- =========================================================================

create or replace function public.record_recently_viewed(
  p_user_id uuid,
  p_ad_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.recently_viewed (user_id, ad_id, viewed_at)
  values (p_user_id, p_ad_id, now())
  on conflict (user_id, ad_id) do update
  set viewed_at = now();
end;
$func$;

-- =========================================================================
-- Function: get_sponsored_listings
-- =========================================================================

create or replace function public.get_sponsored_listings(
  p_placement public.sponsored_placement,
  p_limit int default 5,
  p_category_id uuid default null
)
returns table (
  id uuid,
  title text,
  slug text,
  price numeric,
  price_type text,
  condition text,
  division text,
  district text,
  is_featured boolean,
  is_premium boolean,
  is_boosted boolean,
  views_count int,
  favorites_count int,
  created_at timestamptz,
  sponsor_name text,
  ad_images jsonb
)
language plpgsql
security definer
set search_path = public
as $func$
begin
  return query
  select
    a.id, a.title, a.slug, a.price, a.price_type, a.condition,
    a.division, a.district, a.is_featured, a.is_premium, a.is_boosted,
    coalesce(a.views_count, 0), coalesce(a.favorites_count, 0),
    a.created_at,
    sl.sponsor_name,
    (select jsonb_agg(jsonb_build_object('image_url', ai.image_url, 'sort_order', ai.sort_order))
     from public.ad_images ai where ai.ad_id = a.id order by ai.sort_order limit 1) as ad_images
  from public.sponsored_listings sl
  join public.ads a on a.id = sl.ad_id
  where sl.is_active = true
    and sl.starts_at <= now()
    and (sl.ends_at is null or sl.ends_at >= now())
    and sl.placement = p_placement
    and a.status in ('approved', 'boosted', 'premium')
    and (p_category_id is null or a.category_id = p_category_id)
  order by sl.priority desc, sl.created_at desc
  limit p_limit;
end;
$func$;

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.user_favorites enable row level security;
alter table public.blocked_users enable row level security;
alter table public.hidden_listings enable row level security;
alter table public.category_followers enable row level security;
alter table public.seller_reports enable row level security;
alter table public.sponsored_listings enable row level security;
alter table public.user_activity enable row level security;
alter table public.qr_code_scans enable row level security;
alter table public.user_preferences enable row level security;
alter table public.recently_viewed enable row level security;

-- User favorites: owner manages
drop policy if exists "Users view own favorites" on public.user_favorites;
create policy "Users view own favorites" on public.user_favorites for select
  using (user_id = auth.uid());
drop policy if exists "Users create own favorites" on public.user_favorites;
create policy "Users create own favorites" on public.user_favorites for insert
  with check (user_id = auth.uid());
drop policy if exists "Users delete own favorites" on public.user_favorites;
create policy "Users delete own favorites" on public.user_favorites for delete
  using (user_id = auth.uid());

-- Blocked users: owner manages
drop policy if exists "Users view own blocks" on public.blocked_users;
create policy "Users view own blocks" on public.blocked_users for select
  using (user_id = auth.uid());
drop policy if exists "Users create own blocks" on public.blocked_users;
create policy "Users create own blocks" on public.blocked_users for insert
  with check (user_id = auth.uid());
drop policy if exists "Users delete own blocks" on public.blocked_users;
create policy "Users delete own blocks" on public.blocked_users for delete
  using (user_id = auth.uid());

-- Hidden listings: owner manages
drop policy if exists "Users view own hidden" on public.hidden_listings;
create policy "Users view own hidden" on public.hidden_listings for select
  using (user_id = auth.uid());
drop policy if exists "Users create own hidden" on public.hidden_listings;
create policy "Users create own hidden" on public.hidden_listings for insert
  with check (user_id = auth.uid());
drop policy if exists "Users delete own hidden" on public.hidden_listings;
create policy "Users delete own hidden" on public.hidden_listings for delete
  using (user_id = auth.uid());

-- Category followers: owner manages, public can see counts
drop policy if exists "Users view own category follows" on public.category_followers;
create policy "Users view own category follows" on public.category_followers for select
  using (user_id = auth.uid());
drop policy if exists "Users create own category follows" on public.category_followers;
create policy "Users create own category follows" on public.category_followers for insert
  with check (user_id = auth.uid());
drop policy if exists "Users delete own category follows" on public.category_followers;
create policy "Users delete own category follows" on public.category_followers for delete
  using (user_id = auth.uid());

-- Seller reports: reporter creates, admins view
drop policy if exists "Users create seller reports" on public.seller_reports;
create policy "Users create seller reports" on public.seller_reports for insert
  with check (reporter_id = auth.uid());
drop policy if exists "Users view own seller reports" on public.seller_reports;
create policy "Users view own seller reports" on public.seller_reports for select
  using (reporter_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "Admins update seller reports" on public.seller_reports;
create policy "Admins update seller reports" on public.seller_reports for update
  using (public.is_admin(auth.uid()));

-- Sponsored listings: admins manage, public views active
drop policy if exists "Public views active sponsored" on public.sponsored_listings;
create policy "Public views active sponsored" on public.sponsored_listings for select
  using (is_active = true);
drop policy if exists "Admins manage sponsored" on public.sponsored_listings;
create policy "Admins manage sponsored" on public.sponsored_listings for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- User activity: owner views, system inserts
drop policy if exists "Users view own activity" on public.user_activity;
create policy "Users view own activity" on public.user_activity for select
  using (user_id = auth.uid());
drop policy if exists "System inserts activity" on public.user_activity;
create policy "System inserts activity" on public.user_activity for insert with check (true);
drop policy if exists "Users delete own activity" on public.user_activity;
create policy "Users delete own activity" on public.user_activity for delete
  using (user_id = auth.uid());

-- QR code scans: system inserts, admins view
drop policy if exists "System inserts qr scans" on public.qr_code_scans;
create policy "System inserts qr scans" on public.qr_code_scans for insert with check (true);
drop policy if exists "Admins view qr scans" on public.qr_code_scans;
create policy "Admins view qr scans" on public.qr_code_scans for select
  using (public.is_admin(auth.uid()));

-- User preferences: owner manages
drop policy if exists "Users view own preferences" on public.user_preferences;
create policy "Users view own preferences" on public.user_preferences for select
  using (user_id = auth.uid());
drop policy if exists "Users create own preferences" on public.user_preferences;
create policy "Users create own preferences" on public.user_preferences for insert
  with check (user_id = auth.uid());
drop policy if exists "Users update own preferences" on public.user_preferences;
create policy "Users update own preferences" on public.user_preferences for update
  using (user_id = auth.uid());

-- Recently viewed: owner manages, system inserts
drop policy if exists "Users view own recently viewed" on public.recently_viewed;
create policy "Users view own recently viewed" on public.recently_viewed for select
  using (user_id = auth.uid());
drop policy if exists "System inserts recently viewed" on public.recently_viewed;
create policy "System inserts recently viewed" on public.recently_viewed for insert with check (true);
drop policy if exists "Users delete own recently viewed" on public.recently_viewed;
create policy "Users delete own recently viewed" on public.recently_viewed for delete
  using (user_id = auth.uid());

-- =========================================================================
-- GRANT permissions
-- =========================================================================

grant select, insert, delete on public.user_favorites to authenticated;
grant select, insert, delete on public.blocked_users to authenticated;
grant select, insert, delete on public.hidden_listings to authenticated;
grant select, insert, delete on public.category_followers to authenticated;
grant select, insert on public.seller_reports to authenticated;
grant select, update on public.seller_reports to authenticated;
grant select on public.sponsored_listings to anon, authenticated;
grant select, insert, update, delete on public.sponsored_listings to authenticated;
grant select, insert, delete on public.user_activity to authenticated;
grant insert on public.qr_code_scans to authenticated;
grant select on public.qr_code_scans to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
grant select, insert, delete on public.recently_viewed to authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

grant execute on function public.record_user_activity(uuid, public.activity_type, text, text, jsonb) to authenticated;
grant execute on function public.record_recently_viewed(uuid, uuid) to authenticated;
grant execute on function public.get_sponsored_listings(public.sponsored_placement, int, uuid) to anon, authenticated;
