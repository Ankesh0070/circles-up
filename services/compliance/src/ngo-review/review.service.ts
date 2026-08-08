import { Injectable, NotFoundException } from '@nestjs/common';
import { supabaseAdmin } from '../supabase-admin.client';

// Phase 79 (implementationplan.md Group I): manual NGO donation-eligibility
// review — edgecase.md §8.2 (🔴), no self-service enablement. Same shape
// as services/verification's Phase-18 review queue: this is an internal-
// tool endpoint (no auth guard, not reachable from the mobile app), not a
// screen. `pages.ngo_approval_status` can only be flipped by service_role
// (see the `prevent_page_status_self_edit` trigger) — approve()/reject()
// below are that one legitimate writer.
@Injectable()
export class NgoReviewService {
  async listPending() {
    const { data, error } = await supabaseAdmin
      .from('pages')
      .select('id, owner_id, neighbourhood_id, name, darpan_id, geocode_status, created_at')
      .eq('page_type', 'ngo')
      .eq('ngo_approval_status', 'pending')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  async approve(id: string) {
    const { data, error } = await supabaseAdmin
      .from('pages')
      .update({ ngo_approval_status: 'approved' })
      .eq('id', id)
      .eq('page_type', 'ngo')
      .select('id, ngo_approval_status')
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException(`ngo page ${id} not found`);
    return data;
  }

  async reject(id: string) {
    const { data, error } = await supabaseAdmin
      .from('pages')
      .update({ ngo_approval_status: 'rejected' })
      .eq('id', id)
      .eq('page_type', 'ngo')
      .select('id, ngo_approval_status')
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException(`ngo page ${id} not found`);
    return data;
  }
}
