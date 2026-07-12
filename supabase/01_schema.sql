-- BazarBD — Enterprise Supabase schema
-- -------------------------------------------------------------------------
-- Upgraded schema with audit logs, notifications, messages, offers,
-- support tickets, saved searches, session management, and analytics.
-- Review RLS policies carefully before running against production.
-- -------------------------------------------------------------------------

-- Enums
create type public.ad_status as enum ('pending', 'approved', 'rejected', 'sold', 'expired', 'draft', 'boosted', 'premium');
create type public.app_role as enum ('super_admin', 'admin', 'moderator', 'customer_support', 'seller', 'buyer');
create type public.item_condition as enum ('new', 'used');
create type public.price_type as enum ('fixed', 'negotiable', 'free');
create type public.report_status as enum ('pending', 'reviewing', 'resolved', 'dismissed');
create type public.ticket_status as enum ('open', 'in_progress', 'waiting_on_user', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.notification_type as enum ('ad_approved', 'ad_rejected', 'new_message', 'new_offer', 'offer_accepted', 'offer_rejected', 'ad_expiring', 'report_update', 'system', 'ticket_update');
create type public.offer_status as enum ('pending', 'accepted', 'rejected', 'expired');
create type public.audit_action as enum ('create', 'update', 'delete', 'login', 'logout', 'login_failed', 'approve', 'reject', 'suspend', 'unsuspend', 'verify', 'export', 'bulk_action', 'settings_change');

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  parent_id uuid references public.categories(id) on delete set null,
  sort_order int default 0,
  meta_title text,
  meta_description text,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now()
);

-- Profiles (mirrors auth.users, created via trigger on signup)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  phone_number text,
  avatar_url text,
  division text,
  district text,
  area text,
  is_blocked boolean default false,
  is_verified boolean default false,
  is_suspended boolean default false,
  suspended_at timestamptz,
  suspended_reason text,
  deleted_at timestamptz,
  last_login_at timestamptz,
  last_login_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Ads
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  category_id uuid not null references public.categories(id),
  subcategory_id uuid references public.subcategories(id),
  price numeric,
  price_type public.price_type not null default 'fixed',
  condition public.item_condition not null default 'used',
  division text not null,
  district text not null,
  area text,
  status public.ad_status not null default 'pending',
  rejection_message text,
  rejection_reason_code text,
  is_featured boolean default false,
  is_premium boolean default false,
  is_boosted boolean default false,
  is_urgent boolean default false,
  boosted_until timestamptz,
  premium_until timestamptz,
  expires_at timestamptz,
  scheduled_at timestamptz,
  views_count int default 0,
  favorites_count int default 0,
  shares_count int default 0,
  offers_count int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS ads_status_idx on public.ads (status);
CREATE INDEX IF NOT EXISTS ads_category_idx on public.ads (category_id);
CREATE INDEX IF NOT EXISTS ads_user_idx on public.ads (user_id);
CREATE INDEX IF NOT EXISTS ads_created_at_idx on public.ads (created_at desc);
CREATE INDEX IF NOT EXISTS ads_expires_at_idx on public.ads (expires_at);
CREATE INDEX IF NOT EXISTS ads_is_featured_idx on public.ads (is_featured);
CREATE INDEX IF NOT EXISTS ads_is_premium_idx on public.ads (is_premium);
CREATE INDEX IF NOT EXISTS ads_is_boosted_idx on public.ads (is_boosted);
CREATE INDEX IF NOT EXISTS ads_boosted_until_idx on public.ads (boosted_until);
CREATE INDEX IF NOT EXISTS ads_premium_until_idx on public.ads (premium_until);
CREATE INDEX IF NOT EXISTS ads_scheduled_at_idx on public.ads (scheduled_at);

