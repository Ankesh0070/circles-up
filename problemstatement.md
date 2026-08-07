# Circle Up — Problem Statement

> **Tagline:** *"Aage badh, apni circle ke saath"* — Move forward, with your circle.
> Derived from: `CircleUp_main_prototype (2).jsx` (7,180-line React prototype, HSR Layout, Bengaluru).

---

## 1. The Problem

India's residential societies, apartment complexes, and gated neighbourhoods are dense, information-rich communities that today have **no dedicated, trustworthy digital layer**. What exists instead is a patchwork of broken tools:

| Need | What people use today | Why it fails |
|---|---|---|
| "Who's a good plumber/doctor near me?" | WhatsApp broadcast groups | Recommendations get buried in noise within hours; no way to search past answers |
| Building/society announcements | RWA WhatsApp groups, printed notices | No structure, no read receipts, spam mixed with emergencies |
| Personal safety (harassment, medical emergency, feeling unsafe) | Calling family, generic police helplines | No fast, silent, location-aware way to alert neighbours *and* authorities at once |
| Buying/selling locally (moving out, decluttering) | OLX, Facebook Marketplace, WhatsApp | Strangers outside the building — no trust, no verified seller identity |
| Meeting people who live nearby with similar interests | Nothing structured exists | Instagram/Facebook are global graphs, not local ones — you can't discover "the 5 nearest neighbours who also like badminton" |
| Local businesses reaching residents | Pamphlets, generic Google/Meta ads | No way to target *just this society or a 2km radius* affordably |
| Verifying someone is actually a neighbour, not a stranger | Nothing — Nextdoor-style apps rely on self-declared addresses | Fake profiles, outsiders, no liveness/location proof |

**Core gap:** every existing social platform (Instagram, Facebook, WhatsApp) optimizes for a *global* social graph. Every existing hyperlocal attempt (Nextdoor, RWA WhatsApp groups) has **no real identity verification**, **no safety infrastructure**, and **no monetization path for local commerce**. Nobody has combined *verified proximity* + *safety* + *hyperlocal discovery* + *local commerce* into one trusted product.

---

## 2. Who This Is For

