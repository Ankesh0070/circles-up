import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import GradientButton from '../../shared/components/GradientButton';
import { bazaarCategories, type BazaarCategory } from '../../shared/data/bazaarCategories';
import { supabase } from '../../shared/api/supabase';
import { uploadBazaarListingMedia } from '../../shared/api/uploadMedia';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateListing'>;

// Phase 70/71 (Group H). Prohibited-item keyword filtering (edgecase.md
// §6.3) is enforced server-side by a trigger on `bazaar_listings` — this
// screen surfaces whatever message that trigger raises rather than
// duplicating the keyword list client-side, so the list stays single-
// sourced in the database (see the migration's own comment about that
// list needing real legal review).
export default function CreateListingScreen({ navigation }: Props) {
  const [category, setCategory] = useState<BazaarCategory>('furniture');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!title.trim()) return setError('Give it a title first.');
    if (!description.trim()) return setError('Add a short description.');
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

    const { data: profile } = await supabase.from('profiles').select('active_neighbourhood_id').eq('id', user.id).single();
    const activeNeighbourhoodId = profile?.active_neighbourhood_id;
    if (!activeNeighbourhoodId) {
      setSubmitting(false);
      setError('You need a verified neighbourhood membership to post.');
      return;
    }

    let imageUrls: string[] = [];
    if (imageUri) {
      try {
        imageUrls = [await uploadBazaarListingMedia(imageUri, user.id)];
      } catch (e) {
        setSubmitting(false);
        setError(e instanceof Error ? `Upload failed: ${e.message}` : 'Upload failed.');
        return;
      }
    }

    const { error: insertError } = await supabase.from('bazaar_listings').insert({
      seller_id: user.id,
      neighbourhood_id: activeNeighbourhoodId,
      category,
      title: title.trim(),
      description: description.trim(),
      price: category === 'free' ? null : price ? Number(price) : null,
      image_urls: imageUrls,
    });

    setSubmitting(false);
    if (insertError) {
      setError(
        insertError.message === 'bazaar_prohibited_item'
          ? "That listing can't be posted — it mentions something on Bazaar's prohibited-items list."
          : insertError.message
      );
      return;
    }

    navigation.goBack();
  };

  return (
    <ScrollView className="flex-1 bg-white px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-[18px] font-bold text-[#1F1B17]">List something</Text>

      <View className="flex-row flex-wrap gap-2 mt-4">
        {bazaarCategories.map((c) => {
          const Icon = c.icon;
          const active = category === c.value;
          return (
            <Pressable
              key={c.value}
              onPress={() => setCategory(c.value)}
              className="flex-row items-center gap-1.5 px-3 py-2 rounded-full"
              style={{ backgroundColor: active ? c.color : '#F3F4F6' }}
            >
              <Icon size={14} color={active ? '#fff' : '#374151'} />
              <Text style={{ color: active ? '#fff' : '#374151', fontSize: 12, fontWeight: '600' }}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        className="mt-4 px-3 py-2.5 bg-gray-50 rounded-xl text-[14px]"
      />

      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the item — condition, why you're selling, etc."
        multiline
        className="mt-3 px-3 py-2.5 bg-gray-50 rounded-xl text-[14px]"
        style={{ minHeight: 90, textAlignVertical: 'top' }}
      />

      {category !== 'free' && (
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="Price (₹)"
          keyboardType="numeric"
          className="mt-3 px-3 py-2.5 bg-gray-50 rounded-xl text-[14px]"
        />
      )}

      <Pressable onPress={pickImage} className="mt-3 flex-row items-center gap-2">
        <Text className="text-[13px] text-[#2196D6] font-medium">📷 Add a photo</Text>
      </Pressable>
      {imageUri && <Image source={{ uri: imageUri }} className="w-24 h-24 rounded-xl mt-2" />}

      {!!error && <Text className="text-[12px] text-red-500 mt-3">{error}</Text>}

      <View className="mt-6">
        {submitting ? <ActivityIndicator color="#F59E0B" /> : <GradientButton onPress={submit}>Post listing</GradientButton>}
      </View>
    </ScrollView>
  );
}
