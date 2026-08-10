// Demo-only bypass for the address/selfie gate on the hosted web build.
//
// The real live-selfie + geofence flow can't run reliably in a desktop/phone
// browser, and it assumes the person is physically inside the neighbourhood —
// so on the deployed demo, signup succeeds and then onboarding is a dead end.
// This calls the demo_complete_verification SQL function (service role,
// centroid location) to create a verified membership, letting the demo
// proceed with a working feed. It deliberately skips the checks the real flow
// enforces; that's why the service-role key stays server-side and the button
// that reaches it is labelled as a demo shortcut.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ message: 'Verification service is not configured.' });
    return;
  }

  const dto = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (!dto?.userId || !dto?.neighbourhoodId) {
    res.status(400).json({ message: 'userId and neighbourhoodId are required.' });
    return;
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await db.rpc('demo_complete_verification', {
      p_user_id: dto.userId,
      p_neighbourhood_id: dto.neighbourhoodId,
      p_society: dto.society ?? 'Demo',
      p_flat: dto.flat ?? '1',
    });
    if (error) throw error;
    res.status(201).json({ membershipId: data, status: 'verified' });
  } catch (e) {
    res.status(500).json({ message: e?.message ?? 'Could not complete demo verification.' });
  }
}
