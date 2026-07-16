-- =========================================================================
-- BazarBD — Phase 19: Enterprise Moderation System
-- =========================================================================
-- Tables: moderation_sessions, moderation_actions, listing_versions,
--         moderation_notes, moderation_queue_events
--
-- All moderation history is append-only (immutable). Never UPDATE or DELETE
-- historical records — every change is a new INSERT.
-- =========================================================================

-- =========================================================================
-- moderation_sessions — tracks each moderator's review session
-- =========================================================================
create table if not exists public.moderation_sessions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references auth.users(id) on delete cascade,
  moderator_name text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  session_duration_seconds int,
  ads_reviewed int default 0,
  approvals int default 0,
  rejections int default 0,
  skipped int default 0,
  escalated int default 0,
  errors int default 0,
  avg_response_time_seconds numeric,
  avg_handling_time_seconds numeric,
  queue_size_at_start int,
  is_active boolean default true
);

create index if not exists idx_mod_sessions_moderator on public.moderation_sessions (moderator_id);
create index if not exists idx_mod_sessions_active on public.moderation_sessions (is_active) where is_active = true;
create index if not exists idx_mod_sessions_started on public.moderation_sessions (started_at desc);

-- =========================================================================
-- moderation_actions — immutable record of every moderation event
-- =========================================================================
do $ptype$ begin
  create type public.moderation_action_type as enum (
    'manual_review_initialized',
    'title_changed',
    'description_edited',
    'price_changed',
    'category_changed',
    'brand_changed',
    'model_changed',
    'location_changed',
    'condition_changed',
    'tags_changed',
    'image_deleted',
    'image_reordered',
    'phone_removed',
    'duplicate_detected',
    'seller_warned',
    'internal_note_added',
    'approval',
    'rejection',
    'request_changes',
    'suspend',
    'hide',
    'escalated',
    'assigned',
    'seller_contacted',
    'reopened',
    'restored',
    'visibility_changed',
    'system_action',
    'ai_suggestion',
    'auto_flagged',
    'save_without_approve',
    'undo_edits',
    'preview_listing'
  );
exception when duplicate_object then null;
end $ptype$;

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.ads(id) on delete cascade,
  moderator_id uuid references auth.users(id) on delete set null,
  moderator_name text,
  moderator_role text,
  action_type public.moderation_action_type not null,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  notes text,
  ip_address text,
  browser_session_id text,
  version_number int not null default 1,
  duration_from_previous_seconds int,
  created_at timestamptz not null default now()
);

create index if not exists idx_mod_actions_listing on public.moderation_actions (listing_id, created_at desc);
create index if not exists idx_mod_actions_moderator on public.moderation_actions (moderator_id);
create index if not exists idx_mod_actions_type on public.moderation_actions (action_type);
create index if not exists idx_mod_actions_created on public.moderation_actions (created_at desc);

-- =========================================================================
-- listing_versions — before/after snapshots of edited fields
-- =========================================================================
create table if not exists public.listing_versions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.ads(id) on delete cascade,
  version_number int not null,
  field_name text not null,
  old_value text,
  new_value text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_name text,
  changed_at timestamptz not null default now(),
  moderation_action_id uuid references public.moderation_actions(id) on delete cascade
);

create index if not exists idx_listing_versions_listing on public.listing_versions (listing_id, version_number desc);
create index if not exists idx_listing_versions_field on public.listing_versions (listing_id, field_name);

-- =========================================================================
-- moderation_notes — internal moderator notes (not visible to sellers)
-- =========================================================================
create table if not exists public.moderation_notes (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.ads(id) on delete cascade,
  moderator_id uuid not null references auth.users(id) on delete cascade,
  moderator_name text,
  note text not null,
  is_pinned boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_mod_notes_listing on public.moderation_notes (listing_id, created_at desc);

-- =========================================================================
-- moderation_queue_events — queue entry/exit/reassignment/wait times
-- =========================================================================
create table if not exists public.moderation_queue_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.ads(id) on delete cascade,
  event_type text not null,
  moderator_id uuid references auth.users(id) on delete set null,
  from_moderator uuid references auth.users(id) on delete set null,
  to_moderator uuid references auth.users(id) on delete set null,
  queue_position int,
  wait_time_seconds int,
  created_at timestamptz not null default now()
);

create index if not exists idx_mod_queue_events_listing on public.moderation_queue_events (listing_id, created_at desc);
create index if not exists idx_mod_queue_events_type on public.moderation_queue_events (event_type);

-- =========================================================================
-- RLS Policies
-- =========================================================================

alter table public.moderation_sessions enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.listing_versions enable row level security;
alter table public.moderation_notes enable row level security;
alter table public.moderation_queue_events enable row level security;

-- Moderation sessions: admins/moderators can manage their own, admins see all
drop policy if exists "Moderators insert own sessions" on public.moderation_sessions;
create policy "Moderators insert own sessions" on public.moderation_sessions
  for insert with check (auth.uid() = moderator_id);

drop policy if exists "Moderators view own sessions" on public.moderation_sessions;
create policy "Moderators view own sessions" on public.moderation_sessions
  for select using (auth.uid() = moderator_id or public.is_admin(auth.uid()));

drop policy if exists "Moderators update own sessions" on public.moderation_sessions;
create policy "Moderators update own sessions" on public.moderation_sessions
  for update using (auth.uid() = moderator_id);

-- Moderation actions: admins/moderators can insert, admins see all
drop policy if exists "Moderators insert actions" on public.moderation_actions;
create policy "Moderators insert actions" on public.moderation_actions
  for insert with check (auth.uid() = moderator_id or public.is_admin(auth.uid()));

drop policy if exists "Admins view moderation actions" on public.moderation_actions;
create policy "Admins view moderation actions" on public.moderation_actions
  for select using (public.is_admin(auth.uid()) or auth.uid() = moderator_id);

-- Listing versions: same pattern
drop policy if exists "Moderators insert versions" on public.listing_versions;
create policy "Moderators insert versions" on public.listing_versions
  for insert with check (auth.uid() = changed_by or public.is_admin(auth.uid()));

drop policy if exists "Admins view listing versions" on public.listing_versions;
create policy "Admins view listing versions" on public.listing_versions
  for select using (public.is_admin(auth.uid()) or auth.uid() = changed_by);

-- Moderation notes
drop policy if exists "Moderators insert notes" on public.moderation_notes;
create policy "Moderators insert notes" on public.moderation_notes
  for insert with check (auth.uid() = moderator_id);

drop policy if exists "Admins view moderation notes" on public.moderation_notes;
create policy "Admins view moderation notes" on public.moderation_notes
  for select using (public.is_admin(auth.uid()) or auth.uid() = moderator_id);

-- Queue events
drop policy if exists "Moderators insert queue events" on public.moderation_queue_events;
create policy "Moderators insert queue events" on public.moderation_queue_events
  for insert with check (public.is_admin(auth.uid()));

drop policy if exists "Admins view queue events" on public.moderation_queue_events;
create policy "Admins view queue events" on public.moderation_queue_events
  for select using (public.is_admin(auth.uid()));

-- =========================================================================
-- Grants
-- =========================================================================
grant insert, select, update on public.moderation_sessions to authenticated;
grant insert, select on public.moderation_actions to authenticated;
grant insert, select on public.listing_versions to authenticated;
grant insert, select on public.moderation_notes to authenticated;
grant insert, select on public.moderation_queue_events to authenticated;
