-- Fixes the same class of bug found in Phase 25 (story_views): PostgREST's
-- upsert is `INSERT ... ON CONFLICT DO UPDATE`, which needs UPDATE
-- privilege, not just INSERT. Found again testing Phase 30's comment likes
-- (comment_likes.upsert 403'd) — and hidden_posts/muted_users use the exact
-- same .upsert() pattern in ModerationMenu.tsx, so they'd have hit the
-- identical wall the first time anyone actually hid a post or muted a user.
grant update on public.comment_likes to authenticated;
grant update on public.hidden_posts to authenticated;
grant update on public.muted_users to authenticated;
