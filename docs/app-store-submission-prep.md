# App Store Submission Prep

**Phase 99 of implementationplan.md Group K, edgecase.md §11.3 (🔴 — the plan's own highest-severity flag in this group).** Depends on Phase 54 (Silent Phrase) and "all" prior phases. The deliverable's own wording is specific: "Silent Phrase mic-policy compliance **pre-validated (not discovered at review)**" — this section is the actual pre-validation, not a promise to do it later, and it found and fixed two real, concrete misconfigurations in `mobile/app.json`.

## 1. Mic-policy pre-validation (the 🔴 item) — real findings, fixed

Read `mobile/app.json`'s permission-plugin config against what the code actually does (grepped every `expo-audio`/`expo-location` call site), rather than assuming the strings were already accurate:

**Finding 1 — the microphone permission string was incomplete.** It read only *"Circle Up needs microphone access to send voice notes in chats"* — true (`ChatDetailScreen.tsx` really does record voice notes via `expo-audio`), but it silently omitted the app's OTHER mic use: Silent Phrase's wake-word listening (`SilentPhraseScreen.tsx`, Phase 54). iOS/Android only have one microphone permission per app — both features share it — so a permission string describing only one of the two real uses is exactly the kind of mismatch app-review guidelines flag, and exactly what "discovered at review" (the bad outcome the plan is naming) looks like in practice. **Fixed:** the string now names both uses, including that Silent Phrase listening only happens when the user has explicitly turned it on in settings and only while the app is in the foreground.

**Finding 2 — the location permission was configured for "Always" access the app never actually requests.** `app.json` set `locationAlwaysAndWhenInUsePermission` (which adds iOS's `NSLocationAlwaysAndWhenInUseUsageDescription` Info.plist key, and implies background location capability), but every real call site (`ShareLocationScreen.tsx`'s `watchPositionAsync`, the SOS flow's `getBestEffortLocation`) uses only `requestForegroundPermissionsAsync` — this app has no background location task (`TaskManager`/`Location.startLocationUpdatesAsync`) anywhere in the codebase. Declaring "Always" capability the app doesn't use adds unnecessary App Store/Play Store review scrutiny (background location is one of the most heavily-scrutinized permission categories on both platforms) for a capability that doesn't exist. **Fixed:** switched to `locationWhenInUsePermission` (foreground-only), matching actual behaviour exactly.

**Why this matters specifically for Silent Phrase (the plan's named concern):** the current build's wake-word detection is `MockWakeWordDetector` — no real on-device listening vendor is contracted yet (`docs/silent-phrase-ios-feasibility-spike.md` already documents this as the honest, deliberate state, same dummy-provider pattern as Phase 6). That means today's build has nothing running that would trip a review flag on its own. But the permission STRING ships regardless of whether the mock or a real detector is wired up behind it — an inaccurate string is a real problem the moment ANY build (including this one) goes to review, independent of which `WakeWordDetector` implementation is active. Fixing it now, rather than "whenever the real vendor gets wired up," is the actual pre-validation the plan asks for.

## 2. Other permission strings (verified accurate, no changes needed)

- **Camera** (`expo-camera`): "verify your identity with a live selfie during signup" — matches `AddressVerificationFlow`'s actual liveness-capture usage exactly.
- **Photo library** (`expo-image-picker`): "as a fallback if camera access isn't available" — matches its actual use across post/story/bazaar-listing image attachment.
- **Notifications** (`expo-notifications`): configured with icon/color, no permission-string mismatch risk (notification permission prompts are OS-standard, not app-authored text).

## 3. Store listing prep checklist (not executed — needs real store accounts + real assets)

No Apple Developer or Google Play Console account exists for this project yet (same gap as the Supabase cloud project — see `README.md`'s "Accounts you need to create" section). What's prepared here is the checklist a real submission needs, so creating those accounts isn't step zero of a blank process:

- [ ] App name/subtitle: "Circle Up" — already set in `app.json`, consistent across the codebase.
- [ ] Bundle identifiers: `com.circleup.app` (both platforms) — already set, consistent, no placeholder left in `app.json` itself (the EAS `projectId` under `extra.eas` IS still a literal placeholder — `REPLACE_WITH_EAS_PROJECT_ID` — and must be replaced with a real EAS project id before any real build).
- [ ] Screenshots (iOS: 6.7"/6.5"/5.5" device sizes; Android: phone + optional tablet) — not produced; needs a real build run through each core flow (Home feed, Circle Guard, Bazaar, Genie) on real or simulated devices.
- [ ] Store description copy — not drafted; should lead with the safety-differentiation angle (Circle Guard/SOS) per `problemstatement.md`'s positioning, once marketing/product signs off on final wording (an engineering draft risks over-promising on SOS reliability — see Phase 56's explicit "don't imply guaranteed response" conclusion, which store copy must respect too).
- [ ] Content rating questionnaire — needs real answers about user-generated content, location sharing, and the emergency-services-adjacent SOS feature; likely lands in a "Teen"/equivalent tier given location + chat + UGC, but the questionnaire itself must be filled out against final store guidelines, not guessed here.
- [ ] Privacy "nutrition label" (iOS App Privacy details / Play Data Safety form) — this is where the DPDP/data-residency work (`docs/data-residency-compliance-check.md`, this same group) becomes directly actionable: both stores require an itemized declaration of exactly what data is collected and why, which maps closely to that document's §2 table.
- [ ] TestFlight/Play Internal Testing round — recommended before public submission, especially to catch anything Phase 96's device-performance gap (no real low-end Android access in this session) couldn't.

## 4. Recommended process before submission

1. Create the real Apple Developer + Google Play Console accounts (paid, org-owned — not something this session can do).
2. Replace the `REPLACE_WITH_EAS_PROJECT_ID` placeholder and run a real EAS build.
3. Work through §3's checklist with real screenshots/copy/ratings answers.
4. Re-verify the two permission-string fixes above survive into the actual built binary's Info.plist/AndroidManifest (a config-plugin regression here would silently undo this section's work).
5. Route the privacy nutrition label specifically past whoever ends up owning `docs/data-residency-compliance-check.md`'s legal review — they should be the same sign-off, not two disconnected processes.
