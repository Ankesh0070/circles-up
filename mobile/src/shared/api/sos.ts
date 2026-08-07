import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from './supabase';

const SOS_SERVICE_URL = process.env.EXPO_PUBLIC_SOS_SERVICE_URL ?? 'http://127.0.0.1:4002';

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

export async function createSosEvent(userId: string, loc: SosLocation, triggeredVia: 'button' | 'silent_phrase') {
  const { data, error } = await supabase
    .from('sos_events')
    .insert({ user_id: userId, lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, triggered_via: triggeredVia })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

// Dials via the device's native telephony (works without data) and
// self-reports the attempt into the audit trail (edgecase.md §3.9/§3.13).
// `dialed` records only that the OS call/SMS composer was opened — we have
// no way to confirm the call actually connected, which is an honest
// limitation of native tel:/sms: deep links, not something this code can
// paper over.
export async function dialEmergencyChannel(
  sosEventId: string,
  channel: (typeof EMERGENCY_CHANNELS)[number]
): Promise<boolean> {
  const url = `tel:${channel.number}`;
  const can = await Linking.canOpenURL(url);
  if (can) {
    await Linking.openURL(url);
  }
  await supabase.from('sos_dispatch_log').insert({
    sos_event_id: sosEventId,
    channel: channel.id,
    recipient_phone: channel.number,
    recipient_name: channel.label,
    delivery_status: can ? 'dialed' : 'failed',
    delivery_detail: can ? null : 'device could not open tel: URL',
  });
  return can;
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
