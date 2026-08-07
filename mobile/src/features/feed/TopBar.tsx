import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, AlertTriangle, Bell, ChevronDown } from 'lucide-react-native';
import GradientText from '../../shared/components/GradientText';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

// Ported from the prototype's TopBar (lines 1863–1903) — wordmark, create
// button, SOS button, notification bell. Phase 61 addition: an active-
// neighbourhood pill (tap to open NeighbourhoodSheet) — otherwise switching
// neighbourhoods has no visible entry point anywhere in the app.
export default function TopBar({ hasUnread = false }: { hasUnread?: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [neighbourhoodName, setNeighbourhoodName] = useState<string | null>(null);

  const loadActiveNeighbourhood = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('active_neighbourhood_id, neighbourhood:neighbourhoods!profiles_active_neighbourhood_id_fkey(name)')
      .eq('id', user.id)
      .single();
    const n = Array.isArray(data?.neighbourhood) ? data?.neighbourhood[0] : data?.neighbourhood;
    setNeighbourhoodName(n?.name ?? null);
  }, []);

  useEffect(() => {
    loadActiveNeighbourhood();
  }, [loadActiveNeighbourhood]);

  // Refresh after returning from NeighbourhoodSheet (switched neighbourhoods).
  useFocusEffect(
    useCallback(() => {
      loadActiveNeighbourhood();
    }, [loadActiveNeighbourhood])
  );

  return (
    <View className="px-4 py-3 bg-white border-b border-gray-100">
      <View className="flex-row items-center justify-between">
        <GradientText style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.3 }}>Circle Up</GradientText>

        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => navigation.navigate('CreatePost')} hitSlop={8}>
            <Plus size={24} color="#1F1B17" strokeWidth={2.2} />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Guard')}
            hitSlop={8}
            className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#FFF1F1' }}
          >
            <AlertTriangle size={14} color="#FF0033" strokeWidth={2.4} />
            <GradientText style={{ fontSize: 11, fontWeight: '800' }}>SOS</GradientText>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Notifications')} hitSlop={8} className="relative">
            <Bell size={22} color="#1F1B17" strokeWidth={2} />
            {hasUnread && (
              <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />
            )}
          </Pressable>
        </View>
      </View>

      {neighbourhoodName && (
        <Pressable onPress={() => navigation.navigate('NeighbourhoodSheet')} className="flex-row items-center gap-1 mt-1.5">
          <Text className="text-[12px] font-medium text-gray-500">{neighbourhoodName}</Text>
          <ChevronDown size={12} color="#9CA3AF" />
        </Pressable>
      )}
    </View>
  );
}
