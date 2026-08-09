# Circle Up — Google Stitch Design Brief

A complete, copy-paste prompt set for redesigning every screen in the app.

**How to use this:** Stitch works best with a strong context prompt first, then
screen requests in small batches. Paste **Prompt 0** (brand + design system) to
start the project, then work flow-by-flow through Prompts 1–10. Each flow prompt
is self-contained — if Stitch loses context, re-paste Prompt 0 above it.

---

## Prompt 0 — Brand, design system & logo (paste this FIRST)

```
I'm designing "Circle Up" — a hyperlocal social app for Indian neighbourhoods.
Design for mobile (iOS/Android), portrait, modern and premium.

WHAT MAKES THIS APP DIFFERENT (this must come through in the design):
Every user is a REAL, VERIFIED neighbour. You can't join by just downloading it —
you prove you live in the neighbourhood with your address plus a live selfie
stamped with GPS and a timestamp. Because the community is genuinely verified,
the app carries things a normal social app can't: a personal-safety SOS system,
a neighbourhood marketplace where you meet strangers in person, and local events.
The design must feel TRUSTWORTHY and SAFE — warm and community-driven, not
corporate, and never anonymous or edgy.

TARGET USER: Indian urban apartment/society residents, ages 22–45, in metros like
Bengaluru, Mumbai, Pune, Delhi. Mixed English/Hinglish copy is intentional and
should be designed for (e.g. "Apni circle safe rakho", "Kya share karna hai?").

BRAND PERSONALITY: Warm, safe, neighbourly, quietly premium. Think "trusted
local community" not "viral social network". Friendly but grown-up.

=== NEW LOGO ===
Design a fresh logo for "Circle Up". Core idea: concentric/overlapping circles
representing a verified neighbourhood radius — the app literally draws a
geofence around where you live, and the circles you belong to. Explore marks
where 2–3 circles overlap and the overlap reads as either a location pin or a
small group of people standing together.

Requirements:
- An icon mark that works standalone as an app icon and at 24px in a tab bar
- A wordmark version: mark + "Circle Up" set in a modern geometric sans,
  medium/semibold, tight letter-spacing
- Must read clearly in single-colour (white on colour, and black on white)
- Rounded, soft geometry — no sharp aggressive angles
- Feels safe and communal, NOT corporate-tech or startup-generic
- Avoid clichés: no generic map pins, no chat bubbles, no hand-holding icons

=== COLOUR SYSTEM ===
Primary:        #2196D6 (trust blue — primary actions, links, active states)
Primary light:  #EBF6FD (tinted backgrounds, selected chips)
Text primary:   #1F1B17 (warm near-black — NOT pure black)
Text secondary: #6B7280
Text muted:     #9CA3AF
App background: #FAFAFA
Surface:        #FFFFFF
Input/chip bg:  #F3F4F6
Borders:        #E5E7EB

Semantic:
Safety/SOS:     #FF0033 (reserved ONLY for SOS and critical safety)
Error:          #DC2626
Success/verified: #10B981
Warning:        #F59E0B
Events/stories: #A855F7
Achievements:   #B45309 on #FFFBEB

Use a subtle multi-stop gradient (blue → violet → warm pink) ONLY for: the
logo mark, primary CTA buttons, and story rings. Everywhere else stays flat.

=== TYPE & SPACING ===
Geometric sans (Inter / Plus Jakarta Sans style).
Screen titles 22–26px bold · Section headers 15–18px semibold ·
Body 13–15px · Captions 11–12px · Micro-labels 10px uppercase, letter-spaced.
Base spacing unit 4px. Screen padding 20px.

=== SHAPE LANGUAGE (important, this is the signature) ===
Generous rounded rectangles: 16px for cards/inputs, 24px for hero cards and
sheets. Deliberately NOT fully-pill-shaped buttons — this app uses
"architectural rounded", softer than Material but squarer than iOS pills.
Cards sit on very soft shadows (4–8% opacity, large blur), never hard borders.

=== ICONOGRAPHY ===
Lucide-style outline icons, 2px stroke, rounded caps.

Deliver a cohesive design system with the logo, colour tokens, type scale, and
core components: buttons (primary gradient / secondary grey / destructive),
input fields, chips/pills, cards, bottom navigation, modal sheets, avatars,
badges, empty states.
```

---

## Prompt 1 — Onboarding & verification (the trust-building flow)

