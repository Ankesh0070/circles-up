// Vercel serverless port of services/sos's dispatch endpoint.
//
// Only the two channels that genuinely need a backend live here: SMS to
// trusted contacts (gateway credentials) and alerts to nearby verified
// neighbours (server-side proximity query). Dialling 100/112/1091 stays on
// the client and is unaffected by this — edgecase.md §3.1 requires it to work
// with no data connection at all, which no backend can satisfy.
//
// Without this deployed, every SOS on the web build surfaced a dispatch error
// after the native dial, so the Guard screen looked broken even though the
// call itself had gone through.
import { createClient } from '@supabase/supabase-js';

// Mirrors MockSmsProvider: no SMS vendor is contracted yet, so this logs and
// still validates E.164 shape, keeping the "invalid number" failure branch
// reachable rather than reporting every send as a success.
function sendSms(to, body) {
  if (!/^\+\d{10,15}$/.test(to)) {
    return { success: false, provider: 'mock', error: 'invalid phone number format (expected E.164)' };
  }
  console.log(`[MOCK SMS] to=${to} body="${body}"`);
  return { success: true, messageId: `mock-${Date.now()}`, provider: 'mock' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ message: 'SOS service is not configured.' });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const dto = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const errors = [];

  try {
    // edgecase.md §3.8 — a missing fix must not block the dispatch.
    const locationLine =
      dto.lat != null && dto.lng != null
        ? `Live location: https://maps.google.com/?q=${dto.lat},${dto.lng}`
        : 'Location unavailable — please try calling them directly.';

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', dto.userId)
      .single();
    const senderName = profile?.name ?? 'Your neighbour';

    // --- trusted contacts -------------------------------------------------
    let trustedContactsDispatched = 0;
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('trusted_contacts')
      .select('id, name, phone')
      .eq('user_id', dto.userId);

    if (contactsError) {
      errors.push('trusted_contacts_lookup_failed');
    } else {
      for (const contact of contacts ?? []) {
        const result = sendSms(
          contact.phone,
          `🚨 SOS from ${senderName} via Circle Up. They may need help. ${locationLine}`
        );
        const { error: logError } = await supabaseAdmin.from('sos_dispatch_log').insert({
          sos_event_id: dto.sosEventId,
          channel: 'trusted_contact',
          recipient_phone: contact.phone,
          recipient_name: contact.name,
          delivery_status: result.success ? 'sent' : 'failed',
          delivery_detail: result.error ?? result.messageId ?? null,
        });
        if (logError) errors.push(`dispatch_log_failed:${contact.id}`);
        if (result.success) trustedContactsDispatched++;
      }
    }

    // --- nearby neighbours ------------------------------------------------
    let neighboursAlerted = 0;
    if (dto.lat != null && dto.lng != null) {
      const { data: neighbours, error: nearbyError } = await supabaseAdmin.rpc('nearby_verified_neighbours', {
        p_user_id: dto.userId,
        p_lat: dto.lat,
        p_lng: dto.lng,
        p_limit: 5,
      });

      if (nearbyError) {
        errors.push('nearby_neighbours_lookup_failed');
      } else {
        for (const neighbour of neighbours ?? []) {
          // sos_dispatch_log is Realtime-published, so this INSERT is what
          // pushes the alert onto the neighbour's Guard screen live.
          const { error: logError } = await supabaseAdmin.from('sos_dispatch_log').insert({
            sos_event_id: dto.sosEventId,
            channel: 'nearby_neighbour',
            recipient_user_id: neighbour.user_id,
            recipient_name: neighbour.name,
            delivery_status: 'sent',
            delivery_detail: `${senderName} needs help nearby`,
          });
          if (logError) errors.push(`neighbour_alert_failed:${neighbour.user_id}`);
          else neighboursAlerted++;
        }
      }
    }

    res.status(201).json({ trustedContactsDispatched, neighboursAlerted, errors });
  } catch (e) {
    res.status(500).json({ message: e?.message ?? 'Dispatch failed', errors });
  }
}
