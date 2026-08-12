import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Switch, ActivityIndicator } from 'react-native';
import { AudioModule } from 'expo-audio';
import { supabase } from '../../shared/api/supabase';
import { MockWakeWordDetector } from '../../shared/api/mockWakeWordDetector';
import { WAKE_WORD_DETECTOR_UNAVAILABLE_REASON, type WakeWordDetector } from '../../shared/api/wakeWordDetector';
import SosFlow from './SosFlow';
import GradientButton from '../../shared/components/GradientButton';

// edgecase.md §3.4 (🔴): phrases too common in ordinary conversation cause
// false positives. "order kar do" (the prototype's default) is flagged by
// name in edgecase.md as exactly this problem.
const COMMON_PHRASES = ['order kar do', 'haan bhai', 'theek hai', 'chalo chalte hain', 'ek minute', 'kya haal hai'];

function isTooCommon(phrase: string): boolean {
  const normalized = phrase.trim().toLowerCase();
  return COMMON_PHRASES.some((p) => normalized === p || normalized.includes(p));
}

// Ported from architecture.md's SilentPhraseScreen (Phase 54) — built per
// docs/silent-phrase-ios-feasibility-spike.md's conclusion: foreground-only,
// honestly labeled, real detection swappable in behind WakeWordDetector once
// a vendor (Picovoice) account exists. Today it runs MockWakeWordDetector.
export default function SilentPhraseScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [phrase, setPhrase] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testFired, setTestFired] = useState(false);
  const detectorRef = useRef<WakeWordDetector>(new MockWakeWordDetector());

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('silent_phrase, silent_phrase_enabled')
        .eq('id', data.user.id)
        .single();
      setPhrase(profile?.silent_phrase ?? 'circle up help me');
      setEnabled(profile?.silent_phrase_enabled ?? false);
      setLoading(false);
    });
    return () => {
      detectorRef.current.stop();
    };
  }, []);

  const save = async (nextPhrase: string, nextEnabled: boolean) => {
    if (!userId) return;
    setSaving(true);
    await supabase.from('profiles').update({ silent_phrase: nextPhrase, silent_phrase_enabled: nextEnabled }).eq('id', userId);
    setSaving(false);
  };

  const toggleEnabled = async (value: boolean) => {
    if (value) {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) return;
      await detectorRef.current.start(phrase, () => setTestFired(true));
    } else {
      await detectorRef.current.stop();
    }
    setEnabled(value);
    save(phrase, value);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#006290" />
      </View>
    );
  }

  const tooCommon = isTooCommon(phrase);

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      <Text className="text-[18px] font-bold text-[#181C20]">Silent Phrase</Text>
      <Text className="text-[13px] text-ink-muted mt-1.5 leading-relaxed">
        Say your phrase while Circles Up is open to silently trigger SOS — no need to touch the screen.
      </Text>
      <View className="bg-amber-50 rounded-xl px-3 py-2.5 mt-3">
        <Text className="text-[11px] text-amber-800 leading-relaxed">
          ⚠️ Works only while the app is open, not when locked or backgrounded — see the note below for why.
        </Text>
      </View>

      <Text className="text-[12px] font-bold text-ink-muted uppercase mt-6 mb-2">Your phrase</Text>
      <TextInput
        value={phrase}
        onChangeText={setPhrase}
        onBlur={() => save(phrase, enabled)}
        placeholder="e.g. circle up help me"
        className="bg-surface-container rounded-xl px-3 py-2.5 text-[14px]"
      />
      {tooCommon && (
        <Text className="text-[11px] text-red-600 mt-1.5">
          This phrase is common in everyday conversation — it may trigger by accident. Try something more distinctive.
        </Text>
      )}

      <View className="flex-row items-center justify-between mt-6 py-3 border-t border-b border-outline-variant">
        <View className="flex-1 pr-3">
          <Text className="text-[14px] font-semibold text-[#181C20]">Listen while app is open</Text>
          <Text className="text-[11px] text-ink-muted mt-0.5">{saving ? 'Saving…' : 'On-device only — audio never leaves your phone'}</Text>
        </View>
        <Switch value={enabled} onValueChange={toggleEnabled} disabled={tooCommon} />
      </View>

      <Text className="text-[11px] text-ink-muted mt-4 leading-relaxed">{WAKE_WORD_DETECTOR_UNAVAILABLE_REASON}</Text>

      <View className="mt-6">
        <GradientButton onPress={() => setTestFired(true)}>Test trigger (simulate detection)</GradientButton>
      </View>

      {testFired && userId && (
        <SosFlow userId={userId} onClose={() => setTestFired(false)} triggeredVia="silent_phrase" />
      )}
    </View>
  );
}
