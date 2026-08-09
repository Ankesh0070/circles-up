import type { ReactNode } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IG_GRADIENT_COLORS, IG_GRADIENT_LOCATIONS, IG_GRADIENT_ANGLE } from '../theme/tokens';

// Ported from the prototype (lines 121–134) — story-ring avatar border.
export default function GradientRing({
  children,
  size = 64,
  active = true,
  hasStory = true,
}: {
  children: ReactNode;
  size?: number;
  active?: boolean;
  hasStory?: boolean;
}) {
  const showGradient = hasStory && active;
  const ringPadding = 2.5;

  const inner = (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: size / 2,
        padding: 2,
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </View>
  );

  if (!showGradient) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          padding: ringPadding,
          backgroundColor: '#BEC7D1',
        }}
      >
        {inner}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={IG_GRADIENT_COLORS}
      locations={IG_GRADIENT_LOCATIONS}
      start={IG_GRADIENT_ANGLE.start}
      end={IG_GRADIENT_ANGLE.end}
      style={{ width: size, height: size, borderRadius: size / 2, padding: ringPadding }}
    >
      {inner}
    </LinearGradient>
  );
}
