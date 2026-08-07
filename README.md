# Circle Up — Monorepo

Planning docs: [problemstatement.md](problemstatement.md) · [architecture.md](architecture.md) · [edgecase.md](edgecase.md) · [implementationplan.md](implementationplan.md)

## Structure

```
circles up/
  mobile/       React Native (Expo) app
  services/     NestJS custom backend services (Verification/SOS/Genie/Ads) — Phase 4
  supabase/     Postgres migrations, RLS policies — Phase 3
```

## Mobile app — status (Phase 1 & 2 of implementationplan.md Group A)

- Expo (bare-workflow-ready) + TypeScript scaffold, React Navigation skeleton wired: `Auth` stack (Splash/Login/Signup/Otp/Address/ProfileSetup) → `Main` tabs (Home/Explore/Chats/Search/Profile), plus a modal-group stack covering every other screen from the prototype (see `mobile/src/navigation/types.ts`).
- NativeWind (Tailwind for RN) configured with the brand color tokens ported from the prototype (`mobile/tailwind.config.js`).
- Design-system components ported 1:1 from the prototype: `CircleUpLogo`, `GradientButton`, `Avatar`, `HumanHeart`, `PremiumShareIcon` (`mobile/src/shared/components/`).
- Every screen is currently a `PlaceholderScreen` — they get replaced one at a time as their phase in implementationplan.md is implemented. Don't add new routes when building a screen; just swap the placeholder for the real component in `RootNavigator.tsx` / `AuthStack.tsx` / `MainTabs.tsx`.
- Sentry SDK is wired but **disabled** until a DSN is supplied via `EXPO_PUBLIC_SENTRY_DSN` (see Accounts below).
- EAS build profiles defined in `mobile/eas.json` (development/preview/production) — not yet linked to a real EAS project.

### Run it locally

```bash
cd mobile
npm run web      # fastest way to sanity-check UI changes in a browser
npm run android   # requires Android Studio/emulator or a device
npm run ios       # requires macOS + Xcode
```

