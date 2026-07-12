-- BazarBD — Grant admin access to a user
-- -------------------------------------------------------------------------
-- This file is SAFE to run as-is: with the placeholder left unchanged it
-- does nothing (raises a NOTICE) instead of throwing an error.
--
-- To actually grant admin access:
--   Step 1: Find your User UID in Supabase Dashboard → Authentication → Users
--   Step 2: Replace YOUR-USER-UID-HERE below with your actual UID
--   Step 3: Re-run this file in Supabase Dashboard → SQL Editor
-- -------------------------------------------------------------------------

do $admin$
declare
  v_uid text := 'YOUR-USER-UID-HERE';   -- <== replace with your auth user UID
  v_role public.app_role := 'super_admin';  -- or 'admin'
begin
  -- Skip safely if the placeholder has not been replaced with a real UUID.
  if v_uid = 'YOUR-USER-UID-HERE' then
    raise notice 'adminaccess: placeholder UID not replaced — skipping. Edit v_uid and re-run.';
    return;
  end if;

  insert into public.user_roles (user_id, role)
  values (v_uid::uuid, v_role)
  on conflict (user_id, role) do nothing;

  raise notice 'adminaccess: granted % to %', v_role, v_uid;
end
$admin$;

-- Verify (returns nothing while the placeholder is unchanged):
-- SELECT * FROM public.user_roles WHERE user_id = 'YOUR-USER-UID-HERE';

-- -------------------------------------------------------------------------
-- ALSO run 16_fix_permissions.sql to grant table access to anon/authenticated
-- roles. Without those GRANTs, the client gets 403 "permission denied".
-- -------------------------------------------------------------------------
