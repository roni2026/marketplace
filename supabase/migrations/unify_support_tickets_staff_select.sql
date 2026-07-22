-- Ensure staff can list all support tickets (select was previously only
-- "own or is_staff" on a single policy — keep explicit staff select for clarity).
-- Safe to re-run.

drop policy if exists "Staff view all tickets" on public.support_tickets;
create policy "Staff view all tickets" on public.support_tickets
  for select using (public.is_staff(auth.uid()));

drop policy if exists "Staff insert ticket messages" on public.support_ticket_messages;
create policy "Staff insert ticket messages" on public.support_ticket_messages
  for insert with check (
    auth.uid() = user_id
    and (
      is_staff = false
      or public.is_staff(auth.uid())
    )
  );
