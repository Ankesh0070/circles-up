-- Fixes a real bug caught testing Phase 25 (Story Viewer): the client upserts
-- story_views with an on_conflict target, which PostgREST implements as
-- `INSERT ... ON CONFLICT DO UPDATE` — that needs UPDATE privilege on the
-- table, not just INSERT, even though the app-level intent is "insert if
-- missing." Plain INSERT-only grants (as originally written) 403 on every
-- upsert whose conflict target already exists.
grant update on public.story_views to authenticated;
