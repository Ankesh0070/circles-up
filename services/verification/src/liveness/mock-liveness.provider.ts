import { Injectable } from '@nestjs/common';
import type { LivenessProvider, LivenessCheckRequest, LivenessCheckResult } from './liveness-provider.interface';

// DUMMY implementation — Phase 6 vendor (HyperVerge recommended, see
// README.md) is not yet contracted; this is what's currently in the harness
// pending that decision. Swap the binding in liveness.module.ts for a real
// provider once an API key exists — nothing else in this service, or any
// caller of LIVENESS_PROVIDER, should need to change.
//
// Deterministic fake: passes unless the caller sends the literal string
// 'FORCE_FAIL' as the selfie payload, so both branches (edgecase.md §1.4,
// manual-review-on-repeated-fail) are exercisable without a real vendor.
@Injectable()
export class MockLivenessProvider implements LivenessProvider {
  async checkLiveness(req: LivenessCheckRequest): Promise<LivenessCheckResult> {
    const passed = req.selfieImageBase64 !== 'FORCE_FAIL';
    return {
      passed,
      confidence: passed ? 0.97 : 0.12,
      reason: passed ? undefined : 'mock: forced failure for testing',
      provider: 'mock',
    };
  }
}
