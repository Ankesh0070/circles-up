import { View, Text, Pressable } from 'react-native';

// Ported from the prototype's REACTIONS/ReactionPicker (lines 1934–2003) —
// five-finger reaction tray, triggered by long-press on the like button.
export const REACTIONS = [
  { id: 'like', emoji: '👍', label: 'Like' },
  { id: 'notice', emoji: '👆', label: 'Notice' },
  { id: 'diss', emoji: '🖕', label: 'Diss' },
  { id: 'engaged', emoji: '💍', label: 'Engaged' },
  { id: 'out', emoji: '🤙', label: "I'm out" },
] as const;

export type ReactionId = (typeof REACTIONS)[number]['id'];

export default function ReactionPicker({ onSelect }: { onSelect: (id: ReactionId) => void }) {
  return (
    <View
      className="absolute bottom-full mb-2 left-0 flex-row bg-white rounded-full px-2 py-1.5 gap-1"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}
    >
      {REACTIONS.map((r) => (
        <Pressable key={r.id} onPress={() => onSelect(r.id)} className="items-center px-1.5 py-1 active:scale-125">
          <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
        </Pressable>
      ))}
    </View>
  );
}
