import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, User } from 'lucide-react-native';
import GradientButton from '../../shared/components/GradientButton';
import TextField from '../../shared/components/TextField';
import Avatar from '../../shared/components/Avatar';
import VibesPicker from './VibesPicker';
import { supabase } from '../../shared/api/supabase';
import { MIN_VIBES } from '../../shared/data/vibeCategories';
import { SURFACE, ON_SURFACE, ON_SURFACE_MUTED, PRIMARY, ERROR } from '../../shared/theme/tokens';
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
    <ScrollView
      style={{ flex: 1, backgroundColor: SURFACE }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 28, fontWeight: '700', color: ON_SURFACE, letterSpacing: -0.5 }}>Set up your profile</Text>
      <Text style={{ fontSize: 14.5, color: ON_SURFACE_MUTED, marginTop: 8 }}>
        This is how your neighbours will see you.
      </Text>

      <Pressable onPress={pickAvatar} style={{ alignItems: 'center', marginTop: 28 }}>
        <View>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: 96, height: 96, borderRadius: 48 }} />
          ) : (
            <Avatar name={name || '?'} size={96} />
          )}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: PRIMARY,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: SURFACE,
            }}
          >
            <Camera size={14} color="#fff" strokeWidth={2.4} />
          </View>
        </View>
        <Text style={{ fontSize: 13, marginTop: 10, color: PRIMARY, fontWeight: '700' }}>
          {avatarUri ? 'Change photo' : 'Add photo'}
        </Text>
      </Pressable>

      <View style={{ marginTop: 28, gap: 18 }}>
        <TextField label="Name" value={name} onChangeText={setName} placeholder="Your name" icon={User} />
        <TextField
          label="Bio (optional)"
          value={bio}
          onChangeText={setBio}
          placeholder="chai pe charcha enthusiast..."
          multiline
        />
      </View>

      <View style={{ marginTop: 32 }}>
        <VibesPicker
          selected={vibes}
          onToggle={(vibe) => setVibes((prev) => (prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]))}
        />
      </View>

      {error !== '' && <Text style={{ fontSize: 13, color: ERROR, marginTop: 16, marginLeft: 4 }}>{error}</Text>}

      <View style={{ marginTop: 32 }}>
        <GradientButton onPress={finish} disabled={!canContinue} loading={saving} showArrow>
          Finish setting up
        </GradientButton>
      </View>
    </ScrollView>
  );
}
