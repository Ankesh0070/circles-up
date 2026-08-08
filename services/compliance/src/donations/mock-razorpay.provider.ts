import { Injectable, Logger } from '@nestjs/common';
import type { PaymentOrder, PaymentProvider, PaymentVerification } from './payment-provider.interface';

// DUMMY implementation — no real Razorpay account is contracted (same gap
// as Phase 6's SMS/liveness vendors). Swap the binding in donations.module.ts
// for a real RazorpayProvider once an account exists — nothing else in this
// service, or any caller of PAYMENT_PROVIDER, should need to change.
//
// A real integration would create the order via Razorpay's Orders API and
// verify payment via its signature-verification API (HMAC over
// order_id|payment_id using the account's key secret) — never by trusting
// a client-reported "it worked", the same server-side-trust principle
// applied everywhere else in this app (Phase 6's liveness check, SOS
// dispatch logging). This mock exercises a real failure branch (a
// clientPaymentId prefixed "fail_" simulates a signature-verification
// failure) so that path is testable without a real gateway.
@Injectable()
export class MockRazorpayProvider implements PaymentProvider {
  private readonly logger = new Logger(MockRazorpayProvider.name);

  async createOrder(amount: number): Promise<PaymentOrder> {
    const orderId = `mock_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.logger.log(`[MOCK RAZORPAY] created order ${orderId} for amount ${amount}`);
    return { orderId, amount, currency: 'INR' };
  }

  async verifyPayment(orderId: string, clientPaymentId: string): Promise<PaymentVerification> {
    if (clientPaymentId.startsWith('fail_')) {
      return { verified: false, error: 'mock signature verification failed' };
    }
    this.logger.log(`[MOCK RAZORPAY] verified payment ${clientPaymentId} for order ${orderId}`);
    return { verified: true, paymentId: clientPaymentId };
  }
}
