import { View, Text, type TextStyle, type StyleProp } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { IG_GRADIENT_COLORS, IG_GRADIENT_LOCATIONS, IG_GRADIENT_ANGLE } from '../theme/tokens';

// Replaces the prototype's `gradientText` style object (lines 37–42), which
// relied on CSS `-webkit-background-clip: text` — no RN equivalent, so this
// masks a gradient fill with the text shape via MaskedView.
//
// NOTE: @react-native-masked-view has full native support on iOS/Android (the
// actual target platform) but only partial support on react-native-web — it
// degrades to plain black text there instead of failing. Not a concern for
// this app, but don't be alarmed if the `npm run web` preview shows solid
// text instead of a gradient; verify gradient rendering on a real
// iOS/Android build instead.
export default function GradientText({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    // pointerEvents="none" is load-bearing, not cosmetic: MaskedView renders
    // its own stacking layers on web, and those layers swallow the click
    // before it reaches an enclosing Pressable. That silently broke both
    // auth entry points ("Create new account" on Login, "Log in" on Signup) —
    // the label rendered fine but the tap did nothing. The text is never
    // interactive itself, so making it click-transparent costs nothing and
    // lets the press land on whatever wraps it.
    <View pointerEvents="none">
      <MaskedView maskElement={<Text style={[style, { backgroundColor: 'transparent' }]}>{children}</Text>}>
        <LinearGradient
          colors={IG_GRADIENT_COLORS}
          locations={IG_GRADIENT_LOCATIONS}
          start={IG_GRADIENT_ANGLE.start}
          end={IG_GRADIENT_ANGLE.end}
        >
          <Text style={[style, { opacity: 0 }]}>{children}</Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );
}
