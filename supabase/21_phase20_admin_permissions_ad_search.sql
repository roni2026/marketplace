-- =========================================================================
-- BazarBD — Phase: Admin Permissions & Universal Ad Search
-- =========================================================================
-- Adds:
--   1) Trigram + btree indexes for fast, indexed universal ad search
--   2) role_default_permissions — backend source of truth for RBAC defaults
--   3) has_app_permission(uuid, text) — backend permission check (overrides
--      then role defaults, super_admin always true)
--   4) search_ads_admin(...) — server-side universal search with auto type
--      detection, filters, sorting and pagination (SECURITY DEFINER, admin only)
--   5) admin_moderate_ad(...) — backend-enforced + audited moderation action
--   6) Tightens permission management so ONLY super_admin can grant/revoke
--
-- Safe to run multiple times (idempotent). Run AFTER 01..20.
-- =========================================================================

create extension if not exists pg_trgm;

-- -------------------------------------------------------------------------
-- 1) Search indexes (avoid full scans on large tables)
-- -------------------------------------------------------------------------
create index if not exists idx_ads_title_trgm       on public.ads using gin (title gin_trgm_ops);
create index if not exists idx_ads_slug_lower        on public.ads (lower(slug));
create index if not exists idx_ads_slug_trgm         on public.ads using gin (slug gin_trgm_ops);
create index if not exists idx_ads_contact_phone     on public.ads (contact_phone);
create index if not exists idx_ads_secondary_phone   on public.ads (secondary_phone);
create index if not exists idx_ads_status            on public.ads (status);
create index if not exists idx_ads_category          on public.ads (category_id);
create index if not exists idx_ads_subcategory       on public.ads (subcategory_id);
create index if not exists idx_ads_created_at        on public.ads (created_at desc);
create index if not exists idx_ads_user_id           on public.ads (user_id);
create index if not exists idx_ads_id_text           on public.ads (( id::text ) text_pattern_ops);

create index if not exists idx_profiles_phone        on public.profiles (phone_number);
create index if not exists idx_profiles_sec_phone    on public.profiles (secondary_phone);
create index if not exists idx_profiles_email_lower  on public.profiles (lower(email));

-- -------------------------------------------------------------------------
-- 2) Role default permissions (backend source of truth)
--    Mirrors src/lib/permissions_v2.ts ROLE_DEFAULT_PERMISSIONS.
-- -------------------------------------------------------------------------
create table if not exists public.role_default_permissions (
  role public.app_role not null,
  permission text not null,
  primary key (role, permission)
);

alter table public.role_default_permissions enable row level security;

drop policy if exists role_default_permissions_read on public.role_default_permissions;
create policy role_default_permissions_read on public.role_default_permissions
  for select to authenticated using (true);

grant select on public.role_default_permissions to authenticated, anon;

-- Seed / refresh defaults
delete from public.role_default_permissions;
insert into public.role_default_permissions (role, permission) values
  -- super_admin: everything (handled implicitly by has_app_permission, but seed key ones)
  ('super_admin','can_approve_ads'),('super_admin','can_reject_ads'),
  ('super_admin','can_delete_ads'),('super_admin','can_restore_ads'),
  ('super_admin','can_boost_ads'),('super_admin','can_edit_listings'),
  ('super_admin','can_assign_permissions'),('super_admin','can_access_audit_logs'),
  -- admin
  ('admin','can_approve_ads'),('admin','can_reject_ads'),
  ('admin','can_delete_ads'),('admin','can_restore_ads'),
  ('admin','can_boost_ads'),('admin','can_edit_listings'),
  ('admin','can_access_audit_logs'),
  -- moderator
  ('moderator','can_approve_ads'),('moderator','can_reject_ads'),
  ('moderator','can_edit_listings'),('moderator','can_access_audit_logs'),
  -- customer_support
  ('customer_support','can_access_audit_logs')
on conflict do nothing;

-- -------------------------------------------------------------------------
-- 3) Backend permission check
-- -------------------------------------------------------------------------
create or replace function public.is_super_admin(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = 'super_admin'::public.app_role
  );
$$;

