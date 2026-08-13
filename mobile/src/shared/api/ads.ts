// Demo build: no ads backend, but the feed still needs sponsored cards to
// show — 200 local-business ads seeded in mock/seed.ts stand in for real
// `serve_ad_for_user` results. Clicks are still no-ops (no impression/spend
// tracking backend), but page_id lets a tap open that business's real page.
import { ads } from '../../mock/seed';

export type ServedAd = { campaign_id: string; page_id?: string; headline: string; body: string; image_url: string | null; cta_text: string };

export async function fetchServedAd(_userId: string, _neighbourhoodId: string): Promise<ServedAd | null> {
  return ads[0] ?? null;
}

// Returns the full ad pool so HomeFeed can drop one in after every 5 posts —
// `seedOffset` staggers which ad shows first per load so the feed doesn't
// always open on the exact same campaign.
export async function fetchAdPool(_userId: string, _neighbourhoodId: string, seedOffset = 0): Promise<ServedAd[]> {
  if (ads.length === 0) return [];
  return ads.map((_, i) => ads[(i + seedOffset) % ads.length]);
}

export function recordAdClickFireAndForget(_campaignId: string, _userId: string) {
  /* no-op in demo — no ads backend to record against */
}
