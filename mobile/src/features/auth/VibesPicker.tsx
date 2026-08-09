import { View, Text, Pressable } from 'react-native';
import { vibeCategories, MIN_VIBES } from '../../shared/data/vibeCategories';
import { ON_SURFACE, ON_SURFACE_MUTED, PRIMARY, SUCCESS, SURFACE_CONTAINER, RADIUS } from '../../shared/theme/tokens';

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
  const enough = selected.length >= MIN_VIBES;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: ON_SURFACE }}>Pick your vibes</Text>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: RADIUS.chip,
            backgroundColor: enough ? `${SUCCESS}1A` : SURFACE_CONTAINER,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: enough ? SUCCESS : ON_SURFACE_MUTED }}>
            {selected.length}/{MIN_VIBES} min
          </Text>
        </View>
      </View>

      {vibeCategories.map((cat) => (
        <View key={cat.name} style={{ marginTop: 22 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: ON_SURFACE_MUTED, marginBottom: 10 }}>
            {cat.icon} {cat.name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cat.vibes.map((vibe) => {
              const active = selected.includes(vibe);
              return (
                <Pressable
                  key={vibe}
                  onPress={() => onToggle(vibe)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: RADIUS.chip,
                    backgroundColor: active ? PRIMARY : SURFACE_CONTAINER,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : ON_SURFACE }}>{vibe}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