create or replace function public.has_app_permission(_user_id uuid, _permission text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_override boolean;
begin
  if _user_id is null then
    return false;
  end if;

  -- Super admins can do everything
  if public.is_super_admin(_user_id) then
    return true;
  end if;

  -- Individual override wins over role defaults
  select granted into v_override
  from public.permission_overrides
  where user_id = _user_id and permission = _permission
  limit 1;

  if v_override is not null then
    return v_override;
  end if;

  -- Fall back to role defaults
  return exists (
    select 1
    from public.user_roles ur
    join public.role_default_permissions rdp on rdp.role = ur.role
    where ur.user_id = _user_id and rdp.permission = _permission
  );
end;
$$;

grant execute on function public.is_super_admin(uuid) to authenticated, anon;
grant execute on function public.has_app_permission(uuid, text) to authenticated, anon;

-- Convenience: caller variant
create or replace function public.can_i(_permission text)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.has_app_permission(auth.uid(), _permission); $$;
grant execute on function public.can_i(text) to authenticated;

-- -------------------------------------------------------------------------
-- 4) Universal ad search (server-side, indexed, paginated)
--    p_type: 'auto' | 'ad_id' | 'slug' | 'phone' | 'email' | 'title'
-- -------------------------------------------------------------------------
create or replace function public.search_ads_admin(
  p_query          text default '',
  p_type           text default 'auto',
  p_status         text[] default null,
  p_category_id    uuid default null,
  p_subcategory_id uuid default null,
  p_division       text default null,
  p_district       text default null,
  p_shop_id        uuid default null,
  p_date_from      timestamptz default null,
  p_date_to        timestamptz default null,
  p_price_min      numeric default null,
  p_price_max      numeric default null,
  p_sort           text default 'newest',
  p_limit          int default 50,
  p_offset         int default 0
)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_type      text := lower(coalesce(p_type, 'auto'));
  v_q         text := btrim(coalesce(p_query, ''));
  v_digits    text := regexp_replace(coalesce(p_query,''), '\D', '', 'g');
  v_total     bigint := 0;
  v_rows      jsonb := '[]'::jsonb;
  v_limit     int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  -- Admin-only backend gate
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Auto-detect search type when requested
  if v_type = 'auto' and v_q <> '' then
    if v_q ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
      v_type := 'email';
    elsif v_q !~ '[A-Za-z]' and length(v_digits) between 6 and 15 then
      v_type := 'phone';
    elsif v_q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_type := 'ad_id';
    elsif v_q ~* '^[a-z0-9]+(-[a-z0-9]+)+$' then
      v_type := 'slug';
    elsif v_q !~ '\s' and v_q ~ '[0-9]' then
      v_type := 'ad_id';
    else
      v_type := 'title';
    end if;
  end if;

  with base as (
    select a.*,
           p.full_name  as seller_name,
           p.email      as seller_email,
           p.phone_number as seller_phone,
           p.secondary_phone as seller_secondary_phone,
           c.name       as category_name,
           sc.name      as subcategory_name,
           (select image_url from public.ad_images ai
              where ai.ad_id = a.id order by ai.sort_order asc, ai.created_at asc limit 1) as thumbnail,
           case when v_type = 'title' and v_q <> '' then similarity(a.title, v_q) else 0 end as rank
    from public.ads a
    left join public.profiles p on p.user_id = a.user_id
    left join public.categories c on c.id = a.category_id
    left join public.subcategories sc on sc.id = a.subcategory_id
    where
      -- text query by detected type
      (
        v_q = '' or
        (v_type = 'email' and lower(p.email) = lower(v_q)) or
        (v_type = 'phone' and (
            regexp_replace(coalesce(a.contact_phone,''),   '\D','','g') like '%'||v_digits||'%' or
            regexp_replace(coalesce(a.secondary_phone,''), '\D','','g') like '%'||v_digits||'%' or
            regexp_replace(coalesce(p.phone_number,''),    '\D','','g') like '%'||v_digits||'%' or
            regexp_replace(coalesce(p.secondary_phone,''), '\D','','g') like '%'||v_digits||'%'
        )) or
        (v_type = 'slug' and (lower(a.slug) = lower(v_q) or lower(a.slug) like lower(v_q)||'%' or a.slug % v_q)) or
        (v_type = 'ad_id' and a.id::text ilike v_q||'%') or
        (v_type = 'title' and (
            a.title ilike '%'||v_q||'%' or a.title % v_q
            -- multi-keyword AND match
            or not exists (
              select 1 from regexp_split_to_table(v_q, '\s+') tok
              where tok <> '' and a.title not ilike '%'||tok||'%'
            )
        ))
      )
      -- filters
      and (p_status is null or a.status::text = any(p_status))
      and (p_category_id is null or a.category_id = p_category_id)
      and (p_subcategory_id is null or a.subcategory_id = p_subcategory_id)
      and (p_division is null or a.division = p_division)
      and (p_district is null or a.district = p_district)
      and (p_shop_id is null or a.user_id in (select owner_id from public.shops s where s.id = p_shop_id))
      and (p_date_from is null or a.created_at >= p_date_from)
      and (p_date_to is null or a.created_at <= p_date_to)
      and (p_price_min is null or a.price >= p_price_min)
      and (p_price_max is null or a.price <= p_price_max)
  ),
  counted as (select count(*) as total from base),
  page as (
    select b.*, row_number() over (
      order by
        case when p_sort = 'relevance' or (v_type = 'title' and p_sort = 'newest') then rank end desc nulls last,
        case when p_sort = 'price_high' then price end desc nulls last,
        case when p_sort = 'price_low'  then price end asc  nulls last,
        case when p_sort = 'oldest'     then created_at end asc,
        case when p_sort = 'updated'    then updated_at end desc,
        created_at desc
    ) as rn
    from base b
    order by rn
    limit v_limit offset greatest(coalesce(p_offset,0),0)
  )
  select
    (select total from counted),
    coalesce(jsonb_agg((to_jsonb(page) - 'rank' - 'rn') order by rn), '[]'::jsonb)
  into v_total, v_rows
  from page;

  return jsonb_build_object(
    'total', v_total,
    'type', v_type,
    'rows', v_rows
  );
