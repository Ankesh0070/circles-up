import { View, Text, Image, Pressable } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import { recordAdClickFireAndForget, type ServedAd } from '../../shared/api/ads';

// Phase 83 (Group I) — the one place `serve_ad_for_user`'s result actually
// reaches a real screen (HomeFeed fetches it once per load, same as any
// other feed data), so the hard serve-time budget check isn't just a
// curl-tested backend function. The impression itself is already recorded
// server-side, atomically, inside serve_ad_for_user — this component only
// needs to record a click, fire-and-forget, same pattern as Genie's embed
// calls (never blocks or breaks the tap if it fails).
export default function SponsoredCard({ ad, userId }: { ad: ServedAd; userId: string }) {
  return (
    <Pressable
      onPress={() => recordAdClickFireAndForget(ad.campaign_id, userId)}
      className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden"
      style={{ borderWidth: 1, borderColor: '#EBEEF4' }}
    >
      <View className="flex-row items-center gap-1.5 px-3 pt-2.5">
        <Megaphone size={12} color="#6F7881" />
        <Text className="text-[10px] font-semibold text-ink-muted">SPONSORED</Text>
      </View>
      {ad.image_url && <Image source={{ uri: ad.image_url }} className="w-full aspect-[2/1] mt-2" resizeMode="cover" />}
      <View className="p-3">
        <Text className="text-[14px] font-semibold text-[#181C20]">{ad.headline}</Text>
        <Text className="text-[13px] text-ink-muted mt-1">{ad.body}</Text>
        <View className="mt-2 self-start px-3 py-1.5 rounded-full bg-ink">
          <Text className="text-white text-[12px] font-semibold">{ad.cta_text}</Text>
        </View>
      </View>
    </Pressable>
  );
}
