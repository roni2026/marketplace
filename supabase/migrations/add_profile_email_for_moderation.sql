-- Add a synced email column to profiles so moderators/admins can see the seller's
-- email in the moderation workspace. Email lives in auth.users (not directly
-- queryable from the client), so we mirror it into public.profiles and keep it in
-- sync via triggers. Only admins/moderators can read other users' profiles under
-- existing RLS, so no additional exposure is introduced for regular users.

-- 1) Column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- 2) Backfill existing rows from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email IS DISTINCT FROM u.email;

-- 3) Populate email on signup (extends the existing handle_new_user trigger fn)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  RETURN new;
END;
$func$;

-- 4) Keep profiles.email in sync when a user's auth email changes
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  UPDATE public.profiles
  SET email = new.email, updated_at = now()
  WHERE user_id = new.id;
  RETURN new;
END;
$func$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_profile_email();
