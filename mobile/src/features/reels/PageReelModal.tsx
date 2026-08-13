import { useState } from 'react';
import { Modal, Pressable, View, Share, useWindowDimensions } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { X } from 'lucide-react-native';
import ReelCard from './ReelCard';
import type { SeedReel } from '../../mock/seed';

// Single-reel viewer opened from a business page's Reels strip — same
// ReelCard the main Reels tab uses, just one card in a dismissable modal
// instead of a vertical pager, so a page's reel doesn't need its own
// separate mini design.
export default function PageReelModal({ reel, onClose }: { reel: SeedReel | null; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  if (!reel) return null;

  const share = async () => {
    const message = `${reel.name} on Circles Up Reels: ${reel.caption}`;
    try {
      await Share.share({ message });
    } catch {
      await Clipboard.setStringAsync(message);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    }
  };

  return (
    <Modal visible={!!reel} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#06283D' }}>
        <ReelCard
          reel={reel}
          height={height}
          liked={liked}
          saved={saved}
          justCopied={justCopied}
          onToggleLike={() => setLiked((v) => !v)}
          onToggleSave={() => setSaved((v) => !v)}
          onShare={share}
          onOpenAuthor={() => {}}
        />
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={{
            position: 'absolute',
            top: 56,
            right: 20,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} color="#fff" strokeWidth={2.4} />
        </Pressable>
      </View>
    </Modal>
  );
}
