-- BazarBD — Phase 8: Messaging System
-- schema_v8_messaging.sql
-- Run after all previous migrations.
-- -------------------------------------------------------------------------
-- Adds: conversations table, message edits, typing indicators, pinned/
-- muted conversations, message reports, user presence, delivery status,
-- message read receipts, shared product cards in messages.
-- Extends existing messages table with new columns.
-- -------------------------------------------------------------------------

-- =========================================================================
-- Enum additions
-- =========================================================================

do $$ begin
DO $$ BEGIN
    create type public.message_status as enum ('sent', 'delivered', 'read');
exception when duplicate_object then null; end $$;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

do $$ begin
DO $$ BEGIN
    create type public.message_type as enum ('text', 'image', 'file', 'product_card', 'listing_link', 'store_link', 'location', 'contact_card');
exception when duplicate_object then null; end $$;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

do $$ begin
DO $$ BEGIN
    create type public.conversation_report_reason as enum ('spam', 'scam', 'harassment', 'abuse', 'threats', 'offensive_language', 'fraud', 'fake_products', 'other');
exception when duplicate_object then null; end $$;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- Extend messages table with Phase 8 columns
-- =========================================================================

alter table public.messages
  add column if not exists message_type public.message_type default 'text',
  add column if not exists status public.message_status default 'sent',
  add column if not exists edited_at timestamptz,
  add column if not exists edited_body text,
  add column if not exists deleted_by_sender boolean default false,
  add column if not exists deleted_by_receiver boolean default false,
  add column if not exists deleted_for_everyone boolean default false,
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null,
  add column if not exists metadata jsonb default '{}'::jsonb;

create index if not exists idx_messages_status on public.messages(status);
create index if not exists idx_messages_type on public.messages(message_type);
create index if not exists idx_messages_reply_to on public.messages(reply_to_id);
create index if not exists idx_messages_created_desc on public.messages(created_at desc);

-- =========================================================================
-- Conversations table (structured conversation management)
-- =========================================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_1 uuid not null references auth.users(id) on delete cascade,
  participant_2 uuid not null references auth.users(id) on delete cascade,
  ad_id uuid references public.ads(id) on delete set null,
  shop_id uuid references public.shops(id) on delete set null,
  last_message_id uuid references public.messages(id) on delete set null,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count_p1 int default 0,
  unread_count_p2 int default 0,
  is_pinned_p1 boolean default false,
  is_pinned_p2 boolean default false,
  is_muted_p1 boolean default false,
  is_muted_p2 boolean default false,
  is_archived_p1 boolean default false,
  is_archived_p2 boolean default false,
  is_marked_unread_p1 boolean default false,
  is_marked_unread_p2 boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_1, participant_2, ad_id),
  check (participant_1 <> participant_2)
);

create index if not exists idx_conversations_p1 on public.conversations(participant_1);
create index if not exists idx_conversations_p2 on public.conversations(participant_2);
create index if not exists idx_conversations_p1_updated on public.conversations(participant_1, updated_at desc);
create index if not exists idx_conversations_p2_updated on public.conversations(participant_2, updated_at desc);
create index if not exists idx_conversations_ad on public.conversations(ad_id);

-- =========================================================================
-- Typing Indicators
-- =========================================================================

