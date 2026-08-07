import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../shared/api/supabase';
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
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-[40px]">👋</Text>
        <Text className="text-[20px] font-bold text-[#1F1B17] mt-4 text-center">Welcome back!</Text>
        <Text className="text-[14px] text-gray-500 mt-2 text-center leading-relaxed">
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
    <View className="flex-1 bg-white px-6 pt-14">
      <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="w-9 h-9 -ml-1 justify-center">
        <Text className="text-[22px] text-[#262626]">←</Text>
      </Pressable>
      <Text className="text-[26px] font-bold text-[#262626] mt-6 tracking-tight">Verify OTP</Text>
      <Text className="text-[14px] text-gray-500 mt-2">
        Code sent to <Text className="text-[#262626] font-semibold">{phone}</Text>
      </Text>

      <View className="flex-row gap-3 mt-10 justify-center">
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
            className="w-11 h-14 rounded-xl border border-gray-200 text-center text-[20px] font-bold text-[#262626] bg-[#FAFAFA]"
          />
        ))}
      </View>

      {loading && <ActivityIndicator className="mt-6" color="#2196D6" />}
      {error !== '' && <Text className="text-[12px] text-red-600 mt-6 text-center">{error}</Text>}

      <Text className="text-[12px] text-gray-400 mt-8 text-center">
        Local dev: use test code <Text className="font-semibold text-gray-600">123456</Text> for +919876543210
      </Text>
    </View>
  );
}
