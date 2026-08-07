import { Module } from '@nestjs/common';
import { LIVENESS_PROVIDER } from './liveness-provider.interface';
import { MockLivenessProvider } from './mock-liveness.provider';
import { LivenessController } from './liveness.controller';

// TODO(Phase 6 decision): once a real vendor is picked and contracted,
// replace `useClass: MockLivenessProvider` with the real provider class
// (implementing the same LivenessProvider interface) — no other file changes.
@Module({
  controllers: [LivenessController],
  providers: [{ provide: LIVENESS_PROVIDER, useClass: MockLivenessProvider }],
  exports: [LIVENESS_PROVIDER],
})
export class LivenessModule {}
