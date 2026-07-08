-- BazarBD — reference Supabase schema
-- -------------------------------------------------------------------------
-- This file is reverse-engineered from the generated `src/integrations/
-- supabase/types.ts` client types (the original repo shipped only the
-- frontend, with no migrations). Review carefully before running against a
-- production project — in particular the Row Level Security policies below
-- are a reasonable default, not a guarantee, for this app's access patterns.
-- -------------------------------------------------------------------------

-- Enums
create type public.ad_status as enum ('pending', 'approved', 'rejected', 'sold');
create type public.app_role as enum ('admin', 'user');
create type public.item_condition as enum ('new', 'used');
create type public.price_type as enum ('fixed', 'negotiable', 'free');

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now()
);

-- Profiles (mirrors auth.users, created via trigger on signup)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  phone_number text,
  avatar_url text,
  division text,
  district text,
  area text,
  is_blocked boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Ads
create table public.ads (
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
  is_featured boolean default false,
  views_count int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ads_status_idx on public.ads (status);
create index ads_category_idx on public.ads (category_id);
create index ads_user_idx on public.ads (user_id);

create table public.ad_images (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  image_url text not null,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, ad_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_id uuid not null references public.ads(id) on delete cascade,
  reason text not null,
  is_resolved boolean default false,
  created_at timestamptz not null default now()
);

-- Helper function used by RLS policies to check admin role without recursion
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

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

-- Categories / subcategories: publicly readable, admin-writable
create policy "Categories are viewable by everyone" on public.categories for select using (true);
create policy "Admins manage categories" on public.categories for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Subcategories are viewable by everyone" on public.subcategories for select using (true);
create policy "Admins manage subcategories" on public.subcategories for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Profiles: viewable by everyone (needed to show seller info), editable by owner
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = user_id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = user_id);

-- Roles: only readable by the user themself / admins; only admins can grant roles
create policy "Users view own roles" on public.user_roles for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Ads: approved ads are public; owners see all their own ads; admins see everything
create policy "Approved ads are public" on public.ads for select using (status = 'approved');
create policy "Owners view their own ads" on public.ads for select using (auth.uid() = user_id);
create policy "Admins view all ads" on public.ads for select using (public.has_role(auth.uid(), 'admin'));
create policy "Users create their own ads" on public.ads for insert with check (auth.uid() = user_id);
create policy "Owners update their own ads" on public.ads for update using (auth.uid() = user_id);
create policy "Admins update any ad" on public.ads for update using (public.has_role(auth.uid(), 'admin'));
create policy "Owners delete their own ads" on public.ads for delete using (auth.uid() = user_id);
create policy "Admins delete any ad" on public.ads for delete using (public.has_role(auth.uid(), 'admin'));

-- Ad images follow the parent ad's visibility
create policy "Ad images follow ad visibility" on public.ad_images for select
  using (exists (
    select 1 from public.ads
    where ads.id = ad_images.ad_id
      and (ads.status = 'approved' or ads.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  ));
create policy "Owners manage their ad images" on public.ad_images for all
  using (exists (select 1 from public.ads where ads.id = ad_images.ad_id and ads.user_id = auth.uid()))
  with check (exists (select 1 from public.ads where ads.id = ad_images.ad_id and ads.user_id = auth.uid()));

-- Favorites: private to the owner
create policy "Users manage their own favorites" on public.favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reports: users create, admins review
create policy "Users create reports" on public.reports for insert with check (auth.uid() = user_id);
create policy "Users view their own reports" on public.reports for select using (auth.uid() = user_id);
create policy "Admins manage reports" on public.reports for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- -------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up
-- -------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

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
