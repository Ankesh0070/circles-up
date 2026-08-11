import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Sparkles, Send } from 'lucide-react-native';
import { queryPageGenie, type PageGenieInfo } from '../../shared/api/genie';

type Turn = { question: string; answer: string };

// Business/NGO pages don't have a human always online to answer questions, so
// this embeds a page-scoped Circle Genie right on the page — grounded in that
// page's own bio/contact/donation fields (see queryPageGenie), not the whole
// neighbourhood feed. Deliberately not shown on personal pages, which don't
// carry the kind of structured info (services, donation status) worth asking
// Genie about.
export default function PageGenieWidget({ page }: { page: PageGenieInfo }) {
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);

  const suggested =
    page.page_type === 'ngo'
      ? ['Can I donate here?', 'What cause do they work on?', 'How do I contact them?']
      : ['What do they offer?', 'Where are they located?', 'How do I contact them?'];

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || asking) return;
    setAsking(true);
    setQuestion('');
    const answer = await queryPageGenie(page, trimmed);
    setTurns((prev) => [...prev, { question: trimmed, answer }]);
    setAsking(false);
  };

  return (
    <View className="mt-6 pt-4 border-t border-outline-variant">
      <View className="flex-row items-center gap-2 mb-1">
        <Sparkles size={16} color="#8B5CF6" />
        <Text className="text-[14.5px] font-bold text-[#181C20]">Ask Circle Genie about {page.name}</Text>
      </View>
      <Text className="text-[12px] text-ink-muted mb-3">
        Grounded in this page's own info — donations, contact, location.
      </Text>

      {turns.length === 0 && (
        <View className="flex-row flex-wrap gap-2 mb-3">
          {suggested.map((p) => (
            <Pressable key={p} onPress={() => ask(p)} className="px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100">
              <Text className="text-[12px] text-violet-700">{p}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {turns.map((t, i) => (
        <View key={i} className="mb-3">
          <Text className="text-[13px] font-semibold text-[#181C20] mb-1">{t.question}</Text>
          <View className="px-3 py-2.5 rounded-xl bg-violet-50">
            <Text className="text-[13px] text-[#181C20] leading-5">{t.answer}</Text>
          </View>
        </View>
      ))}

      {asking && (
        <View className="flex-row items-center gap-2 mb-3">
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text className="text-[12px] text-ink-muted">Genie is thinking…</Text>
        </View>
      )}

      <View className="flex-row items-center gap-2">
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask a question…"
          className="flex-1 bg-surface-low rounded-full px-4 py-2.5 text-[13.5px]"
          onSubmitEditing={() => ask(question)}
          editable={!asking}
        />
        <Pressable
          onPress={() => ask(question)}
          disabled={asking || !question.trim()}
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: question.trim() && !asking ? '#8B5CF6' : '#BEC7D1' }}
        >
          <Send size={15} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
