import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, MapPin, CalendarDays } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Tab = 'upcoming' | 'week' | 'hosting';
type RsvpStatus = 'going' | 'maybe' | 'waitlisted';

type EventRow = {
  id: string;
  host_id: string;
  title: string;
  event_type: string;
  starts_at: string;
  location: string;
  privacy_tier: 'verified' | 'close_friends' | 'open';
  guest_limit: number | null;
  host: { name: string | null } | null;
  myRsvp: RsvpStatus | null;
  goingCount: number;
};

const WEEK_MS = 7 * 86400000;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// Phase 72 (Group H) — Upcoming/This week/Hosting tabs, inline RSVP.
// `events` RLS already scopes visibility by privacy_tier (verified/
// close_friends/open — see the migration), so no extra filtering is
// needed here beyond time range and host.
export default function ScenesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const load = useCallback(async (activeTab: Tab) => {
    setEvents(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setMyUserId(user.id);

    let query = supabase
      .from('events')
      .select('id, host_id, title, event_type, starts_at, location, privacy_tier, guest_limit, status, host:profiles!events_host_id_fkey(name), event_rsvps(user_id, status)')
      .eq('status', 'active')
      .order('starts_at', { ascending: true });

    if (activeTab === 'hosting') {
      query = query.eq('host_id', user.id);
    } else {
      query = query.gt('starts_at', new Date().toISOString());
      if (activeTab === 'week') query = query.lt('starts_at', new Date(Date.now() + WEEK_MS).toISOString());
    }

    const { data } = await query;
    setEvents(
      (data ?? []).map((e: any) => ({
        id: e.id,
        host_id: e.host_id,
        title: e.title,
        event_type: e.event_type,
        starts_at: e.starts_at,
        location: e.location,
        privacy_tier: e.privacy_tier,
        guest_limit: e.guest_limit,
        host: Array.isArray(e.host) ? e.host[0] : e.host,
        myRsvp: e.event_rsvps.find((r: any) => r.user_id === user.id)?.status ?? null,
        goingCount: e.event_rsvps.filter((r: any) => r.status === 'going').length,
      }))
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(tab);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab])
  );

  const rsvp = async (eventId: string, status: RsvpStatus) => {
    if (!myUserId) return;
    await supabase.from('event_rsvps').upsert({ event_id: eventId, user_id: myUserId, status }, { onConflict: 'event_id,user_id' });
    load(tab);
  };

  return (
    <View className="flex-1 bg-[#F6F9FF]">
      <View className="flex-row items-center justify-end px-4 pt-3">
        <Pressable onPress={() => navigation.navigate('MyEvents')} className="flex-row items-center gap-1.5">
          <CalendarDays size={14} color="#A855F7" />
          <Text className="text-[12px] font-semibold text-[#A855F7]">My Events</Text>
        </Pressable>
      </View>
      <View className="flex-row px-4 py-3 gap-2">
        {(['upcoming', 'week', 'hosting'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className="px-3 py-1.5 rounded-full"
            style={{ backgroundColor: tab === t ? '#A855F7' : '#EBEEF4' }}
          >
            <Text style={{ color: tab === t ? '#fff' : '#181C20', fontSize: 12, fontWeight: '700' }}>
              {t === 'upcoming' ? 'Upcoming' : t === 'week' ? 'This week' : 'Hosting'}
            </Text>
          </Pressable>
        ))}
      </View>

      {events === null ? (
        <ActivityIndicator className="mt-10" color="#A855F7" />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
              className="bg-white rounded-2xl p-3.5"
              style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
            >
              <Text className="text-[11px] font-semibold text-[#A855F7]">{formatWhen(item.starts_at)}</Text>
              <Text className="text-[15px] font-bold text-[#181C20] mt-1">{item.title}</Text>
              <View className="flex-row items-center gap-1 mt-1">
                <MapPin size={12} color="#6F7881" />
                <Text className="text-[12px] text-ink-muted">{item.location}</Text>
              </View>
              <Text className="text-[11px] text-ink-muted mt-1">
                Hosted by {item.host?.name ?? 'a neighbour'} · {item.goingCount} going
                {item.guest_limit ? ` / ${item.guest_limit}` : ''}
              </Text>

              {item.host_id !== myUserId && (
                <View className="flex-row gap-2 mt-3">
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      rsvp(item.id, 'going');
                    }}
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: item.myRsvp === 'going' ? '#A855F7' : item.myRsvp === 'waitlisted' ? '#FEF3C7' : '#EBEEF4' }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: item.myRsvp === 'going' ? '#fff' : item.myRsvp === 'waitlisted' ? '#92400E' : '#181C20' }}>
                      {item.myRsvp === 'waitlisted' ? 'Waitlisted' : 'Going'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      rsvp(item.id, 'maybe');
                    }}
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: item.myRsvp === 'maybe' ? '#A855F7' : '#EBEEF4' }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: item.myRsvp === 'maybe' ? '#fff' : '#181C20' }}>Maybe</Text>
                  </Pressable>
                </View>
              )}
              {item.host_id === myUserId && (
                <View className="mt-2 px-2 py-0.5 rounded bg-purple-50 self-start">
                  <Text className="text-[10px] font-semibold text-purple-700">HOSTING</Text>
                </View>
              )}
            </Pressable>
          )}
          ListEmptyComponent={<Text className="text-center text-ink-muted text-[13px] mt-6">No events here yet.</Text>}
        />
      )}

      <Pressable
        onPress={() => navigation.navigate('CreateEvent')}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center"
        style={{ backgroundColor: '#A855F7', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}
