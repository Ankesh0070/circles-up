import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { LivenessModule } from './liveness/liveness.module';
import { VerificationModule } from './verification/verification.module';

// Verification Orchestrator — liveness + GPS geofencing (implementationplan.md Group B)
//
// LivenessModule (Phase 6) provides a swappable liveness backend; ready for
// a real vendor once Phase 6's decision lands, mocked until then.
// VerificationModule (Phases 13/14/15/17/18) is the actual orchestration:
// submit → geofence + mock-location + liveness checks → verified/pending,
// plus the manual review queue for anything that lands on pending.
@Module({
  imports: [LivenessModule, VerificationModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
