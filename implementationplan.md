# Circle Up — Implementation Plan (Granular, One Feature per Phase)

> Builds on [problemstatement.md](problemstatement.md), [architecture.md](architecture.md), and [edgecase.md](edgecase.md).
> This replaces the earlier 10-macro-phase plan with **100 single-feature phases**, grouped under the same 10 macro areas (A–K) for readability. Each phase = one shippable, testable unit of work — one screen, one backend service, or one hardening pass. Ship phases in order within a group; groups can parallelize across a mobile/backend split once Group A is done (see §Sequencing at the end).

**Columns:** `Depends On` = phase #s that must be done first. `Edge Cases` = item #s from edgecase.md this phase must close (🔴/🟠 severity noted; 🟡/⚪ can trail). `Est.` = rough solo-engineer effort (S = 1–3 days, M = 4–6 days, L = 1–2 weeks).

---

## Group A — Foundations (Phases 1–6)

No user-facing output. Everything downstream depends on this being right.

| # | Feature | Depends On | Deliverable | Edge Cases | Est. |
|---|---|---|---|---|---|
| 1 | Repo, Mobile App Scaffold & CI/CD | — | Expo bare workflow RN repo, NativeWind, React Navigation skeleton (`AuthStack`/`MainTabs`/modals), EAS Build pipeline, Sentry wired | — | M |
| 2 | Design System Port | 1 | `CircleUpLogo`, `GradientButton`, `Avatar`, `HumanHeart`, `PremiumShareIcon`, brand color tokens ported 1:1 from prototype | — | S |
| 3 | Supabase Backend Setup | — | Postgres project (Mumbai region), PostGIS + pgvector extensions, Storage buckets, migration tooling | 11.4 | M |
| 4 | Custom Services Scaffold | 3 | NestJS repo/monorepo with empty Verification/SOS/Genie/Ads/Compliance service skeletons + health checks + CI | — | M |
| 5 | RLS Automated Test Harness | 3 | Test suite pattern: "two fake neighbourhoods, assert cross-tenant read fails" — runs in CI, proven to catch intentionally-broken policies | 11.1 (infra) | M |
| 6 | Vendor Selection (Liveness KYC + SMS Gateway) | — | Decision + contract/API access secured for liveness vendor and SMS gateway (no integration yet) | — | S (decision, not build) |

**Group A Definition of Done:** empty app builds on a real device; RLS harness fails a deliberately-broken policy in CI; vendor access secured.

---

## Group B — Auth & Verification (Phases 7–21)

The hard trust gate. Per architecture.md principle #1, nothing else works if this is weak.

| # | Feature | Depends On | Deliverable | Edge Cases | Est. |
|---|---|---|---|---|---|
| 7 | Splash Screen | 2 | Logo + tagline, 2.2s auto-advance | — | S |
| 8 | Phone/Login Screen | 2, 3 | Multi-method login (phone/username/email + password), Supabase Auth wiring | — | M |
| 9 | Google OAuth Sheet | 8 | Faithful Google account-picker sheet, real OAuth flow via Supabase | — | M |
| 10 | Signup Screen | 8, 9 | Method picker (Gmail/Email/Phone) + inline email and phone sub-forms with validation | 1.9 (age-gate UI), 1.10 (recycled-number check hook) | M |
| 11 | OTP Screen | 10 | 4-digit auto-focus/auto-advance OTP, real SMS OTP via gateway | — | S |
| 12 | GPS Camera Modal | 2 | Live camera capture, permission state machine, client-side GPS+timestamp canvas overlay, gallery fallback | 1.8 (flag gallery fallback as lower-trust) | L |
| 13 | Verification Orchestrator Service | 4, 6 | Backend service: receives selfie+GPS, orchestrates liveness API call, geofences against society boundary | 1.1 (tolerance radius), 1.3 (queue on vendor outage) | L |
| 14 | Liveness/Face Verification Integration | 13, 6 | Real liveness vendor API wired server-side; never trust client-reported verified status | 1.4 (manual-review fallback on repeated fail) | M |
| 15 | Mock-Location / GPS-Spoofing Detection | 13 | Android `isFromMockProvider` check + WiFi/cell cross-check; flags mismatches to review queue | 1.2 🔴 | M |
| 16 | Address Screen | 12, 13, 14, 15 | Address autosuggest (Google Places) → selfie capture → verification status UI, gated `allDone` continue | 1.11 (tower/flat fallback) | L |
| 17 | Household Model | 13 | Multiple verified members per flat; existing members notified when someone new claims their flat | 1.5 | M |
| 18 | Manual Review Queue | 13, 14, 15 | Internal admin tool: queue of failed/flagged verifications, approve/reject | 1.4, 1.2 (review path) | M |
| 19 | Profile Setup Screen | 16 | Name, bio, profile photo via camera modal | — | S |
| 20 | Vibes Picker | 19 | 200+ tags across 9 categories, min-3 no-max selection, ported from prototype's `vibeCategories` | — | S |
| 21 | Age-Gate & Phone-Recycling Protection | 10, 13 | Self-declared 18+ gate at signup; new signup on reused number gets zero inherited trust/circles/SOS contacts | 1.9 🔴, 1.10 | S |

