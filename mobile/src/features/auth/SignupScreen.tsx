import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Mail, Lock, Smartphone, ChevronRight } from 'lucide-react-native';
import GradientButton from '../../shared/components/GradientButton';
import GradientText from '../../shared/components/GradientText';
import CircleUpLogo from '../../shared/components/CircleUpLogo';
import TextField from '../../shared/components/TextField';
import Card from '../../shared/components/Card';
import GoogleLogo from './GoogleLogo';
import { supabase, mockSignUp } from '../../shared/api/supabase';
import {
  SURFACE,
  ON_SURFACE,
  ON_SURFACE_MUTED,
  OUTLINE_VARIANT,
  PRIMARY,
  ERROR,
  SUCCESS,
  RADIUS,
} from '../../shared/theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;
type Method = 'email' | 'phone';

// Ported from the prototype (lines 786–965) — "SCREEN: CREATE ACCOUNT".
export default function SignupScreen({ navigation }: Props) {
  const [picked, setPicked] = useState<Method | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Demo build: no real backend, so Google sign-in is mocked the same way
  // email/phone are — instant success, no real OAuth round-trip — rather than
  // routing through the real-Google-client flow that needs credentials this
  // deployment doesn't have.
  const handleGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    mockSignUp('Google User', 'google.user@gmail.com');
    setGoogleLoading(false);
  };

  if (picked === 'email') return <EmailSignupForm onBack={() => setPicked(null)} />;
  if (picked === 'phone') return <PhoneSignupForm onBack={() => setPicked(null)} navigation={navigation} />;

  const methods = [
    { key: 'gmail' as const, title: 'Continue with Google', sub: 'Fastest — use your Google account', primary: true },
    { key: 'email' as const, title: 'Sign up with Email', sub: 'Use any email + a password', icon: Mail },
    { key: 'phone' as const, title: 'Sign up with Phone', sub: '+91 number + OTP verification', icon: Smartphone },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: SURFACE }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
        <ArrowLeft size={24} color={ON_SURFACE} />
      </Pressable>

      <CircleUpLogo size={54} />
      <Text style={{ fontSize: 28, fontWeight: '700', color: ON_SURFACE, marginTop: 20, letterSpacing: -0.5 }}>
        Create your account
      </Text>
      <Text style={{ fontSize: 14.5, color: ON_SURFACE_MUTED, marginTop: 8, lineHeight: 21 }}>
        Choose how you want to sign up. You can always link other methods later.
      </Text>

      <View style={{ marginTop: 24, gap: 12 }}>
        {methods.map((m) => (
          <Card
            key={m.key}
            onPress={() =>
              m.key === 'gmail' ? handleGoogle() : setPicked(m.key as 'email' | 'phone')
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              opacity: m.key === 'gmail' && googleLoading ? 0.6 : 1,
              ...(m.primary ? { borderWidth: 2, borderColor: ON_SURFACE } : {}),
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                // Google's card uses a plain surface plate for its logo; the
                // others use a tinted circle behind their lucide icon.
                backgroundColor: m.key === 'gmail' ? SURFACE : `${PRIMARY}14`,
                borderWidth: m.key === 'gmail' ? 1 : 0,
                borderColor: OUTLINE_VARIANT,
              }}
            >
              {m.key === 'gmail' ? (
                <GoogleLogo size={22} />
              ) : m.icon ? (
                <m.icon size={20} color={PRIMARY} strokeWidth={2.1} />
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: ON_SURFACE }}>
                {m.key === 'gmail' && googleLoading ? 'Opening Google…' : m.title}
              </Text>
              <Text style={{ fontSize: 12.5, color: ON_SURFACE_MUTED, marginTop: 2 }}>{m.sub}</Text>
            </View>
            <ChevronRight size={18} color={ON_SURFACE_MUTED} />
          </Card>
        ))}
      </View>

      <View style={{ marginTop: 'auto', paddingTop: 32, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14, color: ON_SURFACE_MUTED }}>Already on Circle Up?</Text>
          <Pressable onPress={() => navigation.goBack()} hitSlop={6}>
            <GradientText style={{ fontSize: 15, fontWeight: '700' }}>Log in</GradientText>
          </Pressable>
        </View>
        <Text style={{ fontSize: 11.5, color: ON_SURFACE_MUTED, marginTop: 18, textAlign: 'center', lineHeight: 17 }}>
          By continuing, you agree to Circle Up's <Text style={{ color: ON_SURFACE, fontWeight: '600' }}>Terms</Text> &{' '}
          <Text style={{ color: ON_SURFACE, fontWeight: '600' }}>Privacy</Text>
        </Text>
      </View>
    </ScrollView>
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
    <View style={{ flex: 1, backgroundColor: SURFACE, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32 }}>
      <Pressable onPress={onBack} hitSlop={8} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
        <ArrowLeft size={24} color={ON_SURFACE} />
      </Pressable>
      <Text style={{ fontSize: 28, fontWeight: '700', color: ON_SURFACE, letterSpacing: -0.5 }}>Sign up with Email</Text>
      <Text style={{ fontSize: 14.5, color: ON_SURFACE_MUTED, marginTop: 8 }}>We'll create your account right away.</Text>

      <View style={{ marginTop: 32, gap: 18 }}>
        <TextField
          label="Email"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setErr('');
          }}
          placeholder="you@example.com"
          icon={Mail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Create password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setErr('');
          }}
          placeholder="At least 6 characters"
          icon={Lock}
          secure
          autoCapitalize="none"
        />
      </View>

      <Text style={{ fontSize: 12.5, marginTop: 14, marginLeft: 4, color: err ? ERROR : emailOk && passOk ? SUCCESS : ON_SURFACE_MUTED }}>
        {err || (emailOk && passOk ? '✓ Looks good — ready to continue' : 'Email + password (6+ chars) needed')}
      </Text>

      <View style={{ marginTop: 'auto', paddingTop: 24 }}>
        <GradientButton onPress={submit} loading={loading} showArrow>
          Create account
        </GradientButton>
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
    <View style={{ flex: 1, backgroundColor: SURFACE, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32 }}>
      <Pressable onPress={onBack} hitSlop={8} style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
        <ArrowLeft size={24} color={ON_SURFACE} />
      </Pressable>
      <Text style={{ fontSize: 28, fontWeight: '700', color: ON_SURFACE, letterSpacing: -0.5 }}>Sign up with Phone</Text>
      <Text style={{ fontSize: 14.5, color: ON_SURFACE_MUTED, marginTop: 8 }}>
        We'll text you a 6-digit OTP to verify your number.
      </Text>

      <Text style={{ fontSize: 13, fontWeight: '600', color: ON_SURFACE_MUTED, marginTop: 32, marginBottom: 8, marginLeft: 4 }}>
        Phone number
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: SURFACE,
          borderWidth: 1.5,
          borderColor: OUTLINE_VARIANT,
          borderRadius: RADIUS.input,
          paddingHorizontal: 18,
          minHeight: 54,
        }}
      >
        <Text style={{ color: ON_SURFACE, fontWeight: '700', fontSize: 15 }}>🇮🇳 +91</Text>
        <View style={{ width: 1, height: 24, backgroundColor: OUTLINE_VARIANT }} />
        <TextInput
          value={phone}
          onChangeText={(t) => {
            setPhone(t.replace(/\D/g, '').slice(0, 10));
            setErr('');
          }}
          placeholder="98765 43210"
          placeholderTextColor={ON_SURFACE_MUTED}
          keyboardType="number-pad"
          style={{ flex: 1, fontSize: 15, color: ON_SURFACE, paddingVertical: 14 }}
        />
      </View>
      <Text style={{ fontSize: 12.5, marginTop: 10, marginLeft: 4, color: err ? ERROR : phoneOk ? SUCCESS : ON_SURFACE_MUTED }}>
        {err || (phoneOk ? '✓ Looks good — ready to send OTP' : `Enter ${10 - phone.length} more digit${10 - phone.length === 1 ? '' : 's'}`)}
      </Text>

      <View style={{ marginTop: 'auto', paddingTop: 24 }}>
        <GradientButton onPress={submit} loading={loading} showArrow>
          Send OTP
        </GradientButton>
      </View>
    </View>
  );
}
