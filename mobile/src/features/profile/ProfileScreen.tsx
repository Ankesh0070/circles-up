import { useCallback, useState } from 'react';
import { View, Text, Pressable, Image, FlatList, ActivityIndicator, Linking } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Settings as SettingsIcon, Plus, Link as LinkIcon, Trophy, MessageSquare } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import { supabase } from '../../shared/api/supabase';
import { categoryMeta } from '../../shared/data/categories';
import type { RootStackParamList } from '../../navigation/types';

type Profile = {
  id: string;
  name: string | null;
  username: string | null;
  pronouns: string | null;
  bio: string | null;
  avatar_url: string | null;
  link: string | null;
  vibes: string[];
};

type PostThumb = { id: string; media_urls: string[]; category: string };

// Phase 85 — Stats (Posts/Vibes/Streak), vibe pills, post grid. "Streak" has
// no dedicated column anywhere in the schema; it's honestly derived here
// from posts.created_at (consecutive calendar days with >=1 post, walking
// back from today) rather than inventing a fake counter.
export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostThumb[] | null>(null);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<{ total_points: number; city_rank: number } | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: p }, { data: rows }, { data: ach }] = await Promise.all([
      supabase.from('profiles').select('id, name, username, pronouns, bio, avatar_url, link, vibes').eq('id', user.id).single(),
      supabase.from('posts').select('id, media_urls, category, created_at').eq('author_id', user.id).order('created_at', { ascending: false }),
      supabase.rpc('get_achievements'),
    ]);

    setProfile(p ?? null);
    setPosts((rows ?? []).map((r) => ({ id: r.id, media_urls: r.media_urls, category: r.category })));

    const dates = new Set((rows ?? []).map((r) => new Date(r.created_at).toDateString()));
    let s = 0;
    const cursor = new Date();
    // Today not having a post yet doesn't break the streak — only stepping
    // back past a day with zero posts does.
    if (!dates.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
    while (dates.has(cursor.toDateString())) {
      s += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    setStreak(s);

    const achRow = Array.isArray(ach) ? ach[0] : ach;
    if (achRow) setAchievements({ total_points: achRow.total_points, city_rank: achRow.city_rank });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 pt-12 pb-2">
        <Text className="text-[18px] font-bold text-[#1F1B17]">{profile.username ? `@${profile.username}` : 'Profile'}</Text>
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => navigation.navigate('ProfileMenu')} hitSlop={8}>
            <Plus size={22} color="#1F1B17" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={8}>
            <SettingsIcon size={22} color="#1F1B17" />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => p.id}
        numColumns={3}
        ListHeaderComponent={
          <View className="px-4 pb-4">
            <View className="items-center mt-2">
              <Avatar name={profile.name ?? '?'} size={84} />
              <Text className="text-[19px] font-bold text-[#1F1B17] mt-3">{profile.name}</Text>
              {profile.pronouns && <Text className="text-[12px] text-gray-400 mt-0.5">{profile.pronouns}</Text>}
              {profile.bio && <Text className="text-[13px] text-gray-600 mt-2 text-center">{profile.bio}</Text>}
              {profile.link && (
                <Pressable onPress={() => Linking.openURL(profile.link!)} className="flex-row items-center gap-1 mt-1.5">
                  <LinkIcon size={12} color="#2196D6" />
                  <Text className="text-[12px] text-[#2196D6] font-medium">{profile.link}</Text>
                </Pressable>
              )}
            </View>

            <View className="flex-row justify-around mt-5 py-3 border-y border-gray-100">
              <View className="items-center">
                <Text className="text-[16px] font-bold text-[#1F1B17]">{posts?.length ?? 0}</Text>
                <Text className="text-[11px] text-gray-400">Posts</Text>
              </View>
              <View className="items-center">
                <Text className="text-[16px] font-bold text-[#1F1B17]">{profile.vibes.length}</Text>
                <Text className="text-[11px] text-gray-400">Vibes</Text>
              </View>
              <View className="items-center">
                <Text className="text-[16px] font-bold text-[#1F1B17]">{streak}🔥</Text>
                <Text className="text-[11px] text-gray-400">Day streak</Text>
              </View>
            </View>

            <View className="flex-row gap-2 mt-4">
              <Pressable onPress={() => navigation.navigate('EditProfile')} className="flex-1 py-2.5 rounded-xl bg-gray-100 items-center">
                <Text className="text-[13px] font-bold text-gray-700">Edit Profile</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('ShareProfile')} className="flex-1 py-2.5 rounded-xl bg-gray-100 items-center">
                <Text className="text-[13px] font-bold text-gray-700">Share Profile</Text>
              </Pressable>
            </View>

            {achievements && (
              <Pressable
                onPress={() => navigation.navigate('Achievements')}
                className="flex-row items-center justify-center gap-1.5 mt-3 py-2 rounded-xl bg-[#FFFBEB]"
              >
                <Trophy size={13} color="#B45309" />
                <Text className="text-[12px] font-semibold text-[#B45309]">
                  {achievements.total_points} pts · #{achievements.city_rank} in your city
                </Text>
              </Pressable>
            )}

            {profile.vibes.length > 0 && (
              <View className="flex-row flex-wrap gap-2 justify-center mt-4">
                {profile.vibes.map((v) => (
                  <View key={v} className="px-2.5 py-1 rounded-full bg-[#EBF6FD]">
                    <Text className="text-[11px] font-medium text-[#2196D6]">{v}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const thumb = item.media_urls[0];
          const meta = categoryMeta(item.category);
          const Icon = meta.icon;
          return (
            <Pressable
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
        }}
        ListEmptyComponent={
          <View className="items-center py-10">
            <MessageSquare size={28} color="#D1D5DB" />
            <Text className="text-center text-gray-400 text-[13px] mt-2">No posts yet.</Text>
          </View>
        }
      />
    </View>
  );
}
