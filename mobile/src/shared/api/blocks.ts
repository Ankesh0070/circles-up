import { supabase } from './supabase';

// Phase 62 (edgecase.md §9.2, 🟠): block lists must be global, not scoped
// to chat. `dm_blocks` (built in Group D) is the single canonical block
// table — this helper is what lets every OTHER surface (feed, discovery,
// topics) enforce it too, instead of each screen reinventing its own
// partial version of "who has this user blocked".
//
// Bidirectional by construction: if I blocked someone OR they blocked me,
// their content disappears from my view either way (matches dm_blocks'
// own is_blocked_between DB function — this is the client-side mirror for
// screens that need a Set of ids to filter with, not just a boolean check).
export async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const [{ data: blockedByMe }, { data: blockedMe }] = await Promise.all([
    supabase.from('dm_blocks').select('blocked_id').eq('blocker_id', userId),
    supabase.from('dm_blocks').select('blocker_id').eq('blocked_id', userId),
  ]);
  const ids = new Set<string>();
  for (const row of blockedByMe ?? []) ids.add(row.blocked_id);
  for (const row of blockedMe ?? []) ids.add(row.blocker_id);
  return ids;
}
