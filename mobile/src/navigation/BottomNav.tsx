import { View, Text, Pressable } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Compass, Newspaper, Shield, Store, User, type LucideIcon } from 'lucide-react-native';
import { PRIMARY, ON_SURFACE_MUTED, SURFACE, OUTLINE_VARIANT } from '../shared/theme/tokens';

const ICONS: Record<string, LucideIcon> = {
  Explore: Compass,
  Feed: Newspaper,
  Guard: Shield,
  Bazaar: Store,
  Profile: User,
};

// Stitch design system: five equal tabs — Explore / Feed / Guard / Bazaar /
// Profile — with the active tab marked by a tinted rounded pill behind the
// icon rather than the old elevated centre button.
//
// Guard is deliberately a first-class tab here (it used to be buried behind a
// modal): Circle Guard is the app's differentiator and edgecase.md §3.1 wants
// it reachable in one tap, not two.
export default function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SURFACE,
        borderTopWidth: 1,
        borderTopColor: OUTLINE_VARIANT,
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 24,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const Icon = ICONS[route.name] ?? Compass;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View
              style={{
                paddingHorizontal: 18,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: focused ? `${PRIMARY}1A` : 'transparent',
              }}
            >
              <Icon size={22} color={focused ? PRIMARY : ON_SURFACE_MUTED} strokeWidth={focused ? 2.4 : 2} />
            </View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: focused ? '700' : '500',
                color: focused ? PRIMARY : ON_SURFACE_MUTED,
              }}
            >
              {String(options.title ?? route.name)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
