# Circle Up — Master Design Prompt (single, complete)

One self-contained prompt covering the entire app: brand, new logo, design
system, and all ~85 screens organised as a continuous end-user journey.

> The modular version (one prompt per flow) is in
> [`stitch-design-prompt.md`](./stitch-design-prompt.md). Use that if the tool
> truncates on this one — see "If output gets cut off" at the bottom.

---

```
Design the complete mobile app "Circle Up" — every screen, as one cohesive
product, following the real end-user journey from first launch to power user.
Portrait mobile (iOS + Android). Modern, premium, warm.

════════════════════════════════════════════════
PART 1 — WHAT THIS APP IS
════════════════════════════════════════════════

Circle Up is a hyperlocal social app for Indian neighbourhoods. Its single
defining idea: EVERY USER IS A REAL, VERIFIED NEIGHBOUR. You cannot join by
just downloading it — you prove you actually live in the neighbourhood by
submitting your address plus a live selfie stamped with GPS coordinates and a
timestamp. A human or automated review approves you before you get in.

Because the community is genuinely verified, the app carries features a normal
anonymous social network could never safely offer:
  • a personal-safety SOS system that alerts police, your trusted contacts,
    AND nearby verified neighbours simultaneously
  • a marketplace where you meet strangers face-to-face in your own building
  • local events hosted in people's homes and societies
  • an AI assistant that answers questions using only real neighbour posts
  • verified business and NGO pages that can accept donations

TARGET USER: Indian urban apartment/society residents, 22–45, in metros like
Bengaluru, Mumbai, Pune, Delhi, Hyderabad. Mixed English/Hinglish copy is
intentional and must be designed for (e.g. "Apni circle safe rakho", "Kya share
karna hai apni circle ke saath?").

DESIGN MUST COMMUNICATE: trustworthy, safe, warm, neighbourly, quietly premium.
Think "the trusted community noticeboard of your building", NOT "viral social
network". Friendly but grown-up. Never anonymous, edgy, or corporate-tech.

════════════════════════════════════════════════
PART 2 — THE NEW LOGO
════════════════════════════════════════════════

Design a fresh logo for "Circle Up".

CORE CONCEPT: concentric and overlapping circles representing a verified
neighbourhood radius — this app literally draws a geofence around where you
live, and the overlapping circles of people you belong to. Explore marks where
2–3 circles overlap, and the overlap negative space reads as either a location
pin or a small group of people standing together.

REQUIREMENTS:
  • An icon mark that works standalone as an app icon AND at 24px in a tab bar
  • A wordmark lockup: mark + "Circle Up" in a modern geometric sans,
    medium/semibold, tight letter-spacing
  • Must stay legible in single colour — white on colour, and black on white
  • Rounded, soft geometry. No sharp or aggressive angles
  • Should feel safe and communal, not corporate or startup-generic
  • AVOID these clichés: a plain map pin, a chat/speech bubble, a house outline,
    linked hands, a generic "people" trio icon

Deliver: primary lockup, icon-only mark, monochrome versions, and the app icon
on both light and dark home screens.

════════════════════════════════════════════════
PART 3 — DESIGN SYSTEM
════════════════════════════════════════════════

COLOURS
  Primary          #2196D6   trust blue — primary actions, links, active states
  Primary light    #EBF6FD   tinted backgrounds, selected chips
  Text primary     #1F1B17   warm near-black — NOT pure black
  Text secondary   #6B7280
  Text muted       #9CA3AF
  App background   #FAFAFA
  Surface          #FFFFFF
  Input / chip bg  #F3F4F6
  Border           #E5E7EB

  SAFETY RED       #FF0033   RESERVED — SOS and critical safety ONLY.
                             Never use it for ordinary UI. If this red appears
                             elsewhere, the SOS button stops reading as urgent.
  Error            #DC2626
  Success/verified #10B981
  Warning          #F59E0B
  Events / stories #A855F7
  Achievements     #B45309 on #FFFBEB

  A subtle multi-stop gradient (blue → violet → warm pink) is used ONLY for:
  the logo mark, primary CTA buttons, and unviewed story rings. Everything
  else stays flat.

TYPOGRAPHY — geometric sans (Inter / Plus Jakarta Sans family)
  Screen titles 22–26px bold · Section headers 15–18px semibold
  Body 13–15px · Captions 11–12px · Micro-labels 10px uppercase, letter-spaced

SHAPE LANGUAGE (this is the signature — get it right)
  Generous rounded rectangles: 16px for cards and inputs, 24px for hero cards
  and bottom sheets. Deliberately NOT fully-pill-shaped buttons — the app uses
  "architectural rounded": softer than Material, squarer than iOS pills.
  Cards sit on very soft shadows (4–8% opacity, large blur), never hard borders.
  Base spacing unit 4px. Screen padding 20px.

ICONOGRAPHY — Lucide-style outline icons, 2px stroke, rounded caps.

CORE COMPONENTS to define first: buttons (primary gradient / secondary grey /
destructive / disabled), text inputs (default, focused, error, success),
chips and pills (selected + unselected), cards, bottom navigation, modal bottom
sheets, avatars with gradient rings, status badges, toggles, and empty states.

BOTTOM NAVIGATION — 5 tabs: Home, Explore, Chats, Search, Profile. The centre
Chats tab is an elevated gradient pill that sits proud of the bar.

════════════════════════════════════════════════
PART 4 — THE COMPLETE USER JOURNEY (all screens)
════════════════════════════════════════════════

─── ACT 1: ARRIVAL ───────────────────────────────
The user has just installed the app and knows nothing.

1  SPLASH — logo mark centred on gradient, tagline "Your neighbourhood,
   verified."
2  LOGIN — logo, "Phone number, username or email" field, password field with
   show/hide toggle, primary "Log in", "Forgot password?", OR divider,
   "Continue with Google" outlined button, "Create new account" footer link.
3  SIGNUP METHOD CHOOSER — heading "Create your account". An 18+ confirmation
   checkbox inside a bordered card that MUST be ticked before anything else is
   tappable. Design both the unticked state and the error state (card outlined
   red, message "Please confirm you're 18+ to continue"). Below it three
   stacked method cards with icon + title + subtitle + chevron:
     "Continue with Gmail / Fastest — use your Google account" (most prominent,
      dark border) · "Sign up with Email / Use any email + a password" ·
     "Sign up with Phone / +91 number + OTP verification"
4  EMAIL SIGNUP FORM — email + create-password fields with live inline
   validation that turns green: "✓ Looks good — ready to continue".
5  PHONE SIGNUP FORM — a locked "🇮🇳 +91" prefix beside a 10-digit input, with
   a live counter "Enter 3 more digits".
6  OTP VERIFICATION — 6 separate auto-advancing digit boxes, masked number
   shown above, resend timer, plus the error state where boxes turn red.

─── ACT 2: PROVING YOU BELONG ────────────────────
The trust gauntlet. This flow asks for genuinely personal data (home address,
live selfie, GPS), so every screen must justify WHY, show progress, and never
feel like an interrogation. This is the most important flow to get right —
if it feels invasive, the user quits here.

7  ADDRESS ENTRY — "Where do you live?" with the reassurance line "Only real
   verified neighbours can enter. We'll confirm this with a quick live selfie."
   A neighbourhood search field with a live dropdown (show "HSR Layout /
   Bengaluru" as a result).
8  NEIGHBOURHOOD SELECTED — a confirmation chip "✓ HSR Layout selected", then
   revealed fields: Society/Apartment, Tower (optional), Flat.
9  VERIFICATION EXPLAINER SHEET — bottom sheet titled "Verify your location",
   body "We'll take a live selfie and stamp it with your GPS location and
   timestamp — this proves you're really here, right now." Primary "Enable
   Camera & Location", secondary "Cancel".
10 LIVE SELFIE CAPTURE — full-screen camera, circular face guide, live GPS
   coordinates + timestamp burned into the bottom of the frame, large capture
   button, and a "hold still" guidance state.
11 PERMISSION DENIED FALLBACK — "Camera or location access denied", explaining
   "You can still continue with a photo from your gallery, but it won't have
   the same live-location guarantee — it may need manual review." with a
   "Choose from Gallery" button.
12 VERIFICATION SUCCESS — celebratory, green check, "You're verified!"
13 VERIFICATION PENDING REVIEW — amber, calm and non-alarming, "Your submission
   is being reviewed", stating the reason (e.g. photo came from gallery, GPS
   looked mocked) and an expected timeline.
14 PROFILE SETUP — avatar upload circle, name, bio, then "Pick your vibes":
   a live "3/3 min" counter above chips grouped under emoji category headers —
   🍴 Food & Drink, 🎮 Hobbies, ✨ Lifestyle, 💪 Fitness, 🔮 Mind & Soul,
   🤝 Community, 💼 Work & Hustle, 🏠 Family & Home, 🌍 Travel & Outdoors.
   Show selected (filled blue) and unselected (grey outline) chip states.

─── ACT 3: FIRST LOOK ────────────────────────────
15 TOP BAR (persistent) — "Circle Up" gradient wordmark left; right side has a
   "+" create button, a small red "SOS" pill with warning triangle, and a
   notification bell with unread dot. Below, a tappable neighbourhood pill
   "HSR Layout ⌄".
16 HOME FEED — EMPTY STATE — "No posts yet — be the first to share something
   with your circle." with a warm illustration.
17 STORIES BAR — horizontal scroll. First item "Your Story" with a "+" overlay;
   then neighbour avatars in rings — unviewed = bright gradient ring, viewed =
   flat grey ring.
18 HOME FEED — POPULATED — feed post cards: author avatar, name, optional "NEW
   NEIGHBOUR" badge, timestamp, category chip, body text, optional photo,
   footer with reactions and comment count.
19 CATEGORY CHIP SET — six styles: Alert (red), Buy/Sell (amber), Recommend
   (green), Event (purple), Lost & Found (cyan), General (grey).
20 FIVE-FINGER REACTION BAR — this app has five distinct reactions, not a
   single like: Like, Notice, Diss, Engaged, Out. Design the compact inline row
   of five expressive icons plus the long-press expanded picker with labels.
21 SPONSORED CARD — a native in-feed ad clearly marked "SPONSORED", showing a
   local business headline, body, image and CTA. Must look local and
   trustworthy, never like a banner ad.
22 STORY VIEWER — full-screen, segmented progress bars at top, author info,
   tap-to-advance, reply input at the bottom.

─── ACT 4: PARTICIPATING ─────────────────────────
23 CREATE POST SHEET — "Share with your circle", horizontal row of the six
   selectable category chips, large multiline caption field with the Hinglish
   placeholder "Kya share karna hai apni circle ke saath?", a dashed
   "📷 Add a photo" drop zone plus its filled preview state, gradient "Post"
   button.
24 POST DETAIL / COMMENT THREAD — post at top, threaded comments with indented
   replies, per-comment like hearts, a "Replying to [name]" banner above the
   input when replying, sticky bottom composer.
25 MODERATION MENU — bottom sheet: Report, Hide this post, Mute user, Block
   user.
26 REPORT REASON LIST — including "Shares someone's private info without
   consent (doxxing)".

─── ACT 5: FEELING SAFE (Circle Guard) ───────────
The app's most important module. Must feel instantly reliable under panic:
huge tap targets, unambiguous language, zero decorative clutter. This is the
ONLY place the safety red #FF0033 appears.

27 GUARD HOME — title "Circle Guard", Hinglish subtitle "Apni circle safe
   rakho". A very large red SOS button (full-width, tall, 24px radius) with
   warning-triangle icon and "Tap for emergency help". Below it a 2×2 grid of
   quick actions: Fake Check-in Call, Silent Phrase, Share Live Location,
   Trusted Contacts. At the bottom, a live "Safety Alerts" section.
28 SOS COUNTDOWN — full-screen takeover, large animated countdown ring
   5…4…3, "Sending SOS in 5…", the line "Police, your trusted contacts, and
   nearby neighbours will be alerted.", and a big "Cancel" button.
29 SOS ACTIVE — the critical screen. Live elapsed timer, then two clearly
   separated sections: "EMERGENCY SERVICES (DIALED)" listing Police /
   Emergency 112 / Women's Helpline each with a status tick, and "YOUR CIRCLE"
   showing trusted contacts and nearby neighbours with live per-recipient
   delivery status (sending / delivered / failed). Prominent "I'm safe now".
30 SOS ACTIVE — DEGRADED / NO NETWORK — same screen, but the phone-dial
   section still shows success while the circle section honestly shows a
   failure message. NEVER fake success here — this is a design requirement.
31 TRUSTED CONTACTS — list of up to 5 (name, phone, relation), add form, a
   "5/5 saved" counter, and a gentle staleness prompt "Last confirmed 4 months
   ago — still current?"
32 SHARE LIVE LOCATION — SETUP — duration chips (15 / 30 / 60 / 120 min) and a
   multi-select list of trusted contacts.
33 SHARE LIVE LOCATION — ACTIVE — live map preview, countdown until auto-stop,
   and a "Stop sharing" button.
34 FAKE CALL — INCOMING — a realistic incoming-call screen (caller name,
   avatar, accept/decline) used to exit an uncomfortable situation.
35 FAKE CALL — SETUP — schedule when it rings and who it appears to be from.
36 SILENT PHRASE — explains a spoken safety phrase that silently triggers SOS.
   Phrase input, enable toggle, a warning state when the chosen phrase is too
   common in ordinary conversation (e.g. "order kar do" flagged as risky), and
   an honest disclosure that listening only happens while the app is open.
37 SAFETY ALERTS FEED — severity-tagged cards: CRITICAL (red), WARNING (amber),
   INFO (blue), each showing source "👮 Police" or "🏢 Society", title, body,
   time.

─── ACT 6: MEETING NEIGHBOURS ────────────────────
38 EXPLORE HOME — a grid of five feature entry cards, each with icon, label and
   its own accent colour: Bazaar, Scenes, Genie, Guard, Pages. Below, a
   people-discovery section with two tabs: "Circle nearby" and "From your city".
39 NEIGHBOUR DISCOVERY CARD — avatar, name, distance ("0.0 km away"), shared
   vibe chips, mutual-connection count, "Add to Circle" button plus its
   connected state.
40 USER PROFILE (someone else) — avatar, name, pronouns, neighbourhood, a "From
   your city" badge when they're outside your immediate neighbourhood, bio,
   vibe chips, mutual connections, "Add to Circle" + "Message" buttons.
41 USER PROFILE — UNAVAILABLE — the blocked/not-found state: "This profile
   isn't available."
42 NEIGHBOURHOOD SWITCHER SHEET — list of the user's verified neighbourhoods
   with a green check on the active one, plus an "Add a new neighbourhood" row
   that warns full re-verification is required.
43 TOPIC SCREEN — posts filtered by topic/hashtag, with topic name and count.

─── ACT 7: GETTING ANSWERS (Circle Genie) ────────
An AI assistant answering ONLY from real neighbourhood posts. Sourcing is the
design priority — every answer must visibly show where it came from.

44 GENIE HOME — friendly assistant header, large question input, and suggested
   prompt chips: "Best plumber nearby?", "Any power cut updates?", "Good tiffin
   service?"
45 GENIE THINKING — a calm, non-gimmicky loading treatment.
46 GENIE ANSWER — synthesised answer at top, then a clearly separated "Sources"
   section listing the real neighbour posts it drew from, each with author
   avatar, name, relative timestamp ("2mo ago"), and a snippet. Include a
   subtle freshness warning when sources are old.
47 GENIE COLD START — honest empty state for when the neighbourhood has too few
   posts to answer from yet, rather than inventing an answer.

─── ACT 8: BUYING & SELLING (Bazaar) ─────────────
48 BAZAAR HOME — category filter chips (Furniture, Electronics, Books,
   Clothing, Free), then a two-column listing grid: photo, title, price with a
   distinct "FREE" treatment, and seller distance.
49 LISTING DETAIL — image carousel, title, price, description, seller card with
   verified badge and neighbourhood, "Message seller" primary button, discreet
   "Report listing" action.
50 CREATE LISTING — photo upload grid, title, category picker, price field that
   can be marked free, description, submit.
51 PROHIBITED ITEM ERROR — the blocked state when a listing mentions a banned
   item, with clear guidance.
52 BAZAAR EMPTY STATE — "Nothing listed in your neighbourhood yet."

─── ACT 9: GATHERING (Scenes) ────────────────────
53 SCENES HOME — upcoming event cards: cover image, title, date/time badge,
   location, host avatar, attendee count.
54 EVENT DETAIL — hero image, title, full date/time, location, host card,
   description, attendee avatar row, RSVP buttons (Going / Maybe).
55 EVENT DETAIL — WAITLISTED — the state when the guest limit is full.
56 EVENT DETAIL — CANCELLED — clear cancelled treatment.
57 CREATE EVENT — title, description, event type, date & time picker, location,
   guest limit, and a privacy-tier selector with three clearly explained
   options: "Verified neighbours", "Close friends only", "Open to the city".
58 MY EVENTS — tabs for Hosting and Attending, with a cancel-event action
   warning that all RSVPs will be notified.
59 ATTENDEE CHECK-IN (host only) — list of "going" attendees with a check-in
   toggle, enabled only once the event has started.

─── ACT 10: TALKING (Chats) ──────────────────────
60 CHATS LIST — conversation rows: avatar, name, message preview, timestamp,
   unread count badge. Plus an empty state.
61 NEW CHAT — searchable list of verified neighbours you can message.
62 CHAT DETAIL — sent vs received bubbles, an image message, a voice-note
   message with waveform + play button + duration, a date separator, and a
   composer with camera, mic, text field and send. Header shows name, avatar,
   call and video icons.
63 CHAT — RECORDING STATE — the composer while a voice note is being recorded.
64 CHAT — BLOCKED — what the thread looks like when the other person is blocked.

─── ACT 11: BUILDING PRESENCE (Pages & business) ─
65 PAGE TYPE SELECTOR — three large choice cards: Personal, Business, NGO —
   each with icon, description, and what verification it requires.
66 CREATE PAGE — a form that changes by type: Personal → profession;
   Business → GST number; NGO → Darpan ID. EVERY compliance field must carry a
   visible "Self-declared, verification pending" label — never imply government
   verification. Includes a "Use my current location" button for the address.
67 MY PAGES — tabs "My Pages" and "Discover", page cards with type icon, name,
   and an approval-status badge (PENDING amber / APPROVED green) for NGOs.
68 PAGE DETAIL — OWNER VIEW — stats (donations received, or campaigns and
   spend) plus a "Promote — Ads Manager" button.
69 PAGE DETAIL — VISITOR VIEW — a "Donate" button enabled only for approved
   NGOs, with explanatory text when it isn't.
70 DONATE — AMOUNT — preset chips (₹100 / ₹500 / ₹1000 / ₹2500) plus a custom
   amount field.
71 DONATE — CONFIRM — summary of NGO, amount, and what happens next.
72 DONATE — PAYMENT — a checkout screen clearly marked as a mock gateway in dev.
73 DONATE — SUCCESS + RECEIPT — success state with receipt status that honestly
   communicates "your receipt is being generated, we'll retry if it fails".
74 ADS MANAGER — campaign list with spend, reach, clicks, CTR, and pause/resume
   toggles per campaign.
75 CREATE AD — a 5-step wizard with a visible step progress bar. Design ONE
   SCREEN PER STEP: (1) Objective, (2) Audience — neighbourhoods or radius plus
   vibe targeting, (3) Budget, (4) Creative, (5) Review & submit.

─── ACT 12: IDENTITY & RETENTION ─────────────────
76 PROFILE TAB — avatar, name, pronouns, bio, link, then a three-stat row:
   Posts / Vibes / Day streak (with 🔥). "Edit Profile" and "Share Profile"
   buttons, an achievements teaser pill showing points and city rank, the
   user's vibe chips, and a 3-column grid of their posts.
77 EDIT PROFILE — name, username, pronouns, link, bio, then a clearly separated
   "Private info" section (phone) labelled "Only visible to you — never shown
   on your public profile", then the vibes re-picker.
78 SETTINGS — a sectioned list: Community (Verification status, My
   neighbourhood, Close friends) · Grow & promote (My Pages, Ads Manager,
   Achievements, Share profile) · Account (Edit profile, Switch account, Saved,
   Delete account) · Privacy & safety (Blocked users, Trusted contacts, Silent
   phrase) · Notifications · Preferences (Language, Terms, Privacy, Help).
   A destructive "Log out" at the bottom.
79 SETTINGS — VERIFICATION STATUS — membership cards with VERIFIED / PENDING /
   REJECTED states.
80 SETTINGS — SAVED POSTS — saved list with an unsave action.
81 SETTINGS — BLOCKED USERS — list with unblock.
82 SETTINGS — CLOSE FRIENDS — list with remove.
83 SETTINGS — NOTIFICATION PREFERENCES — three toggles: Safety alerts, Social,
   Community.
84 DELETE ACCOUNT — serious but non-manipulative, explaining exactly what
   happens, requiring the user to type DELETE, with a destructive button
   disabled until valid.
85 ACHIEVEMENTS — a hero points card with city rank ("#4 of 128 in your city"),
   then badge cards showing earned vs locked with progress ("0/3"): Safety Star,
   Helping Hand, Scene Regular. Below, a "How points are earned" list making
   the anti-gaming rules explicit — points come only from verified actions
   (a confirmed donation, a host-confirmed event check-in, a safety alert
   validated by 2+ neighbours), never from raw posting.
86 SHARE PROFILE — a QR-style share card with avatar, name, @username, a
   copyable profile link, and a social share row.
87 ACCOUNT SWITCHER — a sheet listing the personal account (with a check) and
   any business pages the user manages.
88 CREATE MENU SHEET — four options: Post, Story, Highlight, Live — with the
   unavailable ones honestly shown as disabled "Coming soon".
89 NOTIFICATIONS — grouped under Today / Yesterday / This Week headers, with
   All and Unread filter chips. Rows carry a type icon and colour (points
   awarded, new circle connection, event cancelled), an unread dot, and a
   "+ Circle back" action button on connection notifications plus its
   "Connected" done state.

════════════════════════════════════════════════
PART 5 — CROSS-CUTTING DELIVERABLES
════════════════════════════════════════════════

A. EMPTY / LOADING / ERROR STATE SET — a consistent family with friendly
   illustrations in the brand palette and warm reassuring copy: no posts,
   no listings, no events, no notifications, no search results, network
   offline, and something-went-wrong.
B. DARK MODE — the core screens (home feed, Guard, chat, profile) adapted for
   dark surfaces. Keep the SOS red at full strength for safety visibility.
C. APP ICON SET — the new mark shown on light and dark home screens, plus
   Android adaptive-icon foreground and background layers.

════════════════════════════════════════════════
PART 6 — NON-NEGOTIABLE DESIGN RULES
════════════════════════════════════════════════

1. Safety red #FF0033 appears ONLY in Circle Guard. Nowhere else, ever.
2. Honest degraded states are REQUIREMENTS, not gaps to polish away — the SOS
   screen with no network must visibly show which channels failed; the receipt
   must admit it's retrying; "Coming soon" items must appear disabled rather
   than be hidden.
3. Compliance labels ("Self-declared, verification pending") must stay visible
   on GST and Darpan ID fields. They are a legal requirement, not clutter.
4. The verification flow must always explain WHY it's asking for personal data
   at the moment it asks.
5. Never design a dark pattern into deletion, unsubscribe, or privacy controls.

Deliver every screen listed above in a single consistent design system.
```

---

## If output gets cut off

Stitch degrades or truncates on very long prompts. If that happens:

1. Paste **Parts 1–3** (brief, logo, design system) on their own first and let
   it establish the system.
2. Then paste **one Act at a time** from Part 4 (Act 1, Act 2, …), re-pasting
   Part 3 above it if the styling drifts.
3. Finish with Part 5.

The pre-split version of exactly this content is in
[`stitch-design-prompt.md`](./stitch-design-prompt.md).

## Screen count by act

| Act | Flow | Screens |
|---|---|---|
| 1 | Arrival / auth | 6 |
| 2 | Verification gauntlet | 8 |
| 3 | First look / feed | 8 |
| 4 | Participating | 4 |
| 5 | Circle Guard (safety) | 11 |
| 6 | Meeting neighbours | 6 |
| 7 | Circle Genie | 4 |
| 8 | Bazaar | 5 |
| 9 | Scenes | 7 |
| 10 | Chats | 5 |
| 11 | Pages / donations / ads | 11 |
| 12 | Profile / settings / retention | 14 |
| — | Cross-cutting sets | 3 sets |
| | **Total** | **~89 screens** |
