import { serviceUrl } from './serviceUrl';

const COMPLIANCE_SERVICE_URL = serviceUrl(process.env.EXPO_PUBLIC_COMPLIANCE_SERVICE_URL, 4005);

export type DonationOrder = { donationId: string; orderId: string; amount: number; currency: string };
export type DonationConfirmResult = { donationId: string; paymentStatus: 'succeeded' | 'failed'; error?: string };

export async function createDonationOrder(ngoPageId: string, donorId: string, amount: number): Promise<DonationOrder> {
  const res = await fetch(`${COMPLIANCE_SERVICE_URL}/compliance/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ngoPageId, donorId, amount }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? `Donation order failed: ${res.status}`);
  return body;
}

// `clientPaymentId` stands in for whatever Razorpay Checkout would hand
// back on success — this app has no real Razorpay Checkout SDK wired in
// (no vendor account exists yet, see mock-razorpay.provider.ts), so this
// screen simulates the checkout step itself rather than embedding one.
export async function confirmDonation(donationId: string, clientPaymentId: string): Promise<DonationConfirmResult> {
  const res = await fetch(`${COMPLIANCE_SERVICE_URL}/compliance/donations/${donationId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientPaymentId }),
  });
  if (!res.ok) throw new Error(`Confirm failed: ${res.status}`);
  return res.json();
}
