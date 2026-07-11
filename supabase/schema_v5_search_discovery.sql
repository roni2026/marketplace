-- BazarBD — Phase 5: Advanced Search & Discovery
-- schema_v5_search_discovery.sql
-- Run after schema.sql, schema_v2_*.sql, schema_v3_shops.sql, schema_v4_listing_management.sql
-- -------------------------------------------------------------------------
-- Adds: search history, search suggestions, search analytics, user
-- collections (wishlists), collection items, discovery sections,
-- recommendation cache, full-text search indexes, search functions.
-- -------------------------------------------------------------------------

-- =========================================================================
-- Enum additions
-- =========================================================================

do $$ begin
  create type public.collection_visibility as enum ('private', 'public');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discovery_section_type as enum (
    'featured', 'trending', 'new_arrivals', 'recently_viewed', 'most_viewed',
    'most_favorited', 'popular_near_you', 'staff_picks', 'editors_picks',
    'seasonal_collections', 'flash_deals', 'limited_time_offers',
    'recommended_stores', 'featured_brands', 'discounted', 'ending_soon',
    'recently_updated', 'sponsored'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.search_entity_type as enum ('listing', 'category', 'brand', 'model', 'seller', 'store', 'tag', 'location');
exception when duplicate_object then null; end $$;

-- =========================================================================
-- Search History (per-user search history)
-- =========================================================================

create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  query text not null,
  filters jsonb default '{}'::jsonb,
  results_count int default 0,
  clicked_ad_id uuid references public.ads(id) on delete set null,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_search_history_user on public.search_history(user_id);
create index if not exists idx_search_history_created on public.search_history(created_at desc);
create index if not exists idx_search_history_query on public.search_history using gin (to_tsvector('english', query));

-- =========================================================================
-- Search Suggestions (trending/popular searches, managed + auto-generated)
-- =========================================================================

create table if not exists public.search_suggestions (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  entity_type public.search_entity_type default 'listing',
  search_count int default 0,
  result_count int default 0,
  is_featured boolean default false,
  is_trending boolean default false,
  is_active boolean default true,
  category_id uuid references public.categories(id) on delete set null,
  icon text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (term, entity_type)
);

create index if not exists idx_search_suggestions_term on public.search_suggestions(term);
create index if not exists idx_search_suggestions_trending on public.search_suggestions(is_trending) where is_trending = true;
create index if not exists idx_search_suggestions_featured on public.search_suggestions(is_featured) where is_featured = true;
create index if not exists idx_search_suggestions_count on public.search_suggestions(search_count desc);

-- =========================================================================
-- Search Analytics (track search performance and user behavior)
-- =========================================================================

create table if not exists public.search_analytics (
  id uuid primary key default gen_random_uuid(),
  search_term text not null,
  user_id uuid references auth.users(id) on delete set null,
  results_count int default 0,
  has_results boolean default true,
  clicked_result boolean default false,
  clicked_ad_id uuid references public.ads(id) on delete set null,
  response_time_ms int,
  filters jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_search_analytics_term on public.search_analytics(search_term);
create index if not exists idx_search_analytics_created on public.search_analytics(created_at desc);
create index if not exists idx_search_analytics_no_results on public.search_analytics(has_results) where has_results = false;

-- =========================================================================
-- User Collections (wishlists / custom collections)
-- =========================================================================

create table if not exists public.user_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  visibility public.collection_visibility default 'private',
  cover_image_url text,
  is_default boolean default false,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_collections_user on public.user_collections(user_id);
create index if not exists idx_user_collections_public on public.user_collections(visibility) where visibility = 'public';

-- =========================================================================
-- Collection Items (listings saved to collections)
-- =========================================================================

create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.user_collections(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notes text,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  unique (collection_id, ad_id)
);

create index if not exists idx_collection_items_collection on public.collection_items(collection_id);
create index if not exists idx_collection_items_user on public.collection_items(user_id);
create index if not exists idx_collection_items_ad on public.collection_items(ad_id);

-- =========================================================================
-- Discovery Sections (configurable discovery sections for the homepage)
-- =========================================================================

create table if not exists public.discovery_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  section_type public.discovery_section_type not null,
  subtitle text,
  icon text,
  is_active boolean default true,
  sort_order int default 0,
  config jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_discovery_sections_active on public.discovery_sections(is_active, sort_order);

-- =========================================================================
-- Recommendation Cache (cached recommendations per user)
-- =========================================================================

create table if not exists public.recommendation_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_type text not null,
  ad_id uuid references public.ads(id) on delete cascade,
  score numeric default 0,
  reason text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz default now() + interval '24 hours'
);

create index if not exists idx_recommendation_cache_user on public.recommendation_cache(user_id, recommendation_type);
create index if not exists idx_recommendation_cache_expires on public.recommendation_cache(expires_at);

-- =========================================================================
-- Price Drop Alerts (extended for Phase 5 notifications)
-- =========================================================================

-- Already exists from v2, but we add a notification_sent flag
alter table public.price_drop_alerts
  add column if not exists notification_sent boolean default false,
  add column if not exists last_checked_at timestamptz;

-- =========================================================================
-- Full-Text Search Indexes on ads table
-- =========================================================================

-- Create a generated tsvector column for full-text search
-- This enables fast text search across title, description, brand, model, tags
do $$ begin
  alter table public.ads
    add column if not exists search_vector tsvector
    generated always as (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(brand, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(model, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'D')
    ) stored;
exception when duplicate_column then null; end $$;

create index if not exists idx_ads_search_vector on public.ads using gin (search_vector);

-- Additional indexes for search performance
create index if not exists idx_ads_title_trgm on public.ads using gin (title gin_trgm_ops);
create index if not exists idx_ads_brand_trgm on public.ads using gin (brand gin_trgm_ops);
create index if not exists idx_ads_model_trgm on public.ads using gin (model gin_trgm_ops);

-- Enable pg_trgm extension for trigram-based fuzzy search
create extension if not exists pg_trgm;

-- =========================================================================
-- Updated At trigger for new tables
-- =========================================================================

create or replace function public.update_updated_at_v5()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger if not exists trg_search_suggestions_updated_at
  before update on public.search_suggestions
  for each row execute procedure public.update_updated_at_v5();

create trigger if not exists trg_user_collections_updated_at
  before update on public.user_collections
  for each row execute procedure public.update_updated_at_v5();

create trigger if not exists trg_discovery_sections_updated_at
  before update on public.discovery_sections
  for each row execute procedure public.update_updated_at_v5();

-- =========================================================================
-- Function: record_search (track search analytics + increment suggestion count)
-- =========================================================================

create or replace function public.record_search(
  p_search_term text,
  p_user_id uuid default null,
  p_results_count int default 0,
  p_response_time_ms int default null,
  p_filters jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert into search analytics
  insert into public.search_analytics (search_term, user_id, results_count, has_results, response_time_ms, filters)
  values (p_search_term, p_user_id, p_results_count, p_results_count > 0, p_response_time_ms, p_filters);

  -- Update or create search suggestion count
  insert into public.search_suggestions (term, entity_type, search_count, result_count)
  values (p_search_term, 'listing', 1, p_results_count)
  on conflict (term, entity_type) do update
  set search_count = public.search_suggestions.search_count + 1,
      result_count = public.search_suggestions.result_count + p_results_count,
      updated_at = now();

  -- Insert into user's search history if authenticated
  if p_user_id is not null then
    insert into public.search_history (user_id, query, results_count, filters)
    values (p_user_id, p_search_term, p_results_count, p_filters);
  end if;
end;
$$;

-- =========================================================================
-- Function: get_search_suggestions (autocomplete suggestions)
-- =========================================================================

create or replace function public.get_search_suggestions(
  p_query text,
  p_limit int default 10
)
returns table (
  term text,
  entity_type public.search_entity_type,
  search_count int,
  is_trending boolean,
  is_featured boolean,
  icon text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    ss.term,
    ss.entity_type,
    ss.search_count,
    ss.is_trending,
    ss.is_featured,
    ss.icon
  from public.search_suggestions ss
  where ss.is_active = true
    and (p_query = '' or similarity(ss.term, p_query) > 0.1 or ss.term ilike '%' || p_query || '%')
  order by
    case when ss.is_featured then 0 else 1 end,
    case when ss.is_trending then 0 else 1 end,
    ss.search_count desc
  limit p_limit;
end;
$$;

-- =========================================================================
-- Function: get_trending_searches
-- =========================================================================

create or replace function public.get_trending_searches(
  p_limit int default 10
)
returns table (
  term text,
  search_count int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    sa.search_term as term,
    count(*)::int as search_count
  from public.search_analytics sa
  where sa.created_at > now() - interval '7 days'
    and sa.search_term != ''
  group by sa.search_term
  order by search_count desc
  limit p_limit;
end;
$$;

-- =========================================================================
-- Function: get_personalized_recommendations
-- =========================================================================

create or replace function public.get_personalized_recommendations(
  p_user_id uuid,
  p_limit int default 12
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
  score numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with user_favorites as (
    select a.category_id, a.brand, a.division
    from public.favorites f
    join public.ads a on a.id = f.ad_id
    where f.user_id = p_user_id
    limit 50
  ),
  user_views as (
    select a.category_id, a.brand
    from public.search_history sh
    join public.ads a on a.id = sh.clicked_ad_id
    where sh.user_id = p_user_id and sh.clicked_ad_id is not null
    limit 50
  ),
  preferred_categories as (
    select category_id from user_favorites where category_id is not null
    union
    select category_id from user_views where category_id is not null
  ),
  preferred_brands as (
    select brand from user_favorites where brand is not null
    union
    select brand from user_views where brand is not null
  )
  select
    a.id,
    a.title,
    a.slug,
    a.price,
    a.price_type,
    a.condition,
    a.division,
    a.district,
    a.is_featured,
    a.is_premium,
    a.is_boosted,
    coalesce(a.views_count, 0),
    coalesce(a.favorites_count, 0),
    a.created_at,
    (
      case when a.category_id in (select category_id from preferred_categories) then 10 else 0 end +
      case when a.brand in (select brand from preferred_brands) then 5 else 0 end +
      case when a.is_featured then 3 else 0 end +
      case when a.is_boosted then 2 else 0 end +
      case when a.is_premium then 2 else 0 end +
      (coalesce(a.views_count, 0) * 0.001) +
      (coalesce(a.favorites_count, 0) * 0.01)
    ) as score
  from public.ads a
  where a.status in ('approved', 'boosted', 'premium')
    and a.deleted_at is null
    and a.id not in (select ad_id from public.favorites where user_id = p_user_id)
  order by score desc, a.created_at desc
  limit p_limit;
end;
$$;

-- =========================================================================
-- Function: get_discovery_listings
-- =========================================================================

create or replace function public.get_discovery_listings(
  p_section_type public.discovery_section_type,
  p_limit int default 12,
  p_user_id uuid default null
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
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    a.id, a.title, a.slug, a.price, a.price_type, a.condition,
    a.division, a.district, a.is_featured, a.is_premium, a.is_boosted,
    coalesce(a.views_count, 0), coalesce(a.favorites_count, 0),
    a.created_at, a.updated_at
  from public.ads a
  where a.status in ('approved', 'boosted', 'premium')
    and a.deleted_at is null
  order by
    case p_section_type
      when 'featured' then case when a.is_featured then 0 else 1 end
      when 'trending' then coalesce(a.favorites_count, 0) desc
      when 'new_arrivals' then a.created_at desc
      when 'most_viewed' then coalesce(a.views_count, 0) desc
      when 'most_favorited' then coalesce(a.favorites_count, 0) desc
      when 'recently_updated' then a.updated_at desc
      when 'discounted' then coalesce(a.discount_percentage, 0) desc
      else a.created_at desc
    end
  limit p_limit;
end;
$$;

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.search_history enable row level security;
alter table public.search_suggestions enable row level security;
alter table public.search_analytics enable row level security;
alter table public.user_collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.discovery_sections enable row level security;
alter table public.recommendation_cache enable row level security;

-- Search history: only owner
create policy "Users view own search history" on public.search_history for select
  using (user_id = auth.uid());
create policy "Users insert own search history" on public.search_history for insert
  with check (user_id = auth.uid() or user_id is null);
create policy "Users delete own search history" on public.search_history for delete
  using (user_id = auth.uid());

-- Search suggestions: public read, admin write
create policy "Public can view search suggestions" on public.search_suggestions for select using (true);
create policy "Admins manage search suggestions" on public.search_suggestions for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Search analytics: admin read, system insert
create policy "Admins view search analytics" on public.search_analytics for select
  using (public.is_admin(auth.uid()));
create policy "System inserts search analytics" on public.search_analytics for insert with check (true);

-- User collections: owner manages, public can view public collections
create policy "Users view own collections" on public.user_collections for select
  using (user_id = auth.uid() or visibility = 'public');
create policy "Users create own collections" on public.user_collections for insert
  with check (user_id = auth.uid());
create policy "Users update own collections" on public.user_collections for update
  using (user_id = auth.uid());
create policy "Users delete own collections" on public.user_collections for delete
  using (user_id = auth.uid());

-- Collection items: owner manages, public can view items in public collections
create policy "Users view own collection items" on public.collection_items for select
  using (
    user_id = auth.uid() or
    exists (
      select 1 from public.user_collections uc
      where uc.id = collection_items.collection_id and uc.visibility = 'public'
    )
  );
create policy "Users create own collection items" on public.collection_items for insert
  with check (user_id = auth.uid());
create policy "Users delete own collection items" on public.collection_items for delete
  using (user_id = auth.uid());

-- Discovery sections: public read, admin write
create policy "Public can view discovery sections" on public.discovery_sections for select using (true);
create policy "Admins manage discovery sections" on public.discovery_sections for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Recommendation cache: only owner
create policy "Users view own recommendations" on public.recommendation_cache for select
  using (user_id = auth.uid());
create policy "System inserts recommendations" on public.recommendation_cache for insert with check (true);
create policy "System deletes recommendations" on public.recommendation_cache for delete using (true);

-- =========================================================================
-- GRANT permissions
-- =========================================================================

grant select, insert, delete on public.search_history to authenticated;
grant select on public.search_suggestions to anon, authenticated;
grant select, insert, update, delete on public.search_suggestions to authenticated;
grant select on public.search_analytics to authenticated;
grant insert on public.search_analytics to authenticated;
grant select, insert, update, delete on public.user_collections to authenticated;
grant select, insert, delete on public.collection_items to authenticated;
grant select on public.discovery_sections to anon, authenticated;
grant select, insert, update, delete on public.discovery_sections to authenticated;
grant select on public.recommendation_cache to authenticated;
grant insert on public.recommendation_cache to authenticated;
grant delete on public.recommendation_cache to authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

grant execute on function public.record_search(text, uuid, int, int, jsonb) to authenticated;
grant execute on function public.get_search_suggestions(text, int) to anon, authenticated;
grant execute on function public.get_trending_searches(int) to anon, authenticated;
grant execute on function public.get_personalized_recommendations(uuid, int) to authenticated;
grant execute on function public.get_discovery_listings(public.discovery_section_type, int, uuid) to anon, authenticated;

-- =========================================================================
-- Seed default discovery sections
-- =========================================================================

insert into public.discovery_sections (title, section_type, subtitle, icon, is_active, sort_order) values
  ('Featured Listings', 'featured', 'Handpicked listings by our team', 'star', true, 1),
  ('New Arrivals', 'new_arrivals', 'Latest listings on BazarBD', 'sparkles', true, 2),
  ('Trending Now', 'trending', 'Most popular listings this week', 'trending-up', true, 3),
  ('Most Viewed', 'most_viewed', 'Listings everyone is looking at', 'eye', true, 4),
  ('Most Favorited', 'most_favorited', 'Top saved listings', 'heart', true, 5),
  ('Flash Deals', 'flash_deals', 'Limited-time offers', 'zap', true, 6),
  ('Discounted Products', 'discounted', 'Items with great discounts', 'percent', true, 7),
  ('Recently Updated', 'recently_updated', 'Recently updated listings', 'refresh-cw', true, 8),
  ('Staff Picks', 'staff_picks', 'Our team favorites', 'award', true, 9),
  ('Featured Brands', 'featured_brands', 'Top brands on BazarBD', 'tag', true, 10)
on conflict do nothing;

-- Seed some initial search suggestions
insert into public.search_suggestions (term, entity_type, search_count, is_featured, is_trending, is_active) values
  ('iPhone', 'listing', 1000, true, true, true),
  ('Samsung Galaxy', 'listing', 800, true, true, true),
  ('Laptop', 'listing', 600, false, true, true),
  ('Motorcycle', 'listing', 500, false, true, true),
  ('Flat for Rent', 'listing', 400, false, true, true),
  ('Furniture', 'listing', 300, false, false, true),
  ('Electronics', 'category', 200, true, false, true),
  ('Vehicles', 'category', 180, true, false, true),
  ('Fashion', 'category', 150, false, false, true),
  ('Apple', 'brand', 250, true, true, true),
  ('Samsung', 'brand', 200, true, true, true),
  ('Xiaomi', 'brand', 120, false, true, true)
on conflict (term, entity_type) do nothing;
