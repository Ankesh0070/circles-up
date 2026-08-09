-- Phase 94 (implementationplan.md Group K, edgecase.md §11.1 — final
-- closure): "every table re-run through the Group A test harness, not just
-- incrementally". `rls_isolation_harness_test.sql` (Phase 5) proves the
-- *pattern* on a disposable schema; this file is the actual sweep — it
-- queries the REAL app schema's system catalogs directly, so it keeps
-- checking every table automatically as future groups add more, rather
-- than needing a new hand-written assertion per table forever.
--
-- Three intentional exemptions exist, each because it's the SAFEST
-- possible state, not an oversight — documented below so this sweep never
-- has to be "temporarily" loosened to pass:
--   - bazaar_prohibited_keywords: RLS disabled, but has ZERO grants to
--     anon/authenticated (only postgres/service_role) — the permission
--     check happens before RLS is even consulted, so this is unreachable
--     from any client request regardless of RLS state.
--   - post_embeddings / comment_embeddings: RLS enabled with ZERO
--     policies, granted only to service_role (Group G, genie_embeddings
--     migration) — service_role bypasses RLS entirely, and zero policies
--     for authenticated is the most restrictive state PostgREST could see.
--   - neighbourhoods: the one legitimately public-read table (Group B) —
--     "which neighbourhoods exist" isn't sensitive, and Address screen
--     needs to list them before a user has any membership row to scope by.
BEGIN;
SELECT plan(6);

CREATE TEMP TABLE _sweep_rls_exempt (table_name text);
INSERT INTO _sweep_rls_exempt VALUES ('bazaar_prohibited_keywords');

CREATE TEMP TABLE _sweep_policy_exempt (table_name text);
INSERT INTO _sweep_policy_exempt VALUES ('post_embeddings'), ('comment_embeddings');

CREATE TEMP TABLE _sweep_public_select_exempt (table_name text);
INSERT INTO _sweep_public_select_exempt VALUES ('neighbourhoods');

-- 1) Every real table has RLS enabled, except the documented exemption list.
SELECT ok(
  (SELECT array_agg(c.relname ORDER BY c.relname)
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r'
     AND NOT c.relrowsecurity
     AND c.relname NOT IN (SELECT table_name FROM _sweep_rls_exempt)
  ) IS NULL,
  'every table has RLS enabled, except the documented no-grant exemption'
);

-- 2) Every RLS-enabled table has at least one policy, except the documented
--    service-role-only exemption list.
SELECT ok(
  (SELECT array_agg(c.relname ORDER BY c.relname)
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
     AND c.relname NOT IN (SELECT table_name FROM _sweep_policy_exempt)
     AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
  ) IS NULL,
  'every RLS-enabled table has at least one policy, except the documented service-role-only exemption'
);

-- 3) No SELECT/UPDATE/DELETE/ALL policy unconditionally exposes every row,
--    except the documented public-reference-data exemption.
SELECT ok(
  (SELECT array_agg(tablename || '.' || policyname ORDER BY tablename)
   FROM pg_policies
   WHERE schemaname = 'public' AND cmd IN ('SELECT', 'UPDATE', 'DELETE', 'ALL') AND qual = 'true'
     AND tablename NOT IN (SELECT table_name FROM _sweep_public_select_exempt)
  ) IS NULL,
  'no policy unconditionally exposes rows, except the documented public-read exemption'
);

-- 4) Every INSERT/ALL policy has a real, non-trivial WITH CHECK clause —
--    an INSERT policy with no WITH CHECK (or an unconditionally true one)
--    would let any authenticated client insert rows as anyone, into
--    anyone's neighbourhood/page/event.
SELECT ok(
  (SELECT array_agg(tablename || '.' || policyname ORDER BY tablename)
   FROM pg_policies
   WHERE schemaname = 'public' AND cmd IN ('INSERT', 'ALL') AND (with_check IS NULL OR with_check = 'true')
  ) IS NULL,
  'every INSERT/ALL policy has a real WITH CHECK clause, not null or unconditionally true'
);

-- 5) anon has zero table grants anywhere — this app has no unauthenticated
--    data surface; every screen requires a session before touching a table.
SELECT is(
  (SELECT count(*)::int FROM information_schema.role_table_grants WHERE grantee = 'anon' AND table_schema = 'public'),
  0,
  'the anon role has zero table grants across the whole schema'
);

-- 6) `authenticated` never receives DELETE on append-only audit-trail/ledger
--    tables — edgecase.md §3.9/§3.13 (SOS dispatch log) and §10.1 (points
--    ledger) both depend on these being un-editable by the client whose
--    activity they're recording, not just RLS-scoped to their own rows.
SELECT ok(
  (SELECT array_agg(table_name ORDER BY table_name)
   FROM information_schema.role_table_grants
   WHERE grantee = 'authenticated' AND table_schema = 'public' AND privilege_type = 'DELETE'
     AND table_name IN ('sos_dispatch_log', 'sos_events', 'point_events', 'ad_events', 'genie_query_log')
  ) IS NULL,
  'authenticated cannot DELETE from audit-trail/ledger tables'
);

SELECT * FROM finish();
ROLLBACK;
