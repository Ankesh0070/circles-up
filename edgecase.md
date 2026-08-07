# Circle Up — Edge Cases

> Companion to [problemstatement.md](problemstatement.md) and [architecture.md](architecture.md). Catalogs failure modes, abuse vectors, and boundary conditions per feature area, with severity and suggested handling. Use this to pressure-test the build order before each module ships.

Severity key: 🔴 **Critical** (safety/trust/legal risk) · 🟠 **High** (breaks core promise) · 🟡 **Medium** (bad UX, workable) · ⚪ **Low** (polish)

---

## 1. Identity Verification & Onboarding

| # | Edge case | Sev | Handling |
|---|---|---|---|
| 1.1 | User's claimed address is real, but their GPS reading during selfie capture doesn't match (e.g., verifying from office, not home) | 🟠 | Define an acceptable radius (e.g., 500m) around the claimed society boundary instead of exact-match; reject outside that with a clear "please verify from your registered address" message, not a silent failure |
| 1.2 | GPS spoofing apps (widely available on Android) fake a location to pass geofencing | 🔴 | Server-side mock-location detection (Android exposes `isFromMockProvider`); combine GPS with WiFi/cell-tower triangulation as a cross-check; flag mismatches for manual review rather than auto-approving |
| 1.3 | Liveness vendor API is down or rate-limited during a signup spike (e.g., marketing push) | 🟠 | Queue verification requests with a "verifying, we'll notify you" state instead of blocking signup entirely; never silently mark someone verified as a fallback |
| 1.4 | Legitimate user fails liveness check repeatedly (poor lighting, camera quality, disability affecting face detection) | 🟠 | After N auto-fails, route to manual/human review queue rather than permanently locking the user out — auto-only liveness will have a non-trivial false-reject rate |
| 1.5 | Two different people both claim the same flat number (subletting, family members, previous tenant didn't remove themselves) | 🟠 | Allow multiple verified members per flat (household model) rather than one-owner-per-flat; require existing verified members of that flat to get a notification when someone new claims it |
| 1.6 | User moves out but their profile stays "verified" for their old society indefinitely | 🟡 | Periodic re-verification prompt (e.g., every 6–12 months) or a self-service "I moved" flow that re-triggers verification for the new address |
| 1.7 | RWA/society isn't in the system yet (new society, not yet onboarded) | 🟡 | Self-service "create a neighbourhood" flow with a higher verification bar (e.g., requires 3+ independent verifications before the neighbourhood goes live) to prevent one bad actor from seeding a fake society |
| 1.8 | User has no smartphone camera access permission and refuses to grant it | 🟡 | Prototype has a gallery-picker fallback (`GpsCameraModal` denied state) — but a gallery photo has no live GPS/liveness guarantee; must be flagged as lower-trust or routed to manual review, never silently treated as equal to a live capture |
| 1.9 | Minor (under legal age) attempts signup | 🔴 | Age-gate at signup (self-declared minimum, e.g., 18+) with ToS consequence for false declaration; liveness vendors sometimes support age-estimation — consider as a secondary signal, not sole gate |
| 1.10 | User's phone number is recycled from a previous Circle Up user (common in India with number churn) | 🟡 | New signup on a previously-used number should not inherit the old account's verified status, circles, or SOS trusted-contacts — require full re-verification |
| 1.11 | Address autosuggest (Google Places) doesn't have granular tower/flat data for the society | 🟡 | Fall back to free-text tower/flat entry after society selection, validated against existing memberships list for that society rather than an external API |

---

## 2. Feed & Posts

| # | Edge case | Sev | Handling |
|---|---|---|---|
| 2.1 | "Alert" category abused for non-alerts (spam, promotions) to get visibility | 🟠 | Rate-limit Alert-category posts per user per day; require a brief reason/report threshold before a user's Alert posts get down-ranked |
| 2.2 | False/malicious "Alert" post causes panic (e.g., fake "thief in building" post) | 🔴 | Alerts from unverified-recently (e.g., <7 days) accounts get a "new member" flag; repeated false alerts trigger account review; consider requiring RWA/admin co-sign for high-severity alert types |
| 2.3 | User posts content that doxxes another resident (photo + flat number + accusation) without consent | 🔴 | Report flow must support fast-track takedown for doxxing/harassment reports, separate from general content moderation queue |
| 2.4 | Post references a specific flat/tower in a defamatory way ("B-1204 is noisy every night") — the named resident sees it and disputes | 🟠 | No automated fix, but the report flow should let a named/tagged resident flag "this is about me and it's false" as a distinct report reason with faster review priority |
| 2.5 | Deleted post still visible in someone's Genie search results (cached embedding) | 🟡 | Deletion must cascade to the pgvector embedding store, not just the posts table — architecture's embedding job needs a delete-listener, not just a create-listener |
| 2.6 | User leaves the neighbourhood (moves out) but their old posts remain visible/attributed | 🟡 | Decide: posts persist (historical record) vs. anonymize-on-departure — needs a product decision, not just engineering |
| 2.7 | Reaction spam — one user rapidly reacting/un-reacting to manipulate engagement signals | ⚪ | Debounce reactions per user per post server-side |
| 2.8 | Post with media exceeds storage/bandwidth expectations (large video uploaded as "photo") | 🟡 | Client-side compression before upload; server-side file-size/type validation, not just client validation |
| 2.9 | Category color/icon misleads users about severity (e.g., "General" post that's actually urgent) | ⚪ | Not a technical edge case — a copy/UX guardrail: category picker should show a one-line description of intended use per category |

---

## 3. Circle Guard (SOS) — highest-stakes module

| # | Edge case | Sev | Handling |
|---|---|---|---|
| 3.1 | User triggers SOS but has no network connectivity (data off, no signal) | 🔴 | SOS trigger must attempt SMS via the cellular network even with data off (SMS doesn't require mobile data); native `tel:`/`sms:` deep links as prototype already does are a critical fallback, not just a nice-to-have |
| 3.2 | SMS gateway (Twilio/MSG91) is down or rate-limited during dispatch | 🔴 | Dispatch to police/emergency/helpline via device-native `tel:`/`sms:` (goes through the carrier directly) as the primary channel for those three; use the SMS gateway only for trusted-contacts/neighbour fan-out, which is the part gateway downtime is more tolerable for |
| 3.3 | User accidentally triggers SOS (butt-dial equivalent, kids playing with phone) | 🟠 | Prototype already has a 5s cancelable countdown — keep this, but also log false-trigger rate; repeated accidental triggers from the same user should surface a "want to adjust your SOS sensitivity?" prompt, not just be silently tolerated (real emergency responders get desensitized by false alarms) |
| 3.4 | Silent Phrase false-positive — background noise/conversation happens to match the trigger phrase | 🔴 | On-device keyword spotting has an inherent false-positive rate; must show a *silent but visible* brief on-screen cue (e.g., subtle icon change) with a very short cancel window, so a false trigger during a normal conversation about "order kar do" (a common Hindi phrase!) doesn't escalate to full dispatch. **The chosen default phrase is itself risky — it's plausible in normal conversation.** Recommend defaulting to a less common phrase and letting users customize with a uniqueness check |
| 3.5 | Silent Phrase on iOS — background mic access is restricted by the OS (flagged in architecture.md open decisions) | 🔴 | Until resolved: either (a) ship Android-only for this feature, or (b) require app-foreground for iOS with a widget/shortcut-triggered fallback. **Must not market "always listening" if iOS can't deliver it** — mismatched expectations during an actual emergency are a liability issue |
| 3.6 | "5 nearest neighbours" dispatch reaches someone who is asleep, on Do Not Disturb, or has notifications disabled | 🟠 | SOS push notifications should request a notification-permission override/critical-alert channel (both iOS and Android support "critical alerts" that bypass DND) — request this explicitly during Guard feature onboarding |
| 3.7 | Trusted contact's phone number is outdated/wrong | 🟡 | Periodic prompt to confirm trusted contacts are current (e.g., every 3 months); show last-confirmed date in the Trusted Contacts screen |
| 3.8 | User in genuine danger cannot safely provide a live GPS fix (indoors, poor signal, deliberately in a dead zone e.g. parking garage) | 🟠 | Dispatch should proceed with best-available last-known location + explicit "location may be approximate" flag rather than blocking dispatch on a perfect GPS fix |
| 3.9 | SOS dispatched, but no one responds/acknowledges (police busy, neighbours don't see it in time) | 🔴 | This is a fundamental reliability gap the product cannot fully solve — the honest mitigation is: don't imply guaranteed response in marketing/UI copy; log every dispatch's delivery+ack status (per architecture's `sos_dispatch_log`) and consider an escalation tier (e.g., re-notify wider radius if no ack within 90s) |
| 3.10 | Malicious user triggers SOS as harassment against nearby neighbours (repeated false alarms to disturb a specific building) | 🟠 | Rate-limit SOS triggers per user; pattern-detect repeated false triggers targeting the same recipient set; this needs human review, not full automation, given the cost of over-restricting genuine emergencies |
| 3.11 | Fake Call feature — the simulated call interrupts something important (e.g., user is mid-transaction, on another real call) | ⚪ | Should be user-triggered only (never auto-fires), with a clearly visible "End Fake Call" affordance distinct from a real call UI so the user isn't confused mid-use |
| 3.12 | Live location sharing left running after the user is safe, indefinitely | 🟡 | Enforce the prototype's timed options (15/30/60/120 min) with a hard auto-stop, not just a UI suggestion — don't let this become an accidental indefinite surveillance channel |
| 3.13 | SOS data (location history, dispatch logs) subpoenaed or requested by law enforcement — retention/access policy undefined | 🔴 | Legal review required before launch (already flagged in architecture.md §9) — must have a documented data request policy before this feature goes live, not after an incident |

---

## 4. Circle Genie (AI Search)

| # | Edge case | Sev | Handling |
|---|---|---|---|
| 4.1 | LLM hallucinates an answer not actually grounded in retrieved posts, despite RAG design intent | 🟠 | Strict prompt constraints ("only answer using the provided sources; say 'not enough info' otherwise") plus a post-hoc check: if the answer references a name/place not present in `source_post_ids`, suppress and show "no answer found" instead |
| 4.2 | Not enough local posts exist yet for a query to have a good answer (cold-start neighbourhood) | 🟡 | Graceful "not enough neighbours have posted about this yet — be the first to ask in the feed" fallback rather than a broken/empty result |
| 4.3 | Genie surfaces a recommendation for a service provider who has since gone out of business / changed number | 🟡 | Show post recency ("mentioned 8 months ago") prominently so users can judge staleness themselves |
| 4.4 | Genie answer references a post that contains someone's personal contact info shared informally (e.g., "call Ramesh at 98xxxxxxx") — is resurfacing that appropriate outside its original context? | 🟠 | Consider whether phone numbers in source posts should be redacted/obfuscated in Genie's synthesized answer, or link back to the original post instead of repeating the number directly |
| 4.5 | User asks Genie something adversarial/unrelated to try to jailbreak it (prompt injection via a crafted query or via a malicious post designed to manipulate future Genie answers) | 🟠 | Standard LLM input sanitization; treat retrieved post content as untrusted data in the prompt (not instructions) — a post can't be crafted to make Genie "ignore previous instructions" |
| 4.6 | Query costs (LLM API calls) scale with usage in a way that wasn't budgeted | 🟡 | Cache common queries per neighbourhood (e.g., "best plumber" asked repeatedly) rather than re-running the full RAG pipeline every time |

---

## 5. Chat & Messaging

| # | Edge case | Sev | Handling |
|---|---|---|---|
| 5.1 | "End-to-end encrypted" claim in the prototype footer — is it actually true in the real implementation, or just Supabase-managed transport encryption? | 🔴 | **This is a legal/trust liability if false.** Either implement real E2EE (e.g., Signal protocol library) or remove/rephrase the claim to "encrypted in transit and at rest" — do not ship a false security claim |
| 5.2 | Group chat member removed from the neighbourhood (failed re-verification, moved out) but remains in existing group chats | 🟡 | Membership changes should trigger a review of group chat access, at minimum surfacing to group admins that a member's verification lapsed |
| 5.3 | Harassment via DM that doesn't go through the public post moderation queue | 🟠 | DMs need their own report/block flow (prototype doesn't detail this) — block must be immediate and bidirectional-invisible (blocked user shouldn't see why they can't reach the other person) |
| 5.4 | Voice notes/media in chat consume significant storage over time with no lifecycle policy | ⚪ | Define retention/archival policy for chat media (e.g., auto-archive to cold storage after N months) |

---

## 6. Circle Bazaar (Marketplace)

| # | Edge case | Sev | Handling |
|---|---|---|---|
| 6.1 | Item sold in-app but seller doesn't mark it sold — buyers keep messaging about unavailable items | 🟡 | Prompt seller to mark status after a message/interest threshold; auto-flag stale listings (no update in 30+ days) |
| 6.2 | Dispute after a transaction (item not as described, payment issue) — Circle Up isn't in the payment loop, so what's the recourse? | 🟠 | Be explicit in ToS that Bazaar is a listing/connection service only, not an escrow/payment platform — Circle Up has no visibility into off-platform cash/UPI transactions and cannot mediate disputes; this must be clear to users upfront |
| 6.3 | Prohibited items listed (weapons, drugs, counterfeit goods) | 🔴 | Category/keyword filtering at post-time plus report flow; legal exposure if platform knowingly allows prohibited listings to persist after being reported |
| 6.4 | Verified seller identity ≠ trustworthy seller — verification proves "lives in this society," not "won't scam you" | 🟡 | UX should be careful not to overstate what verification guarantees — "verified neighbour" language, not "verified trustworthy seller" |

---

## 7. Circle Scenes (Events)

| # | Edge case | Sev | Handling |
|---|---|---|---|
| 7.1 | Event guest limit reached but people keep RSVPing "Going" | 🟡 | Waitlist state once cap is hit, rather than silently over-booking or blocking RSVP entirely |
| 7.2 | "Open invite" privacy tier means non-verified/outside-neighbourhood people could theoretically see and attend — safety concern for a residential community event | 🟠 | Open-invite events should still require the *inviter* to be verified, and should surface a clear warning to the host about reduced privacy before publishing |
| 7.3 | Host cancels event after RSVPs — no cancellation/notification flow evident in prototype | 🟡 | Cancellation must push-notify all RSVP'd users, not just remove the event silently |
| 7.4 | Paid events (implied by Bazaar/Pages having payment concepts) — no ticketing/refund flow designed | 🟡 | If events ever support paid entry, this needs its own dispute/refund architecture — flag as out of scope until explicitly designed |

---

## 8. Pages, Ads & Monetization

| # | Edge case | Sev | Handling |
|---|---|---|---|
| 8.1 | GST number / Darpan ID entered is self-declared and unverified against government registries (already flagged in architecture.md §7) | 🟠 | UI must clearly label these as "self-declared, verification pending," not imply government-verified status — misrepresenting this could have legal consequences for both Circle Up and the business |
| 8.2 | NGO donation flow: fake NGO page set up to collect donations fraudulently | 🔴 | Given Circle Up explicitly markets "0% fee, 80G receipts," a fraudulent NGO page is a serious trust/legal risk — require manual review/approval before any NGO page can accept donations, not just self-service signup |
| 8.3 | Advertiser's ad budget exhausted mid-day but ad still shows due to caching/pacing lag | 🟡 | Ads Service pacing loop needs a hard budget check at serve-time, not just periodic reconciliation |
| 8.4 | Ad targeting radius overlaps into a neighbourhood where the advertiser has no legitimate local presence (spam/scam ads exploiting hyperlocal trust signal) | 🟠 | The whole pitch of hyperlocal ads is elevated trust ("this business is near me") — an ad review/approval step is more important here than on a generic ad platform, since users will extend more trust to a "neighbourhood ad" than a random web ad |
| 8.5 | Business page claims a physical address that doesn't match its actual location (fake local presence for targeting eligibility) | 🟡 | Address claimed by pages should go through the same geocoding validation as user addresses, even if not full liveness verification |
| 8.6 | Donation payment succeeds via Razorpay but receipt generation fails (network blip, service error) | 🟠 | Receipt generation must be a reliable async job with retries, decoupled from the payment success response — a donor should never lose their tax receipt due to a transient failure |
| 8.7 | Multiple ad campaigns from different advertisers target the exact same small society simultaneously — ad load feels spammy in a small community | 🟡 | Cap max concurrent sponsored posts per neighbourhood size (smaller societies get fewer total ad slots) rather than a flat global ratio |

---

## 9. Multi-Neighbourhood & Discovery

| # | Edge case | Sev | Handling |
|---|---|---|---|
| 9.1 | User verified in Neighbourhood A posts something, then switches active context to Neighbourhood B — which feed/audience does the post belong to? | 🟠 | Every post must be explicitly scoped to one `neighbourhood_id` at creation time based on active context — never ambiguous or dual-posted without explicit user action |
| 9.2 | "From your city" discovery in Explore surfaces someone the user has explicitly blocked in their home neighbourhood | 🟠 | Block lists must be global (per-user), not scoped to a single neighbourhood — a block should suppress across all discovery surfaces |
| 9.3 | Two neighbourhoods geographically overlap or a society sits exactly on a boundary (ambiguous which "neighbourhood" it belongs to) | 🟡 | Manual curation/admin tooling needed for neighbourhood boundary definition rather than pure auto-geocoding — boundary edge cases will need human judgment |
| 9.4 | User re-verifying a second neighbourhood uses a stale/reused gate photo instead of a fresh live capture | 🟡 | Each neighbourhood verification must require a fresh liveness capture, not allow reuse of a previous verification's photo |

---

## 10. Gamification / Achievements

| # | Edge case | Sev | Handling |
|---|---|---|---|
| 10.1 | Users game achievements (e.g., spam small "helpful" actions to inflate points/rank) | 🟡 | Weight achievement triggers toward harder-to-fake signals (verified transactions, RSVP'd events actually attended if checked in, resolved SOS/safety reports) rather than raw post/comment counts |
| 10.2 | Public city-wide leaderboard incentivizes posting behavior that doesn't match community-safety intent (e.g., posting fake alerts to earn "Safety Star") | 🟠 | "Safety Star" and similar safety-linked badges should require some validation signal (e.g., alert confirmed by RWA/multiple neighbours) before awarding, not just raw alert-post count |

---

## 11. Platform / Infra Cross-Cutting

| # | Edge case | Sev | Handling |
|---|---|---|---|
| 11.1 | RLS misconfiguration accidentally leaks cross-neighbourhood data (the single most damaging bug class given the "verified circle" trust promise) | 🔴 | RLS policies need dedicated automated tests (not just manual QA) that assert cross-tenant isolation on every table before each release |
| 11.2 | Supabase Realtime connection limits hit during a viral moment (architecture.md §8 already flags this) | 🟠 | Have the Ably/Pusher migration path scoped and ready before it's urgently needed, not designed reactively during an outage |
| 11.3 | App store review rejects the Silent Phrase always-listening feature for policy violations (both Apple and Google have strict rules about background audio/microphone use) | 🔴 | Validate against current App Store/Play Store policy language *before* building, not after — this could block launch entirely if not scoped correctly upfront |
| 11.4 | Data localization/residency requirements for an India-focused app storing sensitive data (GPS history, liveness photos, SOS logs) | 🟠 | Already flagged in architecture.md §9 — confirm Supabase Mumbai region covers current legal requirements; revisit as India's data protection law (DPDP Act) rules firm up |
| 11.5 | Low-end Android devices (common in the target demographic) struggle with camera overlay rendering, background voice detection, or app performance generally | 🟡 | Performance-test on low/mid-range devices explicitly, not just flagship phones — this user base skews toward a wide device range, unlike a premium-only app |
| 11.6 | Poor network conditions (common in Indian residential areas, especially indoors/basements) degrade the core safety promise | 🟠 | Every safety-critical flow (SOS, verification) needs an explicit low-bandwidth/offline degradation path, tested under throttled conditions, not just happy-path Wi-Fi testing |

---

## 12. Priority Triage for MVP

Before shipping each module in the build order from architecture.md §10, resolve at minimum:

1. **Auth/Verification**: 1.1, 1.2, 1.9, 1.10 (identity integrity is foundational — everything else assumes this works)
2. **Feed**: 2.2, 2.3 (false alerts and doxxing are the two ways feed abuse becomes a safety incident)
3. **Circle Guard**: 3.1, 3.2, 3.4, 3.5, 3.13 (all 🔴 — this module has zero tolerance for "we'll fix it later")
4. **Genie**: 4.1 (grounding correctness is the whole value proposition)
5. **Chat**: 5.1 (do not ship a false encryption claim)
6. **Bazaar/Scenes/Pages/Ads** (post-MVP per problemstatement.md): 8.2 (fraudulent NGO donations) is the one item here that's still 🔴 and needs review-gating even in a later phase, not left to self-service.
