import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertTriangle, PhoneCall, Mic, MapPinned, Users } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import SosFlow from './SosFlow';
import SafetyAlertsFeed from './SafetyAlertsFeed';
import type { RootStackParamList } from '../../navigation/types';

// Ported from the prototype's GuardScreen (lines 3161–3266) — SOS button +
// 4 quick actions + live safety alert feed.
export default function GuardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [userId, setUserId] = useState<string | null>(null);
  const [sosOpen, setSosOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const quickActions = [
    { label: 'Fake Check-in Call', icon: PhoneCall, onPress: () => navigation.navigate('FakeCall') },
    { label: 'Silent Phrase', icon: Mic, onPress: () => navigation.navigate('SilentPhrase') },
    { label: 'Share Live Location', icon: MapPinned, onPress: () => navigation.navigate('ShareLocation') },
    { label: 'Trusted Contacts', icon: Users, onPress: () => navigation.navigate('TrustedContacts') },
  ];

  return (
    <ScrollView className="flex-1 bg-[#FAFAFA]" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text className="text-[22px] font-bold text-[#1F1B17]">Circle Guard</Text>
      <Text className="text-[13px] text-gray-500 mt-1">Apni circle safe rakho</Text>

      <Pressable
        onPress={() => userId && setSosOpen(true)}
        disabled={!userId}
        className="mt-6 rounded-3xl py-8 items-center"
        style={{ backgroundColor: '#FF0033' }}
      >
        <AlertTriangle size={36} color="#fff" strokeWidth={2.2} />
        <Text className="text-white text-[20px] font-bold mt-2">SOS</Text>
        <Text className="text-white/80 text-[12px] mt-1">Tap for emergency help</Text>
      </Pressable>

      <View className="flex-row flex-wrap gap-3 mt-6">
        {quickActions.map((a) => (
          <Pressable
            key={a.label}
            onPress={a.onPress}
            className="bg-white rounded-2xl p-4 items-center"
            style={{ width: '47%', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
          >
            <a.icon size={22} color="#2196D6" strokeWidth={1.9} />
            <Text className="text-[12px] font-medium text-[#1F1B17] mt-2 text-center">{a.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text className="text-[15px] font-bold text-[#1F1B17] mt-7 mb-2">Safety Alerts</Text>
      <SafetyAlertsFeed />

      {sosOpen && userId && <SosFlow userId={userId} onClose={() => setSosOpen(false)} />}
    </ScrollView>
  );
}
