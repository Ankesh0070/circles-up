import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, ShoppingBag, PartyPopper, Sparkles, Shield, Store } from 'lucide-react-native';
import CircleCard from './CircleCard';
import Card from '../../shared/components/Card';
import { supabase } from '../../shared/api/supabase';
import {
  PRIMARY,
  SECONDARY,
  SOS_RED,
  SUCCESS,
  BACKGROUND,
  SURFACE,
  ON_SURFACE,
  ON_SURFACE_MUTED,
  SURFACE_CONTAINER,
  RADIUS,
} from '../../shared/theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type Tier = 'nearby' | 'city';

type Person = {
  user_id: string;
  name: string;
  subtitle: string;
};

// Bazaar and Guard are bottom-tabs now, so their cards switch tabs rather
// than pushing a modal (`tab: true`). The rest are modal routes.
const FEATURE_CARDS = [
  { key: 'Bazaar' as const, label: 'Bazaar', icon: ShoppingBag, color: '#F59E0B', tab: true },
  { key: 'Scenes' as const, label: 'Scenes', icon: PartyPopper, color: SECONDARY },
  { key: 'Genie' as const, label: 'Genie', icon: Sparkles, color: PRIMARY },
  { key: 'Guard' as const, label: 'Guard', icon: Shield, color: SOS_RED, tab: true },
  // Group I: pages hub (Personal/Business/NGO) — landing on MyPages rather
  // than the type-selector directly, since most taps after the first visit
  // are "manage what I already have", not "create a new one".
  { key: 'MyPages' as const, label: 'Pages', icon: Store, color: SUCCESS },
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

  const openFeature = (f: (typeof FEATURE_CARDS)[number]) => {
    // Tabs live under the `Main` navigator; modals live on the root stack.
    if (f.tab) navigation.navigate('Main', { screen: f.key } as never);
    else navigation.navigate(f.key as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: SURFACE }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: ON_SURFACE, marginBottom: 14 }}>Explore</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: SURFACE_CONTAINER,
            borderRadius: RADIUS.chip,
          }}
        >
          <Search size={17} color={ON_SURFACE_MUTED} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your circle"
            placeholderTextColor={ON_SURFACE_MUTED}
            style={{ flex: 1, fontSize: 14, color: ON_SURFACE }}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, paddingVertical: 16 }}>
        {FEATURE_CARDS.map((f) => (
          <Card key={f.key} onPress={() => openFeature(f)} padded={false} style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${f.color}1A`,
              }}
            >
              <f.icon size={19} color={f.color} strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: ON_SURFACE, marginTop: 8 }}>{f.label}</Text>
          </Card>
        ))}
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 }}>
        {(['nearby', 'city'] as Tier[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTier(t)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: RADIUS.chip,
              backgroundColor: tier === t ? PRIMARY : SURFACE_CONTAINER,
            }}
          >
            <Text style={{ color: tier === t ? '#fff' : ON_SURFACE, fontSize: 12.5, fontWeight: '700' }}>
              {t === 'nearby' ? 'Circle nearby' : 'From your city'}
            </Text>
          </Pressable>
        ))}
      </View>

      {people === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={PRIMARY} />
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
            <View style={{ alignItems: 'center', marginTop: 24, gap: 12 }}>
              <Text style={{ textAlign: 'center', color: ON_SURFACE_MUTED, fontSize: 13 }}>
                {tier === 'nearby' ? 'No other verified neighbours found yet.' : 'No matches from your city yet.'}
              </Text>
              {query.trim().length > 1 && (
                <Pressable onPress={() => navigation.navigate('Topic', { topic: query.trim() })}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>
                    See posts &amp; people related to "{query.trim()}"
                  </Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}
