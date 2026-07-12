-- BazarBD — Phase 3: Seller & Shop Membership System
-- schema_v3_shops.sql
-- Run after schema.sql, schema_v2_social.sql, schema_v2_trust.sql,
-- schema_v2_profiles.sql, schema_v2_listings.sql, schema_v2_cms.sql, schema_v2_system.sql
-- -------------------------------------------------------------------------
-- Adds: shops, shop memberships, shop verification, shop followers,
-- shop collections, shop categories, shop coupons, shop staff,
-- shop analytics, shop policies, listing drafts, listing scheduling,
-- vacation mode, payout methods, transactions, shop reviews,
-- shop announcements, product templates, bulk import/export jobs.
-- -------------------------------------------------------------------------

-- =========================================================================
-- Enums
-- =========================================================================

create type public.shop_membership_tier as enum ('basic', 'professional', 'business', 'enterprise');

create type public.shop_verification_status as enum ('pending', 'under_review', 'approved', 'rejected', 'expired');

create type public.verification_type as enum ('business', 'identity_kyc', 'business_license');

create type public.shop_coupon_type as enum ('percentage', 'fixed_amount', 'free_shipping');

create type public.payout_method_type as enum ('bank_transfer', 'mobile_banking', 'cash_pickup', 'paypal', 'stripe');

create type public.payout_status as enum ('pending', 'processing', 'completed', 'failed', 'cancelled');

create type public.transaction_type as enum ('sale', 'refund', 'payout', 'fee', 'subscription', 'adjustment');

create type public.transaction_status as enum ('pending', 'completed', 'failed', 'refunded', 'disputed');

create type public.listing_draft_status as enum ('draft', 'scheduled', 'published', 'archived');

create type public.bulk_job_type as enum ('import', 'export');

create type public.bulk_job_status as enum ('queued', 'processing', 'completed', 'failed', 'partial');

create type public.staff_role as enum ('owner', 'manager', 'staff', 'viewer');

create type public.shop_report_period as enum ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');

-- =========================================================================
-- 1. Shops
-- =========================================================================

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  logo_url text,
  banner_url text,
  description text,
  contact_email text,
  contact_phone text,
  business_hours jsonb default '{}'::jsonb,
  location_address text,
  location_city text,
  location_division text,
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  social_links jsonb default '{}'::jsonb,
  shipping_policy text,
  return_policy text,
  refund_policy text,
  warranty_info text,
  is_verified boolean default false,
  is_featured boolean default false,
  is_premium boolean default false,
  is_vacation_mode boolean default false,
  vacation_message text,
  vacation_until timestamptz,
  announcement text,
  announcement_expires_at timestamptz,
  seo_title text,
  seo_description text,
  seo_keywords text[],
  total_followers int default 0,
  total_products int default 0,
  total_sales int default 0,
  total_revenue numeric(14,2) default 0,
  avg_rating numeric(3,2) default 0,
  total_reviews int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- 2. Shop Memberships
-- =========================================================================

create table if not exists public.shop_memberships (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tier public.shop_membership_tier not null default 'basic',
  listing_limit int not null default 50,
  is_active boolean default true,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  monthly_fee numeric(10,2) default 0,
  auto_renew boolean default false,
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id)
);

-- =========================================================================
-- 3. Shop Verification
-- =========================================================================

create table if not exists public.shop_verifications (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  verification_type public.verification_type not null,
  status public.shop_verification_status not null default 'pending',
  submitted_data jsonb default '{}'::jsonb,
  document_urls text[] default '{}',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  notes text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- 4. Shop Followers
-- =========================================================================

create table if not exists public.shop_followers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  follower_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(shop_id, follower_id)
);

-- =========================================================================
-- 5. Shop Collections (curated product groups)
-- =========================================================================

create table if not exists public.shop_collections (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  description text,
  cover_image_url text,
  is_featured boolean default false,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.shop_collections(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  unique(collection_id, ad_id)
);

-- =========================================================================
-- 6. Shop Categories (seller-defined, separate from platform categories)
-- =========================================================================

create table if not exists public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  slug text not null,
  parent_id uuid references public.shop_categories(id) on delete set null,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  unique(shop_id, slug)
);

-- =========================================================================
-- 7. Shop Coupons
-- =========================================================================

create table if not exists public.shop_coupons (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  code text not null,
  description text,
  coupon_type public.shop_coupon_type not null default 'percentage',
  value numeric(10,2) not null default 0,
  min_order_amount numeric(10,2) default 0,
  max_uses int,
  used_count int default 0,
  is_active boolean default true,
  starts_at timestamptz,
  expires_at timestamptz,
  applicable_ad_ids uuid[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, code)
);

