// Vercel serverless port of services/verification's submit endpoint.
//
// The web demo is served from Vercel, which can't run the NestJS services —
// so without this, signup completes but the address/selfie gate never
// resolves and the user is stranded outside the app forever. This keeps the
// same server-side checks the Nest service does (geofence, then liveness,
// then insert), in the same order and with the same review reasons, so the
// deployed build behaves like the real backend rather than waving people
// through.
//
// The service-role key lives only in Vercel's env (never EXPO_PUBLIC_*), so
// it stays server-side — the client still can't self-declare "verified".
import { createClient } from '@supabase/supabase-js';

const GEOFENCE_TOLERANCE_M = 500; // edgecase.md §1.1

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

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const dto = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  try {
    let reviewReason;

    if (dto.mocked) {
      // edgecase.md §1.2 — GPS-spoofing apps report a fake location.
      reviewReason = 'gps_mocked';
    } else if (dto.source === 'gallery') {
      // edgecase.md §1.8 — a gallery photo has no live-GPS guarantee.
      reviewReason = 'gallery_source';
    } else {
      const { data: withinBounds, error: geoError } = await supabaseAdmin.rpc('is_within_neighbourhood', {
        p_neighbourhood_id: dto.neighbourhoodId,
        p_lat: dto.lat,
        p_lng: dto.lng,
        p_tolerance_m: GEOFENCE_TOLERANCE_M,
      });
      if (geoError) reviewReason = 'geofence_check_error';
      else if (!withinBounds) reviewReason = 'outside_geofence';
    }

    // Mirrors MockLivenessProvider: no vendor is contracted yet, so this
    // passes unless the caller sends the literal 'FORCE_FAIL' sentinel that
    // keeps the manual-review branch (edgecase.md §1.4) exercisable.
    if (!reviewReason && dto.selfieImageBase64 === 'FORCE_FAIL') {
      reviewReason = 'liveness_failed';
    }

    const status = reviewReason ? 'pending' : 'verified';
    const { data, error } = await supabaseAdmin
      .from('society_memberships')
      .insert({
        user_id: dto.userId,
        neighbourhood_id: dto.neighbourhoodId,
        society: dto.society,
        tower: dto.tower,
        flat: dto.flat,
        lat: dto.lat,
        lng: dto.lng,
        gps_accuracy: dto.accuracy,
        gps_mocked: dto.mocked ?? false,
        photo_source: dto.source,
        verification_status: status,
        review_reason: reviewReason,
        verified_at: status === 'verified' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (error) throw error;

    res.status(201).json({ membershipId: data.id, status, reviewReason });
  } catch (e) {
    res.status(500).json({ message: e?.message ?? 'Verification failed' });
  }
}
