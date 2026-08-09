import { View, Text, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, LogOut, type LucideIcon } from 'lucide-react-native';
import {
  ShieldCheck,
  MapPin,
  Users,
  Store,
  Megaphone,
  Trophy,
  Share2,
  UserCog,
  Repeat,
  Bookmark,
  Trash2,
  Ban,
  PhoneCall,
  Mic,
  Bell,
  Globe,
  FileText,
  Lock,
  HelpCircle,
} from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Row = { label: string; icon: LucideIcon; onPress: (nav: NativeStackNavigationProp<RootStackParamList>) => void };

// Phase 87 — sectioned settings: Community, Grow & promote, Account,
// Privacy & safety, Notifications, Preferences. Rows either go straight to
// an existing real screen (My Pages, Trusted Contacts, ...) or into
// SettingsDetail's generic renderer (Phase 88) for the 10 named leaf
// sections — every row here resolves to something real, matching this
// group's Definition of Done ("no dead links").
const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: 'Community',
    rows: [
      { label: 'Verification status', icon: ShieldCheck, onPress: (n) => n.navigate('SettingsDetail', { section: 'verification' }) },
      { label: 'My neighbourhood', icon: MapPin, onPress: (n) => n.navigate('SettingsDetail', { section: 'neighbourhood' }) },
      { label: 'Close friends', icon: Users, onPress: (n) => n.navigate('SettingsDetail', { section: 'close_friends' }) },
    ],
  },
  {
    title: 'Grow & promote',
    rows: [
      { label: 'My Pages', icon: Store, onPress: (n) => n.navigate('MyPages') },
      { label: 'Ads Manager', icon: Megaphone, onPress: (n) => n.navigate('AdsManager') },
      { label: 'Achievements', icon: Trophy, onPress: (n) => n.navigate('Achievements') },
      { label: 'Share profile', icon: Share2, onPress: (n) => n.navigate('ShareProfile') },
    ],
  },
  {
    title: 'Account',
    rows: [
      { label: 'Edit profile', icon: UserCog, onPress: (n) => n.navigate('EditProfile') },
      { label: 'Switch account', icon: Repeat, onPress: (n) => n.navigate('AccountSwitcher') },
      { label: 'Saved', icon: Bookmark, onPress: (n) => n.navigate('SettingsDetail', { section: 'saved' }) },
      { label: 'Delete account', icon: Trash2, onPress: (n) => n.navigate('SettingsDetail', { section: 'delete' }) },
    ],
  },
  {
    title: 'Privacy & safety',
    rows: [
      { label: 'Blocked users', icon: Ban, onPress: (n) => n.navigate('SettingsDetail', { section: 'blocked' }) },
      { label: 'Trusted contacts', icon: PhoneCall, onPress: (n) => n.navigate('TrustedContacts') },
      { label: 'Silent phrase', icon: Mic, onPress: (n) => n.navigate('SilentPhrase') },
    ],
  },
  {
    title: 'Notifications',
    rows: [{ label: 'Notification preferences', icon: Bell, onPress: (n) => n.navigate('SettingsDetail', { section: 'notifications' }) }],
  },
  {
    title: 'Preferences',
    rows: [
      { label: 'Language', icon: Globe, onPress: (n) => n.navigate('SettingsDetail', { section: 'language' }) },
      { label: 'Terms of service', icon: FileText, onPress: (n) => n.navigate('SettingsDetail', { section: 'terms' }) },
      { label: 'Privacy policy', icon: Lock, onPress: (n) => n.navigate('SettingsDetail', { section: 'privacy' }) },
      { label: 'Help & support', icon: HelpCircle, onPress: (n) => n.navigate('SettingsDetail', { section: 'help' }) },
    ],
  },
];

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScrollView className="flex-1 bg-[#FAFAFA]" contentContainerStyle={{ paddingBottom: 40 }}>
      {SECTIONS.map((section) => (
        <View key={section.title} className="mt-5">
          <Text className="text-[12px] font-semibold text-gray-400 px-5 mb-1.5 uppercase tracking-wide">{section.title}</Text>
          <View className="bg-white">
            {section.rows.map((row, i) => {
              const Icon = row.icon;
              return (
                <Pressable
                  key={row.label}
                  onPress={() => row.onPress(navigation)}
                  className="flex-row items-center gap-3 px-5 py-3.5"
                  style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#F3F4F6' }}
                >
                  <Icon size={18} color="#374151" />
                  <Text className="flex-1 text-[14px] text-[#1F1B17]">{row.label}</Text>
                  <ChevronRight size={16} color="#D1D5DB" />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="flex-row items-center justify-center gap-2 mx-5 mt-6 py-3.5 rounded-xl bg-white"
      >
        <LogOut size={16} color="#DC2626" />
        <Text className="text-[13px] font-bold text-red-600">Log out</Text>
      </Pressable>
    </ScrollView>
  );
}
