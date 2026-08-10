import { resolveDevUrl } from './devHost';

/**
 * Resolves a backend service's base URL from its EXPO_PUBLIC_* env var.
 *
 * The loopback fallback is gated on __DEV__ on purpose. These services do run
 * on 127.0.0.1 ports during local development, but the env vars are baked in
 * at build time — so a *release* bundle built without them set would ship
 * "http://127.0.0.1:400x" to real users, where it resolves to their own
 * device and fails. Nothing about that failure points at the real cause: the
 * feature just appears broken, one screen at a time.
 *
 * In a release build the fallback is the empty string instead, which makes
 * the call same-origin — which is where the deployed functions actually live
 * (see mobile/vercel.json's rewrites). A misconfigured production build then
 * degrades to "this backend isn't reachable" rather than quietly aiming at
 * localhost.
 */
export function serviceUrl(configured: string | undefined, devPort: number): string {
  if (configured !== undefined) return resolveDevUrl(configured);
  return __DEV__ ? resolveDevUrl(`http://127.0.0.1:${devPort}`) : '';
}
