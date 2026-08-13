import { View, Text, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share2, Bookmark, Play } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import type { SeedReel } from '../../mock/seed';

// One full-bleed reel card — used by both the vertical Reels pager
// (ReelsScreen) and the single-reel viewer opened from a business page
// (PageReelModal), so the two never drift into two different designs.
export default function ReelCard({
  reel,
  height,
  liked,
  saved,
  justCopied,
  onToggleLike,
  onToggleSave,
  onShare,
  onOpenAuthor,
}: {
  reel: SeedReel;
  height: number;
  liked: boolean;
  saved: boolean;
  justCopied: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onShare: () => void;
  onOpenAuthor: () => void;
}) {
  const likeCount = reel.likes + (liked ? 1 : 0);

  return (
    <View style={{ height, width: '100%', backgroundColor: '#06283D' }}>
      {reel.img ? (
        <Image source={{ uri: reel.img }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={reel.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}
      {/* No real video pipeline in the demo — a dim scrim + centered play
          glyph reads as "this is a clip" over a still photo or gradient
          without pretending playback is happening. */}
      {reel.img && (
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,20,30,0.32)' }}
          pointerEvents="none"
        />
      )}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: 'rgba(255,255,255,0.16)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Play size={26} color="#fff" fill="#fff" />
        </View>
      </View>

      {/* Bottom scrim so caption stays legible */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 220 }}
        pointerEvents="none"
      />

      {/* Right-side action rail */}
      <View style={{ position: 'absolute', right: 14, bottom: 150, alignItems: 'center', gap: 22 }}>
        <Pressable onPress={onToggleLike} style={{ alignItems: 'center', gap: 4 }} hitSlop={8}>
          <Heart size={30} color={liked ? '#FF3B5C' : '#fff'} fill={liked ? '#FF3B5C' : 'transparent'} strokeWidth={2} />
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{likeCount}</Text>
        </Pressable>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <MessageCircle size={29} color="#fff" strokeWidth={2} />
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{reel.comments}</Text>
        </View>
        <Pressable onPress={onShare} style={{ alignItems: 'center', gap: 4 }} hitSlop={8}>
          <Share2 size={27} color="#fff" strokeWidth={2} />
          {justCopied && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>Copied</Text>}
        </Pressable>
        <Pressable onPress={onToggleSave} hitSlop={8}>
          <Bookmark size={27} color={saved ? '#FFD34D' : '#fff'} fill={saved ? '#FFD34D' : 'transparent'} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Author + caption — tapping opens the business page / user profile */}
      <Pressable onPress={onOpenAuthor} style={{ position: 'absolute', left: 16, right: 76, bottom: 120 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
          <Avatar name={reel.name} size={34} uri={reel.avatarUrl} />
          <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '700' }}>{reel.name}</Text>
          {reel.ownerType === 'business' && (
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.3 }}>BUSINESS</Text>
            </View>
          )}
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.94)', fontSize: 13.5, lineHeight: 19 }}>{reel.caption}</Text>
      </Pressable>
    </View>
  );
}
