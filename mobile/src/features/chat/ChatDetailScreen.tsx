import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Image, ActivityIndicator, Modal } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { AudioModule, useAudioPlayer, useAudioRecorder, RecordingPresets } from 'expo-audio';
import { Phone, Video, Camera, Mic, Send, MoreVertical } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import AlertModal from '../../shared/components/AlertModal';
import { supabase } from '../../shared/api/supabase';
import { uploadChatImage, uploadChatVoiceNote, getChatMediaSignedUrl } from '../../shared/api/uploadChatMedia';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatDetail'>;

type Message = {
  id: string;
  chat_id: string;
  author_id: string;
  kind: 'text' | 'image' | 'voice';
  text: string | null;
  media_url: string | null;
  media_duration_ms: number | null;
  created_at: string;
  authorName: string | null;
};

type ChatMeta = {
  isGroup: boolean;
  displayName: string;
  otherUserId: string | null;
};

// Ported from the prototype's ChatDetailScreen (lines 6585–6830). Real
// Realtime subscription for incoming messages, real Storage for media,
// simulated call UI (Phase 38 — real WebRTC is out of scope).
export default function ChatDetailScreen({ route, navigation }: Props) {
  const { chatId } = route.params;
  const [meta, setMeta] = useState<ChatMeta | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [callActive, setCallActive] = useState<null | 'voice' | 'video'>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState<{ messageId: string } | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ title: string; message: string } | null>(null);
  const listRef = useRef<FlatList<Message> | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  // ---- Load meta (chat header) + initial messages -------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);

      const { data: chat } = await supabase
        .from('chats')
        .select('is_group, name, emoji, chat_members(user_id, user:profiles!chat_members_user_id_fkey(name))')
        .eq('id', chatId)
        .single();
      if (!chat || cancelled) return;

      const members = (chat.chat_members ?? []) as { user_id: string; user: { name: string | null } | null | { name: string | null }[] }[];
      let displayName = chat.name ?? 'Chat';
      let otherUserId: string | null = null;
      if (!chat.is_group) {
        const otherMember = members.find((m) => m.user_id !== user.id);
        const other = Array.isArray(otherMember?.user) ? otherMember?.user[0] : otherMember?.user;
        displayName = other?.name ?? 'Neighbour';
        otherUserId = otherMember?.user_id ?? null;
      }
      setMeta({ isGroup: chat.is_group, displayName, otherUserId });

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, chat_id, author_id, kind, text, media_url, media_duration_ms, created_at, author:profiles!messages_author_id_fkey(name)')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (!cancelled) {
        const mapped: Message[] = (msgs ?? []).map((m) => {
          const author = Array.isArray(m.author) ? m.author[0] : m.author;
          return { ...m, authorName: author?.name ?? null };
        });
        setMessages(mapped);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  // ---- Realtime subscription: append incoming messages --------------------
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const row = payload.new as Message;
          // Realtime payload doesn't include the joined author name — fetch it.
          const { data: prof } = await supabase.from('profiles').select('name').eq('id', row.author_id).single();
          setMessages((prev) => {
            if (!prev) return prev;
            if (prev.some((m) => m.id === row.id)) return prev; // dedupe against our own optimistic path
            return [...prev, { ...row, authorName: prof?.name ?? null }];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const sendText = async () => {
    if (!text.trim() || !userId) return;
    const body = text.trim();
    setText('');
    await supabase.from('messages').insert({ chat_id: chatId, author_id: userId, kind: 'text', text: body });
  };

  const sendImage = async () => {
    if (!userId) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const path = await uploadChatImage(result.assets[0].uri, userId);
      await supabase.from('messages').insert({ chat_id: chatId, author_id: userId, kind: 'image', media_url: path });
    } catch (e) {
      setAlertInfo({ title: 'Upload failed', message: e instanceof Error ? e.message : 'Please try again' });
    } finally {
      setUploading(false);
    }
  };

  const toggleRecording = async () => {
    if (!userId) return;
    if (isRecording) {
      setIsRecording(false);
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;
      const durationMs = recorder.currentTime ? Math.round(recorder.currentTime * 1000) : null;
      setUploading(true);
      try {
        const path = await uploadChatVoiceNote(uri, userId);
        await supabase.from('messages').insert({
          chat_id: chatId,
          author_id: userId,
          kind: 'voice',
          media_url: path,
          media_duration_ms: durationMs,
        });
      } catch (e) {
        setAlertInfo({ title: 'Upload failed', message: e instanceof Error ? e.message : 'Please try again' });
      } finally {
        setUploading(false);
      }
      return;
    }

    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      setAlertInfo({ title: 'Microphone access needed', message: 'Enable microphone in Settings to send voice notes.' });
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
  };

  const block = async () => {
    if (!userId || !meta?.otherUserId) return;
    await supabase.from('dm_blocks').upsert({ blocker_id: userId, blocked_id: meta.otherUserId });
    setMenuOpen(false);
    navigation.goBack();
  };

  if (!meta || !messages) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-100">
        <Avatar name={meta.displayName} size={36} />
        <Text className="flex-1 text-[15px] font-semibold text-[#1F1B17]">{meta.displayName}</Text>
        {!meta.isGroup && (
          <>
            <Pressable onPress={() => setCallActive('voice')} hitSlop={6}>
              <Phone size={20} color="#1F1B17" strokeWidth={1.9} />
            </Pressable>
            <Pressable onPress={() => setCallActive('video')} hitSlop={6}>
              <Video size={20} color="#1F1B17" strokeWidth={1.9} />
            </Pressable>
          </>
        )}
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={6}>
          <MoreVertical size={20} color="#1F1B17" strokeWidth={1.9} />
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12, gap: 6 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <MessageBubble message={item} isMine={item.author_id === userId} showAuthor={meta.isGroup} onReport={(id) => setReportOpen({ messageId: id })} />
        )}
      />

      {/* Composer */}
      <View className="border-t border-gray-100 px-3 py-2 flex-row items-end gap-2">
        <Pressable onPress={sendImage} hitSlop={6} disabled={uploading}>
          <Camera size={22} color="#1F1B17" strokeWidth={1.8} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          multiline
          className="flex-1 bg-[#F3F4F6] rounded-2xl px-4 py-2 text-[14px] max-h-[100px]"
        />
        {text.trim() ? (
          <Pressable onPress={sendText} hitSlop={6}>
            <Send size={22} color="#2196D6" strokeWidth={2} />
          </Pressable>
        ) : (
          <Pressable onPress={toggleRecording} hitSlop={6}>
            <Mic size={22} color={isRecording ? '#EF4444' : '#1F1B17'} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      {/* Phase 39: encryption footer copy. Chat data is TLS-in-transit +
          Supabase-encrypted-at-rest — that's what this says, honestly.
          The prototype's "end-to-end encrypted 🔒" claim is deliberately
          NOT reproduced here (edgecase.md §5.1 🔴). Real E2EE would need a
          Signal-protocol implementation, keys we don't derive today, and a
          real security review — noted as a future upgrade path but not
          silently pretended-into-existence. */}
      <View className="px-4 pb-1">
        <Text className="text-[10px] text-gray-400 text-center">Encrypted in transit and at rest.</Text>
      </View>

      {/* Menu sheet */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setMenuOpen(false)}>
          <Pressable className="bg-white rounded-t-2xl pb-8 pt-2" onPress={(e) => e.stopPropagation()}>
            {!meta.isGroup && meta.otherUserId && (
              <Pressable onPress={block} className="px-5 py-3.5 border-b border-gray-100">
                <Text className="text-[15px] text-center text-red-600">Block this neighbour</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setMenuOpen(false)} className="px-5 py-3.5">
              <Text className="text-[15px] text-center text-[#1F1B17]">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Message report sheet */}
      <ReportSheet
        visible={!!reportOpen}
        messageId={reportOpen?.messageId ?? null}
        onClose={() => setReportOpen(null)}
      />

      <AlertModal
        visible={!!alertInfo}
        title={alertInfo?.title ?? ''}
        message={alertInfo?.message ?? ''}
        onClose={() => setAlertInfo(null)}
      />

      {/* Simulated call overlay (Phase 38) */}
      {callActive && (
        <Modal visible transparent={false}>
          <View className="flex-1 bg-black items-center justify-center gap-6">
            <Avatar name={meta.displayName} size={120} />
            <Text className="text-white text-[22px] font-semibold">{meta.displayName}</Text>
            <Text className="text-gray-400 text-[13px]">
              {callActive === 'voice' ? 'Voice calling…' : 'Video calling…'}
            </Text>
            <Text className="text-gray-500 text-[11px] mt-2 text-center px-8">
              (Simulated — real calling is not implemented yet)
            </Text>
            <Pressable
              onPress={() => setCallActive(null)}
              className="mt-8 w-16 h-16 rounded-full bg-red-600 items-center justify-center"
            >
              <Phone size={26} color="#fff" strokeWidth={2.2} style={{ transform: [{ rotate: '135deg' }] }} />
            </Pressable>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
function MessageBubble({
  message,
  isMine,
  showAuthor,
  onReport,
}: {
  message: Message;
  isMine: boolean;
  showAuthor: boolean;
  onReport: (messageId: string) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (message.kind === 'text' || !message.media_url) return;
    let cancelled = false;
    getChatMediaSignedUrl(message.media_url).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [message.kind, message.media_url]);

  return (
    <Pressable onLongPress={() => !isMine && onReport(message.id)}>
      <View
        className={`max-w-[75%] rounded-2xl px-3 py-2 ${isMine ? 'self-end' : 'self-start'}`}
        style={{ backgroundColor: isMine ? '#2196D6' : '#F3F4F6' }}
      >
        {showAuthor && !isMine && message.authorName && (
          <Text className="text-[11px] font-semibold text-[#2196D6] mb-0.5">{message.authorName}</Text>
        )}
        {message.kind === 'text' && (
          <Text style={{ color: isMine ? '#fff' : '#1F1B17', fontSize: 14 }}>{message.text}</Text>
        )}
        {message.kind === 'image' && signedUrl && (
          <Image source={{ uri: signedUrl }} style={{ width: 200, height: 200, borderRadius: 8 }} resizeMode="cover" />
        )}
        {message.kind === 'voice' && (
          <VoiceMessage uri={signedUrl} durationMs={message.media_duration_ms} isMine={isMine} />
        )}
      </View>
    </Pressable>
  );
}

function VoiceMessage({ uri, durationMs, isMine }: { uri: string | null; durationMs: number | null; isMine: boolean }) {
  const player = useAudioPlayer(uri ? { uri } : null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!uri) return;
    if (playing) {
      player.pause();
    } else {
      player.play();
    }
    setPlaying(!playing);
  };

  return (
    <Pressable onPress={toggle} className="flex-row items-center gap-2 py-1">
      <Text style={{ color: isMine ? '#fff' : '#1F1B17', fontSize: 18 }}>{playing ? '⏸️' : '▶️'}</Text>
      <Text style={{ color: isMine ? '#fff' : '#1F1B17', fontSize: 12 }}>
        {durationMs ? `${Math.round(durationMs / 1000)}s voice note` : 'Voice note'}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Report sheet (Phase 40) — distinct from posts' report reasons
// ---------------------------------------------------------------------------
const DM_REPORT_REASONS = [
  { id: 'spam', label: 'Spam' },
  // edgecase.md §5.3: harassment reports need a fast-track path just like
  // the doxxing category on public posts.
  { id: 'harassment', label: 'Harassment or unwanted contact' },
  { id: 'threat', label: 'Threat or violence' },
  { id: 'other', label: 'Something else' },
] as const;

function ReportSheet({
  visible,
  messageId,
  onClose,
}: {
  visible: boolean;
  messageId: string | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<(typeof DM_REPORT_REASONS)[number]['id'] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason(null);
      setDone(false);
    }
  }, [visible]);

  const submit = async () => {
    if (!reason || !messageId) return;
    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    await supabase.from('dm_reports').insert({
      reporter_id: user.id,
      message_id: messageId,
      reason,
      is_harassment: reason === 'harassment' || reason === 'threat',
    });
    setSubmitting(false);
    setDone(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-2xl pb-8 pt-4 px-5" onPress={(e) => e.stopPropagation()}>
          {done ? (
            <View className="items-center py-4">
              <Text className="text-[16px] font-bold text-[#1F1B17]">Report submitted</Text>
              <Text className="text-[13px] text-gray-500 mt-2 text-center">
                {reason === 'harassment' || reason === 'threat'
                  ? "Thanks — reports like this are prioritized for fast review."
                  : "Thanks for helping keep the neighbourhood safe."}
              </Text>
              <Pressable onPress={onClose} className="mt-4 bg-gray-100 rounded-xl px-6 py-2.5">
                <Text className="text-[14px] font-semibold">Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text className="text-[16px] font-bold text-[#1F1B17] mb-3">Report this message</Text>
              {DM_REPORT_REASONS.map((r) => (
                <Pressable key={r.id} onPress={() => setReason(r.id)} className="flex-row items-center gap-3 py-3 border-b border-gray-100">
                  <View
                    className="w-5 h-5 rounded-full items-center justify-center"
                    style={{ borderWidth: 1.5, borderColor: reason === r.id ? '#2196D6' : '#D1D5DB' }}
                  >
                    {reason === r.id && <View className="w-2.5 h-2.5 rounded-full bg-[#2196D6]" />}
                  </View>
                  <Text className="text-[14px] text-[#1F1B17] flex-1">{r.label}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={submit}
                disabled={!reason || submitting}
                className="mt-4 bg-red-600 rounded-xl py-3 items-center"
                style={{ opacity: !reason || submitting ? 0.5 : 1 }}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Submit report</Text>}
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
