import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import GradientButton from '../../shared/components/GradientButton';
import { supabase } from '../../shared/api/supabase';
import { uploadBazaarListingMedia } from '../../shared/api/uploadMedia';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAd'>;
type Step = 'objective' | 'audience' | 'budget' | 'creative' | 'review';
const STEPS: Step[] = ['objective', 'audience', 'budget', 'creative', 'review'];

const OBJECTIVES = [
  { value: 'awareness' as const, label: 'Awareness', blurb: 'Get more neighbours to know your business.' },
  { value: 'traffic' as const, label: 'Traffic', blurb: 'Drive visits to your page or store.' },
  { value: 'engagement' as const, label: 'Engagement', blurb: 'Get likes, comments, and shares.' },
];

type BizPage = { id: string; name: string; neighbourhood_id: string };

// Phase 82 (Group I) — 5-step wizard: Objective → Audience → Budget →
// Creative → Review. Submitting inserts status='pending_review' directly
// (edgecase.md §8.4 — the insert-time trigger on ad_campaigns allows only
// draft/pending_review at insert; 'active' requires the ad review process).
export default function CreateAdScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('objective');
  const [pages, setPages] = useState<BizPage[] | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);

  const [objective, setObjective] = useState<'awareness' | 'traffic' | 'engagement'>('awareness');
  const [mode, setMode] = useState<'neighbourhoods' | 'radius'>('neighbourhoods');
  const [radiusKm, setRadiusKm] = useState('5');
  const [budgetTotal, setBudgetTotal] = useState('50');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [ctaText, setCtaText] = useState('Learn more');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('pages').select('id, name, neighbourhood_id').eq('owner_id', user.id).eq('page_type', 'business');
      setPages(data ?? []);
      if (data && data.length > 0) setPageId(data[0].id);
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const stepIndex = STEPS.indexOf(step);
  const goNext = () => {
    if (step === 'creative' && (!headline.trim() || !body.trim())) return setError('Add a headline and body.');
    if (step === 'budget' && (!Number(budgetTotal) || Number(budgetTotal) <= 0)) return setError('Enter a valid budget.');
    setError('');
    setStep(STEPS[stepIndex + 1]);
  };
  const goBack = () => {
    setError('');
    if (stepIndex === 0) navigation.goBack();
    else setStep(STEPS[stepIndex - 1]);
  };

  const submit = async () => {
    if (!pageId) return;
    setSubmitting(true);
    setError('');

    const page = pages?.find((p) => p.id === pageId);
    let imageUrl: string | null = null;
    if (imageUri) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          imageUrl = await uploadBazaarListingMedia(imageUri, user.id);
        } catch (e) {
          setSubmitting(false);
          setError(e instanceof Error ? `Image upload failed: ${e.message}` : 'Image upload failed.');
          return;
        }
      }
    }

    const target =
      mode === 'neighbourhoods'
        ? { mode: 'neighbourhoods', neighbourhood_ids: [page?.neighbourhood_id] }
        : { mode: 'radius', radius_km: Number(radiusKm) };

    const { error: insertError } = await supabase.from('ad_campaigns').insert({
      page_id: pageId,
      objective,
      target,
      headline: headline.trim(),
      body: body.trim(),
      image_url: imageUrl,
      cta_text: ctaText.trim() || 'Learn more',
      budget_total: Number(budgetTotal),
      status: 'pending_review',
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    navigation.replace('AdsManager');
  };

  if (pages === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#F59E0B" />
      </View>
    );
  }

  if (pages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-[15px] font-semibold text-[#181C20] text-center">You need a business page first</Text>
        <Text className="text-[13px] text-ink-muted mt-2 text-center">Create a business page before running an ad.</Text>
        <Pressable onPress={() => navigation.replace('PageTypeSelector')} className="mt-5 bg-ink rounded-xl px-6 py-3">
          <Text className="text-white font-semibold text-[14px]">Create a page</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="flex-row gap-1.5 mb-4">
        {STEPS.map((s, i) => (
          <View key={s} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: i <= stepIndex ? '#F59E0B' : '#EBEEF4' }} />
        ))}
      </View>

      {pages.length > 1 && (
        <View className="flex-row flex-wrap gap-2 mb-4">
          {pages.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setPageId(p.id)}
              className="px-3 py-1.5 rounded-full"
              style={{ backgroundColor: pageId === p.id ? '#F59E0B' : '#EBEEF4' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: pageId === p.id ? '#fff' : '#181C20' }}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {step === 'objective' && (
        <View>
          <Text className="text-[18px] font-bold text-[#181C20]">What's the goal?</Text>
          <View className="mt-4 gap-3">
            {OBJECTIVES.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => setObjective(o.value)}
                className="p-4 rounded-2xl"
                style={{ borderWidth: 1.5, borderColor: objective === o.value ? '#F59E0B' : '#EBEEF4' }}
              >
                <Text className="text-[14px] font-semibold text-[#181C20]">{o.label}</Text>
                <Text className="text-[12px] text-ink-muted mt-0.5">{o.blurb}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {step === 'audience' && (
        <View>
          <Text className="text-[18px] font-bold text-[#181C20]">Who should see this?</Text>
          <Pressable onPress={() => setMode('neighbourhoods')} className="flex-row items-start gap-3 mt-4 py-2">
            <RadioDot active={mode === 'neighbourhoods'} />
            <View className="flex-1">
              <Text className="text-[14px] font-medium text-[#181C20]">My neighbourhood</Text>
              <Text className="text-[12px] text-ink-muted">Verified members of your page's own neighbourhood.</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setMode('radius')} className="flex-row items-start gap-3 py-2">
            <RadioDot active={mode === 'radius'} />
            <View className="flex-1">
              <Text className="text-[14px] font-medium text-[#181C20]">Radius around my page</Text>
              <Text className="text-[12px] text-ink-muted">Any neighbourhood within a distance of your page's location.</Text>
            </View>
          </Pressable>
          {mode === 'radius' && (
            <TextInput
              value={radiusKm}
              onChangeText={setRadiusKm}
              keyboardType="numeric"
              placeholder="Radius (km)"
              className="mt-2 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
            />
          )}
        </View>
      )}

      {step === 'budget' && (
        <View>
          <Text className="text-[18px] font-bold text-[#181C20]">Set a budget</Text>
          <TextInput
            value={budgetTotal}
            onChangeText={setBudgetTotal}
            keyboardType="numeric"
            placeholder="Total budget (₹)"
            className="mt-4 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
          />
          <Text className="text-[11px] text-ink-muted mt-2">Impressions stop the instant this budget is used up — no overspend.</Text>
        </View>
      )}

      {step === 'creative' && (
        <View>
          <Text className="text-[18px] font-bold text-[#181C20]">Create your ad</Text>
          <TextInput value={headline} onChangeText={setHeadline} placeholder="Headline" className="mt-4 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]" />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Body text"
            multiline
            className="mt-3 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]"
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
          <TextInput value={ctaText} onChangeText={setCtaText} placeholder="Button text (e.g. Learn more)" className="mt-3 px-3 py-2.5 bg-surface-low rounded-xl text-[14px]" />
          <Pressable onPress={pickImage} className="mt-3">
            <Text className="text-[13px] text-[#006290] font-medium">📷 Add an image (optional)</Text>
          </Pressable>
          {imageUri && <Image source={{ uri: imageUri }} className="w-24 h-24 rounded-xl mt-2" />}
        </View>
      )}

      {step === 'review' && (
        <View>
          <Text className="text-[18px] font-bold text-[#181C20]">Review</Text>
          <View className="mt-4 bg-surface-low rounded-2xl p-4">
            {imageUri && <Image source={{ uri: imageUri }} className="w-full aspect-video rounded-xl mb-3" />}
            <Text className="text-[14px] font-bold text-[#181C20]">{headline || 'Headline'}</Text>
            <Text className="text-[13px] text-ink-muted mt-1">{body || 'Body text'}</Text>
            <View className="mt-2 self-start px-3 py-1.5 rounded-full bg-ink">
              <Text className="text-white text-[12px] font-semibold">{ctaText}</Text>
            </View>
          </View>
          <View className="mt-4 gap-1.5">
            <ReviewRow label="Objective" value={OBJECTIVES.find((o) => o.value === objective)?.label ?? ''} />
            <ReviewRow label="Audience" value={mode === 'neighbourhoods' ? 'My neighbourhood' : `${radiusKm} km radius`} />
            <ReviewRow label="Budget" value={`₹${budgetTotal}`} />
          </View>
          <Text className="text-[11px] text-ink-muted mt-4">
            Submitting sends this for manual review before it goes live — neighbourhood ads get more trust than a generic
            web ad, so they're checked before serving.
          </Text>
        </View>
      )}

      {!!error && <Text className="text-[12px] text-red-500 mt-4">{error}</Text>}

      <View className="flex-row gap-3 mt-6">
        <Pressable onPress={goBack} className="flex-1 bg-surface-container rounded-xl py-3 items-center">
          <Text className="text-[14px] font-semibold text-[#181C20]">Back</Text>
        </Pressable>
        <View className="flex-1">
          {submitting ? (
            <ActivityIndicator color="#F59E0B" />
          ) : step === 'review' ? (
            <GradientButton onPress={submit}>Submit for review</GradientButton>
          ) : (
            <GradientButton onPress={goNext}>Next</GradientButton>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <View className="w-5 h-5 rounded-full items-center justify-center mt-0.5" style={{ borderWidth: 1.5, borderColor: active ? '#F59E0B' : '#BEC7D1' }}>
      {active && <View className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />}
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-[12px] text-ink-muted">{label}</Text>
      <Text className="text-[12px] font-medium text-[#181C20]">{value}</Text>
    </View>
  );
}
