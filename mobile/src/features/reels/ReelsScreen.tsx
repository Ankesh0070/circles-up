import { useState } from 'react';
import { View, Text, FlatList, Share, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import ReelCard from './ReelCard';
import { reels } from '../../mock/seed';
import type { RootStackParamList } from '../../navigation/types';

// Reels tab (nav redesign). No real video pipeline in the demo, so each reel
// is a tappable photo/gradient card with the same chrome the design shows —
// right-side action rail, author, caption — over a vertical, full-bleed
// pager. Data comes from mock/seed's `reels` (4 people + 200 local
// businesses, one reel each), not a hardcoded list, so this is the same mix
// a real Reels tab would serve rather than a handful of fixed demo entries.
export default function ReelsScreen() {
  const { height } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [justCopiedId, setJustCopiedId] = useState<string | null>(null);

  const share = async (item: (typeof reels)[number]) => {
    const message = `${item.name} on Circles Up Reels: ${item.caption}`;
    try {
      await Share.share({ message });
    } catch {
      // Share.share() rejects outright where navigator.share isn't available
      // (most desktop browsers) — fall back to copying so the tap still does
      // something rather than silently failing.
      await Clipboard.setStringAsync(message);
      setJustCopiedId(item.id);
      setTimeout(() => setJustCopiedId(null), 1500);
    }
  };

  const openAuthor = (item: (typeof reels)[number]) => {
    if (item.ownerType === 'business' && item.pageId) navigation.navigate('PageDetail', { pageId: item.pageId });
    else if (item.ownerType === 'user' && item.userId) navigation.navigate('UserProfile', { userId: item.userId });
  };

  // Full-bleed page height; the tab bar overlays the bottom edge.
  const pageHeight = height;

  return (
    <View style={{ flex: 1, backgroundColor: '#06283D' }}>
      <FlatList
        data={reels}
        keyExtractor={(r) => r.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={pageHeight}
        decelerationRate="fast"
        // Reels are lightweight (no video decode), so a bigger render window
        // than the FlatList default keeps swiping past several in a row from
        // ever showing a blank frame — the actual "keep it smooth while
        // scrolling fast" job an Instagram-style pager has to do, just
        // solved with virtualization tuning instead of a real feed-ranking
        // model.
        windowSize={5}
        maxToRenderPerBatch={3}
        renderItem={({ item }) => (
          <ReelCard
            reel={item}
            height={pageHeight}
            liked={!!liked[item.id]}
            saved={!!saved[item.id]}
            justCopied={justCopiedId === item.id}
            onToggleLike={() => setLiked((s) => ({ ...s, [item.id]: !s[item.id] }))}
            onToggleSave={() => setSaved((s) => ({ ...s, [item.id]: !s[item.id] }))}
            onShare={() => share(item)}
            onOpenAuthor={() => openAuthor(item)}
          />
        )}
      />

      {/* Title overlay */}
      <View style={{ position: 'absolute', top: 54, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 }}>Reels</Text>
      </View>
    </View>
  );
}
