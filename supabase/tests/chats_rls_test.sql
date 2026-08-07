-- Group D: RLS test for chats/messages, including the bidirectional-block
-- invariant from edgecase.md §5.3 — if A blocks B, B also stops seeing A
-- (not just the other way around), so B can't infer "A blocked me" from
-- the asymmetry.
BEGIN;
SELECT plan(7);

INSERT INTO auth.users (id, email, aud, role) VALUES
  (gen_random_uuid(), 'chat-a@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'chat-b@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'chat-c@x.local', 'authenticated', 'authenticated');

CREATE TEMP TABLE _c_users AS
  SELECT id, email FROM auth.users WHERE email LIKE 'chat-%@x.local';
GRANT SELECT ON _c_users TO authenticated;

DO $$
DECLARE
  user_a uuid;
  user_b uuid;
  user_c uuid;
  chat_ab uuid;
BEGIN
  SELECT id INTO user_a FROM _c_users WHERE email = 'chat-a@x.local';
  SELECT id INTO user_b FROM _c_users WHERE email = 'chat-b@x.local';
  SELECT id INTO user_c FROM _c_users WHERE email = 'chat-c@x.local';

  INSERT INTO public.chats (created_by, is_group) VALUES (user_a, false)
    RETURNING id INTO chat_ab;
  INSERT INTO public.chat_members (chat_id, user_id) VALUES (chat_ab, user_a), (chat_ab, user_b);

  INSERT INTO public.messages (chat_id, author_id, text) VALUES (chat_ab, user_a, 'hi from A');
  INSERT INTO public.messages (chat_id, author_id, text) VALUES (chat_ab, user_b, 'hi from B');

  CREATE TEMP TABLE _c_ids AS SELECT chat_ab, user_a, user_b, user_c;
END $$;

GRANT SELECT ON _c_ids TO authenticated;
GRANT SELECT ON public.chats TO authenticated;
GRANT SELECT ON public.chat_members TO authenticated;
GRANT SELECT ON public.messages TO authenticated;

-- 1) User A sees the DM they created.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _c_ids), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.chats), 1, 'user A sees the DM they are a member of');

-- 2) User A sees both messages in it.
SELECT is((SELECT count(*)::int FROM public.messages), 2, 'user A sees both messages in the DM');

-- 3) User C (not a member) sees no chats and no messages.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_c::text FROM _c_ids), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.chats), 0, 'non-member user C sees no chats');
SELECT is((SELECT count(*)::int FROM public.messages), 0, 'non-member user C sees no messages');

-- 4) Bidirectional block invariant. A blocks B; both directions of message
-- visibility must vanish, not just one.
RESET ROLE;
INSERT INTO public.dm_blocks (blocker_id, blocked_id)
  VALUES ((SELECT user_a FROM _c_ids), (SELECT user_b FROM _c_ids));

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _c_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.messages WHERE author_id = (SELECT user_b FROM _c_ids)),
  0,
  'after A blocks B, A no longer sees B''s messages'
);

SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _c_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.messages WHERE author_id = (SELECT user_a FROM _c_ids)),
  0,
  'after A blocks B, B ALSO no longer sees A''s messages (bidirectional invariant)'
);

-- 5) B can still see their OWN messages (block only hides the other party).
SELECT is(
  (SELECT count(*)::int FROM public.messages WHERE author_id = (SELECT user_b FROM _c_ids)),
  1,
  'B still sees their own messages'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
