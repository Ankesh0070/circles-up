import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import GradientRing from '../../shared/components/GradientRing';
import Avatar from '../../shared/components/Avatar';
import { supabase } from '../../shared/api/supabase';
import StoryViewer from './StoryViewer';

export type StoryGroup = {
  authorId: string;
  authorName: string;
  avatarUrl: string | null;
  stories: { id: string; mediaUrl: string; caption: string | null; createdAt: string }[];
  allViewed: boolean;
};

// Ported from the prototype's StoriesBar (lines 1907–1932) — circular story
// rings, unviewed-first ordering, "Your Story" pinned first.
export default function StoriesBar() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [viewerGroup, setViewerGroup] = useState<StoryGroup | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: stories } = await supabase
      .from('stories')
      // Explicit !stories_author_id_fkey needed — PostgREST finds multiple
      // paths between stories and profiles (the direct FK, plus a
      // many-to-many via story_views.viewer_id) and 300s on an unqualified
      // `profiles` embed. Found the same class of bug on posts/comments too
      // once reactions/hidden_posts/comment_likes existed as competing paths.
      .select('id, author_id, media_url, caption, created_at, author:profiles!stories_author_id_fkey(name, avatar_url)')
      .order('created_at', { ascending: true });
    const { data: views } = await supabase.from('story_views').select('story_id').eq('viewer_id', user.id);
    const viewedIds = new Set((views ?? []).map((v) => v.story_id));

    const byAuthor = new Map<string, StoryGroup>();
    for (const s of stories ?? []) {
      const author = Array.isArray(s.author) ? s.author[0] : s.author;
      const existing = byAuthor.get(s.author_id);
      const entry = { id: s.id, mediaUrl: s.media_url, caption: s.caption, createdAt: s.created_at };
      if (existing) {
        existing.stories.push(entry);
        existing.allViewed = existing.allViewed && viewedIds.has(s.id);
      } else {
        byAuthor.set(s.author_id, {
          authorId: s.author_id,
          authorName: author?.name ?? 'Neighbour',
          avatarUrl: author?.avatar_url ?? null,
          stories: [entry],
          allViewed: viewedIds.has(s.id),
        });
      }
    }
    // Unviewed-first ordering, per the prototype.
    setGroups([...byAuthor.values()].sort((a, b) => Number(a.allViewed) - Number(b.allViewed)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh viewed-state ordering whenever this screen regains focus (e.g.
  // returning from the StoryViewer after marking stories viewed).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="items-center mr-4" style={{ width: 64 }}>
          <GradientRing size={64} hasStory={false}>
            <Avatar name="You" size={58} />
          </GradientRing>
          <Text className="text-[11px] text-gray-500 mt-1" numberOfLines={1}>
            Your Story
          </Text>
        </View>

        {groups.map((g) => (
          <Pressable key={g.authorId} onPress={() => setViewerGroup(g)} className="items-center mr-4" style={{ width: 64 }}>
            <GradientRing size={64} active={!g.allViewed}>
              <Avatar name={g.authorName} size={58} />
            </GradientRing>
            <Text className="text-[11px] text-gray-700 mt-1" numberOfLines={1}>
              {g.authorName.split(' ')[0]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {viewerGroup && userId && (
        <StoryViewer group={viewerGroup} viewerId={userId} onClose={() => setViewerGroup(null)} />
      )}
    </>
  );
}
