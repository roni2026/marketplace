-- BazarBD — v2 CMS, Notification Center, Workflow Automation & SEO schema
-- -------------------------------------------------------------------------
-- Adds tables for notification preferences, scheduling, workflow rules,
-- cron jobs, banners, homepage sections, landing pages, FAQ, blog,
-- static pages, terms/privacy versions, SEO settings, redirects, sitemap.
-- Review RLS policies carefully before running against production.
-- -------------------------------------------------------------------------

-- Enums
do $$ begin
  create type public.blog_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

-- -------------------------------------------------------------------------
-- Notification Center
-- -------------------------------------------------------------------------

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  browser_enabled boolean default true,
  mobile_push_enabled boolean default false,
  digest_email_enabled boolean default true,
  marketing_enabled boolean default false,
  category_alerts boolean default true,
  saved_search_alerts boolean default true,
  wishlist_alerts boolean default true,
  seller_alerts boolean default true,
  admin_announcements boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index idx_notification_preferences_user on public.notification_preferences(user_id);

alter table public.notification_preferences enable row level security;
create policy "Users can view own notification preferences"
  on public.notification_preferences for select
  using (auth.uid() = user_id);
create policy "Users can update own notification preferences"
  on public.notification_preferences for update
  using (auth.uid() = user_id);
create policy "Users can insert own notification preferences"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

create table public.notification_schedule (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  scheduled_for timestamptz not null,
  sent boolean default false,
  sent_at timestamptz
);

create index idx_notification_schedule_pending on public.notification_schedule(scheduled_for) where sent = false;
create index idx_notification_schedule_notification on public.notification_schedule(notification_id);

alter table public.notification_schedule enable row level security;
create policy "Users can view own scheduled notifications"
  on public.notification_schedule for select
  using (
    exists (
      select 1 from public.notifications n
      where n.id = notification_id and n.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- Workflow Automation
-- -------------------------------------------------------------------------

create table public.workflow_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger text not null,
  condition jsonb default '{}'::jsonb,
  action text not null,
  is_active boolean default true,
  priority int default 0,
  created_at timestamptz not null default now()
);

create index idx_workflow_rules_active on public.workflow_rules(is_active) where is_active = true;
create index idx_workflow_rules_trigger on public.workflow_rules(trigger);

alter table public.workflow_rules enable row level security;
create policy "Admins can manage workflow rules"
  on public.workflow_rules for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

create table public.workflow_logs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.workflow_rules(id) on delete cascade,
  entity_id text,
  entity_type text,
  action_taken text,
  success boolean default true,
  created_at timestamptz not null default now()
);

create index idx_workflow_logs_rule on public.workflow_logs(rule_id);
create index idx_workflow_logs_created on public.workflow_logs(created_at desc);

alter table public.workflow_logs enable row level security;
create policy "Admins can view workflow logs"
  on public.workflow_logs for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

create table public.cron_jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  schedule text not null,
  command text not null,
  is_active boolean default true,
  last_run timestamptz,
  next_run timestamptz,
  created_at timestamptz not null default now()
);

create index idx_cron_jobs_active on public.cron_jobs(is_active) where is_active = true;

alter table public.cron_jobs enable row level security;
create policy "Admins can manage cron jobs"
  on public.cron_jobs for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

-- -------------------------------------------------------------------------
-- CMS — Banners
-- -------------------------------------------------------------------------

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  link_url text,
  position text default 'top',
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create index idx_banners_active on public.banners(is_active, sort_order);

alter table public.banners enable row level security;
create policy "Anyone can view active banners"
  on public.banners for select
  using (is_active = true);
create policy "Admins can manage banners"
  on public.banners for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

-- -------------------------------------------------------------------------
-- CMS — Homepage Sections
-- -------------------------------------------------------------------------

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  component_type text not null,
  config jsonb default '{}'::jsonb,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

create index idx_homepage_sections_active on public.homepage_sections(is_active, sort_order);

alter table public.homepage_sections enable row level security;
create policy "Anyone can view active homepage sections"
  on public.homepage_sections for select
  using (is_active = true);
create policy "Admins can manage homepage sections"
  on public.homepage_sections for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

-- -------------------------------------------------------------------------
-- CMS — Landing Pages
-- -------------------------------------------------------------------------

create table public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content jsonb default '{}'::jsonb,
  meta_title text,
  meta_description text,
  is_published boolean default false,
  created_at timestamptz not null default now()
);

create index idx_landing_pages_slug on public.landing_pages(slug);
create index idx_landing_pages_published on public.landing_pages(is_published);