CREATE TABLE IF NOT EXISTS public.ad_images (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  image_url text not null,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, ad_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_idx on public.favorites (user_id);
CREATE INDEX IF NOT EXISTS favorites_ad_idx on public.favorites (ad_id);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  reason text not null,
  reason_code text,
  status public.report_status not null default 'pending',
  admin_notes text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  is_resolved boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS reports_status_idx on public.reports (status);
CREATE INDEX IF NOT EXISTS reports_ad_idx on public.reports (ad_id);

-- -------------------------------------------------------------------------
-- New Enterprise Tables
-- -------------------------------------------------------------------------

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action public.audit_action not null,
  resource_type text not null,
  resource_id text,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_idx on public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx on public.audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx on public.audit_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  message text not null,
  data jsonb,
  is_read boolean default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx on public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx on public.notifications (user_id) where is_read = false;
CREATE INDEX IF NOT EXISTS notifications_created_at_idx on public.notifications (created_at desc);

-- Messages (ad-based chat between users)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid references public.ads(id) on delete cascade,
  body text not null,
  is_read boolean default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS messages_sender_idx on public.messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx on public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS messages_ad_idx on public.messages (ad_id);
CREATE INDEX IF NOT EXISTS messages_unread_idx on public.messages (receiver_id) where is_read = false;
CREATE INDEX IF NOT EXISTS messages_created_at_idx on public.messages (created_at desc);

-- Saved Searches
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  query text,
  filters jsonb,
  category_id uuid references public.categories(id),
  min_price numeric,
  max_price numeric,
  condition public.item_condition,
  division text,
  district text,
  notify_on_match boolean default false,
  last_notified_at timestamptz,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS saved_searches_user_idx on public.saved_searches (user_id);
CREATE INDEX IF NOT EXISTS saved_searches_notify_idx on public.saved_searches (user_id) where notify_on_match = true;

-- Offers (price offers on ads)
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null,
  message text,
  status public.offer_status not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS offers_ad_idx on public.offers (ad_id);
CREATE INDEX IF NOT EXISTS offers_buyer_idx on public.offers (buyer_id);
CREATE INDEX IF NOT EXISTS offers_seller_idx on public.offers (seller_id);
CREATE INDEX IF NOT EXISTS offers_status_idx on public.offers (status);

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  description text not null,
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'medium',
  category text,
  assigned_to uuid references auth.users(id),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS support_tickets_user_idx on public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx on public.support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_priority_idx on public.support_tickets (priority);
CREATE INDEX IF NOT EXISTS support_tickets_assigned_idx on public.support_tickets (assigned_to);

-- Support Ticket Messages
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  is_staff boolean default false,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id);

-- User Sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_token text,
  ip_address text,
  user_agent text,
  device_info jsonb,
  is_active boolean default true,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS user_sessions_user_idx on public.user_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_active_idx on public.user_sessions (user_id) where is_active = true;

-- Login Attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip_address text,
  user_agent text,
  success boolean not null,
  failure_reason text,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS login_attempts_email_idx on public.login_attempts (email);
CREATE INDEX IF NOT EXISTS login_attempts_created_at_idx on public.login_attempts (created_at desc);
CREATE INDEX IF NOT EXISTS login_attempts_ip_idx on public.login_attempts (ip_address);

-- Ad Stats (daily aggregated stats per ad)
CREATE TABLE IF NOT EXISTS public.ad_stats (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  stat_date date not null default current_date,
  views int default 0,
  favorites int default 0,
  shares int default 0,
  offers int default 0,
  messages int default 0,
  created_at timestamptz not null default now(),
  unique (ad_id, stat_date)
);

CREATE INDEX IF NOT EXISTS ad_stats_ad_idx on public.ad_stats (ad_id);
CREATE INDEX IF NOT EXISTS ad_stats_date_idx on public.ad_stats (stat_date);

-- Helper function used by RLS policies to check admin role without recursion
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$func$;

-- Helper to check if user has any admin-level role
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in ('super_admin', 'admin')
  )
$func$;

-- Helper to check if user has staff-level access
create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in ('super_admin', 'admin', 'moderator', 'customer_support')
  )
$func$;

-- -------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.ads enable row level security;
alter table public.ad_images enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.saved_searches enable row level security;
alter table public.offers enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.user_sessions enable row level security;
alter table public.login_attempts enable row level security;
alter table public.ad_stats enable row level security;

