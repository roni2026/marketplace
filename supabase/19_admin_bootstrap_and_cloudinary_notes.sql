-- BazarBD — Admin bootstrap + notes for Cloudinary
-- Run in Supabase SQL Editor after setting your UUID below.

do $grant$
declare
  -- >>> PASTE your auth user UUID from Authentication → Users <<<
  v_uid text := 'YOUR-USER-UID-HERE';
begin
  if v_uid is null or v_uid = '' or v_uid = 'YOUR-USER-UID-HERE' then
    raise notice 'Set v_uid to your UUID, then re-run.';
    return;
  end if;

  insert into public.user_roles (user_id, role)
  values (v_uid::uuid, 'super_admin'::public.app_role)
  on conflict (user_id, role) do nothing;

  insert into public.user_roles (user_id, role)
  values (v_uid::uuid, 'admin'::public.app_role)
  on conflict (user_id, role) do nothing;

  raise notice 'Granted super_admin + admin to %', v_uid;
end
$grant$;

-- Ensure helpers exist and are executable by the browser client
grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon;
grant execute on function public.is_admin(uuid) to authenticated, anon;
grant execute on function public.is_staff(uuid) to authenticated, anon;

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

create or replace function public.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in (
        'super_admin'::public.app_role,
        'admin'::public.app_role,
        'moderator'::public.app_role
      )
  );
$$;

grant execute on function public.get_my_roles() to authenticated, anon;
grant execute on function public.am_i_admin() to authenticated, anon;

-- Own-row SELECT must work without already being admin
alter table public.user_roles enable row level security;
drop policy if exists "users_select_own_roles" on public.user_roles;
create policy "users_select_own_roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

grant select on public.user_roles to authenticated, anon;

-- Verify:
-- select * from public.user_roles where user_id = 'YOUR-UUID';
-- select public.is_admin('YOUR-UUID'::uuid);
-- select public.am_i_admin();  -- while logged in as that user
