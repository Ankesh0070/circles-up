# Runbook: Suspected RLS Leak

**Phase 100 of implementationplan.md Group K.** For when someone reports (or a monitoring signal suggests) that a user saw data they shouldn't have — another user's private profile field, a different neighbourhood's posts, someone else's DM, etc.

## 1. Triage (first 15 minutes)

1. **Get the specifics from the reporter**: which screen, which data, which two user accounts (the one who saw the leak, and whose data it was). Vague reports ("something felt off") need a concrete repro before anything else is useful.
2. **Identify the table.** Every screen in this app maps to a small, known set of tables (see `README.md`'s per-group sections). Find it fast by grepping the feature folder for `.from('<guess>')`.
3. **Reproduce it directly against the database**, bypassing the app entirely — this isolates "RLS policy problem" from "app-code bug that happens to look like a leak" (e.g., a client-side filter bug showing the right data from the wrong account's fetch). Use the exact pattern this repo's own pgTAP tests use:
   ```sql
   SET LOCAL ROLE authenticated;
   SELECT set_config('request.jwt.claims', json_build_object('sub', '<victim-or-attacker-user-id>', 'role', 'authenticated')::text, true);
   SELECT * FROM <table> WHERE id = '<the row that leaked>';
   ```
   If this returns the row, it's a real RLS gap — proceed to §2. If it returns zero rows, the leak is in application code (a stale cache, a wrong `.eq()` filter, a race condition), not RLS — this runbook doesn't apply; treat it as a normal app bug with elevated priority given the trust impact.

## 2. Contain (once confirmed as a real RLS gap)

1. **Identify the exact policy** on the table (`SELECT polname, qual, with_check FROM pg_policy WHERE polrelid = '<table>'::regclass;`) that's too permissive.
2. **Emergency mitigation, in order of preference:**
   - Best: ship a corrected policy (`DROP POLICY ...; CREATE POLICY ...` in a new migration) — this repo's convention (see any Group C-K migration) is a new timestamped file, never editing an already-applied one.
   - If a fix can't be written and verified safely in the time available: `REVOKE SELECT ON <table> FROM authenticated;` as a temporary hard stop — this breaks the feature entirely (better than continuing to leak) until the real fix ships. Document the revoke in the incident log so it isn't forgotten.
3. **Write a pgTAP regression test proving the leak is closed** — same "prove it both directions" pattern as `rls_isolation_harness_test.sql` (Phase 5) and every group's own `*_rls_test.sql` file: assert the victim's data is invisible to the attacker's impersonated JWT, AND assert legitimate access still works. Add it to `supabase/tests/` so `Phase 94`'s full-sweep pattern would have caught this class of gap in the future (if the sweep's own assertions — RLS enabled, real policies, no unconditional `true` qual — didn't already catch it, that's itself a signal the sweep's exemption list or checks need extending).
4. **Run the full suite** (`pg_prove -h ... supabase/tests/*.sql`) before shipping the fix — a hasty RLS fix is a classic way to introduce a NEW isolation bug while closing the old one.

## 3. Assess blast radius

1. Query how many distinct victim/attacker pairs the gap could have affected: `SELECT count(DISTINCT <owner_column>) FROM <table>;` scoped to whatever window the buggy policy existed for (check the migration's git commit date if unclear).
2. Check `sos_dispatch_log`/`sos_events`/`donations`/`point_events` specifically if any of these were the leaked table — these carry the highest-consequence data classes in this app (safety, money, and the anti-farming ledger respectively) and may independently trigger the legal breach-notification process (see `docs/data-residency-compliance-check.md` §3.4) even for a small blast radius.

## 4. Notify

1. Internal: whoever owns the legal/compliance process from `docs/data-residency-compliance-check.md` — an RLS leak of SPDI (location, biometric-adjacent selfie references, precise address) is exactly the trigger case that document flags needs a real, linked escalation path.
2. External: only after legal has determined whether DPDP Act breach-notification obligations apply — this runbook does not authorize direct user notification on its own.

## 5. Post-incident

1. Add the specific failure pattern (e.g., "a SECURITY DEFINER helper function's inner query itself needs `set search_path`" — a real bug class this repo has hit before, see `pages_and_donations.sql`'s PostgREST search_path note) to this runbook if it's a novel class, so the next responder doesn't re-derive it from scratch.
2. Confirm the new regression test actually landed in the suite Phase 94's sweep runs against — a fix without a permanent test is a fix that can silently regress.
