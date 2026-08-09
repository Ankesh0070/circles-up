# Network-Degradation Test Results

**Phase 97 of implementationplan.md Group K, edgecase.md §11.6.** Depends on Group E (Guard) and Group B (verification). Unlike Phases 95/96, this one was fully executable against the running local stack and was — the results below are from real, live test runs (backend killed mid-flow), not a scoping document, and both real bugs found were fixed and re-verified before this doc was written.

## Method

Both flows were tested by killing the entire backend (WSL-side PostgREST + the local auth/REST gateway shim) mid-session — the harshest realistic case (`net::ERR_CONNECTION_REFUSED` on every request), rather than throttled/slow network, since a fully dead connection surfaces the most severe class of bug (hangs, unrecoverable states) that a merely-slow connection might hide behind a long spinner. Verified via the real browser preview against the real running app, not a unit test of the logic in isolation.

## SOS flow (Circle Guard → SOS button → dial + dispatch)

**Bug 1 — the SOS button could become permanently unusable if the network was down at the moment Circle Guard was opened.** `GuardScreen` populated its `userId` state via `supabase.auth.getUser()`, which re-verifies the session against the server on every call. With the backend killed, that request never resolves, `userId` stays `null` forever, and the SOS button (`disabled={!userId}`) never becomes pressable — on the one screen in the entire app that must work with zero connectivity. **Fixed:** switched to `supabase.auth.getSession()`, which resolves an already-valid session from local storage without a network round-trip. Re-verified live: with the backend still dead, the SOS button is pressable immediately after opening Circle Guard.

**Bug 2 — even once the button was pressable, the dial itself was ordered behind two network-dependent steps.** `SosFlow.fire()` used to (1) fetch best-effort GPS location, (2) `INSERT` the `sos_events` row and wait for the server to hand back its generated id, and only *then* (3) attempt the native `tel:` dial — meaning a dead network, or even just a slow GPS fix, delayed or entirely blocked the one channel edgecase.md §3.1 calls out as needing to work with zero connectivity, exactly backwards from the intent already documented in that file's own comments. **Fixed:** the event id is now generated client-side (`expo-crypto`'s `randomUUID()`) so the `tel:` dial can fire immediately and unconditionally, before anything that touches the network; the durable database record, the dispatch-log write, and the backend fan-out call all happen afterward, in parallel, and are individually best-effort (a failed audit-log write no longer looks like a failed dial, since the dial had already succeeded by the time that write is attempted).

**Live re-verification after both fixes**, backend still fully dead: opened Circle Guard → SOS button pressable immediately → countdown → **"SOS Active" screen appeared with "EMERGENCY SERVICES (DIALED)" already showing Police/Emergency/Women's Helpline**, entirely offline → "Notifying your trusted contacts and nearby neighbours…" shown as the (failing, backend-dependent) fan-out continues in the background without blocking the UI → "I'm safe now" closed the flow cleanly with no hang, no crash, no unhandled error surfaced to the user (`resolveSosEvent`'s failed network call is silently absorbed by supabase-js's non-throwing `{error}` return shape, confirmed by reading the code — not a "happens to work" accident).

## App-wide finding: the onboarding gate misread "network failed" as "not onboarded"

Found while re-testing the SOS fixes with a full page reload (backend still dead) — not something the plan explicitly asked to check under this flow, but directly relevant to it, since Circle Guard lives behind this gate. `RootNavigator` decides whether a signed-in user goes to Main or back through the full Address/live-selfie verification gauntlet by querying `profiles.onboarding_completed` and falling back with `data?.onboarding_completed ?? false` — **which doesn't distinguish "the row says false" from "the request never got an answer."** A fully verified returning user reopening the app with no connectivity was being routed straight back into re-verification instead of Main, which would have made Circle Guard (and everything else) completely unreachable while offline, not just degraded.

**Fixed:** the fallback now checks for a request `error` explicitly and defaults to `onboarded = true` in that case — a session existing at all means the person signed in before, so assuming onboarded and letting individual screens handle their own offline states is far safer than bouncing a real, verified user through re-verification because of a transient network blip. **Re-verified live:** reloaded the app with the backend still dead — landed on Main (Home feed, bottom nav, SOS pill all visible) instead of the Address screen.

## Address/identity verification flow (`AddressVerificationFlow`)

Code-reviewed rather than click-through re-tested live (this flow needs a real device camera for the liveness selfie, which this browser-based verification session can't drive) — but the submission path is already structured correctly: the network call to the verification service is wrapped in `try/catch/finally`, a non-`ok` response is explicitly thrown and caught, the `finally` block always clears the submitting/loading state, and a real error message is surfaced to the user for retry. **No bug found or fix needed here** — this is a clean result, not a skipped check.

## Summary

| Flow | Result |
|---|---|
| SOS button reachability while offline | 🔴 → 🟢 Fixed (Bug 1) |
| SOS `tel:` dial ordering | 🔴 → 🟢 Fixed (Bug 2) |
| App-wide onboarding gate on network failure | 🔴 → 🟢 Fixed (found while testing SOS) |
| SOS "I'm safe now" resolution | 🟢 Already correct |
| Address verification submission error handling | 🟢 Already correct |
