import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Briefcase, User, HeartHandshake, MapPin, AlertTriangle, Megaphone } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PageDetail'>;

type PageDetail = {
  id: string;
  owner_id: string;
  page_type: 'personal' | 'business' | 'ngo';
  name: string;
  bio: string | null;
  profession: string | null;
  gst_number: string | null;
  darpan_id: string | null;
  address: string | null;
  geocode_status: string;
  ngo_approval_status: string;
};

const TYPE_ICON = { personal: User, business: Briefcase, ngo: HeartHandshake } as const;
const TYPE_COLOR = { personal: '#006290', business: '#F59E0B', ngo: '#DC2626' } as const;

// Not a named implementation-plan phase on its own, but the necessary hub
// screen (same role as ListingDetail/EventDetail in Groups H) — hosts
// Phase 78's "Manage/Insights/Promote actions" for the owner, and is where
// a visitor actually reaches the Phase 79/80 donate flow.
export default function PageDetailScreen({ route, navigation }: Props) {
  const { pageId } = route.params;
  const [page, setPage] = useState<PageDetail | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [donationStats, setDonationStats] = useState<{ count: number; total: number } | null>(null);
  const [adStats, setAdStats] = useState<{ campaigns: number; spend: number } | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setMyUserId(user?.id ?? null);

    const { data } = await supabase
      .from('pages')
      .select('id, owner_id, page_type, name, bio, profession, gst_number, darpan_id, address, geocode_status, ngo_approval_status')
      .eq('id', pageId)
      .single();
    setPage(data);

    const isOwner = data?.owner_id === user?.id;
    if (isOwner && data?.page_type === 'ngo') {
      const { data: donations } = await supabase.from('donations').select('amount').eq('ngo_page_id', pageId).eq('payment_status', 'succeeded');
      setDonationStats({
        count: donations?.length ?? 0,
        total: (donations ?? []).reduce((sum, d) => sum + Number(d.amount), 0),
      });
    }
    if (isOwner && data?.page_type === 'business') {
      const { data: campaigns } = await supabase.from('ad_campaigns').select('budget_spent').eq('page_id', pageId);
      setAdStats({
        campaigns: campaigns?.length ?? 0,
        spend: (campaigns ?? []).reduce((sum, c) => sum + Number(c.budget_spent), 0),
      });
    }
  }, [pageId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!page) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#059669" />
      </View>
    );
  }

  const Icon = TYPE_ICON[page.page_type];
  const color = TYPE_COLOR[page.page_type];
  const isOwner = myUserId === page.owner_id;

  return (
    <ScrollView className="flex-1 bg-white px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="items-center">
        <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: `${color}1A` }}>
          <Icon size={26} color={color} />
        </View>
        <Text className="text-[18px] font-bold text-[#181C20] mt-2">{page.name}</Text>
        {page.bio && <Text className="text-[13px] text-ink-muted mt-1 text-center">{page.bio}</Text>}
      </View>

      {page.page_type === 'personal' && page.profession && (
        <Text className="text-[13px] text-center text-ink-muted mt-3">{page.profession}</Text>
      )}

      {page.page_type === 'business' && (
        <View className="mt-4 items-center">
          <Text className="text-[12px] text-ink-muted">GST: {page.gst_number}</Text>
          <Text className="text-[10px] text-ink-muted mt-0.5">Self-declared, verification pending</Text>
        </View>
      )}

      {page.page_type === 'ngo' && (
        <View className="mt-4 items-center">
          <Text className="text-[12px] text-ink-muted">Darpan ID: {page.darpan_id}</Text>
          <Text className="text-[10px] text-ink-muted mt-0.5">Self-declared, verification pending</Text>
          <View
            className="mt-2 px-2.5 py-1 rounded-full"
            style={{ backgroundColor: page.ngo_approval_status === 'approved' ? '#D1FAE5' : '#FEF3C7' }}
          >
            <Text
              className="text-[10px] font-semibold"
              style={{ color: page.ngo_approval_status === 'approved' ? '#065F46' : '#92400E' }}
            >
              {page.ngo_approval_status === 'approved' ? 'Approved to accept donations' : 'Pending approval'}
            </Text>
          </View>
        </View>
      )}

      {page.address && (
        <View className="flex-row items-center justify-center gap-1 mt-3">
          <MapPin size={12} color="#6F7881" />
          <Text className="text-[12px] text-ink-muted">{page.address}</Text>
        </View>
      )}

      {isOwner && page.geocode_status === 'mismatch' && (
        <View className="flex-row items-start gap-2 mt-4 px-3 py-2.5 rounded-xl bg-amber-50">
          <AlertTriangle size={14} color="#B45309" style={{ marginTop: 1 }} />
          <Text className="text-[11px] text-amber-800 flex-1">
            Your address doesn't match your neighbourhood's location — this may affect reviewer approval.
          </Text>
        </View>
      )}

      {/* Owner: Manage/Insights/Promote (Phase 78) */}
      {isOwner && (
        <View className="mt-6 pt-4 border-t border-outline-variant">
          {page.page_type === 'ngo' && donationStats && (
            <View className="flex-row justify-around mb-4">
              <View className="items-center">
                <Text className="text-[18px] font-bold text-[#181C20]">{donationStats.count}</Text>
                <Text className="text-[11px] text-ink-muted">Donations</Text>
              </View>
              <View className="items-center">
                <Text className="text-[18px] font-bold text-[#181C20]">₹{donationStats.total.toFixed(0)}</Text>
                <Text className="text-[11px] text-ink-muted">Raised</Text>
              </View>
            </View>
          )}
          {page.page_type === 'business' && adStats && (
            <View className="flex-row justify-around mb-4">
              <View className="items-center">
                <Text className="text-[18px] font-bold text-[#181C20]">{adStats.campaigns}</Text>
                <Text className="text-[11px] text-ink-muted">Campaigns</Text>
              </View>
              <View className="items-center">
                <Text className="text-[18px] font-bold text-[#181C20]">₹{adStats.spend.toFixed(2)}</Text>
                <Text className="text-[11px] text-ink-muted">Spent</Text>
              </View>
            </View>
          )}
          {page.page_type === 'business' && (
            <Pressable
              onPress={() => navigation.navigate('AdsManager')}
              className="flex-row items-center justify-center gap-2 bg-ink rounded-xl py-3"
            >
              <Megaphone size={16} color="#fff" />
              <Text className="text-white font-semibold text-[14px]">Promote — Ads Manager</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Visitor: donate (Phase 79/80) */}
      {!isOwner && page.page_type === 'ngo' && (
        <View className="mt-6 pt-4 border-t border-outline-variant">
          {page.ngo_approval_status === 'approved' ? (
            <Pressable onPress={() => navigation.navigate('Donate', { pageId: page.id })} className="bg-red-600 rounded-xl py-3 items-center">
              <Text className="text-white font-semibold text-[14px]">Donate</Text>
            </Pressable>
          ) : (
            <Text className="text-[12px] text-ink-muted text-center">
              This NGO hasn't been approved to accept donations yet.
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}
