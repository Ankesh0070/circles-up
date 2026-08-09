import { resolveDevUrl } from './devHost';

const ADS_SERVICE_URL = resolveDevUrl(process.env.EXPO_PUBLIC_ADS_SERVICE_URL ?? 'http://127.0.0.1:4004');

export type ServedAd = { campaign_id: string; headline: string; body: string; image_url: string | null; cta_text: string };

export async function fetchServedAd(userId: string, neighbourhoodId: string): Promise<ServedAd | null> {
  const res = await fetch(`${ADS_SERVICE_URL}/ads/serve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, neighbourhoodId }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body && body.campaign_id ? body : null;
}

export function recordAdClickFireAndForget(campaignId: string, userId: string) {
  fetch(`${ADS_SERVICE_URL}/ads/click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId, userId }),
  }).catch((e) => console.warn('[ads] click record failed', e));
}
