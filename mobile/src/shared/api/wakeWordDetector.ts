// Phase 54 (implementationplan.md Group E) — abstraction over whichever
// on-device wake-word engine gets picked (Picovoice Porcupine is the
// default recommendation — see docs/silent-phrase-ios-feasibility-spike.md
// §4). Same dummy-provider pattern as Phase 6's LivenessProvider/SmsGateway:
// nothing outside this file should import a vendor SDK directly.
//
// Per the spike's conclusion, this only ever needs to run in the
// foreground — no background/locked-screen listening capability is
// expected of any implementation of this interface.
export interface WakeWordDetector {
  start(phrase: string, onDetected: () => void): Promise<void>;
  stop(): Promise<void>;
  isListening(): boolean;
}

export const WAKE_WORD_DETECTOR_UNAVAILABLE_REASON =
  'Real on-device detection needs a Picovoice (or similar) vendor account and AccessKey — not yet contracted. Use "Test trigger" below to see what firing the phrase would do.';
