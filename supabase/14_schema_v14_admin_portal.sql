-- BazarBD — Phase 14: Admin Portal
-- schema_v14_admin_portal.sql
-- Run after all previous migrations.
-- -------------------------------------------------------------------------
-- Adds: admin dashboard widgets, admin activity log, system health
-- metrics, admin notifications, bulk operation logs, admin preferences.
-- -------------------------------------------------------------------------

-- =========================================================================
-- Enum additions
-- =========================================================================

do $$ begin
  create type public.widget_type as enum ('stat', 'chart', 'table', 'alert', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bulk_operation_type as enum (
    'approve_listings', 'reject_listings', 'delete_listings', 'feature_listings',
    'boost_listings', 'suspend_users', 'verify_users', 'delete_users',
    'assign_role', 'update_settings', 'export_data', 'import_data',
    'send_notification', 'cleanup_expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.system_health_status as enum ('healthy', 'warning', 'critical', 'down');
exception when duplicate_object then null; end $$;

-- =========================================================================
-- Admin Dashboard Widgets (customizable per admin)
-- =========================================================================

create table if not exists public.admin_dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  widget_key text not null,
  widget_type public.widget_type not null default 'stat',
  title text not null,
  config jsonb default '{}'::jsonb,
  position_x int default 0,
  position_y int default 0,
  width int default 1,
  height int default 1,
  is_visible boolean default true,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, widget_key)
);

create index if not exists idx_admin_widgets_user on public.admin_dashboard_widgets(user_id, is_visible);

-- =========================================================================
-- Admin Activity Log (detailed admin actions tracking)
-- =========================================================================

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  resource_type text,
  resource_id text,
  details jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_activity_admin on public.admin_activity_log(admin_id);
create index if not exists idx_admin_activity_action on public.admin_activity_log(action);
create index if not exists idx_admin_activity_resource on public.admin_activity_log(resource_type, resource_id);
create index if not exists idx_admin_activity_created on public.admin_activity_log(created_at desc);

-- =========================================================================
-- System Health Metrics
-- =========================================================================

create table if not exists public.system_health_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_name text not null,
  metric_value numeric,
  metric_unit text,
  status public.system_health_status default 'healthy',
  threshold_warning numeric,
  threshold_critical numeric,
  metadata jsonb default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_health_metrics_name on public.system_health_metrics(metric_name);
create index if not exists idx_health_metrics_recorded on public.system_health_metrics(recorded_at desc);
create index if not exists idx_health_metrics_status on public.system_health_metrics(status);

-- =========================================================================
-- Admin Notifications (admin-specific notifications)
-- =========================================================================

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  severity text default 'info',
  data jsonb default '{}'::jsonb,
  is_read boolean default false,
  read_at timestamptz,
  action_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_notifications_admin on public.admin_notifications(admin_id, is_read);
create index if not exists idx_admin_notifications_created on public.admin_notifications(created_at desc);

-- =========================================================================
-- Bulk Operation Logs
-- =========================================================================

