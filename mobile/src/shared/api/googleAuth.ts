import { Platform } from 'react-native';
import { supabase } from './supabase';

// Whether to show the "Continue with Google" option at all. Google OAuth needs
// a Google Cloud client wired into Supabase, which isn't set up on this
// project — so by default the button is hidden rather than shown as a dead end
// that just tells people to use email/phone. Set EXPO_PUBLIC_GOOGLE_AUTH=1
// once the provider is enabled to bring it back.
export const GOOGLE_AUTH_ENABLED = process.env.EXPO_PUBLIC_GOOGLE_AUTH === '1';

// Real Google sign-in via Supabase's OAuth flow. Replaces the prototype's
// UI-only Google sheet, which collected credentials it never sent anywhere
// and dead-ended on a "not wired yet" note.
//
// On web this is a full-page redirect to Google and back (redirectTo brings
// the session home). That's the flow the deployed build uses. On native it
// would need a deep link + expo-auth-session, which isn't set up here — so
// native returns a clear message rather than opening a browser tab that
// can't hand the session back.
//
// Requires the Google provider to be enabled in the Supabase dashboard
// (Authentication → Sign In / Providers → Google) with a Google Cloud OAuth
// client. If it isn't, Supabase's default behaviour is to redirect the
// browser straight to the authorize endpoint, which then renders a raw JSON
// error on the Supabase domain — a dead end with no way back. So instead of
// letting supabase-js redirect blindly, we take the URL, probe it, and only
// send the user to Google if the provider is actually live; otherwise we
// hand back a plain message and keep them on the login screen.
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (Platform.OS !== 'web') {
    return {
      error: 'Google sign-in is available on the web version. On this device, use email or phone.',
    };
  }

  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;

  // skipBrowserRedirect: we do the redirect ourselves, after checking the
  // provider is enabled — so a misconfigured project shows an in-app message
  // instead of dumping the user on a raw JSON error page.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error || !data?.url) {
    return { error: error?.message ?? 'Could not start Google sign-in.' };
  }

  try {
    // A live provider answers this GET with a cross-origin redirect to Google,
    // which fetch reports as an opaque redirect. "Provider not enabled" comes
    // back as a readable 400 instead.
    const probe = await fetch(data.url, { method: 'GET', redirect: 'manual' });
    const enabled = probe.type === 'opaqueredirect' || (probe.status >= 300 && probe.status < 400);

    if (enabled) {
      window.location.href = data.url;
      return { error: null };
    }

    const body = await probe.text().catch(() => '');
    if (/not enabled|unsupported provider/i.test(body)) {
      return {
        error: 'Google sign-in isn’t enabled on this project yet. Use email or phone to continue.',
      };
    }
    // Unknown non-redirect response — fall back to letting the browser follow it.
    window.location.href = data.url;
    return { error: null };
  } catch {
    // Probe blocked (e.g. network) — fall back to the normal redirect.
    window.location.href = data.url;
    return { error: null };
  }
}
