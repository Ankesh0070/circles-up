import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import GradientButton from '../../shared/components/GradientButton';
import GpsCameraModal, { type CaptureResult } from '../verification/GpsCameraModal';
import { supabase } from '../../shared/api/supabase';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Address'>;
type Neighbourhood = { id: string; name: string; city: string };
type SubmitOutcome = { status: 'verified' | 'pending'; reviewReason?: string };

const VERIFICATION_SERVICE_URL = process.env.EXPO_PUBLIC_VERIFICATION_SERVICE_URL ?? 'http://127.0.0.1:4001';

const REVIEW_REASON_COPY: Record<string, string> = {
  gps_mocked: "we couldn't confirm your device's GPS signal was genuine",
  gallery_source: 'the photo was chosen from your gallery rather than taken live',
  outside_geofence: "the location didn't match this neighbourhood closely enough",
  liveness_failed: "we couldn't confirm the selfie was a live photo",
  geofence_check_error: 'a technical issue on our end',
};

// Ported from the prototype's "SCREEN: ADDRESS" (lines 1502–1743) — 2-step
// verification gate: address/society search, then selfie capture wired to
// the real Verification Orchestrator (Phase 13). Unlike the prototype,
// neighbourhood search here queries our own `neighbourhoods` table directly
// (real data) rather than Google Places — a Places API key is a Phase-6-
// style vendor decision not yet made.
export default function AddressScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Neighbourhood[]>([]);
  const [searching, setSearching] = useState(false);
  const [neighbourhood, setNeighbourhood] = useState<Neighbourhood | null>(null);
  const [society, setSociety] = useState('');
  const [tower, setTower] = useState('');
  const [flat, setFlat] = useState('');

  const [cameraOpen, setCameraOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const [error, setError] = useState('');

  const search = async (text: string) => {
    setQuery(text);
    setNeighbourhood(null);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase.from('neighbourhoods').select('id, name, city').ilike('name', `%${text}%`).limit(5);
    setSearching(false);
    setResults(data ?? []);
  };

  const detailsOk = neighbourhood && society.trim().length > 0 && flat.trim().length > 0;

  const handleCapture = async (capture: CaptureResult) => {
    setCameraOpen(false);
    if (!neighbourhood) return;
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
    try {
      const res = await fetch(`${VERIFICATION_SERVICE_URL}/verification/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          neighbourhoodId: neighbourhood.id,
          society: society.trim(),
          tower: tower.trim() || undefined,
          flat: flat.trim(),
          selfieImageBase64: capture.uri,
          lat: capture.lat,
          lng: capture.lng,
          accuracy: capture.accuracy ?? undefined,
          mocked: capture.mocked ?? false,
          source: capture.source,
        }),
      });
      if (!res.ok) throw new Error(`Verification service error (${res.status})`);
      const body = await res.json();
      setOutcome({ status: body.status, reviewReason: body.reviewReason });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong submitting your verification.');
    } finally {
      setSubmitting(false);
    }
  };

  if (outcome) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-[48px]">{outcome.status === 'verified' ? '✅' : '🕒'}</Text>
        <Text className="text-[22px] font-bold text-[#1F1B17] mt-4 text-center">
          {outcome.status === 'verified' ? "You're verified!" : 'Submitted for review'}
        </Text>
        <Text className="text-[14px] text-gray-500 mt-3 text-center leading-relaxed">
          {outcome.status === 'verified'
            ? 'Your neighbourhood membership is confirmed.'
            : `We couldn't auto-verify this because ${REVIEW_REASON_COPY[outcome.reviewReason ?? ''] ?? 'of an issue with your submission'}. A real person will review it — you can keep setting up your profile in the meantime.`}
        </Text>
        <View className="mt-8 w-full">
          <GradientButton onPress={() => navigation.navigate('ProfileSetup')}>Continue</GradientButton>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-16" contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-[24px] font-bold text-[#1F1B17] tracking-tight">Where do you live?</Text>
      <Text className="text-[13px] text-gray-500 mt-1.5">
        Only real verified neighbours can enter. We'll confirm this with a quick live selfie.
      </Text>

      <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-8">Neighbourhood</Text>
      <TextInput
        value={query}
        onChangeText={search}
        placeholder="Search e.g. HSR Layout"
        className="mt-2 text-[16px] text-[#1F1B17] border-b border-gray-200 pb-3"
      />
      {searching && <ActivityIndicator className="mt-2" />}
      {results.map((n) => (
        <Pressable
          key={n.id}
          onPress={() => {
            setNeighbourhood(n);
            setQuery(n.name);
            setResults([]);
          }}
          className="py-3 border-b border-gray-100"
        >
          <Text className="text-[15px] text-[#1F1B17]">{n.name}</Text>
          <Text className="text-[12px] text-gray-400">{n.city}</Text>
        </Pressable>
      ))}
      {neighbourhood && (
        <View className="mt-2 bg-[#EBF6FD] rounded-lg px-3 py-2">
          <Text className="text-[13px] text-[#2196D6] font-semibold">✓ {neighbourhood.name} selected</Text>
        </View>
      )}

      {neighbourhood && (
        <>
          <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-6">Society / Apartment</Text>
          <TextInput
            value={society}
            onChangeText={setSociety}
            placeholder="e.g. Brigade Meadows"
            className="mt-2 text-[16px] text-[#1F1B17] border-b border-gray-200 pb-3"
          />
          <View className="flex-row gap-4 mt-6">
            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tower (optional)</Text>
              <TextInput value={tower} onChangeText={setTower} placeholder="B" className="mt-2 text-[16px] text-[#1F1B17] border-b border-gray-200 pb-3" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Flat</Text>
              <TextInput value={flat} onChangeText={setFlat} placeholder="602" className="mt-2 text-[16px] text-[#1F1B17] border-b border-gray-200 pb-3" />
            </View>
          </View>
        </>
      )}

      {error !== '' && <Text className="text-[12px] text-red-600 mt-4">{error}</Text>}

      <View className="mt-10">
        <GradientButton onPress={() => setCameraOpen(true)} disabled={!detailsOk || submitting}>
          {submitting ? '' : 'Verify with a live selfie'}
        </GradientButton>
        {submitting && <ActivityIndicator style={{ marginTop: -38 }} color="#fff" />}
      </View>

      <GpsCameraModal visible={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCapture} />
    </ScrollView>
  );
}
