import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Image, ActivityIndicator, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Send, MessageCircle, MoreHorizontal, Bookmark } from 'lucide-react-native';
import HumanHeart from '../../shared/components/HumanHeart';
import PremiumShareIcon from '../../shared/components/PremiumShareIcon';
import Avatar from '../../shared/components/Avatar';
import Card from '../../shared/components/Card';
import ReactionPicker, { REACTIONS, type ReactionId } from './ReactionPicker';
import ModerationMenu from './ModerationMenu';
import { categoryMeta } from '../../shared/data/categories';
import type { FeedPost } from './PostCard';
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
import { supabase, mockCurrentUser } from '../../shared/api/supabase';
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

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Full Instagram-style post detail: author header, image, like/comment/
// share/save action row, like count + caption, then the full comment
// thread with reply-to and comment likes — same journey as opening a post
// from Instagram's feed or a profile grid, not just the comment sheet.
export default function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const [post, setPost] = useState<FeedPost | null>(null);
  const [saved, setSaved] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
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

    const [{ data: postRow }, { data: savedRow }, { data: commentRows }] = await Promise.all([
      supabase
        .from('posts')
        .select('id, author_id, category, caption, media_urls, created_at, author:profiles!posts_author_id_fkey(name, avatar_url, created_at), reactions(user_id, type), comments(id)')
        .eq('id', postId)
        .single(),
      supabase.from('saved_posts').select('post_id').eq('user_id', user.id).eq('post_id', postId).maybeSingle(),
      supabase
        .from('comments')
        .select('id, author_id, text, created_at, parent_comment_id, author:profiles!comments_author_id_fkey(name), comment_likes(user_id)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true }),
    ]);

    if (postRow) {
      const reactions = (postRow.reactions ?? []) as { user_id: string; type: ReactionId }[];
      const author = Array.isArray(postRow.author) ? postRow.author[0] : postRow.author;
      setPost({
        id: postRow.id,
        author_id: postRow.author_id,
        category: postRow.category,
        caption: postRow.caption,
        media_urls: postRow.media_urls ?? [],
        created_at: postRow.created_at,
        author: author ?? null,
        myReaction: reactions.find((x) => x.user_id === user.id)?.type ?? null,
        reactionCount: reactions.length,
        commentCount: (postRow.comments ?? []).length,
      });
    }
    setSaved(!!savedRow);

    const mapped: Comment[] = (commentRows ?? []).map((r) => {
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

  const react = async (type: ReactionId) => {
    setPickerOpen(false);
    if (!userId || !post) return;
    if (post.myReaction === type) {
      await supabase.from('reactions').delete().eq('post_id', post.id).eq('user_id', userId);
    } else {
      await supabase.from('reactions').upsert({ post_id: post.id, user_id: userId, type });
    }
    load();
  };

  const quickLike = () => react('like');

  const toggleSave = async () => {
    if (!userId || !post) return;
    const next = !saved;
    setSaved(next);
    const { error } = next
      ? await supabase.from('saved_posts').insert({ user_id: userId, post_id: post.id })
      : await supabase.from('saved_posts').delete().eq('user_id', userId).eq('post_id', post.id);
    if (error) setSaved(!next);
  };

  const share = async () => {
    if (!post) return;
    const message = `${post.author?.name ?? 'A neighbour'} on Circles Up: ${post.caption}`;
    try {
      await Share.share({ message });
    } catch {
      await Clipboard.setStringAsync(message);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    }
  };

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

  const toggleCommentLike = async (comment: Comment) => {
    if (!userId) return;
    if (comment.likedByMe) {
      await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', userId);
    } else {
      await supabase.from('comment_likes').upsert({ comment_id: comment.id, user_id: userId });
    }
    load();
  };

  // Own comments/posts open the Profile tab; anyone else's open UserProfileScreen.
  const openProfile = (authorId: string) => {
    if (mockCurrentUser()?.id === authorId) {
      navigation.navigate('Main', { screen: 'Profile' } as never);
    } else {
      navigation.navigate('UserProfile', { userId: authorId });
    }
  };

  if (comments === null || post === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#006290" />
      </View>
    );
  }

  const cat = categoryMeta(post.category);
  const CatIcon = cat.icon;
  const postAge = timeAgo(post.created_at);

  const header = (
    <View>
      <Card padded={false} style={{ padding: 16, borderRadius: 0, borderBottomWidth: 1, borderBottomColor: OUTLINE_VARIANT }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => openProfile(post.author_id)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Avatar name={post.author?.name ?? '?'} size={42} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: ON_SURFACE }}>{post.author?.name ?? 'Neighbour'}</Text>
              <Text style={{ fontSize: 12.5, color: ON_SURFACE_MUTED, marginTop: 1 }}>{postAge === 'now' ? 'just now' : `${postAge} ago`}</Text>
            </View>
          </Pressable>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: RADIUS.chip,
              backgroundColor: `${cat.color}1A`,
            }}
          >
            <CatIcon size={13} color={cat.color} strokeWidth={2.2} />
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: cat.color }}>{cat.name}</Text>
          </View>

          <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} style={{ marginLeft: 8 }}>
            <MoreHorizontal size={18} color={ON_SURFACE_MUTED} />
          </Pressable>
        </View>

        {post.media_urls[0] && (
          <Image
            source={{ uri: post.media_urls[0] }}
            style={{ width: '100%', aspectRatio: 1, marginTop: 14, borderRadius: 12 }}
            resizeMode="cover"
          />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 14 }}>
          {pickerOpen && <ReactionPicker onSelect={react} />}

          <Pressable onPress={quickLike} onLongPress={() => setPickerOpen(true)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            {post.myReaction ? (
              <Text style={{ fontSize: 22 }}>{REACTIONS.find((r) => r.id === post.myReaction)?.emoji}</Text>
            ) : (
              <HumanHeart size={22} filled={false} />
            )}
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <MessageCircle size={21} color={ON_SURFACE} strokeWidth={1.9} />
          </View>

          <Pressable onPress={share} hitSlop={8}>
            <PremiumShareIcon size={20} color={justCopied ? PRIMARY : '#181C20'} />
          </Pressable>

          <Pressable onPress={toggleSave} hitSlop={8} style={{ marginLeft: 'auto' }}>
            <Bookmark size={21} color={saved ? PRIMARY : ON_SURFACE_MUTED} fill={saved ? PRIMARY : 'transparent'} strokeWidth={2} />
          </Pressable>
        </View>

        {justCopied && <Text style={{ fontSize: 11.5, color: PRIMARY, fontWeight: '600', marginTop: 6 }}>Link copied</Text>}

        {post.reactionCount > 0 && (
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: ON_SURFACE, marginTop: 10 }}>
            {post.reactionCount} {post.reactionCount === 1 ? 'like' : 'likes'}
          </Text>
        )}

        <Text style={{ fontSize: 14.5, color: ON_SURFACE, lineHeight: 21, marginTop: 6 }}>
          <Text style={{ fontWeight: '700' }}>{post.author?.name ?? 'Neighbour'} </Text>
          {post.caption}
        </Text>

        {comments.length > 0 && (
          <Text style={{ fontSize: 12.5, color: ON_SURFACE_MUTED, fontWeight: '600', marginTop: 12 }}>
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </Text>
        )}
      </Card>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 16, gap: 10 }}
        renderItem={({ item }) => (
          <Card style={{ flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 10, marginLeft: item.parent_comment_id ? 40 : 16 }}>
            <Pressable onPress={() => openProfile(item.author_id)} hitSlop={4}>
              <Avatar name={item.author?.name ?? '?'} size={34} />
            </Pressable>
            <View style={{ flex: 1 }}>
              {item.parent_comment_id && (
                <Text style={{ fontSize: 11, color: ON_SURFACE_MUTED, fontWeight: '600', marginBottom: 2 }}>Reply</Text>
              )}
              <Pressable onPress={() => openProfile(item.author_id)} hitSlop={4}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: ON_SURFACE }}>{item.author?.name ?? 'Neighbour'}</Text>
              </Pressable>
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
            <Pressable onPress={() => toggleCommentLike(item)} hitSlop={8}>
              <HumanHeart size={16} filled={item.likedByMe} />
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: ON_SURFACE_MUTED, fontSize: 13.5, marginTop: 24 }}>No comments yet.</Text>
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

      <ModerationMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        postId={post.id}
        authorId={post.author_id}
        onHidden={() => navigation.goBack()}
      />
    </View>
  );
}
