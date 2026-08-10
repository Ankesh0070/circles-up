import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { resolveDevUrl } from './devHost';

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!rawUrl || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env (see README.md).'
  );
}

// See devHost.ts: a loopback URL from .env is unreachable from a real
// device, so point it at whichever host actually served this bundle.
const url = resolveDevUrl(rawUrl);

import { Platform } from 'react-native';

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On web the Google OAuth redirect comes back with the session in the
    // URL; supabase-js has to parse it to complete sign-in. Native never gets
    // that redirect, so leave it off there.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