-- Categories / subcategories: publicly readable, admin-writable
drop policy if exists "Categories are viewable by everyone" on public.categories;
create policy "Categories are viewable by everyone" on public.categories for select using (true);
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Subcategories are viewable by everyone" on public.subcategories;
create policy "Subcategories are viewable by everyone" on public.subcategories for select using (true);
drop policy if exists "Admins manage subcategories" on public.subcategories;
create policy "Admins manage subcategories" on public.subcategories for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Profiles: viewable by everyone (needed to show seller info), editable by owner
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles for select using (deleted_at is null);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using (auth.uid() = user_id);
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Roles: only readable by the user themself / admins; only admins can grant roles
drop policy if exists "Users view own roles" on public.user_roles;
create policy "Users view own roles" on public.user_roles for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));
drop policy if exists "Admins manage roles" on public.user_roles;
create policy "Admins manage roles" on public.user_roles for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Ads: approved ads are public; owners see all their own ads; admins see everything
drop policy if exists "Approved ads are public" on public.ads;
create policy "Approved ads are public" on public.ads for select using (status in ('approved', 'boosted', 'premium'));
drop policy if exists "Owners view their own ads" on public.ads;
create policy "Owners view their own ads" on public.ads for select using (auth.uid() = user_id);
drop policy if exists "Admins view all ads" on public.ads;
create policy "Admins view all ads" on public.ads for select using (public.is_admin(auth.uid()));
drop policy if exists "Users create their own ads" on public.ads;
create policy "Users create their own ads" on public.ads for insert with check (auth.uid() = user_id);
drop policy if exists "Owners update their own ads" on public.ads;
create policy "Owners update their own ads" on public.ads for update using (auth.uid() = user_id);
drop policy if exists "Admins update any ad" on public.ads;
create policy "Admins update any ad" on public.ads for update using (public.is_admin(auth.uid()));
drop policy if exists "Owners delete their own ads" on public.ads;
create policy "Owners delete their own ads" on public.ads for delete using (auth.uid() = user_id);
drop policy if exists "Admins delete any ad" on public.ads;
create policy "Admins delete any ad" on public.ads for delete using (public.is_admin(auth.uid()));

-- Ad images follow the parent ad's visibility
drop policy if exists "Ad images follow ad visibility" on public.ad_images;
create policy "Ad images follow ad visibility" on public.ad_images for select
  using (exists (
    select 1 from public.ads
    where ads.id = ad_images.ad_id
      and (ads.status in ('approved', 'boosted', 'premium') or ads.user_id = auth.uid() or public.is_admin(auth.uid()))
  ));
drop policy if exists "Owners manage their ad images" on public.ad_images;
create policy "Owners manage their ad images" on public.ad_images for all
  using (exists (select 1 from public.ads where ads.id = ad_images.ad_id and ads.user_id = auth.uid()))
  with check (exists (select 1 from public.ads where ads.id = ad_images.ad_id and ads.user_id = auth.uid()));

-- Favorites: private to the owner
drop policy if exists "Users manage their own favorites" on public.favorites;
create policy "Users manage their own favorites" on public.favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reports: users create, admins review
drop policy if exists "Users create reports" on public.reports;
create policy "Users create reports" on public.reports for insert with check (auth.uid() = user_id);
drop policy if exists "Users view their own reports" on public.reports;
create policy "Users view their own reports" on public.reports for select using (auth.uid() = user_id);
drop policy if exists "Admins manage reports" on public.reports;
create policy "Admins manage reports" on public.reports for all
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Audit Logs: only admins can view; any authenticated user can insert their own
drop policy if exists "Users insert own audit logs" on public.audit_logs;
create policy "Users insert own audit logs" on public.audit_logs for insert with check (auth.uid() = user_id);
drop policy if exists "Admins view audit logs" on public.audit_logs;
create policy "Admins view audit logs" on public.audit_logs for select using (public.is_admin(auth.uid()));

-- Notifications: private to the owner
drop policy if exists "Users manage their own notifications" on public.notifications;
create policy "Users manage their own notifications" on public.notifications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Messages: sender and receiver can see their messages
drop policy if exists "Users view their messages" on public.messages;
create policy "Users view their messages" on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
drop policy if exists "Users send messages" on public.messages;
create policy "Users send messages" on public.messages for insert with check (auth.uid() = sender_id);
drop policy if exists "Users update their messages" on public.messages;
create policy "Users update their messages" on public.messages for update using (auth.uid() = receiver_id);