**Group B Definition of Done:** real user completes signup→verified→empty feed in <2 min on iOS and Android; adversarial spoofed-GPS test routes to review, never silently passes; 20+ real signups across device tiers logged; RLS passes on `users`/`society_memberships`/`neighbourhoods`.

---

## Group C — Core Feed (Phases 22–33)

| # | Feature | Depends On | Deliverable | Edge Cases | Est. |
|---|---|---|---|---|---|
| 22 | Top Bar | 2 | Wordmark, create button, SOS button, notification bell | — | S |
| 23 | Bottom Nav | 2 | Home/Explore/Chats(center pill)/Search/Profile tabs | — | S |
| 24 | Stories Bar | 2 | Circular story rings, viewed/unviewed state | — | S |
| 25 | Story Viewer | 24 | Multi-segment tap-to-advance viewer, progress bars, reply bar | — | M |
| 26 | Post Card Component | 2 | Category chip, media, like/comment/share/save, "more" menu shell | — | M |
| 27 | Five-Finger Reaction Picker | 26 | Long-press floating tray (Like/Notice/Diss/Engaged/Out), server-side debounce | 2.7 | M |
| 28 | Create Post Sheet | 22, Group B | Category picker (Alert/Buy-Sell/Recommend/Event/Lost&Found/General) + caption + photo/camera/location attach | — | M |
| 29 | Home Feed | 26, 28, 3, 5 | Feed query scoped to verified `neighbourhood_id` via RLS | — | M |
| 30 | Post Detail Screen | 26 | Full comment thread, reply-to, comment likes | — | M |
| 31 | Moderation Actions | 26, 30 | Report/Mute/Hide/"Why am I seeing this" + **fast-track doxxing/harassment report path**, separate priority queue | 2.3 🔴 | M |
| 32 | Alert Rate-Limiting & New-Account Flagging | 28, 29, 21 | Per-user/day Alert-category rate limit; recently-verified accounts flagged on Alert posts | 2.1, 2.2 | M |
| 33 | Media Upload Pipeline | 12, 28 | Client-side compression, server-side size/type validation on all post/story media | 2.8 | M |

**Group C Definition of Done:** internal beta posts/reacts daily for 2 weeks, zero RLS leaks, zero unmoderated harassment incident, doxxing reports triaged within a defined SLA.

*Deferred into this group but implemented later:* 2.5 (Genie embedding delete-cascade) ships in Group G; 2.6 (post fate on move-out) needs a product decision before Group C exits beta.

---

## Group D — Chat (Phases 34–41)

