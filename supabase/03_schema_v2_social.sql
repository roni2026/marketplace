-- BazarBD — Social & Commerce v2 schema
-- -------------------------------------------------------------------------
-- Enhanced messaging, reviews, seller analytics, buyer experience tables.
-- Run after schema.sql. Review RLS policies before production use.
-- -------------------------------------------------------------------------

-- Enums
DO $$ BEGIN
  create type public.review_status as enum ('pending', 'approved', 'rejected', 'appealed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  -- -------------------------------------------------------------------------
-- Enhanced Messaging tables
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique(message_id, user_id, emoji)
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  file_url text not null,
  file_type text not null,
  file_name text not null,
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.quick_replies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.auto_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  response text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.conversation_archive (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  archived_at timestamptz not null default now(),
  unique(conversation_id, user_id)
);

-- -------------------------------------------------------------------------
-- Review System tables
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid references public.ads(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  title text,
  body text,
  images text[] default '{}',
  videos text[] default '{}',
  is_verified_purchase boolean not null default false,
  helpful_count int not null default 0,
  status public.review_status not null default 'pending',
  appeal_reason text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.review_helpful (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(review_id, user_id)
);

-- -------------------------------------------------------------------------
-- Seller Dashboard tables
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.seller_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  views int not null default 0,
  inquiries int not null default 0,
  offers int not null default 0,
  conversions int not null default 0,
  revenue numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.seller_followers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  follower_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(seller_id, follower_id)
);

-- -------------------------------------------------------------------------
-- Buyer Experience tables
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.product_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.recently_sold (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid references public.ads(id) on delete cascade,
  sold_at timestamptz not null default now(),
  sold_price numeric(12,2)
);

CREATE TABLE IF NOT EXISTS public.price_drops (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  old_price numeric(12,2) not null,
  new_price numeric(12,2) not null,
  dropped_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  score numeric(5,2) not null default 0,
  reason text,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.saved_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id)
);

