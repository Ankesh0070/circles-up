import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { AlertTriangle, X, Phone, Users, CheckCircle2, XCircle } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import {
  EMERGENCY_CHANNELS,
  getBestEffortLocation,
  createSosEvent,
  dialEmergencyChannel,
  dispatchToBackend,
  resolveSosEvent,
  cancelSosEvent,
  logSosCancel,
  shouldWarnAboutFalseTriggers,
  type SosLocation,
} from '../../shared/api/sos';

const COUNTDOWN_SECONDS = 5; // Phase 43 (edgecase.md §3.3): cancelable window

type DispatchLogRow = {
  id: string;
  channel: string;
  recipient_name: string | null;
  delivery_status: string;
};

type Stage = 'idle' | 'countdown' | 'dispatching' | 'active';

// Ported from the prototype's SOSActiveOverlay (lines 2927–3158) — but the
// countdown (Phase 43) and the live tracking view (Phase 46) are one
// continuous flow here, not two separate components, since they share all
// the same state (event id, location, dispatch results).
export default function SosFlow({
  userId,
  onClose,
  triggeredVia = 'button',
}: {
  userId: string;
  onClose: () => void;
  triggeredVia?: 'button' | 'silent_phrase';
}) {
  const [stage, setStage] = useState<Stage>('countdown');
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [eventId, setEventId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [dispatchRows, setDispatchRows] = useState<DispatchLogRow[]>([]);
  const [warnFalseTrigger, setWarnFalseTrigger] = useState(false);
  const [error, setError] = useState('');
  const startedAtRef = useRef<number | null>(null);

  // Countdown ticker
  useEffect(() => {
    if (stage !== 'countdown') return;
    if (secondsLeft <= 0) {
      fire();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, secondsLeft]);

  // Elapsed timer once active
  useEffect(() => {
    if (stage !== 'active' || !startedAtRef.current) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000)), 1000);
    return () => clearInterval(t);
  }, [stage]);

  // Realtime subscription for dispatch status once we have an event id
  useEffect(() => {
    if (!eventId) return;
    supabase
      .from('sos_dispatch_log')
      .select('id, channel, recipient_name, delivery_status')
      .eq('sos_event_id', eventId)
      .then(({ data }) => setDispatchRows(data ?? []));

    const channel = supabase
      .channel(`sos-dispatch:${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sos_dispatch_log', filter: `sos_event_id=eq.${eventId}` },
        (payload) => setDispatchRows((prev) => [...prev, payload.new as DispatchLogRow])
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const cancel = async () => {
    await logSosCancel(userId);
    const warn = await shouldWarnAboutFalseTriggers(userId);
    if (warn) setWarnFalseTrigger(true);
    else onClose();
  };

  const fire = async () => {
    setStage('dispatching');
    try {
      const loc: SosLocation = await getBestEffortLocation();
      const id = await createSosEvent(userId, loc, triggeredVia);
      setEventId(id);
      startedAtRef.current = Date.now();
      setStage('active');

      // Client-dialed channels (native tel:, works without data) fire in
      // parallel with the backend fan-out — neither blocks the other.
      await Promise.all([
        ...EMERGENCY_CHANNELS.map((c) => dialEmergencyChannel(id, c)),
        dispatchToBackend(userId, id, loc).catch((e) => setError(e instanceof Error ? e.message : 'Dispatch failed')),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStage('active'); // still show whatever succeeded rather than getting stuck
    }
  };

  const markSafe = async () => {
    if (eventId) await resolveSosEvent(eventId);
    onClose();
  };

  if (warnFalseTrigger) {
    return (
      <Modal visible transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-8">
          <View className="bg-white rounded-2xl p-6 w-full">
            <Text className="text-[16px] font-bold text-[#1F1B17]">Adjust SOS sensitivity?</Text>
            <Text className="text-[13px] text-gray-500 mt-2 leading-relaxed">
              You've cancelled the SOS countdown a few times recently. If it's triggering by accident, you can
              adjust it from Settings → Safety later.
            </Text>
            <Pressable onPress={onClose} className="mt-4 bg-gray-100 rounded-xl py-3 items-center">
              <Text className="font-semibold text-[#1F1B17]">Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent={stage === 'countdown'} animationType="fade">
      {stage === 'countdown' ? (
        <View className="flex-1 bg-black/70 items-center justify-center">
          <View className="bg-white rounded-3xl p-8 items-center w-[85%]">
            <AlertTriangle size={40} color="#FF0033" strokeWidth={2} />
            <Text className="text-[18px] font-bold text-[#1F1B17] mt-3">Sending SOS in {secondsLeft}…</Text>
            <Text className="text-[13px] text-gray-500 mt-1 text-center">
              Police, your trusted contacts, and nearby neighbours will be alerted.
            </Text>
            <View className="w-20 h-20 rounded-full items-center justify-center mt-5" style={{ backgroundColor: '#FFF1F1' }}>
              <Text className="text-[28px] font-bold" style={{ color: '#FF0033' }}>
                {secondsLeft}
              </Text>
            </View>
            <Pressable onPress={cancel} className="mt-6 px-6 py-3 rounded-xl bg-gray-100">
              <Text className="font-semibold text-[#1F1B17]">Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="flex-1 bg-[#FF0033]">
          <View className="flex-row items-center justify-between px-5 pt-14">
            <View>
              <Text className="text-white text-[20px] font-bold">SOS Active</Text>
              <Text className="text-white/80 text-[13px]">
                {stage === 'dispatching' ? 'Getting your location…' : `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')} elapsed`}
              </Text>
            </View>
            {stage === 'active' && (
              <Pressable onPress={markSafe} hitSlop={8}>
                <X size={26} color="#fff" />
              </Pressable>
            )}
          </View>

          {stage === 'dispatching' ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#fff" size="large" />
            </View>
          ) : (
            <ScrollView className="flex-1 mt-6 bg-white rounded-t-3xl px-5 pt-6">
              {error !== '' && <Text className="text-[12px] text-red-600 mb-3">{error}</Text>}

              <Text className="text-[13px] font-bold text-gray-400 uppercase tracking-wide mb-2">Emergency services (dialed)</Text>
              {EMERGENCY_CHANNELS.map((c) => (
                <StatusRow key={c.id} icon={<Phone size={16} color="#1F1B17" />} label={c.label} status="dialed" />
              ))}

              <Text className="text-[13px] font-bold text-gray-400 uppercase tracking-wide mt-5 mb-2">Your circle</Text>
              {dispatchRows.filter((r) => r.channel === 'trusted_contact' || r.channel === 'nearby_neighbour').length === 0 ? (
                <Text className="text-[13px] text-gray-400">Notifying your trusted contacts and nearby neighbours…</Text>
              ) : (
                dispatchRows
                  .filter((r) => r.channel === 'trusted_contact' || r.channel === 'nearby_neighbour')
                  .map((r) => (
                    <StatusRow
                      key={r.id}
                      icon={<Users size={16} color="#1F1B17" />}
                      label={r.recipient_name ?? (r.channel === 'nearby_neighbour' ? 'Neighbour' : 'Contact')}
                      status={r.delivery_status}
                    />
                  ))
              )}

              <Pressable onPress={markSafe} className="mt-8 mb-10 bg-[#1F1B17] rounded-2xl py-4 items-center">
                <Text className="text-white font-bold text-[15px]">I'm safe now</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      )}
    </Modal>
  );
}

function StatusRow({ icon, label, status }: { icon: React.ReactNode; label: string; status: string }) {
  const ok = status === 'dialed' || status === 'sent';
  return (
    <View className="flex-row items-center gap-2.5 py-2 border-b border-gray-50">
      {icon}
      <Text className="flex-1 text-[13px] text-[#1F1B17]">{label}</Text>
      {ok ? <CheckCircle2 size={16} color="#10B981" /> : <XCircle size={16} color="#EF4444" />}
    </View>
  );
}
