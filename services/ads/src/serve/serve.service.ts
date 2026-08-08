import { Injectable } from '@nestjs/common';
import { supabaseAdmin } from '../supabase-admin.client';

// Phase 83 (implementationplan.md Group I): thin wrapper around the
// `serve_ad_for_user`/`record_ad_click` Postgres functions (the migration's
// comment explains why the hard budget check — edgecase.md §8.3 — lives in
// SQL under a row lock rather than in application code: it has to be
// atomic with the spend, and a round-trip through this service would
// reopen exactly the race a pure-SQL transaction closes). This service
// exists as the intended call boundary from the mobile app (matching
// architecture.md §6.4's "Ads Service runs a budget-pacing loop" framing)
// even though the function itself is `grant execute ... to authenticated`
// and could technically be called directly.
@Injectable()
export class ServeService {
  async serveAd(userId: string, neighbourhoodId: string) {
    const { data, error } = await supabaseAdmin.rpc('serve_ad_for_user', {
      p_user_id: userId,
      p_neighbourhood_id: neighbourhoodId,
    });
    if (error) throw error;
    return data?.[0] ?? null;
  }

  async recordClick(campaignId: string, userId: string) {
    const { error } = await supabaseAdmin.rpc('record_ad_click', { p_campaign_id: campaignId, p_user_id: userId });
    if (error) throw error;
    return { ok: true };
  }
}
