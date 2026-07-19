-- =========================================================================
-- BazarBD — Phase: Ad Promotion System (#11)
-- =========================================================================
-- A complete, admin-configurable advertisement promotion system.
--
--   1) promotion_types  — the admin-managed CATALOG of promotion products
--      (Featured Ad, Top Ad, Urgent Badge, Premium Listing, Homepage
--      Featured, Category Featured, Search Boost, Highlight Listing,
--      Homepage Banner Slot, City Spotlight, Auto Refresh, Extended
--      Visibility). Each row defines duration, pricing, priority, benefits.
--   2) ad_promotions   — actual promotions ACTIVATED on a specific ad
--      (status, window, price paid, priority snapshot, auto-refresh).
--   3) RPCs            — activate / cancel / expire / read helpers.
--
-- Convenience flags on public.ads (is_featured / is_premium / is_boosted /
-- is_urgent + *_until) are kept in sync so the existing UI keeps working.
--
-- Idempotent. Run AFTER the existing schema (01..21).
-- =========================================================================

-- -------------------------------------------------------------------------
-- Enums
-- -------------------------------------------------------------------------
do $ptype$ begin
  create type public.promotion_status as enum ('pending', 'active', 'expired', 'cancelled');
exception when duplicate_object then null;
end $ptype$;

-- -------------------------------------------------------------------------
-- 1) promotion_types — admin-configurable catalog
-- -------------------------------------------------------------------------
create table if not exists public.promotion_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  badge_label text,
  badge_color text default 'slate',          -- token consumed by the UI
  icon text,                                  -- lucide icon name
  placement text not null default 'listing',  -- where the boost applies
  priority int not null default 0,            -- higher = more prominent
  default_duration_days int not null default 7,
  price numeric not null default 0,           -- pricing placeholder
  currency text not null default 'BDT',
  benefits jsonb not null default '[]'::jsonb, -- array of benefit strings
  max_active_slots int,                        -- optional capacity (e.g. banner)
  is_slot_limited boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_promotion_types_active on public.promotion_types (is_active, sort_order);
create index if not exists idx_promotion_types_placement on public.promotion_types (placement);

comment on table public.promotion_types is
  'Admin-configurable catalog of ad promotion products (duration, price, priority, benefits).';

