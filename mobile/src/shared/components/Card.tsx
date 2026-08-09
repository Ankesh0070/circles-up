import { View, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { SURFACE, RADIUS, CARD_SHADOW } from '../theme/tokens';

// The design system's base surface: a white card floating on the tinted
// canvas via a soft shadow — deliberately no border (style-guide: "soft
// shadows, no hard borders").
//
// Renders a Pressable only when `onPress` is given, so static cards don't
// pick up press behaviour or accessibility roles they shouldn't have.
export default function Card({
  children,
  onPress,
  padded = true,
  radius = RADIUS.card,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: SURFACE,
      borderRadius: radius,
      padding: padded ? 16 : 0,
    },
    CARD_SHADOW,
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }]}>
      {children}
    </Pressable>
  );
}
