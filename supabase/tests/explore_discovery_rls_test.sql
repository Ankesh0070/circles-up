-- Group F: RLS + logic test for active_neighbourhood auto-set,
-- circle_connections, mutual_circle, and the two discovery RPCs
-- (including that both correctly exclude blocked users — edgecase.md §9.2).
BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, email, aud, role) VALUES
  (gen_random_uuid(), 'ex-a@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'ex-b@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'ex-c@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'ex-d@x.local', 'authenticated', 'authenticated');

CREATE TEMP TABLE _e_users AS SELECT id, email FROM auth.users WHERE email LIKE 'ex-%@x.local';
GRANT SELECT ON _e_users TO authenticated;

DO $$
DECLARE
  nb_a uuid;
  nb_far uuid := gen_random_uuid();
  user_a uuid;
  user_b uuid;
  user_c uuid;
  user_d uuid;
BEGIN
  SELECT id INTO nb_a FROM public.neighbourhoods WHERE name = 'HSR Layout';
  -- A same-CITY, different-neighbourhood one for the "from your city" tier.
  INSERT INTO public.neighbourhoods (id, name, city, geo_boundary)
    VALUES (nb_far, 'Whitefield (test)', 'Bengaluru', ST_GeogFromText('POLYGON((77.7 12.9,77.8 12.9,77.8 13.0,77.7 13.0,77.7 12.9))'));

  SELECT id INTO user_a FROM _e_users WHERE email = 'ex-a@x.local';
  SELECT id INTO user_b FROM _e_users WHERE email = 'ex-b@x.local';
  SELECT id INTO user_c FROM _e_users WHERE email = 'ex-c@x.local';
  SELECT id INTO user_d FROM _e_users WHERE email = 'ex-d@x.local';

  -- vibes_min_three (Group B) requires >= 3 entries — matters here only for
  -- the constraint, not the test logic (A/C's overlap is still exactly
  -- {Foodie} = 1).
  UPDATE public.profiles SET name = 'A', vibes = ARRAY['Foodie','Gamer','Runner'] WHERE id = user_a;
  UPDATE public.profiles SET name = 'B', vibes = ARRAY['Foodie','Cyclist','Trekker'] WHERE id = user_b;
  UPDATE public.profiles SET name = 'C (far, shares vibes)', vibes = ARRAY['Foodie','Swimmer','Yoga Vibes'] WHERE id = user_c;
  UPDATE public.profiles SET name = 'D (blocked)', vibes = ARRAY['Gamer','Runner','Cyclist'] WHERE id = user_d;

  -- A and B: same neighbourhood, verified. C: different (far) neighbourhood,
  -- same city, shares a vibe with A. D: same neighbourhood as A, but A blocks D.
  INSERT INTO public.society_memberships (user_id, neighbourhood_id, society, flat, lat, lng, verification_status)
    VALUES
      (user_a, nb_a, 'S', 'A1', 12.910, 77.640, 'verified'),
      (user_b, nb_a, 'S', 'B1', 12.911, 77.641, 'verified'),
      (user_c, nb_far, 'S', 'C1', 12.95, 77.75, 'verified'),
      (user_d, nb_a, 'S', 'D1', 12.912, 77.642, 'verified');

  CREATE TEMP TABLE _e_ids AS SELECT nb_a, nb_far, user_a, user_b, user_c, user_d;
END $$;

GRANT SELECT ON _e_ids TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.circle_connections TO authenticated;

-- 1) active_neighbourhood_id auto-set on first verification.
SELECT is(
  (SELECT active_neighbourhood_id FROM public.profiles WHERE id = (SELECT user_a FROM _e_ids)),
  (SELECT nb_a FROM _e_ids),
  'active_neighbourhood_id auto-set to the first verified neighbourhood'
);

RESET ROLE;
INSERT INTO public.dm_blocks (blocker_id, blocked_id) VALUES ((SELECT user_a FROM _e_ids), (SELECT user_d FROM _e_ids));

