import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { SURFACE_CONTAINER, ON_SURFACE, ON_SURFACE_MUTED, PRIMARY, RADIUS } from '../theme/tokens';

// Pill used for categories, vibes, filters and status badges.
//
// `tone` drives a tinted background + matching text colour (the design tints
// category pills — Alert pink, Buy/Sell violet, Recommend blue — rather than
// filling them solid). `selected` is the filled state used by pickers.
export default function Chip({
  label,
  icon: Icon,
  tone,
  selected,
  onPress,
  size = 'md',
}: {
  label: string;
  icon?: LucideIcon;
  tone?: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}) {
  const small = size === 'sm';

  const bg = selected ? PRIMARY : tone ? `${tone}1A` : SURFACE_CONTAINER;
  const fg = selected ? '#fff' : tone ? tone : ON_SURFACE;

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: bg,
        borderRadius: RADIUS.chip,
        paddingHorizontal: small ? 10 : 14,
        paddingVertical: small ? 5 : 8,
      }}
    >
      {Icon && <Icon size={small ? 12 : 14} color={fg} strokeWidth={2.2} />}
      <Text style={{ fontSize: small ? 11 : 13, fontWeight: '600', color: fg }}>{label}</Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      {body}
    </Pressable>
  );
}

// Neutral secondary text colour, exported so callers can match Chip's muted
// styling without reaching into tokens for the same value.
export const CHIP_MUTED = ON_SURFACE_MUTED;
