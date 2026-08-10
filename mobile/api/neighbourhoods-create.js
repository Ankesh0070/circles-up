// Creates a neighbourhood from the caller's own GPS fix, so someone whose
// area was never seeded can still get through the address gate.
//
// This goes through the backend rather than straight from the client so
// `neighbourhoods` can stay select-only under RLS, and so the boundary is
// always derived from a real coordinate pair instead of whatever a client
// chose to send as a polygon. The dedupe (same name, same area → same row)
// lives in the SQL function, so two neighbours adding "Koramangala" join one
// feed instead of splitting it.
import { createClient } from '@supabase/supabase-js';

// Wide enough that a whole locality shares one feed, tight enough that the
// next suburb over isn't swallowed into it.
const DEFAULT_RADIUS_M = 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ message: 'Neighbourhood service is not configured.' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { name, city, lat, lng } = body ?? {};

  if (!name?.trim() || !city?.trim()) {
    res.status(400).json({ message: 'Neighbourhood name and city are required.' });
    return;
  }
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    res.status(400).json({ message: 'A location fix is required to add a neighbourhood.' });
    return;
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: id, error } = await db.rpc('create_neighbourhood_at', {
      p_name: name.trim(),
      p_city: city.trim(),
      p_lat: lat,
      p_lng: lng,
      p_radius_m: DEFAULT_RADIUS_M,
    });
    if (error) throw error;

    const { data: row, error: readError } = await db
      .from('neighbourhoods')
      .select('id, name, city')
      .eq('id', id)
      .single();
    if (readError) throw readError;

    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ message: e?.message ?? 'Could not add that neighbourhood.' });
  }
}
