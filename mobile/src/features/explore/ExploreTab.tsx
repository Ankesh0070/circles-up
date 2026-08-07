import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, ShoppingBag, PartyPopper, Sparkles, Shield } from 'lucide-react-native';
import CircleCard from './CircleCard';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Tier = 'nearby' | 'city';

type Person = {
  user_id: string;
  name: string;
  subtitle: string;
};

const FEATURE_CARDS = [
  { key: 'Bazaar' as const, label: 'Bazaar', icon: ShoppingBag, color: '#F59E0B' },
  { key: 'Scenes' as const, label: 'Scenes', icon: PartyPopper, color: '#A855F7' },
  { key: 'Genie' as const, label: 'Genie', icon: Sparkles, color: '#2196D6' },
  { key: 'Guard' as const, label: 'Guard', icon: Shield, color: '#FF0033' },
];

// Ported from the prototype's ExploreTab (lines 2288–2543) — search + 4
// feature-card entries + two-tier discovery (Phase 59): "Circle nearby"
// (same verified neighbourhood, ranked by distance) vs "From your city"
// (different neighbourhood, same city, ranked by shared vibes) — the
// concentric-trust-radius model from problemstatement.md, not a single
// undifferentiated people list.
export default function ExploreTab() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tier, setTier] = useState<Tier>('nearby');
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Person[] | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async (activeTier: Tier) => {
    setPeople(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_neighbourhood_id, neighbourhood:neighbourhoods!profiles_active_neighbourhood_id_fkey(city)')
      .eq('id', user.id)
      .single();
    const activeNeighbourhoodId = profile?.active_neighbourhood_id;
    if (!activeNeighbourhoodId) {
      setPeople([]);
      return;
    }
    const neighbourhood = Array.isArray(profile?.neighbourhood) ? profile?.neighbourhood[0] : profile?.neighbourhood;

    const { data: connections } = await supabase.from('circle_connections').select('connected_user_id').eq('user_id', user.id);
    setConnectedIds(new Set((connections ?? []).map((c) => c.connected_user_id)));

    if (activeTier === 'nearby') {
      const { data: myMembership } = await supabase
        .from('society_memberships')
        .select('lat, lng')
        .eq('user_id', user.id)
        .eq('neighbourhood_id', activeNeighbourhoodId)
        .eq('verification_status', 'verified')
        .single();
      if (!myMembership) {
        setPeople([]);
        return;
      }
      const { data } = await supabase.rpc('discover_circle_nearby', {
        p_neighbourhood_id: activeNeighbourhoodId,
        p_lat: myMembership.lat,
        p_lng: myMembership.lng,
      });
      setPeople(
        (data ?? []).map((p: { user_id: string; name: string; tower: string | null; distance_km: number }) => ({
          user_id: p.user_id,
          name: p.name,
          subtitle: `${p.distance_km.toFixed(1)} km away${p.tower ? ` · Tower ${p.tower}` : ''}`,
        }))
      );
    } else {
      if (!neighbourhood?.city) {
        setPeople([]);
        return;
      }
      const { data } = await supabase.rpc('discover_city_wide', {
        p_city: neighbourhood.city,
        p_exclude_neighbourhood_id: activeNeighbourhoodId,
      });
      setPeople(
        (data ?? []).map((p: { user_id: string; name: string; neighbourhood_name: string; shared_vibes_count: number }) => ({
          user_id: p.user_id,
          name: p.name,
          subtitle: `${p.neighbourhood_name} · ${p.shared_vibes_count} shared vibe${p.shared_vibes_count === 1 ? '' : 's'}`,
        }))
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(tier);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tier])
  );

  const filtered = (people ?? []).filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <View className="px-4 pt-14 pb-3 bg-white border-b border-gray-100">
        <Text className="text-[20px] font-bold text-[#1F1B17] mb-3">Explore</Text>
        <View className="flex-row items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl">
          <Search size={16} color="#9CA3AF" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search your circle" className="flex-1 text-[13px]" />
        </View>
      </View>

      <View className="flex-row px-4 gap-4 py-3">
        {FEATURE_CARDS.map((f) => (
          <Pressable key={f.key} onPress={() => navigation.navigate(f.key)} className="flex-1 items-center bg-white rounded-2xl py-3">
            <f.icon size={20} color={f.color} strokeWidth={1.9} />
            <Text className="text-[11px] font-medium text-[#1F1B17] mt-1.5">{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-row px-4 gap-2 mb-2">
        <Pressable
          onPress={() => setTier('nearby')}
          className="px-4 py-2 rounded-full"
          style={{ backgroundColor: tier === 'nearby' ? '#2196D6' : '#F3F4F6' }}
        >
          <Text style={{ color: tier === 'nearby' ? '#fff' : '#374151', fontSize: 12, fontWeight: '700' }}>Circle nearby</Text>
        </Pressable>
        <Pressable
          onPress={() => setTier('city')}
          className="px-4 py-2 rounded-full"
          style={{ backgroundColor: tier === 'city' ? '#2196D6' : '#F3F4F6' }}
        >
          <Text style={{ color: tier === 'city' ? '#fff' : '#374151', fontSize: 12, fontWeight: '700' }}>From your city</Text>
        </Pressable>
      </View>

      {people === null ? (
        <ActivityIndicator className="mt-10" color="#2196D6" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.user_id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <CircleCard
              userId={item.user_id}
              name={item.name}
              subtitle={item.subtitle}
              alreadyConnected={connectedIds.has(item.user_id)}
              onConnected={() => setConnectedIds((prev) => new Set(prev).add(item.user_id))}
            />
          )}
          ListEmptyComponent={
            <View className="items-center mt-6 gap-3">
              <Text className="text-center text-gray-400 text-[13px]">
                {tier === 'nearby' ? 'No other verified neighbours found yet.' : 'No matches from your city yet.'}
              </Text>
              {query.trim().length > 1 && (
                <Pressable onPress={() => navigation.navigate('Topic', { topic: query.trim() })}>
                  <Text className="text-[13px] font-semibold text-[#2196D6]">See posts & people related to "{query.trim()}"</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}
