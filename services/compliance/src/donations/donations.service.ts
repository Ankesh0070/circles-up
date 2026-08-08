import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { supabaseAdmin } from '../supabase-admin.client';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.interface';
import { ReceiptsService } from '../receipts/receipts.service';

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);

  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
    private readonly receipts: ReceiptsService
  ) {}

  // Phase 80: creates the pending `donations` row first (the DB trigger
  // enforces edgecase.md §8.2 — this insert is rejected outright if the
  // target page isn't an approved NGO), then a payment order against it.
  async createOrder(ngoPageId: string, donorId: string, amount: number) {
    const { data: donation, error } = await supabaseAdmin
      .from('donations')
      .insert({ ngo_page_id: ngoPageId, donor_id: donorId, amount })
      .select('id')
      .single();
    if (error) {
      if (error.message === 'ngo_not_approved_for_donations') {
        throw new BadRequestException('This NGO has not been approved to accept donations yet.');
      }
      throw error;
    }

    const order = await this.payments.createOrder(amount);
    await supabaseAdmin.from('donations').update({ razorpay_order_id: order.orderId }).eq('id', donation.id);

    return { donationId: donation.id, orderId: order.orderId, amount: order.amount, currency: order.currency };
  }

  // edgecase.md §8.6: marks payment succeeded/failed and returns
  // immediately — receipt generation is attempted inline as a best-effort
  // convenience (fast path for the common case) but is NEVER awaited by
  // the response, and its failure never changes payment_status. If it
  // fails here, receipts.reconcile() picks it up later; the donor already
  // has a successful payment either way.
  async confirm(donationId: string, clientPaymentId: string) {
    const { data: donation, error: fetchError } = await supabaseAdmin
      .from('donations')
      .select('id, razorpay_order_id, payment_status')
      .eq('id', donationId)
      .single();
    if (fetchError || !donation) throw new NotFoundException(`donation ${donationId} not found`);
    if (!donation.razorpay_order_id) throw new BadRequestException('donation has no order to confirm');

    const verification = await this.payments.verifyPayment(donation.razorpay_order_id, clientPaymentId);

    if (!verification.verified) {
      await supabaseAdmin.from('donations').update({ payment_status: 'failed' }).eq('id', donationId);
      return { donationId, paymentStatus: 'failed' as const, error: verification.error };
    }

    await supabaseAdmin
      .from('donations')
      .update({ payment_status: 'succeeded', razorpay_payment_id: verification.paymentId })
      .eq('id', donationId);

    this.receipts.attemptGenerate(donationId).catch((e) => {
      this.logger.warn(`inline receipt attempt failed for donation ${donationId}, left for reconcile(): ${e instanceof Error ? e.message : e}`);
    });

    return { donationId, paymentStatus: 'succeeded' as const };
  }
}
