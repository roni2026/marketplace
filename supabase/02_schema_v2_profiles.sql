-- BazarBD — Phase 2: User Profiles & Reputation
-- schema_v2_profiles.sql
-- Run after schema.sql and schema_v2_social.sql and schema_v2_trust.sql
-- Adds public profiles, seller/buyer profiles, verification badges,
-- follows, buyer reviews, profile views, and reputation metrics.
-- -------------------------------------------------------------------------

-- =========================================================================
-- 0. Ensure review_status enum exists (defined in schema_v2_social.sql)
-- =========================================================================
DO $$ BEGIN
  create type public.review_status as enum ('pending', 'approved', 'rejected', 'appealed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- 1. ALTER profiles table — add new columns
-- =========================================================================

alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists social_links jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists preferred_language text default 'en';
alter table public.profiles add column if not exists preferred_currency text default 'BDT';
alter table public.profiles add column if not exists last_active_at timestamptz default now();
alter table public.profiles add column if not exists response_rate numeric default 0;
alter table public.profiles add column if not exists avg_response_time_hours numeric default 0;
alter table public.profiles add column if not exists seller_rating numeric default 0;
alter table public.profiles add column if not exists buyer_rating numeric default 0;
alter table public.profiles add column if not exists total_sales int default 0;
alter table public.profiles add column if not exists total_purchases int default 0;
alter table public.profiles add column if not exists total_followers int default 0;
alter table public.profiles add column if not exists total_following int default 0;
alter table public.profiles add column if not exists total_reviews int default 0;
alter table public.profiles add column if not exists is_public boolean default true;

-- =========================================================================
-- 2. Verification Badges
-- =========================================================================

DO $$ BEGIN
  create type public.badge_type as enum (
  'email_verified',
  'phone_verified',
  'id_verified',
  'address_verified',
  'business_verified',
  'premium_seller',
  'top_rated',
  'trusted_buyer'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

create table if not exists public.verification_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_type public.badge_type not null,
  is_active boolean not null default true,
  awarded_at timestamptz not null default now(),
  awarded_by uuid references auth.users(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, badge_type)
);

create index if not exists idx_verification_badges_user on public.verification_badges(user_id);
create index if not exists idx_verification_badges_type on public.verification_badges(badge_type);
create index if not exists idx_verification_badges_active on public.verification_badges(is_active);

-- =========================================================================
-- 3. User Follows (general — replaces seller_followers for profile system)
-- =========================================================================

create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists idx_user_follows_follower on public.user_follows(follower_id);
create index if not exists idx_user_follows_following on public.user_follows(following_id);

-- =========================================================================
-- 4. Buyer Reviews (separate from ad reviews)
-- =========================================================================

create table if not exists public.buyer_reviews (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid references public.ads(id) on delete set null,
  rating int not null check (rating >= 1 and rating <= 5),
  title text,
  body text,
  is_verified_transaction boolean not null default false,
  helpful_count int not null default 0,
  status public.review_status not null default 'pending',
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_buyer_reviews_buyer on public.buyer_reviews(buyer_id);
create index if not exists idx_buyer_reviews_seller on public.buyer_reviews(seller_id);
create index if not exists idx_buyer_reviews_status on public.buyer_reviews(status);
create index if not exists idx_buyer_reviews_ad on public.buyer_reviews(ad_id);

-- =========================================================================
-- 5. Profile Views (analytics)
-- =========================================================================

create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  profile_user_id uuid not null references auth.users(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  viewer_ip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_views_user on public.profile_views(profile_user_id);
create index if not exists idx_profile_views_created on public.profile_views(created_at desc);

-- =========================================================================
-- 6. Profile Stats Cache (denormalized for performance)
-- =========================================================================

create table if not exists public.profile_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seller_rating numeric default 0,
  buyer_rating numeric default 0,
  total_sales int default 0,
  total_purchases int default 0,
  total_followers int default 0,
  total_following int default 0,
  total_seller_reviews int default 0,
  total_buyer_reviews int default 0,
  trust_score numeric default 50,
  response_rate numeric default 0,
  avg_response_time_hours numeric default 0,
  profile_views_30d int default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_profile_stats_trust on public.profile_stats(trust_score desc);

-- =========================================================================
-- 7. Functions
-- =========================================================================

-- Calculate seller rating from approved reviews
create or replace function public.calculate_seller_rating(target_user_id uuid)
returns numeric
language plpgsql
security definer
as $$
declare
  v_avg numeric;
begin
  select coalesce(avg(rating), 0) into v_avg
  from public.reviews
  where seller_id = target_user_id and status = 'approved';

  return round(v_avg, 2);
end;
$$;

-- Calculate buyer rating from approved buyer reviews
create or replace function public.calculate_buyer_rating(target_user_id uuid)
returns numeric
language plpgsql
security definer
as $$
declare
  v_avg numeric;
begin
  select coalesce(avg(rating), 0) into v_avg
  from public.buyer_reviews
  where buyer_id = target_user_id and status = 'approved';

  return round(v_avg, 2);
end;
$$;

-- Count total sales
create or replace function public.count_sales(target_user_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.ads
  where user_id = target_user_id and status = 'sold';

  return v_count;
end;
$$;

-- Count total purchases (ads bought by user — tracked via sold ads where buyer is known)
create or replace function public.count_purchases(target_user_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.recently_sold rs
  join public.ads a on rs.ad_id = a.id
  where a.user_id <> target_user_id
  and exists (
    select 1 from public.offers o
    where o.ad_id = rs.ad_id
    and o.buyer_id = target_user_id
    and o.status = 'accepted'
  );

  return v_count;
end;
$$;

-- Count followers
create or replace function public.count_followers(target_user_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.user_follows
  where following_id = target_user_id;

  return v_count;
end;
$$;

-- Count following
create or replace function public.count_following(target_user_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.user_follows
  where follower_id = target_user_id;

  return v_count;
end;
$$;

-- Count seller reviews
create or replace function public.count_seller_reviews(target_user_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.reviews
  where seller_id = target_user_id and status = 'approved';

  return v_count;
end;
$$;

-- Count buyer reviews
create or replace function public.count_buyer_reviews(target_user_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.buyer_reviews
  where buyer_id = target_user_id and status = 'approved';

  return v_count;
end;
$$;

-- Refresh profile stats (call after relevant changes)
create or replace function public.refresh_profile_stats(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_seller_rating numeric;
  v_buyer_rating numeric;
  v_total_sales int;
  v_total_purchases int;
  v_total_followers int;
  v_total_following int;
  v_total_seller_reviews int;
  v_total_buyer_reviews int;
  v_trust_score numeric;
  v_profile_views_30d int;
begin
  v_seller_rating := public.calculate_seller_rating(target_user_id);
  v_buyer_rating := public.calculate_buyer_rating(target_user_id);
  v_total_sales := public.count_sales(target_user_id);
  v_total_purchases := public.count_purchases(target_user_id);
  v_total_followers := public.count_followers(target_user_id);
  v_total_following := public.count_following(target_user_id);
  v_total_seller_reviews := public.count_seller_reviews(target_user_id);
  v_total_buyer_reviews := public.count_buyer_reviews(target_user_id);

  -- Trust score calculation: weighted combination
  v_trust_score := 50; -- base
  v_trust_score := v_trust_score + (v_seller_rating * 5); -- up to 25
  v_trust_score := v_trust_score + (v_buyer_rating * 2); -- up to 10
  if v_total_sales > 0 then
    v_trust_score := v_trust_score + least(v_total_sales * 0.5, 5); -- up to 5
  end if;
  if v_total_followers > 0 then
    v_trust_score := v_trust_score + least(v_total_followers * 0.2, 5); -- up to 5
  end if;
  if v_total_seller_reviews > 0 then
    v_trust_score := v_trust_score + least(v_total_seller_reviews * 0.3, 5); -- up to 5
  end if;
  v_trust_score := least(v_trust_score, 100);

  -- Profile views in last 30 days
  select count(*) into v_profile_views_30d
  from public.profile_views
  where profile_user_id = target_user_id
  and created_at >= now() - interval '30 days';

  insert into public.profile_stats (
    user_id, seller_rating, buyer_rating, total_sales, total_purchases,
    total_followers, total_following, total_seller_reviews, total_buyer_reviews,
    trust_score, profile_views_30d, updated_at
  )
  values (
    target_user_id, v_seller_rating, v_buyer_rating, v_total_sales, v_total_purchases,
    v_total_followers, v_total_following, v_total_seller_reviews, v_total_buyer_reviews,
    v_trust_score, v_profile_views_30d, now()
  )
  on conflict (user_id) do update set
    seller_rating = excluded.seller_rating,
    buyer_rating = excluded.buyer_rating,
    total_sales = excluded.total_sales,
    total_purchases = excluded.total_purchases,
    total_followers = excluded.total_followers,
    total_following = excluded.total_following,
    total_seller_reviews = excluded.total_seller_reviews,
    total_buyer_reviews = excluded.total_buyer_reviews,
    trust_score = excluded.trust_score,
    profile_views_30d = excluded.profile_views_30d,
    updated_at = now();

  -- Also update the profiles table with denormalized values
  update public.profiles set
    seller_rating = v_seller_rating,
    buyer_rating = v_buyer_rating,
    total_sales = v_total_sales,
    total_purchases = v_total_purchases,
    total_followers = v_total_followers,
    total_following = v_total_following,
    total_reviews = v_total_seller_reviews + v_total_buyer_reviews,
    updated_at = now()
  where user_id = target_user_id;
end;
$$;

-- Update last_active_at trigger
create or replace function public.update_last_active()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.profiles
  set last_active_at = now()
  where user_id = new.user_id;
  return new;
end;
$$;

-- Trigger: update last_active_at on session activity
drop trigger if exists trg_update_last_active on public.user_sessions;
create trigger trg_update_last_active
  after insert or update on public.user_sessions
  for each row
  execute function public.update_last_active();

-- Trigger: auto-refresh profile stats when a follow is created/deleted
create or replace function public.trigger_refresh_stats_on_follow()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.refresh_profile_stats(new.following_id);
  perform public.refresh_profile_stats(new.follower_id);
  return new;
end;
$$;

drop trigger if exists trg_refresh_stats_follow_insert on public.user_follows;
create trigger trg_refresh_stats_follow_insert
  after insert on public.user_follows
  for each row
  execute function public.trigger_refresh_stats_on_follow();

create or replace function public.trigger_refresh_stats_on_follow_delete()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.refresh_profile_stats(old.following_id);
  perform public.refresh_profile_stats(old.follower_id);
  return old;
end;
$$;

drop trigger if exists trg_refresh_stats_follow_delete on public.user_follows;
create trigger trg_refresh_stats_follow_delete
  after delete on public.user_follows
  for each row
  execute function public.trigger_refresh_stats_on_follow_delete();

-- Trigger: auto-refresh profile stats when a review is created
create or replace function public.trigger_refresh_stats_on_review()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.refresh_profile_stats(new.seller_id);
  return new;
end;
$$;

drop trigger if exists trg_refresh_stats_review_insert on public.reviews;
create trigger trg_refresh_stats_review_insert
  after insert on public.reviews
  for each row
  execute function public.trigger_refresh_stats_on_review();

-- Trigger: auto-refresh on buyer review
create or replace function public.trigger_refresh_stats_on_buyer_review()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.refresh_profile_stats(new.buyer_id);
  return new;
end;
$$;

drop trigger if exists trg_refresh_stats_buyer_review_insert on public.buyer_reviews;
create trigger trg_refresh_stats_buyer_review_insert
  after insert on public.buyer_reviews
  for each row
  execute function public.trigger_refresh_stats_on_buyer_review();

-- Trigger: auto-refresh on ad status change to 'sold'
create or replace function public.trigger_refresh_stats_on_ad_sold()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'sold' and (old.status is null or old.status <> 'sold') then
    perform public.refresh_profile_stats(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_refresh_stats_ad_sold on public.ads;
create trigger trg_refresh_stats_ad_sold
  after update of status on public.ads
  for each row
  execute function public.trigger_refresh_stats_on_ad_sold();

-- =========================================================================
-- 8. RLS Policies
-- =========================================================================

-- Verification badges
alter table public.verification_badges enable row level security;

DO $$ BEGIN
  create policy "Select active badges" on public.verification_badges
  for select using (is_active = true or user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Insert own badge request" on public.verification_badges
  for insert with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Update own badge" on public.verification_badges
  for update using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Admins manage badges" on public.verification_badges
  for all using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('super_admin', 'admin'))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User follows
alter table public.user_follows enable row level security;

DO $$ BEGIN
  create policy "Select follows" on public.user_follows
  for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Insert own follow" on public.user_follows
  for insert with check (follower_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Delete own follow" on public.user_follows
  for delete using (follower_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Buyer reviews
alter table public.buyer_reviews enable row level security;

DO $$ BEGIN
  create policy "Select approved buyer reviews" on public.buyer_reviews
  for select using (
    status = 'approved' or buyer_id = auth.uid() or seller_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Insert own buyer review" on public.buyer_reviews
  for insert with check (seller_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Update own buyer review" on public.buyer_reviews
  for update using (seller_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profile views
alter table public.profile_views enable row level security;

DO $$ BEGIN
  create policy "Insert profile view" on public.profile_views
  for insert with check (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Select own profile views" on public.profile_views
  for select using (profile_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Delete own profile views" on public.profile_views
  for delete using (profile_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profile stats
alter table public.profile_stats enable row level security;

DO $$ BEGIN
  create policy "Select profile stats" on public.profile_stats
  for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No insert/update/delete policies — stats are managed by security definer functions

-- =========================================================================
-- 9. Updated profiles policies (public can view non-deleted profiles)
-- =========================================================================

DO $$ BEGIN
  create policy "Public can view profiles" on public.profiles
  for select using (
    deleted_at is null and is_public = true or user_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- 10. Grants
-- =========================================================================

grant select on public.verification_badges to anon, authenticated;
grant insert, update on public.verification_badges to authenticated;

grant select on public.user_follows to anon, authenticated;
grant insert, delete on public.user_follows to authenticated;

grant select on public.buyer_reviews to anon, authenticated;
grant insert, update on public.buyer_reviews to authenticated;

grant insert on public.profile_views to anon, authenticated;
grant select, delete on public.profile_views to authenticated;

grant select on public.profile_stats to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

-- Allow authenticated to execute the public functions
grant execute on function public.calculate_seller_rating(uuid) to authenticated;
grant execute on function public.calculate_buyer_rating(uuid) to authenticated;
grant execute on function public.count_sales(uuid) to authenticated;
grant execute on function public.count_purchases(uuid) to authenticated;
grant execute on function public.count_followers(uuid) to authenticated;
grant execute on function public.count_following(uuid) to authenticated;
grant execute on function public.count_seller_reviews(uuid) to authenticated;
grant execute on function public.count_buyer_reviews(uuid) to authenticated;
grant execute on function public.refresh_profile_stats(uuid) to authenticated;
