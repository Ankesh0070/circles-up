import { useCallback, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Plus, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Membership = { neighbourhood_id: string; name: string; city: string; society: string };

// Ported from the prototype's NeighbourhoodSheet (lines 3566–3630) — switch
// between multiple verified neighbourhoods; "add new" re-runs the full
// verification gauntlet (edgecase.md §9.4 — fresh liveness capture
// required per neighbourhood, no shortcuts, see AddressVerificationFlow).
export default function NeighbourhoodSheet() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: profile }, { data: rows }] = await Promise.all([
      supabase.from('profiles').select('active_neighbourhood_id').eq('id', user.id).single(),
      supabase
        .from('society_memberships')
        .select('neighbourhood_id, society, neighbourhood:neighbourhoods(name, city)')
        .eq('user_id', user.id)
        .eq('verification_status', 'verified'),
    ]);
    setActiveId(profile?.active_neighbourhood_id ?? null);
    setMemberships(
      (rows ?? []).map((r) => {
        const n = Array.isArray(r.neighbourhood) ? r.neighbourhood[0] : r.neighbourhood;
        return { neighbourhood_id: r.neighbourhood_id, name: n?.name ?? 'Unknown', city: n?.city ?? '', society: r.society };
      })
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const switchTo = async (neighbourhoodId: string) => {
    if (neighbourhoodId === activeId) return;
    setSwitching(neighbourhoodId);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ active_neighbourhood_id: neighbourhoodId }).eq('id', user.id);
      setActiveId(neighbourhoodId);
    }
    setSwitching(null);
  };

  if (memberships === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={memberships}
        keyExtractor={(m) => m.neighbourhood_id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => switchTo(item.neighbourhood_id)}
            className="flex-row items-center gap-3 py-3.5 border-b border-gray-100"
          >
            <View className="w-10 h-10 rounded-full bg-[#EBF6FD] items-center justify-center">
              <ShieldCheck size={18} color="#2196D6" />
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-semibold text-[#1F1B17]">{item.name}</Text>
              <Text className="text-[12px] text-gray-400">
                {item.society} · {item.city}
              </Text>
            </View>
            {switching === item.neighbourhood_id ? (
              <ActivityIndicator size="small" color="#2196D6" />
            ) : item.neighbourhood_id === activeId ? (
              <Check size={18} color="#10B981" />
            ) : null}
          </Pressable>
        )}
      />
      <Pressable
        onPress={() => navigation.navigate('AddNeighbourhood')}
        className="flex-row items-center gap-2 justify-center py-4 border-t border-gray-100"
      >
        <Plus size={16} color="#2196D6" />
        <Text className="text-[13px] font-semibold text-[#2196D6]">Add a new neighbourhood</Text>
      </Pressable>
    </View>
  );
}
