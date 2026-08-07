import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import GradientButton from '../../shared/components/GradientButton';
import GradientText from '../../shared/components/GradientText';
import CircleUpLogo from '../../shared/components/CircleUpLogo';
import GoogleLogo from './GoogleLogo';
import GoogleAccountSheet from './GoogleAccountSheet';
import { supabase } from '../../shared/api/supabase';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;
type Method = 'email' | 'phone';

// Ported from the prototype (lines 786–965) — "SCREEN: CREATE ACCOUNT".
export default function SignupScreen({ navigation }: Props) {
  const [picked, setPicked] = useState<Method | null>(null);
  const [googleOpen, setGoogleOpen] = useState(false);
  // Phase 21 / edgecase.md §1.9 (🔴): self-declared 18+ gate, required before
  // any signup method can proceed. False declaration is a ToS violation
  // (enforceable, not preventable, at the app layer) — this at least makes
  // the user make an affirmative, logged choice rather than defaulting them in.
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ageWarning, setAgeWarning] = useState(false);

  const requireAgeGate = (proceed: () => void) => {
    if (!ageConfirmed) {
      setAgeWarning(true);
      return;
    }
    proceed();
  };

  if (picked === 'email') return <EmailSignupForm onBack={() => setPicked(null)} />;
  if (picked === 'phone') return <PhoneSignupForm onBack={() => setPicked(null)} navigation={navigation} />;

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <GoogleAccountSheet
        visible={googleOpen}
        mode="signup"
        onClose={() => setGoogleOpen(false)}
        onContinue={() => setGoogleOpen(false)}
      />
      <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="self-start -ml-1 mb-4">
        <Text className="text-[22px] text-[#262626]">←</Text>
      </Pressable>
      <CircleUpLogo size={52} />
      <Text className="text-[26px] font-bold text-[#262626] mt-6 tracking-tight">Create your account</Text>
      <Text className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
        Choose how you want to sign up. You can always link other methods later.
      </Text>

      <Pressable
        onPress={() => {
          setAgeConfirmed((v) => !v);
          setAgeWarning(false);
        }}
        className="flex-row items-start gap-2.5 mt-6 p-3 rounded-xl"
        style={{ backgroundColor: ageWarning ? '#FEF2F2' : '#F9FAFB', borderWidth: 1, borderColor: ageWarning ? '#FCA5A5' : '#E5E7EB' }}
      >
        <View
          className="w-5 h-5 rounded items-center justify-center mt-0.5"
          style={{ backgroundColor: ageConfirmed ? '#2196D6' : 'transparent', borderWidth: ageConfirmed ? 0 : 1.5, borderColor: '#9CA3AF' }}
        >
          {ageConfirmed && <Text className="text-white text-[12px]">✓</Text>}
        </View>
        <Text className="text-[12.5px] text-gray-600 flex-1 leading-relaxed">
          I confirm I'm 18 years or older. (Circle Up verifies your address and identity — false age declarations violate our Terms.)
        </Text>
      </Pressable>
      {ageWarning && <Text className="text-[11px] text-red-600 mt-1.5">Please confirm you're 18+ to continue.</Text>}

      <View className="mt-6 gap-3">
        <Pressable
          onPress={() => requireAgeGate(() => setGoogleOpen(true))}
          className="rounded-2xl p-4 flex-row items-center gap-3.5 bg-white"
          style={{ borderWidth: 2, borderColor: '#262626' }}
        >
          <View className="w-11 h-11 rounded-full bg-white border border-gray-200 items-center justify-center">
            <GoogleLogo size={22} />
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-bold text-[#262626]">Continue with Gmail</Text>
            <Text className="text-[11.5px] text-gray-500 mt-0.5">Fastest — use your Google account</Text>
          </View>
          <Text className="text-gray-400">›</Text>
        </Pressable>

        <Pressable onPress={() => requireAgeGate(() => setPicked('email'))} className="rounded-2xl p-4 flex-row items-center gap-3.5 bg-[#FAFAFA] border border-gray-200">
          <View className="w-11 h-11 rounded-full bg-white border border-gray-200 items-center justify-center">
            <Text className="text-[16px]">✉️</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-bold text-[#262626]">Sign up with Email</Text>
            <Text className="text-[11.5px] text-gray-500 mt-0.5">Use any email + a password</Text>
          </View>
          <Text className="text-gray-400">›</Text>
        </Pressable>

        <Pressable onPress={() => requireAgeGate(() => setPicked('phone'))} className="rounded-2xl p-4 flex-row items-center gap-3.5 bg-[#FAFAFA] border border-gray-200">
          <View className="w-11 h-11 rounded-full bg-white border border-gray-200 items-center justify-center">
            <Text className="text-[16px]">📱</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-bold text-[#262626]">Sign up with Phone</Text>
            <Text className="text-[11.5px] text-gray-500 mt-0.5">+91 number + OTP verification</Text>
          </View>
          <Text className="text-gray-400">›</Text>
        </Pressable>
      </View>

      <View className="mt-auto mb-10 items-center">
        <Text className="text-[13px] text-gray-500">
          Already on Circle Up?{' '}
          <Text onPress={() => navigation.goBack()} className="font-bold" style={{ color: '#2196D6' }}>
            Log in
          </Text>
        </Text>
        <Text className="text-[11px] text-gray-400 mt-4 leading-relaxed text-center">
          By continuing, you agree to Circle Up's <Text className="text-[#262626] font-medium">Terms</Text> &{' '}
          <Text className="text-[#262626] font-medium">Privacy</Text>
        </Text>
      </View>
    </View>
  );
}

function EmailSignupForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const emailOk = email.includes('@');
  const passOk = password.length >= 6;

  const submit = async () => {
    if (!emailOk) return setErr('Please enter a valid email (must contain @)');
    if (!passOk) return setErr('Password must be at least 6 characters');
    setErr('');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setErr(error.message);
    // RootNavigator's onAuthStateChange picks up the new session; from there
    // the Address screen (Phase 16) is the next stop in the verification
    // gauntlet — wired once that phase's real navigation flow lands.
  };

  return (
    <View className="flex-1 bg-white px-6 pt-16 pb-8">
      <Pressable onPress={onBack} hitSlop={8} className="self-start -ml-1 mb-4">
        <Text className="text-[22px] text-[#262626]">←</Text>
      </Pressable>
      <Text className="text-[24px] font-bold text-[#262626] tracking-tight">Sign up with Email</Text>
      <Text className="text-[13px] text-gray-500 mt-1.5">We'll create your account right away.</Text>

      <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-8">Email</Text>
      <TextInput
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setErr('');
        }}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        className="mt-2 text-[17px] text-[#262626] font-medium border-b border-gray-200 pb-3"
      />
      <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-5">Create password</Text>
      <TextInput
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setErr('');
        }}
        placeholder="At least 6 characters"
        secureTextEntry
        className="mt-2 text-[17px] text-[#262626] font-medium border-b border-gray-200 pb-3"
      />
      <Text className="text-[11px] mt-3" style={{ color: err ? '#DC2626' : '#9CA3AF' }}>
        {err || (emailOk && passOk ? '✓ Looks good — ready to continue' : 'Email + password (6+ chars) needed')}
      </Text>

      <View className="mt-auto pt-6">
        <GradientButton onPress={submit} disabled={loading}>
          {loading ? '' : 'Create account'}
        </GradientButton>
        {loading && <ActivityIndicator style={{ marginTop: -38 }} color="#fff" />}
      </View>
    </View>
  );
}

