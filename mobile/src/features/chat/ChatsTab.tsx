import { useCallback, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, Edit3 } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import Card from '../../shared/components/Card';
import { supabase } from '../../shared/api/supabase';
import {
  BACKGROUND,
  SURFACE,
  SURFACE_CONTAINER,
  ON_SURFACE,
  ON_SURFACE_MUTED,
  PRIMARY,
  RADIUS,
} from '../../shared/theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type ChatRow = {
  id: string;
  is_group: boolean;
  name: string | null;
  emoji: string | null;
  displayName: string;
  displayEmoji: string | null;
  lastMessage: string | null;
  lastAt: string | null;
};

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Ported from the prototype's ChatsTab (lines 2617–2686). Real query over
// chats/chat_members/messages, scoped by RLS (only chats you're a member of).
export default function ChatsTab() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [rows, setRows] = useState<ChatRow[] | null>(null);
  const [query, setQuery] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Chats + all their members (for DM name derivation) + newest message.
    // Uses two round-trips: one for the chat list, one for last-messages,
    // batched into a single IN() query.
    const { data: chats } = await supabase
      .from('chats')
      .select('id, is_group, name, emoji, chat_members(user_id, user:profiles!chat_members_user_id_fkey(name))');

    if (!chats || chats.length === 0) {
      setRows([]);
      return;
    }

    const ids = chats.map((c) => c.id);
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('chat_id, text, kind, created_at')
      .in('chat_id', ids)
      .order('created_at', { ascending: false });

    const lastByChat = new Map<string, { text: string; created_at: string }>();
    for (const m of lastMessages ?? []) {
      if (lastByChat.has(m.chat_id)) continue;
      const preview = m.kind === 'text' ? (m.text ?? '') : m.kind === 'image' ? '📷 Photo' : '🎙 Voice note';
      lastByChat.set(m.chat_id, { text: preview, created_at: m.created_at });
    }

    const mapped: ChatRow[] = chats.map((c) => {
      const members = (c.chat_members ?? []) as { user_id: string; user: { name: string | null } | null | { name: string | null }[] }[];
      let displayName = c.name ?? 'Chat';
      let displayEmoji: string | null = c.emoji ?? null;
      if (!c.is_group) {
        const otherMember = members.find((m) => m.user_id !== user.id);
        const other = Array.isArray(otherMember?.user) ? otherMember?.user[0] : otherMember?.user;
        displayName = other?.name ?? 'Neighbour';
        displayEmoji = null;
      }
      const last = lastByChat.get(c.id);
      return {
        id: c.id,
        is_group: c.is_group,
        name: c.name,
        emoji: c.emoji,
        displayName,
        displayEmoji,
        lastMessage: last?.text ?? null,
        lastAt: last?.created_at ?? null,
      };
    });

    // Sort newest-active first, then title alphabetically for empty ones.
    mapped.sort((a, b) => {
      if (a.lastAt && b.lastAt) return b.lastAt.localeCompare(a.lastAt);
      if (a.lastAt) return -1;
      if (b.lastAt) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

    setRows(mapped);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = (rows ?? []).filter((r) => r.displayName.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: SURFACE,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: ON_SURFACE }}>Chats</Text>
        <Pressable onPress={() => navigation.navigate('NewChat')} hitSlop={8}>
          <Edit3 size={22} color={PRIMARY} strokeWidth={2} />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginHorizontal: 16,
          marginTop: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: SURFACE_CONTAINER,
          borderRadius: RADIUS.chip,
        }}
      >
        <Search size={17} color={ON_SURFACE_MUTED} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats"
          placeholderTextColor={ON_SURFACE_MUTED}
          style={{ flex: 1, fontSize: 14, color: ON_SURFACE }}
        />
      </View>

      {rows === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={PRIMARY} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Card
              onPress={() => navigation.navigate('ChatDetail', { chatId: item.id })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
            >
              {item.displayEmoji ? (
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: SURFACE_CONTAINER,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{item.displayEmoji}</Text>
                </View>
              ) : (
                <Avatar name={item.displayName} size={50} />
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '700', color: ON_SURFACE }} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  {item.lastAt && (
                    <Text style={{ fontSize: 11.5, color: ON_SURFACE_MUTED }}>{timeAgo(item.lastAt)}</Text>
                  )}
                </View>
                <Text style={{ fontSize: 13.5, color: ON_SURFACE_MUTED, marginTop: 3 }} numberOfLines={1}>
                  {item.lastMessage ?? (item.is_group ? 'New group chat' : 'Say hi to your neighbour')}
                </Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: ON_SURFACE_MUTED, marginTop: 40, fontSize: 13.5 }}>
              No chats yet — tap the pencil to start one.
            </Text>
          }
        />
      )}
    </View>
  );
}
