import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { SmsModule } from './sms/sms.module';
import { DispatchModule } from './dispatch/dispatch.module';

// SOS Dispatch Service — SOS fan-out to police/helpline/contacts/neighbours (Group E)
//
// DispatchModule (Phases 44/45) is the real orchestration: fan out to
// trusted contacts via SMS + alert nearby verified neighbours in-app.
// Police/emergency/helpline dialing happens client-side (native tel:/sms:,
// edgecase.md §3.1) — this service never touches those channels directly.
@Module({
  imports: [SmsModule, DispatchModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
