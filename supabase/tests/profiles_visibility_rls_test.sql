-- Group C: RLS test for profiles_select_same_neighbourhood (added to fix a
-- real bug found wiring Phase 24 — see the migration's comment). Confirms:
-- verified members of the same neighbourhood can see each other's profile;
-- an unverified user cannot see anyone else's; a verified member of a
-- DIFFERENT neighbourhood cannot see either.
BEGIN;
SELECT plan(4);

INSERT INTO auth.users (id, email, aud, role) VALUES
  (gen_random_uuid(), 'test-a@profvis.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'test-b@profvis.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'test-c@profvis.local', 'authenticated', 'authenticated');

CREATE TEMP TABLE _pv_users AS
  SELECT id, email FROM auth.users WHERE email IN ('test-a@profvis.local', 'test-b@profvis.local', 'test-c@profvis.local');
GRANT SELECT ON _pv_users TO authenticated;

DO $$
DECLARE
  nb_a uuid;
  nb_b uuid := gen_random_uuid();
  user_a uuid;
  user_b uuid;
  user_c uuid;
BEGIN
  SELECT id INTO nb_a FROM public.neighbourhoods WHERE name = 'HSR Layout';
  INSERT INTO public.neighbourhoods (id, name, city, geo_boundary)
    VALUES (nb_b, 'Koramangala (test)', 'Bengaluru', ST_GeogFromText('POLYGON((77.6 12.9,77.7 12.9,77.7 13.0,77.6 13.0,77.6 12.9))'));

  SELECT id INTO user_a FROM _pv_users WHERE email = 'test-a@profvis.local';
  SELECT id INTO user_b FROM _pv_users WHERE email = 'test-b@profvis.local';
  SELECT id INTO user_c FROM _pv_users WHERE email = 'test-c@profvis.local';

  -- A and B verified in the SAME neighbourhood; C verified in a DIFFERENT one.
  INSERT INTO public.society_memberships (user_id, neighbourhood_id, society, flat, lat, lng, verification_status)
    VALUES
      (user_a, nb_a, 'Brigade Meadows', 'A-1', 12.91, 77.64, 'verified'),
      (user_b, nb_a, 'Brigade Meadows', 'A-2', 12.91, 77.64, 'pending'),
      (user_c, nb_b, 'Some Society', 'B-1', 12.95, 77.65, 'verified');

  UPDATE public.profiles SET name = 'User A' WHERE id = user_a;
  UPDATE public.profiles SET name = 'User B' WHERE id = user_b;
  UPDATE public.profiles SET name = 'User C' WHERE id = user_c;
END $$;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.neighbourhoods TO authenticated;

-- 1) User A (verified) can see User B's profile (same neighbourhood), even
--    though B isn't verified themselves — visibility only requires the
--    VIEWER to be verified, not the viewed party.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id::text FROM _pv_users WHERE email = 'test-a@profvis.local'), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE id = (SELECT id FROM _pv_users WHERE email = 'test-b@profvis.local')),
  0,
  'user A cannot see user B''s profile since B is only pending, not verified, in the shared neighbourhood'
);

-- 2) User A can always see their own profile regardless.
SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE id = (SELECT id FROM _pv_users WHERE email = 'test-a@profvis.local')),
  1,
  'user A can see their own profile'
);

-- 3) User C (verified, but in a DIFFERENT neighbourhood) cannot see A's profile.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id::text FROM _pv_users WHERE email = 'test-c@profvis.local'), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE id = (SELECT id FROM _pv_users WHERE email = 'test-a@profvis.local')),
  0,
  'user C (different neighbourhood) cannot see user A''s profile'
);

-- 4) Sanity: once B is ALSO verified in the shared neighbourhood, A can see them.
RESET ROLE;
UPDATE public.society_memberships SET verification_status = 'verified'
  WHERE user_id = (SELECT id FROM _pv_users WHERE email = 'test-b@profvis.local');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id::text FROM _pv_users WHERE email = 'test-a@profvis.local'), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE id = (SELECT id FROM _pv_users WHERE email = 'test-b@profvis.local')),
  1,
  'once B is also verified in the shared neighbourhood, A can see B''s profile'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