-- Saved Searches: private to the owner
drop policy if exists "Users manage their own saved searches" on public.saved_searches;
create policy "Users manage their own saved searches" on public.saved_searches for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Offers: buyer and seller can see; buyer creates
drop policy if exists "Buyer and seller view offers" on public.offers;
create policy "Buyer and seller view offers" on public.offers for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
drop policy if exists "Buyers create offers" on public.offers;
create policy "Buyers create offers" on public.offers for insert with check (auth.uid() = buyer_id);
drop policy if exists "Buyer and seller update offers" on public.offers;
create policy "Buyer and seller update offers" on public.offers for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Support Tickets: user owns their tickets, staff can see all
drop policy if exists "Users view own tickets" on public.support_tickets;
create policy "Users view own tickets" on public.support_tickets for select
  using (auth.uid() = user_id or public.is_staff(auth.uid()));
drop policy if exists "Users create tickets" on public.support_tickets;
create policy "Users create tickets" on public.support_tickets for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own tickets" on public.support_tickets;
create policy "Users update own tickets" on public.support_tickets for update using (auth.uid() = user_id);
drop policy if exists "Staff manage tickets" on public.support_tickets;
create policy "Staff manage tickets" on public.support_tickets for update using (public.is_staff(auth.uid()));
-- Support Ticket Messages: ticket owner and staff
drop policy if exists "Ticket participants view messages" on public.support_ticket_messages;
create policy "Ticket participants view messages" on public.support_ticket_messages for select
  using (
    exists (select 1 from public.support_tickets t where t.id = support_ticket_messages.ticket_id
      and (t.user_id = auth.uid() or public.is_staff(auth.uid())))
  );
drop policy if exists "Users create ticket messages" on public.support_ticket_messages;
create policy "Users create ticket messages" on public.support_ticket_messages for insert
  with check (auth.uid() = user_id);

-- User Sessions: private to the owner
drop policy if exists "Users manage their own sessions" on public.user_sessions;
create policy "Users manage their own sessions" on public.user_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Login Attempts: only admins can view
drop policy if exists "Admins view login attempts" on public.login_attempts;
create policy "Admins view login attempts" on public.login_attempts for select using (public.is_admin(auth.uid()));
drop policy if exists "System inserts login attempts" on public.login_attempts;
create policy "System inserts login attempts" on public.login_attempts for insert with check (true);

-- Ad Stats: admins view, ad owner views
drop policy if exists "Admins view ad stats" on public.ad_stats;
create policy "Admins view ad stats" on public.ad_stats for select using (public.is_admin(auth.uid()));
drop policy if exists "Owners view own ad stats" on public.ad_stats;
create policy "Owners view own ad stats" on public.ad_stats for select
  using (exists (select 1 from public.ads where ads.id = ad_stats.ad_id and ads.user_id = auth.uid()));
drop policy if exists "System inserts ad stats" on public.ad_stats;
create policy "System inserts ad stats" on public.ad_stats for insert with check (true);
-- -------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up
-- -------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$func$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------------------------
-- Storage buckets used by the app (create via Supabase dashboard or CLI)
--   ad-images  — public bucket for ad photos, path prefix "<ad_id>/..."
--   avatars    — public bucket for user avatars, path prefix "<user_id>/..."
-- -------------------------------------------------------------------------

-- Seed a few starter categories (optional)
insert into public.categories (name, slug, icon, sort_order) values
  ('Electronics', 'electronics', 'Smartphone', 1),
  ('Vehicles', 'vehicles', 'Car', 2),
  ('Property', 'property', 'Home', 3),
  ('Jobs', 'jobs', 'Briefcase', 4),
  ('Fashion', 'fashion', 'Shirt', 5),
  ('Services', 'services', 'Wrench', 6),
  ('Furniture', 'furniture', 'Sofa', 7),
  ('Education', 'education', 'GraduationCap', 8)
on conflict (slug) do nothing;

-- -------------------------------------------------------------------------
-- GRANT permissions for anon and authenticated roles
-- These are REQUIRED for the Supabase REST API (PostgREST) to work.
-- Without these, the client gets 403 "permission denied for table X".
-- -------------------------------------------------------------------------

-- Core tables: anon can read public data, authenticated can read + write own
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.subcategories TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT SELECT ON public.ads TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_images TO authenticated;
GRANT SELECT ON public.ad_images TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT SELECT, UPDATE ON public.reports TO authenticated;

GRANT INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.offers TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;

GRANT INSERT ON public.login_attempts TO authenticated;
GRANT SELECT ON public.login_attempts TO authenticated;

GRANT SELECT, INSERT ON public.ad_stats TO authenticated;

-- Grant sequence usage (needed for INSERT into tables with serial/identity columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Also grant on any future tables created in the public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
