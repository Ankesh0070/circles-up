// Abstraction over however receipts actually get generated/stored (a real
// implementation would render an 80G-compliant PDF and upload it to
// Storage). Architecture.md §9's open decision #4 — whether Circle Up
// self-issues 80G receipts or NGOs upload their own — is unresolved, so
// this generates a placeholder text receipt rather than a real PDF; the
// retry/reliability machinery around it (receipts.service.ts) is real and
// vendor-independent either way.
export interface ReceiptResult {
  url: string;
}

export const RECEIPT_PROVIDER = Symbol('RECEIPT_PROVIDER');

export interface ReceiptProvider {
  generate(donationId: string, attemptNumber: number): Promise<ReceiptResult>;
}