- **Residents of gated societies / apartment complexes / gated layouts** in Indian metros (prototype is seeded with Bengaluru's HSR Layout — Brigade Meadows, Sobha Aspire) who want to know their neighbours, get real recommendations, and feel safe.
- **RWA (Resident Welfare Association) office-bearers** who need a structured way to broadcast alerts and organize events instead of unmanageable WhatsApp groups.
- **Local businesses & service providers** (chai stalls, plumbers, pediatricians, gyms) who want affordable, hyperlocal-targeted advertising instead of city-wide ad spend.
- **NGOs / community causes** operating locally who need a verified, low-friction donation channel with legal compliance (80G receipts, Darpan ID).
- **Anyone who has ever felt unsafe** and needed a fast, silent, multi-channel way to alert both authorities and nearby real people — not just one emergency contact.

---

## 3. What Circle Up Is

Circle Up is a **hyperlocal, identity-verified social network scoped to a residential neighbourhood** — a "circle" of real neighbours, structurally separated from the anonymous, global internet. Every meaningful feature (feed, discovery, safety, commerce, ads) is filtered through **verified physical proximity**: same building, same tower, same society, or same city — never an anonymous global graph.

It is not an Instagram clone with a location filter bolted on. Identity verification, safety infrastructure, and hyperlocal commerce are first-class, not afterthoughts.

---

## 4. Core Differentiators (what makes this novel, not a Nextdoor/Instagram clone)

1. **Hard identity gate at signup, not a soft trust badge.**
   Onboarding requires: address/society entry → **GPS-stamped, liveness-checked selfie** (camera captures a photo with lat/lng, accuracy, and timestamp burned into the image like a proof-of-presence document) → simulated AI verification (face/liveness/quality/location checks). You cannot use the app without passing this. Login (returning users) skips this; only fresh signup runs the full gauntlet.

2. **Structured Society → Tower → Flat identity**, not free-text location.
   Every profile carries `society`, `tower`, `flat`, and `distance` as real fields — enabling **concentric trust radius discovery**: "Circle nearby" (verified same-society, blue-check badge) is structurally separate from "From your city" (shared interests, farther away) in the Explore tab.

3. **Circle Genie — hyperlocal AI recommendation search.**
   Ask "best plumber near me?" and get answers aggregated from what verified neighbours have actually posted, shown with avatars of the neighbours who mentioned it and a mention-count — social proof from people who live in your building, not anonymous internet strangers.

4. **Circle Guard — a real personal-safety stack**, not a panic button:
   - **Countdown-triggered multi-channel SOS**: alerts Police (100), unified emergency (112), Women's Helpline (1091), up to 3 trusted contacts, and the 5 nearest neighbours — simultaneously, with live GPS.
   - **Silent Phrase**: a configurable voice trigger (default "order kar do") that fires SOS silently, without touching the screen — designed for situations where visibly reaching for a phone is dangerous.
   - **Fake incoming call**: a believable simulated call ("Mom" calling) to give someone a plausible reason to leave an uncomfortable situation.
   - **Timed live-location sharing** (15/30/60/120 min) with trusted contacts.
   - A live, severity-tagged **safety alert feed** from the society/police.

5. **Five-finger reaction system** (👍 Like · 👆 Notice · 🖕 Diss · 💍 Engaged · 🤙 I'm out) instead of Facebook's Like/Love/Haha — more expressive, more culturally specific gestures. Paired with a custom **anatomical heart icon** (not a flat glyph) that reveals on like — a deliberate signature brand moment.

6. **Multi-neighbourhood membership with per-neighbourhood re-verification.**
   Someone who owns two homes or has moved can belong to more than one verified neighbourhood, but each one requires its own gate-photo + address proof — unlike single-address models (Nextdoor).

7. **Local commerce & ads built for residents, not businesses-only.**
   - **Circle Bazaar**: categorized buy/sell/free marketplace, seller identity tied to verified profile, distance shown.
   - **Circle Scenes**: event hosting with privacy tiers (verified neighbours / close friends / open invite) and guest caps.
   - **Pages with India-specific compliance fields**: Business pages require a **GST number**; NGO/Cause pages require a **Darpan/registration ID** and support **0%-fee in-app donations with 80G receipt language**.
   - **A Meta Ads Manager-style, 5-step ad wizard** (objective → audience → budget → creative → review) available to *any verified resident*, not a separate business portal — with copy explicitly pitching neighbourhood-targeted ads as **3.2× higher engagement** than city-wide ads. This positions Circle Up as hyperlocal commerce infrastructure, not just a feed.

8. **Prosocial gamification.**
   Achievements are tied to real community behavior — Local Guide, Safety Star (verified alerts), Bazaar Pro (completed deals), Event Maven (hosting), Connector (introductions) — not generic app-usage streaks, plus a city-wide leaderboard/rank.

9. **Graduated trust model.**
   Higher-stakes actions (event RSVP, running ad campaigns, accepting donations) are explicitly gated behind additional verification beyond basic signup.

---

## 5. Product Scope (from the prototype)

### Navigation
5-tab bottom nav: **Home (feed) · Explore/Compass · Chats (center, elevated) · Search · Profile.** Post creation lives in the top bar and profile menu, not the bottom nav.

### Feature Modules
- **Feed**: categorized posts — Alert, Buy/Sell, Recommend, Event, Lost & Found, General — with long-press 5-finger reactions, comments, share sheet, and per-post moderation (Report/Mute/Hide/"Why am I seeing this?").
- **Stories**: 24h-style circular rings, multi-segment viewer.
- **Chats**: 1:1 + group messaging, simulated voice/video calls, voice notes, "end-to-end encrypted" messaging.
- **Circle Genie**: AI hyperlocal recommendation search.
- **Circle Guard**: full safety stack (see above).
- **Circle Bazaar**: local marketplace.
- **Circle Scenes**: event hosting/RSVP.
- **Pages**: Personal / Business / NGO, each with type-specific fields.
- **Ads Manager**: campaign dashboard + creation wizard.
- **Achievements**: points, badges, city rank.
- **Vibes**: 200+ interest tags across 9 categories (Food & Drink, Hobbies, Lifestyle, Fitness, Mind & Soul, Community, Work & Hustle, Family & Home, Travel & Outdoors), minimum 3 required at onboarding — powers both profile display and ad audience targeting.
- **Multi-neighbourhood switching** with per-neighbourhood re-verification.

### Design System
- Sky-blue brand identity (`#2196D6` primary, gradient `#4FB5E8 → #2196D6 → #1976C2`), warm ink text, cream background, sage-green "verified" accent, electric-red SOS accent.
- Architectural rounded-2xl shape language — explicitly *not* Instagram's pill buttons.
- Hinglish, casual, community-first copy voice throughout (not just marketing — system copy, placeholders, seed data all in Hinglish).
- Custom iconography for signature moments (logo, anatomical heart, share icon) rather than generic stock icons.

---

## 6. Success Criteria (what "solved" looks like)

1. A resident can verify their identity (address + liveness selfie + GPS) in under 2 minutes and never worry about outsiders or fake profiles in their feed.
2. A resident in a genuine emergency can trigger help — silently if needed — and have police, trusted contacts, *and* nearby neighbours notified within seconds, with live location.
3. A resident can get a trustworthy, sourced answer to "who's a good [service provider] near me?" faster than posting in a WhatsApp group.
4. A local business or NGO can reach exactly the residents within their target radius, at a fraction of city-wide ad cost, without needing a separate business tooling stack.
5. Society-wide announcements/events/alerts replace unstructured WhatsApp broadcast groups with a searchable, filterable, permission-aware feed.

---

## 7. Explicitly Out of Scope for v1 (per prototype gaps)

- Short-form video / Reels feed (icons imported for video controls, but no dedicated video-feed screen exists in the prototype).
- Admin/moderator dashboard (only per-post user-side moderation actions — Report/Mute/Hide — exist; no backend moderation console).
- Real backend/AI — the prototype simulates AI verification, GPS overlay, and Genie search results with mock data and timed delays; all of this needs real implementation (liveness detection API, actual LLM-backed local search, real geofencing, real SMS/emergency-service integration).

---

## 8. Next Steps

- Decide on real backend architecture: auth provider, geofencing/geo-verification service, liveness-detection vendor, push notifications, real-time chat infra, payments (for donations/ads).
- Define MVP feature cut — likely: Auth+Verification → Feed → Chats → Circle Guard (SOS) → Circle Genie, deferring Bazaar/Scenes/Pages/Ads Manager to a later phase.
- Validate the SOS/Silent Phrase always-listening mechanic against platform privacy/permission constraints (iOS/Android background mic access is heavily restricted — needs a real technical spike).
- Confirm legal requirements for the 80G donation receipts and GST-linked business pages before building compliance flows.
