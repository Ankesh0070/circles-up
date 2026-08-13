import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, Modal } from 'react-native';
import Avatar from '../../shared/components/Avatar';
import { supabase } from '../../shared/api/supabase';
import type { StoryGroup } from './StoriesBar';

const SEGMENT_DURATION_MS = 5000;
const TICK_MS = 50;

// Ported from the prototype's StoryViewer (lines 3429–3563) — multi-segment
// tap-to-advance viewer with progress bars and auto-advance. Records a
// story_views row per segment as it's viewed (real persistence, not local-only).
export default function StoryViewer({
  group,
  viewerId,
  onClose,
}: {
  group: StoryGroup;
  viewerId: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const seenRef = useRef<Set<string>>(new Set());

  const current = group.stories[index];

  const advance = (dir: 1 | -1) => {
    const next = index + dir;
    if (next < 0) return;
    if (next >= group.stories.length) {
      onClose();
      return;
    }
    setProgress(0);
    setIndex(next);
  };

  useEffect(() => {
    if (!current) return;
    if (!seenRef.current.has(current.id)) {
      seenRef.current.add(current.id);
      supabase.from('story_views').upsert({ story_id: current.id, viewer_id: viewerId }, { onConflict: 'story_id,viewer_id' }).then();
    }

    // Plain elapsed-ticks counter, not derived from setState's functional
    // update — calling another state setter (advance -> setIndex) from
    // inside a setProgress updater callback is a fragile pattern that
    // silently failed to actually advance the segment (found while testing
    // Phase 25). This keeps "how far along" and "should we advance now" as
    // one straightforward calculation per tick instead.
    let elapsed = 0;
    const t = setInterval(() => {
      elapsed += TICK_MS;
      if (elapsed >= SEGMENT_DURATION_MS) {
        clearInterval(t);
        advance(1);
      } else {
        setProgress(elapsed / SEGMENT_DURATION_MS);
      }
    }, TICK_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advance/current intentionally re-created per index
  }, [index, current?.id]);

  if (!current) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <View className="flex-row gap-1 px-3 pt-14">
          {group.stories.map((s, i) => (
            <View key={s.id} className="flex-1 h-[2.5px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
              <View
                className="h-full bg-white"
                style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }}
              />
            </View>
          ))}
        </View>

        <View className="flex-row items-center gap-2.5 px-3 mt-3">
          <Avatar name={group.authorName} size={32} uri={group.avatarUrl} />
          <Text className="text-white font-semibold text-[13px]">{group.authorName}</Text>
          <Pressable onPress={onClose} className="ml-auto p-2">
            <Text className="text-white text-[18px]">✕</Text>
          </Pressable>
        </View>

        <Image source={{ uri: current.mediaUrl }} style={{ flex: 1, marginTop: 12 }} resizeMode="cover" />

        <View className="absolute inset-0 flex-row" style={{ top: 90 }}>
          <Pressable className="flex-1" onPress={() => advance(-1)} />
          <Pressable className="flex-1" onPress={() => advance(1)} />
        </View>

        {current.caption && (
          <View className="absolute bottom-10 left-4 right-4">
            <Text className="text-white text-[14px]">{current.caption}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
