import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import HumanHeart from '../../shared/components/HumanHeart';
import Avatar from '../../shared/components/Avatar';
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
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, gap: 14 }}
        renderItem={({ item }) => (
          <View className="flex-row gap-2.5">
            <Avatar name={item.author?.name ?? '?'} size={30} />
            <View className="flex-1">
              {item.parent_comment_id && <Text className="text-[10px] text-gray-400">Replying</Text>}
              <Text className="text-[13px]">
                <Text className="font-semibold text-[#1F1B17]">{item.author?.name ?? 'Neighbour'}</Text>{' '}
                <Text className="text-[#1F1B17]">{item.text}</Text>
              </Text>
              <View className="flex-row items-center gap-3 mt-1">
                <Pressable onPress={() => setReplyTo({ id: item.id, name: item.author?.name ?? 'Neighbour' })}>
                  <Text className="text-[11px] text-gray-400 font-medium">Reply</Text>
                </Pressable>
                {item.likeCount > 0 && <Text className="text-[11px] text-gray-400">{item.likeCount} likes</Text>}
              </View>
            </View>
            <Pressable onPress={() => toggleLike(item)} hitSlop={8}>
              <HumanHeart size={14} filled={item.likedByMe} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text className="text-center text-gray-400 text-[13px] mt-8">No comments yet.</Text>}
      />

      <View className="border-t border-gray-100 px-4 py-3">
        {replyTo && (
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-[11px] text-gray-500">Replying to {replyTo.name}</Text>
            <Pressable onPress={() => setReplyTo(null)}>
              <Text className="text-[11px] text-gray-400">Cancel</Text>
            </Pressable>
          </View>
        )}
        <View className="flex-row items-center gap-2">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a comment…"
            className="flex-1 bg-[#F3F4F6] rounded-full px-4 py-2.5 text-[13px]"
          />
          <Pressable onPress={submitComment} disabled={posting || !text.trim()}>
            <Text className="text-[13px] font-bold" style={{ color: text.trim() ? '#2196D6' : '#D1D5DB' }}>
              Post
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