-- =========================================================================
-- 8. Shop Staff
-- =========================================================================

create table if not exists public.shop_staff (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.staff_role not null default 'staff',
  permissions jsonb default '{}'::jsonb,
  invited_by uuid references auth.users(id) on delete set null,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(shop_id, user_id)
);

-- =========================================================================
-- 9. Shop Analytics (daily aggregate)
-- =========================================================================

create table if not exists public.shop_analytics (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  stat_date date not null default current_date,
  views int default 0,
  unique_visitors int default 0,
  inquiries int default 0,
  orders int default 0,
  conversions int default 0,
  revenue numeric(14,2) default 0,
  profit numeric(14,2) default 0,
  new_followers int default 0,
  created_at timestamptz not null default now(),
  unique(shop_id, stat_date)
);

-- =========================================================================
-- 10. Shop Reviews
-- =========================================================================

create table if not exists public.shop_reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  title text,
  body text,
  is_verified_purchase boolean default false,
  helpful_count int default 0,
  status public.review_status not null default 'pending',
  seller_reply text,
  seller_replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- 11. Listing Drafts (saved drafts, separate from published ads)
-- =========================================================================

create table if not exists public.listing_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  title text,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  price numeric,
  price_type text default 'fixed',
  condition text default 'used',
  division text,
  district text,
  area text,
  images jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  status public.listing_draft_status default 'draft',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- 12. Listing Scheduling (schedule ads to go live at future time)
-- =========================================================================

