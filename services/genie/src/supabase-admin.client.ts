import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS entirely, per architecture.md's model
// of trusted backend services. Never expose this key to the mobile app.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);