```
Design these Circle Up onboarding screens. This flow's job is to make a slightly
invasive verification process (address + live selfie) feel SAFE and worth it —
explain the "why" visually at every step, and show progress so it never feels
like an interrogation.

1. SPLASH — logo mark centred, gradient background, tagline "Your neighbourhood,
   verified."

2. LOGIN — logo, "Phone number, username or email" field, password field with
   show/hide, primary "Log in" button, "Forgot password?", an OR divider,
   "Continue with Google" outlined button, and "Create new account" at the bottom.

3. SIGNUP METHOD CHOOSER — heading "Create your account". An 18+ confirmation
   checkbox in a bordered card that must be ticked first (show both the unticked
   and the error state where it's highlighted red with "Please confirm you're 18+
   to continue"). Then three stacked method cards, each with icon, title,
   subtitle and chevron: "Continue with Gmail / Fastest — use your Google
   account" (visually the most prominent, dark border), "Sign up with Email /
   Use any email + a password", "Sign up with Phone / +91 number + OTP".

4. EMAIL SIGNUP FORM — email + create-password fields, live inline validation
   hint that turns green ("✓ Looks good — ready to continue").

5. PHONE SIGNUP FORM — a "🇮🇳 +91" prefix locked to the left of a 10-digit input,
   with a live "Enter 3 more digits" counter.

6. OTP SCREEN — 6 separate digit boxes that auto-advance, the masked number
   shown above, a resend timer, and an error state where boxes turn red.

7. ADDRESS ENTRY — "Where do you live?" with the reassurance line "Only real
   verified neighbours can enter. We'll confirm this with a quick live selfie."
   A neighbourhood search field with a live-results dropdown (show "HSR Layout /
   Bengaluru" as a result), then a selected-state chip "✓ HSR Layout selected",
   then Society/Apartment, Tower (optional), and Flat fields.

8. VERIFICATION EXPLAINER SHEET — a bottom sheet, "Verify your location", body
   "We'll take a live selfie and stamp it with your GPS location and timestamp —
   this proves you're really here, right now." Buttons: "Enable Camera &
   Location" primary, "Cancel" secondary.

9. LIVE SELFIE CAPTURE — full-screen camera with a circular face guide, a live
   GPS coordinate + timestamp overlay burned into the bottom of the frame, and
   a large capture button. Show a "hold still" guidance state.

10. PERMISSION DENIED FALLBACK — "Camera or location access denied", explaining
    "You can still continue with a photo from your gallery, but it won't have
    the same live-location guarantee — it may need manual review." with a
    "Choose from Gallery" button.

11. VERIFICATION SUCCESS — celebratory, green check, "You're verified!"

12. VERIFICATION PENDING REVIEW — amber, calm not alarming, "Your submission is
    being reviewed" with an explanation of why (e.g. photo came from gallery)
    and expected timeline.

13. PROFILE SETUP — avatar upload circle, name, bio, then a "Pick your vibes"
    section: a live "3/3 min" counter and chips grouped under emoji category
    headers (🍴 Food & Drink, 🎮 Hobbies, ✨ Lifestyle, 💪 Fitness, 🔮 Mind &
    Soul, 🤝 Community, 💼 Work & Hustle, 🏠 Family & Home, 🌍 Travel). Show
    both selected (filled blue) and unselected (grey outline) chip states.
```

---

## Prompt 2 — Home feed & posting

```
Design the Circle Up home feed.

1. TOP BAR (persistent) — "Circle Up" gradient wordmark left; right side has a
   "+" create button, a small red "SOS" pill with a warning triangle, and a
   notification bell with an unread dot. Below the wordmark, a small tappable
   neighbourhood pill "HSR Layout ⌄".

2. STORIES BAR — horizontal scroll. First item is "Your Story" with a "+"
   overlay; the rest are neighbour avatars in gradient rings (show both unviewed
   = bright gradient ring, and viewed = flat grey ring).

3. FEED POST CARD — author avatar, name, a "NEW NEIGHBOUR" badge option,
   timestamp, and a category chip. Six category styles to show: Alert (red),
   Buy/Sell (amber), Recommend (green), Event (purple), Lost & Found (cyan),
   General (grey). Body text, optional photo, and a footer with reactions and
   a comment count.

4. FIVE-FINGER REACTION BAR — this app has five distinct reactions, not just a
   like: Like, Notice, Diss, Engaged, Out. Design a compact row of five
   expressive icons plus a long-press expanded picker with labels.

5. SPONSORED CARD — a native ad card that sits in the feed, clearly marked
   "SPONSORED", showing a local business's headline, body, image and CTA button.
   Must look local and trustworthy, not like a banner ad.

6. EMPTY FEED STATE — "No posts yet — be the first to share something with your
   circle." with a friendly illustration.

7. CREATE POST SHEET — heading "Share with your circle", a horizontal row of the
   six selectable category chips, a large multiline caption field with the
   Hinglish placeholder "Kya share karna hai apni circle ke saath?", a dashed
   "📷 Add a photo" drop zone plus its filled preview state, and a gradient
   "Post" button.

8. POST DETAIL / COMMENT THREAD — the post at top, a threaded comment list with
   indented replies, per-comment like hearts, a "Replying to [name]" banner
   above the input when replying, and a sticky bottom comment composer.

9. MODERATION MENU — a bottom sheet with Report, Hide this post, Mute user,
   Block user. Report opens a reason list including "Shares someone's private
   info without consent (doxxing)".

10. STORY VIEWER — full-screen, segmented progress bars at top, author info,
    tap-to-advance, and a reply input at the bottom.
```

