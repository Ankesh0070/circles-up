import { Injectable, Logger } from '@nestjs/common';
import type { ReceiptProvider, ReceiptResult } from './receipt-provider.interface';

// DUMMY implementation. Deliberately fails on the FIRST attempt for every
// donation (attemptNumber === 0) and succeeds on any retry — this is what
// makes edgecase.md §8.6's "receipt generation must be a reliable async
// job with retries" a real, provable property of this system rather than
// an untested aspiration: without an exercisable failure branch, a retry
// loop that silently never retries anything would look identical to one
// that works, right up until it doesn't in production (same reasoning as
// mock-sms.provider.ts's invalid-format branch).
@Injectable()
export class MockReceiptProvider implements ReceiptProvider {
  private readonly logger = new Logger(MockReceiptProvider.name);

  async generate(donationId: string, attemptNumber: number): Promise<ReceiptResult> {
    if (attemptNumber === 0) {
      this.logger.warn(`[MOCK RECEIPT] simulated transient failure generating receipt for donation ${donationId}`);
      throw new Error('mock receipt generation transient failure');
    }
    const url = `mock://receipts/${donationId}.pdf`;
    this.logger.log(`[MOCK RECEIPT] generated ${url} (attempt ${attemptNumber + 1})`);
    return { url };
  }
}
