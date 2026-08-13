import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

// Small storefront/shopping-bag illustration for the Bazaar entry card on
// GuardScreen (Bazaar moved from the tab bar to a card inside Guard — see
// navigation/MainTabs.tsx). Uses the same brand gradient as the nav's raised
// centre button so it reads as part of the same design system.
export default function BazaarIllustration({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="bazaarBagGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#0B72A8" />
          <Stop offset="1" stopColor="#8127CF" />
        </LinearGradient>
      </Defs>

      {/* handles */}
      <Path
        d="M22 22 C22 13 26 8 32 8 C38 8 42 13 42 22"
        fill="none"
        stroke="#0B72A8"
        strokeWidth={3.4}
        strokeLinecap="round"
      />

      {/* bag body */}
      <Path
        d="M15 22 H49 L46.5 54 C46.2 56.4 44.2 58 41.8 58 H22.2 C19.8 58 17.8 56.4 17.5 54 Z"
        fill="url(#bazaarBagGrad)"
      />

      {/* fold highlight */}
      <Path d="M18.4 26 H45.6" stroke="rgba(255,255,255,0.35)" strokeWidth={1.6} strokeLinecap="round" />

      {/* price tag */}
      <Circle cx={47} cy={16} r={11} fill="#FFFFFF" />
      <Path
        d="M42.2 10.2 L50.6 10.4 C51.4 10.4 52 11 52 11.8 L52.2 20.2 C52.2 20.7 52 21.2 51.6 21.5 L45.6 25.8 C44.9 26.3 43.9 26.2 43.3 25.5 L38.6 19.6 C38 18.9 38.1 17.9 38.8 17.3 L41.1 15.4"
        fill="#B10E6B"
      />
      <Circle cx={46.3} cy={14.3} r={1.6} fill="#FFFFFF" />

      {/* sparkles */}
      <Circle cx={10} cy={12} r={1.8} fill="#0EA5B7" />
      <Circle cx={54} cy={40} r={1.4} fill="#8127CF" />
      <Circle cx={10} cy={44} r={1.4} fill="#0B72A8" />
    </Svg>
  );
}
