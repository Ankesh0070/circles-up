import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Campaign = {
  id: string;
  headline: string;
  status: string;
  budget_total: number;
  budget_spent: number;
  impressions: number;
  clicks: number;
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#6F7881',
  pending_review: '#D97706',
  active: '#059669',
  paused: '#6F7881',
  rejected: '#DC2626',
  completed: '#6F7881',
};

// Phase 81 (Group I) — campaign dashboard: spend/reach/clicks/CTR, pause/
// resume. `ad_campaigns`/`ad_events` RLS already scopes everything to
// campaigns on pages the caller owns (owns_page helper), so no explicit
// owner filter is needed in these queries.
export default function AdsManagerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setCampaigns(null);
    const { data: rows } = await supabase.from('ad_campaigns').select('id, headline, status, budget_total, budget_spent').order('created_at', { ascending: false });
    const campaignIds = (rows ?? []).map((r) => r.id);

    const eventsByCampaign = new Map<string, { impressions: number; clicks: number }>();
    if (campaignIds.length > 0) {
      const { data: events } = await supabase.from('ad_events').select('campaign_id, event_type').in('campaign_id', campaignIds);
      for (const e of events ?? []) {
        const cur = eventsByCampaign.get(e.campaign_id) ?? { impressions: 0, clicks: 0 };
        if (e.event_type === 'impression') cur.impressions++;
        else if (e.event_type === 'click') cur.clicks++;
        eventsByCampaign.set(e.campaign_id, cur);
      }
    }

    setCampaigns(
      (rows ?? []).map((r) => ({
        ...r,
        impressions: eventsByCampaign.get(r.id)?.impressions ?? 0,
        clicks: eventsByCampaign.get(r.id)?.clicks ?? 0,
      }))
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleStatus = async (campaign: Campaign) => {
    if (campaign.status !== 'active' && campaign.status !== 'paused') return;
    setBusyId(campaign.id);
    const nextStatus = campaign.status === 'active' ? 'paused' : 'active';
    await supabase.from('ad_campaigns').update({ status: nextStatus }).eq('id', campaign.id);
    setBusyId(null);
    load();
  };

  return (
    <View className="flex-1 bg-[#F6F9FF]">
      {campaigns === null ? (
        <ActivityIndicator className="mt-10" color="#F59E0B" />
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const ctr = item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(1) : '0.0';
            return (
              <View className="bg-white rounded-2xl p-3.5" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}>
                <View className="flex-row items-center gap-2">
                  <Text className="text-[14px] font-semibold text-[#181C20] flex-1">{item.headline}</Text>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${STATUS_COLOR[item.status]}1A` }}>
                    <Text className="text-[10px] font-semibold" style={{ color: STATUS_COLOR[item.status] }}>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between mt-3">
                  <Stat label="Spend" value={`₹${item.budget_spent.toFixed(2)} / ₹${item.budget_total.toFixed(0)}`} />
                  <Stat label="Reach" value={String(item.impressions)} />
                  <Stat label="Clicks" value={String(item.clicks)} />
                  <Stat label="CTR" value={`${ctr}%`} />
                </View>

                {(item.status === 'active' || item.status === 'paused') && (
                  <Pressable
                    onPress={() => toggleStatus(item)}
                    disabled={busyId === item.id}
                    className="mt-3 rounded-xl py-2 items-center"
                    style={{ backgroundColor: '#EBEEF4' }}
                  >
                    <Text className="text-[12px] font-semibold text-[#181C20]">{item.status === 'active' ? 'Pause' : 'Resume'}</Text>
                  </Pressable>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<Text className="text-center text-ink-muted text-[13px] mt-6">No ad campaigns yet.</Text>}
        />
      )}

      <Pressable
        onPress={() => navigation.navigate('CreateAd')}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center"
        style={{ backgroundColor: '#F59E0B', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center">
      <Text className="text-[12px] font-bold text-[#181C20]">{value}</Text>
      <Text className="text-[10px] text-ink-muted">{label}</Text>
    </View>
  );
}
