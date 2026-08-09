import { View, Text } from 'react-native';

// Stands in for every screen until its feature phase (see implementationplan.md)
// replaces it. Swap this out per-route, not all at once.
export default function PlaceholderScreen({ name }: { name: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-brand-cream px-6">
      <Text className="text-[22px] font-bold text-brand-ink tracking-tight">{name}</Text>
      <Text className="text-[13px] text-ink-muted mt-2 text-center">
        Not built yet — see implementationplan.md for this screen's phase
      </Text>
    </View>
  );
}
