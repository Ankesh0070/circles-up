import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import GradientButton from '../../shared/components/GradientButton';
import VibesPicker from '../auth/VibesPicker';
import { MIN_VIBES } from '../../shared/data/vibeCategories';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

// Phase 86 — Name/username/pronouns/link/bio, vibes re-selection, private
// info fields. `phone` is the one private field: it round-trips through
// this screen (own-row read/write, protected by profiles_select_own /
// profiles_update_own) but is deliberately never included in
// get_public_profile's output, so nothing else in the app can leak it.
export default function EditProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [link, setLink] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [vibes, setVibes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        setUserId(user.id);
        const { data } = await supabase
          .from('profiles')
          .select('name, username, pronouns, link, bio, phone, vibes')
          .eq('id', user.id)
          .single();
        if (data && !cancelled) {
          setName(data.name ?? '');
          setUsername(data.username ?? '');
          setPronouns(data.pronouns ?? '');
          setLink(data.link ?? '');
          setBio(data.bio ?? '');
          setPhone(data.phone ?? '');
          setVibes(data.vibes ?? []);
        }
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const toggleVibe = (vibe: string) => {
    setVibes((prev) => (prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]));
  };

  const save = async () => {
    if (!userId) return;
    if (!name.trim()) return setError('Name can’t be empty.');
    if (vibes.length < MIN_VIBES) return setError(`Pick at least ${MIN_VIBES} vibes.`);
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername && !/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      return setError('Username must be 3-20 characters: lowercase letters, numbers, underscore.');
    }

    setSaving(true);
    setError('');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        username: cleanUsername || null,
        pronouns: pronouns.trim() || null,
        link: link.trim() || null,
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        vibes,
      })
      .eq('id', userId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message.includes('profiles_username_key') ? 'That username is already taken.' : updateError.message);
      return;
    }
    navigation.goBack();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#006290" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-5 pt-4" contentContainerStyle={{ paddingBottom: 60 }}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
      <Field label="Username" value={username} onChangeText={setUsername} placeholder="lowercase_handle" autoCapitalize="none" />
      <Field label="Pronouns" value={pronouns} onChangeText={setPronouns} placeholder="e.g. she/her" />
      <Field label="Link" value={link} onChangeText={setLink} placeholder="https://" autoCapitalize="none" keyboardType="url" />
      <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Tell your neighbours about you" multiline />

      <Text className="text-[12px] font-semibold text-ink-muted mt-5 mb-1">Private info</Text>
      <Text className="text-[11px] text-ink-muted mb-2">Only visible to you — never shown on your public profile.</Text>
      <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+91" keyboardType="phone-pad" />

      <View className="mt-5">
        <VibesPicker selected={vibes} onToggle={toggleVibe} />
      </View>

      {error !== '' && <Text className="text-[12px] text-red-600 mt-4">{error}</Text>}

      <View className="mt-6">
        <GradientButton onPress={save} disabled={saving}>
          {saving ? '' : 'Save changes'}
        </GradientButton>
        {saving && <ActivityIndicator style={{ marginTop: -38 }} color="#fff" />}
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences';
  keyboardType?: 'default' | 'url' | 'phone-pad';
}) {
  return (
    <View className="mt-4">
      <Text className="text-[12px] font-semibold text-ink-muted mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        keyboardType={keyboardType ?? 'default'}
        textAlignVertical={multiline ? 'top' : 'center'}
        className="bg-[#EBEEF4] rounded-xl px-3.5 py-2.5 text-[14px] text-[#181C20]"
        style={multiline ? { minHeight: 80 } : undefined}
      />
    </View>
  );
}
