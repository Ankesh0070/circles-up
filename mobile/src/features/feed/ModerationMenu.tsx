import { useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { supabase } from '../../shared/api/supabase';

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'harassment', label: 'Harassment or bullying' },
  // edgecase.md §2.3 (🔴): doxxing needs its own reason so it can be
  // fast-tracked ahead of general reports, not lumped in with "other".
  { id: 'doxxing', label: "Shares someone's private info without consent (doxxing)" },
  { id: 'other', label: 'Something else' },
] as const;

// Ported from the prototype's post "more" menu (Report/Mute/Hide/Copy link).
// edgecase.md §2.3: doxxing reports are flagged distinctly (is_doxxing) so a
// real moderation queue (not built in Group C scope) can prioritize them.
export default function ModerationMenu({
  visible,
  onClose,
  postId,
  authorId,
  onHidden,
}: {
  visible: boolean;
  onClose: () => void;
  postId: string;
  authorId: string;
  onHidden: () => void;
}) {
  const [step, setStep] = useState<'menu' | 'report' | 'submitted'>('menu');
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]['id'] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setStep('menu');
    setReason(null);
    onClose();
  };

  const submitReport = async () => {
    if (!reason) return;
    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'post',
      target_id: postId,
      reason,
      is_doxxing: reason === 'doxxing',
    });
    setSubmitting(false);
    setStep('submitted');
  };

  const hidePost = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('hidden_posts').upsert({ user_id: user.id, post_id: postId });
    onHidden();
    close();
  };

  const muteAuthor = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('muted_users').upsert({ user_id: user.id, muted_user_id: authorId });
    onHidden();
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={close}>
        <Pressable className="bg-white rounded-t-2xl pb-8 pt-2" onPress={(e) => e.stopPropagation()}>
          {step === 'menu' && (
            <View>
              <MenuRow label="Report" onPress={() => setStep('report')} destructive />
              <MenuRow label="Mute this neighbour" onPress={muteAuthor} />
              <MenuRow label="Hide this post" onPress={hidePost} />
              <MenuRow label="Cancel" onPress={close} />
            </View>
          )}

          {step === 'report' && (
            <View className="px-5 pt-3">
              <Text className="text-[16px] font-bold text-[#181C20] mb-3">Why are you reporting this?</Text>
              {REPORT_REASONS.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => setReason(r.id)}
                  className="flex-row items-center gap-3 py-3 border-b border-outline-variant"
                >
                  <View
                    className="w-5 h-5 rounded-full items-center justify-center"
                    style={{ borderWidth: 1.5, borderColor: reason === r.id ? '#006290' : '#BEC7D1' }}
                  >
                    {reason === r.id && <View className="w-2.5 h-2.5 rounded-full bg-[#006290]" />}
                  </View>
                  <Text className="text-[14px] text-[#181C20] flex-1">{r.label}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={submitReport}
                disabled={!reason || submitting}
                className="mt-4 bg-red-600 rounded-xl py-3 items-center"
                style={{ opacity: !reason || submitting ? 0.5 : 1 }}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Submit report</Text>}
              </Pressable>
            </View>
          )}

          {step === 'submitted' && (
            <View className="px-5 py-6 items-center">
              <Text className="text-[16px] font-bold text-[#181C20]">Report submitted</Text>
              <Text className="text-[13px] text-ink-muted mt-2 text-center">
                {reason === 'doxxing'
                  ? "Thanks — reports like this are prioritized for fast review."
                  : "Thanks for helping keep the neighbourhood safe. We'll review this."}
              </Text>
              <Pressable onPress={close} className="mt-5 bg-surface-container rounded-xl px-6 py-2.5">
                <Text className="text-[14px] font-semibold text-[#181C20]">Done</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuRow({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable onPress={onPress} className="px-5 py-3.5 border-b border-outline-variant">
      <Text className="text-[15px] text-center" style={{ color: destructive ? '#DC2626' : '#181C20' }}>
        {label}
      </Text>
    </Pressable>
  );
}
