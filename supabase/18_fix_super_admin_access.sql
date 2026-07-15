-- BazarBD — Fix "Access Denied" for super_admin / admin
-- ============================================================================
-- Why you see Access Denied even after inserting super_admin:
--   The web app loads roles with:
--     select role from user_roles where user_id = auth.uid()
--   If RLS / grants block that SELECT, the app gets ZERO roles and denies access.
--
-- This script:
--   1) Ensures users can always read THEIR OWN roles (no chicken-and-egg)
--   2) Recreates security-definer helpers is_admin / has_role
--   3) Adds RPC get_my_roles() the client can call safely
--   4) Optionally grants super_admin to a UID you paste below
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) OPTIONAL: put your auth user UUID here, then re-run this whole file
--    Supabase → Authentication → Users → copy UUID
-- ---------------------------------------------------------------------------
do $grant$
declare
  -- >>> REPLACE THIS with your real UUID (leave placeholder to skip) <<<
  v_uid text := 'YOUR-USER-UID-HERE';
begin
  if v_uid is null or v_uid = '' or v_uid = 'YOUR-USER-UID-HERE' then
    raise notice 'skipping role grant — set v_uid to your auth user UUID';
    return;
  end if;

  insert into public.user_roles (user_id, role)
  values (v_uid::uuid, 'super_admin'::public.app_role)
  on conflict (user_id, role) do nothing;

  -- Also ensure plain admin if super_admin enum ever mismatched historically
  begin
    insert into public.user_roles (user_id, role)
    values (v_uid::uuid, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
  exception when others then
    null;
  end;

  raise notice 'granted super_admin (+ admin) to %', v_uid;
end
$grant$;

-- ---------------------------------------------------------------------------
-- 1) Table privileges (403 without these)
-- ---------------------------------------------------------------------------
grant select on public.user_roles to anon, authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Security-definer helpers (bypass RLS when checking roles server-side)
-- ---------------------------------------------------------------------------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in (
        'super_admin'::public.app_role,
        'admin'::public.app_role,
        'moderator'::public.app_role
      )
  );
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in (
        'super_admin'::public.app_role,
        'admin'::public.app_role,
        'moderator'::public.app_role,
        'customer_support'::public.app_role
      )
  );
$$;

-- Client-callable: returns the current user's roles (security definer)
-- Returns rows shaped as { role: text } so supabase-js maps them cleanly.
create or replace function public.get_my_roles()
returns table (role text)
language sql
stable
security definer
set search_path = public
as $$
  select ur.role::text as role
  from public.user_roles ur
  where ur.user_id = auth.uid();
$$;

-- Convenience boolean for the current JWT (no args — harder to misuse from client)
create or replace function public.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin(auth.uid());
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon;
grant execute on function public.is_admin(uuid) to authenticated, anon;
grant execute on function public.is_staff(uuid) to authenticated, anon;
grant execute on function public.get_my_roles() to authenticated, anon;
grant execute on function public.am_i_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 3) RLS policies — users must read own rows without needing to already be admin
-- ---------------------------------------------------------------------------
alter table public.user_roles enable row level security;

drop policy if exists "Users view own roles" on public.user_roles;
drop policy if exists "users_select_own_roles" on public.user_roles;
drop policy if exists "Admins manage roles" on public.user_roles;
drop policy if exists "admins_manage_roles" on public.user_roles;

-- Anyone authenticated can read their own role rows
create policy "users_select_own_roles"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Admins / super_admins can manage all role rows
create policy "admins_manage_roles"
  on public.user_roles
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 4) Verify (run while logged in as the user, or replace UUID)
-- ---------------------------------------------------------------------------
-- select * from public.user_roles where user_id = 'YOUR-USER-UID-HERE';
-- select public.is_admin('YOUR-USER-UID-HERE'::uuid);
-- select * from public.get_my_roles();  -- only works in a user JWT session
