import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Modal } from 'react-native';
import GoogleLogo from './GoogleLogo';

// Ported from the prototype (lines 451–658) — a faithful recreation of the
// Google sign-in bottom-sheet UI. NOTE: like the prototype itself, this is a
// UI-only simulation, not a real OAuth flow — wiring `onContinue` to an
// actual Google identity needs a Google Cloud OAuth client (a vendor
// dependency not yet set up, same category as Phase 6's liveness/SMS
// decisions) plus `expo-auth-session` + `supabase.auth.signInWithIdToken`.
//
// NOTE: RN's <Modal> has a known react-native-web positioning quirk — on web
// it can render outside the visible viewport's coordinate space (verified:
// DOM content/structure is correct, only on-screen position is off), which
// breaks coordinate-based click automation in a browser preview. Doesn't
// affect the actual target platform (iOS/Android, where Modal is a real
// native overlay) — verify this component's flow on-device, or via DOM
// event dispatch rather than coordinate clicks, when testing through a web
// preview.
type Step = 'email' | 'password' | 'connecting';

export default function GoogleAccountSheet({
  visible,
  onClose,
  onContinue,
  mode = 'login',
}: {
  visible: boolean;
  onClose: () => void;
  onContinue: (email: string) => void;
  mode?: 'login' | 'signup';
}) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validEmail = /^[^\s@]+@[^\s@]+/.test(email.trim());
  const validPass = password.length >= 6;

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Reset to a clean first step each time the sheet is (re)opened.
  useEffect(() => {
    if (visible) {
      setStep('email');
      setEmail('');
      setPassword('');
      setEmailTouched(false);
      setPassTouched(false);
    }
  }, [visible]);

  const handleNext = () => {
    if (step === 'email') {
      if (validEmail) setStep('password');
      else setEmailTouched(true);
    } else if (step === 'password') {
      if (validPass) {
        setStep('connecting');
        timerRef.current = setTimeout(() => onContinue(email), 1100);
      } else {
        setPassTouched(true);
      }
    }
  };

  const initial = email.trim().charAt(0).toUpperCase() || 'G';
  const headline = step === 'password' ? 'Welcome' : mode === 'signup' ? 'Use your Google Account' : 'Sign in';
  const subhead = mode === 'signup' ? 'to create your Circle Up account' : 'to continue to Circle Up';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/55 justify-end" onPress={onClose}>
        <Pressable className="w-full bg-white rounded-t-[28px] overflow-hidden" onPress={(e) => e.stopPropagation()}>
          <View className="pt-3 pb-1 items-center">
            <View className="w-9 h-1 rounded-full bg-gray-200" />
          </View>
          <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
            <View className="flex-row items-center gap-2">
              <GoogleLogo size={18} />
              <Text className="text-[12px] text-gray-500 font-medium">accounts.google.com</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text className="text-gray-500 text-[18px]">✕</Text>
            </Pressable>
          </View>

          <View className="px-7 pb-8">
            {step === 'email' && (
              <>
                <View className="items-center mt-1">
                  <GoogleLogo size={34} />
                </View>
                <Text className="text-[24px] text-[#202124] font-normal text-center mt-4">{headline}</Text>
                <Text className="text-[14px] text-[#202124] text-center mt-1.5">{subhead}</Text>

                <View className="mt-7">
                  <TextInput
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (emailTouched) setEmailTouched(false);
                    }}
                    placeholder="Email or phone"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="w-full px-3.5 py-3.5 rounded border-2 text-[15px] text-[#202124]"
                    style={{ borderColor: emailTouched && !validEmail ? '#D93025' : validEmail && email ? '#1A73E8' : '#9AA0A6' }}
                  />
                  {emailTouched && !validEmail && (
                    <Text className="text-[12px] text-[#D93025] mt-1.5">Enter a valid email or phone</Text>
                  )}
                </View>

                <View className="mt-8 flex-row items-center justify-between">
                  <Text className="text-[14px] font-medium text-[#1A73E8]">Create account</Text>
                  <Pressable onPress={handleNext} className="px-6 py-2.5 rounded bg-[#1A73E8]">
                    <Text className="text-[14px] font-medium text-white">Next</Text>
                  </Pressable>
                </View>
              </>
            )}

            {step === 'password' && (
              <>
                <View className="items-center mt-1">
                  <GoogleLogo size={34} />
                </View>
                <Text className="text-[24px] text-[#202124] font-normal text-center mt-4">{headline}</Text>

                <View className="items-center mt-3">
                  <View className="flex-row items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-gray-300 max-w-full">
                    <View className="w-7 h-7 rounded-full items-center justify-center bg-[#1A73E8]">
                      <Text className="text-white text-[13px] font-semibold">{initial}</Text>
                    </View>
                    <Text className="text-[13px] text-[#202124]">{email}</Text>
                  </View>
                </View>

                <View className="mt-6">
                  <TextInput
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      if (passTouched) setPassTouched(false);
                    }}
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    className="w-full px-3.5 py-3.5 rounded border-2 text-[15px] text-[#202124]"
                    style={{ borderColor: passTouched && !validPass ? '#D93025' : validPass ? '#1A73E8' : '#9AA0A6' }}
                  />
                  {passTouched && !validPass && (
                    <Text className="text-[12px] text-[#D93025] mt-1.5">Password must be at least 6 characters</Text>
                  )}
                  <Pressable onPress={() => setShowPassword((v) => !v)} className="flex-row items-center gap-2 mt-4">
                    <View
                      className="w-4 h-4 rounded-sm border border-gray-400 items-center justify-center"
                      style={{ backgroundColor: showPassword ? '#1A73E8' : 'transparent' }}
                    >
                      {showPassword && <Text className="text-white text-[10px]">✓</Text>}
                    </View>
                    <Text className="text-[14px] text-[#202124]">Show password</Text>
                  </Pressable>
                </View>

                <View className="mt-8 flex-row items-center justify-between">
                  <Text className="text-[14px] font-medium text-[#1A73E8]">Forgot password?</Text>
                  <Pressable onPress={handleNext} className="px-6 py-2.5 rounded bg-[#1A73E8]">
                    <Text className="text-[14px] font-medium text-white">Next</Text>
                  </Pressable>
                </View>
              </>
            )}

            {step === 'connecting' && (
              <View className="py-10 items-center">
                <GoogleLogo size={34} />
                <ActivityIndicator size="large" color="#1A73E8" className="mt-6" />
                <Text className="text-[15px] text-[#202124] mt-5 font-medium">Connecting to Circle Up…</Text>
                <Text className="text-[12px] text-gray-500 mt-1.5 text-center">
                  Signed in as <Text className="font-medium text-[#202124]">{email}</Text>
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