A `.claude/launch.json` config named `circleup-mobile-web` exists in the Blinkit project directory (a harness quirk — the preview tool reads launch.json from the session's primary working directory) that runs `npm run web` from this project. If that ever breaks, run the command above directly and open `http://localhost:8081`.

## Auth & Verification — status (implementationplan.md Group B — complete, phases 7–21)

Every screen in `AuthStack` is real — no `PlaceholderScreen` left in the onboarding flow. Real Supabase Auth + a real NestJS orchestrator, verified end-to-end against a live local instance (not mocked) at every phase, including two genuine bugs found by that testing and fixed (an RLS self-reference infinite-recursion, and `service_role` missing table GRANTs despite bypassing RLS — see `supabase/migrations/`).

**Auth & routing:**
- **Splash → Login → Main/Address/ProfileSetup routing** (`RootNavigator.tsx`): checks session + `profiles.onboarding_completed` — no session → Splash; session but not onboarded → resumes at Address (skips Login/Signup); session + onboarded → Main tabs. `ProfileSetupScreen` flips `onboarding_completed` then calls `supabase.auth.refreshSession()` specifically to re-trigger this check (verified: a hidden, live-mounted `RootNavigator` really does flip to Main when this fires).
- **Login** (email or phone + password), **Signup** (Gmail-sheet UI / email+password / phone+OTP), **OTP verification** — real `supabase.auth.*` calls throughout. "Username" login is honestly rejected (no backing table) rather than silently no-op'd.
- **Age-gate** (edgecase.md §1.9): required 18+ checkbox blocks every signup method until checked.
- **Phone-recycling** (edgecase.md §1.10): OTP verification checks whether the number already has an onboarded account and says so honestly ("Welcome back!") instead of pretending a fresh identity was created. Documented limitation: Supabase ties identity to phone number permanently, so a telecom-recycled number handed to a genuinely different person is *not* technically distinguishable from a returning user at this layer — see the comment in `OtpScreen.tsx`.
- **Google sign-in** is a faithful UI port of the prototype's own simulated flow (the prototype never called a real Google API either) — a real identity needs an OAuth client, a Phase-6-style vendor decision not yet made.

**Verification pipeline (real neighbourhood data, real geofencing, real orchestration):**
- **`neighbourhoods` / `society_memberships`** tables (PostGIS `geo_boundary`, seeded with a real HSR Layout polygon) with RLS including the Phase 17 household-model exception (a verified flat-member can see other pending/verified claims on that same flat) — proven via a dedicated pgTAP suite alongside Phase 5's original harness.
- **`GpsCameraModal`**: real `expo-camera`/`expo-location` permission state machine, GPS-stamps captured photos via `react-native-view-shot` compositing. Gallery fallback flows through with a `source: 'gallery'` flag for downstream lower-trust handling. Live camera capture itself needs on-device testing (no camera hardware in this sandbox) — permission-denied/gallery-fallback paths are fully verified here.
- **Verification Orchestrator** (`services/verification`): `POST /verification/submit` runs, in order, mock-location check → gallery-source check → PostGIS geofence (`is_within_neighbourhood`, 500m tolerance) → liveness check, landing on `verified` or `pending` with a specific `review_reason`. All 5 branches curl-tested directly against a live Postgres instance.
- **Manual review queue** (Phase 18): `GET /verification/review/queue`, `POST .../approve`, `POST .../reject` — tested end-to-end (submit → queue → approve/reject → queue updates).
- **`AddressScreen`**: real neighbourhood search against the `neighbourhoods` table (no Google Places dependency), wired to the orchestrator above.
- **`ProfileSetupScreen`** / **`VibesPicker`**: name/bio/avatar (uploads to the `avatars` Storage bucket) + 200+-tag vibes picker (min 3, ported 1:1 from the prototype). Found and fixed a real stale-closure bug in the vibes toggle (rapid selections were clobbering each other instead of composing) — now uses a proper functional state update.

**Known web-preview-only quirks** (verified not to be real bugs — confirmed via DOM inspection, correct on the actual target platform):
- `GradientText`'s gradient mask (`@react-native-masked-view`) renders as plain colored text on web; full support on iOS/Android.
- RN's `<Modal>` (`GoogleAccountSheet`, `GpsCameraModal`) can render outside the visible coordinate space in `react-native-web`, breaking coordinate-based click automation — content/logic is correct (verified via DOM event dispatch), only on-screen position is off.
- Local Supabase gotcha: `supabase db reset` can leave Kong (API gateway) holding a stale upstream IP for the `auth` container, causing `502`s. Fix is `supabase stop && supabase start` (full stack recreate), not another `db reset`.
- Local Supabase gotcha #2: `supabase db reset` also **wipes Storage buckets to zero** — bucket creation only happens on `supabase start` against a fresh volume, not on every reset. If a bucket-dependent feature stops working after a `db reset`, run `supabase stop --no-backup && supabase start` instead.

## Core Feed — status (implementationplan.md Group C — complete, phases 22–33)

Every screen/component here is real and verified against a live local instance with actual create-post → feed → react → comment → moderate round-trips through the UI, not just unit-level checks.

**Feed data model** (`supabase/migrations/..._posts_reactions_comments.sql`, `..._moderation_and_rate_limits.sql`): `posts`/`reactions` (five-finger: like/notice/diss/engaged/out)/`comments`/`comment_likes`, all scoped by the same `is_verified_in_neighbourhood` pattern as Group B, plus `reports`/`hidden_posts`/`muted_users` for moderation and a `posts_alert_rate_limit` trigger (max 3 Alert posts/24h per author). `can_view_post`/`can_view_comment` SECURITY DEFINER helpers extend Group B's nested-RLS-avoidance pattern to reactions/comments.

**Screens/components:** `TopBar`, `BottomNav` (custom tab bar with the elevated gradient Chats pill), `StoriesBar`/`StoryViewer` (real `stories`/`story_views` tables, tap-to-advance + auto-advance timer), `PostCard` (category chip, reactions, new-neighbour badge), `ReactionPicker`, `CreatePostSheet` (real Storage upload via Phase 33's compression pipeline), `HomeFeed`, `PostDetailScreen` (comment thread + comment likes), `ModerationMenu` (Report with a distinct doxxing fast-track reason / Mute / Hide).

**Real bugs found and fixed by end-to-end testing** (not assumed correct from code review):
1. `profiles_select_own` (from Group B) only ever let a user read their own row — silently broke every author-info embed for anyone else's content. Fixed with a `profiles_select_same_neighbourhood` policy matching the actual "Circle nearby" trust model, itself needing a second SECURITY DEFINER fix once the naive version hit nested-RLS blocking its own internal `society_memberships` lookup.
2. PostgREST embed ambiguity (`PGRST201`): once `reactions`/`hidden_posts`/`comment_likes`/`story_views` all existed as competing many-to-many paths to `profiles`, every unqualified `author:profiles(...)` embed (stories, posts, comments) started 300-ing. Fixed with explicit `profiles!<fkey_name>` disambiguation in every embed query.
3. `story_views`/`comment_likes`/`hidden_posts`/`muted_users` upserts all 403'd — PostgREST's upsert is `INSERT ... ON CONFLICT DO UPDATE`, which needs `UPDATE` grant, not just `INSERT`. Same root cause hit four separate times before the pattern was internalized.
4. `StoryViewer`'s auto-advance timer silently never advanced — root cause was calling one state setter (`setIndex` via `advance()`) from inside another's (`setProgress`) functional-update callback. Rewritten to use a plain local `elapsed` counter instead of nested state-updater calls.

**Known limitation, not a bug:** `post-media` Storage bucket is **public** (unlike `verification-photos`/`chat-media`), a deliberate scope tradeoff — see the comment in `supabase/config.toml`. The architecturally-correct match for the "only verified neighbours see this" trust model is signed URLs gated by `posts` RLS; that's real added complexity out of Phase 33's stated scope. Revisit before a real launch.

## Chat — status (implementationplan.md Group D — complete, phases 34–41)

Real-time 1:1 chat over Supabase Realtime, verified end-to-end (login → open new chat → pick neighbour → send message → simulated server-side reply appears in the bubble list without a refresh).

**Schema** (`supabase/migrations/..._chats_and_messages.sql`): `chats` (1:1 or group), `chat_members`, `messages` (text/image/voice), `dm_blocks`, `dm_reports`. `is_chat_member` and `is_blocked_between` SECURITY DEFINER helpers were added upfront this time (not discovered mid-testing) — the block helper implements the edgecase.md §5.3 bidirectional-invisibility invariant (if A blocks B, B *also* stops seeing A, so B can't infer the block from asymmetry). RLS proven via a dedicated pgTAP suite (`chats_rls_test.sql` — 7 assertions including the bidirectional-block check).

**Screens/features:**
- `ChatsTab` — searchable DM + group list, sorted by newest activity, with DM display name derived from the other member.
- `NewChatScreen` — searchable picker over verified circle members (relies on Group C's `profiles_select_same_neighbourhood` policy, so results are automatically limited to your visible circle). Opens (or reuses) a DM via the `get_or_create_dm` RPC — an atomic transaction that avoids the race where two clients could each create a separate 1:1 chat with the same two members.
- `ChatDetailScreen` — real-time subscription (`postgres_changes` on `messages` filtered by `chat_id`), text + image + voice-note composer, simulated voice/video call overlay (Phase 38, honestly labeled), report/block header menu (Phase 40).
- `chat-media` Storage bucket stays **private** (unlike `post-media` — chats need real per-viewer isolation), rendered via short-lived signed URLs per message bubble.
- Phase 41: `lapsed_group_members` RPC lets group admins query which of their fellow members no longer holds any verified neighbourhood membership. Not a live push notification (out of scope), but the signal is captured for a real notification job to consume.

**Phase 39 — encryption honesty (edgecase.md §5.1 🔴):** the prototype's "end-to-end encrypted 🔒" footer is **deliberately not reproduced**. The current implementation is Supabase transport TLS + at-rest encryption, and the footer says exactly that: *"Encrypted in transit and at rest."* Real E2EE (Signal protocol, per-device keys, a security review) is a bigger deliberate build, not a copy-paste — noted for future work rather than silently pretended-into-existence.

## Supabase — status (Phase 3 of implementationplan.md Group A)

- `supabase/` holds migrations + config for local dev via the Supabase CLI (Docker-based) — no cloud account needed to develop against it.
- First migration (`supabase/migrations/..._enable_extensions.sql`) enables `postgis` (geospatial/radius queries), `vector` (pgvector, for Circle Genie's RAG search in Group G), and `pg_trgm` (fuzzy text search) — all verified installed against a real local Postgres instance.
- 4 storage buckets configured in `supabase/config.toml`: `avatars`/`post-media` (public), `verification-photos`/`chat-media` (private, per edgecase.md §1/§3.13 on sensitive-media handling). `post-media`'s public setting is a deliberate Phase 33 scope tradeoff, not the original plan — see the Core Feed section below.
- **The real cloud project (Mumbai region) still needs to be created by you** — see Accounts below. Everything here works identically once you `supabase link` to that project.

### Run it locally

```bash
npx supabase start   # boots local Postgres/Auth/Storage/Realtime/Studio via Docker (first run pulls ~2GB of images)
npx supabase stop    # shut it down when you're not actively developing
```

## RLS test harness — status (Phase 5 of implementationplan.md Group A)

`supabase/tests/rls_isolation_harness_test.sql` is a pgTAP test proving the pattern every future table's RLS policy must be tested against: two fake neighbourhoods, two fake users, assert cross-tenant reads return zero rows. It builds a throwaway demo schema entirely inside its own transaction (rolled back at the end — never touches the real app schema), so it works today even though the real `users`/`society_memberships`/`posts` tables don't exist yet (those land in Group B/C).

Verified both directions during Phase 5, not just the happy path: ran green (6/6) against a correct policy, then deliberately replaced the policy with `USING (true)` and confirmed exactly the 4 cross-tenant assertions failed red, then restored the correct policy and confirmed green again.

**When Group B/C/etc. add real tables:** copy this file's pattern for that table's RLS policy rather than writing ad-hoc tests — same shape (two fixtures, impersonate via `set_config('request.jwt.claims', ...)`, assert row counts). Two gotchas the harness already caught once, worth remembering: RLS filters rows but doesn't substitute for table-level `GRANT`s (a role with no grant sees zero rows regardless of policy), and objects created inside a `DO $$ ... $$` block run as the invoking role, not whichever role you `SET LOCAL ROLE` to afterward — grant explicitly.

```bash
npx supabase start
npx supabase test db   # runs every *_test.sql file in supabase/tests/
```

Wired into CI at `.github/workflows/supabase-ci.yml` — runs on every push touching `supabase/**`.

Studio (local dashboard) is at `http://127.0.0.1:54323` while running. Local dev keys are printed on `start` — they're the standard Supabase CLI demo keys, identical across every local project, safe to have in shell history.

## Backend services — status (Phase 4 of implementationplan.md Group A)

`services/` is an npm-workspaces monorepo with 5 independent NestJS apps, one per architecture.md custom service — each currently an empty skeleton with just a `/health` endpoint, proving it builds/boots/is CI-wired before any real logic lands in its phase:

| Service | Port | Real logic lands in |
|---|---|---|
| `verification` | 4001 | Group B (Phases 13–15: liveness orchestration, GPS-spoofing detection) |
| `sos` | 4002 | Group E (Phases 44–47: SOS dispatch, fan-out, audit logging) |
| `genie` | 4003 | Group G (Phases 65–68: RAG search, grounding guardrails) |
| `ads` | 4004 | Group I (Phases 83–84: geospatial ad targeting) |
| `compliance` | 4005 | Group I (Phases 79–80: GST/Darpan validation, donation receipts) |

```bash
cd services
npm install
npm run build --workspaces      # builds all 5
npm --workspace verification run start   # run one service, e.g. verification on :4001
```

## Vendor selection — status (Phase 6 of implementationplan.md Group A)

The actual vendor decision (liveness/KYC provider, SMS gateway) is yours to make — it involves real contracts and payment info I can't act on. My recommendation, documented here so it isn't lost: **HyperVerge** for liveness (self-serve, India-focused, no enterprise sales cycle) and **MSG91** for SMS (handles India's DLT compliance for you).

Until that's decided, both `verification` and `sos` have a **dummy provider wired in behind an interface**, so the rest of each service can be built without waiting on the decision:

- `services/verification/src/liveness/` — `LivenessProvider` interface + `MockLivenessProvider`, exposed at `POST /liveness/check`. Passes unless `selfieImageBase64` is the literal string `FORCE_FAIL` (lets you test both branches without a real vendor).
- `services/sos/src/sms/` — `SmsGateway` interface + `MockSmsProvider`, exposed at `POST /sms/send`. Validates E.164 phone format and logs instead of sending.

**Swapping in the real vendor later is a one-line change** in `liveness.module.ts` / `sms.module.ts` (`useClass: MockLivenessProvider` → your real provider class implementing the same interface) — nothing else in either service, or any future caller, needs to change. When you're ready to decide, tell me and I'll wire the real SDK + API key config in.

## Accounts you need to create (not something I can do on your behalf)

These are required before later phases can be verified end-to-end — flagged now so they're not a surprise mid-phase:

| Service | Needed for | When |
|---|---|---|
| **Expo/EAS account** (expo.dev) | Real device builds, OTA updates | Before Phase 1's CI can produce installable builds — run `eas login` then `eas build:configure` inside `mobile/` to replace the placeholder `projectId` in `app.json` |
| **Sentry account** (sentry.io) | Crash/error reporting | Anytime — create a React Native project, put the DSN in `mobile/.env` as `EXPO_PUBLIC_SENTRY_DSN` |
| **Supabase account** (supabase.com) | Postgres/Auth/Storage/Realtime backend | Local dev already works without this (see Supabase section above). Create a cloud project in the **Mumbai (ap-south-1)** region per architecture.md §9 whenever you're ready to deploy — then `npx supabase link` |
| **Liveness/KYC vendor** (e.g. AWS Rekognition, IDfy, Signzy) | Phase 1's Phase 6 (vendor selection) and Group B verification | Needs a decision — see implementationplan.md Phase 6 |
| **SMS gateway** (e.g. Twilio, MSG91, Gupshup) | OTP + SOS dispatch | Same — Phase 6 |
| **Google Maps Platform** | Address autosuggest, geocoding | Group B (Phase 16, Address Screen) |
| **Razorpay** | Donations | Group I (Phase 80) |

None of these are set up yet — that's expected at this stage. Phase 6 (next up in Group A) is specifically about deciding the liveness/SMS vendors; the others get created just-in-time in their respective phase.
