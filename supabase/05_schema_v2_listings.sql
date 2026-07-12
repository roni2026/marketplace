-- BazarBD — Advanced Listing Features, Location & Media Management Schema
-- -------------------------------------------------------------------------
-- Adds: listing variants, templates, price history, price drop alerts,
-- ad media (image/video/360), ad locations, regions, cities,
-- media library, image optimizations.
-- Review RLS policies carefully before running against production.
-- -------------------------------------------------------------------------

-- Enums
DO $$ BEGIN
    create type public.media_type as enum ('image', 'video', '360');
exception when duplicate_object then null; end $$;

DO $$ BEGIN
    create type public.condition_grade as enum ('new', 'like_new', 'good', 'fair', 'poor');
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------------
-- Listing Variants (size, color, etc.)
-- -------------------------------------------------------------------------
create table if not exists public.listing_variants (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  name text not null,
  sku text,
  barcode text,
  serial_number text,
  price numeric,
  stock int default 0,
  attributes jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Listing Templates
-- -------------------------------------------------------------------------
create table if not exists public.listing_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  default_fields jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Price History
-- -------------------------------------------------------------------------
create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  old_price numeric,
  new_price numeric,
  changed_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Price Drop Alerts
-- -------------------------------------------------------------------------
create table if not exists public.price_drop_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  target_price numeric not null,
  notified boolean default false,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Ad Media (image, video, 360)
-- -------------------------------------------------------------------------
create table if not exists public.ad_media (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  media_type public.media_type not null default 'image',
  url text not null,
  thumbnail_url text,
  sort_order int default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Ad Locations (GPS coordinates, address, pickup points)
-- -------------------------------------------------------------------------
create table if not exists public.ad_locations (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  address text,
  city text,
  region text,
  pickup_points jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Regions (top-level geographic divisions)
-- -------------------------------------------------------------------------
create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.regions(id) on delete set null,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Cities (within regions)
-- -------------------------------------------------------------------------
create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions(id) on delete cascade,
  name text not null,
  slug text not null unique,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Media Library (user-level reusable media)
-- -------------------------------------------------------------------------
create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  url text not null,
  thumbnail_url text,
  file_size bigint,
  mime_type text,
  width int,
  height int,
  hash text,
  duplicate_of uuid references public.media_library(id) on delete set null,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Image Optimizations (optimized variants of media library items)
-- -------------------------------------------------------------------------
create table if not exists public.image_optimizations (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media_library(id) on delete cascade,
  optimized_url text not null,
  width int,
  height int,
  quality int,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Indexes
-- -------------------------------------------------------------------------
create index if not exists idx_listing_variants_ad_id on public.listing_variants(ad_id);
create index if not exists idx_listing_templates_user_id on public.listing_templates(user_id);
create index if not exists idx_price_history_ad_id on public.price_history(ad_id);
create index if not exists idx_price_drop_alerts_user_id on public.price_drop_alerts(user_id);
create index if not exists idx_price_drop_alerts_ad_id on public.price_drop_alerts(ad_id);
create index if not exists idx_ad_media_ad_id on public.ad_media(ad_id);
create index if not exists idx_ad_locations_ad_id on public.ad_locations(ad_id);
create index if not exists idx_cities_region_id on public.cities(region_id);
create index if not exists idx_media_library_user_id on public.media_library(user_id);
create index if not exists idx_media_library_hash on public.media_library(hash);
create index if not exists idx_image_optimizations_media_id on public.image_optimizations(media_id);

-- -------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------
alter table public.listing_variants enable row level security;
alter table public.listing_templates enable row level security;
alter table public.price_history enable row level security;
alter table public.price_drop_alerts enable row level security;
alter table public.ad_media enable row level security;
alter table public.ad_locations enable row level security;
alter table public.regions enable row level security;
alter table public.cities enable row level security;
alter table public.media_library enable row level security;
alter table public.image_optimizations enable row level security;

-- Listing variants: owner of the ad can manage; public can view
DO $$ BEGIN
  create policy "Public can view listing variants" on public.listing_variants for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Ad owner manages variants" on public.listing_variants for all
  using (exists (select 1 from public.ads where ads.id = listing_variants.ad_id and ads.user_id = auth.uid()))
  with check (exists (select 1 from public.ads where ads.id = listing_variants.ad_id and ads.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Listing templates: only owner
DO $$ BEGIN
  create policy "Users manage own templates" on public.listing_templates for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Price history: public can view, ad owner can insert
DO $$ BEGIN
  create policy "Public can view price history" on public.price_history for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Ad owner inserts price history" on public.price_history for insert
  with check (exists (select 1 from public.ads where ads.id = price_history.ad_id and ads.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Price drop alerts: only owner
DO $$ BEGIN
  create policy "Users manage own price drop alerts" on public.price_drop_alerts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ad media: public can view, ad owner can manage
DO $$ BEGIN
  create policy "Public can view ad media" on public.ad_media for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Ad owner manages media" on public.ad_media for all
  using (exists (select 1 from public.ads where ads.id = ad_media.ad_id and ads.user_id = auth.uid()))
  with check (exists (select 1 from public.ads where ads.id = ad_media.ad_id and ads.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ad locations: public can view, ad owner can manage
DO $$ BEGIN
  create policy "Public can view ad locations" on public.ad_locations for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Ad owner manages locations" on public.ad_locations for all
  using (exists (select 1 from public.ads where ads.id = ad_locations.ad_id and ads.user_id = auth.uid()))
  with check (exists (select 1 from public.ads where ads.id = ad_locations.ad_id and ads.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Regions: public read, admin write
DO $$ BEGIN
  create policy "Public can view regions" on public.regions for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Admins manage regions" on public.regions for all
  using (exists (select 1 from public.user_roles where user_roles.user_id = auth.uid() and user_roles.role in ('super_admin', 'admin')))
  with check (exists (select 1 from public.user_roles where user_roles.user_id = auth.uid() and user_roles.role in ('super_admin', 'admin')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cities: public read, admin write
DO $$ BEGIN
  create policy "Public can view cities" on public.cities for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Admins manage cities" on public.cities for all
  using (exists (select 1 from public.user_roles where user_roles.user_id = auth.uid() and user_roles.role in ('super_admin', 'admin')))
  with check (exists (select 1 from public.user_roles where user_roles.user_id = auth.uid() and user_roles.role in ('super_admin', 'admin')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Media library: only owner
DO $$ BEGIN
  create policy "Users manage own media library" on public.media_library for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Image optimizations: owner of the media item
DO $$ BEGIN
  create policy "Users manage own image optimizations" on public.image_optimizations for all
  using (exists (select 1 from public.media_library where media_library.id = image_optimizations.media_id and media_library.user_id = auth.uid()))
  with check (exists (select 1 from public.media_library where media_library.id = image_optimizations.media_id and media_library.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -------------------------------------------------------------------------
-- Storage buckets (create via Supabase dashboard or CLI)
--   ad-media   — public bucket for ad images, videos, 360 media
--   media-library — public bucket for user media library
-- -------------------------------------------------------------------------
