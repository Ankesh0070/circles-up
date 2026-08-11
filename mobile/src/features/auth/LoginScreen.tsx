import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { User, Lock } from 'lucide-react-native';
import CircleUpLogo from '../../shared/components/CircleUpLogo';
import GradientText from '../../shared/components/GradientText';
import GradientButton from '../../shared/components/GradientButton';
import TextField from '../../shared/components/TextField';
import GoogleLogo from './GoogleLogo';
import { supabase } from '../../shared/api/supabase';
import { signInWithGoogle, GOOGLE_AUTH_ENABLED } from '../../shared/api/googleAuth';
import {
  SURFACE,
  ON_SURFACE,
  ON_SURFACE_MUTED,
  OUTLINE_VARIANT,
  PRIMARY,
  RADIUS,
  CARD_SHADOW,
} from '../../shared/theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

// Stitch design system: logo in a soft circular plate, big bold title,
// pill inputs with leading icons, gradient CTA with a trailing arrow.
export default function LoginScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError('');
    const { error: gError } = await signInWithGoogle();
    // On web, success is a redirect — the page navigates away, so we only get
    // here on failure. Clear the spinner and show why.
    if (gError) setError(gError);
    setGoogleLoading(false);
  };

  const canContinue = identifier.trim().length >= 3 && password.length >= 6;

  const handleIdentifierChange = (val: string) => {
    setError('');
    const digitsOnly = val.replace(/[\s+-]/g, '');
    if (/^\d+$/.test(digitsOnly)) setIdentifier(digitsOnly.slice(0, 10));
    else setIdentifier(val);
  };

  const handleLogin = async () => {
    if (!canContinue || loading) return;
    setLoading(true);
    setError('');
    const trimmed = identifier.trim();
    // Supabase Auth natively supports email+password and phone+password.
    // "Username" login has no backing lookup, so it's an honest inline error
    // rather than a silent no-op.
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
    // RootNavigator's onAuthStateChange listener switches to Main once the
    // session updates.
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: SURFACE }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 72, paddingBottom: 40, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ alignItems: 'center' }}>
        <View
          style={[
            {
              width: 116,
              height: 116,
              borderRadius: 58,
              backgroundColor: SURFACE,
              alignItems: 'center',
              justifyContent: 'center',
            },
            CARD_SHADOW,
          ]}
        >
          <CircleUpLogo size={74} />
        </View>
        <Text style={{ fontSize: 32, fontWeight: '700', color: ON_SURFACE, marginTop: 24, letterSpacing: -0.6 }}>
          Log in
        </Text>
        <Text style={{ fontSize: 15, color: ON_SURFACE_MUTED, marginTop: 6 }}>Welcome back to your neighbourhood.</Text>
      </View>

      <View style={{ marginTop: 36, gap: 18 }}>
        <TextField
          label="Phone number, username or email"
          value={identifier}
          onChangeText={handleIdentifierChange}
          placeholder="Enter your details"
          icon={User}
          autoCapitalize="none"
        />

        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginLeft: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: ON_SURFACE_MUTED }}>Password</Text>
            <Pressable hitSlop={6}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>Forgot password?</Text>
            </Pressable>
          </View>
          <TextField
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError('');
            }}
            placeholder="Enter password"
            icon={Lock}
            secure
            autoCapitalize="none"
          />
        </View>

        {error !== '' && <Text style={{ fontSize: 12.5, color: '#BA1A1A', marginLeft: 4 }}>{error}</Text>}
      </View>

      <View style={{ marginTop: 28 }}>
        <GradientButton onPress={handleLogin} disabled={!canContinue} loading={loading} showArrow>
          Log in
        </GradientButton>
      </View>

      {GOOGLE_AUTH_ENABLED && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 28 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: OUTLINE_VARIANT }} />
            <Text style={{ fontSize: 12, color: ON_SURFACE_MUTED, fontWeight: '700', letterSpacing: 1 }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: OUTLINE_VARIANT }} />
          </View>

          <Pressable
            onPress={handleGoogle}
            disabled={googleLoading}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              paddingVertical: 16,
              borderRadius: RADIUS.chip,
              borderWidth: 1.5,
              borderColor: OUTLINE_VARIANT,
              opacity: googleLoading ? 0.6 : 1,
            }}
          >
            <GoogleLogo size={20} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: ON_SURFACE }}>
              {googleLoading ? 'Opening Google…' : 'Continue with Google'}
            </Text>
          </Pressable>
        </>
      )}

      <View style={{ marginTop: 'auto', paddingTop: 32, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14, color: ON_SURFACE_MUTED }}>Don't have an account?</Text>
          <Pressable onPress={() => navigation.navigate('Signup')} hitSlop={6}>
            <GradientText style={{ fontSize: 15, fontWeight: '700' }}>Create new account</GradientText>
          </Pressable>
        </View>
        <Text style={{ fontSize: 11.5, color: ON_SURFACE_MUTED, marginTop: 18, textAlign: 'center', lineHeight: 17 }}>
          By continuing, you agree to Circle Up's{' '}
          <Text style={{ color: ON_SURFACE, fontWeight: '600' }}>Terms</Text> &{' '}
          <Text style={{ color: ON_SURFACE, fontWeight: '600' }}>Privacy</Text>
        </Text>
      </View>
    </ScrollView>
  );
}
