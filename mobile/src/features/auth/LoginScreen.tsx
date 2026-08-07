import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CircleUpLogo from '../../shared/components/CircleUpLogo';
import GradientText from '../../shared/components/GradientText';
import GradientButton from '../../shared/components/GradientButton';
import GoogleLogo from './GoogleLogo';
import GoogleAccountSheet from './GoogleAccountSheet';
import { supabase } from '../../shared/api/supabase';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

// Ported from the prototype (lines 662–782) — "SCREEN: LOGIN (multi-method)".
export default function LoginScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canContinue = identifier.trim().length >= 3 && password.length >= 6;

  const handleIdentifierChange = (val: string) => {
    setError('');
    const digitsOnly = val.replace(/[\s+-]/g, '');
    if (/^\d+$/.test(digitsOnly)) {
      setIdentifier(digitsOnly.slice(0, 10));
    } else {
      setIdentifier(val);
    }
  };

  const handleLogin = async () => {
    if (!canContinue || loading) return;
    setLoading(true);
    setError('');
    const trimmed = identifier.trim();
    // Supabase Auth natively supports email+password and phone+password.
    // "Username" login (a 3rd option the prototype's placeholder text
    // implies) has no backing table yet — that lands with profiles in a
    // later phase — so it's an honest inline error here, not a silent no-op.
    const isEmail = trimmed.includes('@');
    const isPhone = /^\d{10}$/.test(trimmed);

    if (!isEmail && !isPhone) {
      setError("Username login isn't available yet — use your phone number or email.");
      setLoading(false);
      return;
    }

    const { error: authError } = isEmail
      ? await supabase.auth.signInWithPassword({ email: trimmed, password })
      : await supabase.auth.signInWithPassword({ phone: `+91${trimmed}`, password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    // RootNavigator's onAuthStateChange listener (Phase 8 wiring) switches
    // to the Main stack automatically once the session updates.
  };

  return (
    <View className="flex-1 bg-white px-8 pt-20 pb-6">
      <GoogleAccountSheet
        visible={googleOpen}
        mode="login"
        onClose={() => setGoogleOpen(false)}
        onContinue={() => {
          setGoogleOpen(false);
          setError('Google sign-in needs a real OAuth client — not wired yet (see GoogleAccountSheet.tsx).');
        }}
      />

      <View className="items-center">
        <CircleUpLogo size={68} />
        <GradientText style={{ fontSize: 34, fontWeight: '700', marginTop: 12, letterSpacing: -0.5 }}>
          Circle Up
        </GradientText>
      </View>

      <View className="mt-12 gap-2.5">
        <TextInput
          value={identifier}
          onChangeText={handleIdentifierChange}
          placeholder="Phone number, username or email"
          autoCapitalize="none"
          autoCorrect={false}
          className="w-full bg-[#FAFAFA] border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-[#262626]"
        />
        <View className="relative">
          <TextInput
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError('');
            }}
            placeholder="Password"
            secureTextEntry={!showPassword}
            className="w-full bg-[#FAFAFA] border border-gray-200 rounded-xl px-4 py-3 pr-14 text-[14px] text-[#262626]"
          />
          {password.length > 0 && (
            <Pressable onPress={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">
              <Text className="text-[12px] font-semibold text-[#262626]">{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          )}
        </View>
        {error !== '' && <Text className="text-[12px] text-red-600 mt-1">{error}</Text>}
      </View>

      <View className="mt-4">
        <GradientButton onPress={handleLogin} disabled={!canContinue || loading}>
          {loading ? '' : 'Log in'}
        </GradientButton>
        {loading && <ActivityIndicator style={{ marginTop: -38 }} color="#fff" />}
      </View>

      <Pressable className="mt-5">
        <GradientText style={{ fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
          Forgot password?
        </GradientText>
      </Pressable>

      <View className="flex-row items-center gap-4 my-7">
        <View className="flex-1 h-px bg-gray-200" />
        <Text className="text-[12px] text-gray-400 font-semibold tracking-wider">OR</Text>
        <View className="flex-1 h-px bg-gray-200" />
      </View>

      <Pressable onPress={() => setGoogleOpen(true)} className="flex-row items-center justify-center gap-2.5">
        <GoogleLogo size={20} />
        <Text className="text-[14px] font-semibold text-[#262626]">Continue with Google</Text>
      </Pressable>

      <View className="mt-auto pt-6">
        <Pressable onPress={() => navigation.navigate('Signup')} className="w-full rounded-xl p-[2px]" style={{ borderWidth: 2, borderColor: '#2196D6' }}>
          <View className="w-full py-3.5 rounded-[10px] bg-white items-center">
            <GradientText style={{ fontSize: 14, fontWeight: '700' }}>Create new account</GradientText>
          </View>
        </Pressable>
        <Text className="text-[11px] text-gray-400 mt-4 text-center leading-relaxed">
          By continuing, you agree to Circle Up's{' '}
          <Text className="text-[#262626] font-medium">Terms</Text> &{' '}
          <Text className="text-[#262626] font-medium">Privacy</Text>
        </Text>
      </View>
    </View>
  );
}
