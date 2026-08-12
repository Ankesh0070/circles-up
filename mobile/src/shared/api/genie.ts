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

// ---------------------------------------------------------------------------
// Page-scoped Genie — answers questions about a single Business/NGO page,
// grounded in that page's own fields (bio, contact, donation status) rather
// than the neighbourhood feed. Same "no live LLM, canned-but-grounded"
// approach as queryGenie above: keyword-routed templates over real page data,
// never an invented fact.
// ---------------------------------------------------------------------------
export type PageGenieInfo = {
  name: string;
  page_type: 'personal' | 'business' | 'ngo';
  bio: string | null;
  address: string | null;
  ngo_approval_status?: string | null;
  donation_enabled?: boolean;
};

export async function queryPageGenie(page: PageGenieInfo, question: string): Promise<string> {
  const q = question.toLowerCase();
  const isNgo = page.page_type === 'ngo';
  const isBusiness = page.page_type === 'business';

  if (/donat|contribut|fund/.test(q)) {
    if (isNgo) {
      return page.ngo_approval_status === 'approved'
        ? `Yes — ${page.name} is an approved NGO on Circles Up. Tap "Donate" on their page to contribute directly.`
        : `${page.name} hasn't been approved to accept donations through Circles Up yet — their approval is still pending review.`;
    }
    return `${page.name} is a business page, not an NGO, so it doesn't accept donations here. You're welcome to ask about their products or services instead.`;
  }

  if (/contact|reach|message|phone|dm|call/.test(q)) {
    return `You can reach out by tapping "Message" on ${page.name}'s profile — that opens a direct chat with the owner.`;
  }

  if (/where|address|location|near/.test(q)) {
    return page.address
      ? `${page.name} is located at ${page.address}.`
      : `${page.name} hasn't listed a specific address yet — try messaging them to ask.`;
  }

  if (isBusiness && /service|offer|sell|product|price|cost/.test(q)) {
    return page.bio
      ? `Here's what ${page.name} shares about what they offer: "${page.bio}"`
      : `${page.name} hasn't added a description of their services yet — message them directly to ask.`;
  }

  if (isNgo && /cause|work|mission|help|do you/.test(q)) {
    return page.bio
      ? `${page.name}'s mission, in their own words: "${page.bio}"`
      : `${page.name} hasn't added a mission description yet — message them to learn more about their work.`;
  }

  if (/verif|trust|approv|genuine|real/.test(q)) {
    if (isNgo) {
      return page.ngo_approval_status === 'approved'
        ? `${page.name} is approved and verified to accept donations on Circles Up.`
        : `${page.name}'s NGO status is self-declared and still pending Circles Up's review — donations aren't enabled until approval.`;
    }
    return `${page.name}'s business details are self-declared and haven't been independently verified yet.`;
  }

  // Fallback — ground in the bio if there is one, otherwise point at what can be asked.
  return page.bio
    ? `About ${page.name}: "${page.bio}". You can also ask me about their location, how to get in touch, or ${
        isNgo ? 'how to donate' : 'what they offer'
      }.`
    : `${page.name} hasn't added a description yet. Try asking about their location or how to get in touch.`;
}
