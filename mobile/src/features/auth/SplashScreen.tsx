import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeInDown,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CircleUpLogo from '../../shared/components/CircleUpLogo';
import { NAV_GRADIENT_COLORS } from '../../shared/theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

// Full-bleed dark navy — the darkest stop of the brand's own nav gradient,
// not a new colour, so the pin's gradient fill reads as "cut from the same
// cloth" as the background rather than floating on an unrelated backdrop.
const SPLASH_BG = NAV_GRADIENT_COLORS[0];
const ACCENT = NAV_GRADIENT_COLORS[3]; // brightest stop — "Up" + tagline
const TEXT_PANEL_WIDTH = 230;

// Sequence: the pin mark appears first (scale+fade in), then — once it's
// settled — a panel to its right "opens" like a drawer sliding out from
// behind the logo, its width animating 0 -> full, revealing the wordmark and
// tagline as it grows rather than having them simply fade in place.
export default function SplashScreen({ navigation }: Props) {
  const panelWidth = useSharedValue(0);

  useEffect(() => {
    panelWidth.value = withDelay(550, withTiming(TEXT_PANEL_WIDTH, { duration: 650, easing: Easing.out(Easing.cubic) }));
    const t = setTimeout(() => navigation.replace('Login'), 2700);
    return () => clearTimeout(t);
  }, [navigation, panelWidth]);

  const panelStyle = useAnimatedStyle(() => ({
    width: panelWidth.value,
    opacity: Math.min(1, panelWidth.value / (TEXT_PANEL_WIDTH * 0.6)),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: SPLASH_BG, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Animated.View entering={ZoomIn.duration(550).easing(Easing.out(Easing.back(1.4)))}>
          <CircleUpLogo size={72} />
        </Animated.View>

        <Animated.View style={[{ overflow: 'hidden' }, panelStyle]}>
          <View style={{ width: TEXT_PANEL_WIDTH, paddingLeft: 14 }}>
            <Text style={{ fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }}>
              <Text style={{ color: '#FFFFFF' }}>Circle</Text>
              <Text style={{ color: ACCENT }}>Up</Text>
            </Text>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: ACCENT, opacity: 0.85, letterSpacing: 1.6, marginTop: 4 }}>
              FIND YOUR PEOPLE NEARBY
            </Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(1500).duration(500)} style={{ position: 'absolute', bottom: 48 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, color: '#FFFFFF', opacity: 0.55, fontWeight: '500' }}>from</Text>
          <Text style={{ fontSize: 12.5, color: ACCENT, fontWeight: '700' }}>India</Text>
        </View>
      </Animated.View>
    </View>
  );
}
