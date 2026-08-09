import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import GradientButton from '../../shared/components/GradientButton';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePage'>;

const TYPE_META = {
  personal: { title: 'Personal page', color: '#006290' },
  business: { title: 'Business page', color: '#F59E0B' },
  ngo: { title: 'NGO page', color: '#DC2626' },
} as const;

// Phase 77 (Group I). edgecase.md §8.1 (🟠): every compliance field here
// is explicitly labeled "self-declared, verification pending" — never
// implying government-verified status. §8.5: address gets the same
// geocoding check as user addresses (via the `pages` table's insert
// trigger, computed server-side from lat/lng — this screen just captures
// them, same real-device-GPS pattern as SOS's getBestEffortLocation).
export default function CreatePageScreen({ route, navigation }: Props) {
  const { pageType } = route.params;
  const meta = TYPE_META[pageType];

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [profession, setProfession] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [darpanId, setDarpanId] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      const granted = perm.granted || (await Location.requestForegroundPermissionsAsync()).granted;
      if (!granted) {
        setError('Location permission needed to validate your page address.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) return setError('Give your page a name.');
    if (pageType === 'business' && !gstNumber.trim()) return setError('GST number is required for a business page.');
    if (pageType === 'ngo' && !darpanId.trim()) return setError('Darpan ID is required for an NGO page.');
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
      setError('You need a verified neighbourhood membership to create a page.');
      return;
    }

    const { error: insertError } = await supabase.from('pages').insert({
      owner_id: user.id,
      neighbourhood_id: activeNeighbourhoodId,
      page_type: pageType,
      name: name.trim(),
      bio: bio.trim() || null,
      profession: pageType === 'personal' ? profession.trim() || null : null,
      gst_number: pageType === 'business' ? gstNumber.trim() : null,
      darpan_id: pageType === 'ngo' ? darpanId.trim() : null,
      address: address.trim() || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    navigation.replace('MyPages');
  };

  return (
    <ScrollView className="flex-1 bg-white px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-[18px] font-bold text-[#181C20]">{meta.title}</Text>

      <TextInput value={name} onChangeText={setName} placeholder="Page name" className="mt-4 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]" />
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="Short description"
        multiline
        className="mt-3 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
        style={{ minHeight: 70, textAlignVertical: 'top' }}
      />

      {pageType === 'personal' && (
        <TextInput
          value={profession}
          onChangeText={setProfession}
          placeholder="Profession (e.g. Photographer, Tutor)"
          className="mt-3 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
        />
      )}

      {pageType === 'business' && (
        <View className="mt-3">
          <TextInput
            value={gstNumber}
            onChangeText={setGstNumber}
            placeholder="GST number"
            className="px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
          />
          <Text className="text-[11px] text-ink-muted mt-1.5">Self-declared — not verified against government records.</Text>
        </View>
      )}

      {pageType === 'ngo' && (
        <View className="mt-3">
          <TextInput
            value={darpanId}
            onChangeText={setDarpanId}
            placeholder="Darpan ID"
            className="px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
          />
          <Text className="text-[11px] text-ink-muted mt-1.5">Self-declared, verification pending.</Text>
          <View className="mt-2 px-3 py-2.5 rounded-xl bg-amber-50">
            <Text className="text-[12px] text-amber-800">
              NGO pages need manual approval before they can accept donations — this isn't automatic.
            </Text>
          </View>
        </View>
      )}

      {(pageType === 'business' || pageType === 'ngo') && (
        <View className="mt-4">
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Address"
            className="px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
          />
          <Pressable onPress={useCurrentLocation} disabled={locating} className="flex-row items-center gap-1.5 mt-2">
            {locating ? <ActivityIndicator size="small" color="#006290" /> : <MapPin size={14} color="#006290" />}
            <Text className="text-[12px] font-medium text-[#006290]">
              {coords ? 'Location captured' : 'Use my current location'}
            </Text>
          </Pressable>
          <Text className="text-[11px] text-ink-muted mt-1">Checked against your neighbourhood boundary, not government-verified.</Text>
        </View>
      )}

      {!!error && <Text className="text-[12px] text-red-500 mt-3">{error}</Text>}

      <View className="mt-6">
        {submitting ? <ActivityIndicator color={meta.color} /> : <GradientButton onPress={submit}>Create page</GradientButton>}
      </View>
    </ScrollView>
  );
}
