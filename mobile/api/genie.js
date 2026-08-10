// Vercel serverless port of services/genie (embed-post, embed-comment, query).
//
// No vendor keys are involved: the embedding and LLM providers upstream are
// both deliberate dummies, so this port carries the same behaviour rather
// than degrading it. What it must NOT drop is the safety layer around them —
// prompt-injection sanitising, the grounding check, and phone redaction are
// real, testable logic (edgecase.md §4.1, §4.4, §4.5), not vendor stubs, so
// they're ported verbatim.
//
// `action` selects the endpoint, matching the other ported services.
import { createClient } from '@supabase/supabase-js';

const EMBEDDING_DIM = 128;
const CACHE_TTL_MINUTES = 60;
const SEARCH_LIMIT = 5;

// --- mock embedding provider ------------------------------------------------
// A real bag-of-words hash embedding, not noise: texts sharing words land
// closer under cosine similarity, which exercises the whole embed → store →
// pgvector search → rank pipeline. It can't do synonyms ("chai" vs "tea"),
// which is exactly why it stays a dummy.
function embed(text) {
  const vector = new Array(EMBEDDING_DIM).fill(0);
  const words = String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
    vector[hash % EMBEDDING_DIM] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return magnitude === 0 ? vector : vector.map((v) => v / magnitude);
}

// --- guardrails (edgecase.md §4.1, §4.4, §4.5) ------------------------------
const INJECTION_PATTERNS = [
  /ignore (all |the )?(previous|above|prior) instructions?/gi,
  /disregard (all |the )?(previous|above|prior) instructions?/gi,
  /system\s*:/gi,
  /you are now/gi,
  /new instructions?:/gi,
];

// Retrieved post content is untrusted input: it must read as DATA to any
// future LLM, never as instructions.
function sanitizeSourceContent(content) {
  let out = content ?? '';
  for (const pattern of INJECTION_PATTERNS) out = out.replace(pattern, '[redacted]');
  return out;
}

