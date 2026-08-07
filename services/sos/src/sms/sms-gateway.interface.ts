// Abstraction over whichever SMS gateway gets picked in Phase 6
// (implementationplan.md Group A) — MSG91/Gupshup/Twilio all fit this same
// shape. This is the same channel edgecase.md §3.1/§3.2 requires as the
// primary SOS dispatch path (works without mobile data, unlike push).
// Nothing outside this folder should import a vendor SDK directly; inject
// SMS_GATEWAY instead.

export interface SmsMessage {
  to: string; // E.164 phone number, e.g. +919876543210
  body: string;
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

export const SMS_GATEWAY = Symbol('SMS_GATEWAY');

export interface SmsGateway {
  send(message: SmsMessage): Promise<SmsSendResult>;
}
