import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertTriangle, PhoneCall, Mic, MapPinned, Users, BellRing } from 'lucide-react-native';
import Card from '../../shared/components/Card';
import { supabase } from '../../shared/api/supabase';
import SosFlow from './SosFlow';
import SafetyAlertsFeed from './SafetyAlertsFeed';
import {
  BACKGROUND,
  ON_SURFACE,
  ON_SURFACE_MUTED,
  PRIMARY,
  SECONDARY,
  TERTIARY,
  SOS_RED,
  FLOAT_SHADOW,
} from '../../shared/theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

// Stitch design system: a large circular SOS button (not a rectangle) as the
// screen's single focal point, a 2x2 quick-action grid with tinted icon
// circles, then the live safety-alert feed.
//
// Style-guide rule #1: safety red only ever appears on this screen.
export default function GuardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [userId, setUserId] = useState<string | null>(null);
  const [sosOpen, setSosOpen] = useState(false);

  useEffect(() => {
    // Phase 97 (network-degradation testing) found a real bug here:
    // `getUser()` re-verifies the session against the server on every call,
    // so with the network down this promise never resolves and the SOS
    // button stays permanently disabled — on the one screen that must work
    // with zero connectivity. `getSession()` reads the already-valid session
    // from local storage without a network round-trip.
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
  }, []);

  const quickActions = [
    { label: 'Fake Call', sub: 'Schedule a check-in', icon: PhoneCall, tint: SECONDARY, onPress: () => navigation.navigate('FakeCall') },
    { label: 'Silent Phrase', sub: 'Voice trigger', icon: Mic, tint: PRIMARY, onPress: () => navigation.navigate('SilentPhrase') },
    { label: 'Live Location', sub: 'Share with trusted', icon: MapPinned, tint: TERTIARY, onPress: () => navigation.navigate('ShareLocation') },
    { label: 'Trusted Circle', sub: 'Manage contacts', icon: Users, tint: PRIMARY, onPress: () => navigation.navigate('TrustedContacts') },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BACKGROUND }}
      contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}
    >
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: PRIMARY }}>Circle Guard</Text>
        <Text style={{ fontSize: 14.5, color: ON_SURFACE_MUTED, marginTop: 4 }}>Apni circle safe rakho</Text>
      </View>

      {/* Circular SOS. Disabled only while the session id is still resolving
          from local storage — which is near-instant and never network-bound. */}
      <View style={{ alignItems: 'center', marginTop: 36, marginBottom: 36 }}>
        <Pressable
          onPress={() => userId && setSosOpen(true)}
          disabled={!userId}
          style={({ pressed }) => [
            {
              width: 210,
              height: 210,
              borderRadius: 105,
              backgroundColor: SOS_RED,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !userId ? 0.5 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
            FLOAT_SHADOW,
            { shadowColor: SOS_RED, shadowOpacity: 0.35, shadowRadius: 24 },
          ]}
        >
          <AlertTriangle size={54} color="#fff" strokeWidth={2.2} />
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 10, letterSpacing: 1 }}>SOS</Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 }}>Tap for emergency help</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {quickActions.map((a) => (
          <Card key={a.label} onPress={a.onPress} style={{ width: '47.5%' }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${a.tint}1A`,
              }}
            >
              <a.icon size={21} color={a.tint} strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: ON_SURFACE, marginTop: 12 }}>{a.label}</Text>
            <Text style={{ fontSize: 12, color: ON_SURFACE_MUTED, marginTop: 2 }}>{a.sub}</Text>
          </Card>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32, marginBottom: 12 }}>
        <BellRing size={19} color={SOS_RED} strokeWidth={2.2} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: ON_SURFACE }}>Safety Alerts in Area</Text>
      </View>
      <SafetyAlertsFeed />

      {sosOpen && userId && <SosFlow userId={userId} onClose={() => setSosOpen(false)} />}
    </ScrollView>
  );
}
