import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { MapPin, Building2, CheckCircle2, Clock } from 'lucide-react-native';
import GradientButton from '../../shared/components/GradientButton';
import TextField from '../../shared/components/TextField';
import Card from '../../shared/components/Card';
import {
  SURFACE,
  ON_SURFACE,
  ON_SURFACE_MUTED,
  OUTLINE_VARIANT,
  PRIMARY,
  SUCCESS,
  WARNING,
  ERROR,
  RADIUS,
} from '../../shared/theme/tokens';
import GpsCameraModal, { type CaptureResult } from '../verification/GpsCameraModal';
import { supabase } from '../../shared/api/supabase';
import { resolveDevUrl } from '../../shared/api/devHost';

type Neighbourhood = { id: string; name: string; city: string };
export type SubmitOutcome = { status: 'verified' | 'pending'; reviewReason?: string };

const VERIFICATION_SERVICE_URL = resolveDevUrl(
  process.env.EXPO_PUBLIC_VERIFICATION_SERVICE_URL ?? 'http://127.0.0.1:4001'
);

const REVIEW_REASON_COPY: Record<string, string> = {
  gps_mocked: "we couldn't confirm your device's GPS signal was genuine",
  gallery_source: 'the photo was chosen from your gallery rather than taken live',
  outside_geofence: "the location didn't match this neighbourhood closely enough",
  liveness_failed: "we couldn't confirm the selfie was a live photo",
  geofence_check_error: 'a technical issue on our end',
};

// Extracted from the original AddressScreen (Group B, Phase 16) so the exact
// same address→selfie→verify flow can be reused for Phase 61's "add a
// second neighbourhood" — edgecase.md §9.4 requires a FRESH liveness
// capture for every additional neighbourhood, no shortcuts, so reuse here
// means genuinely re-running the whole gate, not skipping steps.
export default function AddressVerificationFlow({
  onDone,
  heading = 'Where do you live?',
  subheading = "Only real verified neighbours can enter. We'll confirm this with a quick live selfie.",
  continueLabel = 'Continue',
}: {
  onDone: (outcome: SubmitOutcome) => void;
  heading?: string;
  subheading?: string;
  continueLabel?: string;
}) {
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
    const ok = outcome.status === 'verified';
    return (
      <View style={{ flex: 1, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ok ? `${SUCCESS}1A` : `${WARNING}1A`,
          }}
        >
          {ok ? <CheckCircle2 size={46} color={SUCCESS} strokeWidth={2} /> : <Clock size={46} color={WARNING} strokeWidth={2} />}
        </View>
        <Text style={{ fontSize: 25, fontWeight: '700', color: ON_SURFACE, marginTop: 22, textAlign: 'center' }}>
          {ok ? "You're verified!" : 'Submitted for review'}
        </Text>
        <Text style={{ fontSize: 14.5, color: ON_SURFACE_MUTED, marginTop: 12, textAlign: 'center', lineHeight: 21 }}>
          {ok
            ? 'Your neighbourhood membership is confirmed.'
            : `We couldn't auto-verify this because ${REVIEW_REASON_COPY[outcome.reviewReason ?? ''] ?? 'of an issue with your submission'}. A real person will review it — you can keep going in the meantime.`}
        </Text>
        <View style={{ marginTop: 36, width: '100%' }}>
          <GradientButton onPress={() => onDone(outcome)} showArrow>
            {continueLabel}
          </GradientButton>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: SURFACE }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 28, fontWeight: '700', color: ON_SURFACE, letterSpacing: -0.5 }}>{heading}</Text>
      <Text style={{ fontSize: 14.5, color: ON_SURFACE_MUTED, marginTop: 8, lineHeight: 21 }}>{subheading}</Text>

      <View style={{ marginTop: 28 }}>
        <TextField label="Neighbourhood" value={query} onChangeText={search} placeholder="Search e.g. HSR Layout" icon={MapPin} />
      </View>

      {searching && <ActivityIndicator style={{ marginTop: 10 }} color={PRIMARY} />}

      {results.length > 0 && (
        <Card padded={false} style={{ marginTop: 10, overflow: 'hidden' }}>
          {results.map((n, i) => (
            <Pressable
              key={n.id}
              onPress={() => {
                setNeighbourhood(n);
                setQuery(n.name);
                setResults([]);
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: OUTLINE_VARIANT,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: ON_SURFACE }}>{n.name}</Text>
              <Text style={{ fontSize: 12.5, color: ON_SURFACE_MUTED, marginTop: 2 }}>{n.city}</Text>
            </Pressable>
          ))}
        </Card>
      )}

      {neighbourhood && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            alignSelf: 'flex-start',
            marginTop: 12,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: RADIUS.chip,
            backgroundColor: `${SUCCESS}1A`,
          }}
        >
          <CheckCircle2 size={15} color={SUCCESS} strokeWidth={2.4} />
          <Text style={{ fontSize: 13, color: SUCCESS, fontWeight: '700' }}>{neighbourhood.name} selected</Text>
        </View>
      )}

      {neighbourhood && (
        <View style={{ marginTop: 22, gap: 18 }}>
          <TextField label="Society / Apartment" value={society} onChangeText={setSociety} placeholder="e.g. Brigade Meadows" icon={Building2} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextField label="Tower (optional)" value={tower} onChangeText={setTower} placeholder="B" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Flat" value={flat} onChangeText={setFlat} placeholder="602" />
            </View>
          </View>
        </View>
      )}

      {error !== '' && <Text style={{ fontSize: 13, color: ERROR, marginTop: 16, marginLeft: 4 }}>{error}</Text>}

      <View style={{ marginTop: 36 }}>
        <GradientButton onPress={() => setCameraOpen(true)} disabled={!detailsOk} loading={submitting} showArrow>
          Verify with a live selfie
        </GradientButton>
      </View>

      <GpsCameraModal visible={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCapture} />
    </ScrollView>
  );
}
