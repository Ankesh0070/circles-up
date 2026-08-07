import { Injectable, NotFoundException } from '@nestjs/common';
import { supabaseAdmin } from '../supabase-admin.client';

// Phase 18: manual review queue for submissions the orchestrator couldn't
// auto-approve (see verification.service.ts's `reviewReason`s).
//
// NOTE: no auth guard yet — this is an internal tool endpoint, not
// exposed to the mobile app. Add an admin-auth guard here before this is
// reachable from anywhere but a trusted internal network/dashboard.
@Injectable()
export class ReviewService {
  async listPending() {
    const { data, error } = await supabaseAdmin
      .from('society_memberships')
      .select('id, user_id, neighbourhood_id, society, tower, flat, review_reason, gps_mocked, photo_source, created_at')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  async approve(id: string) {
    const { data, error } = await supabaseAdmin
      .from('society_memberships')
      .update({ verification_status: 'verified', verified_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, verification_status')
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException(`membership ${id} not found`);
    return data;
  }

  async reject(id: string) {
    const { data, error } = await supabaseAdmin
      .from('society_memberships')
      .update({ verification_status: 'rejected' })
      .eq('id', id)
      .select('id, verification_status')
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException(`membership ${id} not found`);
    return data;
  }
}
