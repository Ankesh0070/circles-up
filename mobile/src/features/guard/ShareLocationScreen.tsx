import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { MapPinned } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import GradientButton from '../../shared/components/GradientButton';

const DURATIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
];

type Contact = { id: string; name: string };
type ActiveShare = { id: string; expires_at: string; last_lat: number | null; last_lng: number | null };

// Ported from architecture.md's ShareLocationScreen (Phase 51) —
// edgecase.md §3.12 (🟡): auto-stop is HARD-enforced via expires_at set
// once at creation, never extended — not just a UI countdown the user
// could ignore. The watch loop below also self-stops locally the instant
// `now >= expires_at`, so it doesn't rely solely on nobody polling late.
export default function ShareLocationScreen() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(30);
  const [active, setActive] = useState<ActiveShare | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const [starting, setStarting] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: c } = await supabase.from('trusted_contacts').select('id, name').eq('user_id', user.id);
    setContacts(c ?? []);
    const { data: existing } = await supabase
      .from('location_shares')
      .select('id, expires_at, last_lat, last_lng')
      .eq('user_id', user.id)
      .is('stopped_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setActive(existing ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Countdown + hard local auto-stop
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const secs = Math.max(0, Math.floor((new Date(active.expires_at).getTime() - Date.now()) / 1000));
      setRemainingSec(secs);
      if (secs === 0) stop();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // Live position updates while a share is active
  useEffect(() => {
    if (!active) {
      watchRef.current?.remove();
      watchRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted || cancelled) return;
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 20 },
        (pos) => {
          supabase
            .from('location_shares')
            .update({ last_lat: pos.coords.latitude, last_lng: pos.coords.longitude, last_updated_at: new Date().toISOString() })
            .eq('id', active.id)
            .then();
        }
      );
    })();
    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [active?.id]);

  const toggleContact = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const start = async () => {
    if (selected.size === 0) return;
    setStarting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const expiresAt = new Date(Date.now() + duration * 60000).toISOString();
    const { data: share, error } = await supabase
      .from('location_shares')
      .insert({ user_id: user.id, expires_at: expiresAt })
      .select('id, expires_at, last_lat, last_lng')
      .single();
    setStarting(false);
    if (error || !share) return;
    await supabase
      .from('location_share_recipients')
      .insert([...selected].map((contactId) => ({ location_share_id: share.id, trusted_contact_id: contactId })));
    setActive(share);
  };

  const stop = async () => {
    if (!active) return;
    await supabase.from('location_shares').update({ stopped_at: new Date().toISOString() }).eq('id', active.id);
    setActive(null);
  };

  if (contacts === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  if (active) {
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    return (
      <View className="flex-1 bg-white items-center px-6 pt-16">
        <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
          <MapPinned size={32} color="#2196D6" />
        </View>
        <Text className="text-[18px] font-bold text-[#1F1B17] mt-4">Sharing your live location</Text>
        <Text className="text-[13px] text-gray-500 mt-1">
          Auto-stops in {mins}:{String(secs).padStart(2, '0')}
        </Text>
        {active.last_lat != null && (
          <Text className="text-[11px] text-gray-400 mt-2">
            Last update: {active.last_lat.toFixed(4)}, {active.last_lng?.toFixed(4)}
          </Text>
        )}
        <Pressable onPress={stop} className="mt-8 bg-red-600 rounded-2xl px-8 py-3.5">
          <Text className="text-white font-bold">Stop sharing</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-[18px] font-bold text-[#1F1B17]">Share live location</Text>
      <Text className="text-[13px] text-gray-500 mt-1">Auto-stops after the duration you pick — no manual reminder needed.</Text>

      <Text className="text-[12px] font-bold text-gray-400 uppercase mt-6 mb-2">Duration</Text>
      <View className="flex-row flex-wrap gap-2">
        {DURATIONS.map((d) => (
          <Pressable
            key={d.minutes}
            onPress={() => setDuration(d.minutes)}
            className="px-4 py-2 rounded-full"
            style={{ backgroundColor: duration === d.minutes ? '#2196D6' : '#F3F4F6' }}
          >
            <Text style={{ color: duration === d.minutes ? '#fff' : '#374151', fontSize: 13, fontWeight: '600' }}>{d.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text className="text-[12px] font-bold text-gray-400 uppercase mt-6 mb-2">Share with</Text>
      {contacts.length === 0 ? (
        <Text className="text-[13px] text-gray-400">Add a trusted contact first from Guard → Trusted Contacts.</Text>
      ) : (
        contacts.map((c) => (
          <Pressable key={c.id} onPress={() => toggleContact(c.id)} className="flex-row items-center gap-3 py-2.5 border-b border-gray-50">
            <View
              className="w-5 h-5 rounded items-center justify-center"
              style={{ borderWidth: 1.5, borderColor: selected.has(c.id) ? '#2196D6' : '#D1D5DB', backgroundColor: selected.has(c.id) ? '#2196D6' : 'transparent' }}
            >
              {selected.has(c.id) && <Text className="text-white text-[11px]">✓</Text>}
            </View>
            <Text className="text-[14px] text-[#1F1B17]">{c.name}</Text>
          </Pressable>
        ))
      )}

      <View className="mt-6">
        <GradientButton onPress={start} disabled={starting || selected.size === 0}>
          {starting ? 'Starting…' : 'Start sharing'}
        </GradientButton>
      </View>
    </ScrollView>
  );
}
