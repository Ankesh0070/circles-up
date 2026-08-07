-- Fixes a real bug caught while wiring Phase 24 (Stories): `profiles_select_own`
-- (from the Group B migration) only ever let a user read their OWN profile
-- row. That's correct for private fields, but it silently broke every
-- PostgREST embed of author info (stories/posts/comments joining
-- `profiles`) for anyone else's content — the embed just came back null.
--
-- The fix matches problemstatement.md's actual trust model: a verified
-- member should be able to see the name/avatar of any other verified member
-- they share a neighbourhood with ("Circle nearby"), not just themselves.
-- `profiles_select_own` stays (a user's own row must always be readable
-- regardless of verification state, e.g. mid-onboarding); this adds the
-- circle-visibility case on top.
--
-- SECURITY DEFINER is required here for a second, subtler reason than the
-- usual self-reference recursion: this check queries `society_memberships`,
-- which has ITS OWN RLS (`memberships_select_own` etc.) restricting a user
-- to their own rows. An inline EXISTS running as the calling role would have
-- that inner query blocked by society_memberships' RLS too — so "is user B
-- verified in a neighbourhood I'm also verified in" would always evaluate
-- false for anyone else's row, even though the check is logically sound.
-- Caught by supabase/tests/profiles_visibility_rls_test.sql (test 4 — the
-- "should be visible" case — failing while the "should NOT be visible"
-- cases passed trivially).
create function public.shares_verified_neighbourhood(p_target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.society_memberships my_membership
    join public.society_memberships their_membership
      on their_membership.neighbourhood_id = my_membership.neighbourhood_id
    where my_membership.user_id = auth.uid()
      and my_membership.verification_status = 'verified'
      and their_membership.user_id = p_target_user_id
      and their_membership.verification_status = 'verified'
  );
$$;

create policy profiles_select_same_neighbourhood on public.profiles
  for select using (public.shares_verified_neighbourhood(id));
