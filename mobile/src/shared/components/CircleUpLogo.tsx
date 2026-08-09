import Svg, { Defs, LinearGradient, Stop, Circle, Path, G } from 'react-native-svg';
import { PRIMARY, SECONDARY, TERTIARY } from '../theme/tokens';

// Stitch design-system mark: three overlapping circles reading as a
// neighbourhood radius / a small group standing together. The circles are
// stroked (not filled) so the overlaps stay visible as the "belonging" idea,
// and the shared centre is filled to anchor the mark at small sizes.
//
// Geometry: three circles of radius R arranged on a triangle around (50,50),
// two on the bottom and one on top — matching the design's lockup.
const R = 20;
const CX = 50;
const CY = 50;
const SPREAD = 13;

const CIRCLES = [
  { cx: CX, cy: CY - SPREAD, stroke: 'url(#cuTop)' }, // top
  { cx: CX - SPREAD * 1.15, cy: CY + SPREAD * 0.75, stroke: 'url(#cuLeft)' }, // bottom-left
  { cx: CX + SPREAD * 1.15, cy: CY + SPREAD * 0.75, stroke: 'url(#cuRight)' }, // bottom-right
];

export default function CircleUpLogo({
  size = 80,
  mono,
}: {
  size?: number;
  /** Single-colour version for tab bars / dark surfaces. */
  mono?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="cuTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={PRIMARY} />
          <Stop offset="100%" stopColor={SECONDARY} />
        </LinearGradient>
        <LinearGradient id="cuLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={PRIMARY} />
          <Stop offset="100%" stopColor="#4A47B8" />
        </LinearGradient>
        <LinearGradient id="cuRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={SECONDARY} />
          <Stop offset="100%" stopColor={TERTIARY} />
        </LinearGradient>
        <LinearGradient id="cuCore" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={PRIMARY} />
          <Stop offset="100%" stopColor={SECONDARY} />
        </LinearGradient>
      </Defs>

      <G>
        {CIRCLES.map((c, i) => (
          <Circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={R}
            stroke={mono ?? c.stroke}
            strokeWidth={6}
            strokeLinejoin="round"
            fill="none"
            opacity={mono ? 1 : 0.95}
          />
        ))}

        {/* Shared centre — the overlap where all three circles meet. Reads as
            a pin head at large sizes and keeps the mark legible at 24px. */}
        <Path
          d={`M ${CX} ${CY - 6.5}
              C ${CX + 6} ${CY - 11}, ${CX + 12} ${CY - 3}, ${CX} ${CY + 7}
              C ${CX - 12} ${CY - 3}, ${CX - 6} ${CY - 11}, ${CX} ${CY - 6.5} Z`}
          fill={mono ?? 'url(#cuCore)'}
        />
      </G>
    </Svg>
  );
}
