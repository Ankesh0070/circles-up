import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import {
  SURFACE,
  SURFACE_LOW,
  ON_SURFACE,
  ON_SURFACE_MUTED,
  OUTLINE_VARIANT,
  PRIMARY,
  ERROR,
  RADIUS,
} from '../../shared/theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;
const OTP_LENGTH = 6; // matches supabase/config.toml auth.sms.test_otp

// Ported from the prototype (lines 968–1025), extended from 4 to 6 digits to
// match Supabase's default OTP length, and wired to real supabase.auth.verifyOtp.
export default function OtpScreen({ navigation, route }: Props) {
  const { phone } = route.params;
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingAccountNotice, setExistingAccountNotice] = useState(false);
  const refs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const verify = async (code: string) => {
    setLoading(true);
    setError('');
    const { data, error: verifyError } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
    if (verifyError) {
      setLoading(false);
      setError(verifyError.message);
      setOtp(Array(OTP_LENGTH).fill(''));
      refs.current[0]?.focus();
      return;
    }

    // Phase 21 / edgecase.md §1.10: Supabase's phone auth treats a phone
    // number as a permanent account identity — verifyOtp on a number that
    // already has an account signs into THAT account, it never silently
    // creates a second one. So "new signup on a reused number gets zero
    // inherited trust" is only partially enforceable here: if the SAME
    // person re-verifies their own number, inheriting their history is
    // correct and expected. If a telecom recycles an abandoned number to a
    // genuinely different person, this app has no technical way to tell
    // that apart from a normal returning login — that's a real, open gap,
    // not something this check fixes. What IS fixed: the UI never silently
    // pretends a "Sign up with Phone" flow created a fresh identity when it
    // actually landed on a pre-existing, already-onboarded account — it
    // says so honestly instead.
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('onboarding_completed').eq('id', data.user.id).single();
      if (profile?.onboarding_completed) {
        setExistingAccountNotice(true);
        setLoading(false);
        return;
      }
    }
    setLoading(false);
    // Fresh account (or existing-but-unfinished onboarding): RootNavigator
    // routes to Address/Main appropriately. Nothing to navigate here.
  };

  if (existingAccountNotice) {
    return (
      <View style={{ flex: 1, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 48 }}>👋</Text>
        <Text style={{ fontSize: 24, fontWeight: '700', color: ON_SURFACE, marginTop: 18, textAlign: 'center' }}>
          Welcome back!
        </Text>
        <Text style={{ fontSize: 14.5, color: ON_SURFACE_MUTED, marginTop: 10, textAlign: 'center', lineHeight: 21 }}>
          This number is already registered and verified — we've signed you in instead of creating a new account.
        </Text>
      </View>
    );
  }

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== '')) verify(next.join(''));
  };

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE, paddingHorizontal: 24, paddingTop: 64 }}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
        <ArrowLeft size={24} color={ON_SURFACE} />
      </Pressable>
      <Text style={{ fontSize: 28, fontWeight: '700', color: ON_SURFACE, letterSpacing: -0.5 }}>Verify OTP</Text>
      <Text style={{ fontSize: 14.5, color: ON_SURFACE_MUTED, marginTop: 8 }}>
        Code sent to <Text style={{ color: ON_SURFACE, fontWeight: '700' }}>{phone}</Text>
      </Text>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 40, justifyContent: 'center' }}>
        {otp.map((d, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChangeText={(v) => handleChange(i, v)}
            keyboardType="number-pad"
            maxLength={1}
            editable={!loading}
            style={{
              width: 48,
              height: 60,
              borderRadius: RADIUS.card,
              borderWidth: 1.5,
              // The whole row turns red on a rejected code — a single wrong
              // box would be misleading since the code is validated as one.
              borderColor: error ? ERROR : d ? PRIMARY : OUTLINE_VARIANT,
              backgroundColor: SURFACE,
              textAlign: 'center',
              fontSize: 22,
              fontWeight: '700',
              color: ON_SURFACE,
            }}
          />
        ))}
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 24 }} color={PRIMARY} />}
      {error !== '' && (
        <Text style={{ fontSize: 13, color: ERROR, marginTop: 24, textAlign: 'center', fontWeight: '600' }}>{error}</Text>
      )}

      <View
        style={{
          marginTop: 36,
          padding: 14,
          borderRadius: RADIUS.card,
          backgroundColor: SURFACE_LOW,
        }}
      >
        <Text style={{ fontSize: 12.5, color: ON_SURFACE_MUTED, textAlign: 'center' }}>
          Local dev: use test code <Text style={{ fontWeight: '700', color: ON_SURFACE }}>123456</Text> for
          +919876543210
        </Text>
      </View>
    </View>
  );
}
