import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { resolveDevUrl } from './devHost';

const SOS_SERVICE_URL = resolveDevUrl(process.env.EXPO_PUBLIC_SOS_SERVICE_URL ?? 'http://127.0.0.1:4002');

// edgecase.md §3.1 (🔴) — these three MUST be dialed via the phone's own
// cellular radio (native tel:), never routed through our backend/SMS
// gateway, so they still work with mobile data off. This is the single
// most important design decision in this whole module.
export const EMERGENCY_CHANNELS = [
  { id: 'police' as const, label: 'Police', number: '100' },
  { id: 'emergency112' as const, label: 'Emergency (All services)', number: '112' },
  { id: 'women_helpline' as const, label: "Women's Helpline", number: '1091' },
];

export type SosLocation = { lat: number | null; lng: number | null; accuracy: number | null };

// edgecase.md §3.8 — best-effort location, never blocks SOS on a perfect
// fix. A short timeout + graceful null fallback rather than an indefinite
// wait for GPS lock while someone is in danger.
export async function getBestEffortLocation(): Promise<SosLocation> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) {
      const req = await Location.requestForegroundPermissionsAsync();
      if (!req.granted) return { lat: null, lng: null, accuracy: null };
    }
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (!pos) return { lat: null, lng: null, accuracy: null };
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
  } catch {
    return { lat: null, lng: null, accuracy: null };
  }
}

// Phase 97 (edgecase.md §11.6, network-degradation testing) found a real
// bug here: this used to generate the sos_events id server-side (via
// `.select('id').single()` after insert), which meant the ONE channel
// documented above as needing to survive zero connectivity (native tel:)
// could never fire until AFTER a successful network round-trip had
// already completed — exactly backwards from "works without data".
// Generating the id client-side lets the caller dial the phone first and
// durably record the event afterward, whenever the network comes back.
export function generateSosEventId(): string {
  return Crypto.randomUUID();
}

export async function createSosEvent(
  id: string,
  userId: string,
  loc: SosLocation,
  triggeredVia: 'button' | 'silent_phrase'
) {
  const { error } = await supabase
    .from('sos_events')
    .insert({ id, user_id: userId, lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, triggered_via: triggeredVia });
  if (error) throw error;
  return id;
}

// The actual phone dial — no network, no database, nothing that can be
// slow or fail due to connectivity. Split out from the audit-log write
// below so a dead network can never delay or block this call.
export async function dialTelOnly(channel: (typeof EMERGENCY_CHANNELS)[number]): Promise<boolean> {
  const url = `tel:${channel.number}`;
  const can = await Linking.canOpenURL(url);
  if (can) await Linking.openURL(url);
  return can;
}

// Self-reports a dial attempt into the audit trail (edgecase.md §3.9/§3.13).
// Best-effort and non-throwing on purpose: by the time this runs, the
// actual dial (dialTelOnly, above) has already happened — losing this log
// row to a dead network is an acceptable, honest trade-off, not something
// that should make the SOS flow look like it failed when the part that
// actually matters (getting a real call placed) already succeeded.
export async function logDispatchAttempt(
  sosEventId: string,
  channel: (typeof EMERGENCY_CHANNELS)[number],
  dialed: boolean
): Promise<void> {
  try {
    await supabase.from('sos_dispatch_log').insert({
      sos_event_id: sosEventId,
      channel: channel.id,
      recipient_phone: channel.number,
      recipient_name: channel.label,
      delivery_status: dialed ? 'dialed' : 'failed',
      delivery_detail: dialed ? null : 'device could not open tel: URL',
    });
  } catch {
    // best-effort — see comment above.
  }
}

export type DispatchResult = { trustedContactsDispatched: number; neighboursAlerted: number; errors: string[] };

// Backend fan-out — trusted contacts (SMS) + nearby verified neighbours
// (in-app). See services/sos/src/dispatch for the implementation.
export async function dispatchToBackend(userId: string, sosEventId: string, loc: SosLocation): Promise<DispatchResult> {
  const res = await fetch(`${SOS_SERVICE_URL}/sos/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, sosEventId, lat: loc.lat, lng: loc.lng }),
  });
  if (!res.ok) throw new Error(`SOS dispatch failed: ${res.status}`);
  return res.json();
}

export async function resolveSosEvent(sosEventId: string) {
  await supabase.from('sos_events').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', sosEventId);
}

export async function cancelSosEvent(sosEventId: string | null) {
  if (sosEventId) {
    await supabase.from('sos_events').update({ status: 'cancelled', resolved_at: new Date().toISOString() }).eq('id', sosEventId);
  }
}

// Phase 49 (edgecase.md §3.3): log every countdown cancel so repeated
// false triggers can be detected.
export async function logSosCancel(userId: string) {
  await supabase.from('sos_cancels').insert({ user_id: userId });
}

const FALSE_TRIGGER_WINDOW_DAYS = 7;
const FALSE_TRIGGER_THRESHOLD = 3;

export async function shouldWarnAboutFalseTriggers(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - FALSE_TRIGGER_WINDOW_DAYS * 86400000).toISOString();
  const { count } = await supabase
    .from('sos_cancels')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('cancelled_at', since);
  return (count ?? 0) >= FALSE_TRIGGER_THRESHOLD;
}

// Android is the only platform with a `tel:` handler in this dev
// environment's web preview — real device testing needed for iOS.
export const supportsNativeDialing = Platform.OS !== 'web';