---

## Prompt 3 — Circle Guard (safety & SOS) — highest-stakes flow

```
Design Circle Up's safety module, "Circle Guard". This is the app's most
important feature and must feel instantly reliable under panic — huge tap
targets, unambiguous language, zero decorative clutter. Red (#FF0033) is used
ONLY here.

1. GUARD HOME — title "Circle Guard", Hinglish subtitle "Apni circle safe
   rakho". A very large red SOS button (full-width, tall, rounded-3xl) with a
   warning-triangle icon and "Tap for emergency help". Below it a 2x2 grid of
   quick actions: Fake Check-in Call, Silent Phrase, Share Live Location,
   Trusted Contacts. At the bottom, a live "Safety Alerts" feed section.

2. SOS COUNTDOWN — full-screen takeover, a large animated countdown ring
   showing 5…4…3, "Sending SOS in 5…", the line "Police, your trusted contacts,
   and nearby neighbours will be alerted." and a big "Cancel" button.

3. SOS ACTIVE — the critical screen. A live elapsed timer, then two clearly
   separated sections: "EMERGENCY SERVICES (DIALED)" listing Police / Emergency
   112 / Women's Helpline each with a status tick, and "YOUR CIRCLE" showing
   trusted contacts and nearby neighbours with live per-recipient delivery
   status (sending / delivered / failed). A prominent "I'm safe now" button.
   Also design the degraded state where the network is down: the phone-dial
   section still shows success while the circle section honestly shows a
   failure message — never fake success.

4. TRUSTED CONTACTS — list of up to 5 contacts (name, phone, relation), an add
   form, a "5/5 saved" counter, and a gentle staleness prompt "Last confirmed 4
   months ago — still current?"

5. SHARE LIVE LOCATION — duration selector chips (15 / 30 / 60 / 120 min),
   multi-select list of trusted contacts, an active-sharing state with a live
   map preview and a countdown until auto-stop, plus a "Stop sharing" button.

6. FAKE CALL — a realistic incoming-call screen (caller name, avatar, accept/
   decline) used to exit an uncomfortable situation, plus a setup screen to
   schedule when it rings.

7. SILENT PHRASE — explains a spoken safety phrase that silently triggers SOS.
   Include a phrase input, an enable toggle, a warning state when the chosen
   phrase is too common in everyday conversation ("order kar do" flagged as
   risky), and an honest "listening only while the app is open" disclosure.

8. SAFETY ALERTS FEED — severity-tagged cards: CRITICAL (red), WARNING (amber),
   INFO (blue), each showing source "👮 Police" or "🏢 Society", title, body,
   and time.
```

---

## Prompt 4 — Explore & discovery

```
Design Circle Up's Explore tab.

1. EXPLORE HOME — a grid of five feature entry cards, each with icon, label and
   its own accent colour: Bazaar, Scenes, Genie, Guard, Pages. Below them, a
   people-discovery section with two tabs: "Circle nearby" and "From your city".

2. NEIGHBOUR CARD — avatar, name, distance ("0.0 km away"), shared vibe chips,
   mutual-connection count, and an "Add to Circle" button with its connected
   state.

3. USER PROFILE (viewing someone else) — avatar, name, pronouns, neighbourhood,
   a "From your city" badge when they're outside your immediate neighbourhood,
   bio, vibe chips, mutual connections, and "Add to Circle" + "Message" buttons.
   Also design the blocked/unavailable state: "This profile isn't available."

4. NEIGHBOURHOOD SWITCHER SHEET — list of the user's verified neighbourhoods
   with a green check on the active one, and an "Add a new neighbourhood" row
   that warns re-verification is required.

5. TOPIC SCREEN — posts filtered by a topic/hashtag with a header showing the
   topic and post count.
```

