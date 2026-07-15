-- BazarBD — Admin Access, Role Helpers & Bootstrap
-- ============================================================================
-- This file combines the old 15_adminaccess.sql, 18_fix_super_admin_access.sql,
-- and 19_admin_bootstrap_and_cloudinary_notes.sql into a single consolidated
-- script. Run this AFTER 01_core.sql through 16_permissions.sql.
--
-- It does the following:
--   1) Optionally grants super_admin + admin to a user (edit v_uid below)
--   2) Creates security-definer helper functions (is_admin, has_role, is_staff,
--      get_my_roles, am_i_admin) that bypass RLS for role checks
--   3) Sets up RLS policies on user_roles so users can read their own roles
--      without already being admin (fixes the chicken-and-egg problem)
--   4) Grants execute on all helper functions to anon + authenticated
--
-- This is SAFE to run as-is: with the placeholder UID unchanged it skips the
-- grant and only creates the helper functions + policies.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) OPTIONAL: Grant super_admin + admin to your user
--    Replace YOUR-USER-UID-HERE with your auth user UUID
--    (Supabase Dashboard → Authentication → Users → copy UUID)
-- ---------------------------------------------------------------------------
do $grant$
declare
  -- >>> REPLACE THIS with your real UUID (leave placeholder to skip) <<<
  v_uid text := 'YOUR-USER-UID-HERE';
begin
  if v_uid is null or v_uid = '' or v_uid = 'YOUR-USER-UID-HERE' then
    raise notice 'Skipping role grant — set v_uid to your auth user UUID to grant admin.';
    return;
  end if;

  insert into public.user_roles (user_id, role)
  values (v_uid::uuid, 'super_admin'::public.app_role)
  on conflict (user_id, role) do nothing;

  -- Also grant plain admin as a fallback
  begin
    insert into public.user_roles (user_id, role)
    values (v_uid::uuid, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
  exception when others then
    null;
  end;

  raise notice 'Granted super_admin + admin to %', v_uid;
end
$grant$;

-- ---------------------------------------------------------------------------
-- 2) Table privileges (403 without these)
-- ---------------------------------------------------------------------------
grant select on public.user_roles to anon, authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Security-definer helper functions
--    These bypass RLS so role checks work even before RLS policies are set up.
-- ---------------------------------------------------------------------------

-- Check if a user has a specific role
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

-- Check if a user has any admin-level role (super_admin, admin, moderator)
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

-- Check if a user has staff-level access (includes customer_support)
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

-- Client-callable: returns the current user's roles as { role: text } rows
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

-- Convenience: check if the current JWT belongs to an admin (no args)
create or replace function public.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin(auth.uid());
$$;

-- Grant execute on all helpers to both anon and authenticated
grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon;
grant execute on function public.is_admin(uuid) to authenticated, anon;
grant execute on function public.is_staff(uuid) to authenticated, anon;
grant execute on function public.get_my_roles() to authenticated, anon;
grant execute on function public.am_i_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 4) RLS policies on user_roles
--    Users must be able to read their own role rows WITHOUT already being admin.
--    This fixes the "Access Denied" loop where the app can't verify admin status
--    because RLS blocks the very query needed to confirm it.
-- ---------------------------------------------------------------------------
alter table public.user_roles enable row level security;

-- Drop any old policies that might conflict
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
-- 5) Verify (run while logged in as the user, or replace UUID)
-- ---------------------------------------------------------------------------
-- select * from public.user_roles where user_id = 'YOUR-USER-UID-HERE';
-- select public.is_admin('YOUR-USER-UID-HERE'::uuid);
-- select public.am_i_admin();  -- only works in a user JWT session
-- select * from public.get_my_roles();  -- only works in a user JWT session
