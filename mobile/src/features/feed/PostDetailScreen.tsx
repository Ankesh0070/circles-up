import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Send } from 'lucide-react-native';
import HumanHeart from '../../shared/components/HumanHeart';
import Avatar from '../../shared/components/Avatar';
import Card from '../../shared/components/Card';
import {
  BACKGROUND,
  SURFACE,
  SURFACE_CONTAINER,
  ON_SURFACE,
  ON_SURFACE_MUTED,
  OUTLINE_VARIANT,
  PRIMARY,
  RADIUS,
} from '../../shared/theme/tokens';
import { supabase } from '../../shared/api/supabase';
import { embedCommentFireAndForget } from '../../shared/api/genie';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

type Comment = {
  id: string;
  author_id: string;
  text: string;
  created_at: string;
  parent_comment_id: string | null;
  author: { name: string | null } | null;
  likeCount: number;
  likedByMe: boolean;
};

// Ported from the prototype's PostDetailScreen (lines 3673–3821) — full
// comment thread with reply-to and comment likes, real persistence.
export default function PostDetailScreen({ route }: Props) {
  const { postId } = route.params;
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: rows } = await supabase
      .from('comments')
      // Explicit !comments_author_id_fkey — same PGRST201 ambiguity as
      // posts/stories (comment_likes is the competing many-to-many path here).
      .select('id, author_id, text, created_at, parent_comment_id, author:profiles!comments_author_id_fkey(name), comment_likes(user_id)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    const mapped: Comment[] = (rows ?? []).map((r) => {
      const author = Array.isArray(r.author) ? r.author[0] : r.author;
      const likes = (r.comment_likes ?? []) as { user_id: string }[];
      return {
        id: r.id,
        author_id: r.author_id,
        text: r.text,
        created_at: r.created_at,
        parent_comment_id: r.parent_comment_id,
        author: author ?? null,
        likeCount: likes.length,
        likedByMe: likes.some((l) => l.user_id === user.id),
      };
    });
    setComments(mapped);
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const submitComment = async () => {
    if (!text.trim() || !userId) return;
    setPosting(true);
    const { data: inserted } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: userId,
        text: text.trim(),
        parent_comment_id: replyTo?.id ?? null,
      })
      .select('id')
      .single();
    if (inserted) embedCommentFireAndForget(inserted.id);
    setText('');
    setReplyTo(null);
    setPosting(false);
    load();
  };

  const toggleLike = async (comment: Comment) => {
    if (!userId) return;
    if (comment.likedByMe) {
      await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', userId);
    } else {
      await supabase.from('comment_likes').upsert({ comment_id: comment.id, user_id: userId });
    }
    load();
  };

  if (comments === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#006290" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <Card style={{ flexDirection: 'row', gap: 12, marginLeft: item.parent_comment_id ? 24 : 0 }}>
            <Avatar name={item.author?.name ?? '?'} size={34} />
            <View style={{ flex: 1 }}>
              {item.parent_comment_id && (
                <Text style={{ fontSize: 11, color: ON_SURFACE_MUTED, fontWeight: '600', marginBottom: 2 }}>Reply</Text>
              )}
              <Text style={{ fontSize: 14, fontWeight: '700', color: ON_SURFACE }}>
                {item.author?.name ?? 'Neighbour'}
              </Text>
              <Text style={{ fontSize: 14, color: ON_SURFACE, marginTop: 3, lineHeight: 20 }}>{item.text}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
                <Pressable onPress={() => setReplyTo({ id: item.id, name: item.author?.name ?? 'Neighbour' })}>
                  <Text style={{ fontSize: 12, color: PRIMARY, fontWeight: '700' }}>Reply</Text>
                </Pressable>
                {item.likeCount > 0 && (
                  <Text style={{ fontSize: 12, color: ON_SURFACE_MUTED }}>
                    {item.likeCount} {item.likeCount === 1 ? 'like' : 'likes'}
                  </Text>
                )}
              </View>
            </View>
            <Pressable onPress={() => toggleLike(item)} hitSlop={8}>
              <HumanHeart size={16} filled={item.likedByMe} />
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: ON_SURFACE_MUTED, fontSize: 13.5, marginTop: 32 }}>
            No comments yet.
          </Text>
        }
      />

      <View style={{ borderTopWidth: 1, borderTopColor: OUTLINE_VARIANT, backgroundColor: SURFACE, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}>
        {replyTo && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: ON_SURFACE_MUTED }}>
              Replying to <Text style={{ fontWeight: '700', color: ON_SURFACE }}>{replyTo.name}</Text>
            </Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Text style={{ fontSize: 12, color: PRIMARY, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a comment…"
            placeholderTextColor={ON_SURFACE_MUTED}
            style={{
              flex: 1,
              backgroundColor: SURFACE_CONTAINER,
              borderRadius: RADIUS.chip,
              paddingHorizontal: 18,
              paddingVertical: 12,
              fontSize: 14,
              color: ON_SURFACE,
            }}
          />
          <Pressable
            onPress={submitComment}
            disabled={posting || !text.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: text.trim() ? PRIMARY : SURFACE_CONTAINER,
            }}
          >
            <Send size={18} color={text.trim() ? '#fff' : ON_SURFACE_MUTED} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