create table if not exists public.listing_schedules (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_at timestamptz not null,
  is_published boolean default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- 13. Vacation Mode (for individual sellers without shops)
-- =========================================================================

create table if not exists public.seller_vacation_modes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_active boolean default false,
  message text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- =========================================================================
-- 14. Payout Methods
-- =========================================================================

create table if not exists public.payout_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method_type public.payout_method_type not null,
  is_default boolean default false,
  is_verified boolean default false,
  -- Encrypted / tokenized details — never store raw account numbers
  details jsonb default '{}'::jsonb,
  -- Last 4 digits for display
  display_identifier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- 15. Transactions
-- =========================================================================

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  ad_id uuid references public.ads(id) on delete set null,
  transaction_type public.transaction_type not null,
  status public.transaction_status not null default 'pending',
  amount numeric(14,2) not null default 0,
  fee numeric(10,2) default 0,
  net_amount numeric(14,2) default 0,
  currency text default 'BDT',
  payment_method text,
  reference_id text,
  description text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- 16. Payouts
-- =========================================================================

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  payout_method_id uuid references public.payout_methods(id) on delete set null,
  amount numeric(14,2) not null default 0,
  fee numeric(10,2) default 0,
  net_amount numeric(14,2) default 0,
  status public.payout_status not null default 'pending',
  reference_id text,
  notes text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- 17. Product Templates (reusable listing templates for shops)
-- =========================================================================

create table if not exists public.product_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  default_title text,
  default_description text,
  default_price numeric,
  default_price_type text default 'fixed',
  default_condition text default 'used',
  default_fields jsonb default '{}'::jsonb,
  default_images jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- 18. Bulk Import/Export Jobs
-- =========================================================================

create table if not exists public.bulk_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  job_type public.bulk_job_type not null,
  status public.bulk_job_status not null default 'queued',
  file_url text,
  result_url text,
  total_rows int default 0,
  processed_rows int default 0,
  success_count int default 0,
  error_count int default 0,
  error_log jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- =========================================================================
-- 19. Shop Announcements
-- =========================================================================

create table if not exists public.shop_announcements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  title text not null,
  body text,
  type text default 'info',
  is_active boolean default true,
  starts_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- 20. Shipping & Pickup Preferences (per seller)
-- =========================================================================

create table if not exists public.seller_shipping_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  offers_shipping boolean default true,
  offers_pickup boolean default true,
  offers_delivery boolean default false,
  default_shipping_cost numeric(10,2) default 0,
  free_shipping_threshold numeric(10,2),
  shipping_regions text[] default '{}',
  pickup_address text,
  pickup_city text,
  pickup_division text,
  pickup_instructions text,
  estimated_handling_days int default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- =========================================================================
-- 21. Seller Performance Insights (per listing)
-- =========================================================================

create table if not exists public.listing_performance_insights (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stat_date date not null default current_date,
  views int default 0,
  unique_views int default 0,
  inquiries int default 0,
  offers int default 0,
  favorites int default 0,
  shares int default 0,
  conversion_rate numeric(5,2) default 0,
  created_at timestamptz not null default now(),
  unique(ad_id, stat_date)
);

-- =========================================================================
-- 22. Shop Orders (links ads to buyers for shop transactions)
-- =========================================================================

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid references public.ads(id) on delete set null,
  order_number text not null,
  status text not null default 'pending',
  payment_status text not null default 'pending',
  amount numeric(14,2) not null default 0,
  shipping_cost numeric(10,2) default 0,
  total_amount numeric(14,2) default 0,
  shipping_address jsonb,
  coupon_id uuid references public.shop_coupons(id) on delete set null,
  discount_amount numeric(10,2) default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- Indexes
-- =========================================================================

create index if not exists idx_shops_owner on public.shops(owner_id);
create index if not exists idx_shops_slug on public.shops(slug);
create index if not exists idx_shops_verified on public.shops(is_verified);
create index if not exists idx_shops_featured on public.shops(is_featured);

create index if not exists idx_shop_memberships_shop on public.shop_memberships(shop_id);
create index if not exists idx_shop_memberships_user on public.shop_memberships(user_id);
create index if not exists idx_shop_memberships_active on public.shop_memberships(is_active);

create index if not exists idx_shop_verifications_shop on public.shop_verifications(shop_id);
create index if not exists idx_shop_verifications_status on public.shop_verifications(status);

create index if not exists idx_shop_followers_shop on public.shop_followers(shop_id);
create index if not exists idx_shop_followers_follower on public.shop_followers(follower_id);

create index if not exists idx_shop_collections_shop on public.shop_collections(shop_id);
create index if not exists idx_shop_collection_items_collection on public.shop_collection_items(collection_id);

create index if not exists idx_shop_categories_shop on public.shop_categories(shop_id);

create index if not exists idx_shop_coupons_shop on public.shop_coupons(shop_id);
create index if not exists idx_shop_coupons_code on public.shop_coupons(code);

create index if not exists idx_shop_staff_shop on public.shop_staff(shop_id);
create index if not exists idx_shop_staff_user on public.shop_staff(user_id);

create index if not exists idx_shop_analytics_shop_date on public.shop_analytics(shop_id, stat_date);

create index if not exists idx_shop_reviews_shop on public.shop_reviews(shop_id);
create index if not exists idx_shop_reviews_reviewer on public.shop_reviews(reviewer_id);
create index if not exists idx_shop_reviews_status on public.shop_reviews(status);

create index if not exists idx_listing_drafts_user on public.listing_drafts(user_id);
create index if not exists idx_listing_drafts_shop on public.listing_drafts(shop_id);
create index if not exists idx_listing_drafts_status on public.listing_drafts(status);

create index if not exists idx_listing_schedules_ad on public.listing_schedules(ad_id);
create index if not exists idx_listing_schedules_user on public.listing_schedules(user_id);
create index if not exists idx_listing_schedules_scheduled on public.listing_schedules(scheduled_at);

create index if not exists idx_seller_vacation_user on public.seller_vacation_modes(user_id);

create index if not exists idx_payout_methods_user on public.payout_methods(user_id);

create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_transactions_shop on public.transactions(shop_id);
create index if not exists idx_transactions_ad on public.transactions(ad_id);
create index if not exists idx_transactions_type on public.transactions(transaction_type);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_transactions_created on public.transactions(created_at desc);

create index if not exists idx_payouts_user on public.payouts(user_id);
create index if not exists idx_payouts_shop on public.payouts(shop_id);
create index if not exists idx_payouts_status on public.payouts(status);

create index if not exists idx_product_templates_user on public.product_templates(user_id);
create index if not exists idx_product_templates_shop on public.product_templates(shop_id);

create index if not exists idx_bulk_jobs_user on public.bulk_jobs(user_id);
create index if not exists idx_bulk_jobs_shop on public.bulk_jobs(shop_id);
create index if not exists idx_bulk_jobs_status on public.bulk_jobs(status);

create index if not exists idx_shop_announcements_shop on public.shop_announcements(shop_id);

create index if not exists idx_seller_shipping_user on public.seller_shipping_preferences(user_id);

create index if not exists idx_listing_performance_ad on public.listing_performance_insights(ad_id);
create index if not exists idx_listing_performance_user on public.listing_performance_insights(user_id);
create index if not exists idx_listing_performance_date on public.listing_performance_insights(stat_date);

create index if not exists idx_shop_orders_shop on public.shop_orders(shop_id);
create index if not exists idx_shop_orders_buyer on public.shop_orders(buyer_id);
create index if not exists idx_shop_orders_status on public.shop_orders(status);

-- =========================================================================
-- Updated triggers for shops
-- =========================================================================

-- Auto-update updated_at
create or replace function public.update_updated_at_v3()
returns trigger as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$ language plpgsql;

drop trigger if exists trg_shops_updated on public.shops;
create trigger trg_shops_updated before update on public.shops
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_shop_memberships_updated on public.shop_memberships;
create trigger trg_shop_memberships_updated before update on public.shop_memberships
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_shop_verifications_updated on public.shop_verifications;
create trigger trg_shop_verifications_updated before update on public.shop_verifications
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_shop_coupons_updated on public.shop_coupons;
create trigger trg_shop_coupons_updated before update on public.shop_coupons
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_shop_staff_updated on public.shop_staff;
create trigger trg_shop_staff_updated before update on public.shop_staff
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_listing_drafts_updated on public.listing_drafts;
create trigger trg_listing_drafts_updated before update on public.listing_drafts
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_seller_vacation_updated on public.seller_vacation_modes;
create trigger trg_seller_vacation_updated before update on public.seller_vacation_modes
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_payout_methods_updated on public.payout_methods;
create trigger trg_payout_methods_updated before update on public.payout_methods
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_transactions_updated on public.transactions;
create trigger trg_transactions_updated before update on public.transactions
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_payouts_updated on public.payouts;
create trigger trg_payouts_updated before update on public.payouts
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_product_templates_updated on public.product_templates;
create trigger trg_product_templates_updated before update on public.product_templates
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_shop_announcements_updated on public.shop_announcements;
create trigger trg_shop_announcements_updated before update on public.shop_announcements
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_seller_shipping_updated on public.seller_shipping_preferences;
create trigger trg_seller_shipping_updated before update on public.seller_shipping_preferences
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_shop_reviews_updated on public.shop_reviews;
create trigger trg_shop_reviews_updated before update on public.shop_reviews
    for each row execute function public.update_updated_at_v3();

drop trigger if exists trg_shop_collections_updated on public.shop_collections;
create trigger trg_shop_collections_updated before update on public.shop_collections
    for each row execute function public.update_updated_at_v3();

-- =========================================================================
-- Functions: shop follower count, shop product count, shop rating
-- =========================================================================

create or replace function public.count_shop_followers(shop_uuid uuid)
returns int as $func$
  select count(*) from public.shop_followers where shop_id = shop_uuid;
$func$ language sql stable;

create or replace function public.count_shop_products(shop_uuid uuid)
returns int as $func$
  select count(*) from public.ads a
  join public.shop_staff ss on ss.user_id = a.user_id and ss.shop_id = shop_uuid
  where a.status in ('approved', 'boosted', 'premium')
  union all
  select count(*) from public.ads a
  join public.shops s on s.owner_id = a.user_id and s.id = shop_uuid
  where a.status in ('approved', 'boosted', 'premium');
$func$ language sql stable;

create or replace function public.calculate_shop_rating(shop_uuid uuid)
returns numeric as $func$
  select coalesce(avg(rating), 0)::numeric(3,2)
  from public.shop_reviews
  where shop_id = shop_uuid and status = 'approved';
$func$ language sql stable;

create or replace function public.refresh_shop_stats(shop_uuid uuid)
returns void as $func$
begin
  update public.shops set
    total_followers = public.count_shop_followers(shop_uuid),
    avg_rating = public.calculate_shop_rating(shop_uuid),
    total_reviews = (select count(*) from public.shop_reviews where shop_id = shop_uuid and status = 'approved')
  where id = shop_uuid;
end;
$func$ language plpgsql;

-- =========================================================================
-- RLS Policies
-- =========================================================================

-- Enable RLS on all new tables
alter table public.shops enable row level security;
alter table public.shop_memberships enable row level security;
alter table public.shop_verifications enable row level security;
alter table public.shop_followers enable row level security;
alter table public.shop_collections enable row level security;
alter table public.shop_collection_items enable row level security;
alter table public.shop_categories enable row level security;
alter table public.shop_coupons enable row level security;
alter table public.shop_staff enable row level security;
alter table public.shop_analytics enable row level security;
alter table public.shop_reviews enable row level security;
alter table public.listing_drafts enable row level security;
alter table public.listing_schedules enable row level security;
alter table public.seller_vacation_modes enable row level security;
alter table public.payout_methods enable row level security;
alter table public.transactions enable row level security;
alter table public.payouts enable row level security;
alter table public.product_templates enable row level security;
alter table public.bulk_jobs enable row level security;
alter table public.shop_announcements enable row level security;
alter table public.seller_shipping_preferences enable row level security;
alter table public.listing_performance_insights enable row level security;
alter table public.shop_orders enable row level security;

-- Helper: is_active_or_owner checks if shop is not in vacation or user is owner/staff
create or replace function public.is_active_or_owner()
returns boolean as $func$
  exists(
    select 1 from public.shops s
    where s.id = shops.id and (
      s.owner_id = auth.uid() or
      exists(select 1 from public.shop_staff ss where ss.shop_id = s.id and ss.user_id = auth.uid() and ss.is_active = true) or
      s.is_vacation_mode = false
    )
  ) or not exists(select 1 from public.shops s where s.id = shops.id)
$func$ language sql stable;

-- shops: public can view active shops; owner/staff can manage
drop policy if exists "Select active shops" on public.shops;
create policy "Select active shops" on public.shops for select using (
  is_active_or_owner()
);
drop policy if exists "Insert own shop" on public.shops;
create policy "Insert own shop" on public.shops for insert with check (owner_id = auth.uid());
drop policy if exists "Update own shop" on public.shops;
create policy "Update own shop" on public.shops for update using (
  owner_id = auth.uid() or exists(select 1 from public.shop_staff where shop_id = shops.id and user_id = auth.uid() and role in ('owner', 'manager'))
);
drop policy if exists "Delete own shop" on public.shops;
create policy "Delete own shop" on public.shops for delete using (owner_id = auth.uid());

-- shop_memberships: owner can view/manage
drop policy if exists "Select own membership" on public.shop_memberships;
create policy "Select own membership" on public.shop_memberships for select using (
  user_id = auth.uid() or exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Insert own membership" on public.shop_memberships;
create policy "Insert own membership" on public.shop_memberships for insert with check (user_id = auth.uid());
drop policy if exists "Update own membership" on public.shop_memberships;
create policy "Update own membership" on public.shop_memberships for update using (user_id = auth.uid());

-- shop_verifications: owner can view/submit; admin can view all
drop policy if exists "Select own verifications" on public.shop_verifications;
create policy "Select own verifications" on public.shop_verifications for select using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()) or
  exists(select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'super_admin', 'moderator'))
);
drop policy if exists "Insert own verifications" on public.shop_verifications;
create policy "Insert own verifications" on public.shop_verifications for insert with check (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Update verifications admin" on public.shop_verifications;
create policy "Update verifications admin" on public.shop_verifications for update using (
  exists(select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'super_admin', 'moderator'))
);

