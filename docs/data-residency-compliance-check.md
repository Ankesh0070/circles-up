# Data Residency & DPDP Act Compliance — Final Check

**Phase 98 of implementationplan.md Group K, edgecase.md §11.4.** Depends on Phase 3 (Supabase setup). Same discipline as `docs/sos-legal-review-and-retention-policy.md` (Phase 56): **this is not legal advice.** It's a structured, factual starting point for whoever engages counsel — what this build actually does today, what a real launch needs answered, and why it isn't answered here. Nothing below should be treated as a compliance sign-off.

## 1. What's already decided (architecture.md §9, carried forward, not re-litigated here)

- Supabase project region: **Mumbai (`ap-south-1`)**, chosen for latency to India-based users and to align with likely data-localization expectations for an India-focused app.
- **Not yet executed:** no real Supabase cloud project exists yet at all (see `README.md`'s "Accounts you need to create" section) — this entire session's verification work ran against a from-scratch local stack (see the Group I README note), not a deployed Mumbai-region project. Region selection is a decision made in `architecture.md`, not something this session could go create and verify a real billing/infra account for.

## 2. What data this build actually collects and stores today (factual basis, not a policy proposal)

Grepped the real schema for every column that's plausibly SPDI (Sensitive Personal Data or Information, the operative category under India's IT Act rules and the DPDP Act 2023's broader "personal data" scope):

| Data | Where | Sensitivity note |
|---|---|---|
| Live-selfie liveness capture, GPS coordinates + accuracy at verification time | `society_memberships` (`gate_photo_url`, `lat`, `lng`, `gps_accuracy`) | Biometric-adjacent (a face photo) + precise geolocation — the highest-sensitivity category this app touches |
| SOS event location, dispatch log (who was notified, when, self-reported delivery status) | `sos_events`, `sos_dispatch_log` | Precise geolocation tied to a safety emergency — see Phase 56's dedicated retention-policy doc, which already covers this specific data in depth |
| Live location shares to trusted contacts | `location_shares`, `location_share_recipients` | Precise geolocation, time-bounded (hard-enforced `expires_at`, Phase 51) |
| Phone number (auth), private profile phone field (Phase 86) | `auth.users`, `profiles.phone` | Contact information |
| Society/tower/flat address details | `society_memberships` | Residential address — sensitive in the specific sense that it reveals exactly where someone lives, tied to their real identity |
| Age self-declaration (18+ gate, Phase 21) | not stored as a separate field — an affirmative UI gate at signup, not a stored birthdate | Lower sensitivity — no birthdate/age value is actually persisted |
| Government ID-adjacent business fields (GST number, Darpan ID) | `pages` | Self-declared, labeled as such in the UI (Phase 77) — not verified against a registry in this build |

## 3. DPDP Act 2023 alignment checklist — what needs a real (legal) answer

The DPDP Act's substantive rules were still being finalized as of this build's writing (architecture.md §9 already flags this), so precise compliance can't be certified here — but the shape of what it requires is stable enough to checklist against:

1. **Consent.** DPDP requires clear, specific, informed consent for processing personal data, with an easy withdrawal path. This build's signup flow (age-gate checkbox, Phase 21) covers age but has no dedicated, itemized data-processing consent screen (e.g., "we collect your GPS location for address verification and SOS dispatch — do you consent?"). **Gap: needs a real consent-flow design + legal review before public launch**, not just a Terms-of-Service link (Phase 88's Settings→Terms is explicitly a placeholder, not final copy — see `docs/network-degradation-test-results.md`'s sibling docs and `SettingsDetailScreen.tsx`'s honest static-placeholder pattern).
2. **Purpose limitation.** Each sensitive field above needs a documented, narrow stated purpose (e.g., "GPS at verification time is used solely to confirm neighbourhood residency, per `is_within_neighbourhood`'s 500m geofence check"). This build's code comments already document the *engineering* purpose of each field fairly thoroughly (see the migrations' own comments) — turning that into user-facing, legally-reviewed purpose statements is the remaining work.
3. **Data Principal rights (access/correction/erasure).** Phase 88 (Group J) already built self-service account deletion (`request_account_deletion()` — soft-delete/anonymization, not a synchronous hard purge, by deliberate design per that phase's README section) and Edit Profile covers correction. **Gap: no self-service data-export/access feature exists** — a user can't currently download "everything Circle Up has stored about me," which the DPDP Act's access-right provisions likely require.
4. **Breach notification.** DPDP requires notifying the Data Protection Board and affected individuals on a breach, timeline TBD by rules. **Gap: no incident-response process for a *data breach* specifically exists yet** — `docs/runbooks/rls-leak.md` (Phase 100, this same group) covers the *engineering* response to a suspected RLS leak, but not the *legal* breach-notification obligations that would follow a confirmed one. These need to be linked, not conflated — an engineer executing the RLS-leak runbook should have a clear, immediate escalation path to whoever owns the legal notification obligation.
5. **Data localization.** Some SPDI categories under India's existing IT Act rules already have localization expectations; the DPDT Act itself doesn't currently mandate blanket in-India storage for most data (unlike GDPR-style regimes) but reserves government power to restrict cross-border transfer for specified categories. **The Mumbai region choice (§1) is the right practical default given this**, but should be explicitly re-confirmed against final DPDP rules once notified, not assumed permanently correct.
6. **Significant Data Fiduciary obligations.** If Circle Up's user base grows large enough (a government-notified threshold, not yet published in final form), stricter obligations (DPO appointment, data protection impact assessments, independent audits) may apply. **Not applicable at current scale, but worth a calendar reminder to re-check as the user base grows**, not a one-time decision.

## 4. Recommended process before public launch

1. Route this document (and Phase 56's sibling SOS-specific one) to actual counsel — not an engineering sign-off, same as Phase 56.
2. Stand up the real Mumbai-region Supabase project (README's "Accounts you need to create" section) and confirm current region/compliance posture directly against Supabase's own DPDP-readiness statements, which may have been published/updated since this build's writing.
3. Design and build the two concrete engineering gaps flagged above once legal gives specifics: (a) an itemized data-processing consent screen at signup, (b) a self-service data-export feature alongside the existing deletion flow.
4. Establish the legal breach-notification escalation path referenced in §3.4, and link it explicitly from `docs/runbooks/rls-leak.md`.
5. Only then remove any "internal testing only" gating on public availability — same closing line as Phase 56's doc, deliberately, since both gates need to clear together.
