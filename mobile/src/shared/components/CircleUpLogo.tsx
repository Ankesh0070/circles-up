import Svg, { Defs, LinearGradient, Stop, Circle, Path } from 'react-native-svg';
import { NAV_GRADIENT_COLORS, NAV_GRADIENT_LOCATIONS } from '../theme/tokens';

// Brand mark: a location-pin holding an infinity/interlocking-rings glyph —
// "find your people nearby" as a single shape. Pin fill reuses the app's
// established teal->navy brand ramp (NAV_GRADIENT_COLORS, same one driving
// the bottom-nav gradient) rather than inventing a new palette.
const CX = 50;
const CY = 44;
const R = 32;

// Parametric teardrop/pin outline: a rounded head tapering to a point,
// symmetric about the vertical centreline.
const PIN_PATH = `M ${CX} ${CY - R}
  C ${CX + R * 1.1} ${CY - R * 1.1}, ${CX + R * 1.3} ${CY + R * 0.3}, ${CX} ${CY + R * 2.2}
  C ${CX - R * 1.3} ${CY + R * 0.3}, ${CX - R * 1.1} ${CY - R * 1.1}, ${CX} ${CY - R}
  Z`;

export default function CircleUpLogo({
  size = 80,
  mono,
}: {
  size?: number;
  /** Single-colour pin fill for dark surfaces; the inner ring/infinity stay white. */
  mono?: string;
}) {
  return (
    <Svg width={size} height={(size * 125) / 100} viewBox="0 0 100 125" fill="none">
      <Defs>
        <LinearGradient id="cuPin" x1="0%" y1="0%" x2="100%" y2="100%">
          {NAV_GRADIENT_COLORS.map((c, i) => (
            <Stop key={c} offset={`${NAV_GRADIENT_LOCATIONS[i] * 100}%`} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>

      <Path d={PIN_PATH} fill={mono ?? 'url(#cuPin)'} />

      {/* Halo ring + interlocking loops read as an infinity mark inside the pin head. */}
      <Circle cx={CX} cy={CY - 4} r={20} stroke="#FFFFFF" strokeWidth={2.5} opacity={0.5} fill="none" />
      <Circle cx={CX - 8.5} cy={CY - 4} r={9} stroke="#FFFFFF" strokeWidth={4.5} fill="none" />
      <Circle cx={CX + 8.5} cy={CY - 4} r={9} stroke="#FFFFFF" strokeWidth={4.5} fill="none" />
    </Svg>
  );
}