-- shop_followers: public view; users manage own follows
drop policy if exists "Select shop followers" on public.shop_followers;
create policy "Select shop followers" on public.shop_followers for select using (true);
drop policy if exists "Insert own shop follow" on public.shop_followers;
create policy "Insert own shop follow" on public.shop_followers for insert with check (follower_id = auth.uid());
drop policy if exists "Delete own shop follow" on public.shop_followers;
create policy "Delete own shop follow" on public.shop_followers for delete using (follower_id = auth.uid());
-- shop_collections: public view active; shop owner/staff manage
drop policy if exists "Select shop collections" on public.shop_collections;
create policy "Select shop collections" on public.shop_collections for select using (
  exists(select 1 from public.shops s where s.id = shop_id and (s.owner_id = auth.uid() or exists(select 1 from public.shop_staff ss where ss.shop_id = s.id and ss.user_id = auth.uid())))
);
drop policy if exists "Insert own collections" on public.shop_collections;
create policy "Insert own collections" on public.shop_collections for insert with check (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Update own collections" on public.shop_collections;
create policy "Update own collections" on public.shop_collections for update using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Delete own collections" on public.shop_collections;
create policy "Delete own collections" on public.shop_collections for delete using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);

-- shop_collection_items: same as collections
drop policy if exists "Select collection items" on public.shop_collection_items;
create policy "Select collection items" on public.shop_collection_items for select using (
  exists(select 1 from public.shop_collections sc where sc.id = collection_id and
    exists(select 1 from public.shops s where s.id = sc.shop_id and (s.owner_id = auth.uid() or exists(select 1 from public.shop_staff ss where ss.shop_id = s.id and ss.user_id = auth.uid())))
  )
);
drop policy if exists "Insert own collection items" on public.shop_collection_items;
create policy "Insert own collection items" on public.shop_collection_items for insert with check (
  exists(select 1 from public.shop_collections sc where sc.id = collection_id and
    exists(select 1 from public.shops s where s.id = sc.shop_id and s.owner_id = auth.uid())
  )
);
drop policy if exists "Delete own collection items" on public.shop_collection_items;
create policy "Delete own collection items" on public.shop_collection_items for delete using (
  exists(select 1 from public.shop_collections sc where sc.id = collection_id and
    exists(select 1 from public.shops s where s.id = sc.shop_id and s.owner_id = auth.uid())
  )
);

