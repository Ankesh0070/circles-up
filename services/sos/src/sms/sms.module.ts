import { Module } from '@nestjs/common';
import { SMS_GATEWAY } from './sms-gateway.interface';
import { MockSmsProvider } from './mock-sms.provider';
import { SmsController } from './sms.controller';

// TODO(Phase 6 decision): once a real vendor is picked and contracted,
// replace `useClass: MockSmsProvider` with the real provider class
// (implementing the same SmsGateway interface) — no other file changes.
@Module({
  controllers: [SmsController],
  providers: [{ provide: SMS_GATEWAY, useClass: MockSmsProvider }],
})
export class SmsModule {}
