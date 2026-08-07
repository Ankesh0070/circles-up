import { View, Text, Pressable } from 'react-native';
import { vibeCategories, MIN_VIBES } from '../../shared/data/vibeCategories';

// Ported from the prototype's vibe-picker section of ProfileSetup (lines
// 1746–1860) — categorized chip grid, minimum 3 selections, no upper limit.
//
// Takes `onToggle(vibe)` rather than `onChange(nextArray)` deliberately: the
// caller must apply it as a functional state update (`setVibes(prev => ...)`)
// rather than computing the next array from a closed-over `selected` prop —
// otherwise several toggles inside one React batch (e.g. this component's
// own render batching multiple onPress handlers from the same snapshot)
// silently clobber each other instead of composing.
export default function VibesPicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (vibe: string) => void;
}) {
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-[#1F1B17]">Pick your vibes</Text>
        <Text className="text-[12px]" style={{ color: selected.length >= MIN_VIBES ? '#4A7C59' : '#9CA3AF' }}>
          {selected.length}/{MIN_VIBES} min
        </Text>
      </View>

      {vibeCategories.map((cat) => (
        <View key={cat.name} className="mt-5">
          <Text className="text-[12px] font-semibold text-gray-500 mb-2">
            {cat.icon} {cat.name}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {cat.vibes.map((vibe) => {
              const active = selected.includes(vibe);
              return (
                <Pressable
                  key={vibe}
                  onPress={() => onToggle(vibe)}
                  className="px-3.5 py-2 rounded-full"
                  style={{
                    backgroundColor: active ? '#2196D6' : '#F3F4F6',
                    borderWidth: active ? 0 : 1,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <Text className="text-[13px] font-medium" style={{ color: active ? '#fff' : '#374151' }}>
                    {vibe}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
