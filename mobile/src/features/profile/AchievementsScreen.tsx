import { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Trophy, HandHeart, PartyPopper, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';

type Achievements = {
  total_points: number;
  donations_count: number;
  events_attended_count: number;
  validated_alerts_count: number;
  city_rank: number;
  city_member_count: number;
  safety_star: boolean;
  helping_hand: boolean;
  scene_regular: boolean;
};

const BADGES = [
  { key: 'safety_star' as const, label: 'Safety Star', icon: ShieldCheck, color: '#DC2626', need: 3, of: 'validated_alerts_count' as const, hint: 'Have 3 safety alerts confirmed by 2+ neighbours each' },
  { key: 'helping_hand' as const, label: 'Helping Hand', icon: HandHeart, color: '#059669', need: 3, of: 'donations_count' as const, hint: 'Complete 3 donations' },
  { key: 'scene_regular' as const, label: 'Scene Regular', icon: PartyPopper, color: '#A855F7', need: 5, of: 'events_attended_count' as const, hint: 'Get checked in at 5 events' },
];

// Phase 89 — points, city rank, badges. Every number here comes straight
// from get_achievements() (Group J migration) — the ledger it reads
// (point_events) can only be written by the three hard-to-fake triggers
// described in the section headers below, per edgecase.md §10.1.
//
// Deliberately no named leaderboard of other users — edgecase.md §10.2
// warns a public city-wide leaderboard incentivizes exactly the wrong
// posting behaviour. Only a rank NUMBER and an anonymous member count are
// shown; nobody else's identity or point total is ever surfaced here.
export default function AchievementsScreen() {
  const [data, setData] = useState<Achievements | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const { data: rows } = await supabase.rpc('get_achievements');
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (row && !cancelled) setData(row);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="items-center py-6 rounded-2xl" style={{ backgroundColor: '#FFFBEB' }}>
        <Trophy size={32} color="#B45309" />
        <Text className="text-[28px] font-bold text-[#B45309] mt-2">{data.total_points}</Text>
        <Text className="text-[12px] text-[#92400E]">points</Text>
        <Text className="text-[13px] font-semibold text-[#92400E] mt-2">
          #{data.city_rank} of {data.city_member_count} in your city
        </Text>
      </View>

      <Text className="text-[13px] font-bold text-gray-500 mt-6 mb-2 uppercase tracking-wide">Badges</Text>
      <View className="gap-3">
        {BADGES.map((b) => {
          const Icon = b.icon;
          const earned = data[b.key];
          const progress = data[b.of];
          return (
            <View
              key={b.key}
              className="flex-row items-center gap-3 rounded-2xl p-3.5"
              style={{ backgroundColor: earned ? `${b.color}14` : '#F9FAFB', opacity: earned ? 1 : 0.7 }}
            >
              <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: `${b.color}22` }}>
                <Icon size={20} color={b.color} />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-[#1F1B17]">{b.label}</Text>
                <Text className="text-[11px] text-gray-500 mt-0.5">
                  {earned ? 'Earned' : `${Math.min(progress, b.need)}/${b.need} — ${b.hint}`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text className="text-[13px] font-bold text-gray-500 mt-6 mb-2 uppercase tracking-wide">How points are earned</Text>
      <View className="gap-2">
        <PointsRow label="Donation completed" points={10} desc="Only counted once Razorpay confirms payment succeeded." />
        <PointsRow label="Event attended" points={15} desc="Only when the event host checks you in after it starts." />
        <PointsRow label="Safety alert validated" points={20} desc="Only once 2+ distinct neighbours confirm your alert post." />
      </View>
    </ScrollView>
  );
}

function PointsRow({ label, points, desc }: { label: string; points: number; desc: string }) {
  return (
    <View className="flex-row items-start justify-between bg-[#FAFAFA] rounded-xl p-3">
      <View className="flex-1 mr-3">
        <Text className="text-[13px] font-semibold text-[#1F1B17]">{label}</Text>
        <Text className="text-[11px] text-gray-400 mt-0.5">{desc}</Text>
      </View>
      <Text className="text-[13px] font-bold text-[#059669]">+{points}</Text>
    </View>
  );
}
