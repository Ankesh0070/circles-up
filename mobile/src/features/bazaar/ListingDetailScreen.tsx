import { useCallback, useState } from 'react';
import { View, Text, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Flag } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import { bazaarCategoryMeta } from '../../shared/data/bazaarCategories';
import { supabase, mockCurrentUser } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ListingDetail'>;

type Listing = {
  id: string;
  seller_id: string;
  category: string;
  title: string;
  description: string;
  price: number | null;
  image_urls: string[];
  status: 'active' | 'sold' | 'flagged';
  updated_at: string;
  seller: { name: string | null } | null;
};

// Phase 71's CRUD "R"/"U": view any visible listing, mark-as-sold when
// it's yours (edgecase.md §6.1 — the nudge is the "STILL AVAILABLE?" badge
// shown on BazaarScreen for stale listings; this button is the actual
// status-update action that clears it). edgecase.md §6.4: no "verified
// seller" language here beyond the neighbourhood-membership fact already
// implied by being visible at all — never "verified trustworthy seller".
export default function ListingDetailScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const [listing, setListing] = useState<Listing | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setMyUserId(user?.id ?? null);

    const { data } = await supabase
      .from('bazaar_listings')
      .select('id, seller_id, category, title, description, price, image_urls, status, updated_at, seller:profiles!bazaar_listings_seller_id_fkey(name)')
      .eq('id', listingId)
      .single();
    setListing(data as unknown as Listing);
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const markSold = async () => {
    setBusy(true);
    await supabase.from('bazaar_listings').update({ status: 'sold', updated_at: new Date().toISOString() }).eq('id', listingId);
    setBusy(false);
    load();
  };

  const bumpAvailable = async () => {
    setBusy(true);
    await supabase.from('bazaar_listings').update({ updated_at: new Date().toISOString() }).eq('id', listingId);
    setBusy(false);
    load();
  };

  const report = async () => {
    if (!myUserId) return;
    setBusy(true);
    await supabase.from('reports').insert({ reporter_id: myUserId, target_type: 'bazaar_listing', target_id: listingId, reason: 'other' });
    setBusy(false);
    setReported(true);
  };

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#F59E0B" />
      </View>
    );
  }

  const meta = bazaarCategoryMeta(listing.category);
  const isOwner = myUserId === listing.seller_id;

  const openSellerProfile = () => {
    if (mockCurrentUser()?.id === listing.seller_id) {
      navigation.navigate('Main', { screen: 'Profile' } as never);
    } else {
      navigation.navigate('UserProfile', { userId: listing.seller_id });
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      {listing.image_urls[0] ? (
        <Image source={{ uri: listing.image_urls[0] }} className="w-full aspect-square" resizeMode="cover" />
      ) : (
        <View className="w-full aspect-[2/1] items-center justify-center" style={{ backgroundColor: `${meta.color}1A` }}>
          <meta.icon size={40} color={meta.color} strokeWidth={1.5} />
        </View>
      )}

      <View className="px-5 pt-4">
        <View className="flex-row items-center gap-2">
          <View className="px-2 py-1 rounded-full" style={{ backgroundColor: `${meta.color}1A` }}>
            <Text className="text-[11px] font-semibold" style={{ color: meta.color }}>
              {meta.name}
            </Text>
          </View>
          {listing.status === 'sold' && (
            <View className="px-2 py-1 rounded-full bg-surface-container">
              <Text className="text-[11px] font-semibold text-ink-muted">SOLD</Text>
            </View>
          )}
        </View>

        <Text className="text-[20px] font-bold text-[#181C20] mt-2">{listing.title}</Text>
        <Text className="text-[16px] font-semibold text-[#F59E0B] mt-1">{listing.price ? `₹${listing.price}` : 'Free'}</Text>
        <Text className="text-[14px] text-ink-muted mt-3 leading-5">{listing.description}</Text>

        <Pressable onPress={openSellerProfile} className="flex-row items-center gap-2.5 mt-5 pt-4 border-t border-outline-variant">
          <Avatar name={listing.seller?.name ?? '?'} size={36} />
          <View>
            <Text className="text-[13px] font-semibold text-[#181C20]">{listing.seller?.name ?? 'Neighbour'}</Text>
            {/* edgecase.md §6.4: deliberately "verified neighbour", never
                "verified trustworthy seller" — membership verification says
                nothing about trustworthiness as a seller. */}
            <Text className="text-[11px] text-ink-muted">Verified neighbour</Text>
          </View>
        </Pressable>

        {/* edgecase.md §6.2: Bazaar is listing-only, no escrow/payment —
            surfaced here, not just buried in ToS. */}
        <Text className="text-[11px] text-ink-muted mt-4">
          Circles Up only connects buyers and sellers — payment and pickup happen directly between you, off-platform.
        </Text>

        {isOwner && listing.status === 'active' && (
          <View className="mt-5 gap-2">
            <Pressable onPress={markSold} disabled={busy} className="bg-ink rounded-xl py-3 items-center">
              <Text className="text-white font-semibold text-[14px]">Mark as sold</Text>
            </Pressable>
            <Pressable onPress={bumpAvailable} disabled={busy} className="bg-surface-container rounded-xl py-3 items-center">
              <Text className="text-[#181C20] font-semibold text-[14px]">Still available — bump listing</Text>
            </Pressable>
          </View>
        )}

        {!isOwner && (
          <Pressable onPress={report} disabled={busy || reported} className="flex-row items-center gap-1.5 mt-5">
            <Flag size={14} color={reported ? '#6F7881' : '#DC2626'} />
            <Text className="text-[12px]" style={{ color: reported ? '#6F7881' : '#DC2626' }}>
              {reported ? 'Reported' : 'Report this listing'}
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
