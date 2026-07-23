-- Marketplace orders: C2C deal lifecycle after an offer is accepted.
-- Safe to re-run, and dependency-safe: statements that touch optional tables
-- (offers, ads, payouts, transactions) are guarded so this migration applies
-- cleanly even if those tables/schemas have not been created yet.

-- ---------------------------------------------------------------------------
-- 0. Safety: make sure the is_staff() helper exists (it normally comes from
--    01_core.sql). If it's missing we create the same definition so the RLS
--    policies below don't fail with "function public.is_staff(uuid) does not exist".
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_staff'
  ) and to_regclass('public.user_roles') is not null then
    execute $fn$
      create function public.is_staff(_user_id uuid)
      returns boolean language sql stable security definer set search_path = public as $f$
        select exists (
          select 1 from public.user_roles
          where user_id = _user_id
            and role in ('super_admin', 'admin', 'moderator', 'customer_support')
        )
      $f$;
    $fn$;
  end if;
end $$;

-- Fallback used by policies when public.is_staff is unavailable.
-- (Never overrides an existing is_staff; only referenced if the guards above
--  could not create one.)

-- ---------------------------------------------------------------------------
-- 1. Table (created without hard FKs to optional tables so it always applies)
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  offer_id uuid unique,
  ad_id uuid,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null default 0,
  currency text not null default 'BDT',
  -- pending | confirmed | meetup_set | completed | cancelled | disputed
  status text not null default 'pending',
  -- unpaid | paid_outside | paid | refunded
  payment_status text not null default 'unpaid',
  payment_method text,
  meetup_location text,
  meetup_at timestamptz,
  buyer_notes text,
  seller_notes text,
  cancel_reason text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add the optional foreign keys only if the referenced tables exist.
do $$
begin
  if to_regclass('public.offers') is not null
     and not exists (select 1 from pg_constraint where conname = 'marketplace_orders_offer_id_fkey') then
    execute 'alter table public.marketplace_orders
             add constraint marketplace_orders_offer_id_fkey
             foreign key (offer_id) references public.offers(id) on delete set null';
  end if;

  if to_regclass('public.ads') is not null
     and not exists (select 1 from pg_constraint where conname = 'marketplace_orders_ad_id_fkey') then
    execute 'alter table public.marketplace_orders
             add constraint marketplace_orders_ad_id_fkey
             foreign key (ad_id) references public.ads(id) on delete set null';
  end if;
end $$;

create index if not exists marketplace_orders_buyer_idx on public.marketplace_orders (buyer_id);
create index if not exists marketplace_orders_seller_idx on public.marketplace_orders (seller_id);
create index if not exists marketplace_orders_status_idx on public.marketplace_orders (status);
create index if not exists marketplace_orders_created_idx on public.marketplace_orders (created_at desc);

alter table public.marketplace_orders enable row level security;

drop policy if exists "Select own marketplace orders" on public.marketplace_orders;
create policy "Select own marketplace orders" on public.marketplace_orders
  for select using (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or public.is_staff(auth.uid())
  );

drop policy if exists "Insert marketplace orders as participant" on public.marketplace_orders;
create policy "Insert marketplace orders as participant" on public.marketplace_orders
  for insert with check (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or public.is_staff(auth.uid())
  );

drop policy if exists "Update own marketplace orders" on public.marketplace_orders;
create policy "Update own marketplace orders" on public.marketplace_orders
  for update using (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or public.is_staff(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2. Optional: payouts admin columns (only if the payouts table exists)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.payouts') is not null then
    execute 'alter table public.payouts add column if not exists failure_reason text';
    execute 'alter table public.payouts add column if not exists admin_notes text';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Optional: transactions insert policies (only if the table exists)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.transactions') is not null then
    execute 'drop policy if exists "Staff insert transactions" on public.transactions';
    execute 'create policy "Staff insert transactions" on public.transactions
             for insert with check (user_id = auth.uid() or public.is_staff(auth.uid()))';

    execute 'drop policy if exists "Seller insert sale transactions" on public.transactions';
    execute 'create policy "Seller insert sale transactions" on public.transactions
             for insert with check (user_id = auth.uid())';
  end if;
end $$;
