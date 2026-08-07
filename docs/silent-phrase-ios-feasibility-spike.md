# Silent Phrase — iOS Background Listening Feasibility Spike

**Phase 53 of implementationplan.md Group E.** This is a research deliverable, not code — it gates Phase 54 per the plan ("blocks phase completion, gate not a task"). Written before touching Phase 54's implementation, per the plan's explicit ordering.

## Question

Can Circle Up's Silent Phrase feature (edgecase.md §3.4/§3.5, both 🔴) actually deliver on the prototype's implied premise — an **always-listening, silent** voice trigger that fires SOS even when the phone is locked/backgrounded and an abuser is nearby — on iOS?

## Findings

### 1. iOS background microphone access is gated behind `UIBackgroundModes: audio`

An iOS app cannot keep a live microphone stream open while backgrounded/screen-locked unless it declares the `audio` (or `voip`) background mode. That entitlement is meant for apps whose core function is continuous audio (voice recorders, VoIP callers, music apps) — using it purely to run a hidden wake-word detector is a mismatch with its stated purpose.

**Consequence:** App Store Review Guideline 2.5.4 requires background modes be used for their declared purpose. An app requesting `audio` background mode for a feature that isn't audio playback/recording as its primary function is a plausible rejection reason, and even if approved initially, is the kind of thing Apple has pulled apps for later if flagged. This is a real approval risk, not a certainty either way — but it means **shipping this cannot be scheduled with confidence** the way ordinary feature work can.

### 2. Both iOS and Android show a visible "microphone in use" indicator — there is no way to suppress it

- iOS 14+: an orange dot in the status bar/Control Center whenever any app's microphone is active.
- Android 12+: a green dot in the status bar, same purpose.

Neither OS gives an app any way to opt out of this indicator. This is the finding that matters most for Circle Up's actual use case, more than the iOS-specific background restriction: **the entire premise of "invisible" silent activation is false on both platforms**, not just iOS. If Silent Phrase is listening, and someone (an abusive partner, for instance) is looking at the phone, they can see the mic-in-use dot. For the exact high-risk scenario this feature is designed for, that's a real safety consideration, not just an engineering caveat — the wrong assumption here directly undermines the feature's threat model.

### 3. Foreground listening works fine on both platforms today

While Circle Up is open and in the foreground, an on-device wake-word engine (e.g. Picovoice Porcupine, openWakeWord) can reliably listen via the normal microphone APIs on both iOS and Android — no special entitlement needed, standard `NSMicrophoneUsageDescription` / `RECORD_AUDIO` permission is sufficient.

### 4. A real wake-word engine needs its own vendor decision

Picovoice Porcupine (the most common off-the-shelf choice) requires a Picovoice account and an `AccessKey` — another Phase-6-style vendor dependency, not yet made. Free tier exists but still requires signup and a real key to actually run detection; it cannot be faked indefinitely the way the liveness/SMS mocks were, because the on-device model files themselves come from Picovoice's platform.

## Conclusion

**True always-listening, screen-locked, invisible Silent Phrase is not something this build can deliver today on either platform** — not primarily because of iOS's background-mode restriction (though that's real too), but because **neither OS lets an app hide that the microphone is active**. Marketing or building toward "always listening, no one will know" would be building on a false premise.

## Recommendation (carried into Phase 54)

1. Ship Silent Phrase as **foreground-only** on both iOS and Android for this build — matches implementationplan.md's own recommendation to gate Silent Phrase behind a separate release from core Guard (phases 42–52).
2. Label it honestly in the UI: *"Works while Circle Up is open"* — not "always listening."
3. Change the default trigger phrase from the prototype's "order kar do" (edgecase.md §3.4 — too common in ordinary conversation, high false-positive risk) to something distinctive, and warn the user if their custom phrase is a common phrase.
4. Defer real Picovoice integration behind a vendor decision (Phase-6-style dummy-provider pattern: an abstracted `WakeWordDetector` interface with a mock implementation for testing now, real Porcupine model swapped in once an AccessKey exists).
5. Before ever attempting a true background-listening version: get a written answer from Apple (or a developer familiar with recent App Review outcomes for similar apps) on whether the `audio` background mode would be approved for this stated purpose, and accept that even if approved, the visible mic indicator remains — decide whether the feature is still worth building given that constraint, or whether it should be re-scoped (e.g., a physical panic button / power-button-sequence trigger instead, which has no equivalent OS-level visibility problem).
