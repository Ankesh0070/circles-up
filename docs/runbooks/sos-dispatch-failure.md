# Runbook: SOS Dispatch Failure

**Phase 100 of implementationplan.md Group K.** The highest-consequence failure mode in this app — someone triggered SOS and some or all of the dispatch channels didn't go through. `docs/game-day-drill-log.md` records a real, executed drill against this exact scenario; this runbook is the general procedure it was built from.

## 1. What "failure" actually looks like in this system (read this before assuming the worst)

edgecase.md §3.1 and this app's own architecture treat SOS as **multiple independent channels**, not one atomic action — a "failure" in one channel is expected to be survivable, not a total-loss event:

| Channel | Depends on | Failure mode | Where to check |
|---|---|---|---|
| Native `tel:` dial (police/112/women's helpline) | Nothing but the OS phone dialer — no network required | `Linking.canOpenURL` returns false (rare — no dialer capability, e.g. a tablet/web build) | `sos_dispatch_log.delivery_status = 'failed'`, `channel` in `('police','emergency112','women_helpline')` |
| Backend fan-out: trusted contacts (SMS) + nearby verified neighbours | `services/sos` reachable + SMS gateway vendor (mocked in this build — see Phase 6) | Service down, SMS vendor error, or (mock-specific) the deliberate test failure path | `dispatchToBackend`'s thrown error surfaces via `SosFlow`'s `setError`; check `services/sos` logs and `sos_dispatch_log` rows for `channel = 'trusted_contact'/'nearby_neighbour'` |
| Durable event record (`sos_events` row) | Postgres/PostgREST reachable | Network down at the moment of trigger | As of Phase 97's fix, this NO LONGER blocks the `tel:` dial — see below |

**Critical context from Phase 97 (network-degradation testing, this same group):** two real bugs were found and fixed in this exact flow — the `tel:` dial used to be blocked behind a successful network round-trip (backwards from the design intent), and Circle Guard's SOS button could become entirely unpressable if the network was down when the screen opened. Both are fixed and covered by `docs/network-degradation-test-results.md`'s live re-verification. **If a fresh incident looks like either of those symptoms again, it's a regression, not a new bug class** — check `git log` on `mobile/src/shared/api/sos.ts` and `mobile/src/features/guard/GuardScreen.tsx` first.

## 2. Triage

1. Get the `sos_event_id` (from the reporter, or `SELECT id FROM sos_events WHERE user_id = '<reporter>' ORDER BY started_at DESC LIMIT 1;`).
2. Pull the full dispatch picture in one query:
   ```sql
   SELECT channel, recipient_name, delivery_status, delivery_detail, sent_at
   FROM sos_dispatch_log WHERE sos_event_id = '<id>' ORDER BY sent_at;
   ```
3. Compare against what SHOULD exist: 3 `tel:` rows (police/112/helpline) + up to 5 trusted-contact rows (Phase 50's per-user cap) + however many nearby verified neighbours `nearby_verified_neighbours()` returned. **Missing rows entirely** (not `delivery_status = 'failed'` rows) point at the backend fan-out never running at all — check `services/sos` process health first.

## 3. Immediate response (while investigating)

1. If the affected user is still in an active emergency and reachable: this is a "call them" situation, not a "wait for the postmortem" situation — this runbook does not replace direct human judgment in an ongoing emergency.
2. If `services/sos` itself is down: restart it and re-check whether the specific failed event's channels can be manually re-triggered (there is currently no built-in re-dispatch endpoint — a real production system would want one; flag as a fast-follow if this incident is the first time it's been needed).

## 4. Root-cause categories to check, in likely-frequency order

1. **`services/sos` down or erroring** — check process health/logs first, cheapest to rule in/out.
2. **SMS gateway vendor failure** — this build's `MockSmsGateway`/equivalent (Phase 6's dummy-provider pattern) has an intentionally exercisable failure path for exactly this testing purpose; a real vendor failure in production would look identical from `sos_dispatch_log`'s perspective (a `'failed'` row with `delivery_detail` carrying the vendor's error).
3. **`nearby_verified_neighbours()` returning zero rows unexpectedly** — check the triggering user's `active_neighbourhood_id` and whether enough OTHER verified members exist nearby; a sparse neighbourhood is a real, non-bug reason for a short/empty neighbour-alert list, not necessarily a failure.
4. **Client-side**: confirm via the user's own device logs/Sentry (this build wires `@sentry/react-native`, see `app.json`) whether the client ever actually called `dispatchToBackend` at all — a client-side crash before that call would look like a silent no-op from the server's perspective.

## 5. Post-incident

1. If root cause was a code bug (not a vendor outage), write the regression test/fix the same way Phase 97's two bugs were: reproduce with the backend/network in the failure state, fix, re-verify live, document in this repo the same way `docs/network-degradation-test-results.md` does.
2. If root cause was a vendor outage: this is exactly why Phase 6's dummy-provider architecture exists — confirm the interface boundary (`services/sos`'s SMS gateway abstraction) made the vendor swap-out/retry logic possible without touching call sites, and consider whether a fallback vendor is worth contracting.
