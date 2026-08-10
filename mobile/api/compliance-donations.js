// Vercel serverless port of services/compliance's donation endpoints.
//
// Create-order and confirm share this route (`?action=`), matching how the
// other ported services are laid out.
//
// Payment handling mirrors MockRazorpayProvider: no Razorpay account is
// contracted, so orders are minted locally and a clientPaymentId prefixed
// "fail_" simulates a signature-verification failure, keeping that branch
// reachable. A real integration would verify an HMAC over order_id|payment_id
// server-side — never trust a client-reported success. Nothing here is a real
// payment, and the UI labels it as such.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ message: 'Compliance service is not configured.' });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const action = req.query?.action ?? 'create';

  try {
    if (action === 'confirm') {
      // The client puts the id in the path (/compliance/donations/:id/confirm)
      // and sends only clientPaymentId in the body, so the rewrite forwards it
      // as a query param.
      const donationId = req.query?.donationId ?? body.donationId;
      const { data: donation, error: fetchError } = await supabaseAdmin
        .from('donations')
        .select('id, razorpay_order_id, payment_status')
        .eq('id', donationId)
        .single();
      if (fetchError || !donation) {
        res.status(404).json({ message: `donation ${donationId} not found` });
        return;
      }
      if (!donation.razorpay_order_id) {
        res.status(400).json({ message: 'donation has no order to confirm' });
        return;
      }

      const clientPaymentId = body.clientPaymentId ?? '';
      if (clientPaymentId.startsWith('fail_')) {
        await supabaseAdmin.from('donations').update({ payment_status: 'failed' }).eq('id', donationId);
        res.status(200).json({ donationId, paymentStatus: 'failed', error: 'mock signature verification failed' });
        return;
      }

      await supabaseAdmin
        .from('donations')
        .update({ payment_status: 'succeeded', razorpay_payment_id: clientPaymentId })
        .eq('id', donationId);

      // Receipt generation is best-effort and deliberately not awaited into
      // the response (edgecase.md §8.6) — the donor's payment already
      // succeeded regardless, and reconcile() picks up any gap later.
      res.status(200).json({ donationId, paymentStatus: 'succeeded' });
      return;
    }

    // --- create order ------------------------------------------------------
    // The insert itself enforces edgecase.md §8.2: a DB trigger rejects it
    // outright unless the target page is an approved NGO.
    const { data: donation, error } = await supabaseAdmin
      .from('donations')
      .insert({ ngo_page_id: body.ngoPageId, donor_id: body.donorId, amount: body.amount })
      .select('id')
      .single();

    if (error) {
      if (error.message === 'ngo_not_approved_for_donations') {
        res.status(400).json({ message: 'This NGO has not been approved to accept donations yet.' });
        return;
      }
      throw error;
    }

    const orderId = `mock_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await supabaseAdmin.from('donations').update({ razorpay_order_id: orderId }).eq('id', donation.id);

    res.status(201).json({ donationId: donation.id, orderId, amount: body.amount, currency: 'INR' });
  } catch (e) {
    res.status(500).json({ message: e?.message ?? 'Donation request failed' });
  }
}
