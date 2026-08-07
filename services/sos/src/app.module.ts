import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { SmsModule } from './sms/sms.module';

// SOS Dispatch Service — SOS fan-out to police/helpline/contacts/neighbours (Group E)
//
// Real dispatch logic lands per-phase as Group E is implemented. SmsModule
// exists early (Phase 6) as a dummy/mock provider behind the SmsGateway
// interface — see sms/mock-sms.provider.ts — so the rest of this service can
// be built against a stable contract before a real vendor is contracted.
@Module({
  imports: [SmsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
