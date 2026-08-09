import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Every backend URL in .env points at a loopback address (127.0.0.1 /
// localhost) because that's what `npx supabase start` and the local NestJS
// services bind to on the dev machine. That only ever works when the app is
// running ON that same machine (a desktop browser).
//
// On any real device it's wrong in a way that's easy to misdiagnose:
// 127.0.0.1 on a phone means THE PHONE ITSELF, not the dev laptop — so every
// network call (signup included) fails with a generic "network request
// failed", making it look like the backend or the signup code is broken when
// the backend is actually healthy and simply unreachable.
//
// Rather than hardcoding a machine-specific LAN IP into .env (which breaks
// the moment the Wi-Fi network hands out a different address, and breaks
// desktop-browser testing at localhost), this derives the right host at
// runtime from wherever the app was actually served:
//   - web  → the browser's own hostname (localhost, or the LAN IP if the
//            page was opened as http://192.168.x.x:8081)
//   - native (Expo Go / dev client) → Expo's `hostUri`, which is the
//            dev-server address the bundle was downloaded from, i.e. exactly
//            the machine the backend is running on.
//
// Production/staging URLs (a real https host) are never touched — only
// loopback addresses get rewritten, so this is a no-op once real URLs are
// configured.
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '0.0.0.0']);

function devServerHost(): string | null {
  if (Platform.OS === 'web') {
    // `location` is always present on web; guard anyway for SSR-ish contexts.
    const hostname = typeof location !== 'undefined' ? location.hostname : '';
    return hostname || null;
  }

  // Expo exposes the dev server as "192.168.1.2:8081" (host:port). Take the
  // host half. `hostUri` is undefined in a standalone production build —
  // which is correct, since a production build should be using real URLs.
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0]?.trim();
  return host || null;
}

/**
 * Rewrites a loopback backend URL to be reachable from whatever device is
 * actually running the app. Non-loopback URLs are returned unchanged.
 */
export function resolveDevUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    // Not a parseable URL — hand it back untouched rather than throwing
    // during module init and taking the whole app down.
    return rawUrl;
  }

  if (!LOOPBACK_HOSTS.has(parsed.hostname)) return rawUrl;

  const host = devServerHost();
  // If we can't determine a better host, keep the original — on a desktop
  // browser at localhost that's already correct.
  if (!host || LOOPBACK_HOSTS.has(host)) return rawUrl;

  parsed.hostname = host;
  return parsed.toString().replace(/\/$/, '');
}
