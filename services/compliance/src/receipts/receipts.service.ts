import { Inject, Injectable, Logger } from '@nestjs/common';
import { supabaseAdmin } from '../supabase-admin.client';
import { RECEIPT_PROVIDER, type ReceiptProvider } from './receipt-provider.interface';

// edgecase.md §8.6 (🟠): receipt generation is a reliable async job with
// retries, decoupled from the payment-success response — donations.service's
// confirm() marks payment succeeded and returns immediately regardless of
// what happens here; a failed attempt just leaves receipt_status='pending'/
// 'failed' for reconcile() to retry later. No real queue/cron infra exists
// in this project (same honest gap as Bazaar's stale-listing flagging and
// the lapsed-group-members signal) — reconcile() is the retry mechanism, a
// real deployment wires it to a scheduled job; the endpoint itself is real
// and safely re-callable any number of times (idempotent per donation: a
// donation with receipt_status='generated' is simply skipped).
@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(@Inject(RECEIPT_PROVIDER) private readonly provider: ReceiptProvider) {}

  async attemptGenerate(donationId: string): Promise<{ succeeded: boolean }> {
    const { data: donation, error: fetchError } = await supabaseAdmin
      .from('donations')
      .select('id, receipt_attempts, receipt_status')
      .eq('id', donationId)
      .single();
    if (fetchError || !donation) throw fetchError ?? new Error(`donation ${donationId} not found`);
    if (donation.receipt_status === 'generated') return { succeeded: true };

    try {
      const result = await this.provider.generate(donationId, donation.receipt_attempts);
      await supabaseAdmin
        .from('donations')
        .update({ receipt_status: 'generated', receipt_url: result.url, receipt_attempts: donation.receipt_attempts + 1 })
        .eq('id', donationId);
      return { succeeded: true };
    } catch (e) {
      this.logger.warn(`receipt attempt ${donation.receipt_attempts + 1} failed for donation ${donationId}: ${e instanceof Error ? e.message : e}`);
      await supabaseAdmin
        .from('donations')
        .update({ receipt_status: 'failed', receipt_attempts: donation.receipt_attempts + 1 })
        .eq('id', donationId);
      return { succeeded: false };
    }
  }

  async reconcile(): Promise<{ retried: number; succeeded: number }> {
    const { data: pending, error } = await supabaseAdmin
      .from('donations')
      .select('id')
      .eq('payment_status', 'succeeded')
      .neq('receipt_status', 'generated');
    if (error) throw error;

    let succeeded = 0;
    for (const row of pending ?? []) {
      const result = await this.attemptGenerate(row.id);
      if (result.succeeded) succeeded++;
    }
    return { retried: pending?.length ?? 0, succeeded };
  }
}
