import { View, Text, Pressable } from 'react-native';
import { User, Briefcase, HeartHandshake, ChevronRight } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PageTypeSelector'>;

const PAGE_TYPES = [
  { type: 'personal' as const, label: 'Personal', blurb: 'Showcase your work or hobby — profession, portfolio.', icon: User, color: '#006290' },
  { type: 'business' as const, label: 'Business', blurb: 'A local shop or service — GST number, address.', icon: Briefcase, color: '#F59E0B' },
  { type: 'ngo' as const, label: 'NGO', blurb: 'Accept donations once approved — Darpan ID required.', icon: HeartHandshake, color: '#DC2626' },
];

// Phase 76 (implementationplan.md Group I) — entry chooser for the 3 page
// variants; each hands off to CreatePageScreen with its type-specific
// fields (Phase 77).
export default function PageTypeSelectorScreen({ navigation }: Props) {
  return (
    <View className="flex-1 bg-white px-5 pt-4">
      <Text className="text-[18px] font-bold text-[#181C20]">What kind of page?</Text>
      <Text className="text-[13px] text-ink-muted mt-1">You can create more than one.</Text>

      <View className="mt-5 gap-3">
        {PAGE_TYPES.map((pt) => {
          const Icon = pt.icon;
          return (
            <Pressable
              key={pt.type}
              onPress={() => navigation.navigate('CreatePage', { pageType: pt.type })}
              className="flex-row items-center gap-3 bg-white rounded-2xl p-4"
              style={{ borderWidth: 1, borderColor: '#EBEEF4' }}
            >
              <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: `${pt.color}1A` }}>
                <Icon size={20} color={pt.color} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#181C20]">{pt.label}</Text>
                <Text className="text-[12px] text-ink-muted mt-0.5">{pt.blurb}</Text>
              </View>
              <ChevronRight size={18} color="#BEC7D1" />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
