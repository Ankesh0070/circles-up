import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Avatar from '../../shared/components/Avatar';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Neighbour = { id: string; name: string | null; avatar_url: string | null };

// Ported from the prototype's NewChatSheet (lines 6833–6880) — searchable
// picker over verified neighbours in your circle. RLS on `profiles`
// (profiles_select_same_neighbourhood, added in Group C) already limits
// results to your visible circle, so we just query it directly.
export default function NewChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<Neighbour[] | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .neq('id', user.id)
      .not('name', 'is', null);
    setUsers(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDm = async (targetId: string) => {
    setOpening(targetId);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('get_or_create_dm', { p_other_user_id: targetId });
    setOpening(null);
    if (rpcError) {
      // Backend surfaces specific error names (see the RPC's raise
      // exception calls) — translate them to human copy here.
      const msg = rpcError.message;
      if (msg.includes('not_in_your_circle')) {
        setError("That person isn't in your verified circle yet.");
      } else {
        setError(msg);
      }
      return;
    }
    if (typeof data !== 'string') {
      setError("Couldn't open the chat — try again.");
      return;
    }
    navigation.replace('ChatDetail', { chatId: data });
  };

  const filtered = (users ?? []).filter((u) => (u.name ?? '').toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 py-3 border-b border-gray-100">
        <Text className="text-[16px] font-bold text-[#1F1B17]">New message</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your circle"
          className="mt-3 px-3 py-2 bg-gray-100 rounded-xl text-[13px]"
        />
        {error !== '' && <Text className="text-[12px] text-red-600 mt-2">{error}</Text>}
      </View>

      {users === null ? (
        <ActivityIndicator className="mt-10" color="#2196D6" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openDm(item.id)}
              disabled={opening === item.id}
              className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50"
            >
              <Avatar name={item.name ?? '?'} size={42} />
              <Text className="flex-1 text-[14px] font-medium text-[#1F1B17]">{item.name ?? 'Neighbour'}</Text>
              {opening === item.id && <ActivityIndicator color="#2196D6" />}
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="text-center text-gray-400 mt-10 text-[13px]">
              No neighbours in your circle yet.
            </Text>
          }
        />
      )}
    </View>
  );
}