---

## Prompt 5 — Circle Genie (AI neighbourhood search)

```
Design "Circle Genie", an AI assistant that answers questions using ONLY real
posts from the user's neighbourhood. Trust and sourcing are the design
priority — every answer must visibly show where it came from.

1. GENIE HOME — a friendly assistant header, a large question input, and
   suggested prompt chips like "Best plumber nearby?", "Any power cut updates?",
   "Good tiffin service?"

2. THINKING/LOADING STATE — a calm, non-gimmicky loading treatment.

3. ANSWER SCREEN — the synthesised answer at top, then a clearly separated
   "Sources" section listing the real neighbour posts it drew from, each with
   author avatar, name, a relative timestamp like "2mo ago", and a snippet.
   Include a subtle freshness warning when sources are old.

4. EMPTY / COLD-START STATE — honest copy for when the neighbourhood has too
   few posts to answer from yet, rather than inventing an answer.
```

---

## Prompt 6 — Bazaar (local marketplace)

```
Design Circle Up's Bazaar — a marketplace where verified neighbours buy and sell
locally. Safety in meeting a stranger is a real design concern.

1. BAZAAR HOME — category filter chips (Furniture, Electronics, Books,
   Clothing, Free), then a two-column listing grid: photo, title, price (with a
   distinct "FREE" treatment), and seller distance.

2. LISTING DETAIL — image carousel, title, price, description, seller card with
   verified badge and neighbourhood, "Message seller" primary button, and a
   discreet "Report listing" action.

3. CREATE LISTING — photo upload grid, title, category picker, price field
   (that can be marked free), description, and a submit button. Include the
   error state where a listing is blocked for mentioning a prohibited item.

4. EMPTY STATE — "Nothing listed in your neighbourhood yet."
```

---

## Prompt 7 — Scenes (local events)

```
Design "Scenes", Circle Up's local events feature.

1. SCENES HOME — upcoming event cards showing cover image, title, date/time
   badge, location, host avatar, and attendee count.

2. EVENT DETAIL — hero image, title, full date/time, location, host card,
   description, an attendee avatar row, and RSVP buttons for Going / Maybe.
   Include the waitlisted state when the guest limit is full, and a cancelled-
   event state.

3. CREATE EVENT — title, description, event type, date & time picker, location,
   guest limit, and a privacy-tier selector with three clearly explained
   options: "Verified neighbours", "Close friends only", "Open to the city".

4. MY EVENTS — tabs for Hosting and Attending, with a cancel-event action that
   warns all RSVPs will be notified.

5. ATTENDEE CHECK-IN (host only) — a list of "going" attendees with a check-in
   toggle, only enabled once the event has started.
```

---

## Prompt 8 — Pages, donations & ads (business side)

```
Design Circle Up's business/organisation features.

1. PAGE TYPE SELECTOR — three large choice cards: Personal, Business, NGO —
   each with an icon, description, and what verification it requires.

2. CREATE PAGE — a form that changes by type (Personal → profession; Business →
   GST number; NGO → Darpan ID). Every compliance field must carry a visible
   "Self-declared, verification pending" label — never imply government
   verification. Includes a "Use my current location" button for the address.

3. MY PAGES — tabs "My Pages" and "Discover", listing page cards with type
   icon, name, and an approval-status badge (PENDING amber / APPROVED green)
   for NGOs.

4. PAGE DETAIL — two variants: (a) owner view with stats (donations received,
   or campaigns and spend) plus a "Promote — Ads Manager" button; (b) visitor
   view with a "Donate" button that is only enabled for approved NGOs, with
   explanatory text when it isn't.

5. DONATE FLOW — preset amount chips (₹100 / ₹500 / ₹1000 / ₹2500) plus a
   custom amount field, a confirmation screen, a payment screen clearly marked
   as a mock gateway in dev, a success screen, and a receipt state that honestly
   communicates "your receipt is being generated, we'll retry if it fails".

6. ADS MANAGER — campaign list with spend, reach, clicks and CTR, plus pause/
   resume toggles per campaign.

7. CREATE AD — a 5-step wizard with a visible step progress bar: Objective →
   Audience (neighbourhoods or radius + vibe targeting) → Budget → Creative →
   Review. Show one screen per step.
```

