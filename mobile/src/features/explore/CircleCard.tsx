import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

// Ported from architecture.md's CircleCard (Phase 58) — reused across both
// discovery tiers (Phase 59): "Circle nearby" passes a distance/tower
// subtitle, "From your city" passes a neighbourhood/shared-vibes subtitle.
// Kept presentational — the caller supplies `subtitle` and the connect
// state so this component doesn't need to know which tier it's rendering.
export default function CircleCard({
  userId,
  name,
  subtitle,
  alreadyConnected,
  onConnected,
}: {
  userId: string;
  name: string;
  subtitle: string;
  alreadyConnected: boolean;
  onConnected: () => void;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [connecting, setConnecting] = useState(false);

  const addToCircle = async () => {
    setConnecting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('circle_connections').insert({ user_id: user.id, connected_user_id: userId });
    }
    setConnecting(false);
    onConnected();
  };

  return (
    <Pressable
      onPress={() => navigation.navigate('UserProfile', { userId })}
      className="flex-row items-center gap-3 bg-white rounded-2xl p-3"
      style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
    >
      <Avatar name={name} size={48} />
      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-[#1F1B17]" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-[11px] text-gray-400 mt-0.5" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {alreadyConnected ? (
        <View className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full bg-gray-100">
          <Check size={12} color="#10B981" />
          <Text className="text-[11px] font-semibold text-gray-500">Added</Text>
        </View>
      ) : (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            addToCircle();
          }}
          disabled={connecting}
          className="px-3 py-1.5 rounded-full"
          style={{ backgroundColor: '#2196D6' }}
        >
          {connecting ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-[11px] font-semibold text-white">Add to Circle</Text>}
        </Pressable>
      )}
    </Pressable>
  );
}
