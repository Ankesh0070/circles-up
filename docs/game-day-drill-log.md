# Game Day Drill Log

**Phase 100 of implementationplan.md Group K.** One live drill, executed against the real running local stack (not a tabletop exercise) — the plan's Definition of Done requires "at least one full incident-response game day completed," and this is that record.

## Drill: SOS dispatch failure (backend fan-out service down)

**Scenario chosen and why:** of the three runbooks (`docs/runbooks/`), this one was the most valuable to actually execute rather than only write, for two reasons — it's the highest-consequence failure mode in the app, and it directly builds on Phase 97's network-degradation fixes earlier in this same group, so a live drill doubles as a second, independent confirmation that those fixes hold under a slightly different failure shape (a specific backend service being unreachable, vs. the entire network being down).

**Setup:** Postgres, PostgREST, and the local auth/REST gateway were all running normally. `services/sos` (the SOS backend fan-out service — trusted-contact SMS + nearby-neighbour alerts) was **not started**, simulating that specific service being down while everything else is healthy — a more realistic partial-outage shape than Phase 97's "kill everything" test.

**Timeline (real, from this session):**

| Time (UTC) | Action | Observed |
|---|---|---|
| 15:32:47 | Drill start; confirmed `services/sos` not running, everything else healthy | — |
| ~15:33:00 | Logged-in test user opened Circle Guard → SOS → confirmed countdown | Countdown UI shown, matching normal behaviour |
| 15:33:05 | Countdown completed, `fire()` executed | `sos_events` row created (`id = bfef8c1c-cb3a-4fe3-b6d3-89f002084234`, `status = 'active'`) |
| 15:33:05 | UI transitioned to "SOS Active" | "EMERGENCY SERVICES (DIALED)" shown for Police/Emergency/Women's Helpline — **the `tel:` dial succeeded, entirely unaffected by `services/sos` being down** |
| 15:33:05 | Backend fan-out call attempted | `dispatchToBackend`'s `fetch()` to the (not running) SOS service failed; **"Failed to fetch" surfaced directly in the UI**, not silently swallowed |

**Applying `docs/runbooks/sos-dispatch-failure.md`'s own triage procedure, for real**, as a responder would:

```sql
SELECT channel, recipient_name, delivery_status, delivery_detail, sent_at
FROM sos_dispatch_log WHERE sos_event_id = 'bfef8c1c-cb3a-4fe3-b6d3-89f002084234' ORDER BY sent_at;
```

Actual result:

| channel | recipient_name | delivery_status | sent_at |
|---|---|---|---|
| women_helpline | Women's Helpline | dialed | 15:33:05.799879 |
| police | Police | dialed | 15:33:05.818207 |
| emergency112 | Emergency (All services) | dialed | 15:33:05.822683 |

**Exactly 3 rows, all `tel:` channels, all `dialed`. Zero rows for `trusted_contact`/`nearby_neighbour`.** This matches the runbook's §4.1 diagnostic signature precisely: "Missing rows entirely (not `delivery_status = 'failed'` rows) point at the backend fan-out never running at all" — confirming both that the runbook's triage query correctly and immediately identifies the right root-cause category (service down, not a partial/degraded failure), and that the audit trail itself never fabricates success for channels that were never actually attempted.

**What this drill proved, concretely:**

1. **Channel independence holds under a real partial outage**, not just the network-down case Phase 97 already tested — the `tel:` dial is provably unaffected by `services/sos` specifically being unreachable.
2. **The failure is honestly surfaced**, not hidden — the user sees "Failed to fetch" rather than a false "all done" state, and the audit trail (`sos_dispatch_log`) never claims a dispatch attempt that didn't happen.
3. **The runbook works as written** — its exact triage query, run against a real incident it had never seen before, correctly diagnosed the root cause in one step.

**Gap found during the drill (documented, not fixed in this pass):** the UI's "Notifying your trusted contacts and nearby neighbours…" line stays static — it doesn't flip to an explicit per-channel failure state the way the `tel:` section does. A user watching the screen sees the top-level "Failed to fetch" text but might not connect it specifically to "your trusted contacts were never notified." **Recommended fast-follow** (not executed here, to keep this drill's scope to diagnosis rather than turning into an unplanned feature change mid-drill): surface `dispatchToBackend`'s failure inline in the "YOUR CIRCLE" section specifically, not just as a generic top-of-flow error string.

## Drills not executed this round (scoped for a future game day)

- **RLS leak** (`docs/runbooks/rls-leak.md`) — Phase 94's sweep already provides strong, continuously-running assurance against this class of issue; a live "inject a bad policy, run the runbook" drill is a reasonable future exercise but wasn't run this round to keep this session's game day focused on the highest-consequence scenario.
- **Payment failure** (`docs/runbooks/payment-failure.md`) — the mock provider's real failure/retry branches were already exercised live during Group I's original verification (see `README.md`'s Group I section); re-running that specific drill through THIS runbook's exact steps is a reasonable near-term follow-up, not repeated here to avoid duplicating already-verified ground.
