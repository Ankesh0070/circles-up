import Svg, { Path } from 'react-native-svg';

// Ported from the prototype (lines 262–280) — custom paper-plane share icon.
export default function PremiumShareIcon({
  size = 18,
  color = '#181C20',
  strokeWidth = 1.8,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M21.2 3.3 L2.5 10.9 c-.7 .3 -.7 1.3 0 1.6 l6.4 2.4 2.4 6.4 c.3 .7 1.3 .7 1.6 0 L20.7 3.8 c.3 -.7 -.4 -1.3 -1 -.9 z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path d="M11.3 12.7 L21 3.3" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
