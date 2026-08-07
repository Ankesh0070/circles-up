import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import GradientButton from '../../shared/components/GradientButton';
import Avatar from '../../shared/components/Avatar';
import VibesPicker from './VibesPicker';
import { supabase } from '../../shared/api/supabase';
import { MIN_VIBES } from '../../shared/data/vibeCategories';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ProfileSetup'>;

// Ported from the prototype's "SCREEN: PROFILE SETUP" (lines 1746–1860) —
// name, bio, profile photo, and the Vibes picker. Last step of the
// onboarding gauntlet: completing this sets profiles.onboarding_completed,
// which is what flips RootNavigator over to Main.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- navigation
// intentionally unused: completing this screen flips RootNavigator to Main
// via a session refresh (see `finish` below), not an in-stack navigate call.
export default function ProfileSetupScreen(_props: Props) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [vibes, setVibes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canContinue = name.trim().length > 0 && vibes.length >= MIN_VIBES;

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const finish = async () => {
    if (!canContinue) return;
    setSaving(true);
    setError('');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError('Not signed in.');
      return;
    }

    let avatarUrl: string | null = null;
    if (avatarUri) {
      try {
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const path = `${user.id}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      } catch (e) {
        setSaving(false);
        setError(e instanceof Error ? `Avatar upload failed: ${e.message}` : 'Avatar upload failed.');
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ name: name.trim(), bio: bio.trim(), avatar_url: avatarUrl, vibes, onboarding_completed: true })
      .eq('id', user.id);

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    // Force onAuthStateChange to fire so RootNavigator's onboarded check
    // re-queries profiles and sees onboarding_completed = true — see
    // RootNavigator.tsx for why a plain state update here can't reach it.
    await supabase.auth.refreshSession();
    setSaving(false);
  };

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-14" contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-[24px] font-bold text-[#1F1B17] tracking-tight">Set up your profile</Text>
      <Text className="text-[13px] text-gray-500 mt-1.5">This is how your neighbours will see you.</Text>

      <Pressable onPress={pickAvatar} className="items-center mt-6">
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={{ width: 88, height: 88, borderRadius: 44 }} />
        ) : (
          <Avatar name={name || '?'} size={88} />
        )}
        <Text className="text-[12px] mt-2" style={{ color: '#2196D6' }}>
          {avatarUri ? 'Change photo' : 'Add photo'}
        </Text>
      </Pressable>

      <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-8">Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        className="mt-2 text-[16px] text-[#1F1B17] border-b border-gray-200 pb-3"
      />

      <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-5">Bio (optional)</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="chai pe charcha enthusiast..."
        multiline
        className="mt-2 text-[16px] text-[#1F1B17] border-b border-gray-200 pb-3"
      />

      <View className="mt-8">
        <VibesPicker
          selected={vibes}
          onToggle={(vibe) => setVibes((prev) => (prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]))}
        />
      </View>

      {error !== '' && <Text className="text-[12px] text-red-600 mt-4">{error}</Text>}

      <View className="mt-8">
        <GradientButton onPress={finish} disabled={!canContinue || saving}>
          {saving ? '' : 'Finish setting up'}
        </GradientButton>
        {saving && <ActivityIndicator style={{ marginTop: -38 }} color="#fff" />}
      </View>
    </ScrollView>
  );
}
