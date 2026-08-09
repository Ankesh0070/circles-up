import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MessageCircle, MoreHorizontal, Bookmark } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import Card from '../../shared/components/Card';
import HumanHeart from '../../shared/components/HumanHeart';
import PremiumShareIcon from '../../shared/components/PremiumShareIcon';
import { categoryMeta } from '../../shared/data/categories';
import { supabase } from '../../shared/api/supabase';
import ReactionPicker, { REACTIONS, type ReactionId } from './ReactionPicker';
import ModerationMenu from './ModerationMenu';
import { ON_SURFACE, ON_SURFACE_MUTED, PRIMARY, WARNING, OUTLINE_VARIANT, RADIUS } from '../../shared/theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

const NEW_ACCOUNT_DAYS = 7; // edgecase.md §2.2

export type FeedPost = {
  id: string;
  author_id: string;
  category: string;
  caption: string;
  media_urls: string[];
  created_at: string;
  author: { name: string | null; avatar_url: string | null; created_at: string } | null;
  myReaction: ReactionId | null;
  reactionCount: number;
  commentCount: number;
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

// Stitch design system: a floating white card (rounded, soft shadow) rather
// than a full-bleed row with a hairline divider.
export default function PostCard({ post, onChanged }: { post: FeedPost; onChanged: () => void }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const cat = categoryMeta(post.category);
  const Icon = cat.icon;
  const isNewAccount = post.author && Date.now() - new Date(post.author.created_at).getTime() < NEW_ACCOUNT_DAYS * 86400000;

  // The bookmark used to be local-only state with a comment saying no
  // saved_posts table existed — but Group J added one (and Settings ->
  // Saved reads from it), so the button was silently dropping every save.
  // It now reflects and writes the real row.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', user.id)
        .eq('post_id', post.id)
        .maybeSingle();
      if (!cancelled) setSaved(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [post.id]);

  const toggleSave = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const next = !saved;
    setSaved(next); // optimistic
    const { error } = next
      ? await supabase.from('saved_posts').insert({ user_id: user.id, post_id: post.id })
      : await supabase.from('saved_posts').delete().eq('user_id', user.id).eq('post_id', post.id);
    if (error) setSaved(!next); // roll back if the write actually failed
  };

  const react = async (type: ReactionId) => {
    setPickerOpen(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    if (post.myReaction === type) {
      await supabase.from('reactions').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('reactions').upsert({ post_id: post.id, user_id: user.id, type });
    }
    onChanged();
  };

  const quickLike = () => react('like');

  return (
    <Card padded={false} style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Avatar name={post.author?.name ?? '?'} size={42} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: ON_SURFACE }}>
              {post.author?.name ?? 'Neighbour'}
            </Text>
            {isNewAccount && (
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: `${WARNING}1F` }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#92400E' }}>NEW NEIGHBOUR</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12.5, color: ON_SURFACE_MUTED, marginTop: 1 }}>{timeAgo(post.created_at)} ago</Text>
        </View>

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
          <Icon size={13} color={cat.color} strokeWidth={2.2} />
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: cat.color }}>{cat.name}</Text>
        </View>

        <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} style={{ marginLeft: 8 }}>
          <MoreHorizontal size={18} color={ON_SURFACE_MUTED} />
        </Pressable>
      </View>

      <Pressable onPress={() => navigation.navigate('PostDetail', { postId: post.id })}>
        <Text style={{ fontSize: 14.5, color: ON_SURFACE, lineHeight: 21, marginTop: 12 }}>{post.caption}</Text>
        {post.media_urls[0] && (
          <Image
            source={{ uri: post.media_urls[0] }}
            style={{ width: '100%', aspectRatio: 4 / 3, marginTop: 12, borderRadius: 12 }}
            resizeMode="cover"
          />
        )}
      </Pressable>

      <View style={{ height: 1, backgroundColor: OUTLINE_VARIANT, opacity: 0.5, marginTop: 14 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 12 }}>
        {pickerOpen && <ReactionPicker onSelect={react} />}

        <Pressable onPress={quickLike} onLongPress={() => setPickerOpen(true)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          {post.myReaction ? (
            <Text style={{ fontSize: 21 }}>{REACTIONS.find((r) => r.id === post.myReaction)?.emoji}</Text>
          ) : (
            <HumanHeart size={21} filled={false} />
          )}
          <Text style={{ fontSize: 13.5, color: ON_SURFACE_MUTED, fontWeight: '600' }}>{post.reactionCount}</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}
          hitSlop={8}
        >
          <MessageCircle size={20} color={ON_SURFACE} strokeWidth={1.9} />
          <Text style={{ fontSize: 13.5, color: ON_SURFACE_MUTED, fontWeight: '600' }}>{post.commentCount}</Text>
        </Pressable>

        <Pressable hitSlop={8}>
          <PremiumShareIcon size={19} />
        </Pressable>

        <Pressable onPress={toggleSave} hitSlop={8} style={{ marginLeft: 'auto' }}>
          <Bookmark
            size={20}
            color={saved ? PRIMARY : ON_SURFACE_MUTED}
            fill={saved ? PRIMARY : 'transparent'}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      <ModerationMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        postId={post.id}
        authorId={post.author_id}
        onHidden={onChanged}
      />
    </Card>
  );
}
