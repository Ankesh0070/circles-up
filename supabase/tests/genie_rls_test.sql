-- Group G: RLS + logic test for Genie's embedding tables — no client
-- access at all, FK-based delete-cascade (edgecase.md §2.5), neighbourhood-
-- scoped similarity search, and genie_query_log's own-rows-only policy.
BEGIN;
SELECT plan(6);

INSERT INTO auth.users (id, email, aud, role) VALUES
  (gen_random_uuid(), 'genie-a@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'genie-b@x.local', 'authenticated', 'authenticated');

CREATE TEMP TABLE _g_users AS SELECT id, email FROM auth.users WHERE email LIKE 'genie-%@x.local';
GRANT SELECT ON _g_users TO authenticated;

DO $$
DECLARE
  nb uuid;
  user_a uuid;
  user_b uuid;
  post_id uuid;
BEGIN
  SELECT id INTO nb FROM public.neighbourhoods WHERE name = 'HSR Layout';
  SELECT id INTO user_a FROM _g_users WHERE email = 'genie-a@x.local';
  SELECT id INTO user_b FROM _g_users WHERE email = 'genie-b@x.local';

  INSERT INTO public.society_memberships (user_id, neighbourhood_id, society, flat, lat, lng, verification_status)
    VALUES (user_a, nb, 'S', 'A1', 12.91, 77.64, 'verified');

  INSERT INTO public.posts (author_id, neighbourhood_id, category, caption)
    VALUES (user_a, nb, 'recommend', 'Best chai stall near Gate 2')
    RETURNING id INTO post_id;

  -- Simulate what the Genie service would write after embedding this post
  -- (a fixed, deterministic mock vector for test purposes).
  INSERT INTO public.post_embeddings (post_id, neighbourhood_id, embedding, content_snippet)
    VALUES (post_id, nb, array_fill(0.1, ARRAY[128])::vector, 'Best chai stall near Gate 2');

  INSERT INTO public.genie_query_log (user_id, neighbourhood_id, query, normalized_query, answer, source_post_ids)
    VALUES (user_a, nb, 'best chai?', 'best chai', 'Try the stall near Gate 2.', ARRAY[post_id]);

  CREATE TEMP TABLE _g_ids AS SELECT nb, user_a, user_b, post_id;
END $$;

GRANT SELECT ON _g_ids TO authenticated;

-- 1) A verified authenticated user CANNOT read post_embeddings directly —
-- there's no GRANT for `authenticated` at all (embeddings are an internal
-- implementation detail of the backend service, not client-facing data),
-- so Postgres raises permission-denied before RLS is even evaluated —
-- stronger than a policy silently returning zero rows.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _g_ids), 'role', 'authenticated')::text, true);
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM count(*) FROM public.post_embeddings;
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  CREATE TEMP TABLE _g_denied_result AS SELECT denied;
END $$;
SELECT ok((SELECT denied FROM _g_denied_result), 'authenticated client gets permission-denied reading post_embeddings, not just an empty result');

-- 2) genie_query_log: A sees their own query log entry.
SELECT is((SELECT count(*)::int FROM public.genie_query_log WHERE user_id = (SELECT user_a FROM _g_ids)), 1, 'A sees their own genie_query_log row');

-- 3) B (different user, never queried) sees nothing in the log.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _g_ids), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.genie_query_log), 0, 'B sees no genie_query_log rows (not their own)');

RESET ROLE;

-- 4) search_post_embeddings finds the seeded post when searching the same
-- neighbourhood with an identical (therefore maximally similar) vector.
SELECT is(
  (SELECT post_id FROM public.search_post_embeddings((SELECT nb FROM _g_ids), array_fill(0.1, ARRAY[128])::vector, 5) LIMIT 1),
  (SELECT post_id FROM _g_ids),
  'search_post_embeddings finds the seeded post via cosine similarity'
);

-- 5) search_post_embeddings scoped to a DIFFERENT neighbourhood finds nothing.
DO $$
DECLARE other_nb uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.neighbourhoods (id, name, city, geo_boundary)
    VALUES (other_nb, 'Elsewhere (test)', 'Bengaluru', ST_GeogFromText('POLYGON((77.7 12.9,77.8 12.9,77.8 13.0,77.7 13.0,77.7 12.9))'));
  CREATE TEMP TABLE _g_other_nb AS SELECT other_nb;
END $$;
SELECT is(
  (SELECT count(*)::int FROM public.search_post_embeddings((SELECT other_nb FROM _g_other_nb), array_fill(0.1, ARRAY[128])::vector, 5)),
  0,
  'search_post_embeddings scoped to a different neighbourhood finds nothing, even with an identical vector'
);

-- 6) Delete-cascade (edgecase.md §2.5): deleting the post removes its
-- embedding automatically, no separate cleanup code required.
DELETE FROM public.posts WHERE id = (SELECT post_id FROM _g_ids);
SELECT is((SELECT count(*)::int FROM public.post_embeddings WHERE post_id = (SELECT post_id FROM _g_ids)), 0, 'deleting the post cascades to delete its embedding');

SELECT * FROM finish();
ROLLBACK;
