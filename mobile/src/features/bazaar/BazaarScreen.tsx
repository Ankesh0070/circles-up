import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import { bazaarCategories, bazaarCategoryMeta, type BazaarCategory } from '../../shared/data/bazaarCategories';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Listing = {
  id: string;
  category: BazaarCategory;
  title: string;
  price: number | null;
  image_urls: string[];
  status: 'active' | 'sold' | 'flagged';
  updated_at: string;
};

const STALE_DAYS = 30;

// Phase 70/71 (implementationplan.md Group H) — categorized listing grid.
// `bazaar_listings` RLS scopes every read to the caller's verified
// neighbourhood (public.is_verified_in_neighbourhood), so this query needs
// no explicit neighbourhood filter — same pattern as posts/stories.
export default function BazaarScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [category, setCategory] = useState<BazaarCategory | null>(null);
  const [listings, setListings] = useState<Listing[] | null>(null);

  const load = useCallback(async (activeCategory: BazaarCategory | null) => {
    setListings(null);
    let query = supabase
      .from('bazaar_listings')
      .select('id, category, title, price, image_urls, status, updated_at')
      .neq('status', 'flagged')
      .order('created_at', { ascending: false });
    if (activeCategory) query = query.eq('category', activeCategory);
    const { data } = await query;
    setListings(data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(category);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category])
  );

  return (
    <View className="flex-1 bg-[#F6F9FF]">
      {/* Bazaar is a bottom tab now (it used to be a modal, which supplied
          this title bar for free) — so it owns its own header and
          status-bar inset. */}
      <View style={{ paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12, backgroundColor: '#FFFFFF' }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#181C20' }}>Bazaar</Text>
        <Text style={{ fontSize: 13, color: '#6F7881', marginTop: 2 }}>Buy and sell with verified neighbours</Text>
      </View>

      <View className="flex-row px-4 py-3 gap-2">
        <Pressable
          onPress={() => setCategory(null)}
          className="px-3 py-1.5 rounded-full"
          style={{ backgroundColor: category === null ? '#F59E0B' : '#EBEEF4' }}
        >
          <Text style={{ color: category === null ? '#fff' : '#181C20', fontSize: 12, fontWeight: '700' }}>All</Text>
        </Pressable>
        {bazaarCategories.map((c) => (
          <Pressable
            key={c.value}
            onPress={() => setCategory(c.value)}
            className="px-3 py-1.5 rounded-full"
            style={{ backgroundColor: category === c.value ? c.color : '#EBEEF4' }}
          >
            <Text style={{ color: category === c.value ? '#fff' : '#181C20', fontSize: 12, fontWeight: '700' }}>{c.name}</Text>
          </Pressable>
        ))}
      </View>

      {listings === null ? (
        <ActivityIndicator className="mt-10" color="#F59E0B" />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(l) => l.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => {
            const meta = bazaarCategoryMeta(item.category);
            const Icon = meta.icon;
            const isStale = Date.now() - new Date(item.updated_at).getTime() > STALE_DAYS * 86400000;
            return (
              <Pressable
                onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
                className="flex-1 bg-white rounded-2xl overflow-hidden"
                style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
              >
                {item.image_urls[0] ? (
                  <Image source={{ uri: item.image_urls[0] }} className="w-full aspect-square" resizeMode="cover" />
                ) : (
                  <View className="w-full aspect-square items-center justify-center" style={{ backgroundColor: `${meta.color}1A` }}>
                    <Icon size={28} color={meta.color} strokeWidth={1.6} />
                  </View>
                )}
                <View className="p-2.5">
                  <Text className="text-[13px] font-semibold text-[#181C20]" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="text-[12px] text-ink-muted mt-0.5">
                    {item.price ? `₹${item.price}` : 'Free'}
                  </Text>
                  {item.status === 'sold' && (
                    <View className="mt-1.5 px-1.5 py-0.5 rounded bg-surface-container self-start">
                      <Text className="text-[9px] font-semibold text-ink-muted">SOLD</Text>
                    </View>
                  )}
                  {item.status === 'active' && isStale && (
                    <View className="mt-1.5 px-1.5 py-0.5 rounded bg-amber-50 self-start">
                      <Text className="text-[9px] font-semibold text-amber-700">STILL AVAILABLE?</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text className="text-center text-ink-muted text-[13px] mt-6">No listings yet — be the first to post one.</Text>
          }
        />
      )}

      <Pressable
        onPress={() => navigation.navigate('CreateListing')}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center"
        style={{ backgroundColor: '#F59E0B', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}
