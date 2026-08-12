import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertTriangle } from 'lucide-react-native';
import GradientButton from '../../shared/components/GradientButton';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateEvent'>;
type PrivacyTier = 'verified' | 'close_friends' | 'open';

const PRIVACY_OPTIONS: { value: PrivacyTier; label: string; blurb: string }[] = [
  { value: 'verified', label: 'My neighbourhood', blurb: 'Visible to verified members of your neighbourhood.' },
  { value: 'close_friends', label: 'Close friends', blurb: 'Visible only to people you\'ve added to your Circle.' },
  { value: 'open', label: 'Open invite', blurb: 'Visible to any verified Circles Up user, even outside your neighbourhood.' },
];

// Phase 73 (Group H). edgecase.md §7.2 (🟠): "open invite" is real reduced
// privacy (see the RLS policy on `events`) — the host must see a clear
// warning before publishing, not just a label change buried in a picker.
export default function CreateEventScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('');
  const [location, setLocation] = useState('');
  const defaultDate = new Date(Date.now() + 86400000);
  const [dateStr, setDateStr] = useState(defaultDate.toISOString().slice(0, 10));
  const [timeStr, setTimeStr] = useState('18:00');
  const [privacyTier, setPrivacyTier] = useState<PrivacyTier>('verified');
  const [guestLimit, setGuestLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!title.trim()) return setError('Give the event a title.');
    if (!location.trim()) return setError('Add a location.');
    const startsAt = new Date(`${dateStr}T${timeStr}`);
    if (Number.isNaN(startsAt.getTime())) return setError('Enter a valid date (YYYY-MM-DD) and time (HH:MM).');
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
      setError('You need a verified neighbourhood membership to host an event.');
      return;
    }

    const { error: insertError } = await supabase.from('events').insert({
      host_id: user.id,
      neighbourhood_id: activeNeighbourhoodId,
      title: title.trim(),
      description: description.trim() || 'No description provided.',
      event_type: eventType.trim() || 'social',
      starts_at: startsAt.toISOString(),
      location: location.trim(),
      privacy_tier: privacyTier,
      guest_limit: guestLimit ? Number(guestLimit) : null,
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    navigation.goBack();
  };

  return (
    <ScrollView className="flex-1 bg-white px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-[18px] font-bold text-[#181C20]">Host a Scene</Text>

      <TextInput value={title} onChangeText={setTitle} placeholder="Event title" className="mt-4 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]" />
      <TextInput
        value={eventType}
        onChangeText={setEventType}
        placeholder="Type (e.g. potluck, game night, workshop)"
        className="mt-3 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
        multiline
        className="mt-3 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
      <TextInput value={location} onChangeText={setLocation} placeholder="Location" className="mt-3 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]" />

      <View className="flex-row gap-3 mt-3">
        <TextInput
          value={dateStr}
          onChangeText={setDateStr}
          placeholder="YYYY-MM-DD"
          className="flex-1 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
        />
        <TextInput
          value={timeStr}
          onChangeText={setTimeStr}
          placeholder="HH:MM"
          className="flex-1 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
        />
      </View>

      <TextInput
        value={guestLimit}
        onChangeText={setGuestLimit}
        placeholder="Guest limit (optional)"
        keyboardType="numeric"
        className="mt-3 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
      />

      <Text className="text-[12px] font-semibold text-ink-muted mt-5 mb-2">WHO CAN SEE THIS</Text>
      {PRIVACY_OPTIONS.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => setPrivacyTier(opt.value)}
          className="flex-row items-start gap-3 py-2.5 border-b border-outline-variant"
        >
          <View
            className="w-5 h-5 rounded-full items-center justify-center mt-0.5"
            style={{ borderWidth: 1.5, borderColor: privacyTier === opt.value ? '#A855F7' : '#BEC7D1' }}
          >
            {privacyTier === opt.value && <View className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />}
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-medium text-[#181C20]">{opt.label}</Text>
            <Text className="text-[12px] text-ink-muted mt-0.5">{opt.blurb}</Text>
          </View>
        </Pressable>
      ))}

      {privacyTier === 'open' && (
        <View className="flex-row items-start gap-2 mt-3 px-3 py-3 rounded-xl bg-amber-50">
          <AlertTriangle size={16} color="#B45309" style={{ marginTop: 1 }} />
          <Text className="text-[12px] text-amber-800 flex-1">
            Open invite means non-verified or outside-neighbourhood people could see and attend this event. Only pick this
            for public-style gatherings — not for anything at a private residence.
          </Text>
        </View>
      )}

      {!!error && <Text className="text-[12px] text-red-500 mt-3">{error}</Text>}

      <View className="mt-6">
        {submitting ? <ActivityIndicator color="#A855F7" /> : <GradientButton onPress={submit}>Publish event</GradientButton>}
      </View>
    </ScrollView>
  );
}
