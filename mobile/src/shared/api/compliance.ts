// Demo build: no compliance/payments backend. Donation order + confirm are
// simulated locally so the donate flow completes with a success state.
export type DonationOrder = { donationId: string; orderId: string; amount: number; currency: string };
export type DonationConfirmResult = { donationId: string; paymentStatus: 'succeeded' | 'failed'; error?: string };

export async function createDonationOrder(_ngoPageId: string, _donorId: string, amount: number): Promise<DonationOrder> {
  const donationId = 'don_' + Math.random().toString(36).slice(2, 10);
  return { donationId, orderId: 'order_' + donationId, amount, currency: 'INR' };
}

export async function confirmDonation(donationId: string, _clientPaymentId: string): Promise<DonationConfirmResult> {
  return { donationId, paymentStatus: 'succeeded' };
}
