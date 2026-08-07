import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import PostCard, { type FeedPost } from '../feed/PostCard';
import CircleCard from './CircleCard';
import { supabase } from '../../shared/api/supabase';
import { getBlockedUserIds } from '../../shared/api/blocks';
import type { RootStackParamList } from '../../navigation/types';
import type { ReactionId } from '../feed/ReactionPicker';

type Props = NativeStackScreenProps<RootStackParamList, 'Topic'>;
type Tab = 'top' | 'recent' | 'people';

type Person = { user_id: string; name: string; subtitle: string };

// Ported from the prototype's TopicScreen (lines 4147–4227) — Top/Recent/
// People tabs. Real interpretation: "topic" is a keyword matched against
// post captions (Top/Recent) and profile vibes (People) — no hashtag
// extraction system exists elsewhere in the app, so this is a genuine
// working aggregation rather than a stub waiting on a feature that was
// never built.
export default function TopicScreen({ route }: Props) {
  const { topic } = route.params;
  const [tab, setTab] = useState<Tab>('top');
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [people, setPeople] = useState<Person[] | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const blockedIds = await getBlockedUserIds(user.id);

    const { data: rows } = await supabase
      .from('posts')
      .select('id, author_id, category, caption, media_urls, created_at, author:profiles!posts_author_id_fkey(name, avatar_url, created_at), reactions(user_id, type), comments(id)')
      .ilike('caption', `%${topic}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    const mapped: FeedPost[] = (rows ?? [])
      .filter((r) => !blockedIds.has(r.author_id))
      .map((r) => {
        const reactions = (r.reactions ?? []) as { user_id: string; type: ReactionId }[];
        const author = Array.isArray(r.author) ? r.author[0] : r.author;
        return {
          id: r.id,
          author_id: r.author_id,
          category: r.category,
          caption: r.caption,
          media_urls: r.media_urls ?? [],
          created_at: r.created_at,
          author: author ?? null,
          myReaction: reactions.find((x) => x.user_id === user.id)?.type ?? null,
          reactionCount: reactions.length,
          commentCount: (r.comments ?? []).length,
        };
      });
    setPosts(mapped);

    const { data: profile } = await supabase.from('profiles').select('active_neighbourhood_id').eq('id', user.id).single();
    if (profile?.active_neighbourhood_id) {
      // society_memberships.user_id references auth.users, not profiles —
      // no direct FK exists between them for PostgREST to embed through,
      // so this is two separate queries merged client-side, not a join.
      const { data: memberRows } = await supabase
        .from('society_memberships')
        .select('user_id')
        .eq('neighbourhood_id', profile.active_neighbourhood_id)
        .eq('verification_status', 'verified')
        .neq('user_id', user.id);
      const memberIds = (memberRows ?? []).map((r) => r.user_id).filter((id) => !blockedIds.has(id));

      const { data: profileRows } = memberIds.length
        ? await supabase.from('profiles').select('id, name, vibes').in('id', memberIds)
        : { data: [] as { id: string; name: string | null; vibes: string[] }[] };

      const matched: Person[] = (profileRows ?? [])
        .filter((p) => (p.vibes ?? []).some((v: string) => v.toLowerCase().includes(topic.toLowerCase())))
        .map((p) => ({ user_id: p.id, name: p.name ?? 'Neighbour', subtitle: 'Shares this interest' }));
      setPeople(matched);
    } else {
      setPeople([]);
    }
  }, [topic]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-2 border-b border-gray-100">
        <Text className="text-[18px] font-bold text-[#1F1B17]">"{topic}"</Text>
        <View className="flex-row gap-2 mt-3">
          {(['top', 'recent', 'people'] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} className="px-3 py-1.5 rounded-full" style={{ backgroundColor: tab === t ? '#2196D6' : '#F3F4F6' }}>
              <Text style={{ color: tab === t ? '#fff' : '#374151', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === 'people' ? (
        people === null ? (
          <ActivityIndicator className="mt-10" color="#2196D6" />
        ) : (
          <FlatList
            data={people}
            keyExtractor={(p) => p.user_id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            renderItem={({ item }) => (
              <CircleCard userId={item.user_id} name={item.name} subtitle={item.subtitle} alreadyConnected={false} onConnected={load} />
            )}
            ListEmptyComponent={<Text className="text-center text-gray-400 text-[13px] mt-6">No one in your circle shares this vibe yet.</Text>}
          />
        )
      ) : posts === null ? (
        <ActivityIndicator className="mt-10" color="#2196D6" />
      ) : (
        <FlatList
          data={tab === 'top' ? [...posts].sort((a, b) => b.reactionCount - a.reactionCount) : posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} onChanged={load} />}
          ListEmptyComponent={<Text className="text-center text-gray-400 text-[13px] mt-6">No posts mention "{topic}" yet.</Text>}
        />
      )}
    </View>
  );
}