---

## Prompt 9 — Chats

```
Design Circle Up's messaging.

1. CHATS LIST — conversation rows with avatar, name, message preview, timestamp,
   and unread count badge. Include an empty state.

2. NEW CHAT — searchable list of verified neighbours you can message.

3. CHAT DETAIL — message bubbles (sent vs received), an image message, a voice-
   note message with waveform and play button and duration, a date separator,
   and a composer with camera, mic (showing its active recording state), text
   field and send button. Header shows name, avatar, and call/video icons.

4. BLOCKED / RESTRICTED STATE — what the thread looks like when the other person
   is blocked.
```

---

## Prompt 10 — Profile, settings & retention

```
Design Circle Up's profile and settings.

1. PROFILE TAB — avatar, name, pronouns, bio, link, then a three-stat row:
   Posts / Vibes / Day streak (with a 🔥). "Edit Profile" and "Share Profile"
   buttons, an achievements teaser pill showing points and city rank, the
   user's vibe chips, and a 3-column grid of their posts.

2. EDIT PROFILE — name, username, pronouns, link, bio, then a clearly separated
   "Private info" section (phone) labelled "Only visible to you — never shown on
   your public profile", then the vibes re-picker.

3. SETTINGS — a sectioned list: Community (Verification status, My
   neighbourhood, Close friends), Grow & promote (My Pages, Ads Manager,
   Achievements, Share profile), Account (Edit profile, Switch account, Saved,
   Delete account), Privacy & safety (Blocked users, Trusted contacts, Silent
   phrase), Notifications, Preferences (Language, Terms, Privacy, Help). A
   destructive "Log out" at the bottom.

4. SETTINGS DETAIL SCREENS — design these leaf screens: Verification status
   (membership cards with VERIFIED/PENDING state), Saved posts, Blocked users
   with unblock, Close friends with remove, and Notification preferences with
   three toggles (Safety alerts, Social, Community).

5. DELETE ACCOUNT — a serious but non-manipulative screen explaining exactly
   what happens, requiring the user to type DELETE, with a disabled-until-valid
   destructive button.

6. ACHIEVEMENTS — a hero points card with city rank ("#4 of 128 in your city"),
   then badge cards showing earned vs locked with progress ("0/3"): Safety Star,
   Helping Hand, Scene Regular. Below, a "How points are earned" list making the
   anti-gaming rules explicit (points only for verified actions).

7. SHARE PROFILE — a QR-style share card with avatar, name, @username, a
   copyable profile link, and a share row.

8. ACCOUNT SWITCHER — a sheet listing the personal account (with a check) and
   any business pages the user manages.

9. CREATE MENU SHEET — four options: Post, Story, Highlight, Live — with the
   unavailable ones honestly shown as disabled "Coming soon".

10. NOTIFICATIONS — grouped under Today / Yesterday / This Week headers, with
    All and Unread filter chips. Notification rows carry a type icon and colour
    (points awarded, new circle connection, event cancelled), an unread dot, and
    a "+ Circle back" action button on connection notifications with its
    "Connected" done state.
```

---

## Extra prompts worth running

```
Design an app icon set for Circle Up using the new logo mark — show it on both
light and dark home screens, plus adaptive-icon foreground/background layers
for Android.
```

```
Design the empty, loading and error states for Circle Up as a consistent set —
friendly illustrations in the brand palette, with warm reassuring copy. Cover:
no posts, no listings, no events, no notifications, no search results, network
offline, and something-went-wrong.
```

```
Design a dark mode variant of Circle Up's core screens (home feed, guard, chat,
profile) using the same colour system adapted for dark surfaces. Keep the SOS
red at full strength for safety visibility.
```

---

## Notes for whoever implements the redesign

- The SOS red (`#FF0033`) is intentionally reserved for safety only. If a
  redesign spreads it into ordinary UI, the SOS button stops reading as urgent.
- "Self-declared, verification pending" labels on GST/Darpan fields are a
  compliance requirement, not decoration — see `docs/data-residency-compliance-check.md`.
- Several screens have deliberately honest degraded states (SOS with no network,
  receipt generation failing and retrying, "Coming soon" items). These are
  design requirements, not gaps to polish away.
- Current implemented screens live under `mobile/src/features/*` if you want to
  compare the redesign against what exists.
