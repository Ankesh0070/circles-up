import { Inject, Injectable, Logger } from '@nestjs/common';
import { supabaseAdmin } from '../supabase-admin.client';
import { EMBEDDING_PROVIDER, type EmbeddingProvider } from '../embedding/embedding-provider.interface';
import { LLM_PROVIDER, type LlmProvider, type GenieSource } from './llm-provider.interface';
import { isGrounded, sanitizeSourceContent } from './grounding';
import { redactPhoneNumbers } from './redaction';

// Phase 69: repeat questions ("any good electricians nearby?") shouldn't
// re-run embedding + search + synthesis every time — cheap on a mock
// provider, but this cache is what keeps a real per-token LLM bill sane.
const CACHE_TTL_MINUTES = 60;
const SEARCH_LIMIT = 5;

export interface GenieQueryResult {
  answer: string;
  sources: GenieSource[];
  cached: boolean;
}

interface SearchRow {
  post_id: string;
  content_snippet: string;
  similarity: number;
  created_at: string;
}

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);

  constructor(
    @Inject(EMBEDDING_PROVIDER) private readonly embedder: EmbeddingProvider,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider
  ) {}

  async query(userId: string, neighbourhoodId: string, rawQuery: string): Promise<GenieQueryResult> {
    const normalizedQuery = normalize(rawQuery);

    const cached = await this.findCached(neighbourhoodId, normalizedQuery);
    if (cached) return cached;

    const queryEmbedding = await this.embedder.embed(rawQuery);
    const { data: rows, error } = await supabaseAdmin.rpc('search_post_embeddings', {
      p_neighbourhood_id: neighbourhoodId,
      p_query_embedding: queryEmbedding,
      p_limit: SEARCH_LIMIT,
    });
    if (error) {
      this.logger.error(`search_post_embeddings failed: ${error.message}`);
      throw error;
    }

    const searchRows = (rows ?? []) as SearchRow[];
    if (searchRows.length === 0) {
      // Phase 69 cold-start fallback (edgecase.md): a brand-new or quiet
      // neighbourhood has nothing indexed yet — say so plainly rather than
      // asking the LLM to synthesize an answer from zero sources.
      const answer = "No neighbours have posted about that yet — be the first to ask in the feed!";
      await this.logQuery(userId, neighbourhoodId, rawQuery, normalizedQuery, answer, []);
      return { answer, sources: [], cached: false };
    }

    const sources = await this.hydrateSources(searchRows);
    const sanitizedSources = sources.map((s) => ({ ...s, content: sanitizeSourceContent(s.content) }));

    let answer = await this.llm.synthesize(rawQuery, sanitizedSources);
    if (!isGrounded(answer, sanitizedSources)) {
      this.logger.warn(`Ungrounded Genie answer rejected for query "${rawQuery}"`);
      answer = "I couldn't find a grounded answer to that from neighbourhood posts — try rephrasing?";
      await this.logQuery(userId, neighbourhoodId, rawQuery, normalizedQuery, answer, []);
      return { answer, sources: [], cached: false };
    }

    answer = redactPhoneNumbers(answer);

    const sourcePostIds = sources.map((s) => s.postId);
    await this.logQuery(userId, neighbourhoodId, rawQuery, normalizedQuery, answer, sourcePostIds);

    return { answer, sources, cached: false };
  }

  private async findCached(neighbourhoodId: string, normalizedQuery: string): Promise<GenieQueryResult | null> {
    const since = new Date(Date.now() - CACHE_TTL_MINUTES * 60_000).toISOString();
    const { data, error } = await supabaseAdmin
      .from('genie_query_log')
      .select('answer, source_post_ids')
      .eq('neighbourhood_id', neighbourhoodId)
      .eq('normalized_query', normalizedQuery)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      this.logger.error(`cache lookup failed: ${error.message}`);
      return null;
    }
    if (!data) return null;

    const sources = await this.hydratePostsByIds(data.source_post_ids ?? []);
    return { answer: data.answer, sources, cached: true };
  }

  private async hydrateSources(rows: SearchRow[]): Promise<GenieSource[]> {
    const postIds = rows.map((r) => r.post_id);
    const metaByPostId = await this.fetchPostMetaByPostId(postIds);
    return rows.map((r) => {
      const meta = metaByPostId.get(r.post_id);
      return {
        postId: r.post_id,
        content: r.content_snippet,
        authorName: meta?.authorName ?? 'A neighbour',
        authorAvatarUrl: meta?.authorAvatarUrl ?? null,
        createdAt: meta?.createdAt ?? r.created_at,
      };
    });
  }

  private async hydratePostsByIds(postIds: string[]): Promise<GenieSource[]> {
    if (postIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from('post_embeddings')
      .select('post_id, content_snippet')
      .in('post_id', postIds);
    if (error || !data) return [];

    const metaByPostId = await this.fetchPostMetaByPostId(postIds);
    return data.map((row) => {
      const meta = metaByPostId.get(row.post_id);
      return {
        postId: row.post_id,
        content: row.content_snippet,
        authorName: meta?.authorName ?? 'A neighbour',
        authorAvatarUrl: meta?.authorAvatarUrl ?? null,
        createdAt: meta?.createdAt ?? new Date().toISOString(),
      };
    });
  }

  private async fetchPostMetaByPostId(
    postIds: string[]
  ): Promise<Map<string, { authorName: string; authorAvatarUrl: string | null; createdAt: string }>> {
    if (postIds.length === 0) return new Map();
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('id, created_at, author:profiles!posts_author_id_fkey(name, avatar_url)')
      .in('id', postIds);
    if (error || !data) return new Map();

    const map = new Map<string, { authorName: string; authorAvatarUrl: string | null; createdAt: string }>();
    for (const row of data) {
      const author = Array.isArray(row.author) ? row.author[0] : row.author;
      map.set(row.id, {
        authorName: author?.name ?? 'A neighbour',
        authorAvatarUrl: author?.avatar_url ?? null,
        createdAt: row.created_at,
      });
    }
    return map;
  }

  private async logQuery(
    userId: string,
    neighbourhoodId: string,
    query: string,
    normalizedQuery: string,
    answer: string,
    sourcePostIds: string[]
  ): Promise<void> {
    const { error } = await supabaseAdmin.from('genie_query_log').insert({
      user_id: userId,
      neighbourhood_id: neighbourhoodId,
      query,
      normalized_query: normalizedQuery,
      answer,
      source_post_ids: sourcePostIds,
    });
    if (error) this.logger.error(`Failed to log genie query: ${error.message}`);
  }
}

function normalize(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[?!.]+$/, '');
}
