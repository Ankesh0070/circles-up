import { useCallback, useState } from 'react';
import { View, FlatList, ActivityIndicator, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import TopBar from './TopBar';
import StoriesBar from './StoriesBar';
import PostCard, { type FeedPost } from './PostCard';
import SponsoredCard from './SponsoredCard';
import { supabase } from '../../shared/api/supabase';
import { getBlockedUserIds } from '../../shared/api/blocks';
import { fetchAdPool, type ServedAd } from '../../shared/api/ads';
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
const ADS_EVERY = 5;

type FeedItem = { kind: 'post'; key: string; post: FeedPost } | { kind: 'ad'; key: string; ad: ServedAd };

export default function HomeFeed() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
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
      setItems([]);
      return;
    }

    const [{ data: rows }, { data: hidden }, { data: muted }, blockedIds, adPool] = await Promise.all([
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
      // Offset by the day-of-year so the feed doesn't always lead with the
      // exact same campaign every time it's reloaded within a session.
      fetchAdPool(user.id, activeNeighbourhoodId, Math.floor(Date.now() / 86_400_000)),
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

    // One sponsored card after every 5 posts (not just once at the top) —
    // cycling through the ad pool rather than repeating a single campaign.
    const merged: FeedItem[] = [];
    let adCursor = 0;
    mapped.forEach((post, i) => {
      merged.push({ kind: 'post', key: post.id, post });
      if (adPool.length > 0 && (i + 1) % ADS_EVERY === 0) {
        const ad = adPool[adCursor % adPool.length];
        merged.push({ kind: 'ad', key: `ad_${ad.campaign_id}_${i}`, ad });
        adCursor++;
      }
    });

    setItems(merged);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <TopBar />
      {items === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={PRIMARY} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}
          ListHeaderComponent={<StoriesBar />}
          renderItem={({ item }) =>
            item.kind === 'ad' ? <SponsoredCard ad={item.ad} userId={userId ?? ''} /> : <PostCard post={item.post} onChanged={load} />
          }
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
