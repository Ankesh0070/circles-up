import { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MessageCircle, MoreHorizontal } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import HumanHeart from '../../shared/components/HumanHeart';
import PremiumShareIcon from '../../shared/components/PremiumShareIcon';
import { categoryMeta } from '../../shared/data/categories';
import { supabase } from '../../shared/api/supabase';
import ReactionPicker, { REACTIONS, type ReactionId } from './ReactionPicker';
import ModerationMenu from './ModerationMenu';
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

// Ported from the prototype's PostCard (lines 2006–2270) — category chip,
// media, five-finger reactions, comment/share/save, moderation "more" menu.
export default function PostCard({ post, onChanged }: { post: FeedPost; onChanged: () => void }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false); // UI-only — no saved_posts table in Group C scope

  const cat = categoryMeta(post.category);
  const Icon = cat.icon;
  const isNewAccount = post.author && Date.now() - new Date(post.author.created_at).getTime() < NEW_ACCOUNT_DAYS * 86400000;

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
    <View className="bg-white border-b border-gray-100 pb-3">
      <View className="flex-row items-center px-4 pt-3 pb-2">
        <Avatar name={post.author?.name ?? '?'} size={36} />
        <View className="ml-2.5 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[13px] font-semibold text-[#1F1B17]">{post.author?.name ?? 'Neighbour'}</Text>
            {isNewAccount && (
              <View className="px-1.5 py-0.5 rounded bg-amber-50">
                <Text className="text-[9px] font-semibold text-amber-700">NEW NEIGHBOUR</Text>
              </View>
            )}
          </View>
          <Text className="text-[11px] text-gray-400">{timeAgo(post.created_at)} ago</Text>
        </View>
        <View className="flex-row items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: `${cat.color}1A` }}>
          <Icon size={12} color={cat.color} />
          <Text className="text-[10px] font-semibold" style={{ color: cat.color }}>
            {cat.name}
          </Text>
        </View>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} className="ml-2">
          <MoreHorizontal size={18} color="#9CA3AF" />
        </Pressable>
      </View>

      <Pressable onPress={() => navigation.navigate('PostDetail', { postId: post.id })}>
        <Text className="px-4 text-[14px] text-[#1F1B17] leading-relaxed">{post.caption}</Text>
        {post.media_urls[0] && (
          <Image source={{ uri: post.media_urls[0] }} className="w-full aspect-square mt-3" resizeMode="cover" />
        )}
      </Pressable>

      <View className="flex-row items-center gap-5 px-4 mt-2.5 relative">
        {pickerOpen && <ReactionPicker onSelect={react} />}
        <Pressable onPress={quickLike} onLongPress={() => setPickerOpen(true)} hitSlop={8}>
          {post.myReaction ? (
            <Text style={{ fontSize: 22 }}>{REACTIONS.find((r) => r.id === post.myReaction)?.emoji}</Text>
          ) : (
            <HumanHeart size={22} filled={false} />
          )}
        </Pressable>
        <Pressable onPress={() => navigation.navigate('PostDetail', { postId: post.id })} className="flex-row items-center gap-1.5" hitSlop={8}>
          <MessageCircle size={20} color="#1F1B17" strokeWidth={1.8} />
        </Pressable>
        <Pressable hitSlop={8}>
          <PremiumShareIcon size={19} />
        </Pressable>
        <Pressable onPress={() => setSaved((s) => !s)} hitSlop={8} className="ml-auto">
          <Text style={{ fontSize: 18 }}>{saved ? '🔖' : '📑'}</Text>
        </Pressable>
      </View>

      <View className="px-4 mt-1.5">
        <Text className="text-[12px] text-gray-500">
          {post.reactionCount} {post.reactionCount === 1 ? 'reaction' : 'reactions'} · {post.commentCount}{' '}
          {post.commentCount === 1 ? 'comment' : 'comments'}
        </Text>
      </View>

      <ModerationMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        postId={post.id}
        authorId={post.author_id}
        onHidden={onChanged}
      />
    </View>
  );
}
