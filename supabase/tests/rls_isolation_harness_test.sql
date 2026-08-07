-- Phase 5 (implementationplan.md Group A): RLS automated test harness.
--
-- This proves the *pattern* every future table's RLS policy must be tested
-- against — "two fake neighbourhoods, assert cross-tenant read fails" — using
-- a throwaway schema built and torn down entirely inside this transaction, so
-- it never touches the real app schema. When Group B/C/etc. add real tables
-- (users, society_memberships, posts, ...) copy this pattern: create two fake
-- neighbourhoods + two fake members, impersonate each via
-- `set local request.jwt.claims`, and assert cross-tenant reads return zero
-- rows.
--
-- Run with: npx supabase test db
BEGIN;
SELECT plan(6);

-- ---------------------------------------------------------------------------
-- Throwaway demo schema, shaped like the real posts/society_memberships
-- tables from architecture.md §5, scoped to this transaction only.
-- ---------------------------------------------------------------------------
CREATE TABLE _harness_neighbourhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

CREATE TABLE _harness_memberships (
  user_id uuid NOT NULL,
  neighbourhood_id uuid NOT NULL REFERENCES _harness_neighbourhoods(id)
);

CREATE TABLE _harness_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  neighbourhood_id uuid NOT NULL REFERENCES _harness_neighbourhoods(id),
  content text NOT NULL
);

ALTER TABLE _harness_posts ENABLE ROW LEVEL SECURITY;

-- The policy under test: a user may only read posts in a neighbourhood they
-- are a verified member of. This is the exact shape every real per-tenant
-- table's SELECT policy should take.
CREATE POLICY harness_posts_same_neighbourhood ON _harness_posts
  FOR SELECT
  USING (
    neighbourhood_id IN (
      SELECT neighbourhood_id FROM _harness_memberships
      WHERE user_id = auth.uid()
    )
  );

-- RLS filters *rows*, it does not substitute for table-level GRANTs — a role
-- with no GRANT on a table sees zero rows regardless of policy. Every real
-- migration needs both; this harness intentionally exercises that so the
-- pattern doesn't get missed later. `anon`/`authenticated` are Supabase's
-- standard PostgREST-facing roles.
GRANT SELECT ON _harness_neighbourhoods TO authenticated;
GRANT SELECT ON _harness_memberships TO authenticated;
GRANT SELECT ON _harness_posts TO authenticated;

-- ---------------------------------------------------------------------------
-- Fixture data: two neighbourhoods, two users, one post each.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  nb_a uuid := gen_random_uuid();
  nb_b uuid := gen_random_uuid();
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
BEGIN
  INSERT INTO _harness_neighbourhoods (id, name) VALUES (nb_a, 'HSR Layout'), (nb_b, 'Koramangala');
  INSERT INTO _harness_memberships (user_id, neighbourhood_id) VALUES (user_a, nb_a), (user_b, nb_b);
  INSERT INTO _harness_posts (neighbourhood_id, content)
    VALUES (nb_a, 'Post in Neighbourhood A'), (nb_b, 'Post in Neighbourhood B');

  -- Stash the generated ids in a temp table so later statements (outside
  -- this DO block, but still inside the outer transaction) can reference them.
  CREATE TEMP TABLE _harness_ids AS
    SELECT nb_a AS neighbourhood_a, nb_b AS neighbourhood_b, user_a, user_b;
END $$;

-- The DO block runs as the current (postgres) role, so the temp table it
-- creates isn't readable once we switch to `authenticated` below — grant
-- explicitly rather than relying on default privileges.
GRANT SELECT ON _harness_ids TO authenticated;

-- ---------------------------------------------------------------------------
-- Assertions
-- ---------------------------------------------------------------------------

-- 1) service_role (used by trusted backend services) bypasses RLS entirely —
--    sanity check that the policy isn't accidentally blocking privileged access.
SET LOCAL ROLE postgres;
SELECT is(
  (SELECT count(*)::int FROM _harness_posts),
  2,
  'service/postgres role sees both posts (RLS does not block privileged roles)'
);

-- 2) Impersonate user A: should see exactly 1 post (their own neighbourhood).
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _harness_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM _harness_posts),
  1,
  'user A sees exactly 1 post'
);
SELECT is(
  (SELECT content FROM _harness_posts LIMIT 1),
  'Post in Neighbourhood A',
  'user A''s visible post is their own neighbourhood''s post'
);

-- 3) Cross-tenant read attempt: user A directly requesting neighbourhood B's
--    post by id must return zero rows, not an error and not the row.
SELECT is(
  (SELECT count(*)::int FROM _harness_posts WHERE neighbourhood_id = (SELECT neighbourhood_b FROM _harness_ids)),
  0,
  'user A cannot read neighbourhood B''s post by id (cross-tenant isolation holds)'
);

-- 4) Impersonate user B: should see exactly 1 post (their own neighbourhood).
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _harness_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM _harness_posts),
  1,
  'user B sees exactly 1 post'
);
SELECT is(
  (SELECT content FROM _harness_posts LIMIT 1),
  'Post in Neighbourhood B',
  'user B''s visible post is their own neighbourhood''s post'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
