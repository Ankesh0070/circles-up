import { Pressable, Text, View, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import {
  IG_GRADIENT_COLORS,
  IG_GRADIENT_LOCATIONS,
  IG_GRADIENT_ANGLE,
  PRIMARY,
  RADIUS,
} from '../theme/tokens';

// Primary CTA for the Stitch design system: a fully-rounded pill running the
// brand blue -> violet gradient, with an optional trailing arrow (the design
// uses "Log in ->" on entry screens).
//
// `loading` renders a spinner in place of the label rather than beside it, so
// the button never changes width mid-press.
export default function GradientButton({
  children,
  onPress,
  disabled,
  loading,
  showArrow,
  style,
}: {
  children: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  showArrow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;

  return (
    <Pressable onPress={onPress} disabled={inactive} style={[{ opacity: inactive ? 0.55 : 1 }, style]}>
      {({ pressed }) => (
        <LinearGradient
          colors={IG_GRADIENT_COLORS}
          locations={IG_GRADIENT_LOCATIONS}
          start={IG_GRADIENT_ANGLE.start}
          end={IG_GRADIENT_ANGLE.end}
          style={{
            width: '100%',
            paddingVertical: 17,
            borderRadius: RADIUS.chip,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.985 : 1 }],
            shadowColor: PRIMARY,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.28,
            shadowRadius: 16,
            elevation: 5,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: -0.2 }}>
                {children}
              </Text>
              {showArrow && <ArrowRight size={18} color="#fff" strokeWidth={2.4} />}
            </View>
          )}
        </LinearGradient>
      )}
    </Pressable>
  );
}
