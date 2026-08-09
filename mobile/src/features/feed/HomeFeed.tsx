import { useCallback, useState } from 'react';
import { View, FlatList, ActivityIndicator, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import TopBar from './TopBar';
import StoriesBar from './StoriesBar';
import PostCard, { type FeedPost } from './PostCard';
import SponsoredCard from './SponsoredCard';
import { supabase } from '../../shared/api/supabase';
import { getBlockedUserIds } from '../../shared/api/blocks';
import { fetchServedAd, type ServedAd } from '../../shared/api/ads';
import { BACKGROUND, PRIMARY, ON_SURFACE_MUTED } from '../../shared/theme/tokens';
import type { ReactionId } from './ReactionPicker';

// Ported from the prototype's HomeFeed (lines 2273–2285) — TopBar + StoriesBar
// + the post list. Real query scoped to the verified neighbourhood via RLS
// (posts_select_same_neighbourhood — no client-side neighbourhood filter
// needed, the database only returns what's visible), with hidden posts,
// muted authors, AND globally-blocked users filtered client-side.
//
// Phase 63 addition: also scoped to profiles.active_neighbourhood_id — a
// user verified in multiple neighbourhoods (Phase 61) sees ONE feed at a
// time, matching NeighbourhoodSheet's "switch" metaphor, not everything
// merged. Without this, switching neighbourhoods would have no visible
// effect on the feed, which is exactly the kind of silent ambiguity
// edgecase.md §9.1 warns about.
export default function HomeFeed() {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [ad, setAd] = useState<ServedAd | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: profile } = await supabase.from('profiles').select('active_neighbourhood_id').eq('id', user.id).single();
    const activeNeighbourhoodId = profile?.active_neighbourhood_id;
    if (!activeNeighbourhoodId) {
      setPosts([]);
      return;
    }

    fetchServedAd(user.id, activeNeighbourhoodId).then(setAd);

    const [{ data: rows }, { data: hidden }, { data: muted }, blockedIds] = await Promise.all([
      supabase
        .from('posts')
        // Explicit !posts_author_id_fkey — see StoriesBar.tsx's comment on
        // the same PGRST201 "multiple relationships" ambiguity (here,
        // reactions/hidden_posts both also link posts<->profiles).
        .select('id, author_id, category, caption, media_urls, created_at, author:profiles!posts_author_id_fkey(name, avatar_url, created_at), reactions(user_id, type), comments(id)')
        .eq('neighbourhood_id', activeNeighbourhoodId)
        .order('created_at', { ascending: false }),
      supabase.from('hidden_posts').select('post_id').eq('user_id', user.id),
      supabase.from('muted_users').select('muted_user_id').eq('user_id', user.id),
      getBlockedUserIds(user.id),
    ]);

    const hiddenIds = new Set((hidden ?? []).map((h) => h.post_id));
    const mutedIds = new Set((muted ?? []).map((m) => m.muted_user_id));

    const mapped: FeedPost[] = (rows ?? [])
      .filter((r) => !hiddenIds.has(r.id) && !mutedIds.has(r.author_id) && !blockedIds.has(r.author_id))
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <TopBar />
      {posts === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={PRIMARY} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}
          ListHeaderComponent={
            <>
              <StoriesBar />
              {ad && userId && <SponsoredCard ad={ad} userId={userId} />}
            </>
          }
          renderItem={({ item }) => <PostCard post={item} onChanged={load} />}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: ON_SURFACE_MUTED, marginTop: 40, fontSize: 13.5 }}>
              No posts yet — be the first to share something with your circle.
            </Text>
          }
        />
      )}
    </View>
  );
}
