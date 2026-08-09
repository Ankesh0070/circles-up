import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Phone, PhoneOff } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';

const DELAYS = [
  { label: 'Now', seconds: 0 },
  { label: 'In 5s', seconds: 5 },
  { label: 'In 15s', seconds: 15 },
  { label: 'In 30s', seconds: 30 },
];

type Stage = 'setup' | 'waiting' | 'ringing' | 'in-call';

// Ported from architecture.md's FakeCallScreen (Phase 52) — edgecase.md
// §3.11: user-triggered only (never fires on its own), and the "in call"
// state has a clearly-labeled "End Fake Call" button so it's never
// confusable with a real call UI, which is the whole safety property this
// feature depends on.
export default function FakeCallScreen() {
  const navigation = useNavigation();
  const [stage, setStage] = useState<Stage>('setup');
  const [callerName, setCallerName] = useState('Mom');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const trigger = (delaySeconds: number) => {
    if (delaySeconds === 0) {
      setStage('ringing');
      return;
    }
    setStage('waiting');
    timerRef.current = setTimeout(() => setStage('ringing'), delaySeconds * 1000);
  };

  const cancelWaiting = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStage('setup');
  };

  if (stage === 'setup') {
    return (
      <View className="flex-1 bg-white px-6 pt-10">
        <Text className="text-[18px] font-bold text-[#181C20]">Fake Check-in Call</Text>
        <Text className="text-[13px] text-ink-muted mt-1.5 leading-relaxed">
          Schedule a simulated incoming call to give yourself a reason to leave a situation.
        </Text>

        <Text className="text-[12px] font-bold text-ink-muted uppercase mt-6 mb-2">Caller name</Text>
        {['Mom', 'Dad', 'Boss'].map((name) => (
          <Pressable key={name} onPress={() => setCallerName(name)} className="flex-row items-center gap-3 py-2">
            <View
              className="w-5 h-5 rounded-full items-center justify-center"
              style={{ borderWidth: 1.5, borderColor: callerName === name ? '#006290' : '#BEC7D1' }}
            >
              {callerName === name && <View className="w-2.5 h-2.5 rounded-full bg-[#006290]" />}
            </View>
            <Text className="text-[14px] text-[#181C20]">{name}</Text>
          </Pressable>
        ))}

        <Text className="text-[12px] font-bold text-ink-muted uppercase mt-6 mb-2">Call me in</Text>
        <View className="flex-row flex-wrap gap-2">
          {DELAYS.map((d) => (
            <Pressable key={d.label} onPress={() => trigger(d.seconds)} className="px-4 py-2.5 rounded-full bg-surface-container">
              <Text className="text-[13px] font-semibold text-[#181C20]">{d.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  if (stage === 'waiting') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-[15px] text-ink-muted">Fake call from {callerName} incoming shortly…</Text>
        <Pressable onPress={cancelWaiting} className="mt-5 bg-surface-container rounded-xl px-6 py-2.5">
          <Text className="font-semibold text-[#181C20]">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Modal visible transparent={false}>
      <View className="flex-1 bg-black items-center justify-between py-20">
        <View className="items-center">
          <Text className="text-white/70 text-[13px]">Incoming call</Text>
          <Avatar name={callerName} size={100} />
          <Text className="text-white text-[26px] font-semibold mt-4">{callerName}</Text>
          {stage === 'in-call' && <Text className="text-white/60 text-[13px] mt-2">Simulated — not a real call</Text>}
        </View>

        {stage === 'ringing' ? (
          <View className="flex-row gap-16">
            <Pressable onPress={() => navigation.goBack()} className="items-center gap-2">
              <View className="w-16 h-16 rounded-full bg-red-600 items-center justify-center">
                <PhoneOff size={26} color="#fff" />
              </View>
              <Text className="text-white text-[12px]">Decline</Text>
            </Pressable>
            <Pressable onPress={() => setStage('in-call')} className="items-center gap-2">
              <View className="w-16 h-16 rounded-full bg-green-600 items-center justify-center">
                <Phone size={26} color="#fff" />
              </View>
              <Text className="text-white text-[12px]">Accept</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => navigation.goBack()} className="bg-red-600 rounded-2xl px-8 py-4">
            <Text className="text-white font-bold text-[15px]">End Fake Call</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}
