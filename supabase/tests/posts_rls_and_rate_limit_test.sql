-- Group C: RLS isolation for posts/reactions/comments (same pattern as
-- Group B/earlier Group C tests) plus the Phase 32 alert rate-limit trigger.
BEGIN;
SELECT plan(7);

INSERT INTO auth.users (id, email, aud, role) VALUES
  (gen_random_uuid(), 'test-a@postsrls.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'test-b@postsrls.local', 'authenticated', 'authenticated');

CREATE TEMP TABLE _p_users AS
  SELECT id, email FROM auth.users WHERE email IN ('test-a@postsrls.local', 'test-b@postsrls.local');
GRANT SELECT ON _p_users TO authenticated;

DO $$
DECLARE
  nb_a uuid;
  nb_b uuid := gen_random_uuid();
  user_a uuid;
  user_b uuid;
BEGIN
  SELECT id INTO nb_a FROM public.neighbourhoods WHERE name = 'HSR Layout';
  INSERT INTO public.neighbourhoods (id, name, city, geo_boundary)
    VALUES (nb_b, 'Indiranagar (test)', 'Bengaluru', ST_GeogFromText('POLYGON((77.6 12.9,77.7 12.9,77.7 13.0,77.6 13.0,77.6 12.9))'));

  SELECT id INTO user_a FROM _p_users WHERE email = 'test-a@postsrls.local';
  SELECT id INTO user_b FROM _p_users WHERE email = 'test-b@postsrls.local';

  INSERT INTO public.society_memberships (user_id, neighbourhood_id, society, flat, lat, lng, verification_status)
    VALUES
      (user_a, nb_a, 'S', 'A1', 12.91, 77.64, 'verified'),
      (user_b, nb_b, 'S', 'B1', 12.95, 77.65, 'verified');

  CREATE TEMP TABLE _p_nbs AS SELECT nb_a, nb_b;
END $$;

GRANT SELECT ON _p_nbs TO authenticated;
GRANT SELECT, INSERT ON public.posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reactions TO authenticated;
GRANT SELECT, INSERT ON public.comments TO authenticated;

-- User A (verified in nb_a) posts in nb_a.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id::text FROM _p_users WHERE email = 'test-a@postsrls.local'), 'role', 'authenticated')::text, true);

DO $$
DECLARE post_id uuid;
BEGIN
  INSERT INTO public.posts (author_id, neighbourhood_id, category, caption)
    VALUES ((SELECT id FROM _p_users WHERE email = 'test-a@postsrls.local'), (SELECT nb_a FROM _p_nbs), 'general', 'Hello neighbourhood A')
    RETURNING id INTO post_id;
  CREATE TEMP TABLE _p_post AS SELECT post_id AS id;
END $$;

-- 1) User A can see their own post.
SELECT is((SELECT count(*)::int FROM public.posts WHERE id = (SELECT id FROM _p_post)), 1, 'user A sees their own post');

-- 2) User A can react to their own (visible) post.
INSERT INTO public.reactions (post_id, user_id, type) VALUES ((SELECT id FROM _p_post), (SELECT id FROM _p_users WHERE email = 'test-a@postsrls.local'), 'like');
SELECT is((SELECT count(*)::int FROM public.reactions WHERE post_id = (SELECT id FROM _p_post)), 1, 'user A can react to a post they can see');

-- 3) User A can comment on their own (visible) post.
INSERT INTO public.comments (post_id, author_id, text) VALUES ((SELECT id FROM _p_post), (SELECT id FROM _p_users WHERE email = 'test-a@postsrls.local'), 'nice');
SELECT is((SELECT count(*)::int FROM public.comments WHERE post_id = (SELECT id FROM _p_post)), 1, 'user A can comment on a post they can see');

-- 4) User B (different neighbourhood) cannot see A's post at all.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id::text FROM _p_users WHERE email = 'test-b@postsrls.local'), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.posts WHERE id = (SELECT id FROM _p_post)), 0, 'user B (different neighbourhood) cannot see user A''s post');

-- 5) ...and therefore cannot see its reactions or comments either, even
--    though those rows technically exist.
SELECT is((SELECT count(*)::int FROM public.reactions WHERE post_id = (SELECT id FROM _p_post)), 0, 'user B cannot see reactions on a post they cannot view');
SELECT is((SELECT count(*)::int FROM public.comments WHERE post_id = (SELECT id FROM _p_post)), 0, 'user B cannot see comments on a post they cannot view');

RESET ROLE;

-- 6) Alert rate limit: 3 alert posts succeed, the 4th in the same 24h raises.
DO $$
DECLARE
  v_nb uuid;
  v_user uuid;
  raised boolean := false;
BEGIN
  SELECT nb_a INTO v_nb FROM _p_nbs;
  SELECT id INTO v_user FROM _p_users WHERE email = 'test-a@postsrls.local';
  INSERT INTO public.posts (author_id, neighbourhood_id, category, caption) VALUES (v_user, v_nb, 'alert', 'Alert 1');
  INSERT INTO public.posts (author_id, neighbourhood_id, category, caption) VALUES (v_user, v_nb, 'alert', 'Alert 2');
  INSERT INTO public.posts (author_id, neighbourhood_id, category, caption) VALUES (v_user, v_nb, 'alert', 'Alert 3');
  BEGIN
    INSERT INTO public.posts (author_id, neighbourhood_id, category, caption) VALUES (v_user, v_nb, 'alert', 'Alert 4 — should be rejected');
  EXCEPTION WHEN OTHERS THEN
    raised := true;
  END;
  CREATE TEMP TABLE _p_rate_limit_result AS SELECT raised;
END $$;

SELECT ok((SELECT raised FROM _p_rate_limit_result), 'the 4th alert post within 24h raises (rate limit enforced)');

SELECT * FROM finish();
ROLLBACK;
