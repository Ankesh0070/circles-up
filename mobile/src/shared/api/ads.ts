// Demo build: no ads backend. Serving returns null (feed shows no sponsored
// card), clicks are no-ops. Keeps the same interface so callers don't change.
export type ServedAd = { campaign_id: string; headline: string; body: string; image_url: string | null; cta_text: string };

export async function fetchServedAd(_userId: string, _neighbourhoodId: string): Promise<ServedAd | null> {
  return null;
}

export function recordAdClickFireAndForget(_campaignId: string, _userId: string) {
  /* no-op in demo */
}
