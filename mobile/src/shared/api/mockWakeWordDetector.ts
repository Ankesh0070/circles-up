import type { WakeWordDetector } from './wakeWordDetector';

// DUMMY implementation — no real vendor account/AccessKey exists (see
// docs/silent-phrase-ios-feasibility-spike.md and wakeWordDetector.ts).
// Tracks "listening" state honestly but never fires on its own — the UI's
// "Test trigger" button calls onDetected directly to demonstrate the
// resulting flow without pretending audio detection is actually happening.
export class MockWakeWordDetector implements WakeWordDetector {
  private listening = false;

  async start(_phrase: string, _onDetected: () => void): Promise<void> {
    this.listening = true;
  }

  async stop(): Promise<void> {
    this.listening = false;
  }

  isListening(): boolean {
    return this.listening;
  }
}
