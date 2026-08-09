# Low-End Device Performance Audit

**Phase 96 of implementationplan.md Group K, edgecase.md §11.5.** Depends on "all mobile phases". This is a code-level static audit plus one real, executable bundle-size measurement — **not** a substitute for the real thing the plan actually asks for (a performance sweep on physical low/mid-range Android hardware), which this environment has no access to. §3 is explicit about that gap.

## 1. List virtualization audit (the most common low-end-Android jank source)

Grepped every screen that renders server-fetched data for whether it uses `FlatList`/`SectionList` (virtualized — only renders what's on/near screen) versus a plain `.map()` inside a `ScrollView`/`View` (unvirtualized — renders every item eagerly, the classic cause of frame drops and high memory use on weak devices with long lists).

**Result: every genuinely unbounded, potentially-large list already uses `FlatList`/`SectionList`** — 18 files across the app (`HomeFeed`, `PostDetailScreen`'s comment thread, `ChatsTab`, `NotificationsScreen`, `MyPagesScreen`, `MyEventsScreen`, `ScenesScreen`, `BazaarScreen`, etc.). Cross-checked the remaining screens that use `.map()` instead — every one of them is a genuinely small, structurally-bounded list: form pickers (vibe categories, ad-wizard steps), OTP digit boxes, Settings' fixed row config, a single SOS event's dispatch log (bounded by trusted-contact-limit-of-5 plus a handful of nearby neighbours), `SafetyAlertsFeed`'s `.limit(20)`-capped query. None of these can grow into the hundreds/thousands of items that would make unvirtualized rendering a real problem.

**No fix needed here** — this is a clean result, not a gap being talked past.

## 2. Image handling

`uploadMedia.ts` (Phase 33) already resizes every uploaded image client-side to a max 1600px dimension at 0.8 JPEG quality before upload, for posts, stories, and bazaar listings alike — this bounds both the upload payload AND, just as importantly for low-end devices, the decoded in-memory bitmap size every OTHER user's device has to hold when rendering that image in a feed. No unbounded/full-resolution image path exists anywhere in the app today.

## 3. Real bundle-size measurement (executed) vs. real device profiling (not executed — honest gap)

**Executed:** `npx expo export --platform web` (a real production export, not a dev server) produced a single main JS bundle of **5.7MB uncompressed / 1.13MB gzipped**, 3,508 modules. This is a legitimate, currently-measurable proxy for "how much JavaScript does a client have to parse/execute" — worth tracking over time as the app grows — but it is a **web** bundle, not the actual Hermes bytecode a native Android build ships. Native React Native apps precompile JS to Hermes bytecode at build time, which has materially different size and startup-time characteristics than a browser-interpreted bundle; this number should not be read as "the app's real Android footprint," only as a rough, monitorable trend line for JS-side bloat (e.g. an accidentally-unshaken icon library, a duplicated dependency).

**Not executed, and here's why it's a real gap rather than an oversight:** the plan's actual deliverable — a performance sweep (frame rate, time-to-interactive, memory pressure, thermal throttling behaviour) on real low/mid-range Android hardware (the plan's own example class: a sub-₹10,000 device, likely 3-4GB RAM, a mid-tier MediaTek/Snapdragon SoC) — needs either physical devices or an Android emulator profiling session via Android Studio's own profiler, neither of which exists in this environment (no Android SDK/emulator, no physical device attached to this session). This is the same category of gap as Phase 95's missing Realtime load test: named explicitly rather than silently skipped.

## 4. Recommended real sweep (for whoever has access to the hardware)

1. Acquire or borrow 2-3 representative low/mid-range Android devices (not emulators alone — thermal throttling and real-world RAM pressure don't reproduce well in an emulator).
2. Build a real (not Expo Go, not dev-client) release APK via EAS Build or a local Gradle build.
3. Profile with Android Studio's Profiler (CPU/memory/frame timing) through the app's heaviest real screens: `HomeFeed` (image-heavy feed scroll), `GenieScreen` (LLM round-trip latency perception), `ChatDetailScreen` (Realtime message append under load).
4. Specifically watch cold-start time-to-interactive and scroll frame rate during a fast-fling through `HomeFeed` with 50+ real posts loaded — the one screen combining images + FlatList + Realtime-adjacent state (SponsoredCard fetch) that's most representative of sustained real usage.
5. Feed findings back as normal engineering tickets — this audit doesn't presume there IS a problem, it identifies where to look first.
