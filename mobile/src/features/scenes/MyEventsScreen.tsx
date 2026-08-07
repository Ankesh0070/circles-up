import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Tab = 'upcoming' | 'past';

type MyEvent = {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  status: string;
  isHost: boolean;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// Phase 74 (Group H) — events I'm hosting OR RSVP'd to, split Upcoming/
// Past. Two queries merged client-side (hosted vs RSVP'd), same approach
// TopicScreen uses for Top/Recent/People — no single RLS-visible view
// covers "mine" across both roles.
export default function MyEventsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [events, setEvents] = useState<MyEvent[] | null>(null);

  const load = useCallback(async (activeTab: Tab) => {
    setEvents(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: hosted }, { data: rsvpRows }] = await Promise.all([
      supabase.from('events').select('id, title, starts_at, location, status').eq('host_id', user.id),
      supabase.from('event_rsvps').select('event:events(id, title, starts_at, location, status, host_id)').eq('user_id', user.id),
    ]);

    const byId = new Map<string, MyEvent>();
    for (const e of hosted ?? []) {
      byId.set(e.id, { id: e.id, title: e.title, starts_at: e.starts_at, location: e.location, status: e.status, isHost: true });
    }
    for (const r of rsvpRows ?? []) {
      const e = Array.isArray(r.event) ? r.event[0] : r.event;
      if (e && !byId.has(e.id)) {
        byId.set(e.id, { id: e.id, title: e.title, starts_at: e.starts_at, location: e.location, status: e.status, isHost: e.host_id === user.id });
      }
    }

    const now = Date.now();
    const list = [...byId.values()]
      .filter((e) => (activeTab === 'upcoming' ? new Date(e.starts_at).getTime() >= now : new Date(e.starts_at).getTime() < now))
      .sort((a, b) => (activeTab === 'upcoming' ? 1 : -1) * (new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()));
    setEvents(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(tab);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab])
  );

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="flex-row px-4 py-3 gap-2">
        {(['upcoming', 'past'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className="px-3 py-1.5 rounded-full"
            style={{ backgroundColor: tab === t ? '#A855F7' : '#F3F4F6' }}
          >
            <Text style={{ color: tab === t ? '#fff' : '#374151', fontSize: 12, fontWeight: '700' }}>
              {t === 'upcoming' ? 'Upcoming' : 'Past'}
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
              <View className="flex-row items-center gap-2">
                <Text className="text-[15px] font-bold text-[#1F1B17] flex-1">{item.title}</Text>
                {item.isHost && (
                  <View className="px-2 py-0.5 rounded bg-purple-50">
                    <Text className="text-[10px] font-semibold text-purple-700">HOST</Text>
                  </View>
                )}
                {item.status === 'cancelled' && (
                  <View className="px-2 py-0.5 rounded bg-red-50">
                    <Text className="text-[10px] font-semibold text-red-600">CANCELLED</Text>
                  </View>
                )}
              </View>
              <Text className="text-[12px] text-gray-500 mt-1">{formatWhen(item.starts_at)}</Text>
              <View className="flex-row items-center gap-1 mt-1">
                <MapPin size={12} color="#9CA3AF" />
                <Text className="text-[12px] text-gray-500">{item.location}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text className="text-center text-gray-400 text-[13px] mt-6">Nothing here yet.</Text>}
        />
      )}
    </View>
  );
}
