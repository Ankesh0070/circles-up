import { Inject, Injectable, Logger } from '@nestjs/common';
import { supabaseAdmin } from '../supabase-admin.client';
import { SMS_GATEWAY, type SmsGateway } from '../sms/sms-gateway.interface';
import type { DispatchSosDto, DispatchResult } from './dto';

// Phases 44/45 (implementationplan.md Group E): backend half of SOS
// dispatch. The OTHER half — dialing police (100) / emergency (112) /
// women's helpline (1091) via native tel:/sms: — happens entirely on the
// client (edgecase.md §3.1 🔴: it must work with no mobile data, which
// only the phone's own cellular radio can do, not this backend). This
// service handles the two channels that legitimately need a backend:
// SMS to trusted contacts (needs the gateway credentials) and in-app
// alerts to nearby neighbours (needs a server-side proximity query).
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(@Inject(SMS_GATEWAY) private readonly sms: SmsGateway) {}

  async dispatch(dto: DispatchSosDto): Promise<DispatchResult> {
    const errors: string[] = [];
    const locationLine =
      dto.lat != null && dto.lng != null
        ? `Live location: https://maps.google.com/?q=${dto.lat},${dto.lng}`
        : // edgecase.md §3.8 — proceed without blocking on a perfect GPS fix.
          'Location unavailable — please try calling them directly.';

    const { data: profile } = await supabaseAdmin.from('profiles').select('name').eq('id', dto.userId).single();
    const senderName = profile?.name ?? 'Your neighbour';

    const [trustedContactsDispatched, neighboursAlerted] = await Promise.all([
      this.dispatchToTrustedContacts(dto, senderName, locationLine, errors),
      this.dispatchToNearbyNeighbours(dto, senderName, errors),
    ]);

    return { trustedContactsDispatched, neighboursAlerted, errors };
  }

  private async dispatchToTrustedContacts(
    dto: DispatchSosDto,
    senderName: string,
    locationLine: string,
    errors: string[]
  ): Promise<number> {
    const { data: contacts, error } = await supabaseAdmin
      .from('trusted_contacts')
      .select('id, name, phone')
      .eq('user_id', dto.userId);

    if (error) {
      this.logger.error(`Failed to load trusted contacts: ${error.message}`);
      errors.push('trusted_contacts_lookup_failed');
      return 0;
    }

    let dispatched = 0;
    for (const contact of contacts ?? []) {
      const result = await this.sms.send({
        to: contact.phone,
        body: `🚨 SOS from ${senderName} via Circle Up. They may need help. ${locationLine}`,
      });
      const { error: logError } = await supabaseAdmin.from('sos_dispatch_log').insert({
        sos_event_id: dto.sosEventId,
        channel: 'trusted_contact',
        recipient_phone: contact.phone,
        recipient_name: contact.name,
        delivery_status: result.success ? 'sent' : 'failed',
        delivery_detail: result.error ?? result.messageId ?? null,
      });
      if (logError) {
        this.logger.error(`Failed to log dispatch to ${contact.name}: ${logError.message}`);
        errors.push(`dispatch_log_failed:${contact.id}`);
      }
      if (result.success) dispatched++;
    }
    return dispatched;
  }

  private async dispatchToNearbyNeighbours(dto: DispatchSosDto, senderName: string, errors: string[]): Promise<number> {
    if (dto.lat == null || dto.lng == null) {
      // edgecase.md §3.8: no fix at all means we can't compute "nearest" —
      // trusted-contact dispatch above still proceeds independently.
      return 0;
    }

    const { data: neighbours, error } = await supabaseAdmin.rpc('nearby_verified_neighbours', {
      p_user_id: dto.userId,
      p_lat: dto.lat,
      p_lng: dto.lng,
      p_limit: 5,
    });

    if (error) {
      this.logger.error(`Failed to find nearby neighbours: ${error.message}`);
      errors.push('nearby_neighbours_lookup_failed');
      return 0;
    }

    let alerted = 0;
    for (const neighbour of neighbours ?? []) {
      // Realtime-enabled table (see migration) — this INSERT is what
      // pushes the alert live to the neighbour's Guard screen.
      const { error: logError } = await supabaseAdmin.from('sos_dispatch_log').insert({
        sos_event_id: dto.sosEventId,
        channel: 'nearby_neighbour',
        recipient_user_id: neighbour.user_id,
        recipient_name: neighbour.name,
        delivery_status: 'sent',
        delivery_detail: `${senderName} needs help nearby`,
      });
      if (logError) {
        this.logger.error(`Failed to alert neighbour ${neighbour.name}: ${logError.message}`);
        errors.push(`neighbour_alert_failed:${neighbour.user_id}`);
      } else {
        alerted++;
      }
    }
    return alerted;
  }
}
