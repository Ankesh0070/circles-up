import { serviceUrl } from './serviceUrl';

const GENIE_SERVICE_URL = serviceUrl(process.env.EXPO_PUBLIC_GENIE_SERVICE_URL, 4003);

// Fire-and-forget — a post/comment insert must never fail or stall on the
// embedding call. Errors are swallowed here (logged, not thrown) since the
// caller has already committed the real write and shown success to the
// user; a missed embedding just means that one item won't surface in Genie
// results, not a broken post.
export function embedPostFireAndForget(postId: string) {
  fetch(`${GENIE_SERVICE_URL}/genie/embed-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId }),
  }).catch((e) => console.warn('[genie] embed-post failed', e));
}

export function embedCommentFireAndForget(commentId: string) {
  fetch(`${GENIE_SERVICE_URL}/genie/embed-comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commentId }),
  }).catch((e) => console.warn('[genie] embed-comment failed', e));
}

export type GenieSource = {
  postId: string;
  content: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
};
export type GenieQueryResult = { answer: string; sources: GenieSource[]; cached: boolean };

export async function queryGenie(userId: string, neighbourhoodId: string, query: string): Promise<GenieQueryResult> {
  const res = await fetch(`${GENIE_SERVICE_URL}/genie/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, neighbourhoodId, query }),
  });
  if (!res.ok) throw new Error(`Genie query failed: ${res.status}`);
  return res.json();
}
