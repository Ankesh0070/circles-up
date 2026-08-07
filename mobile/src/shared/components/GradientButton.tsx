import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IG_GRADIENT_COLORS, IG_GRADIENT_LOCATIONS, IG_GRADIENT_ANGLE } from '../theme/tokens';

// Ported from the prototype (lines 109–118). Architectural rounded-2xl with
// depth — deliberately not Instagram's pill shape (see prototype comment).
export default function GradientButton({
  children,
  onPress,
  disabled,
  style,
}: {
  children: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[{ opacity: disabled ? 0.5 : 1 }, style]}>
      {({ pressed }) => (
        <LinearGradient
          colors={IG_GRADIENT_COLORS}
          locations={IG_GRADIENT_LOCATIONS}
          start={IG_GRADIENT_ANGLE.start}
          end={IG_GRADIENT_ANGLE.end}
          style={{
            width: '100%',
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.98 : 1 }],
            shadowColor: '#2196D6',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 20,
            elevation: 6,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, letterSpacing: -0.2 }}>
            {children}
          </Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}
