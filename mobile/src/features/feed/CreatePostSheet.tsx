import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image as ImageIcon } from 'lucide-react-native';
import GradientButton from '../../shared/components/GradientButton';
import Card from '../../shared/components/Card';
import { BACKGROUND, ON_SURFACE, ON_SURFACE_MUTED, OUTLINE_VARIANT, ERROR, RADIUS } from '../../shared/theme/tokens';
import { categories, type PostCategory } from '../../shared/data/categories';
import { supabase } from '../../shared/api/supabase';
import { uploadPostMedia } from '../../shared/api/uploadMedia';
import { embedPostFireAndForget } from '../../shared/api/genie';
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

    const { data: inserted, error: insertError } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        neighbourhood_id: activeNeighbourhoodId,
        category,
        caption: caption.trim(),
        media_urls: mediaUrls,
      })
      .select('id')
      .single();

    setSubmitting(false);
    if (insertError) {
      // Surfaces the Phase 32 rate-limit trigger's message honestly rather
      // than a generic failure.
      setError(insertError.message.includes('alert_rate_limit_exceeded')
        ? 'You can post up to 3 Alert posts per 24 hours — try a different category or wait a bit.'
        : insertError.message);
      return;
    }

    // Phase 65: feed the new post into Genie's retrieval index. Fire-and-
    // forget so a slow/down genie service never blocks the post itself.
    if (inserted) embedPostFireAndForget(inserted.id);

    navigation.goBack();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BACKGROUND }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 22, fontWeight: '700', color: ON_SURFACE }}>Share with your circle</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
        {categories.map((c) => {
          const Icon = c.icon;
          const active = category === c.value;
          return (
            <Pressable
              key={c.value}
              onPress={() => setCategory(c.value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: RADIUS.chip,
                backgroundColor: active ? c.color : `${c.color}14`,
              }}
            >
              <Icon size={14} color={active ? '#fff' : c.color} strokeWidth={2.2} />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#fff' : c.color }}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ marginTop: 18 }}>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Kya share karna hai apni circle ke saath?"
          placeholderTextColor={ON_SURFACE_MUTED}
          multiline
          style={{ fontSize: 15.5, color: ON_SURFACE, minHeight: 110, lineHeight: 22 }}
          textAlignVertical="top"
        />
      </Card>

      {imageUri ? (
        <Pressable onPress={pickImage}>
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: RADIUS.card, marginTop: 14 }}
            resizeMode="cover"
          />
        </Pressable>
      ) : (
        <Pressable
          onPress={pickImage}
          style={{
            marginTop: 14,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: OUTLINE_VARIANT,
            borderRadius: RADIUS.card,
            paddingVertical: 28,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ImageIcon size={22} color={ON_SURFACE_MUTED} strokeWidth={1.9} />
          <Text style={{ fontSize: 13.5, color: ON_SURFACE_MUTED, fontWeight: '600' }}>Add a photo</Text>
        </Pressable>
      )}

      {error !== '' && <Text style={{ fontSize: 13, color: ERROR, marginTop: 14, marginLeft: 4 }}>{error}</Text>}

      <View style={{ marginTop: 26 }}>
        <GradientButton onPress={submit} loading={submitting}>
          Post
        </GradientButton>
      </View>
    </ScrollView>
  );
}
