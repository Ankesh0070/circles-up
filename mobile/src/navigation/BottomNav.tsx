import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Compass, Newspaper, Shield, Store, User, type LucideIcon } from 'lucide-react-native';
import {
  SURFACE,
  OUTLINE_VARIANT,
  NAV_GRADIENT_COLORS,
  NAV_GRADIENT_LOCATIONS,
  NAV_GRADIENT_ANGLE,
} from '../shared/theme/tokens';

const ICONS: Record<string, LucideIcon> = {
  Explore: Compass,
  Feed: Newspaper,
  Guard: Shield,
  Bazaar: Store,
  Profile: User,
};

// Nav redesign (Circle Up Nav Redesign.dc.html): the active tab is marked by a
// gradient-filled rounded square behind a white icon, inactive tabs sit in a
// muted slate, and the centre tab — Guard, the app's safety differentiator — is
// lifted into a raised circular gradient button so it reads as the hub of the
// bar. The five routes and their screens are unchanged; only the chrome is new.
const INACTIVE = '#8FA9BC'; // muted slate for unselected icons + labels
const ACTIVE_LABEL = '#0B72A8'; // mid-gradient blue for the selected label

export default function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        backgroundColor: SURFACE,
        borderTopWidth: 1,
        borderTopColor: OUTLINE_VARIANT,
        paddingHorizontal: 4,
        paddingTop: 8,
        paddingBottom: 20,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const Icon = ICONS[route.name] ?? Compass;
        const label = String(options.title ?? route.name);

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        // Centre route (Guard) is the raised gradient hub button.
        const isCentre = index === Math.floor(state.routes.length / 2);
        if (isCentre) {
          return (
            <View key={route.key} style={{ flex: 1, alignItems: 'center' }}>
              <Pressable onPress={onPress} hitSlop={8}>
                <LinearGradient
                  colors={NAV_GRADIENT_COLORS}
                  locations={NAV_GRADIENT_LOCATIONS}
                  start={NAV_GRADIENT_ANGLE.start}
                  end={NAV_GRADIENT_ANGLE.end}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: -26,
                    transform: [{ scale: focused ? 1.04 : 1 }],
                    shadowColor: '#0B72A8',
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 8,
                  }}
                >
                  <Icon size={24} color="#FFFFFF" strokeWidth={2.2} />
                </LinearGradient>
              </Pressable>
            </View>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            {focused ? (
              <LinearGradient
                colors={NAV_GRADIENT_COLORS}
                locations={NAV_GRADIENT_LOCATIONS}
                start={NAV_GRADIENT_ANGLE.start}
                end={NAV_GRADIENT_ANGLE.end}
                style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon size={20} color="#FFFFFF" strokeWidth={2.2} />
              </LinearGradient>
            ) : (
              <View style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={INACTIVE} strokeWidth={2} />
              </View>
            )}
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: focused ? '700' : '500',
                color: focused ? ACTIVE_LABEL : INACTIVE,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
