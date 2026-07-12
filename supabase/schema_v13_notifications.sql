-- BazarBD — Phase 13: Notifications & Communication System
-- schema_v13_notifications.sql
-- Run after all previous migrations.
-- =========================================================================
-- Adds: notification center, push subscriptions, email logs, SMS logs,
-- notification preferences, quiet hours, notification templates,
-- delivery logs, admin notifications, read receipts, click tracking.
-- =========================================================================

-- =========================================================================
-- Enum additions
-- =========================================================================

do $$ begin
  create type public.notification_category as enum (
    'account', 'listings', 'offers', 'messages', 'saved_searches',
    'wishlist', 'reviews', 'orders', 'payments', 'delivery',
    'system', 'security', 'promotions', 'admin'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_priority as enum ('low', 'normal', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_channel as enum ('in_app', 'push', 'email', 'sms');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_frequency as enum ('instant', 'daily', 'weekly', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_status as enum ('pending', 'sent', 'delivered', 'read', 'failed', 'bounced');
exception when duplicate_object then null; end $$;

-- =========================================================================
-- Notifications table (unified notification center)
-- =========================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.notification_category not null default 'system',
  notification_type text not null,
  title text not null,
  body text,
  data jsonb default '{}'::jsonb,
  priority public.notification_priority default 'normal',
  is_read boolean default false,
  is_archived boolean default false,
  is_deleted boolean default false,
  is_pinned boolean default false,
  is_important boolean default false,
  action_url text,
  action_label text,
  icon text,
  image_url text,
  related_listing_id uuid,
  related_chat_id uuid,
  related_order_id uuid,
  related_offer_id uuid,
  related_review_id uuid,
  click_count int default 0,
  read_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, is_deleted, created_at desc);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read, is_deleted);
create index if not exists idx_notifications_user_category on public.notifications(user_id, category, is_deleted);
create index if not exists idx_notifications_user_archived on public.notifications(user_id, is_archived, is_deleted);
create index if not exists idx_notifications_user_pinned on public.notifications(user_id, is_pinned, is_deleted);
create index if not exists idx_notifications_user_important on public.notifications(user_id, is_important, is_deleted);
create index if not exists idx_notifications_created on public.notifications(created_at desc);
create index if not exists idx_notifications_type on public.notifications(notification_type);

-- =========================================================================
-- Push subscriptions (Web Push, FCM, APNs)
-- =========================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh_key text,
  auth_key text,
  platform text default 'web',
  device_info jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists idx_push_subs_user on public.push_subscriptions(user_id, is_active);

-- =========================================================================
-- Email notification logs
-- =========================================================================

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete cascade,
  to_email text not null,
  subject text not null,
  html_body text,
  template_key text,
  status public.delivery_status default 'pending',
  error_message text,
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_logs_user on public.email_logs(user_id, created_at desc);
create index if not exists idx_email_logs_status on public.email_logs(status);
create index if not exists idx_email_logs_notification on public.email_logs(notification_id);

-- =========================================================================
-- SMS notification logs
-- =========================================================================

create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete cascade,
  to_phone text not null,
  message text not null,
  template_key text,
  status public.delivery_status default 'pending',
  error_message text,
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_sms_logs_user on public.sms_logs(user_id, created_at desc);
create index if not exists idx_sms_logs_status on public.sms_logs(status);

-- =========================================================================
-- Notification delivery logs (multi-channel tracking)
-- =========================================================================

create table if not exists public.notification_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete cascade,
  channel public.notification_channel not null,
  status public.delivery_status default 'pending',
  provider text,
  provider_message_id text,
  error_message text,
  retry_count int default 0,
  max_retries int default 3,
  scheduled_at timestamptz default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_delivery_logs_notification on public.notification_delivery_logs(notification_id);
create index if not exists idx_delivery_logs_status on public.notification_delivery_logs(status);
create index if not exists idx_delivery_logs_channel on public.notification_delivery_logs(channel, status);

-- =========================================================================
-- Notification preferences (per user, per category, per channel)
-- =========================================================================

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.notification_category not null,
  in_app_enabled boolean default true,
  push_enabled boolean default true,
  email_enabled boolean default true,
  sms_enabled boolean default false,
  frequency public.notification_frequency default 'instant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create index if not exists idx_notif_prefs_user on public.notification_preferences(user_id);

-- =========================================================================
-- Quiet hours (per user)
-- =========================================================================

create table if not exists public.quiet_hours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  is_enabled boolean default false,
  start_time time default '22:00',
  end_time time default '07:00',
  timezone text default 'Asia/Dhaka',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quiet_hours_user on public.quiet_hours(user_id);

-- =========================================================================
-- Notification templates (system-managed, multi-language)
-- =========================================================================

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  category public.notification_category not null,
  title_template text not null,
  body_template text not null,
  email_subject text,
  email_html text,
  sms_template text,
  push_title text,
  push_body text,
  icon text,
  action_url_pattern text,
  action_label text,
  language text default 'en',
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notif_templates_key on public.notification_templates(template_key, language);
create index if not exists idx_notif_templates_category on public.notification_templates(category, is_active);

-- =========================================================================
-- Admin notifications (system alerts for administrators)
-- =========================================================================

create table if not exists public.admin_notifications_v13 (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  severity text default 'info',
  data jsonb default '{}'::jsonb,
  is_read boolean default false,
  read_at timestamptz,
  action_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_notif_v13_admin on public.admin_notifications_v13(admin_id, is_read);
create index if not exists idx_admin_notif_v13_created on public.admin_notifications_v13(created_at desc);
create index if not exists idx_admin_notif_v13_type on public.admin_notifications_v13(notification_type);

-- =========================================================================
-- Notification summary queue (for daily/weekly digest emails)
-- =========================================================================

create table if not exists public.notification_summary_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  frequency public.notification_frequency not null,
  notification_ids uuid[] default '{}'::uuid[],
  summary_data jsonb default '{}'::jsonb,
  status text default 'pending',
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_summary_queue_user on public.notification_summary_queue(user_id, status);
create index if not exists idx_summary_queue_scheduled on public.notification_summary_queue(scheduled_for, status);

-- =========================================================================
-- Updated at triggers
-- =========================================================================

create or replace function public.update_updated_at_v13()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger if not exists trg_notifications_updated_at
  before update on public.notifications
  for each row execute procedure public.update_updated_at_v13();

create trigger if not exists trg_push_subs_updated_at
  before update on public.push_subscriptions
  for each row execute procedure public.update_updated_at_v13();

create trigger if not exists trg_notif_prefs_updated_at
  before update on public.notification_preferences
  for each row execute procedure public.update_updated_at_v13();

create trigger if not exists trg_quiet_hours_updated_at
  before update on public.quiet_hours
  for each row execute procedure public.update_updated_at_v13();

create trigger if not exists trg_notif_templates_updated_at
  before update on public.notification_templates
  for each row execute procedure public.update_updated_at_v13();

-- =========================================================================
-- Function: create_notification
-- =========================================================================

create or replace function public.create_notification(
  p_user_id uuid,
  p_category public.notification_category,
  p_notification_type text,
  p_title text,
  p_body text default null,
  p_data jsonb default '{}'::jsonb,
  p_priority public.notification_status default 'normal',
  p_action_url text default null,
  p_action_label text default null,
  p_icon text default null,
  p_image_url text default null,
  p_related_listing_id uuid default null,
  p_related_chat_id uuid default null,
  p_related_order_id uuid default null,
  p_related_offer_id uuid default null,
  p_related_review_id uuid default null,
  p_is_important boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications (
    user_id, category, notification_type, title, body, data,
    priority, action_url, action_label, icon, image_url,
    related_listing_id, related_chat_id, related_order_id,
    related_offer_id, related_review_id, is_important
  ) values (
    p_user_id, p_category, p_notification_type, p_title, p_body, p_data,
    p_priority, p_action_url, p_action_label, p_icon, p_image_url,
    p_related_listing_id, p_related_chat_id, p_related_order_id,
    p_related_offer_id, p_related_review_id, p_is_important
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

-- =========================================================================
-- Function: get_unread_notification_count
-- =========================================================================

create or replace function public.get_unread_notification_count(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select count(*) from public.notifications
    where user_id = p_user_id
      and is_read = false
      and is_deleted = false
      and is_archived = false
  );
end;
$$;

-- =========================================================================
-- Function: get_notifications_by_category
-- =========================================================================

create or replace function public.get_notifications_by_category(
  p_user_id uuid,
  p_category text default 'all',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid, category public.notification_category, notification_type text,
  title text, body text, data jsonb, priority public.notification_priority,
  is_read boolean, is_archived boolean, is_pinned boolean, is_important boolean,
  action_url text, action_label text, icon text, image_url text,
  related_listing_id uuid, related_chat_id uuid, related_order_id uuid,
  click_count int, read_at timestamptz, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    n.id, n.category, n.notification_type, n.title, n.body, n.data,
    n.priority, n.is_read, n.is_archived, n.is_pinned, n.is_important,
    n.action_url, n.action_label, n.icon, n.image_url,
    n.related_listing_id, n.related_chat_id, n.related_order_id,
    n.click_count, n.read_at, n.created_at
  from public.notifications n
  where n.user_id = p_user_id
    and n.is_deleted = false
    and (p_category = 'all' or n.category::text = p_category)
    and (p_category != 'archived' or n.is_archived = true)
    and (p_category != 'unread' or n.is_read = false)
    and (p_category != 'read' or n.is_read = true)
    and (p_category != 'important' or n.is_important = true)
  order by n.is_pinned desc, n.created_at desc
  limit p_limit offset p_offset;
end;
$$;

-- =========================================================================
-- Function: mark_notification_read
-- =========================================================================

create or replace function public.mark_notification_read(p_notification_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set is_read = true, read_at = now()
  where id = p_notification_id and user_id = p_user_id;
  return found;
end;
$$;

-- =========================================================================
-- Function: mark_all_notifications_read
-- =========================================================================

create or replace function public.mark_all_notifications_read(p_user_id uuid, p_category text default 'all')
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set is_read = true, read_at = now()
  where user_id = p_user_id
    and is_read = false
    and is_deleted = false
    and (p_category = 'all' or category::text = p_category);
  return count(*) from public.notifications where user_id = p_user_id and is_read = true and read_at = now();
end;
$$;

-- =========================================================================
-- Function: archive_notification
-- =========================================================================

create or replace function public.archive_notification(p_notification_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set is_archived = true, archived_at = now()
  where id = p_notification_id and user_id = p_user_id;
  return found;
end;
$$;

-- =========================================================================
-- Function: delete_notification
-- =========================================================================

create or replace function public.delete_notification(p_notification_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set is_deleted = true, deleted_at = now()
  where id = p_notification_id and user_id = p_user_id;
  return found;
end;
$$;

-- =========================================================================
-- Function: pin_notification
-- =========================================================================

create or replace function public.pin_notification(p_notification_id uuid, p_user_id uuid, p_pin boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set is_pinned = p_pin
  where id = p_notification_id and user_id = p_user_id;
  return found;
end;
$$;

-- =========================================================================
-- Function: track_notification_click
-- =========================================================================

create or replace function public.track_notification_click(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set click_count = click_count + 1
  where id = p_notification_id;
end;
$$;

-- =========================================================================
-- Function: is_in_quiet_hours
-- =========================================================================

create or replace function public.is_in_quiet_hours(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qh record;
  v_current_time time;
begin
  select * into v_qh from public.quiet_hours where user_id = p_user_id and is_enabled = true;
  if not found then return false; end if;

  v_current_time := (now() at time zone v_qh.timezone)::time;

  if v_qh.start_time < v_qh.end_time then
    return v_current_time >= v_qh.start_time and v_current_time < v_qh.end_time;
  else
    -- Overnight range (e.g., 22:00 to 07:00)
    return v_current_time >= v_qh.start_time or v_current_time < v_qh.end_time;
  end if;
end;
$$;

-- =========================================================================
-- Function: should_send_notification
-- Checks user preferences and quiet hours for a given category + channel
-- =========================================================================

create or replace function public.should_send_notification(
  p_user_id uuid,
  p_category public.notification_category,
  p_channel public.notification_channel
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pref record;
  v_in_quiet boolean;
begin
  select * into v_pref from public.notification_preferences
  where user_id = p_user_id and category = p_category;

  if not found then
    -- Default: in_app and push enabled, email enabled, sms disabled
    case p_channel
      when 'in_app' then return true;
      when 'push' then return true;
      when 'email' then return true;
      when 'sms' then return false;
    end case;
  end if;

  -- Check frequency
  if v_pref.frequency = 'disabled' then return false; end if;

  -- Check channel preference
  case p_channel
    when 'in_app' then
      if not v_pref.in_app_enabled then return false; end if;
    when 'push' then
      if not v_pref.push_enabled then return false; end if;
    when 'email' then
      if not v_pref.email_enabled then return false; end if;
    when 'sms' then
      if not v_pref.sms_enabled then return false; end if;
  end case;

  -- Check quiet hours for push and sms only (in_app and email are async)
  if p_channel in ('push', 'sms') then
    v_in_quiet := public.is_in_quiet_hours(p_user_id);
    if v_in_quiet then return false; end if;
  end if;

  return true;
end;
$$;

-- =========================================================================
-- Function: create_admin_notification
-- =========================================================================

create or replace function public.create_admin_notification_v13(
  p_notification_type text,
  p_title text,
  p_message text,
  p_severity text default 'info',
  p_data jsonb default '{}'::jsonb,
  p_action_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.admin_notifications_v13 (notification_type, title, message, severity, data, action_url)
  values (p_notification_type, p_title, p_message, p_severity, p_data, p_action_url)
  returning id into v_id;
  return v_id;
end;
$$;

-- =========================================================================
-- Seed default notification templates
-- =========================================================================

insert into public.notification_templates (template_key, category, title_template, body_template, email_subject, email_html, sms_template, push_title, push_body, icon, action_url_pattern, action_label)
values
  -- Account
  ('welcome', 'account', 'Welcome to BazarBD', 'Your account has been created successfully. Start buying and selling today!', 'Welcome to BazarBD', '<h1>Welcome to BazarBD!</h1><p>Your account is ready. Start exploring the marketplace.</p>', 'Welcome to BazarBD! Your account is ready.', 'Welcome!', 'Your BazarBD account is ready', 'user-plus', '/dashboard', 'Get Started'),
  ('email_verified', 'account', 'Email Verified', 'Your email address has been verified successfully.', 'Email Verified', '<h1>Email Verified</h1><p>Your email address has been confirmed.</p>', 'BazarBD: Your email has been verified.', 'Email Verified', 'Your email is now verified', 'badge-check', null, null),
  ('phone_verified', 'account', 'Phone Verified', 'Your phone number has been verified successfully.', null, null, null, 'Phone Verified', 'Your phone is now verified', 'badge-check', null, null),
  ('password_changed', 'account', 'Password Changed', 'Your password has been changed. If this was not you, please contact support.', 'Password Changed', '<h1>Password Changed</h1><p>Your password was changed. If this was not you, contact support immediately.</p>', 'BazarBD: Your password was changed.', 'Password Changed', 'Your password was updated', 'lock', null, null),
  ('login_new_device', 'security', 'New Device Login', 'A login was detected from a new device. If this was not you, please secure your account.', 'New Device Login', '<h1>New Device Login</h1><p>A new device logged into your account.</p>', 'BazarBD: Login from new device detected.', 'New Login', 'New device login detected', 'smartphone', '/settings/security', 'Review'),
  ('account_suspended', 'account', 'Account Suspended', 'Your account has been suspended. Contact support for more information.', 'Account Suspended', '<h1>Account Suspended</h1><p>Your account has been suspended.</p>', 'BazarBD: Your account has been suspended.', 'Account Suspended', 'Your account was suspended', 'ban', '/support', 'Contact Support'),
  ('account_restored', 'account', 'Account Restored', 'Your account has been restored. Welcome back!', 'Account Restored', '<h1>Account Restored</h1><p>Your account is active again.</p>', 'BazarBD: Your account has been restored.', 'Account Restored', 'Your account is active again', 'check-circle', null, null),
  -- Listings
  ('listing_approved', 'listings', 'Listing Approved', 'Your listing "{{listing_title}}" has been approved and is now live.', 'Listing Approved', '<h1>Listing Approved</h1><p>Your listing is now live.</p>', 'BazarBD: Your listing was approved.', 'Listing Approved', 'Your listing is now live', 'check-circle', '/ad/{{listing_slug}}', 'View Listing'),
  ('listing_rejected', 'listings', 'Listing Rejected', 'Your listing "{{listing_title}}" was rejected. Reason: {{reason}}', 'Listing Rejected', '<h1>Listing Rejected</h1><p>Your listing was rejected.</p>', 'BazarBD: Your listing was rejected.', 'Listing Rejected', 'Your listing was rejected', 'x-circle', '/my-ads', 'View Listings'),
  ('listing_published', 'listings', 'Listing Published', 'Your listing "{{listing_title}}" is now published.', null, null, null, 'Listing Published', 'Your listing is now live', 'package', '/ad/{{listing_slug}}', 'View'),
  ('listing_updated', 'listings', 'Listing Updated', 'Your listing "{{listing_title}}" has been updated.', null, null, null, 'Listing Updated', 'Your listing was updated', 'edit', '/ad/{{listing_slug}}', 'View'),
  ('listing_expires_soon', 'listings', 'Listing Expires Soon', 'Your listing "{{listing_title}}" will expire in {{days}} days.', 'Listing Expires Soon', '<h1>Listing Expiring Soon</h1><p>Your listing will expire soon. Renew it to keep it live.</p>', 'BazarBD: Your listing expires in {{days}} days.', 'Expiring Soon', 'Listing expires in {{days}} days', 'clock', '/my-ads', 'Renew'),
  ('listing_expired', 'listings', 'Listing Expired', 'Your listing "{{listing_title}}" has expired.', 'Listing Expired', '<h1>Listing Expired</h1><p>Your listing has expired. Renew it to make it visible again.</p>', 'BazarBD: Your listing has expired.', 'Listing Expired', 'Your listing has expired', 'x-circle', '/my-ads', 'Renew'),
  ('listing_renewed', 'listings', 'Listing Renewed', 'Your listing "{{listing_title}}" has been renewed.', null, null, null, 'Listing Renewed', 'Your listing was renewed', 'refresh-cw', '/ad/{{listing_slug}}', 'View'),
  ('listing_sold', 'listings', 'Listing Sold', 'Your listing "{{listing_title}}" has been marked as sold.', 'Listing Sold', '<h1>Listing Sold</h1><p>Congratulations! Your item has been sold.</p>', 'BazarBD: Your listing was sold.', 'Listing Sold', 'Your item was sold', 'shopping-bag', '/my-ads', 'View'),
  ('listing_removed', 'listings', 'Listing Removed', 'Your listing "{{listing_title}}" has been removed.', null, null, null, 'Listing Removed', 'Your listing was removed', 'trash-2', '/my-ads', 'View'),
  ('listing_reported', 'listings', 'Listing Reported', 'Your listing "{{listing_title}}" has been reported. Please review our guidelines.', null, null, null, 'Listing Reported', 'Your listing was reported', 'flag', '/my-ads', 'Review'),
  ('listing_boosted', 'listings', 'Listing Boosted', 'Your listing "{{listing_title}}" has been boosted for {{days}} days.', null, null, null, 'Listing Boosted', 'Your listing is now boosted', 'zap', '/ad/{{listing_slug}}', 'View'),
  ('featured_expired', 'listings', 'Featured Expired', 'The featured status for "{{listing_title}}" has expired.', null, null, null, 'Featured Expired', 'Featured status expired', 'star', '/my-ads', 'Renew'),
  -- Offers
  ('offer_received', 'offers', 'Offer Received', 'You received a new offer of {{offer_amount}} for "{{listing_title}}".', null, null, null, 'New Offer', 'Offer of {{offer_amount}} received', 'tag', '/ad/{{listing_slug}}', 'View Offer'),
  ('offer_accepted', 'offers', 'Offer Accepted', 'Your offer for "{{listing_title}}" has been accepted.', 'Offer Accepted', '<h1>Offer Accepted</h1><p>Your offer was accepted!</p>', 'BazarBD: Your offer was accepted.', 'Offer Accepted', 'Your offer was accepted', 'check-circle', '/ad/{{listing_slug}}', 'View'),
  ('offer_rejected', 'offers', 'Offer Rejected', 'Your offer for "{{listing_title}}" has been rejected.', null, null, null, 'Offer Rejected', 'Your offer was rejected', 'x-circle', '/ad/{{listing_slug}}', 'View'),
  ('counter_offer_received', 'offers', 'Counter Offer', 'You received a counter offer of {{counter_amount}} for "{{listing_title}}".', null, null, null, 'Counter Offer', 'Counter offer of {{counter_amount}}', 'tag', '/ad/{{listing_slug}}', 'Respond'),
  ('offer_expired', 'offers', 'Offer Expired', 'Your offer for "{{listing_title}}" has expired.', null, null, null, 'Offer Expired', 'Your offer has expired', 'clock', '/ad/{{listing_slug}}', 'View'),
  ('offer_withdrawn', 'offers', 'Offer Withdrawn', 'The offer for "{{listing_title}}" has been withdrawn.', null, null, null, 'Offer Withdrawn', 'An offer was withdrawn', 'x', null, null),
  -- Messages
  ('new_message', 'messages', 'New Message', 'You received a new message from {{sender_name}}.', null, null, null, 'New Message', '{{sender_name}} sent a message', 'message-square', '/messages', 'View'),
  ('new_image_received', 'messages', 'Image Received', '{{sender_name}} sent you an image.', null, null, null, 'Image Received', '{{sender_name}} sent an image', 'image', '/messages', 'View'),
  ('voice_message_received', 'messages', 'Voice Message', '{{sender_name}} sent you a voice message.', null, null, null, 'Voice Message', '{{sender_name}} sent a voice message', 'mic', '/messages', 'Play'),
  ('file_received', 'messages', 'File Received', '{{sender_name}} sent you a file.', null, null, null, 'File Received', '{{sender_name}} sent a file', 'file', '/messages', 'View'),
  ('mentioned_in_chat', 'messages', 'You Were Mentioned', '{{sender_name}} mentioned you in a conversation.', null, null, null, 'Mentioned', 'You were mentioned by {{sender_name}}', 'at-sign', '/messages', 'View'),
  ('read_receipt', 'messages', 'Message Read', '{{recipient_name}} read your message.', null, null, null, 'Message Read', 'Your message was read', 'check-check', '/messages', null),
  ('conversation_archived', 'messages', 'Conversation Archived', 'A conversation has been archived.', null, null, null, 'Archived', 'A conversation was archived', 'archive', '/messages', null),
  -- Saved Searches
  ('saved_search_match', 'saved_searches', 'New Matching Listing', 'A new listing matches your saved search "{{search_name}}".', 'New Matching Listing', '<h1>New Matching Listing</h1><p>A new listing matches your search.</p>', 'BazarBD: New listing matches your search.', 'New Match', 'New listing matches your search', 'search', '/search', 'View'),
  ('saved_search_price', 'saved_searches', 'Price Match', 'A listing within your price range was found for "{{search_name}}".', null, null, null, 'Price Match', 'Listing in your price range', 'dollar-sign', '/search', 'View'),
  ('saved_search_category', 'saved_searches', 'Category Match', 'A new listing in your watched category was found.', null, null, null, 'Category Match', 'New listing in your category', 'folder', '/search', 'View'),
  ('saved_search_location', 'saved_searches', 'Location Match', 'A new listing near your location was found.', null, null, null, 'Location Match', 'New listing near you', 'map-pin', '/search', 'View'),
  -- Wishlist
  ('wishlist_price_drop', 'wishlist', 'Price Drop', 'The price for "{{listing_title}}" dropped from {{old_price}} to {{new_price}}.', 'Price Drop', '<h1>Price Drop!</h1><p>An item on your wishlist dropped in price.</p>', 'BazarBD: Price drop on your wishlist item.', 'Price Drop', 'Price dropped to {{new_price}}', 'trending-down', '/ad/{{listing_slug}}', 'View'),
  ('wishlist_available', 'wishlist', 'Item Available', '"{{listing_title}}" is available again.', null, null, null, 'Available Again', 'Wishlist item is available', 'check-circle', '/ad/{{listing_slug}}', 'View'),
  ('wishlist_sold', 'wishlist', 'Item Sold', '"{{listing_title}}" has been sold.', null, null, null, 'Item Sold', 'A wishlist item was sold', 'shopping-bag', null, null),
  ('wishlist_updated', 'wishlist', 'Listing Updated', 'The seller updated "{{listing_title}}".', null, null, null, 'Listing Updated', 'A wishlist item was updated', 'edit', '/ad/{{listing_slug}}', 'View'),
  -- Reviews
  ('review_received', 'reviews', 'New Review', 'You received a new review from {{reviewer_name}}.', null, null, null, 'New Review', '{{reviewer_name}} reviewed you', 'star', '/profile', 'View'),
  ('seller_replied', 'reviews', 'Seller Replied', 'The seller replied to your review.', null, null, null, 'Seller Reply', 'The seller replied to your review', 'message-square', '/profile', 'View'),
  ('buyer_replied', 'reviews', 'Buyer Replied', 'The buyer replied to your review.', null, null, null, 'Buyer Reply', 'The buyer replied to your review', 'message-square', '/profile', 'View'),
  -- Orders (Shop Only)
  ('new_order', 'orders', 'New Order', 'You received a new order #{{order_id}}.', 'New Order', '<h1>New Order</h1><p>You received a new order.</p>', 'BazarBD: New order #{{order_id}} received.', 'New Order', 'Order #{{order_id}} received', 'shopping-cart', '/shop-dashboard/orders', 'View Order'),
  ('order_accepted', 'orders', 'Order Accepted', 'Order #{{order_id}} has been accepted.', null, null, null, 'Order Accepted', 'Order #{{order_id}} accepted', 'check-circle', '/shop-dashboard/orders', 'View'),
  ('order_cancelled', 'orders', 'Order Cancelled', 'Order #{{order_id}} has been cancelled.', null, null, null, 'Order Cancelled', 'Order #{{order_id}} cancelled', 'x-circle', '/shop-dashboard/orders', 'View'),
  ('order_completed', 'orders', 'Order Completed', 'Order #{{order_id}} has been completed.', 'Order Completed', '<h1>Order Completed</h1><p>Order #{{order_id}} is complete.</p>', 'BazarBD: Order #{{order_id}} completed.', 'Order Completed', 'Order #{{order_id}} complete', 'check-circle', '/shop-dashboard/orders', 'View'),
  -- Payments (Shop Only)
  ('payment_received', 'payments', 'Payment Received', 'Payment of {{amount}} received for order #{{order_id}}.', 'Payment Received', '<h1>Payment Received</h1><p>Payment of {{amount}} received.</p>', 'BazarBD: Payment received for order #{{order_id}}.', 'Payment Received', 'Payment of {{amount}} received', 'dollar-sign', '/shop-dashboard/payments', 'View'),
  ('payment_pending', 'payments', 'Payment Pending', 'Payment for order #{{order_id}} is pending.', null, null, null, 'Payment Pending', 'Payment for order #{{order_id}} pending', 'clock', '/shop-dashboard/payments', 'View'),
  ('payment_failed', 'payments', 'Payment Failed', 'Payment for order #{{order_id}} has failed.', 'Payment Failed', '<h1>Payment Failed</h1><p>Payment for order #{{order_id}} failed.</p>', 'BazarBD: Payment failed for order #{{order_id}}.', 'Payment Failed', 'Payment for order #{{order_id}} failed', 'x-circle', '/shop-dashboard/payments', 'Retry'),
  ('refund_completed', 'payments', 'Refund Completed', 'Refund of {{amount}} for order #{{order_id}} has been completed.', 'Refund Completed', '<h1>Refund Completed</h1><p>Refund of {{amount}} processed.</p>', 'BazarBD: Refund completed for order #{{order_id}}.', 'Refund Completed', 'Refund of {{amount}} processed', 'rotate-ccw', '/shop-dashboard/payments', 'View'),
  ('refund_rejected', 'payments', 'Refund Rejected', 'Refund request for order #{{order_id}} has been rejected.', null, null, null, 'Refund Rejected', 'Refund for order #{{order_id}} rejected', 'x-circle', '/shop-dashboard/payments', 'View'),
  -- Delivery (Shop Only)
  ('order_packed', 'delivery', 'Order Packed', 'Order #{{order_id}} has been packed.', null, null, null, 'Order Packed', 'Order #{{order_id}} packed', 'package', '/shop-dashboard/orders', 'Track'),
  ('courier_assigned', 'delivery', 'Courier Assigned', 'A courier has been assigned for order #{{order_id}}.', null, null, null, 'Courier Assigned', 'Courier assigned for order #{{order_id}}', 'truck', '/shop-dashboard/orders', 'Track'),
  ('order_shipped', 'delivery', 'Order Shipped', 'Order #{{order_id}} has been shipped.', 'Order Shipped', '<h1>Order Shipped</h1><p>Your order has been shipped.</p>', 'BazarBD: Order #{{order_id}} shipped.', 'Order Shipped', 'Order #{{order_id}} shipped', 'truck', '/shop-dashboard/orders', 'Track'),
  ('out_for_delivery', 'delivery', 'Out for Delivery', 'Order #{{order_id}} is out for delivery.', 'Out for Delivery', '<h1>Out for Delivery</h1><p>Your order is out for delivery.</p>', 'BazarBD: Order #{{order_id}} out for delivery.', 'Out for Delivery', 'Order #{{order_id}} out for delivery', 'truck', '/shop-dashboard/orders', 'Track'),
  ('delivered', 'delivery', 'Delivered', 'Order #{{order_id}} has been delivered.', 'Order Delivered', '<h1>Order Delivered</h1><p>Your order has been delivered.</p>', 'BazarBD: Order #{{order_id}} delivered.', 'Delivered', 'Order #{{order_id}} delivered', 'check-circle', '/shop-dashboard/orders', 'View'),
  ('delivery_failed', 'delivery', 'Delivery Failed', 'Delivery for order #{{order_id}} has failed.', 'Delivery Failed', '<h1>Delivery Failed</h1><p>Delivery for your order failed.</p>', 'BazarBD: Delivery failed for order #{{order_id}}.', 'Delivery Failed', 'Delivery for order #{{order_id}} failed', 'x-circle', '/shop-dashboard/orders', 'View'),
  ('returned', 'delivery', 'Order Returned', 'Order #{{order_id}} has been returned.', null, null, null, 'Returned', 'Order #{{order_id}} returned', 'rotate-ccw', '/shop-dashboard/orders', 'View'),
  -- System
  ('system_maintenance', 'system', 'Scheduled Maintenance', 'The platform will undergo maintenance on {{maintenance_time}}.', 'Scheduled Maintenance', '<h1>Scheduled Maintenance</h1><p>BazarBD will undergo maintenance.</p>', 'BazarBD: Scheduled maintenance on {{maintenance_time}}.', 'Maintenance', 'Scheduled maintenance on {{maintenance_time}}', 'wrench', null, null),
  ('system_update', 'system', 'Platform Update', 'BazarBD has been updated with new features!', null, null, null, 'Update', 'New features available', 'zap', null, null),
  -- Promotions
  ('promotion', 'promotions', 'Special Offer', '{{promotion_title}}', null, null, null, 'Special Offer', '{{promotion_title}}', 'gift', '/promotions', 'View'),
on conflict (template_key) do nothing;

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.email_logs enable row level security;
alter table public.sms_logs enable row level security;
alter table public.notification_delivery_logs enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.quiet_hours enable row level security;
alter table public.notification_templates enable row level security;
alter table public.admin_notifications_v13 enable row level security;
alter table public.notification_summary_queue enable row level security;

-- Notifications: user manages own
create policy "Users view own notifications" on public.notifications for select
  using (user_id = auth.uid());
create policy "Users update own notifications" on public.notifications for update
  using (user_id = auth.uid());
create policy "System inserts notifications" on public.notifications for insert
  with check (true);

-- Push subscriptions: user manages own
create policy "Users view own push subs" on public.push_subscriptions for select
  using (user_id = auth.uid());
create policy "Users insert own push subs" on public.push_subscriptions for insert
  with check (user_id = auth.uid());
create policy "Users update own push subs" on public.push_subscriptions for update
  using (user_id = auth.uid());
create policy "Users delete own push subs" on public.push_subscriptions for delete
  using (user_id = auth.uid());

-- Email logs: user views own
create policy "Users view own email logs" on public.email_logs for select
  using (user_id = auth.uid());
create policy "System inserts email logs" on public.email_logs for insert
  with check (true);

-- SMS logs: user views own
create policy "Users view own sms logs" on public.sms_logs for select
  using (user_id = auth.uid());
create policy "System inserts sms logs" on public.sms_logs for insert
  with check (true);

-- Delivery logs: system manages
create policy "System manages delivery logs" on public.notification_delivery_logs for all
  using (true) with check (true);

-- Notification preferences: user manages own
create policy "Users view own notif prefs" on public.notification_preferences for select
  using (user_id = auth.uid());
create policy "Users insert own notif prefs" on public.notification_preferences for insert
  with check (user_id = auth.uid());
create policy "Users update own notif prefs" on public.notification_preferences for update
  using (user_id = auth.uid());
create policy "Users delete own notif prefs" on public.notification_preferences for delete
  using (user_id = auth.uid());

-- Quiet hours: user manages own
create policy "Users view own quiet hours" on public.quiet_hours for select
  using (user_id = auth.uid());
create policy "Users insert own quiet hours" on public.quiet_hours for insert
  with check (user_id = auth.uid());
create policy "Users update own quiet hours" on public.quiet_hours for update
  using (user_id = auth.uid());
create policy "Users delete own quiet hours" on public.quiet_hours for delete
  using (user_id = auth.uid());

-- Templates: public read, admin write
create policy "Anyone can view templates" on public.notification_templates for select
  using (is_active = true);
create policy "Admins manage templates" on public.notification_templates for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Admin notifications: admin manages
create policy "Admins view admin notifs" on public.admin_notifications_v13 for select
  using (admin_id = auth.uid() or admin_id is null or public.is_admin(auth.uid()));
create policy "System inserts admin notifs" on public.admin_notifications_v13 for insert
  with check (true);
create policy "Admins update admin notifs" on public.admin_notifications_v13 for update
  using (admin_id = auth.uid() or admin_id is null);

-- Summary queue: system manages
create policy "System manages summary queue" on public.notification_summary_queue for all
  using (true) with check (true);

-- =========================================================================
-- GRANT permissions
-- =========================================================================

grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select on public.email_logs to authenticated;
grant select on public.sms_logs to authenticated;
grant select on public.notification_delivery_logs to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.quiet_hours to authenticated;
grant select on public.notification_templates to authenticated;
grant select, update on public.admin_notifications_v13 to authenticated;
grant select on public.notification_summary_queue to authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

grant execute on function public.create_notification to authenticated;
grant execute on function public.get_unread_notification_count to authenticated;
grant execute on function public.get_notifications_by_category to authenticated;
grant execute on function public.mark_notification_read to authenticated;
grant execute on function public.mark_all_notifications_read to authenticated;
grant execute on function public.archive_notification to authenticated;
grant execute on function public.delete_notification to authenticated;
grant execute on function public.pin_notification to authenticated;
grant execute on function public.track_notification_click to authenticated;
grant execute on function public.is_in_quiet_hours to authenticated;
grant execute on function public.should_send_notification to authenticated;
grant execute on function public.create_admin_notification_v13 to authenticated;

-- =========================================================================
-- Realtime publication
-- =========================================================================

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.admin_notifications_v13;