| # | Feature | Depends On | Deliverable | Edge Cases | Est. |
|---|---|---|---|---|---|
| 34 | Chats Tab | 2, 3 | Searchable DM + group chat list | — | M |
| 35 | New Chat Sheet | 34, Group B | Searchable new-DM picker over verified users | — | S |
| 36 | Chat Detail Screen (text) | 34 | 1:1/group text messaging via Supabase Realtime | — | L |
| 37 | Voice Notes & Media Attachments | 36, 33 | Voice-note recording/playback, camera/gallery attach in chat | 5.4 (retention policy documented) | M |
| 38 | Voice/Video Call UI (simulated) | 36 | Simulated ringing/call overlay (real calling infra is a later/optional upgrade) | — | M |
| 39 | Encryption Decision & Implementation | 36 | Either real E2EE (Signal protocol lib) or corrected "encrypted in transit/at rest" copy — **decide before shipping any chat copy claiming encryption** | 5.1 🔴 | L (if real E2EE) / S (if copy fix) |
| 40 | DM Report/Block Flow | 36 | Immediate, bidirectionally-invisible block; independent report reason set from feed moderation | 5.3 | M |
| 41 | Group Membership & Verification-Lapse Handling | 36, Group B | Flag/notify group admins when a member's verification lapses | 5.2 | S |

**Group D Definition of Done:** Realtime delivery tested under throttled network (11.6); encryption copy verified to match actual implementation; block flow confirmed to give blocked user no error hint.

---

## Group E — Circle Guard / SOS (Phases 42–56)

Highest-stakes group. Every 🔴 item here blocks phase completion — no "fix later."

