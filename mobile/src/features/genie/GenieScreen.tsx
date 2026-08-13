import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Sparkles, Send } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import { supabase } from '../../shared/api/supabase';
import { queryGenie, type GenieQueryResult, type GenieSource } from '../../shared/api/genie';

// Phase 67 — Circle Genie's RAG search UI. Talks to services/genie's
// /genie/query (Phase 66/68/69: retrieval + grounding + caching, all real).
const SUGGESTED_PROMPTS = [
  'Any good electricians nearby?',
  'Best place to get keys made?',
  'Recommend a paediatrician?',
  'Where can I get a tailor?',
];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function SourceRow({ source }: { source: GenieSource }) {
  return (
    <View className="flex-row items-start px-4 py-3 border-b border-outline-variant">
      <Avatar name={source.authorName} size={32} uri={source.authorAvatarUrl} />
      <View className="ml-2.5 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[13px] font-semibold text-[#181C20]">{source.authorName}</Text>
          {/* edgecase.md §4.3 — recency shown prominently so users can judge
              whether a recommendation might be stale. */}
          <Text className="text-[11px] text-ink-muted">· {timeAgo(source.createdAt)}</Text>
        </View>
        <Text className="text-[13px] text-ink-muted mt-0.5">{source.content}</Text>
      </View>
    </View>
  );
}

export default function GenieScreen() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GenieQueryResult | null>(null);

  const runQuery = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setResult(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError('Not signed in.');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_neighbourhood_id')
      .eq('id', user.id)
      .single();
    const neighbourhoodId = profile?.active_neighbourhood_id;
    if (!neighbourhoodId) {
      setLoading(false);
      setError('You need a verified neighbourhood membership to ask Genie.');
      return;
    }

    try {
      const res = await queryGenie(user.id, neighbourhoodId, trimmed);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Genie is unavailable right now.');
    } finally {
      setLoading(false);
    }
  };

  const uniqueNeighbours = result
    ? Array.from(new Map(result.sources.map((s) => [s.authorName, s])).values())
    : [];

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center gap-2">
            <Sparkles size={20} color="#8B5CF6" />
            <Text className="text-[18px] font-bold text-[#181C20]">Circle Genie</Text>
          </View>
          <Text className="text-[13px] text-ink-muted mt-1">
            Ask what your neighbours have said — answers are grounded in real posts, not invented.
          </Text>
        </View>

        {!result && !loading && (
          <View className="px-5 pt-3">
            <Text className="text-[12px] font-semibold text-ink-muted mb-2">TRY ASKING</Text>
            <View className="flex-row flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <Pressable
                  key={prompt}
                  onPress={() => {
                    setQuery(prompt);
                    runQuery(prompt);
                  }}
                  className="px-3 py-2 rounded-full bg-violet-50 border border-violet-100"
                >
                  <Text className="text-[13px] text-violet-700">{prompt}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {loading && (
          <View className="items-center py-10">
            <ActivityIndicator color="#8B5CF6" />
            <Text className="text-[13px] text-ink-muted mt-2">Asking your neighbours...</Text>
          </View>
        )}

        {!!error && (
          <View className="mx-5 mt-4 px-4 py-3 rounded-xl bg-red-50">
            <Text className="text-[13px] text-red-600">{error}</Text>
          </View>
        )}

        {result && !loading && (
          <View className="mt-2">
            <View className="mx-5 px-4 py-3 rounded-xl bg-violet-50">
              <Text className="text-[14px] text-[#181C20] leading-5">{result.answer}</Text>
              {result.cached && <Text className="text-[11px] text-violet-400 mt-2">From a recent answer</Text>}
            </View>

            {uniqueNeighbours.length > 0 && (
              <View className="flex-row items-center px-5 mt-4 mb-1">
                <View className="flex-row">
                  {uniqueNeighbours.slice(0, 5).map((s, i) => (
                    <View key={s.postId} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                      <Avatar name={s.authorName} size={24} uri={s.authorAvatarUrl} />
                    </View>
                  ))}
                </View>
                <Text className="text-[12px] text-ink-muted ml-2">
                  {uniqueNeighbours.length} neighbour{uniqueNeighbours.length === 1 ? '' : 's'} mentioned this
                  {result.sources.length > uniqueNeighbours.length ? ` · ${result.sources.length} posts` : ''}
                </Text>
              </View>
            )}

            {result.sources.length > 0 && (
              <View className="mt-2 border-t border-outline-variant">
                {result.sources.map((s) => (
                  <SourceRow key={s.postId} source={s} />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View className="flex-row items-center gap-2 px-4 py-3 border-t border-outline-variant">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Ask Circle Genie..."
          className="flex-1 bg-surface-low rounded-full px-4 py-2.5 text-[14px]"
          onSubmitEditing={() => runQuery(query)}
          editable={!loading}
        />
        <Pressable
          onPress={() => runQuery(query)}
          disabled={loading || !query.trim()}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: query.trim() && !loading ? '#8B5CF6' : '#BEC7D1' }}
        >
          <Send size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