-- 2) discover_circle_nearby: A sees B (same neighbourhood), does NOT see D (blocked).
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _e_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.discover_circle_nearby((SELECT nb_a FROM _e_ids), 12.910, 77.640)),
  1,
  'discover_circle_nearby returns exactly 1 (B) — D is blocked, self excluded'
);
SELECT is(
  (SELECT name FROM public.discover_circle_nearby((SELECT nb_a FROM _e_ids), 12.910, 77.640) LIMIT 1),
  'B',
  'the one result is B'
);

-- 3) discover_city_wide: A sees C (different neighbourhood, same city, shares "Foodie").
SELECT is(
  (SELECT count(*)::int FROM public.discover_city_wide('Bengaluru', (SELECT nb_a FROM _e_ids))),
  1,
  'discover_city_wide returns exactly 1 (C) — B is same-neighbourhood so excluded from this tier'
);
SELECT is(
  (SELECT shared_vibes_count FROM public.discover_city_wide('Bengaluru', (SELECT nb_a FROM _e_ids)) LIMIT 1),
  1,
  'shared_vibes_count correctly computed as 1 (Foodie overlap)'
);

-- 3b) get_public_profile (Phase 60): A viewing B (same neighbourhood) sees
-- tower/flat; A viewing D (blocked) sees nothing at all.
SELECT is(
  (SELECT flat FROM public.get_public_profile((SELECT user_b FROM _e_ids))),
  'B1',
  'get_public_profile reveals flat for a same-neighbourhood profile'
);
SELECT is(
  (SELECT count(*)::int FROM public.get_public_profile((SELECT user_d FROM _e_ids))),
  0,
  'get_public_profile returns nothing for a blocked user (Phase 62 enforcement)'
);

-- 4) circle_connections: A can add B (same neighbourhood) AND C (different
-- neighbourhood, same city — the "From your city" tier) — Phase 60 testing
-- found the original same-neighbourhood-only constraint silently broke
-- "Add to Circle" for the entire city-wide tier; fixed to just require C
-- be a real verified user, matching what both discovery RPCs already
-- independently enforce.
INSERT INTO public.circle_connections (user_id, connected_user_id) VALUES ((SELECT user_a FROM _e_ids), (SELECT user_b FROM _e_ids));
INSERT INTO public.circle_connections (user_id, connected_user_id) VALUES ((SELECT user_a FROM _e_ids), (SELECT user_c FROM _e_ids));
SELECT is((SELECT count(*)::int FROM public.circle_connections WHERE user_id = (SELECT user_a FROM _e_ids)), 2, 'A added both B (same neighbourhood) and C (from-your-city tier) to their circle');

DO $$
DECLARE
  raised boolean := false;
BEGIN
  BEGIN
    -- D IS blocked by A — that must still be rejected regardless of D
    -- being otherwise verified and same-neighbourhood.
    INSERT INTO public.circle_connections (user_id, connected_user_id)
      VALUES ((SELECT user_a FROM _e_ids), (SELECT user_d FROM _e_ids));
  EXCEPTION WHEN OTHERS THEN
    raised := true;
  END;
  CREATE TEMP TABLE _e_reject_result AS SELECT raised;
END $$;
SELECT ok((SELECT raised FROM _e_reject_result), 'A cannot add D (blocked) to their circle even though D is otherwise verified and same-neighbourhood');

-- 5) mutual_circle: B also adds... someone A has, to create a mutual.
-- A→B already exists. Now B adds nobody new; instead test via a fresh pair:
-- A and B BOTH connect to a shared third party — but our only same-neighbourhood
-- peers here are A/B/D (D blocked). Use D minus the block for this check by
-- reasoning at the SQL level directly (mutual_circle doesn't care about blocks).
RESET ROLE;
-- D also has B in their circle — the overlap with A's circle (which has B,
-- from step 4) is what mutual_circle should find.
INSERT INTO public.circle_connections (user_id, connected_user_id) VALUES ((SELECT user_d FROM _e_ids), (SELECT user_b FROM _e_ids));

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_d::text FROM _e_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.mutual_circle((SELECT user_a FROM _e_ids))),
  1,
  'mutual_circle(A) from D''s perspective finds B (both D and A have B in their circle)'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