| # | Feature | Depends On | Deliverable | Edge Cases | Est. |
|---|---|---|---|---|---|
| 42 | Guard Screen | 22, Group B | Entry screen: SOS button + 4 quick-action tiles + safety alert feed shell | — | S |
| 43 | SOS Button + Countdown | 42 | 5s cancelable countdown before dispatch fires | 3.3 (log false-trigger rate) | M |
| 44 | SOS Dispatch Service | 4, 43 | Backend: parallel fan-out logic to police/emergency/helpline/trusted contacts/nearby neighbours | 3.1 🔴 (native `tel:`/`sms:` primary path, no-data-required) | L |
| 45 | SMS Gateway Integration + Fan-out | 44, 6 | Real SMS gateway wired for trusted-contact/neighbour fan-out (helpline numbers use native deep link, not gateway) | 3.2 🔴 | M |
| 46 | SOS Active Overlay | 43, 44 | Live tracking UI: real `navigator.geolocation`, elapsed timer, dispatch status per recipient | 3.8 (best-available location, don't block on perfect fix) | L |
| 47 | SOS Event Logging & Audit Trail | 44 | `sos_events`/`sos_dispatch_log` tables, every dispatch attempt + delivery status recorded | 3.9, 3.13 🔴 (retention policy hook) | M |
| 48 | Critical-Alert Notification Channel | 46 | iOS/Android critical-alert push channel that bypasses DND for neighbour SOS notifications | 3.6 | M |
| 49 | Accidental-Trigger Monitoring | 43 | Log cancel-rate per user; surface sensitivity-adjustment prompt after repeated false triggers | 3.3, 3.10 (pattern detection) | S |
| 50 | Trusted Contacts Screen | 42, Group B | Up to 5 contacts, staleness prompt (re-confirm every 3 months) | 3.7 | S |
| 51 | Share Location Screen | 42 | Timed live-location sharing (15/30/60/120 min) with **hard-enforced** auto-stop | 3.12 | M |
| 52 | Fake Call Screen | 42 | Simulated incoming call ("Mom"), user-triggered only, clear "End Fake Call" UI distinct from real call UI | 3.11 | S |
| 53 | Silent Phrase — iOS Feasibility Spike | — (research, run before 54) | Technical spike: confirm what iOS background-mic access actually allows; decision doc | 3.5 🔴 (blocks phase completion, gate not a task) | M (research) |
| 54 | Silent Phrase Screen & Voice Trigger | 53, 42 | On-device-only keyword spotting (e.g., Picovoice Porcupine); default phrase changed from "order kar do" to a low-false-positive default; measured false-positive rate before default-enable | 3.4 🔴, 3.5 🔴 | L |
| 55 | Safety Alerts Feed | 42, Group C | Society/police severity-tagged broadcast alert feed on Guard screen | — | M |
| 56 | Legal Review & Data Retention Policy | 47 | Documented SOS liability/SLA language, law-enforcement data-request policy — **sign-off required before public (non-internal) launch of this group** | 3.13 🔴 | Process, not code |

**Group E Definition of Done:** end-to-end SOS drill tested airplane-mode-except-SMS, low battery, indoors; Silent Phrase false-positive rate measured empirically below agreed threshold before default-enabling; every test dispatch logged with delivery status; legal sign-off obtained; App Store/Play Store mic-policy compliance validated (11.3) before submission.

**Recommendation:** ship phases 42–52 (core SOS + Trusted Contacts + Share Location + Fake Call) as **Guard v1**, gate 53–54 (Silent Phrase) behind a separate release once the spike and false-positive measurement are complete.

---

## Group F — Explore / Discovery (Phases 57–64)

| # | Feature | Depends On | Deliverable | Edge Cases | Est. |
|---|---|---|---|---|---|
| 57 | Explore Tab Shell | 23, Group B | Search bar + filters UI, 4 feature-card entry points (Bazaar/Scenes/Genie/Guard) | — | M |
| 58 | Circle Card Component | 57 | Person card: avatar, distance, tower, mutuals, "Add to Circle" CTA | — | S |
| 59 | Two-Tier Discovery Query | 57, 58, 3 | "Circle nearby" (same-society, verified) vs "From your city" (interest-matched, radius) query logic in Postgres/PostGIS | — | M |
| 60 | User Profile Screen | 58 | View another neighbour's profile, Add to Circle/Message, mutual-circle chips | — | M |
| 61 | Neighbourhood Sheet | 59, Group B | Switch between multiple verified neighbourhoods; "add new" triggers re-verification | 9.4 (fresh liveness capture required) | M |
| 62 | Global Block-List Enforcement | 40, 59 | Block list enforced across ALL discovery/feed surfaces, not per-neighbourhood | 9.2 🟠 | M |
| 63 | Post-to-Neighbourhood Scoping Fix | 61, 29 | Every post explicitly tagged to one `neighbourhood_id` at creation based on active context — no dual-scoping ambiguity | 9.1 🟠 | S |
| 64 | Topic Screen | 57, 29 | Trending-hashtag-style aggregation view (Top/Recent/People tabs) | — | M |

**Group F Definition of Done:** neighbourhood-switch correctly re-scopes new posts/feed/discovery, verified via automated tests; block enforcement verified cross-neighbourhood.

---

## Group G — Circle Genie (Phases 65–69)

Sequenced after Group C has real usage — RAG search needs post volume to be useful.

| # | Feature | Depends On | Deliverable | Edge Cases | Est. |
|---|---|---|---|---|---|
| 65 | Embedding Pipeline | 3, 29 | pgvector embedding job for posts/comments, scoped per neighbourhood, **with delete-listener** | 2.5 (delete-cascade, closed here) | M |
| 66 | Genie RAG Search Service | 4, 65 | Backend: vector similarity retrieval + LLM synthesis, scoped to `neighbourhood_id` | — | L |
| 67 | Genie Screen | 66 | Suggested prompts, results with avatars of neighbours who mentioned, mention counts | 4.3 (recency display) | M |
| 68 | Grounding/Hallucination Guardrails | 66 | Strict "answer only from sources" prompting + post-hoc check rejecting unfounded answers; prompt-injection hardening (retrieved posts treated as data, not instructions) | 4.1 🔴, 4.5 | M |
| 69 | Query Caching & Cost Control | 66 | Cache common per-neighbourhood queries; phone-number redaction/link-back in synthesized answers; cold-start fallback copy | 4.2, 4.4, 4.6 | S |

**Group G Definition of Done:** grounding false-positive/negative rate measured on a test query set before public rollout; cost-per-query projected against expected volume.

---

## Group H — Bazaar & Scenes (Phases 70–75)

Do not start before Groups A–G are stable in production (per problemstatement.md's explicit v1/v2 scope split).

| # | Feature | Depends On | Deliverable | Edge Cases | Est. |
|---|---|---|---|---|---|
| 70 | Bazaar Screen | 57 | Categorized listing UI (Furniture/Electronics/Books/Clothing/Free) | — | M |
| 71 | Bazaar Backend | 70, 3 | CRUD, stale-listing auto-flagging, prohibited-item keyword/category filter (legal-reviewed list) | 6.3 🔴, 6.1 | M |
| 72 | Scenes Screen | 57 | Events list (Upcoming/This week/Hosting), RSVP (Going/Maybe) with waitlist-on-cap | 7.1 | M |
| 73 | Create Event Screen | 72 | Event type/date/time/location/description, privacy tiers (verified/close-friends/open), guest limit | 7.2 (open-invite host warning) | M |
| 74 | My Events Screen | 72 | Upcoming/past events, host badge | — | S |
| 75 | Event Cancellation Flow | 73 | Cancellation push-notifies 100% of RSVP'd users | 7.3 | S |

**Group H Definition of Done:** prohibited-items filter tested against legal-reviewed banned list; cancellation notifies all RSVPs in test event; ToS copy states Bazaar is listing-only, no escrow (6.2), "verified neighbour" language audited to never imply "trustworthy seller" (6.4).

---

## Group I — Pages, Ads & Monetization (Phases 76–84)

Highest financial/compliance scrutiny alongside Group E.

| # | Feature | Depends On | Deliverable | Edge Cases | Est. |
|---|---|---|---|---|---|
| 76 | Page Type Selector Screen | 57, Group B | Entry chooser for Personal/Business/NGO page types | — | S |
| 77 | Create Page Screen | 76 | 3 variants with type-specific fields (Profession / **GST number** / **Darpan ID**), all compliance fields labeled "self-declared, verification pending" | 8.1 | L |
| 78 | My Pages Screen | 77 | Page stats, Manage/Insights/Promote actions | — | M |
| 79 | NGO Donation Approval Workflow | 77 | **Manual review/approval required before any NGO page can accept donations — no self-service enablement** | 8.2 🔴 | M (+ process/staffing) |
| 80 | Razorpay Integration + Receipt Generation | 79 | Razorpay Checkout (PCI scope stays with Razorpay); receipt generation as reliable async job with retries, decoupled from payment-success response | 8.6 | M |
| 81 | Ads Manager Screen | 78 | Campaign dashboard: spend/reach/clicks/CTR, pause/resume | — | M |
| 82 | Create Ad Screen | 81 | 5-step wizard: Objective → Audience → Budget → Creative → Review | — | L |
| 83 | Ads Targeting Service | 4, 82, 3 | Backend: geospatial targeting query, budget-pacing with **hard check at serve-time**, neighbourhood-size-scaled concurrent-ad cap | 8.3, 8.7 | L |
| 84 | Ad Review/Approval Workflow | 83 | Manual/lightweight ad review before an ad goes live (elevated trust given "neighbourhood ad" framing); page address geocoding validation | 8.4, 8.5 | M (+ process/staffing) |

**Group I Definition of Done:** test NGO page submission blocked from donations until approved; simulated payment-success/receipt-failure recovers via retry; ad serve-time budget check stops serving within one request of exhaustion; ad review process staffed and live before real ad serving is enabled.

---

## Group J — Profile, Settings & Retention (Phases 85–93)

Core parts of this group (85–88, 93) belong in MVP; gamification/sharing polish (89–92) can trail.

| # | Feature | Depends On | Deliverable | Edge Cases | Est. |
|---|---|---|---|---|---|
| 85 | Profile Tab | 23, Group B | Stats (Posts/Vibes/Streak), vibe pills, post grid | — | M |
| 86 | Edit Profile Screen | 85 | Name/username/pronouns/link/bio, vibes re-selection, private info fields | — | M |
| 87 | Settings Screen | 22 | Sectioned settings: Community, Grow & promote, Account, Privacy & safety, Notifications, Preferences | — | M |
| 88 | Settings Detail Screen | 87 | Generic renderer for Verification/Neighbourhood/Saved/Blocked/Close friends/Language/Terms/Privacy/Help/Delete | — | M |
| 89 | Achievements Screen + Points Backend | 85, Group C, E | Points, city rank, badges — triggers weighted toward hard-to-fake signals (verified transactions, confirmed attendance, validated safety reports) | 10.1, 10.2 🟠 (Safety Star requires validation signal, not raw post count) | M |
| 90 | Share Profile Sheet | 85 | QR-style profile share, copy link, social share row | — | S |
| 91 | Account Switcher Sheet | 87 | Multi-account switching (personal + business) | — | S |
| 92 | Profile Menu Sheet | 22 | Post/Story/Highlight/Live creation picker | — | S |
| 93 | Notifications Screen | 22, Group C | Grouped Today/Yesterday/This Week, filters, "+ Circle back" follow-back action | — | M |

**Group J Definition of Done:** points-farming adversarial test confirms weighted achievement triggers resist spam (10.1); Settings→Detail navigation covers every entry with no dead links.

---

## Group K — Hardening, Scale Prep & Public Launch (Phases 94–100)

Cross-cutting; gates real public launch regardless of which feature groups shipped.

| # | Feature | Depends On | Deliverable | Edge Cases | Est. |
|---|---|---|---|---|---|
| 94 | RLS Full Isolation Sweep | 5, all data-model phases | Every table re-run through the Group A test harness, not just incrementally | 11.1 (final closure) | M |
| 95 | Realtime Scale/Load Testing | 36, 46 | Load-test Supabase Realtime connection limits; Ably/Pusher migration path scoped (not necessarily executed) | 11.2 | M |
| 96 | Low-End Device Performance Testing | all mobile phases | Performance sweep on low/mid-range Android specifically | 11.5 | M |
| 97 | Network-Degradation Testing | Group E, Group B | Throttled/offline testing of every safety-critical flow: SOS, verification | 11.6 | M |
| 98 | Data Residency/Compliance Final Check | 3 | Confirm Supabase Mumbai region + DPDP Act alignment | 11.4 | S (+ legal) |
| 99 | App Store Submission Prep | 54, all | Silent Phrase mic-policy compliance pre-validated (not discovered at review); full store listing prep | 11.3 🔴 | M |
| 100 | Incident-Response Runbook + Game Day Drill | 94–99 | Documented runbooks for RLS leak, SOS dispatch failure, payment failure; one live drill executed | — | M |

**Group K Definition of Done:** public launch checklist fully green; at least one full incident-response game day completed.

---

## Sequencing & Parallelization

- **Groups A → B are strictly sequential** — everything depends on auth/verification being solid.
- Once Group B is done, split into two parallel tracks:
  - **Track Mobile-heavy:** C (Feed) → F (Explore) → H (Bazaar/Scenes) → J (Profile/Settings)
  - **Track Backend/Safety-heavy:** E (Guard) → G (Genie) → I (Ads/Compliance)
  - D (Chat) can start alongside C once its Realtime dependency (Supabase, Group A) is ready.
- **K (Hardening) is not a single phase at the end** — 94/96/97 should run incrementally after each group, not saved entirely for the finish line; only the *final sweep* and game day (100) need to wait for everything else.

## MVP Cut (recommended)

Ship **Groups A, B, C, D, E (phases 42–52 only, defer Silent Phrase), F, G, and J phases 85–88/93** as the v1 public launch — this matches problemstatement.md §7's explicit scope note that Bazaar/Scenes/Pages/Ads/Gamification were already out of scope for v1. That's **~78 of the 100 phases** for a meaningful, safety-differentiated MVP; the remaining ~22 phases (Silent Phrase, Bazaar, Scenes, Pages, Ads, Achievements/sharing polish) become the v2 monetization + retention release.
