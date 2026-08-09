# Realtime Scale/Load Assessment

**Phase 95 of implementationplan.md Group K.** Depends on Phase 36 (Chat realtime) and Phase 46 (SOS Active Overlay realtime). Per the plan's own deliverable wording, this is explicitly "scoped, not necessarily executed" — this document does the scoping; §3 below is honest about what actually was and wasn't executed, and why.

## 1. What this build actually uses Realtime for today

Three subscriptions exist, found by grepping the mobile app for `.channel(`:

| Screen | Table (`supabase_realtime` publication) | Filter | Purpose |
|---|---|---|---|
| `ChatDetailScreen` (Phase 36) | `messages` | `chat_id=eq.<id>` | Live-append incoming messages in an open chat |
| `SosFlow` (Phase 46) | `sos_dispatch_log` | `sos_event_id=eq.<id>` | Live-append dispatch confirmations during an active SOS |
| `SafetyAlertsFeed` (Phase 55) | `safety_alerts` | none (all rows) | Broadcast a new society/police alert to everyone viewing the feed |

All three are scoped, per-screen, per-mount subscriptions (chat/SOS ones are additionally row-filtered server-side by Postgres's replication filter, not just client-side) — nothing subscribes to a firehose of every table's changes, which is the main lever available for controlling connection/message fan-out cost before reaching for a different vendor at all.

**Code review finding (real, not hypothetical):** all three subscriptions call `supabase.removeChannel(channel)` in their `useEffect` cleanup — verified by reading `ChatDetailScreen.tsx`, `SafetyAlertsFeed.tsx`, and `SosFlow.tsx` directly. No connection-leak bug (a channel staying open after its owning screen unmounts) exists in the current codebase. This is the single most common real-world cause of hitting Realtime connection ceilings early, and it's clean today.

## 2. Supabase Realtime's documented connection limits (desk research, not a load test)

Supabase's Realtime service (as of its published plan documentation) enforces per-project **concurrent connection** and **messages-per-second** ceilings that scale with plan tier — the free tier caps in the low hundreds of concurrent connections, paid tiers scale into the thousands, with Realtime-specific add-ons available for higher ceilings. Circle Up's actual production tier is an open decision (see `README.md`'s "Accounts you need to create" section — no production Supabase project exists yet), so a precise number can't be stated here without picking one; the actionable takeaway is: **the connection ceiling is a paid-plan knob, not an architecture constraint**, as long as the fan-out pattern above (scoped, filtered, per-screen subscriptions) holds as the app grows.

The one growth vector worth flagging now, before it's a production surprise: `SafetyAlertsFeed`'s subscription has **no filter** — every client with that screen mounted holds one connection subscribed to *all* `safety_alerts` inserts app-wide, not scoped to their neighbourhood or city. At today's scale this is irrelevant; at real multi-city scale it means every user's device receives (and silently discards, since the client already re-fetches via `is_verified_in_neighbourhood`-scoped RLS on reads) every other city's alert inserts too. **Recommended fix when this becomes real traffic:** add a `neighbourhood_id=in.(...)` or city-level filter to the channel subscription, matching the RLS scope the REST reads already use — not urgent today, flagged here so it isn't rediscovered the hard way during a real incident under load.

## 3. What was and wasn't actually executed here

**Not executed: a real Supabase Realtime websocket load test.** This session's whole verification stack (see the Group I README note) is a from-scratch Docker-free substitute built from native Postgres + the real PostgREST binary + a small Express auth/REST shim — it has **no Realtime server component at all**. Supabase's Realtime is a separate Elixir/Phoenix service that isn't part of what got rebuilt locally, and standing one up from scratch was out of scope for what this group needed to prove. This means: **the three `.channel()` subscriptions above have never been live-tested against a real Realtime server in this environment** — they've only ever been code-reviewed (§1) and exercised against real Supabase Cloud, if at all, outside this session. This is a genuine, load-bearing gap, not a formality — flagged the same way Phase 6's dummy-vendor gaps and Phase 56's legal-review gap are flagged elsewhere in this repo, rather than silently assumed away.

**Executed instead: a real connection-concurrency test against the REST/Postgres layer**, as the closest honest substitute available in this stack, to at least verify the underlying Postgres connection pool (which Realtime's `postgres_changes` feature also depends on, via logical replication) doesn't fall over under concurrent load:

```bash
# 200 concurrent authenticated PostgREST requests against the real
# running local Postgres/PostgREST (not a mock) — run twice for consistency
seq 1 200 | xargs -P 200 -I{} curl -s -o /dev/null -w "%{http_code} %{time_total}\n" \
  http://127.0.0.1:3001/neighbourhoods -H "Authorization: Bearer <authenticated JWT>"
```

Actual results (two runs, `db-pool = 10` in this local stack's PostgREST config — i.e. only 10 pooled Postgres connections behind the scenes):

| Run | Success | Avg latency | Max latency |
|---|---|---|---|
| 1 | 200/200 (`200`) | 16.1ms | 94.4ms |
| 2 | 200/200 (`200`) | 7.0ms | 30.8ms |

Zero connection refusals or pool-exhaustion errors across both runs, despite 200 simultaneous HTTP requests sharing a 10-connection Postgres pool — PostgREST's own internal request queuing absorbed the burst cleanly. This proves the Postgres connection-pooling layer under `postgres_changes`' replication mechanism isn't fragile at small-to-moderate concurrency; it proves nothing about Realtime's own websocket fan-out ceiling, which is a separate subsystem this local stack doesn't have at all (see above).

## 4. Ably/Pusher migration path (scoped per the plan, not executed)

If Supabase Realtime's connection/message ceilings ever become the actual bottleneck (not yet reached, and not really knowable without production traffic), the migration path is:

1. **Trigger condition:** Supabase dashboard shows sustained Realtime connection count near the plan ceiling, or Realtime message latency/drop rate degrades under real load — not a preemptive migration.
2. **Scope of change:** only the 3 `.channel()` call sites above need to change client-side (swap `supabase.channel(...)` for the equivalent Ably/Pusher subscribe call); the Postgres side (`supabase_realtime` publication membership) can stay as-is or be replaced by a lightweight `pg_notify`-driven bridge process that republishes to Ably/Pusher, since none of the 3 use cases need anything beyond "row inserted, push it."
3. **Cost shape:** both Ably and Pusher price primarily on concurrent connections + messages, similar to Supabase's own Realtime add-on pricing — this is a vendor-cost decision at the point it's needed, not an architecture blocker today.
4. **Effort estimate:** small — the 3 subscriptions are already isolated, thin wrappers (`.channel().on().subscribe()` + a cleanup call) with no cross-cutting realtime abstraction to unwind first.

No code changes are needed today to keep this path open — the current design doesn't lock the app into Supabase Realtime specifically.