end;
$$;

grant execute on function public.search_ads_admin(
  text, text, text[], uuid, uuid, text, text, uuid, timestamptz, timestamptz, numeric, numeric, text, int, int
) to authenticated;

-- -------------------------------------------------------------------------
-- 5) Backend-enforced + audited moderation action
--    p_action: 'approve' | 'reject' | 'delete' | 'restore' | 'boost' | 'unboost'
-- -------------------------------------------------------------------------
create or replace function public.admin_moderate_ad(
  p_ad_id  uuid,
  p_action text,
  p_reason text default null,
  p_note   text default null
)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_perm       text;
  v_action_type public.moderation_action_type;
  v_prev       jsonb;
  v_new        jsonb;
  v_role       text;
  v_name       text;
begin
  if not public.is_admin(v_uid) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- map action -> required permission + moderation action type
  case lower(p_action)
    when 'approve' then v_perm := 'can_approve_ads'; v_action_type := 'approval';
    when 'reject'  then v_perm := 'can_reject_ads';  v_action_type := 'rejection';
    when 'delete'  then v_perm := 'can_delete_ads';  v_action_type := 'suspend';
    when 'restore' then v_perm := 'can_restore_ads'; v_action_type := 'restored';
    when 'boost'   then v_perm := 'can_boost_ads';   v_action_type := 'visibility_changed';
    when 'unboost' then v_perm := 'can_boost_ads';   v_action_type := 'visibility_changed';
    else raise exception 'invalid action %', p_action using errcode = '22023';
  end case;

  if not public.has_app_permission(v_uid, v_perm) then
    raise exception 'permission denied: %', v_perm using errcode = '42501';
  end if;

  select jsonb_build_object('status', status, 'is_boosted', is_boosted) into v_prev
  from public.ads where id = p_ad_id;

  if v_prev is null then
    raise exception 'ad not found' using errcode = 'P0002';
  end if;

  case lower(p_action)
    when 'approve' then
      update public.ads set status = 'approved', updated_at = now() where id = p_ad_id;
    when 'reject' then
      update public.ads set status = 'rejected', rejection_message = coalesce(p_reason, rejection_message), updated_at = now() where id = p_ad_id;
    when 'delete' then
      update public.ads set status = 'hidden', updated_at = now() where id = p_ad_id;
    when 'restore' then
      update public.ads set status = 'approved', updated_at = now() where id = p_ad_id;
    when 'boost' then
      update public.ads set is_boosted = true, status = 'boosted', boosted_until = now() + interval '7 days', updated_at = now() where id = p_ad_id;
    when 'unboost' then
      update public.ads set is_boosted = false, status = 'approved', boosted_until = null, updated_at = now() where id = p_ad_id;
  end case;

  select jsonb_build_object('status', status, 'is_boosted', is_boosted) into v_new
  from public.ads where id = p_ad_id;

  -- resolve moderator identity for the audit trail
  select p.full_name into v_name from public.profiles p where p.user_id = v_uid;
  select string_agg(ur.role::text, ',') into v_role from public.user_roles ur where ur.user_id = v_uid;

  insert into public.moderation_actions (
    listing_id, moderator_id, moderator_name, moderator_role,
    action_type, previous_value, new_value, reason, notes, version_number
  ) values (
    p_ad_id, v_uid, v_name, v_role,
    v_action_type, v_prev, v_new, p_reason, p_note,
    coalesce((select max(version_number) from public.moderation_actions where listing_id = p_ad_id), 0) + 1
  );

  return jsonb_build_object('ok', true, 'ad_id', p_ad_id, 'action', p_action, 'new', v_new);
end;
$$;

grant execute on function public.admin_moderate_ad(uuid, text, text, text) to authenticated;

-- -------------------------------------------------------------------------
-- 6) Tighten permission management to SUPER ADMIN ONLY
--    (permission_overrides previously allowed 'admin' too)
-- -------------------------------------------------------------------------
drop policy if exists "Admins can manage permission overrides" on public.permission_overrides;
drop policy if exists "Super admins manage permission overrides" on public.permission_overrides;
create policy "Super admins manage permission overrides" on public.permission_overrides
  for all
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- keep read for admins so limited admins can see (but not change) their own set
drop policy if exists "Admins can view all permission overrides" on public.permission_overrides;
create policy "Admins can view all permission overrides" on public.permission_overrides
  for select using (public.is_admin(auth.uid()) or auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- 7) Register the "Ad Search" tab in the catalog (grantable to limited admins)
-- -------------------------------------------------------------------------
insert into public.admin_tab_catalog (permission_key, label, section, href, sort_order) values
  ('ad_search', 'Ad Search', 'Ads', '/admin/ads/search', 105)
on conflict (permission_key) do update set
  label = excluded.label,
  section = excluded.section,
  href = excluded.href,
  sort_order = excluded.sort_order;
