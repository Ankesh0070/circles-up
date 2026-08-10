// Vercel serverless port of services/ads' serve + click endpoints.
//
// Both are thin wrappers over the `serve_ad_for_user` / `record_ad_click`
// Postgres functions. The budget check deliberately stays in SQL under a row
// lock (edgecase.md §8.3) — it has to be atomic with the spend, and moving it
// up here would reopen the race the SQL transaction closes.
//
// One route handles both actions so the deploy stays within the serverless
// function limit; `action` picks which.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ message: 'Ads service is not configured.' });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const action = req.query?.action ?? 'serve';

  try {
    if (action === 'click') {
      const { error } = await supabaseAdmin.rpc('record_ad_click', {
        p_campaign_id: body.campaignId,
        p_user_id: body.userId,
      });
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    const { data, error } = await supabaseAdmin.rpc('serve_ad_for_user', {
      p_user_id: body.userId,
      p_neighbourhood_id: body.neighbourhoodId,
    });
    if (error) throw error;
    // No eligible campaign is a normal outcome, not an error — the feed
    // simply renders without a sponsored card.
    res.status(200).json(data?.[0] ?? null);
  } catch (e) {
    res.status(500).json({ message: e?.message ?? 'Ads request failed' });
  }
}
