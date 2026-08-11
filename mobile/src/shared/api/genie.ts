// Demo build: no Genie/embedding backend. Embedding calls are no-ops; a query
// returns a canned, grounded-looking answer built from the seed posts so the
// Genie screen demonstrates the feature without a live LLM.
import { posts as seedPosts } from '../../mock/seed';

export function embedPostFireAndForget(_postId: string) {
  /* no-op in demo */
}

export function embedCommentFireAndForget(_commentId: string) {
  /* no-op in demo */
}

export type GenieSource = {
  postId: string;
  content: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
};
export type GenieQueryResult = { answer: string; sources: GenieSource[]; cached: boolean };

export async function queryGenie(_userId: string, _neighbourhoodId: string, query: string): Promise<GenieQueryResult> {
  // Pick a few seed posts whose text loosely relates to the query, else the
  // most recent, and present them as "what neighbours have said".
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  const scored = seedPosts
    .map((p) => ({ p, score: words.reduce((s, w) => s + (p.caption.toLowerCase().includes(w) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score);
  const chosen = (scored[0]?.score ? scored.filter((x) => x.score > 0) : scored).slice(0, 3).map((x) => x.p);

  const sources: GenieSource[] = chosen.map((p) => ({
    postId: p.id,
    content: p.caption,
    authorName: (p.author as any)?.name ?? 'A neighbour',
    authorAvatarUrl: (p.author as any)?.avatar_url ?? null,
    createdAt: p.created_at,
  }));

  const answer = sources.length
    ? `Here's what neighbours have said about that:\n\n${sources
        .map((s) => `${s.authorName} mentioned: "${s.content.slice(0, 140)}"`)
        .join('\n\n')}`
    : "No neighbours have posted about that yet — be the first to ask in the feed!";

  return { answer, sources, cached: false };
}
