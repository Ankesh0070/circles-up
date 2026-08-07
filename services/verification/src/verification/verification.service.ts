import { Inject, Injectable, Logger } from '@nestjs/common';
import { supabaseAdmin } from '../supabase-admin.client';
import { LIVENESS_PROVIDER, type LivenessProvider } from '../liveness/liveness-provider.interface';
import type { SubmitVerificationDto, SubmitVerificationResult } from './dto';

const GEOFENCE_TOLERANCE_M = 500; // edgecase.md §1.1

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(@Inject(LIVENESS_PROVIDER) private readonly liveness: LivenessProvider) {}

  async submit(dto: SubmitVerificationDto): Promise<SubmitVerificationResult> {
    // Server-side-only checks, in priority order — never trust the client's
    // own "verified" claim (architecture.md §7). Each early-exit records WHY
    // a submission needs manual review (Phase 18), not just that it does.
    let reviewReason: string | undefined;

    if (dto.mocked) {
      // edgecase.md §1.2 — GPS-spoofing apps report a fake location; Android
      // flags this via the `mocked` field plumbed through from Phase 12/15.
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
      if (geoError) {
        this.logger.error(`Geofence check failed: ${geoError.message}`);
        reviewReason = 'geofence_check_error';
      } else if (!withinBounds) {
        reviewReason = 'outside_geofence';
      }
    }

    // Only run the (comparatively expensive) liveness check if nothing above
    // already forced a review — no point calling a paid vendor API for a
    // submission that's going to manual review regardless.
    if (!reviewReason) {
      const liveness = await this.liveness.checkLiveness({
        selfieImageBase64: dto.selfieImageBase64,
        gpsLat: dto.lat,
        gpsLng: dto.lng,
      });
      if (!liveness.passed) {
        // edgecase.md §1.4 — route to manual review, never a hard permanent
        // lockout, since auto-liveness has a real false-reject rate.
        reviewReason = 'liveness_failed';
      }
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

    this.logger.log(`Membership ${data.id} for user ${dto.userId}: ${status}${reviewReason ? ` (${reviewReason})` : ''}`);
    return { membershipId: data.id, status, reviewReason };
  }
}
