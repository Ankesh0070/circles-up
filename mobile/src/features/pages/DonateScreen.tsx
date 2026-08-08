import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { HeartHandshake, CheckCircle2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import GradientButton from '../../shared/components/GradientButton';
import { supabase } from '../../shared/api/supabase';
import { createDonationOrder, confirmDonation, type DonationOrder } from '../../shared/api/compliance';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Donate'>;
const PRESETS = [100, 500, 1000, 2500];

// Phase 80 (Group I). No real Razorpay Checkout SDK is wired in (no vendor
// account exists — see mock-razorpay.provider.ts) — this screen simulates
// the checkout step itself, honestly labeled, rather than pretending to
// embed a real gateway. The order/confirm split and the eventual receipt
// are real: services/compliance actually writes payment_status/
// receipt_status and retries receipt generation (edgecase.md §8.6).
export default function DonateScreen({ route, navigation }: Props) {
  const { pageId } = route.params;
  const [pageName, setPageName] = useState<string | null>(null);
  const [amount, setAmount] = useState('500');
  const [step, setStep] = useState<'amount' | 'checkout' | 'done'>('amount');
  const [order, setOrder] = useState<DonationOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('pages').select('name').eq('id', pageId).single().then(({ data }) => setPageName(data?.name ?? null));
  }, [pageId]);

  const startCheckout = async () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) return setError('Enter a valid amount.');
    setBusy(true);
    setError('');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError('Not signed in.');
      return;
    }
    try {
      const created = await createDonationOrder(pageId, user.id, amountNum);
      setOrder(created);
      setStep('checkout');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.');
    } finally {
      setBusy(false);
    }
  };

  const completeMockPayment = async () => {
    if (!order) return;
    setBusy(true);
    setError('');
    try {
      const result = await confirmDonation(order.donationId, `mock_pay_${Date.now()}`);
      if (result.paymentStatus === 'succeeded') {
        setStep('done');
      } else {
        setError(result.error ?? 'Payment failed.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment confirmation failed.');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <CheckCircle2 size={56} color="#059669" />
        <Text className="text-[18px] font-bold text-[#1F1B17] mt-4">Thank you!</Text>
        <Text className="text-[13px] text-gray-500 mt-2 text-center">
          Your ₹{order?.amount} donation to {pageName} was successful. A tax receipt is being generated and will be
          available shortly — it's never lost even if generation hiccups the first time.
        </Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-6 bg-gray-100 rounded-xl px-6 py-3">
          <Text className="text-[14px] font-semibold text-[#1F1B17]">Done</Text>
        </Pressable>
      </View>
    );
  }

  if (step === 'checkout' && order) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <View className="w-full bg-gray-50 rounded-2xl p-5 items-center" style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
          <Text className="text-[12px] font-semibold text-gray-400">MOCK PAYMENT GATEWAY</Text>
          <Text className="text-[24px] font-bold text-[#1F1B17] mt-2">₹{order.amount}</Text>
          <Text className="text-[12px] text-gray-500 mt-1">to {pageName}</Text>
          <Text className="text-[10px] text-gray-400 mt-3 text-center">
            No real Razorpay account is contracted yet — this simulates a successful checkout rather than moving real money.
          </Text>
          {!!error && <Text className="text-[12px] text-red-500 mt-3">{error}</Text>}
          <View className="w-full mt-5">
            {busy ? <ActivityIndicator color="#DC2626" /> : <GradientButton onPress={completeMockPayment}>Pay Now</GradientButton>}
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="items-center">
        <HeartHandshake size={40} color="#DC2626" />
        <Text className="text-[18px] font-bold text-[#1F1B17] mt-3">Donate to {pageName ?? '...'}</Text>
      </View>

      <View className="flex-row flex-wrap gap-2 mt-6 justify-center">
        {PRESETS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setAmount(String(p))}
            className="px-4 py-2 rounded-full"
            style={{ backgroundColor: amount === String(p) ? '#DC2626' : '#F3F4F6' }}
          >
            <Text style={{ color: amount === String(p) ? '#fff' : '#374151', fontSize: 13, fontWeight: '700' }}>₹{p}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="Custom amount"
        className="mt-4 px-3 py-2.5 bg-gray-50 rounded-xl text-[14px] text-center"
      />

      {!!error && <Text className="text-[12px] text-red-500 mt-3 text-center">{error}</Text>}

      <View className="mt-6">
        {busy ? <ActivityIndicator color="#DC2626" /> : <GradientButton onPress={startCheckout}>Continue</GradientButton>}
      </View>
    </ScrollView>
  );
}