-- shop_categories: owner/staff manage; public view
drop policy if exists "Select shop categories" on public.shop_categories;
create policy "Select shop categories" on public.shop_categories for select using (true);
drop policy if exists "Insert own shop categories" on public.shop_categories;
create policy "Insert own shop categories" on public.shop_categories for insert with check (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Update own shop categories" on public.shop_categories;
create policy "Update own shop categories" on public.shop_categories for update using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Delete own shop categories" on public.shop_categories;
create policy "Delete own shop categories" on public.shop_categories for delete using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);

-- shop_coupons: owner/staff manage; public can view active coupons for shop
drop policy if exists "Select shop coupons" on public.shop_coupons;
create policy "Select shop coupons" on public.shop_coupons for select using (
  is_active = true or exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Insert own coupons" on public.shop_coupons;
create policy "Insert own coupons" on public.shop_coupons for insert with check (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Update own coupons" on public.shop_coupons;
create policy "Update own coupons" on public.shop_coupons for update using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Delete own coupons" on public.shop_coupons;
create policy "Delete own coupons" on public.shop_coupons for delete using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);

-- shop_staff: owner can manage; staff can view
drop policy if exists "Select shop staff" on public.shop_staff;
create policy "Select shop staff" on public.shop_staff for select using (
  user_id = auth.uid() or exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Insert shop staff" on public.shop_staff;
create policy "Insert shop staff" on public.shop_staff for insert with check (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Update shop staff" on public.shop_staff;
create policy "Update shop staff" on public.shop_staff for update using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Delete shop staff" on public.shop_staff;
create policy "Delete shop staff" on public.shop_staff for delete using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);

-- shop_analytics: owner/staff only
drop policy if exists "Select own shop analytics" on public.shop_analytics;
create policy "Select own shop analytics" on public.shop_analytics for select using (
  exists(select 1 from public.shops s where s.id = shop_id and (s.owner_id = auth.uid() or exists(select 1 from public.shop_staff ss where ss.shop_id = s.id and ss.user_id = auth.uid())))
);
drop policy if exists "Insert own shop analytics" on public.shop_analytics;
create policy "Insert own shop analytics" on public.shop_analytics for insert with check (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Update own shop analytics" on public.shop_analytics;
create policy "Update own shop analytics" on public.shop_analytics for update using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);

-- shop_reviews: public view approved; reviewer creates; shop owner can reply
drop policy if exists "Select shop reviews" on public.shop_reviews;
create policy "Select shop reviews" on public.shop_reviews for select using (
  status = 'approved' or reviewer_id = auth.uid() or
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Insert own shop review" on public.shop_reviews;
create policy "Insert own shop review" on public.shop_reviews for insert with check (reviewer_id = auth.uid());
drop policy if exists "Update own shop review" on public.shop_reviews;
create policy "Update own shop review" on public.shop_reviews for update using (
  reviewer_id = auth.uid() or
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);

-- listing_drafts: owner only
drop policy if exists "Select own drafts" on public.listing_drafts;
create policy "Select own drafts" on public.listing_drafts for select using (user_id = auth.uid());
drop policy if exists "Insert own drafts" on public.listing_drafts;
create policy "Insert own drafts" on public.listing_drafts for insert with check (user_id = auth.uid());
drop policy if exists "Update own drafts" on public.listing_drafts;
create policy "Update own drafts" on public.listing_drafts for update using (user_id = auth.uid());
drop policy if exists "Delete own drafts" on public.listing_drafts;
create policy "Delete own drafts" on public.listing_drafts for delete using (user_id = auth.uid());

-- listing_schedules: owner only
drop policy if exists "Select own schedules" on public.listing_schedules;
create policy "Select own schedules" on public.listing_schedules for select using (user_id = auth.uid());
drop policy if exists "Insert own schedules" on public.listing_schedules;
create policy "Insert own schedules" on public.listing_schedules for insert with check (user_id = auth.uid());
drop policy if exists "Update own schedules" on public.listing_schedules;
create policy "Update own schedules" on public.listing_schedules for update using (user_id = auth.uid());
drop policy if exists "Delete own schedules" on public.listing_schedules;
create policy "Delete own schedules" on public.listing_schedules for delete using (user_id = auth.uid());

-- seller_vacation_modes: owner only
drop policy if exists "Select own vacation" on public.seller_vacation_modes;
create policy "Select own vacation" on public.seller_vacation_modes for select using (user_id = auth.uid());
drop policy if exists "Insert own vacation" on public.seller_vacation_modes;
create policy "Insert own vacation" on public.seller_vacation_modes for insert with check (user_id = auth.uid());
drop policy if exists "Update own vacation" on public.seller_vacation_modes;
create policy "Update own vacation" on public.seller_vacation_modes for update using (user_id = auth.uid());
drop policy if exists "Delete own vacation" on public.seller_vacation_modes;
create policy "Delete own vacation" on public.seller_vacation_modes for delete using (user_id = auth.uid());

-- payout_methods: owner only
drop policy if exists "Select own payout methods" on public.payout_methods;
create policy "Select own payout methods" on public.payout_methods for select using (user_id = auth.uid());
drop policy if exists "Insert own payout methods" on public.payout_methods;
create policy "Insert own payout methods" on public.payout_methods for insert with check (user_id = auth.uid());
drop policy if exists "Update own payout methods" on public.payout_methods;
create policy "Update own payout methods" on public.payout_methods for update using (user_id = auth.uid());
drop policy if exists "Delete own payout methods" on public.payout_methods;
create policy "Delete own payout methods" on public.payout_methods for delete using (user_id = auth.uid());

-- transactions: owner or admin
drop policy if exists "Select own transactions" on public.transactions;
create policy "Select own transactions" on public.transactions for select using (
  user_id = auth.uid() or
  exists(select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'super_admin')) or
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Insert own transactions" on public.transactions;
create policy "Insert own transactions" on public.transactions for insert with check (user_id = auth.uid());
drop policy if exists "Update own transactions" on public.transactions;
create policy "Update own transactions" on public.transactions for update using (
  user_id = auth.uid() or
  exists(select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'super_admin'))
);

-- payouts: owner or admin
drop policy if exists "Select own payouts" on public.payouts;
create policy "Select own payouts" on public.payouts for select using (
  user_id = auth.uid() or
  exists(select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'super_admin'))
);
drop policy if exists "Insert own payouts" on public.payouts;
create policy "Insert own payouts" on public.payouts for insert with check (user_id = auth.uid());
drop policy if exists "Update own payouts" on public.payouts;
create policy "Update own payouts" on public.payouts for update using (
  user_id = auth.uid() or
  exists(select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin', 'super_admin'))
);

-- product_templates: owner only
drop policy if exists "Select own product templates" on public.product_templates;
create policy "Select own product templates" on public.product_templates for select using (user_id = auth.uid());
drop policy if exists "Insert own product templates" on public.product_templates;
create policy "Insert own product templates" on public.product_templates for insert with check (user_id = auth.uid());
drop policy if exists "Update own product templates" on public.product_templates;
create policy "Update own product templates" on public.product_templates for update using (user_id = auth.uid());
drop policy if exists "Delete own product templates" on public.product_templates;
create policy "Delete own product templates" on public.product_templates for delete using (user_id = auth.uid());

-- bulk_jobs: owner only
drop policy if exists "Select own bulk jobs" on public.bulk_jobs;
create policy "Select own bulk jobs" on public.bulk_jobs for select using (user_id = auth.uid());
drop policy if exists "Insert own bulk jobs" on public.bulk_jobs;
create policy "Insert own bulk jobs" on public.bulk_jobs for insert with check (user_id = auth.uid());
drop policy if exists "Update own bulk jobs" on public.bulk_jobs;
create policy "Update own bulk jobs" on public.bulk_jobs for update using (user_id = auth.uid());
-- shop_announcements: public view active; owner manages
drop policy if exists "Select shop announcements" on public.shop_announcements;
create policy "Select shop announcements" on public.shop_announcements for select using (
  is_active = true or exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Insert own announcements" on public.shop_announcements;
create policy "Insert own announcements" on public.shop_announcements for insert with check (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Update own announcements" on public.shop_announcements;
create policy "Update own announcements" on public.shop_announcements for update using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);
drop policy if exists "Delete own announcements" on public.shop_announcements;
create policy "Delete own announcements" on public.shop_announcements for delete using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);

-- seller_shipping_preferences: owner only
drop policy if exists "Select own shipping prefs" on public.seller_shipping_preferences;
create policy "Select own shipping prefs" on public.seller_shipping_preferences for select using (user_id = auth.uid());
drop policy if exists "Insert own shipping prefs" on public.seller_shipping_preferences;
create policy "Insert own shipping prefs" on public.seller_shipping_preferences for insert with check (user_id = auth.uid());
drop policy if exists "Update own shipping prefs" on public.seller_shipping_preferences;
create policy "Update own shipping prefs" on public.seller_shipping_preferences for update using (user_id = auth.uid());
drop policy if exists "Delete own shipping prefs" on public.seller_shipping_preferences;
create policy "Delete own shipping prefs" on public.seller_shipping_preferences for delete using (user_id = auth.uid());

-- listing_performance_insights: owner only
drop policy if exists "Select own performance" on public.listing_performance_insights;
create policy "Select own performance" on public.listing_performance_insights for select using (user_id = auth.uid());
drop policy if exists "Insert own performance" on public.listing_performance_insights;
create policy "Insert own performance" on public.listing_performance_insights for insert with check (user_id = auth.uid());
drop policy if exists "Update own performance" on public.listing_performance_insights;
create policy "Update own performance" on public.listing_performance_insights for update using (user_id = auth.uid());
-- shop_orders: shop owner and buyer
drop policy if exists "Select own shop orders" on public.shop_orders;
create policy "Select own shop orders" on public.shop_orders for select using (
  buyer_id = auth.uid() or
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()) or
  exists(select 1 from public.shop_staff ss where ss.shop_id = shop_id and ss.user_id = auth.uid() and ss.is_active = true)
);
drop policy if exists "Insert shop orders" on public.shop_orders;
create policy "Insert shop orders" on public.shop_orders for insert with check (buyer_id = auth.uid());
drop policy if exists "Update shop orders" on public.shop_orders;
create policy "Update shop orders" on public.shop_orders for update using (
  exists(select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
);

-- =========================================================================
-- Grants
-- =========================================================================

grant select on public.shops to anon, authenticated;
grant select, insert, update, delete on public.shops to authenticated;

grant select, insert, update, delete on public.shop_memberships to authenticated;

grant select, insert on public.shop_verifications to authenticated;
grant update on public.shop_verifications to authenticated;

grant select on public.shop_followers to anon, authenticated;
grant select, insert, delete on public.shop_followers to authenticated;

grant select on public.shop_collections to anon, authenticated;
grant select, insert, update, delete on public.shop_collections to authenticated;

grant select on public.shop_collection_items to anon, authenticated;
grant select, insert, delete on public.shop_collection_items to authenticated;

grant select on public.shop_categories to anon, authenticated;
grant select, insert, update, delete on public.shop_categories to authenticated;

grant select on public.shop_coupons to anon, authenticated;
grant select, insert, update, delete on public.shop_coupons to authenticated;

grant select, insert, update, delete on public.shop_staff to authenticated;

grant select, insert, update on public.shop_analytics to authenticated;

grant select on public.shop_reviews to anon, authenticated;
grant select, insert, update on public.shop_reviews to authenticated;

grant select, insert, update, delete on public.listing_drafts to authenticated;
grant select, insert, update, delete on public.listing_schedules to authenticated;
grant select, insert, update, delete on public.seller_vacation_modes to authenticated;
grant select, insert, update, delete on public.payout_methods to authenticated;
grant select, insert, update on public.transactions to authenticated;
grant select, insert, update on public.payouts to authenticated;
grant select, insert, update, delete on public.product_templates to authenticated;
grant select, insert, update on public.bulk_jobs to authenticated;
grant select on public.shop_announcements to anon, authenticated;
grant select, insert, update, delete on public.shop_announcements to authenticated;
grant select, insert, update, delete on public.seller_shipping_preferences to authenticated;
grant select, insert, update on public.listing_performance_insights to authenticated;
grant select, insert, update on public.shop_orders to authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

-- Execute functions
grant execute on function public.count_shop_followers(uuid) to authenticated;
grant execute on function public.count_shop_products(uuid) to authenticated;
grant execute on function public.calculate_shop_rating(uuid) to authenticated;
grant execute on function public.refresh_shop_stats(uuid) to authenticated;