CREATE TABLE IF NOT EXISTS public.buying_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  reminder_date date not null,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Indexes
-- -------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_message_reactions_message on public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user on public.message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message on public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_user on public.quick_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_responses_user on public.auto_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_archive_user on public.conversation_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_ad on public.reviews(ad_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller on public.reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer on public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status on public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_review_replies_review on public.review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_review on public.review_helpful(review_id);
CREATE INDEX IF NOT EXISTS idx_seller_analytics_user_date on public.seller_analytics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_seller_followers_seller on public.seller_followers(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_followers_follower on public.seller_followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_product_comparisons_user on public.product_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_sold_sold_at on public.recently_sold(sold_at);
CREATE INDEX IF NOT EXISTS idx_price_drops_ad on public.price_drops(ad_id);
CREATE INDEX IF NOT EXISTS idx_price_drops_dropped_at on public.price_drops(dropped_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_user on public.recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_score on public.recommendations(score desc);
CREATE INDEX IF NOT EXISTS idx_saved_carts_user on public.saved_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_buying_reminders_user on public.buying_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_buying_reminders_date on public.buying_reminders(reminder_date);

-- -------------------------------------------------------------------------
-- RLS Policies
-- -------------------------------------------------------------------------

alter table public.message_reactions enable row level security;
alter table public.message_attachments enable row level security;
alter table public.quick_replies enable row level security;
alter table public.auto_responses enable row level security;
alter table public.conversation_archive enable row level security;
alter table public.reviews enable row level security;
alter table public.review_replies enable row level security;
alter table public.review_helpful enable row level security;
alter table public.seller_analytics enable row level security;
alter table public.seller_followers enable row level security;
alter table public.product_comparisons enable row level security;
alter table public.recently_sold enable row level security;
alter table public.price_drops enable row level security;
alter table public.recommendations enable row level security;
alter table public.saved_carts enable row level security;
alter table public.buying_reminders enable row level security;

-- message_reactions: users manage their own; participants can view
DO $$ BEGIN
  create policy "Select own reactions" on public.message_reactions for select using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own reactions" on public.message_reactions for insert with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Delete own reactions" on public.message_reactions for delete using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  -- message_attachments: owner can view/insert
create policy "Select own attachments" on public.message_attachments for select using (
  exists(select 1 from public.messages m where m.id = message_id and (m.sender_id = auth.uid() or m.receiver_id = auth.uid()))
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own attachments" on public.message_attachments for insert with check (
  exists(select 1 from public.messages m where m.id = message_id and m.sender_id = auth.uid())
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- quick_replies: owner only
DO $$ BEGIN
  create policy "Select own quick replies" on public.quick_replies for select using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own quick replies" on public.quick_replies for insert with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Update own quick replies" on public.quick_replies for update using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Delete own quick replies" on public.quick_replies for delete using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- auto_responses: owner only
DO $$ BEGIN
  create policy "Select own auto responses" on public.auto_responses for select using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own auto responses" on public.auto_responses for insert with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Update own auto responses" on public.auto_responses for update using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Delete own auto responses" on public.auto_responses for delete using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- conversation_archive: owner only
DO $$ BEGIN
  create policy "Select own archives" on public.conversation_archive for select using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own archives" on public.conversation_archive for insert with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Delete own archives" on public.conversation_archive for delete using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  -- reviews: anyone can view approved; reviewer creates; seller can reply; admin moderates
create policy "Select approved reviews" on public.reviews for select using (
  status = 'approved' or reviewer_id = auth.uid() or seller_id = auth.uid()
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own reviews" on public.reviews for insert with check (reviewer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Update own reviews" on public.reviews for update using (reviewer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- review_replies: review author or seller can view; authenticated can insert
DO $$ BEGIN
  create policy "Select review replies" on public.review_replies for select using (
  exists(select 1 from public.reviews r where r.id = review_id and (r.status = 'approved' or r.reviewer_id = auth.uid() or r.seller_id = auth.uid()))
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert review replies" on public.review_replies for insert with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  -- review_helpful: authenticated can view and insert own
create policy "Select review helpful" on public.review_helpful for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own helpful" on public.review_helpful for insert with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Delete own helpful" on public.review_helpful for delete using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- seller_analytics: owner only
DO $$ BEGIN
  create policy "Select own analytics" on public.seller_analytics for select using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own analytics" on public.seller_analytics for insert with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Update own analytics" on public.seller_analytics for update using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  -- seller_followers: public can view; users manage own follows
create policy "Select followers" on public.seller_followers for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own follow" on public.seller_followers for insert with check (follower_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Delete own follow" on public.seller_followers for delete using (follower_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- product_comparisons: owner only
DO $$ BEGIN
  create policy "Select own comparisons" on public.product_comparisons for select using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own comparisons" on public.product_comparisons for insert with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Update own comparisons" on public.product_comparisons for update using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Delete own comparisons" on public.product_comparisons for delete using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- recently_sold: public view
DO $$ BEGIN
  create policy "Select recently sold" on public.recently_sold for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  -- price_drops: public view
create policy "Select price drops" on public.price_drops for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- recommendations: owner only
DO $$ BEGIN
  create policy "Select own recommendations" on public.recommendations for select using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  -- saved_carts: owner only
create policy "Select own carts" on public.saved_carts for select using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own carts" on public.saved_carts for insert with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Update own carts" on public.saved_carts for update using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Delete own carts" on public.saved_carts for delete using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  -- buying_reminders: owner only
create policy "Select own reminders" on public.buying_reminders for select using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Insert own reminders" on public.buying_reminders for insert with check (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Update own reminders" on public.buying_reminders for update using (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "Delete own reminders" on public.buying_reminders for delete using (user_id = auth.uid());

EXCEPTION WHEN duplicate_object THEN NULL; END $$;