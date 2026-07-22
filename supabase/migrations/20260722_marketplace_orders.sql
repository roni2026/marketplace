-- Marketplace orders: C2C deal lifecycle after an offer is accepted.
-- Safe to re-run.

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  offer_id uuid unique references public.offers(id) on delete set null,
  ad_id uuid references public.ads(id) on delete set null,
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

-- Admin notes on payouts (optional column used by admin UI)
alter table public.payouts add column if not exists failure_reason text;
alter table public.payouts add column if not exists admin_notes text;

-- Staff can insert sale transactions when completing orders
drop policy if exists "Staff insert transactions" on public.transactions;
create policy "Staff insert transactions" on public.transactions
  for insert with check (
    user_id = auth.uid()
    or public.is_staff(auth.uid())
  );

-- Sellers may insert a sale transaction for themselves when completing a deal
drop policy if exists "Seller insert sale transactions" on public.transactions;
create policy "Seller insert sale transactions" on public.transactions
  for insert with check (user_id = auth.uid());
