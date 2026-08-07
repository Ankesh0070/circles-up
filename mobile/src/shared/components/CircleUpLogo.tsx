import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Ellipse, Line, Circle } from 'react-native-svg';

// Ported from the prototype (lines 47–105): sky-blue squircle, white
// hub-and-5-nodes network mark. Node positions are pre-computed on a circle
// of radius 26 around (50,52), 5 nodes evenly spaced starting at -90deg (top).
const CX = 50;
const CY = 52;
const R = 26;
const NODES = [0, 1, 2, 3, 4].map((i) => {
  const angle = (-90 + i * 72) * (Math.PI / 180);
  return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
});

export default function CircleUpLogo({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="cuLogoBg" x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#5DBEEC" />
          <Stop offset="55%" stopColor="#2196D6" />
          <Stop offset="100%" stopColor="#1B86C4" />
        </LinearGradient>
        <RadialGradient id="cuLogoGloss" cx="30%" cy="20%" r="60%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.22} />
          <Stop offset="70%" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="cuLogoShade" cx="70%" cy="90%" r="65%">
          <Stop offset="0%" stopColor="#000000" stopOpacity={0.14} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Ellipse cx={50} cy={95} rx={34} ry={2.5} fill="#000" opacity={0.1} />

      <Rect x={6} y={6} width={88} height={88} rx={24} ry={24} fill="url(#cuLogoBg)" />
      <Rect x={6} y={6} width={88} height={88} rx={24} ry={24} fill="url(#cuLogoShade)" />
      <Rect x={6} y={6} width={88} height={88} rx={24} ry={24} fill="url(#cuLogoGloss)" />

      {NODES.map((n, i) => (
        <Line
          key={`line-${i}`}
          x1={CX}
          y1={CY}
          x2={n.x}
          y2={n.y}
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.98}
        />
      ))}

      {NODES.map((n, i) => (
        <Circle key={`node-${i}`} cx={n.x} cy={n.y} r={6} fill="#FFFFFF" />
      ))}

      <Circle cx={CX} cy={CY} r={8.5} fill="#FFFFFF" />
    </Svg>
  );
}
