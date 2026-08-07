import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import GradientButton from '../../shared/components/GradientButton';
import { categories, type PostCategory } from '../../shared/data/categories';
import { supabase } from '../../shared/api/supabase';
import { uploadPostMedia } from '../../shared/api/uploadMedia';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePost'>;

// Ported from the prototype's CreatePostSheet (lines 2546–2614) — category
// picker, caption, photo attach. Real insert into `posts`, real upload via
// Phase 33's compression pipeline.
export default function CreatePostSheet({ navigation }: Props) {
  const [category, setCategory] = useState<PostCategory>('general');
  const [caption, setCaption] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!caption.trim()) return setError('Say something first.');
    setSubmitting(true);
    setError('');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setError('Not signed in.');
      return;
    }

    // Phase 63 fix (edgecase.md §9.1 🟠): this used to be an arbitrary
    // `.limit(1)` pick across ALL of a user's verified memberships — for
    // someone verified in more than one neighbourhood (Phase 61), that's
    // exactly the "ambiguous, no explicit user action" scoping bug the
    // edge case warns about. Posts now go to whichever neighbourhood is
    // actually active (set at signup, changed only via NeighbourhoodSheet).
    const { data: profile } = await supabase.from('profiles').select('active_neighbourhood_id').eq('id', user.id).single();
    const activeNeighbourhoodId = profile?.active_neighbourhood_id;

    if (!activeNeighbourhoodId) {
      setSubmitting(false);
      setError('You need a verified neighbourhood membership to post.');
      return;
    }

    let mediaUrls: string[] = [];
    if (imageUri) {
      try {
        const url = await uploadPostMedia(imageUri, user.id);
        mediaUrls = [url];
      } catch (e) {
        setSubmitting(false);
        setError(e instanceof Error ? `Upload failed: ${e.message}` : 'Upload failed.');
        return;
      }
    }

    const { error: insertError } = await supabase.from('posts').insert({
      author_id: user.id,
      neighbourhood_id: activeNeighbourhoodId,
      category,
      caption: caption.trim(),
      media_urls: mediaUrls,
    });

    setSubmitting(false);
    if (insertError) {
      // Surfaces the Phase 32 rate-limit trigger's message honestly rather
      // than a generic failure.
      setError(insertError.message.includes('alert_rate_limit_exceeded')
        ? 'You can post up to 3 Alert posts per 24 hours — try a different category or wait a bit.'
        : insertError.message);
      return;
    }

    navigation.goBack();
  };

  return (
    <ScrollView className="flex-1 bg-white px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-[18px] font-bold text-[#1F1B17]">Share with your circle</Text>

      <View className="flex-row flex-wrap gap-2 mt-4">
        {categories.map((c) => {
          const Icon = c.icon;
          const active = category === c.value;
          return (
            <Pressable
              key={c.value}
              onPress={() => setCategory(c.value)}
              className="flex-row items-center gap-1.5 px-3 py-2 rounded-full"
              style={{ backgroundColor: active ? c.color : '#F3F4F6' }}
            >
              <Icon size={13} color={active ? '#fff' : c.color} />
              <Text className="text-[12px] font-semibold" style={{ color: active ? '#fff' : '#374151' }}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Kya share karna hai apni circle ke saath?"
        multiline
        className="mt-4 text-[15px] text-[#1F1B17] min-h-[100px]"
        textAlignVertical="top"
      />

      {imageUri ? (
        <Pressable onPress={pickImage}>
          <Image source={{ uri: imageUri }} className="w-full aspect-square rounded-xl mt-2" resizeMode="cover" />
        </Pressable>
      ) : (
        <Pressable onPress={pickImage} className="mt-2 border border-dashed border-gray-300 rounded-xl py-6 items-center">
          <Text className="text-[13px] text-gray-500">📷 Add a photo</Text>
        </Pressable>
      )}

      {error !== '' && <Text className="text-[12px] text-red-600 mt-3">{error}</Text>}

      <View className="mt-6">
        <GradientButton onPress={submit} disabled={submitting}>
          {submitting ? '' : 'Post'}
        </GradientButton>
        {submitting && <ActivityIndicator style={{ marginTop: -38 }} color="#fff" />}
      </View>
    </ScrollView>
  );
}
