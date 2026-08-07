-- Fixes a real bug found testing Phase 60: circle_connections' original
-- WITH CHECK used shares_verified_neighbourhood(connected_user_id), which
-- only holds for SAME-neighbourhood people — but "From your city"
-- (Phase 59) is explicitly designed to let a user discover and connect
-- with people OUTSIDE their neighbourhood. The original constraint
-- silently rejected every "Add to Circle" tap from that tier with no
-- client-visible error (the insert just failed RLS).
--
-- The correct boundary isn't "same neighbourhood", it's "this is a real
-- verified user, and we haven't blocked each other" — which matches what
-- both discovery RPCs already independently enforce before a user ever
-- becomes reachable. is_verified_user follows the same SECURITY DEFINER
-- pattern as everything else touching society_memberships from outside
-- its own RLS (memberships_select_own would otherwise block checking
-- someone else's verification status).
create function public.is_verified_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.society_memberships
    where user_id = p_user_id and verification_status = 'verified'
  );
$$;

drop policy circle_connections_own on public.circle_connections;

create policy circle_connections_own on public.circle_connections
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.is_verified_user(connected_user_id)
    and not public.is_blocked_between(auth.uid(), connected_user_id)
  );
