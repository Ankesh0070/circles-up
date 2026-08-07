import { View, Text, Pressable } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Compass, MessageCircle, Search, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IG_GRADIENT_COLORS, IG_GRADIENT_LOCATIONS, IG_GRADIENT_ANGLE } from '../shared/theme/tokens';

const ICONS: Record<string, typeof Home> = {
  Home: Home,
  Explore: Compass,
  Chats: MessageCircle,
  Search: Search,
  Profile: User,
};

// Ported from the prototype's BottomNav (implementationplan.md Phase 23) —
// Home / Explore / Chats (center, elevated gradient pill) / Search / Profile.
export default function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View className="flex-row items-end bg-white border-t border-gray-100 px-2 pb-6 pt-2">
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const Icon = ICONS[route.name] ?? Home;
        const isChats = route.name === 'Chats';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (isChats) {
          return (
            <Pressable key={route.key} onPress={onPress} className="flex-1 items-center" style={{ marginTop: -18 }}>
              <LinearGradient
                colors={IG_GRADIENT_COLORS}
                locations={IG_GRADIENT_LOCATIONS}
                start={IG_GRADIENT_ANGLE.start}
                end={IG_GRADIENT_ANGLE.end}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#2196D6',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Icon size={24} color="#fff" strokeWidth={2.2} />
              </LinearGradient>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} className="flex-1 items-center gap-1">
            <Icon size={23} color={focused ? '#2196D6' : '#9CA3AF'} strokeWidth={focused ? 2.4 : 2} />
            <Text style={{ fontSize: 10, fontWeight: focused ? '700' : '500', color: focused ? '#2196D6' : '#9CA3AF' }}>
              {String(options.title ?? route.name)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
