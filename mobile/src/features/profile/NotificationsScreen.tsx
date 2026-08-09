import { useCallback, useState } from 'react';
import { View, Text, Pressable, SectionList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bell, Trophy, Users, CalendarX } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  related_id: string | null;
  read: boolean;
  created_at: string;
};

const TYPE_ICON: Record<string, { icon: typeof Bell; color: string }> = {
  points_awarded: { icon: Trophy, color: '#B45309' },
  circle_connection: { icon: Users, color: '#2196D6' },
  event_cancelled: { icon: CalendarX, color: '#DC2626' },
};

function bucketFor(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (d >= startOfToday) return 'Today';
  if (d >= startOfYesterday) return 'Yesterday';
  if (d >= startOfWeek) return 'This Week';
  return 'Older';
}

// Phase 93 — grouped Today/Yesterday/This Week, filters, "+ Circle back".
// The notifications table (created in Group H) has three real writers now:
// cancel_event_and_notify (Phase 75), and this group's
// award_donation_points / check_in_attendee / check_alert_validation_
// threshold / notify_circle_connection triggers — every row on screen
// traces back to a real event, none are seeded/fake.
export default function NotificationsScreen() {
  const [rows, setRows] = useState<Notification[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [connectingBack, setConnectingBack] = useState<string | null>(null);
  const [connectedBack, setConnectedBack] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setRows(data ?? []);

    const circleBackIds = (data ?? []).filter((n) => n.type === 'circle_connection' && n.related_id).map((n) => n.related_id as string);
    if (circleBackIds.length > 0) {
      const { data: existing } = await supabase.from('circle_connections').select('connected_user_id').eq('user_id', user.id).in('connected_user_id', circleBackIds);
      setConnectedBack(new Set((existing ?? []).map((r) => r.connected_user_id)));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const markRead = async (id: string) => {
    if (!userId) return;
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, read: true } : r)) : prev));
    await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', userId);
  };

  const circleBack = async (adderId: string) => {
    if (!userId || connectedBack.has(adderId)) return;
    setConnectingBack(adderId);
    await supabase.from('circle_connections').insert({ user_id: userId, connected_user_id: adderId });
    setConnectedBack((prev) => new Set(prev).add(adderId));
    setConnectingBack(null);
  };

  if (rows === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  const filtered = filter === 'unread' ? rows.filter((r) => !r.read) : rows;
  const buckets = ['Today', 'Yesterday', 'This Week', 'Older'];
  const sections = buckets
    .map((title) => ({ title, data: filtered.filter((r) => bucketFor(r.created_at) === title) }))
    .filter((s) => s.data.length > 0);

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row px-4 py-3 gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full"
            style={{ backgroundColor: filter === f ? '#2196D6' : '#F3F4F6' }}
          >
            <Text style={{ color: filter === f ? '#fff' : '#374151', fontSize: 12, fontWeight: '700' }}>
              {f === 'all' ? 'All' : 'Unread'}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderSectionHeader={({ section }) => (
          <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1 bg-white">{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const meta = TYPE_ICON[item.type] ?? { icon: Bell, color: '#6B7280' };
          const Icon = meta.icon;
          const showCircleBack = item.type === 'circle_connection' && !!item.related_id;
          const alreadyConnected = showCircleBack && connectedBack.has(item.related_id as string);
          return (
            <Pressable onPress={() => markRead(item.id)} className="flex-row items-start gap-3 px-4 py-3">
              <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: `${meta.color}1A` }}>
                <Icon size={16} color={meta.color} />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold text-[#1F1B17]">{item.title}</Text>
                <Text className="text-[12px] text-gray-500 mt-0.5">{item.body}</Text>
                {showCircleBack && (
                  <Pressable
                    onPress={() => circleBack(item.related_id as string)}
                    disabled={alreadyConnected || connectingBack === item.related_id}
                    className="self-start mt-2 px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: alreadyConnected ? '#F3F4F6' : '#2196D6' }}
                  >
                    <Text style={{ color: alreadyConnected ? '#374151' : '#fff', fontSize: 11, fontWeight: '700' }}>
                      {alreadyConnected ? 'Connected' : connectingBack === item.related_id ? 'Connecting…' : '+ Circle back'}
                    </Text>
                  </Pressable>
                )}
              </View>
              {!item.read && <View className="w-2 h-2 rounded-full bg-[#2196D6] mt-1.5" />}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Bell size={28} color="#D1D5DB" />
            <Text className="text-gray-400 text-[13px] mt-2">{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</Text>
          </View>
        }
      />
    </View>
  );
}
