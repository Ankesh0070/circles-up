import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, Bell, ChevronDown, Compass } from 'lucide-react-native';
import GradientText from '../../shared/components/GradientText';
import { supabase } from '../../shared/api/supabase';
import { SURFACE, ON_SURFACE_MUTED, ON_SURFACE, SOS_RED, OUTLINE_VARIANT } from '../../shared/theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

// Stitch design system top bar: create button, gradient wordmark, and an
// outlined SOS pill on the right.
//
// Chats sits here too. The design's tab bar is Explore/Feed/Guard/Bazaar/
// Profile, which drops Chats — but chat is a fully-built feature, so rather
// than stranding it behind no entry point at all, it gets a header icon.
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

  useFocusEffect(
    useCallback(() => {
      loadActiveNeighbourhood();
    }, [loadActiveNeighbourhood])
  );

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 52,
        paddingBottom: 12,
        backgroundColor: SURFACE,
        borderBottomWidth: 1,
        borderBottomColor: OUTLINE_VARIANT,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => navigation.navigate('ProfileMenu')} hitSlop={8}>
          <Plus size={24} color={ON_SURFACE} strokeWidth={2.2} />
        </Pressable>

        <GradientText style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.4 }}>Circle Up</GradientText>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {/* Chat moved to the bottom nav; this slot now opens Explore
              (discovery + Scenes / Genie / Pages), which left the tab bar. */}
          <Pressable onPress={() => navigation.navigate('Explore')} hitSlop={8}>
            <Compass size={21} color={ON_SURFACE} strokeWidth={2} />
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Notifications')} hitSlop={8}>
            <Bell size={21} color={ON_SURFACE} strokeWidth={2} />
            {hasUnread && (
              <View
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: SOS_RED,
                  borderWidth: 1.5,
                  borderColor: SURFACE,
                }}
              />
            )}
          </Pressable>

          {/* Outlined, not filled — the design keeps solid safety red for the
              Guard screen's own SOS button so this stays a shortcut, not a
              trigger. */}
          <Pressable
            onPress={() => navigation.navigate('Guard')}
            hitSlop={8}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 5,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: SOS_RED,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: SOS_RED, letterSpacing: 0.3 }}>SOS</Text>
          </Pressable>
        </View>
      </View>

      {neighbourhoodName && (
        <Pressable
          onPress={() => navigation.navigate('NeighbourhoodSheet')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: ON_SURFACE_MUTED }}>{neighbourhoodName}</Text>
          <ChevronDown size={13} color={ON_SURFACE_MUTED} />
        </Pressable>
      )}
    </View>
  );
}
