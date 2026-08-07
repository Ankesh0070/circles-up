-- Group B: RLS isolation test for the real `society_memberships` table,
-- following the pattern established by rls_isolation_harness_test.sql
-- (Phase 5) — own-row access plus the Phase 17 household-model exception
-- (a verified member of a flat can see other pending/verified claims on
-- that same flat), and confirms a member of a *different* flat sees neither.
BEGIN;
SELECT plan(5);

-- Minimal fake auth.users rows — enough to satisfy society_memberships' FK
-- and pass through the handle_new_user trigger (harmlessly creates extra
-- profiles rows, cleaned up by this transaction's ROLLBACK).
INSERT INTO auth.users (id, email, aud, role) VALUES
  (gen_random_uuid(), 'test-a@rls.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'test-b@rls.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'test-c@rls.local', 'authenticated', 'authenticated');

CREATE TEMP TABLE _test_users AS
  SELECT id, email FROM auth.users WHERE email IN ('test-a@rls.local', 'test-b@rls.local', 'test-c@rls.local');
GRANT SELECT ON _test_users TO authenticated;

DO $$
DECLARE
  nb_id uuid;
  user_a uuid;
  user_b uuid;
BEGIN
  SELECT id INTO nb_id FROM public.neighbourhoods WHERE name = 'HSR Layout';
  SELECT id INTO user_a FROM _test_users WHERE email = 'test-a@rls.local';
  SELECT id INTO user_b FROM _test_users WHERE email = 'test-b@rls.local';

  INSERT INTO public.society_memberships (user_id, neighbourhood_id, society, flat, lat, lng, verification_status)
    VALUES (user_a, nb_id, 'Brigade Meadows', 'A-101', 12.91, 77.64, 'pending');
  INSERT INTO public.society_memberships (user_id, neighbourhood_id, society, flat, lat, lng, verification_status)
    VALUES (user_b, nb_id, 'Brigade Meadows', 'B-202', 12.91, 77.64, 'pending');
END $$;

GRANT SELECT ON public.society_memberships TO authenticated;
GRANT SELECT ON public.neighbourhoods TO authenticated;

-- 1) User A sees exactly their own row, not user B's (different flat).
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id::text FROM _test_users WHERE email = 'test-a@rls.local'), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.society_memberships), 1, 'user A sees exactly 1 membership (their own)');

-- 2) User B likewise sees only their own.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id::text FROM _test_users WHERE email = 'test-b@rls.local'), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.society_memberships), 1, 'user B sees exactly 1 membership (their own)');

-- 3) Mark A verified (as the backend service would after a passed check),
-- then user C claims A's same flat — household model should now let A see
-- both rows.
RESET ROLE;
UPDATE public.society_memberships SET verification_status = 'verified', verified_at = now()
  WHERE user_id = (SELECT id FROM _test_users WHERE email = 'test-a@rls.local');

DO $$
DECLARE
  nb_id uuid;
  user_c uuid;
BEGIN
  SELECT id INTO nb_id FROM public.neighbourhoods WHERE name = 'HSR Layout';
  SELECT id INTO user_c FROM _test_users WHERE email = 'test-c@rls.local';
  INSERT INTO public.society_memberships (user_id, neighbourhood_id, society, flat, lat, lng, verification_status)
    VALUES (user_c, nb_id, 'Brigade Meadows', 'A-101', 12.91, 77.64, 'pending');
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id::text FROM _test_users WHERE email = 'test-a@rls.local'), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.society_memberships), 2, 'verified user A now sees both A-101 claims (household model)');

-- 4) User C (not yet verified) still sees only their own row.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id::text FROM _test_users WHERE email = 'test-c@rls.local'), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.society_memberships), 1, 'unverified user C sees only their own membership');

-- 5) User B (different flat entirely) still sees only their own — the
-- household-model exception must not leak across flats.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id::text FROM _test_users WHERE email = 'test-b@rls.local'), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.society_memberships), 1, 'user B (different flat) still sees only their own — no cross-flat leak');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