alter table public.landing_pages enable row level security;
create policy "Anyone can view published landing pages"
  on public.landing_pages for select
  using (is_published = true);
create policy "Admins can manage landing pages"
  on public.landing_pages for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

-- -------------------------------------------------------------------------
-- CMS — FAQ
-- -------------------------------------------------------------------------

create table public.faq_entries (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

create index idx_faq_entries_active on public.faq_entries(is_active, sort_order);

alter table public.faq_entries enable row level security;
create policy "Anyone can view active FAQ entries"
  on public.faq_entries for select
  using (is_active = true);
create policy "Admins can manage FAQ entries"
  on public.faq_entries for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

-- -------------------------------------------------------------------------
-- CMS — Blog Posts
-- -------------------------------------------------------------------------

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  slug text not null unique,
  body text,
  featured_image text,
  status public.blog_status default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_blog_posts_slug on public.blog_posts(slug);
create index idx_blog_posts_status on public.blog_posts(status);
create index idx_blog_posts_published on public.blog_posts(published_at desc);

alter table public.blog_posts enable row level security;
create policy "Anyone can view published blog posts"
  on public.blog_posts for select
  using (status = 'published');
create policy "Admins can manage blog posts"
  on public.blog_posts for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

-- -------------------------------------------------------------------------
-- CMS — Static Pages
-- -------------------------------------------------------------------------

create table public.static_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content jsonb default '{}'::jsonb,
  is_published boolean default false,
  created_at timestamptz not null default now()
);

create index idx_static_pages_slug on public.static_pages(slug);
create index idx_static_pages_published on public.static_pages(is_published);

alter table public.static_pages enable row level security;
create policy "Anyone can view published static pages"
  on public.static_pages for select
  using (is_published = true);
create policy "Admins can manage static pages"
  on public.static_pages for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

-- -------------------------------------------------------------------------
-- CMS — Terms & Privacy Versions
-- -------------------------------------------------------------------------

create table public.terms_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  content text not null,
  effective_date date not null,
  is_active boolean default false,
  created_at timestamptz not null default now()
);

create index idx_terms_versions_active on public.terms_versions(is_active);

alter table public.terms_versions enable row level security;
create policy "Anyone can view active terms versions"
  on public.terms_versions for select
  using (is_active = true);
create policy "Admins can manage terms versions"
  on public.terms_versions for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

create table public.privacy_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  content text not null,
  effective_date date not null,
  is_active boolean default false,
  created_at timestamptz not null default now()
);

create index idx_privacy_versions_active on public.privacy_versions(is_active);

alter table public.privacy_versions enable row level security;
create policy "Anyone can view active privacy versions"
  on public.privacy_versions for select
  using (is_active = true);
create policy "Admins can manage privacy versions"
  on public.privacy_versions for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

-- -------------------------------------------------------------------------
-- SEO
-- -------------------------------------------------------------------------

create table public.seo_settings (
  id uuid primary key default gen_random_uuid(),
  page_url text not null unique,
  meta_title text,
  meta_description text,
  og_title text,
  og_description text,
  og_image text,
  twitter_card text default 'summary_large_image',
  canonical_url text,
  structured_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_seo_settings_url on public.seo_settings(page_url);

alter table public.seo_settings enable row level security;
create policy "Anyone can view SEO settings"
  on public.seo_settings for select
  using (true);
create policy "Admins can manage SEO settings"
  on public.seo_settings for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_url text not null unique,
  to_url text not null,
  status_code int default 301,
  created_at timestamptz not null default now()
);

create index idx_redirects_from on public.redirects(from_url);

alter table public.redirects enable row level security;
create policy "Anyone can view redirects"
  on public.redirects for select
  using (true);
create policy "Admins can manage redirects"
  on public.redirects for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

create table public.sitemap_entries (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  last_modified timestamptz default now(),
  change_frequency text default 'weekly',
  priority numeric default 0.5,
  created_at timestamptz not null default now()
);

create index idx_sitemap_entries_url on public.sitemap_entries(url);

alter table public.sitemap_entries enable row level security;
create policy "Anyone can view sitemap entries"
  on public.sitemap_entries for select
  using (true);
create policy "Admins can manage sitemap entries"
  on public.sitemap_entries for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role in ('super_admin', 'admin')
    )
  );

-- -------------------------------------------------------------------------
-- Updated_at trigger for notification_preferences
-- -------------------------------------------------------------------------
drop trigger if exists trg_notifications_updated_at on public.notification_preferences;
create trigger trg_notifications_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();
