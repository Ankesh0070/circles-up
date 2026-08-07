# SOS Legal Review & Data Retention Policy — Draft for Counsel Review

**Phase 56 of implementationplan.md Group E.** Per the plan, this is explicitly "process, not code" and gates public (non-internal) launch of Circle Guard. **This document is not legal advice.** It is a structured starting point — the specific questions that need a real answer, and draft language a lawyer can react to — written so you (or whoever you engage) isn't starting from a blank page. Nothing here should be treated as final until reviewed by qualified counsel licensed in the relevant jurisdiction(s).

## 1. What needs a real legal answer before public launch

1. **Liability/SLA language.** What does Circle Up promise, if anything, about SOS reliability? edgecase.md §3.9 already concludes the honest position is "don't imply guaranteed response" — but the exact wording of in-app copy, Terms of Service, and any marketing material needs a lawyer's sign-off, not an engineer's guess. Get specific: does "dispatched" in the UI imply delivery? Does it imply police response? These need precise, reviewed language.
2. **Data retention period for SOS records.** `sos_events` and `sos_dispatch_log` (this build's audit trail) currently have no automatic deletion — they persist indefinitely by default in Postgres. Is that correct? Retaining longer than ordinary app data is probably right (it's the evidence that dispatch was attempted, which matters exactly when something has gone wrong), but "indefinitely" needs an explicit, deliberate decision with a stated reason, not just "we never got around to writing a deletion job."
3. **Law-enforcement data request process.** If police request SOS/location data tied to an incident, who at Circle Up is authorized to respond, what's the verification process for the request itself (a fake request is also a real risk), and what's the response SLA? This needs a documented internal process, likely reviewed against India's applicable law (IT Act intermediary rules, DPDP Act once its rules are finalized — see architecture.md §9's data-residency note).
4. **Silent Phrase's audio handling.** Confirm the "audio never leaves the device" claim (this build's actual architecture, per docs/silent-phrase-ios-feasibility-spike.md) is something legal is comfortable with us asserting in the privacy policy — it's currently true by construction (no server-side audio upload path exists), but that needs to be a reviewed privacy-policy statement, not just an engineering fact nobody wrote down.
5. **Location data handling.** `location_shares`/`sos_events` store raw lat/lng. Confirm retention, who can access it (currently: the user themselves via RLS, service_role via the backend — see supabase/migrations/20260807091717_guard_sos.sql), and whether any third party (e.g., an SMS gateway vendor once one is contracted per Phase 6) sees location data in message bodies, and what that vendor's own data handling terms are.
6. **Minor safety.** If a user under 18 (self-declared per Group B's age-gate) uses SOS, are there different obligations (e.g., mandatory reporting in some jurisdictions for certain disclosed situations)? Needs a specific answer, not an assumption either way.

## 2. What this build actually does today (factual basis for the review — not a policy proposal)

- `sos_events`/`sos_dispatch_log` retained with no expiry (Postgres default — see the Phase 47 migration). No deletion job exists.
- RLS restricts `sos_events`/`sos_dispatch_log` reads to the event's own user and (for dispatch_log) the specific alerted neighbour — see the pgTAP tests in `supabase/tests/guard_sos_rls_test.sql` proving this. `service_role` (the backend) can read/write everything, bypassing RLS, per Postgres's `BYPASSRLS` role attribute.
- No automated data-export or data-deletion-request handling exists yet for SOS records specifically (Circle Up's broader "delete my account" flow, if one exists, is out of this group's scope).
- Police/emergency contact numbers (100/112/1091) are dialed directly by the user's device via native `tel:` links — Circle Up's servers never see or log the actual outcome of that call, only that the app attempted to open the dialer (see `sos_dispatch_log.delivery_status = 'dialed'`, which is a *self-reported client claim*, not a confirmed call connection).

## 3. Draft starting language (for counsel to edit, not adopt verbatim)

> **In-app SOS disclaimer (draft):** "Circle Up's SOS feature attempts to notify emergency services, your trusted contacts, and nearby verified neighbours. We cannot guarantee that any party will receive, see, or respond to an SOS alert. In a life-threatening emergency, always call emergency services directly."

> **Retention (draft):** "Records of SOS activations, including approximate location and who was notified, are retained for [X — needs a number] to support safety investigations and, where legally required, law enforcement requests. You may request deletion of this data subject to our legal retention obligations."

## 4. Recommended process before public launch

1. Route this document to actual counsel (or your company's legal function) — not an engineering sign-off.
2. Get explicit answers to §1's six questions, in writing.
3. Turn the answers into final ToS/Privacy Policy language (replacing §3's drafts) and, if a retention period is decided, a scheduled deletion job (not built in this group's scope — flag as a fast-follow engineering task once the retention period is legally decided).
4. Only then remove any "internal testing only" gating on Circle Guard's public availability.
