import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, AlertTriangle, Bell } from 'lucide-react-native';
import GradientText from '../../shared/components/GradientText';
import type { RootStackParamList } from '../../navigation/types';

// Ported from the prototype's TopBar (lines 1863–1903) — wordmark, create
// button, SOS button, notification bell. Navigates directly to the modal
// stack (Guard/Notifications aren't built until later groups — they're
// still PlaceholderScreen, which is fine, the route already exists).
export default function TopBar({ hasUnread = false }: { hasUnread?: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
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
  );
}
