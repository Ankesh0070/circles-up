import { useState } from 'react';
import { View, Text, Pressable, FlatList, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Share2, Bookmark, Play } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';

// Reels tab (nav redesign). No real video pipeline in the demo, so each reel is
// a tappable gradient card with the same chrome the design shows — right-side
// action rail, author, caption — over a vertical, full-bleed pager.
type Reel = {
  id: string;
  username: string;
  caption: string;
  likes: number;
  comments: number;
  colors: readonly [string, string];
};

const REELS: Reel[] = [
  { id: 'r1', username: 'priyas', caption: 'Sunday sourdough, fresh out of the oven 🍞', likes: 214, comments: 18, colors: ['#0B3350', '#0B72A8'] },
  { id: 'r2', username: 'arjunm', caption: 'Morning ride around Agara Lake 🚴 who’s in next week?', likes: 132, comments: 9, colors: ['#063355', '#0EA5B7'] },
  { id: 'r3', username: 'ravik', caption: 'Tree-planting drive — 40 saplings down 🌳', likes: 486, comments: 41, colors: ['#0E4F3C', '#0EA5B7'] },
  { id: 'r4', username: 'fatimak', caption: 'New monstera leaf unfurling 🌿 slow TV, HSR edition', likes: 97, comments: 6, colors: ['#3B2E5A', '#7DD3FC'] },
];

export default function ReelsScreen() {
  const { height } = useWindowDimensions();
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  // Full-bleed page height; the tab bar overlays the bottom edge.
  const pageHeight = height;

  return (
    <View style={{ flex: 1, backgroundColor: '#06283D' }}>
      <FlatList
        data={REELS}
        keyExtractor={(r) => r.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={pageHeight}
        decelerationRate="fast"
        renderItem={({ item }) => {
          const isLiked = !!liked[item.id];
          const likeCount = item.likes + (isLiked ? 1 : 0);
          return (
            <View style={{ height: pageHeight, width: '100%' }}>
              <LinearGradient
                colors={item.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
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
              </LinearGradient>

              {/* Bottom scrim so caption stays legible */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)']}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 220 }}
                pointerEvents="none"
              />

              {/* Right-side action rail */}
              <View style={{ position: 'absolute', right: 14, bottom: 150, alignItems: 'center', gap: 22 }}>
                <Pressable
                  onPress={() => setLiked((s) => ({ ...s, [item.id]: !s[item.id] }))}
                  style={{ alignItems: 'center', gap: 4 }}
                  hitSlop={8}
                >
                  <Heart size={30} color={isLiked ? '#FF3B5C' : '#fff'} fill={isLiked ? '#FF3B5C' : 'transparent'} strokeWidth={2} />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{likeCount}</Text>
                </Pressable>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <MessageCircle size={29} color="#fff" strokeWidth={2} />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{item.comments}</Text>
                </View>
                <Share2 size={27} color="#fff" strokeWidth={2} />
                <Bookmark size={27} color="#fff" strokeWidth={2} />
              </View>

              {/* Author + caption */}
              <View style={{ position: 'absolute', left: 16, right: 76, bottom: 120 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <Avatar name={item.username} size={34} />
                  <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '700' }}>@{item.username}</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.94)', fontSize: 13.5, lineHeight: 19 }}>{item.caption}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Title overlay */}
      <View style={{ position: 'absolute', top: 54, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 }}>Reels</Text>
      </View>
    </View>
  );
}
