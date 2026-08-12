// Frontend-only demo build: the real Supabase client has been swapped for a
// local mock backed by seed data (see src/mock/client.ts). Every screen still
// imports `supabase` from here, so nothing else had to change. No network
// calls leave the app — auth, data, storage and realtime are all faked.
export { mockSupabase as supabase } from '../../mock/client';
export { mockSignIn, mockSignUp, mockCurrentUser } from '../../mock/client';
export type { MockUser } from '../../mock/client';
