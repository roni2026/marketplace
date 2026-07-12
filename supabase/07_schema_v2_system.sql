-- Schema v2: System tables for admin tools, reporting, API management,
-- system monitoring, backup, compliance, i18n, accessibility, and developer features

-- Admin tools
create table if not exists public.admin_bookmarks (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  label text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_reminders (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  reminder_date timestamptz not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_impersonation_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  reason text,
  created_at timestamptz not null default now()
);

-- API management
create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  token_hash text not null,
  scopes text[] default '{}',
  last_used timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.api_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  endpoint text not null,
  method text not null,
  status_code integer,
  response_time_ms integer,
  ip_address text,
  request_body jsonb,
  response_body jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  events text[] default '{}',
  secret text,
  is_active boolean not null default true,
  last_triggered timestamptz,
  created_at timestamptz not null default now()
);

-- System monitoring
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'error',
  message text not null,
  stack_trace text,
  context jsonb,
  user_id uuid references auth.users(id) on delete set null,
  url text,
  created_at timestamptz not null default now()
);

create table if not exists public.system_health (
  id uuid primary key default gen_random_uuid(),
  metric_name text not null,
  metric_value numeric not null,
  recorded_at timestamptz not null default now()
);

create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body text,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts integer not null default 0,
  last_attempt timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.failed_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  payload jsonb,
  error text,
  attempts integer not null default 0,
  failed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Backup & recovery
create table if not exists public.backup_history (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'manual' check (type in ('manual','automatic','snapshot')),
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  size_bytes bigint,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Developer features
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_enabled boolean not null default false,
  config jsonb,
  created_at timestamptz not null default now()
);

-- Compliance
create table if not exists public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  version text not null,
  accepted boolean not null,
  ip_address text,
  created_at timestamptz not null default now()
);

create table if not exists public.terms_acceptance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address text
);

-- Internationalization
create table if not exists public.translation_keys (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  namespace text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references public.translation_keys(id) on delete cascade,
  locale text not null,
  value text not null,
  created_at timestamptz not null default now(),
  unique (key_id, locale)
);

-- Accessibility
create table if not exists public.accessibility_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  high_contrast boolean not null default false,
  font_scale numeric not null default 1.0,
  screen_reader boolean not null default false,
  keyboard_nav boolean not null default false,
  created_at timestamptz not null default now()
);

-- Reporting & analytics
create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  config jsonb,
  frequency text not null default 'daily' check (frequency in ('daily','weekly','monthly')),
  recipients text[] default '{}',
  last_sent timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_reports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  config jsonb,
  data jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_admin_bookmarks_admin on public.admin_bookmarks(admin_id);
create index if not exists idx_admin_notes_admin_entity on public.admin_notes(admin_id, entity_type, entity_id);
create index if not exists idx_admin_reminders_admin on public.admin_reminders(admin_id);
create index if not exists idx_admin_impersonation_admin on public.admin_impersonation_logs(admin_id);
create index if not exists idx_api_tokens_user on public.api_tokens(user_id);
create index if not exists idx_api_logs_user_created on public.api_logs(user_id, created_at desc);
create index if not exists idx_api_logs_endpoint on public.api_logs(endpoint);
create index if not exists idx_webhooks_user on public.webhooks(user_id);
create index if not exists idx_error_logs_level_created on public.error_logs(level, created_at desc);
create index if not exists idx_system_health_metric on public.system_health(metric_name, recorded_at desc);
create index if not exists idx_email_queue_status on public.email_queue(status, created_at desc);
create index if not exists idx_failed_jobs_failed_at on public.failed_jobs(failed_at desc);
create index if not exists idx_backup_history_created on public.backup_history(created_at desc);
create index if not exists idx_feature_flags_key on public.feature_flags(key);
create index if not exists idx_consent_logs_user on public.consent_logs(user_id, created_at desc);
create index if not exists idx_terms_acceptance_user on public.terms_acceptance(user_id);
create index if not exists idx_translation_keys_key on public.translation_keys(key);
create index if not exists idx_translations_locale on public.translations(locale);
create index if not exists idx_accessibility_settings_user on public.accessibility_settings(user_id);
create index if not exists idx_scheduled_reports_active on public.scheduled_reports(is_active);
create index if not exists idx_custom_reports_created_by on public.custom_reports(created_by);

