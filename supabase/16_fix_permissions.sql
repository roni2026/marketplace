-- BazarBD — Fix all table permissions
-- -------------------------------------------------------------------------
-- Run this in Supabase Dashboard → SQL Editor to fix 403 "permission denied"
-- errors on all tables. This grants the minimum required permissions for
-- the anon role (unauthenticated/public reads) and authenticated role
-- (logged-in users: read public data + read/write own data).
--
-- RLS policies still control WHICH rows each user can see — these GRANTs
-- only allow the query to reach the table at all.
-- --------------------------------------------------------------------------

-- Categories & subcategories: public read
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.subcategories TO anon, authenticated;

-- Profiles: public read, authenticated write own
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- User roles: authenticated can read/write own, anon can read
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;

-- Ads: public read, authenticated write own
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT SELECT ON public.ads TO anon;

-- Ad images
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_images TO authenticated;
GRANT SELECT ON public.ad_images TO anon;

-- Favorites: authenticated only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;

-- Reports: authenticated can create and read own
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;

-- Audit logs: authenticated can insert, admins can read
GRANT INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Notifications
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- Messages
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;

-- Saved searches
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;

-- Offers
GRANT SELECT, INSERT, UPDATE ON public.offers TO authenticated;

-- Support tickets
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;

-- User sessions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;

-- Login attempts
GRANT INSERT ON public.login_attempts TO authenticated;
GRANT SELECT ON public.login_attempts TO authenticated;

-- Ad stats
GRANT SELECT, INSERT ON public.ad_stats TO authenticated;

-- Sequences (Needed for INSERT)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;

-- Verify it worked (should show granted = true for anon and authenticated)
SELECT tablename, has_table_privilege('anon', 'public.' || tablename, 'SELECT') as anon_can_select,
       has_table_privilege('authenticated', 'public.' || tablename, 'SELECT') as auth_can_select
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;