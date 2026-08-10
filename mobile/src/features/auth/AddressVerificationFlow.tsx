import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, Platform } from 'react-native';
import * as Location from 'expo-location';
import { MapPin, Building2, CheckCircle2, Clock, Plus } from 'lucide-react-native';
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
import { serviceUrl } from '../../shared/api/serviceUrl';

type Neighbourhood = { id: string; name: string; city: string };
export type SubmitOutcome = { status: 'verified' | 'pending'; reviewReason?: string };

const VERIFICATION_SERVICE_URL = serviceUrl(process.env.EXPO_PUBLIC_VERIFICATION_SERVICE_URL, 4001);

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

  const [searched, setSearched] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [adding, setAdding] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const [error, setError] = useState('');

  const search = async (text: string) => {
    setQuery(text);
    setNeighbourhood(null);
    setAddingNew(false);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    const { data } = await supabase.from('neighbourhoods').select('id, name, city').ilike('name', `%${text}%`).limit(5);
    setSearching(false);
    setResults(data ?? []);
    setSearched(true);
  };

  // Nothing matched a real search — offer to create the place instead of
  // leaving the person at a dead end. Gated on `searched` so the prompt only
  // appears after a query has actually come back empty, not while typing.
  const canAddNew = searched && !searching && results.length === 0 && query.trim().length >= 2 && !neighbourhood;

  const addNeighbourhood = async () => {
    setError('');
    if (newCity.trim().length < 2) {
      setError('Add the city or town this neighbourhood is in.');
      return;
    }
    setAdding(true);
    try {
      // The boundary is drawn around where you actually are, so this needs a
      // real fix — not a typed address.
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Location access is needed to add a neighbourhood — it sets the area boundary.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      const res = await fetch(`${VERIFICATION_SERVICE_URL}/neighbourhoods/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: query.trim(),
          city: newCity.trim(),
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.message ?? 'Could not add that neighbourhood.');

      setNeighbourhood(created);
      setQuery(created.name);
      setResults([]);
      setAddingNew(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that neighbourhood.');
    } finally {
      setAdding(false);
    }
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

  // Web-only escape hatch: the deployed browser build can't reliably run the
  // live camera + GPS capture, and the geofence assumes you're physically in
  // the neighbourhood — so without this, a demo signup dead-ends here. Creates
  // a verified membership server-side (see api/verification-demo) so the feed
  // works, and drops straight into the next onboarding step.
  const skipForDemo = async () => {
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
      const res = await fetch(`${VERIFICATION_SERVICE_URL}/verification/demo-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          neighbourhoodId: neighbourhood.id,
          society: society.trim(),
          flat: flat.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? `Demo verification failed (${res.status})`);
      onDone({ status: 'verified' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not skip verification.');
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

      {canAddNew && !addingNew && (
        <Pressable
          onPress={() => {
            setAddingNew(true);
            setError('');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: 10,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: RADIUS.card,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: OUTLINE_VARIANT,
          }}
        >
          <Plus size={18} color={PRIMARY} strokeWidth={2.4} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: PRIMARY }}>Add “{query.trim()}”</Text>
            <Text style={{ fontSize: 12.5, color: ON_SURFACE_MUTED, marginTop: 2 }}>
              Not listed yet — start it for your area.
            </Text>
          </View>
        </Pressable>
      )}

      {addingNew && (
        <Card style={{ marginTop: 10, gap: 12 }}>
          <Text style={{ fontSize: 14.5, fontWeight: '700', color: ON_SURFACE }}>Add “{query.trim()}”</Text>
          {/* Said plainly, because it explains the location prompt that's
              about to appear and what the boundary ends up being. */}
          <Text style={{ fontSize: 12.5, color: ON_SURFACE_MUTED, lineHeight: 18 }}>
            We'll use where you are right now to draw this neighbourhood's area, so you need to be in it. Neighbours who
            join later get checked against that same area.
          </Text>
          <TextField
            label="City or town"
            value={newCity}
            onChangeText={setNewCity}
            placeholder="e.g. Bengaluru"
            icon={Building2}
          />
          <GradientButton onPress={addNeighbourhood} loading={adding} showArrow>
            Use my current location
          </GradientButton>
          <Pressable onPress={() => setAddingNew(false)} style={{ alignSelf: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: 13.5, color: ON_SURFACE_MUTED, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
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

      {/* The live selfie needs camera + GPS, which the browser build can't run
          reliably and which assume you're physically in the neighbourhood.
          This one-tap demo skip gets a web visitor into the app. */}
      {Platform.OS === 'web' && (
        <Pressable
          onPress={skipForDemo}
          disabled={!detailsOk || submitting}
          style={{ marginTop: 16, alignSelf: 'center', paddingVertical: 8, opacity: !detailsOk || submitting ? 0.5 : 1 }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: PRIMARY }}>Skip selfie — continue (demo)</Text>
        </Pressable>
      )}

      <GpsCameraModal visible={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCapture} />
    </ScrollView>
  );
}