-- Row Level Security
alter table public.admin_bookmarks enable row level security;
alter table public.admin_notes enable row level security;
alter table public.admin_reminders enable row level security;
alter table public.admin_impersonation_logs enable row level security;
alter table public.api_tokens enable row level security;
alter table public.api_logs enable row level security;
alter table public.webhooks enable row level security;
alter table public.error_logs enable row level security;
alter table public.system_health enable row level security;
alter table public.email_queue enable row level security;
alter table public.failed_jobs enable row level security;
alter table public.backup_history enable row level security;
alter table public.feature_flags enable row level security;
alter table public.consent_logs enable row level security;
alter table public.terms_acceptance enable row level security;
alter table public.translation_keys enable row level security;
alter table public.translations enable row level security;
alter table public.accessibility_settings enable row level security;
alter table public.scheduled_reports enable row level security;
alter table public.custom_reports enable row level security;

-- RLS Policies: admin-only access for admin tables
drop policy if exists "Admins can manage bookmarks" on public.admin_bookmarks;
create policy "Admins can manage bookmarks" on public.admin_bookmarks for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);
drop policy if exists "Admins can manage notes" on public.admin_notes;
create policy "Admins can manage notes" on public.admin_notes for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);
drop policy if exists "Admins can manage reminders" on public.admin_reminders;
create policy "Admins can manage reminders" on public.admin_reminders for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);
drop policy if exists "Admins can manage impersonation logs" on public.admin_impersonation_logs;
create policy "Admins can manage impersonation logs" on public.admin_impersonation_logs for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);

-- RLS Policies: user owns their API tokens/logs/webhooks
drop policy if exists "Users can manage own API tokens" on public.api_tokens;
create policy "Users can manage own API tokens" on public.api_tokens for all using (auth.uid() = user_id);
drop policy if exists "Users can view own API logs" on public.api_logs;
create policy "Users can view own API logs" on public.api_logs for select using (auth.uid() = user_id or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin')));
drop policy if exists "Users can manage own webhooks" on public.webhooks;
create policy "Users can manage own webhooks" on public.webhooks for all using (auth.uid() = user_id);
-- RLS Policies: admin-only for system monitoring
drop policy if exists "Admins can manage error logs" on public.error_logs;
create policy "Admins can manage error logs" on public.error_logs for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin','moderator'))
);
drop policy if exists "Admins can manage system health" on public.system_health;
create policy "Admins can manage system health" on public.system_health for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);
drop policy if exists "Admins can manage email queue" on public.email_queue;
create policy "Admins can manage email queue" on public.email_queue for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);
drop policy if exists "Admins can manage failed jobs" on public.failed_jobs;
create policy "Admins can manage failed jobs" on public.failed_jobs for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);

-- RLS Policies: admin-only for backup
drop policy if exists "Admins can manage backups" on public.backup_history;
create policy "Admins can manage backups" on public.backup_history for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);

-- RLS Policies: admin-only for feature flags
drop policy if exists "Admins can manage feature flags" on public.feature_flags;
create policy "Admins can manage feature flags" on public.feature_flags for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);
drop policy if exists "Anyone can read feature flags" on public.feature_flags;
create policy "Anyone can read feature flags" on public.feature_flags for select using (true);
-- RLS Policies: user owns consent, admin can read all
drop policy if exists "Users can manage own consent" on public.consent_logs;
create policy "Users can manage own consent" on public.consent_logs for all using (auth.uid() = user_id);
drop policy if exists "Admins can read all consent" on public.consent_logs;
create policy "Admins can read all consent" on public.consent_logs for select using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);
drop policy if exists "Users can manage own terms" on public.terms_acceptance;
create policy "Users can manage own terms" on public.terms_acceptance for all using (auth.uid() = user_id);
-- RLS Policies: translations are readable by all, managed by admin
drop policy if exists "Anyone can read translation keys" on public.translation_keys;
create policy "Anyone can read translation keys" on public.translation_keys for select using (true);
drop policy if exists "Admins can manage translation keys" on public.translation_keys;
create policy "Admins can manage translation keys" on public.translation_keys for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);
drop policy if exists "Anyone can read translations" on public.translations;
create policy "Anyone can read translations" on public.translations for select using (true);
drop policy if exists "Admins can manage translations" on public.translations;
create policy "Admins can manage translations" on public.translations for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);

-- RLS Policies: user owns accessibility settings
drop policy if exists "Users can manage own accessibility" on public.accessibility_settings;
create policy "Users can manage own accessibility" on public.accessibility_settings for all using (auth.uid() = user_id);
-- RLS Policies: admin-only for reports
drop policy if exists "Admins can manage scheduled reports" on public.scheduled_reports;
create policy "Admins can manage scheduled reports" on public.scheduled_reports for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);
drop policy if exists "Admins can manage custom reports" on public.custom_reports;
create policy "Admins can manage custom reports" on public.custom_reports for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('admin','super_admin'))
);
