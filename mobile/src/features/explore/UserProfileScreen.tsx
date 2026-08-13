import { useCallback, useState } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MessageCircle, MessageSquare, Check } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import { categoryMeta } from '../../shared/data/categories';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

type Profile = {
  name: string;
  bio: string | null;
  avatar_url: string | null;
  vibes: string[];
  neighbourhood_name: string;
  tower: string | null;
  flat: string | null;
  is_same_neighbourhood: boolean;
};

type PostThumb = { id: string; media_urls: string[]; category: string };

// Ported from the prototype's UserProfileScreen (lines 6407–6582) — Add to
// Circle / Message, mutual-circle chips. Uses get_public_profile (Phase 60
// migration) rather than a direct table query so it works identically for
// both discovery tiers, including cross-neighbourhood "From your city"
// profiles that direct RLS wouldn't otherwise expose.
export default function UserProfileScreen({ route }: Props) {
  const { userId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<Profile | null | 'blocked-or-not-found'>(null);
  const [posts, setPosts] = useState<PostThumb[] | null>(null);
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

    const [{ data: mutualRows }, { data: myConnections }, { data: postRows }] = await Promise.all([
      supabase.rpc('mutual_circle', { p_target_user_id: userId }),
      supabase.from('circle_connections').select('connected_user_id').eq('connected_user_id', userId),
      supabase.from('posts').select('id, media_urls, category, created_at').eq('author_id', userId).order('created_at', { ascending: false }),
    ]);
    setMutuals(mutualRows ?? []);
    setConnected((myConnections ?? []).length > 0);
    setPosts((postRows ?? []).map((r) => ({ id: r.id, media_urls: r.media_urls, category: r.category })));
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
        <ActivityIndicator color="#006290" />
      </View>
    );
  }

  if (profile === 'blocked-or-not-found') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-[14px] text-ink-muted text-center">This profile isn't available.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-8" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="items-center">
        <Avatar name={profile.name} size={88} uri={profile.avatar_url} />
        <Text className="text-[20px] font-bold text-[#181C20] mt-3">{profile.name}</Text>
        <Text className="text-[12px] text-ink-muted mt-1">
          {profile.neighbourhood_name}
          {profile.is_same_neighbourhood && profile.flat ? ` · ${profile.flat}` : ''}
        </Text>
        {!profile.is_same_neighbourhood && (
          <View className="mt-1.5 px-2 py-0.5 rounded-full bg-surface-container">
            <Text className="text-[10px] text-ink-muted font-medium">From your city</Text>
          </View>
        )}
        {profile.bio && <Text className="text-[13px] text-ink-muted mt-3 text-center">{profile.bio}</Text>}
      </View>

      {profile.vibes.length > 0 && (
        <View className="flex-row flex-wrap gap-2 justify-center mt-4">
          {profile.vibes.map((v) => (
            <View key={v} className="px-2.5 py-1 rounded-full bg-[#E4F0F8]">
              <Text className="text-[11px] font-medium text-[#006290]">{v}</Text>
            </View>
          ))}
        </View>
      )}

      {mutuals.length > 0 && (
        <View className="flex-row items-center justify-center gap-1.5 mt-4">
          <Text className="text-[12px] text-ink-muted">
            {mutuals.length} mutual{mutuals.length === 1 ? '' : 's'}: {mutuals.map((m) => m.name).join(', ')}
          </Text>
        </View>
      )}

      <View className="flex-row gap-3 mt-6">
        <Pressable
          onPress={addToCircle}
          disabled={connected || connecting}
          className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-2xl"
          style={{ backgroundColor: connected ? '#EBEEF4' : '#006290' }}
        >
          {connecting ? (
            <ActivityIndicator size="small" color={connected ? '#181C20' : '#fff'} />
          ) : (
            <>
              {connected && <Check size={16} color="#181C20" />}
              <Text style={{ color: connected ? '#181C20' : '#fff', fontWeight: '700', fontSize: 13 }}>
                {connected ? 'Added to Circle' : 'Add to Circle'}
              </Text>
            </>
          )}
        </Pressable>
        <Pressable onPress={message} disabled={opening} className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-2xl bg-surface-container">
          {opening ? <ActivityIndicator size="small" color="#181C20" /> : <MessageCircle size={16} color="#181C20" />}
          <Text className="text-[13px] font-bold text-ink">Message</Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap mt-8 -mx-6" style={{ borderTopWidth: 1, borderTopColor: '#EBEEF4', paddingTop: 8 }}>
        {posts === null ? (
          <ActivityIndicator style={{ marginTop: 24, width: '100%' }} color="#006290" />
        ) : posts.length === 0 ? (
          <View className="items-center py-10" style={{ width: '100%' }}>
            <MessageSquare size={28} color="#BEC7D1" />
            <Text className="text-center text-ink-muted text-[13px] mt-2">No posts yet.</Text>
          </View>
        ) : (
          posts.map((item) => {
            const thumb = item.media_urls[0];
            const meta = categoryMeta(item.category);
            const Icon = meta.icon;
            return (
              <Pressable
                key={item.id}
                onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
                style={{ width: '33.33%', aspectRatio: 1, padding: 1 }}
              >
                {thumb ? (
                  <Image source={{ uri: thumb }} style={{ flex: 1 }} resizeMode="cover" />
                ) : (
                  <View className="flex-1 items-center justify-center" style={{ backgroundColor: `${meta.color}1A` }}>
                    <Icon size={20} color={meta.color} />
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
