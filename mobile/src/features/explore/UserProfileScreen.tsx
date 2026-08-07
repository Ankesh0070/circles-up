import { useCallback, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MessageCircle, Check } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

type Profile = {
  name: string;
  bio: string | null;
  vibes: string[];
  neighbourhood_name: string;
  tower: string | null;
  flat: string | null;
  is_same_neighbourhood: boolean;
};

// Ported from the prototype's UserProfileScreen (lines 6407–6582) — Add to
// Circle / Message, mutual-circle chips. Uses get_public_profile (Phase 60
// migration) rather than a direct table query so it works identically for
// both discovery tiers, including cross-neighbourhood "From your city"
// profiles that direct RLS wouldn't otherwise expose.
export default function UserProfileScreen({ route }: Props) {
  const { userId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<Profile | null | 'blocked-or-not-found'>(null);
  const [mutuals, setMutuals] = useState<{ user_id: string; name: string }[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_public_profile', { p_target_user_id: userId });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setProfile('blocked-or-not-found');
      return;
    }
    setProfile(row);

    const [{ data: mutualRows }, { data: myConnections }] = await Promise.all([
      supabase.rpc('mutual_circle', { p_target_user_id: userId }),
      supabase.from('circle_connections').select('connected_user_id').eq('connected_user_id', userId),
    ]);
    setMutuals(mutualRows ?? []);
    setConnected((myConnections ?? []).length > 0);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addToCircle = async () => {
    setConnecting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('circle_connections').insert({ user_id: user.id, connected_user_id: userId });
      setConnected(true);
    }
    setConnecting(false);
  };

  const message = async () => {
    setOpening(true);
    const { data, error } = await supabase.rpc('get_or_create_dm', { p_other_user_id: userId });
    setOpening(false);
    if (!error && typeof data === 'string') {
      navigation.replace('ChatDetail', { chatId: data });
    }
  };

  if (profile === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  if (profile === 'blocked-or-not-found') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-[14px] text-gray-500 text-center">This profile isn't available.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-8" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="items-center">
        <Avatar name={profile.name} size={88} />
        <Text className="text-[20px] font-bold text-[#1F1B17] mt-3">{profile.name}</Text>
        <Text className="text-[12px] text-gray-400 mt-1">
          {profile.neighbourhood_name}
          {profile.is_same_neighbourhood && profile.flat ? ` · ${profile.flat}` : ''}
        </Text>
        {!profile.is_same_neighbourhood && (
          <View className="mt-1.5 px-2 py-0.5 rounded-full bg-gray-100">
            <Text className="text-[10px] text-gray-500 font-medium">From your city</Text>
          </View>
        )}
        {profile.bio && <Text className="text-[13px] text-gray-600 mt-3 text-center">{profile.bio}</Text>}
      </View>

      {profile.vibes.length > 0 && (
        <View className="flex-row flex-wrap gap-2 justify-center mt-4">
          {profile.vibes.map((v) => (
            <View key={v} className="px-2.5 py-1 rounded-full bg-[#EBF6FD]">
              <Text className="text-[11px] font-medium text-[#2196D6]">{v}</Text>
            </View>
          ))}
        </View>
      )}

      {mutuals.length > 0 && (
        <View className="flex-row items-center justify-center gap-1.5 mt-4">
          <Text className="text-[12px] text-gray-500">
            {mutuals.length} mutual{mutuals.length === 1 ? '' : 's'}: {mutuals.map((m) => m.name).join(', ')}
          </Text>
        </View>
      )}

      <View className="flex-row gap-3 mt-6">
        <Pressable
          onPress={addToCircle}
          disabled={connected || connecting}
          className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-2xl"
          style={{ backgroundColor: connected ? '#F3F4F6' : '#2196D6' }}
        >
          {connecting ? (
            <ActivityIndicator size="small" color={connected ? '#374151' : '#fff'} />
          ) : (
            <>
              {connected && <Check size={16} color="#374151" />}
              <Text style={{ color: connected ? '#374151' : '#fff', fontWeight: '700', fontSize: 13 }}>
                {connected ? 'Added to Circle' : 'Add to Circle'}
              </Text>
            </>
          )}
        </Pressable>
        <Pressable onPress={message} disabled={opening} className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-2xl bg-gray-100">
          {opening ? <ActivityIndicator size="small" color="#374151" /> : <MessageCircle size={16} color="#374151" />}
          <Text className="text-[13px] font-bold text-gray-700">Message</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