create table if not exists public.typing_indicators (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_typing boolean default false,
  updated_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create index if not exists idx_typing_conversation on public.typing_indicators(conversation_id);

-- =========================================================================
-- User Presence (online/offline status)
-- =========================================================================

create table if not exists public.user_presence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  is_online boolean default false,
  last_seen timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_presence_user on public.user_presence(user_id);
create index if not exists idx_user_presence_online on public.user_presence(is_online) where is_online = true;

-- =========================================================================
-- Message Reports
-- =========================================================================

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  reason public.conversation_report_reason not null,
  description text,
  screenshot_urls text[] default '{}',
  status public.report_status not null default 'pending',
  admin_notes text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  is_resolved boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_message_reports_reporter on public.message_reports(reporter_id);
create index if not exists idx_message_reports_reported on public.message_reports(reported_user_id);
create index if not exists idx_message_reports_status on public.message_reports(status);

-- =========================================================================
-- Message Edit History
-- =========================================================================

create table if not exists public.message_edit_history (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  old_body text not null,
  edited_by uuid not null references auth.users(id) on delete cascade,
  edited_at timestamptz not null default now()
);

create index if not exists idx_message_edit_history_message on public.message_edit_history(message_id);

-- =========================================================================
-- Conversation Mute Settings
-- =========================================================================

create table if not exists public.conversation_mute_settings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mute_duration int default 0,
  mute_until timestamptz,
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create index if not exists idx_conversation_mute_settings on public.conversation_mute_settings(user_id);

-- =========================================================================
-- Updated At triggers
-- =========================================================================

create or replace function public.update_updated_at_v8()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger if not exists trg_conversations_updated_at
  before update on public.conversations
  for each row execute procedure public.update_updated_at_v8();

create trigger if not exists trg_typing_indicators_updated_at
  before update on public.typing_indicators
  for each row execute procedure public.update_updated_at_v8();

create trigger if not exists trg_user_presence_updated_at
  before update on public.user_presence
  for each row execute procedure public.update_updated_at_v8();

create trigger if not exists trg_message_reports_updated_at
  before update on public.message_reports
  for each row execute procedure public.update_updated_at_v8();

-- =========================================================================
-- Function: get_or_create_conversation
-- =========================================================================

create or replace function public.get_or_create_conversation(
  p_user_1 uuid,
  p_user_2 uuid,
  p_ad_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
  p1 uuid;
  p2 uuid;
begin
  -- Ensure consistent ordering (smaller UUID first)
  if p_user_1 < p_user_2 then
    p1 := p_user_1;
    p2 := p_user_2;
  else
    p1 := p_user_2;
    p2 := p_user_1;
  end if;

  select id into conv_id
  from public.conversations
  where participant_1 = p1 and participant_2 = p2 and ad_id = p_ad_id
  limit 1;

  if conv_id is null then
    insert into public.conversations (participant_1, participant_2, ad_id)
    values (p1, p2, p_ad_id)
    returning id into conv_id;
  end if;

  return conv_id;
end;
$$;

-- =========================================================================
-- Function: update_conversation_last_message
-- =========================================================================

create or replace function public.update_conversation_last_message(
  p_conversation_id uuid,
  p_message_id uuid,
  p_preview text,
  p_sender_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message_id = p_message_id,
    last_message_preview = p_preview,
    last_message_at = now(),
    updated_at = now(),
    unread_count_p1 = case when p_sender_id = participant_1 then unread_count_p1 else unread_count_p1 + 1 end,
    unread_count_p2 = case when p_sender_id = participant_2 then unread_count_p2 else unread_count_p2 + 1 end
  where id = p_conversation_id;
end;
$$;

-- =========================================================================
-- Function: mark_conversation_read
-- =========================================================================

create or replace function public.mark_conversation_read(
  p_conversation_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    unread_count_p1 = case when participant_1 = p_user_id then 0 else unread_count_p1 end,
    unread_count_p2 = case when participant_2 = p_user_id then 0 else unread_count_p2 end,
    is_marked_unread_p1 = case when participant_1 = p_user_id then false else is_marked_unread_p1 end,
    is_marked_unread_p2 = case when participant_2 = p_user_id then false else is_marked_unread_p2 end,
    updated_at = now()
  where id = p_conversation_id;

  -- Mark messages as read
  update public.messages
  set is_read = true, read_at = now(), status = 'read'
  where (
    (sender_id = (select participant_1 from public.conversations where id = p_conversation_id) and receiver_id = p_user_id)
    or
    (sender_id = (select participant_2 from public.conversations where id = p_conversation_id) and receiver_id = p_user_id)
  )
  and is_read = false;
end;
$$;

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.conversations enable row level security;
alter table public.typing_indicators enable row level security;
alter table public.user_presence enable row level security;
alter table public.message_reports enable row level security;
alter table public.message_edit_history enable row level security;
alter table public.conversation_mute_settings enable row level security;

-- Conversations: participants can view and manage their own
DO $$ BEGIN
  create policy "Users view own conversations" on public.conversations for select
  using (participant_1 = auth.uid() or participant_2 = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Users create own conversations" on public.conversations for insert
  with check (participant_1 = auth.uid() or participant_2 = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Users update own conversations" on public.conversations for update
  using (participant_1 = auth.uid() or participant_2 = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Typing indicators: participants can view and manage
DO $$ BEGIN
  create policy "Users view typing in own conversations" on public.typing_indicators for select
  using (exists (
    select 1 from public.conversations c
    where c.id = typing_indicators.conversation_id
    and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Users set own typing" on public.typing_indicators for insert
  with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Users update own typing" on public.typing_indicators for update
  using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Users delete own typing" on public.typing_indicators for delete
  using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User presence: public read (for online status), owner update
DO $$ BEGIN
  create policy "Public can view presence" on public.user_presence for select using (true);
create policy "Users manage own presence" on public.user_presence for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Message reports: reporter creates, admins view
DO $$ BEGIN
  create policy "Users create message reports" on public.message_reports for insert
  with check (reporter_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Users view own message reports" on public.message_reports for select
  using (reporter_id = auth.uid() or public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Admins update message reports" on public.message_reports for update
  using (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Message edit history: message sender and admins
DO $$ BEGIN
  create policy "Users view own message edits" on public.message_edit_history for select
  using (
    exists (select 1 from public.messages m where m.id = message_edit_history.message_id and (m.sender_id = auth.uid() or m.receiver_id = auth.uid()))
    or public.is_admin(auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Users insert own message edits" on public.message_edit_history for insert
  with check (edited_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Conversation mute settings: owner manages
DO $$ BEGIN
  create policy "Users view own mute settings" on public.conversation_mute_settings for select
  using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Users create own mute settings" on public.conversation_mute_settings for insert
  with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Users update own mute settings" on public.conversation_mute_settings for update
  using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Users delete own mute settings" on public.conversation_mute_settings for delete
  using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- GRANT permissions
-- =========================================================================

grant select, insert, update on public.conversations to authenticated;
grant select, insert, update, delete on public.typing_indicators to authenticated;
grant select, insert, update on public.user_presence to authenticated;
grant select, insert on public.message_reports to authenticated;
grant select, update on public.message_reports to authenticated;
grant select, insert on public.message_edit_history to authenticated;
grant select, insert, update, delete on public.conversation_mute_settings to authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

grant execute on function public.get_or_create_conversation(uuid, uuid, uuid) to authenticated;
grant execute on function public.update_conversation_last_message(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid, uuid) to authenticated;
