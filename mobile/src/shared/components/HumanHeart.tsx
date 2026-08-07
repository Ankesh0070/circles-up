import { useId } from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, G } from 'react-native-svg';

// Ported from the prototype (lines 154–258) — the "this is a real heart" like
// icon. Outline state is the standard heart glyph; filled state reveals a
// detailed anatomical render (aorta, vena cava, ventricle muscle, veins).
//
// NOTE: react-native-svg has no SVG <filter> support, so the web version's
// feDropShadow on the filled heart is dropped here — everything else
// (gradients, paths, colors) is a faithful 1:1 port.
export default function HumanHeart({
  size = 26,
  filled = false,
  color = '#C8232C',
  strokeColor,
}: {
  size?: number;
  filled?: boolean;
  color?: string;
  strokeColor?: string;
}) {
  const uid = useId();

  if (!filled) {
    const sc = strokeColor || '#262626';
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          fill="none"
          stroke={sc}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  const deepMuscle = `deep-muscle-${uid}`;
  const aortaTube = `aorta-tube-${uid}`;
  const venaCava = `vena-cava-${uid}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={deepMuscle} x1="10%" y1="0%" x2="90%" y2="100%">
          <Stop offset="0%" stopColor="#FF4545" />
          <Stop offset="40%" stopColor="#D31A1A" />
          <Stop offset="75%" stopColor="#8A0B0B" />
          <Stop offset="100%" stopColor="#3D0000" />
        </LinearGradient>
        <LinearGradient id={aortaTube} x1="0%" y1="30%" x2="100%" y2="70%">
          <Stop offset="0%" stopColor="#FF3B3B" />
          <Stop offset="50%" stopColor="#B20C0C" />
          <Stop offset="100%" stopColor="#5E0000" />
        </LinearGradient>
        <LinearGradient id={venaCava} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#42A5F5" />
          <Stop offset="50%" stopColor="#1565C0" />
          <Stop offset="100%" stopColor="#0D47A1" />
        </LinearGradient>
      </Defs>

      <G>
        {/* Vena cava tubes (blue) */}
        <G>
          <Path
            d="M36 15 C34 7, 43 6, 45 15 L43 32 C38 31, 35 24, 36 15 Z"
            fill={`url(#${venaCava})`}
            stroke="#0A2540"
            strokeWidth={0.5}
          />
          <Path
            d="M37 68 C35 78, 41 82, 43 88 L48 78 Z"
            fill={`url(#${venaCava})`}
            stroke="#0A2540"
            strokeWidth={0.5}
          />
        </G>

        {/* Aorta main arch with branches */}
        <G>
          <Path
            d="M43 25 C41 8, 66 7, 68 26 C64 30, 56 30, 51 27 L51 37 C45 35, 44 28, 43 25 Z"
            fill={`url(#${aortaTube})`}
            stroke="#420000"
            strokeWidth={0.6}
          />
          <Path d="M47 15 L46 7 C46 5, 51 5, 51 7 L50 13 Z" fill={`url(#${aortaTube})`} stroke="#420000" strokeWidth={0.4} />
          <Path d="M54 12 L54 5 C54 3, 59 3, 59 5 L58 13 Z" fill={`url(#${aortaTube})`} stroke="#420000" strokeWidth={0.4} />
          <Path d="M61 14 L62 7 C62 5, 67 5, 67 7 L65 17 Z" fill={`url(#${aortaTube})`} stroke="#420000" strokeWidth={0.4} />
        </G>

        {/* Atrium chambers */}
        <G opacity={0.9}>
          <Path d="M36 35 C28 37, 26 46, 33 54 C37 52, 38 43, 36 35 Z" fill={`url(#${deepMuscle})`} />
          <Path d="M67 31 C75 29, 80 37, 76 44 C71 45, 67 40, 67 31 Z" fill={`url(#${deepMuscle})`} />
        </G>

        {/* Main ventricle muscle body */}
        <Path
          d="M42 35 C28 39, 30 60, 46 77 C55 86, 60 92, 63 94 C65 92, 71 84, 76 75 C84 60, 82 43, 67 39 C57 36, 49 40, 42 35 Z"
          fill={`url(#${deepMuscle})`}
          stroke="#1F0000"
          strokeWidth={0.8}
        />

        {/* Vascular veins */}
        <G strokeLinecap="round" fill="none">
          <Path d="M50 39 Q57 52, 61 69 Q63 80, 61 87" stroke="#FF1744" strokeWidth={1.2} />
          <Path d="M53 46 Q47 50, 41 49" stroke="#FF1744" strokeWidth={0.7} />
          <Path d="M41 49 Q37 49, 35 53" stroke="#FF1744" strokeWidth={0.5} />
          <Path d="M55 55 Q48 62, 44 65" stroke="#FF1744" strokeWidth={0.8} />
          <Path d="M44 65 Q41 70, 40 76" stroke="#FF1744" strokeWidth={0.5} />
          <Path d="M56 48 Q66 51, 71 46" stroke="#FF1744" strokeWidth={0.8} />
          <Path d="M59 58 Q68 64, 73 61" stroke="#FF1744" strokeWidth={0.7} />
          <Path d="M60 71 Q68 76, 70 82" stroke="#FF1744" strokeWidth={0.6} />
          <Path d="M40 43 Q35 52, 38 61" stroke="#29B6F6" strokeWidth={0.7} opacity={0.85} />
          <Path d="M38 61 Q33 67, 32 72" stroke="#29B6F6" strokeWidth={0.5} opacity={0.75} />
        </G>

        {/* Muscle contours */}
        <G stroke="#FF8A80" strokeWidth={0.4} fill="none" opacity={0.35}>
          <Path d="M66 43 C72 48, 75 58, 71 69" />
          <Path d="M48 79 C53 84, 58 88, 61 91" />
        </G>
      </G>
    </Svg>
  );
}