create table if not exists public.admin_bulk_operations (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  operation_type public.bulk_operation_type not null,
  target_ids text[] not null default '{}',
  parameters jsonb default '{}'::jsonb,
  status text default 'pending',
  total_count int default 0,
  success_count int default 0,
  failure_count int default 0,
  error_details jsonb default '[]'::jsonb,
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_bulk_ops_admin on public.admin_bulk_operations(admin_id);
create index if not exists idx_bulk_ops_status on public.admin_bulk_operations(status);
create index if not exists idx_bulk_ops_type on public.admin_bulk_operations(operation_type);
create index if not exists idx_bulk_ops_created on public.admin_bulk_operations(created_at desc);

-- =========================================================================
-- Admin Preferences
-- =========================================================================

create table if not exists public.admin_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  theme text default 'light',
  sidebar_collapsed boolean default false,
  density text default 'comfortable',
  default_page text default '/admin',
  notification_email boolean default true,
  notification_push boolean default true,
  notification_critical boolean default true,
  notification_warning boolean default true,
  notification_info boolean default false,
  language text default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_preferences_user on public.admin_preferences(user_id);

-- =========================================================================
-- Updated At triggers
-- =========================================================================

create or replace function public.update_updated_at_v14()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_widgets_updated_at on public.admin_dashboard_widgets;
create trigger trg_admin_widgets_updated_at
  before update on public.admin_dashboard_widgets
  for each row execute procedure public.update_updated_at_v14();

drop trigger if exists trg_admin_preferences_updated_at on public.admin_preferences;
create trigger trg_admin_preferences_updated_at
  before update on public.admin_preferences
  for each row execute procedure public.update_updated_at_v14();

-- =========================================================================
-- Function: log_admin_activity
-- =========================================================================

create or replace function public.log_admin_activity(
  p_admin_id uuid,
  p_action text,
  p_resource_type text default null,
  p_resource_id text default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_activity_log (admin_id, action, resource_type, resource_id, details)
  values (p_admin_id, p_action, p_resource_type, p_resource_id, p_details);
end;
$$;

-- =========================================================================
-- Function: get_dashboard_stats
-- =========================================================================

create or replace function public.get_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles where deleted_at is null),
    'active_users', (select count(*) from public.profiles where deleted_at is null and last_login_at > now() - interval '30 days'),
    'online_users', (select count(*) from public.user_presence where is_online = true),
    'new_users_today', (select count(*) from public.profiles where created_at::date = current_date),
    'new_users_this_week', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'new_users_this_month', (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'total_listings', (select count(*) from public.ads where deleted_at is null),
    'active_listings', (select count(*) from public.ads where status in ('approved', 'boosted', 'premium') and deleted_at is null),
    'pending_listings', (select count(*) from public.ads where status = 'pending'),
    'sold_listings', (select count(*) from public.ads where status = 'sold'),
    'expired_listings', (select count(*) from public.ads where status = 'expired'),
    'total_revenue', (select coalesce(sum(amount), 0) from public.transactions where status = 'completed' and transaction_type = 'sale'),
    'total_transactions', (select count(*) from public.transactions where status = 'completed'),
    'pending_reports', (select count(*) from public.reports where status = 'pending'),
    'pending_seller_reports', (select count(*) from public.seller_reports where status = 'pending'),
    'pending_message_reports', (select count(*) from public.message_reports where status = 'pending'),
    'total_shops', (select count(*) from public.shops),
    'verified_shops', (select count(*) from public.shops where is_verified = true),
    'total_messages', (select count(*) from public.messages),
    'total_favorites', (select count(*) from public.favorites),
    'total_offers', (select count(*) from public.offers),
    'sponsored_active', (select count(*) from public.sponsored_listings where is_active = true and starts_at <= now() and (ends_at is null or ends_at >= now()))
  ) into result;
  return result;
end;
$$;

-- =========================================================================
-- Function: get_user_growth_chart
-- =========================================================================

create or replace function public.get_user_growth_chart(
  p_days int default 30
)
returns table (date text, count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    to_char(d.date, 'YYYY-MM-DD') as date,
    count(p.user_id)::bigint as count
  from generate_series(current_date - p_days, current_date, '1 day') as d(date)
  left join public.profiles p on p.created_at::date = d.date::date and p.deleted_at is null
  group by d.date
  order by d.date;
end;
$$;

-- =========================================================================
-- Function: get_listing_growth_chart
-- =========================================================================

create or replace function public.get_listing_growth_chart(
  p_days int default 30
)
returns table (date text, count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    to_char(d.date, 'YYYY-MM-DD') as date,
    count(a.id)::bigint as count
  from generate_series(current_date - p_days, current_date, '1 day') as d(date)
  left join public.ads a on a.created_at::date = d.date::date and a.deleted_at is null
  group by d.date
  order by d.date;
end;
$$;

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.admin_dashboard_widgets enable row level security;
alter table public.admin_activity_log enable row level security;
alter table public.system_health_metrics enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.admin_bulk_operations enable row level security;
alter table public.admin_preferences enable row level security;

-- Dashboard widgets: admin manages own
DO $$ BEGIN
  create policy "Admins view own widgets" on public.admin_dashboard_widgets for select
  using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Admins create own widgets" on public.admin_dashboard_widgets for insert
  with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Admins update own widgets" on public.admin_dashboard_widgets for update
  using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Admins delete own widgets" on public.admin_dashboard_widgets for delete
  using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin activity log: admins view all, system inserts
DO $$ BEGIN
  create policy "Admins view activity log" on public.admin_activity_log for select
  using (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "System inserts activity log" on public.admin_activity_log for insert with check (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  -- System health: admins view, system inserts
create policy "Admins view health metrics" on public.system_health_metrics for select
  using (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "System inserts health metrics" on public.system_health_metrics for insert with check (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  -- Admin notifications: admin manages own
create policy "Admins view own notifications" on public.admin_notifications for select
  using (admin_id = auth.uid() or admin_id is null);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "System inserts admin notifications" on public.admin_notifications for insert with check (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Admins update own notifications" on public.admin_notifications for update
  using (admin_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Bulk operations: admin manages own
DO $$ BEGIN
  create policy "Admins view own bulk ops" on public.admin_bulk_operations for select
  using (admin_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Admins create own bulk ops" on public.admin_bulk_operations for insert
  with check (admin_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Admins update own bulk ops" on public.admin_bulk_operations for update
  using (admin_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin preferences: admin manages own
DO $$ BEGIN
  create policy "Admins view own preferences" on public.admin_preferences for select
  using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Admins create own preferences" on public.admin_preferences for insert
  with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Admins update own preferences" on public.admin_preferences for update
  using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- GRANT permissions
-- =========================================================================

grant select, insert, update, delete on public.admin_dashboard_widgets to authenticated;
grant select on public.admin_activity_log to authenticated;
grant insert on public.admin_activity_log to authenticated;
grant select on public.system_health_metrics to authenticated;
grant insert on public.system_health_metrics to authenticated;
grant select, update on public.admin_notifications to authenticated;
grant insert on public.admin_notifications to authenticated;
grant select, insert, update on public.admin_bulk_operations to authenticated;
grant select, insert, update on public.admin_preferences to authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

grant execute on function public.log_admin_activity(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.get_dashboard_stats() to authenticated;
grant execute on function public.get_user_growth_chart(int) to authenticated;
grant execute on function public.get_listing_growth_chart(int) to authenticated;
