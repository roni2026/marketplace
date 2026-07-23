-- Ensure staff can list all support tickets and post staff replies.
-- Safe to re-run, and dependency-safe: each policy is only (re)created if its
-- table exists, so this migration never fails with "relation does not exist".

-- Make sure the is_staff() helper exists (normally from 01_core.sql).
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

-- Staff can view all support tickets.
do $$
begin
  if to_regclass('public.support_tickets') is not null then
    execute 'drop policy if exists "Staff view all tickets" on public.support_tickets';
    execute 'create policy "Staff view all tickets" on public.support_tickets
             for select using (public.is_staff(auth.uid()))';
  end if;
end $$;

-- Staff (or the message author) can insert ticket messages.
do $$
begin
  if to_regclass('public.support_ticket_messages') is not null then
    execute 'drop policy if exists "Staff insert ticket messages" on public.support_ticket_messages';
    execute 'create policy "Staff insert ticket messages" on public.support_ticket_messages
             for insert with check (
               auth.uid() = user_id
               and (
                 is_staff = false
                 or public.is_staff(auth.uid())
               )
             )';
  end if;
end $$;
