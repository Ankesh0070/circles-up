// Abstraction over whichever payment gateway gets picked (Razorpay is the
// plan's explicit choice — architecture.md §7: "PCI scope minimized by
// delegating all card handling to Razorpay Checkout, Circle Up never
// touches raw payment details"). Nothing outside this folder should call
// a vendor SDK directly; inject PAYMENT_PROVIDER instead. Same Phase-6-
// style dummy pattern as SMS/liveness/LLM providers — no real Razorpay
// account exists yet (vendor decision), so this is what real money moving
// through this flow would need, not something actually wired to move it.
export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
}

export interface PaymentVerification {
  verified: boolean;
  paymentId?: string;
  error?: string;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface PaymentProvider {
  createOrder(amount: number): Promise<PaymentOrder>;
  verifyPayment(orderId: string, clientPaymentId: string): Promise<PaymentVerification>;
}
