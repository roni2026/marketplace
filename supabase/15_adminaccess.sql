-- BazarBD — Grant admin access to a user
-- -------------------------------------------------------------------------
-- Step 1: Find your User UID in Supabase Dashboard → Authentication → Users
-- Step 2: Replace YOUR-USER-UID-HERE below with your actual UID
-- Step 3: Run this in Supabase Dashboard → SQL Editor
-- -------------------------------------------------------------------------

-- Grant super_admin role (highest access — everything including managing other admins)
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR-USER-UID-HERE', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Or grant admin role (full access except managing other admins)
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('YOUR-USER-UID-HERE', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the role was inserted
SELECT * FROM public.user_roles WHERE user_id = 'YOUR-USER-UID-HERE';

-- -------------------------------------------------------------------------
-- ALSO run fix_permissions.sql to grant table access to anon/authenticated
-- roles. Without those GRANTs, the client gets 403 "permission denied".
-- -------------------------------------------------------------------------
