import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MapPin, Users } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;
type RsvpStatus = 'going' | 'maybe' | 'waitlisted';

type EventDetail = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  event_type: string;
  starts_at: string;
  location: string;
  privacy_tier: string;
  guest_limit: number | null;
  status: string;
  host: { name: string | null } | null;
};

type Rsvp = { user_id: string; status: RsvpStatus; guest: { name: string | null } | null };

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// Phase 75 (Group H). edgecase.md §7.3 (🟡): cancellation must notify
// every RSVP'd user, not just silently disappear — `cancel_event_and_notify`
// (the migration's SECURITY DEFINER RPC) does the status update AND the
// notification fan-out atomically, so there's no window where the event
// looks cancelled but nobody's been told.
export default function EventDetailScreen({ route }: Props) {
  const { eventId } = route.params;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setMyUserId(user?.id ?? null);

    const { data } = await supabase
      .from('events')
      .select('id, host_id, title, description, event_type, starts_at, location, privacy_tier, guest_limit, status, host:profiles!events_host_id_fkey(name)')
      .eq('id', eventId)
      .single();
    setEvent(data as unknown as EventDetail);

    const { data: rsvpData } = await supabase
      .from('event_rsvps')
      .select('user_id, status, guest:profiles!event_rsvps_user_id_fkey(name)')
      .eq('event_id', eventId);
    setRsvps((rsvpData ?? []) as unknown as Rsvp[]);
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const rsvp = async (status: RsvpStatus) => {
    if (!myUserId) return;
    setBusy(true);
    await supabase.from('event_rsvps').upsert({ event_id: eventId, user_id: myUserId, status }, { onConflict: 'event_id,user_id' });
    setBusy(false);
    load();
  };

  const confirmCancel = async () => {
    setConfirmingCancel(false);
    setBusy(true);
    await supabase.rpc('cancel_event_and_notify', { p_event_id: eventId });
    setBusy(false);
    load();
  };

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#A855F7" />
      </View>
    );
  }

  const isHost = myUserId === event.host_id;
  const myRsvp = rsvps.find((r) => r.user_id === myUserId)?.status ?? null;
  const going = rsvps.filter((r) => r.status === 'going');
  const maybe = rsvps.filter((r) => r.status === 'maybe');
  const waitlisted = rsvps.filter((r) => r.status === 'waitlisted');

  return (
    <ScrollView className="flex-1 bg-white px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      {event.status === 'cancelled' && (
        <View className="px-3 py-2 rounded-xl bg-red-50 mb-3">
          <Text className="text-[12px] font-semibold text-red-600">This event has been cancelled.</Text>
        </View>
      )}

      <Text className="text-[11px] font-semibold text-[#A855F7]">{formatWhen(event.starts_at)}</Text>
      <Text className="text-[20px] font-bold text-[#181C20] mt-1">{event.title}</Text>
      <View className="flex-row items-center gap-1 mt-2">
        <MapPin size={13} color="#6F7881" />
        <Text className="text-[13px] text-ink-muted">{event.location}</Text>
      </View>
      <Text className="text-[13px] text-ink-muted mt-1">Hosted by {event.host?.name ?? 'a neighbour'}</Text>
      <Text className="text-[14px] text-ink-muted mt-3 leading-5">{event.description}</Text>

      {event.status === 'active' && !isHost && (
        <View className="flex-row gap-2 mt-5">
          <Pressable
            onPress={() => rsvp('going')}
            disabled={busy}
            className="flex-1 rounded-xl py-2.5 items-center"
            style={{ backgroundColor: myRsvp === 'going' ? '#A855F7' : myRsvp === 'waitlisted' ? '#FEF3C7' : '#EBEEF4' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: myRsvp === 'going' ? '#fff' : myRsvp === 'waitlisted' ? '#92400E' : '#181C20' }}>
              {myRsvp === 'waitlisted' ? 'Waitlisted' : 'Going'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => rsvp('maybe')}
            disabled={busy}
            className="flex-1 rounded-xl py-2.5 items-center"
            style={{ backgroundColor: myRsvp === 'maybe' ? '#A855F7' : '#EBEEF4' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: myRsvp === 'maybe' ? '#fff' : '#181C20' }}>Maybe</Text>
          </Pressable>
        </View>
      )}

      {isHost && event.status === 'active' && (
        <Pressable onPress={() => setConfirmingCancel(true)} disabled={busy} className="mt-5 bg-red-50 rounded-xl py-2.5 items-center">
          <Text className="text-[13px] font-semibold text-red-600">Cancel event</Text>
        </Pressable>
      )}

      {/* react-native's Alert.alert doesn't render on web (RN Web has no
          built-in implementation) — a Modal-based confirm, same pattern as
          ModerationMenu, works identically across web/iOS/Android. */}
      <Modal visible={confirmingCancel} transparent animationType="fade" onRequestClose={() => setConfirmingCancel(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setConfirmingCancel(false)}>
          <Pressable className="bg-white rounded-t-2xl px-5 pt-5 pb-8" onPress={(e) => e.stopPropagation()}>
            <Text className="text-[16px] font-bold text-[#181C20]">Cancel this event?</Text>
            <Text className="text-[13px] text-ink-muted mt-2">Everyone who RSVP'd will be notified.</Text>
            <Pressable onPress={confirmCancel} className="mt-5 bg-red-600 rounded-xl py-3 items-center">
              <Text className="text-white font-semibold text-[14px]">Cancel event</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmingCancel(false)} className="mt-2 bg-surface-container rounded-xl py-3 items-center">
              <Text className="text-[#181C20] font-semibold text-[14px]">Never mind</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <View className="mt-6 pt-4 border-t border-outline-variant">
        <View className="flex-row items-center gap-1.5 mb-3">
          <Users size={14} color="#6F7881" />
          <Text className="text-[13px] font-semibold text-ink-muted">
            {going.length} going{event.guest_limit ? ` / ${event.guest_limit}` : ''}
            {maybe.length > 0 ? ` · ${maybe.length} maybe` : ''}
            {waitlisted.length > 0 ? ` · ${waitlisted.length} waitlisted` : ''}
          </Text>
        </View>
        {rsvps.map((r) => (
          <View key={r.user_id} className="flex-row items-center gap-2.5 py-1.5">
            <Avatar name={r.guest?.name ?? '?'} size={28} />
            <Text className="text-[13px] text-[#181C20] flex-1">{r.guest?.name ?? 'Neighbour'}</Text>
            <Text className="text-[11px] text-ink-muted capitalize">{r.status}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
