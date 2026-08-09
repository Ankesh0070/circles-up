import { useCallback, useState } from 'react';
import { View, Text, Pressable, Image, FlatList, ActivityIndicator, Linking } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Settings as SettingsIcon, Plus, Link as LinkIcon, Trophy, MessageSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../../shared/components/Avatar';
import Card from '../../shared/components/Card';
import { supabase } from '../../shared/api/supabase';
import { categoryMeta } from '../../shared/data/categories';
import {
  BACKGROUND,
  ON_SURFACE,
  ON_SURFACE_MUTED,
  OUTLINE_VARIANT,
  SURFACE_CONTAINER,
  PRIMARY,
  RADIUS,
  IG_GRADIENT_COLORS,
  IG_GRADIENT_ANGLE,
} from '../../shared/theme/tokens';
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
        <ActivityIndicator color="#006290" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 52,
          paddingBottom: 10,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: ON_SURFACE }}>
          {profile.username ? `@${profile.username}` : 'Profile'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <Pressable onPress={() => navigation.navigate('ProfileMenu')} hitSlop={8}>
            <Plus size={22} color={ON_SURFACE} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={8}>
            <SettingsIcon size={22} color={ON_SURFACE} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={posts ?? []}
        keyExtractor={(p) => p.id}
        numColumns={3}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {/* Hero card — the design groups identity, stats, actions and
                vibes into one raised card rather than stacking bare rows. */}
            <Card radius={RADIUS.hero} style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Avatar name={profile.name ?? '?'} size={92} />
              <Text style={{ fontSize: 23, fontWeight: '700', color: ON_SURFACE, marginTop: 14 }}>{profile.name}</Text>
              {profile.pronouns && (
                <Text style={{ fontSize: 13, color: ON_SURFACE_MUTED, marginTop: 2 }}>{profile.pronouns}</Text>
              )}
              {profile.bio && (
                <Text style={{ fontSize: 14, color: ON_SURFACE_MUTED, marginTop: 10, textAlign: 'center', lineHeight: 20 }}>
                  {profile.bio}
                </Text>
              )}
              {profile.link && (
                <Pressable
                  onPress={() => Linking.openURL(profile.link!)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}
                >
                  <LinkIcon size={13} color={PRIMARY} />
                  <Text style={{ fontSize: 13, color: PRIMARY, fontWeight: '600' }}>{profile.link}</Text>
                </Pressable>
              )}

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  alignSelf: 'stretch',
                  marginTop: 20,
                  paddingVertical: 16,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: OUTLINE_VARIANT,
                }}
              >
                {[
                  { value: String(posts?.length ?? 0), label: 'Posts' },
                  { value: String(profile.vibes.length), label: 'Vibes' },
                  { value: `${streak}🔥`, label: 'Day streak' },
                ].map((s) => (
                  <View key={s.label} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 19, fontWeight: '700', color: ON_SURFACE }}>{s.value}</Text>
                    <Text style={{ fontSize: 12, color: ON_SURFACE_MUTED, marginTop: 2 }}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' }}>
                <Pressable
                  onPress={() => navigation.navigate('EditProfile')}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: RADIUS.chip,
                    backgroundColor: SURFACE_CONTAINER,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: ON_SURFACE }}>Edit Profile</Text>
                </Pressable>
                <Pressable onPress={() => navigation.navigate('ShareProfile')} style={{ flex: 1 }}>
                  <LinearGradient
                    colors={IG_GRADIENT_COLORS}
                    start={IG_GRADIENT_ANGLE.start}
                    end={IG_GRADIENT_ANGLE.end}
                    style={{ paddingVertical: 12, borderRadius: RADIUS.chip, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#fff' }}>Share</Text>
                  </LinearGradient>
                </Pressable>
              </View>

              {achievements && (
                <Pressable
                  onPress={() => navigation.navigate('Achievements')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: RADIUS.chip,
                    backgroundColor: '#FFFBEB',
                  }}
                >
                  <Trophy size={14} color="#B45309" />
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#B45309' }}>
                    {achievements.total_points} pts · #{achievements.city_rank} in your city
                  </Text>
                </Pressable>
              )}

              {profile.vibes.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                  {profile.vibes.map((v) => (
                    <View
                      key={v}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: RADIUS.chip,
                        backgroundColor: SURFACE_CONTAINER,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: ON_SURFACE }}>{v}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
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
            <MessageSquare size={28} color="#BEC7D1" />
            <Text className="text-center text-ink-muted text-[13px] mt-2">No posts yet.</Text>
          </View>
        }
      />
    </View>
  );
}
