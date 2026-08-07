import { Injectable, Logger } from '@nestjs/common';
import type { SmsGateway, SmsMessage, SmsSendResult } from './sms-gateway.interface';

// DUMMY implementation — Phase 6 vendor (MSG91 recommended, see README.md)
// is not yet contracted; this is what's currently in the harness pending
// that decision. Swap the binding in sms.module.ts for a real provider once
// an API key exists — nothing else in this service, or any caller of
// SMS_GATEWAY, should need to change.
//
// Logs instead of sending, and validates E.164-ish shape so the "invalid
// number" failure branch is exercisable without a real vendor.
@Injectable()
export class MockSmsProvider implements SmsGateway {
  private readonly logger = new Logger(MockSmsProvider.name);

  async send(message: SmsMessage): Promise<SmsSendResult> {
    if (!/^\+\d{10,15}$/.test(message.to)) {
      return { success: false, provider: 'mock', error: 'invalid phone number format (expected E.164)' };
    }
    this.logger.log(`[MOCK SMS] to=${message.to} body="${message.body}"`);
    return { success: true, messageId: `mock-${Date.now()}`, provider: 'mock' };
  }
}