function PhoneSignupForm({ onBack, navigation }: { onBack: () => void; navigation: Props['navigation'] }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const phoneOk = phone.length === 10;

  const submit = async () => {
    if (!phoneOk) return setErr('Enter a valid 10-digit phone number');
    setErr('');
    setLoading(true);
    const fullPhone = `+91${phone}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
    if (error) return setErr(error.message);
    navigation.navigate('Otp', { phone: fullPhone });
  };

  return (
    <View className="flex-1 bg-white px-6 pt-16 pb-8">
      <Pressable onPress={onBack} hitSlop={8} className="self-start -ml-1 mb-4">
        <Text className="text-[22px] text-[#262626]">←</Text>
      </Pressable>
      <Text className="text-[24px] font-bold text-[#262626] tracking-tight">Sign up with Phone</Text>
      <Text className="text-[13px] text-gray-500 mt-1.5">We'll text you a 6-digit OTP to verify your number.</Text>

      <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-8">Phone number</Text>
      <View className="mt-2 flex-row items-center gap-3 border-b border-gray-200 pb-3">
        <Text className="text-[#262626] font-semibold text-[17px]">🇮🇳 +91</Text>
        <View className="w-px h-6 bg-gray-200" />
        <TextInput
          value={phone}
          onChangeText={(t) => {
            setPhone(t.replace(/\D/g, '').slice(0, 10));
            setErr('');
          }}
          placeholder="98765 43210"
          keyboardType="number-pad"
          className="flex-1 text-[17px] text-[#262626] font-medium"
        />
      </View>
      <Text className="text-[11px] mt-3" style={{ color: err ? '#DC2626' : '#9CA3AF' }}>
        {err || (phoneOk ? '✓ Looks good — ready to send OTP' : `Enter ${10 - phone.length} more digit${10 - phone.length === 1 ? '' : 's'}`)}
      </Text>

      <View className="mt-auto pt-6">
        <GradientButton onPress={submit} disabled={loading}>
          {loading ? '' : 'Send OTP'}
        </GradientButton>
        {loading && <ActivityIndicator style={{ marginTop: -38 }} color="#fff" />}
      </View>
    </View>
  );
}
