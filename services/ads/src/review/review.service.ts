import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { supabaseAdmin } from '../supabase-admin.client';

// Phase 84 (implementationplan.md Group I): manual ad review — edgecase.md
// §8.4 (🟠), elevated scrutiny vs a generic ad platform because users
// extend more trust to a "neighbourhood ad". Same internal-tool shape as
// verification's Phase-18 queue and compliance's NGO review: no auth
// guard, not reachable from the mobile app.
@Injectable()
export class AdReviewService {
  async listPending() {
    // Surfaces the advertiser page's geocode_status alongside each pending
    // campaign (edgecase.md §8.5) — a page whose claimed address doesn't
    // match its neighbourhood is exactly the "no legitimate local
    // presence" signal §8.4 asks a reviewer to weigh.
    const { data, error } = await supabaseAdmin
      .from('ad_campaigns')
      .select('id, page_id, objective, target, headline, body, budget_total, created_at, page:pages!ad_campaigns_page_id_fkey(name, page_type, geocode_status, address)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  async approve(id: string) {
    const { data: campaign, error: fetchError } = await supabaseAdmin
      .from('ad_campaigns')
      .select('id, target, status')
      .eq('id', id)
      .single();
    if (fetchError || !campaign) throw new NotFoundException(`campaign ${id} not found`);
    if (campaign.status !== 'pending_review') {
      throw new BadRequestException(`campaign ${id} is not pending review (status: ${campaign.status})`);
    }

    // edgecase.md §8.7: refuse to activate into a neighbourhood that's
    // already at its concurrent-ad cap, rather than silently over-serving
    // a small society. Only enforced for explicit 'neighbourhoods'-mode
    // targeting — radius-mode campaigns don't have a fixed neighbourhood
    // list to check against without a live geospatial join per
    // neighbourhood, a documented simplification (see the migration).
    const target = campaign.target as { mode?: string; neighbourhood_ids?: string[] };
    if (target.mode === 'neighbourhoods' && Array.isArray(target.neighbourhood_ids)) {
      const atCapacity: string[] = [];
      for (const neighbourhoodId of target.neighbourhood_ids) {
        const [{ data: capData }, { data: countData }] = await Promise.all([
          supabaseAdmin.rpc('neighbourhood_ad_cap', { p_neighbourhood_id: neighbourhoodId }),
          supabaseAdmin.rpc('count_active_campaigns_for_neighbourhood', { p_neighbourhood_id: neighbourhoodId }),
        ]);
        if ((countData ?? 0) >= (capData ?? 1)) atCapacity.push(neighbourhoodId);
      }
      if (atCapacity.length > 0) {
        throw new BadRequestException(
          `cannot approve — at concurrent-ad capacity in ${atCapacity.length} targeted neighbourhood(s): ${atCapacity.join(', ')}`
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from('ad_campaigns')
      .update({ status: 'active' })
      .eq('id', id)
      .select('id, status')
      .single();
    if (error) throw error;
    return data;
  }

  async reject(id: string) {
    const { data, error } = await supabaseAdmin
      .from('ad_campaigns')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select('id, status')
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException(`campaign ${id} not found`);
    return data;
  }
}
