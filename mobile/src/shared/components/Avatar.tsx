import { View, Text, Image } from 'react-native';

// Ported from the prototype (lines 137–148).
const FALLBACK_COLORS = ['#FCA5A5', '#FCD34D', '#86EFAC', '#93C5FD', '#C4B5FD', '#F9A8D4', '#FDBA74'];

export default function Avatar({
  name,
  size = 36,
  color,
  uri,
}: {
  name: string;
  size?: number;
  color?: string;
  uri?: string | null;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  const bg = color || FALLBACK_COLORS[name.charCodeAt(0) % FALLBACK_COLORS.length];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '600', fontSize: size * 0.4 }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