// Genie's whole promise is that answers come from real posts. Rather than
// trusting the model's own claim, every quoted span must appear verbatim in
// a source — a fabricated quote is rejected, not disclaimed.
function isGrounded(answer, sources) {
  const quotes = [...answer.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (quotes.length === 0) return true;
  return quotes.every((q) => sources.some((s) => (s.content ?? '').includes(q)));
}

const PHONE_PATTERN = /(\+?91[\s-]?)?\d{10}\b|\b\d{5}[\s-]?\d{5}\b/g;
function redactPhoneNumbers(content) {
  return content.replace(PHONE_PATTERN, '[phone number removed — see the original post]');
}

// --- mock LLM ---------------------------------------------------------------
// Extractive on purpose: it answers with literal quoted excerpts so
// isGrounded() can mechanically verify each one. The user's query is
// deliberately left unquoted — it will never appear verbatim in a
// neighbour's post, so quoting it would fail the answer's own check.
function synthesize(sources) {
  if (sources.length === 0) return "I couldn't find any neighbourhood posts about that yet.";
  const sentences = sources.map((s) => {
    const trimmed = (s.content ?? '').trim();
    const match = trimmed.match(/^.{1,180}?[.!?](\s|$)/);
    const excerpt = (match ? match[0] : trimmed.slice(0, 180)).trim();
    return `${s.authorName} mentioned: "${excerpt}"`;
  });
  return `Here's what neighbours have said about that:\n\n${sentences.join('\n')}`;
}

function normalize(query) {
  return String(query ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[?!.]+$/, '');
}

async function fetchPostMeta(db, postIds) {
  const map = new Map();
  if (postIds.length === 0) return map;
  const { data } = await db
    .from('posts')
    .select('id, created_at, author:profiles!posts_author_id_fkey(name, avatar_url)')
    .in('id', postIds);
  for (const row of data ?? []) {
    const author = Array.isArray(row.author) ? row.author[0] : row.author;
    map.set(row.id, {
      authorName: author?.name ?? 'A neighbour',
      authorAvatarUrl: author?.avatar_url ?? null,
      createdAt: row.created_at,
    });
  }
  return map;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ message: 'Genie service is not configured.' });
    return;
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const action = req.query?.action ?? 'query';

  try {
    // --- embed a post or comment ------------------------------------------
    if (action === 'embed-post' || action === 'embed-comment') {
      const isPost = action === 'embed-post';
      const id = isPost ? body.postId : body.commentId;

      let snippet = '';
      let postId = id;
      let neighbourhoodId = null;

      if (isPost) {
        const { data } = await db.from('posts').select('id, caption, neighbourhood_id').eq('id', id).single();
        if (!data) {
          res.status(404).json({ message: 'post not found' });
          return;
        }
        snippet = data.caption ?? '';
        neighbourhoodId = data.neighbourhood_id;
      } else {
        const { data } = await db
          .from('comments')
          .select('id, text, post:posts!comments_post_id_fkey(id, neighbourhood_id)')
          .eq('id', id)
          .single();
        if (!data) {
          res.status(404).json({ message: 'comment not found' });
          return;
        }
        const post = Array.isArray(data.post) ? data.post[0] : data.post;
        snippet = data.text ?? '';
        postId = post?.id;
        neighbourhoodId = post?.neighbourhood_id;
      }

      if (!snippet.trim() || !postId || !neighbourhoodId) {
        res.status(200).json({ ok: true, skipped: 'nothing to embed' });
        return;
      }

      const { error } = await db.from('post_embeddings').upsert(
        {
          post_id: postId,
          neighbourhood_id: neighbourhoodId,
          content_snippet: snippet.slice(0, 500),
          embedding: embed(snippet),
        },
        { onConflict: 'post_id' }
      );
      if (error) throw error;
      res.status(200).json({ ok: true });
      return;
    }

    // --- query -------------------------------------------------------------
    const { userId, neighbourhoodId, query: rawQuery } = body;
    const normalizedQuery = normalize(rawQuery);

    // Repeat questions shouldn't re-run the whole pipeline every time — cheap
    // on a mock, but this is what keeps a real per-token bill sane.
    const since = new Date(Date.now() - CACHE_TTL_MINUTES * 60_000).toISOString();
    const { data: cachedRow } = await db
      .from('genie_query_log')
      .select('answer, source_post_ids')
      .eq('neighbourhood_id', neighbourhoodId)
      .eq('normalized_query', normalizedQuery)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedRow) {
      const ids = cachedRow.source_post_ids ?? [];
      const { data: snippets } = await db
        .from('post_embeddings')
        .select('post_id, content_snippet')
        .in('post_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      const meta = await fetchPostMeta(db, ids);
      res.status(200).json({
        answer: cachedRow.answer,
        cached: true,
        sources: (snippets ?? []).map((r) => ({
          postId: r.post_id,
          content: r.content_snippet,
          authorName: meta.get(r.post_id)?.authorName ?? 'A neighbour',
          authorAvatarUrl: meta.get(r.post_id)?.authorAvatarUrl ?? null,
          createdAt: meta.get(r.post_id)?.createdAt ?? new Date().toISOString(),
        })),
      });
      return;
    }

    const { data: rows, error: searchError } = await db.rpc('search_post_embeddings', {
      p_neighbourhood_id: neighbourhoodId,
      p_query_embedding: embed(rawQuery),
      p_limit: SEARCH_LIMIT,
    });
    if (searchError) throw searchError;

    const searchRows = rows ?? [];

    const logQuery = async (answer, sourcePostIds) => {
      await db.from('genie_query_log').insert({
        user_id: userId,
        neighbourhood_id: neighbourhoodId,
        query: rawQuery,
        normalized_query: normalizedQuery,
        answer,
        source_post_ids: sourcePostIds,
      });
    };

    if (searchRows.length === 0) {
      // Cold start: a quiet neighbourhood has nothing indexed. Say so plainly
      // instead of asking the model to invent an answer from zero sources.
      const answer = 'No neighbours have posted about that yet — be the first to ask in the feed!';
      await logQuery(answer, []);
      res.status(200).json({ answer, sources: [], cached: false });
      return;
    }

    const meta = await fetchPostMeta(db, searchRows.map((r) => r.post_id));
    const sources = searchRows.map((r) => ({
      postId: r.post_id,
      content: r.content_snippet,
      authorName: meta.get(r.post_id)?.authorName ?? 'A neighbour',
      authorAvatarUrl: meta.get(r.post_id)?.authorAvatarUrl ?? null,
      createdAt: meta.get(r.post_id)?.createdAt ?? r.created_at,
    }));

    const sanitized = sources.map((s) => ({ ...s, content: sanitizeSourceContent(s.content) }));
    let answer = synthesize(sanitized);

    if (!isGrounded(answer, sanitized)) {
      answer = "I couldn't find a grounded answer to that from neighbourhood posts — try rephrasing?";
      await logQuery(answer, []);
      res.status(200).json({ answer, sources: [], cached: false });
      return;
    }

    answer = redactPhoneNumbers(answer);
    await logQuery(answer, sources.map((s) => s.postId));

    res.status(200).json({ answer, sources, cached: false });
  } catch (e) {
    res.status(500).json({ message: e?.message ?? 'Genie request failed' });
  }
}
