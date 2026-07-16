-- =========================================================================
-- BazarBD — Fix: Allow admins/moderators to view all reviews (including pending)
-- =========================================================================
-- The original RLS policy only allowed seeing approved reviews or ones where
-- the current user was the reviewer/seller. Admins couldn't see pending reviews
-- for moderation, so the Review Moderation page showed 0 results.
-- =========================================================================

-- Reviews: admins can see all, users can see approved + own + reviews about them
drop policy if exists "Select approved reviews" on public.reviews;
create policy "Select reviews — admins see all, users see approved + own" on public.reviews
  for select using (
    status = 'approved'
    or reviewer_id = auth.uid()
    or seller_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- Reviews: admins can update (moderate) any review
drop policy if exists "Update own reviews" on public.reviews;
create policy "Update reviews — owner or admin" on public.reviews
  for update using (
    reviewer_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- Reviews: admins can delete any review
drop policy if exists "Admins delete reviews" on public.reviews;
create policy "Admins delete reviews" on public.reviews
  for delete using (public.is_admin(auth.uid()));

-- Grant necessary permissions
grant select, update, delete on public.reviews to authenticated;