-- -------------------------------------------------------------------------
-- 2) ad_promotions — promotions activated on a specific ad
-- -------------------------------------------------------------------------
create table if not exists public.ad_promotions (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  promotion_type_id uuid references public.promotion_types(id) on delete set null,
  promotion_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  status public.promotion_status not null default 'active',
  priority int not null default 0,
  placement text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  duration_days int,
  price_paid numeric not null default 0,
  currency text not null default 'BDT',
  auto_refresh boolean not null default false,
  last_refreshed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ad_promotions_ad on public.ad_promotions (ad_id);
create index if not exists idx_ad_promotions_ad_status on public.ad_promotions (ad_id, status);
create index if not exists idx_ad_promotions_status_ends on public.ad_promotions (status, ends_at);
create index if not exists idx_ad_promotions_type on public.ad_promotions (promotion_type_id);
create index if not exists idx_ad_promotions_key on public.ad_promotions (promotion_key);
create index if not exists idx_ad_promotions_user on public.ad_promotions (user_id);

comment on table public.ad_promotions is
  'Promotions activated on individual ads. Convenience flags mirrored onto public.ads.';

-- -------------------------------------------------------------------------
-- updated_at triggers
-- -------------------------------------------------------------------------
create or replace function public.update_updated_at_v22()
returns trigger language plpgsql as $func$
begin
  new.updated_at = now();
  return new;
end;
$func$;

drop trigger if exists trg_promotion_types_updated_at on public.promotion_types;
create trigger trg_promotion_types_updated_at before update on public.promotion_types
  for each row execute procedure public.update_updated_at_v22();

drop trigger if exists trg_ad_promotions_updated_at on public.ad_promotions;
create trigger trg_ad_promotions_updated_at before update on public.ad_promotions
  for each row execute procedure public.update_updated_at_v22();

-- -------------------------------------------------------------------------
-- Seed the 12 promotion products (idempotent upsert; preserves admin edits
-- to price/duration/priority/active but refreshes descriptive metadata)
-- -------------------------------------------------------------------------
insert into public.promotion_types
  (key, name, description, badge_label, badge_color, icon, placement, priority, default_duration_days, price, benefits, is_slot_limited, max_active_slots, sort_order)
values
  ('featured_ad', 'Featured Ad', 'Highlight your ad across listings so it stands out from regular results.', 'Featured', 'amber', 'star', 'listing', 60, 7, 150,
    '["Featured badge on the listing","Higher placement in results","2x more views on average"]'::jsonb, false, null, 50),
  ('top_ad', 'Top Ad', 'Pin your ad to the top of its category and search results.', 'Top Ad', 'blue', 'arrow-up', 'search_results', 70, 7, 250,
    '["Top of category & search","Priority ordering","Sticky above regular ads"]'::jsonb, false, null, 40),
  ('urgent_badge', 'Urgent Badge', 'Add an eye-catching Urgent badge to signal a quick sale.', 'Urgent', 'red', 'zap', 'listing', 25, 5, 60,
    '["Bright Urgent badge","Grabs buyer attention","Encourages faster contact"]'::jsonb, false, null, 90),
  ('premium_listing', 'Premium Listing', 'A premium presentation with enhanced styling and priority everywhere.', 'Premium', 'violet', 'crown', 'listing', 80, 15, 400,
    '["Premium badge & styling","Priority in search & category","Included in premium rotations"]'::jsonb, false, null, 30),
  ('homepage_featured', 'Homepage Featured', 'Feature your ad in the homepage featured section.', 'Homepage', 'emerald', 'home', 'homepage', 90, 7, 500,
    '["Shown in homepage featured grid","Maximum marketplace exposure","Highest visibility tier"]'::jsonb, true, 24, 20),
  ('category_featured', 'Category Featured', 'Feature your ad at the top of its category landing page.', 'Cat. Featured', 'teal', 'layout-grid', 'category_page', 55, 7, 200,
    '["Featured on the category page","Top of category browsing","Category-targeted buyers"]'::jsonb, true, 12, 45),
  ('search_boost', 'Search Boost', 'Boost your ad ranking for relevant search queries.', 'Boosted', 'sky', 'trending-up', 'search_results', 45, 7, 120,
    '["Higher search ranking","More impressions on searches","Relevance boost"]'::jsonb, false, null, 55),
  ('highlight_listing', 'Highlight Listing', 'Highlight your ad with a colored background so it pops.', 'Highlighted', 'yellow', 'highlighter', 'listing', 30, 7, 80,
    '["Colored highlight background","Stands out in lists","Subtle attention boost"]'::jsonb, false, null, 70),
  ('homepage_banner', 'Homepage Banner Slot', 'A premium rotating banner slot on the homepage hero area.', 'Banner', 'rose', 'gallery-horizontal-end', 'homepage_banner', 100, 7, 1500,
    '["Rotating homepage hero banner","Top-of-funnel brand exposure","Limited premium slots"]'::jsonb, true, 6, 10),
  ('city_spotlight', 'City Spotlight', 'Spotlight your ad to buyers in a specific city / district.', 'Spotlight', 'indigo', 'map-pin', 'location', 50, 7, 180,
    '["Spotlight in your city","Location-targeted buyers","Local visibility boost"]'::jsonb, true, 20, 50),
  ('auto_refresh', 'Auto Refresh', 'Automatically bump your ad to the top periodically.', 'Auto Refresh', 'cyan', 'refresh-cw', 'listing', 10, 14, 90,
    '["Auto bump to top daily","Stays fresh in results","Set & forget renewal"]'::jsonb, false, null, 80),
  ('extended_visibility', 'Extended Visibility', 'Extend how long your ad stays live and visible.', 'Extended', 'lime', 'clock', 'listing', 15, 30, 70,
    '["Longer active lifespan","Delays expiry","Sustained visibility"]'::jsonb, false, null, 85)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  badge_label = excluded.badge_label,
  badge_color = excluded.badge_color,
  icon = excluded.icon,
  placement = excluded.placement,
  benefits = excluded.benefits,
  is_slot_limited = excluded.is_slot_limited,
  sort_order = excluded.sort_order;

-- -------------------------------------------------------------------------
-- Helper: map a promotion key -> which convenience flag it drives on ads
-- -------------------------------------------------------------------------
create or replace function public.promotion_key_flag(_key text)
returns text language sql immutable as $$
  select case _key
    when 'featured_ad'       then 'is_featured'
    when 'homepage_featured' then 'is_featured'
    when 'category_featured' then 'is_featured'
    when 'premium_listing'   then 'is_premium'
    when 'top_ad'            then 'is_boosted'
    when 'search_boost'      then 'is_boosted'
    when 'homepage_banner'   then 'is_boosted'
    when 'urgent_badge'      then 'is_urgent'
    else null
  end;
$$;

-- -------------------------------------------------------------------------
-- Sync the mirrored boolean flags + *_until columns on public.ads from the
-- currently ACTIVE promotions of a single ad.
-- -------------------------------------------------------------------------
create or replace function public.sync_ad_promotion_flags(_ad_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_featured boolean;
  v_premium  boolean;
  v_boosted  boolean;
  v_urgent   boolean;
  v_boost_until   timestamptz;
  v_premium_until timestamptz;
begin
  select
    bool_or(promotion_key_flag(promotion_key) = 'is_featured'),
    bool_or(promotion_key_flag(promotion_key) = 'is_premium'),
    bool_or(promotion_key_flag(promotion_key) = 'is_boosted'),
    bool_or(promotion_key_flag(promotion_key) = 'is_urgent'),
    max(case when promotion_key_flag(promotion_key) = 'is_boosted' then ends_at end),
    max(case when promotion_key_flag(promotion_key) = 'is_premium' then ends_at end)
  into v_featured, v_premium, v_boosted, v_urgent, v_boost_until, v_premium_until
  from public.ad_promotions
  where ad_id = _ad_id
    and status = 'active'
    and (ends_at is null or ends_at > now());

  update public.ads set
    is_featured = coalesce(v_featured, false),
    is_premium  = coalesce(v_premium, false),
    is_boosted  = coalesce(v_boosted, false),
    is_urgent   = coalesce(v_urgent, false),
    boosted_until  = v_boost_until,
    premium_until  = v_premium_until,
    updated_at = now()
  where id = _ad_id;
end;
$$;

-- -------------------------------------------------------------------------
-- Activate a promotion on an ad (owner or admin). Returns the new row.
-- -------------------------------------------------------------------------
create or replace function public.activate_ad_promotion(
  p_ad_id uuid,
  p_promotion_key text,
  p_auto_refresh boolean default false,
  p_duration_days int default null
)
returns public.ad_promotions
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_type public.promotion_types%rowtype;
  v_days int;
  v_row public.ad_promotions%rowtype;
begin
  select user_id into v_owner from public.ads where id = p_ad_id;
  if v_owner is null then
    raise exception 'ad not found' using errcode = 'P0002';
  end if;
  if v_uid is null or (v_uid <> v_owner and not public.is_admin(v_uid)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_type from public.promotion_types where key = p_promotion_key and is_active = true;
  if v_type.id is null then
    raise exception 'unknown or inactive promotion: %', p_promotion_key using errcode = '22023';
  end if;

  v_days := coalesce(p_duration_days, v_type.default_duration_days);

  insert into public.ad_promotions (
    ad_id, promotion_type_id, promotion_key, user_id, status, priority, placement,
    starts_at, ends_at, duration_days, price_paid, currency, auto_refresh, created_by
  ) values (
    p_ad_id, v_type.id, v_type.key, v_owner, 'active', v_type.priority, v_type.placement,
    now(), now() + (v_days || ' days')::interval, v_days, v_type.price, v_type.currency,
    p_auto_refresh, v_uid
  ) returning * into v_row;

  perform public.sync_ad_promotion_flags(p_ad_id);
  return v_row;
end;
$$;

-- -------------------------------------------------------------------------
-- Cancel a promotion (owner or admin).
-- -------------------------------------------------------------------------
create or replace function public.cancel_ad_promotion(p_promotion_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ad_id uuid;
  v_owner uuid;
begin
  select ap.ad_id, a.user_id into v_ad_id, v_owner
  from public.ad_promotions ap join public.ads a on a.id = ap.ad_id
  where ap.id = p_promotion_id;

  if v_ad_id is null then
    raise exception 'promotion not found' using errcode = 'P0002';
  end if;
  if v_uid is null or (v_uid <> v_owner and not public.is_admin(v_uid)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.ad_promotions
    set status = 'cancelled', ends_at = least(coalesce(ends_at, now()), now()), updated_at = now()
    where id = p_promotion_id;

  perform public.sync_ad_promotion_flags(v_ad_id);
end;
$$;

-- -------------------------------------------------------------------------
-- Expire promotions past their window (for a scheduled job). Returns count.
-- -------------------------------------------------------------------------
create or replace function public.expire_ad_promotions()
returns int
language plpgsql volatile security definer set search_path = public as $$
declare
  v_ids uuid[];
  v_count int;
begin
  select array_agg(distinct ad_id) into v_ids
  from public.ad_promotions
  where status = 'active' and ends_at is not null and ends_at <= now();

  update public.ad_promotions
    set status = 'expired', updated_at = now()
    where status = 'active' and ends_at is not null and ends_at <= now();
  get diagnostics v_count = row_count;

  if v_ids is not null then
    perform public.sync_ad_promotion_flags(x) from unnest(v_ids) as x;
  end if;
  return coalesce(v_count, 0);
end;
$$;

-- -------------------------------------------------------------------------
-- Read helper: active promotions for an ad (priority desc).
-- -------------------------------------------------------------------------
create or replace function public.get_active_ad_promotions(p_ad_id uuid)
returns setof public.ad_promotions
language sql stable security definer set search_path = public as $$
  select * from public.ad_promotions
  where ad_id = p_ad_id
    and status = 'active'
    and (ends_at is null or ends_at > now())
  order by priority desc, created_at desc;
$$;

-- -------------------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------------------
alter table public.promotion_types enable row level security;
alter table public.ad_promotions  enable row level security;

-- promotion_types: everyone reads active ones; admins read/manage all
drop policy if exists promotion_types_read on public.promotion_types;
create policy promotion_types_read on public.promotion_types
  for select using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists promotion_types_admin_write on public.promotion_types;
create policy promotion_types_admin_write on public.promotion_types
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ad_promotions: active ones are public (for badges); owner & admin see all
drop policy if exists ad_promotions_read on public.ad_promotions;
create policy ad_promotions_read on public.ad_promotions
  for select using (
    status = 'active'
    or user_id = auth.uid()
    or public.is_admin(auth.uid())
    or exists (select 1 from public.ads a where a.id = ad_id and a.user_id = auth.uid())
  );

drop policy if exists ad_promotions_insert on public.ad_promotions;
create policy ad_promotions_insert on public.ad_promotions
  for insert with check (
    public.is_admin(auth.uid())
    or exists (select 1 from public.ads a where a.id = ad_id and a.user_id = auth.uid())
  );

drop policy if exists ad_promotions_update on public.ad_promotions;
create policy ad_promotions_update on public.ad_promotions
  for all using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.ads a where a.id = ad_id and a.user_id = auth.uid())
  ) with check (
    public.is_admin(auth.uid())
    or exists (select 1 from public.ads a where a.id = ad_id and a.user_id = auth.uid())
  );

-- -------------------------------------------------------------------------
-- Grants
-- -------------------------------------------------------------------------
grant select on public.promotion_types to anon, authenticated;
grant select, insert, update, delete on public.promotion_types to authenticated;
grant select on public.ad_promotions to anon, authenticated;
grant select, insert, update, delete on public.ad_promotions to authenticated;

grant execute on function public.promotion_key_flag(text) to anon, authenticated;
grant execute on function public.sync_ad_promotion_flags(uuid) to authenticated;
grant execute on function public.activate_ad_promotion(uuid, text, boolean, int) to authenticated;
grant execute on function public.cancel_ad_promotion(uuid) to authenticated;
grant execute on function public.expire_ad_promotions() to authenticated;
grant execute on function public.get_active_ad_promotions(uuid) to anon, authenticated;

-- -------------------------------------------------------------------------
-- Register the "Ad Promotions" admin tab (grantable to limited admins)
-- -------------------------------------------------------------------------
insert into public.admin_tab_catalog (permission_key, label, section, href, sort_order) values
  ('ad_promotions', 'Ad Promotions', 'Ads', '/admin/ad-promotions', 110)
on conflict (permission_key) do update set
  label = excluded.label,
  section = excluded.section,
  href = excluded.href,
  sort_order = excluded.sort_order;
