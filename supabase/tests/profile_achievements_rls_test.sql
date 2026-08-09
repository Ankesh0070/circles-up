-- Group J: RLS + logic test for profile fields/privacy, saved posts, event
-- check-in, alert validation, the points ledger, achievements, and the
-- circle-connection notification. Heaviest scrutiny goes to edgecase.md
-- §10.1/10.2 — the adversarial anti-farming requirements — since that's
-- this group's Definition of Done item.
BEGIN;
SELECT plan(24);

INSERT INTO auth.users (id, email, aud, role) VALUES
  (gen_random_uuid(), 'j-a@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'j-b@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'j-c@x.local', 'authenticated', 'authenticated');

CREATE TEMP TABLE _j_users AS SELECT id, email FROM auth.users WHERE email LIKE 'j-%@x.local';
GRANT SELECT ON _j_users TO authenticated;

DO $$
DECLARE
  nb_a uuid;
  user_a uuid; user_b uuid; user_c uuid;
BEGIN
  SELECT id INTO nb_a FROM public.neighbourhoods WHERE name = 'HSR Layout';
  SELECT id INTO user_a FROM _j_users WHERE email = 'j-a@x.local';
  SELECT id INTO user_b FROM _j_users WHERE email = 'j-b@x.local';
  SELECT id INTO user_c FROM _j_users WHERE email = 'j-c@x.local';

  INSERT INTO public.society_memberships (user_id, neighbourhood_id, society, flat, lat, lng, verification_status)
    VALUES
      (user_a, nb_a, 'S', 'A1', 12.91, 77.64, 'verified'),
      (user_b, nb_a, 'S', 'B2', 12.91, 77.64, 'verified'),
      (user_c, nb_a, 'S', 'C3', 12.91, 77.64, 'verified');

  UPDATE public.profiles SET active_neighbourhood_id = nb_a, name = 'A'
    WHERE id = user_a;
  UPDATE public.profiles SET active_neighbourhood_id = nb_a, name = 'B'
    WHERE id = user_b;
  UPDATE public.profiles SET active_neighbourhood_id = nb_a, name = 'C'
    WHERE id = user_c;

  CREATE TEMP TABLE _j_ids AS SELECT nb_a, user_a, user_b, user_c;
END $$;

GRANT SELECT ON _j_ids TO authenticated;

-- ============================================================
-- Phase 86: profile fields
-- ============================================================

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _j_ids), 'role', 'authenticated')::text, true);

UPDATE public.profiles SET username = 'neighbour_a', pronouns = 'she/her', link = 'https://a.example', phone = '+91 90000 00001'
  WHERE id = (SELECT user_a FROM _j_ids);

-- 1) duplicate username is rejected by the unique constraint.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _j_ids), 'role', 'authenticated')::text, true);
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.profiles SET username = 'neighbour_a' WHERE id = (SELECT user_b FROM _j_ids);
  EXCEPTION WHEN unique_violation THEN
    blocked := true;
  END;
  CREATE TEMP TABLE _j_dupe_username AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _j_dupe_username), 'a duplicate username is rejected');

-- 2) get_public_profile surfaces username/pronouns/link to a same-neighbourhood viewer.
SELECT is(
  (SELECT username FROM public.get_public_profile((SELECT user_a FROM _j_ids))),
  'neighbour_a',
  'get_public_profile surfaces the public username field'
);

-- 3) get_public_profile never surfaces the private phone column.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    PERFORM phone FROM public.get_public_profile((SELECT user_a FROM _j_ids));
  EXCEPTION WHEN undefined_column THEN
    blocked := true;
  END;
  CREATE TEMP TABLE _j_phone_hidden AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _j_phone_hidden), 'get_public_profile does not expose the private phone column');

-- ============================================================
-- Phase 88: saved posts
-- ============================================================

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _j_ids), 'role', 'authenticated')::text, true);
DO $$
DECLARE new_post_id uuid;
BEGIN
  INSERT INTO public.posts (author_id, neighbourhood_id, category, caption)
    VALUES ((SELECT user_a FROM _j_ids), (SELECT nb_a FROM _j_ids), 'general', 'A general post')
    RETURNING id INTO new_post_id;
  CREATE TEMP TABLE _j_general_post AS SELECT new_post_id AS post_id;
END $$;
GRANT SELECT ON _j_general_post TO authenticated;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _j_ids), 'role', 'authenticated')::text, true);

INSERT INTO public.saved_posts (user_id, post_id) VALUES ((SELECT user_b FROM _j_ids), (SELECT post_id FROM _j_general_post));

-- 4) the saver sees their own saved post.
SELECT is(
  (SELECT count(*)::int FROM public.saved_posts WHERE user_id = (SELECT user_b FROM _j_ids)),
  1,
  'a user sees their own saved post'
);

-- 5) a different user (even one who can view the post) does not see someone else's saved list.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_c::text FROM _j_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.saved_posts WHERE user_id = (SELECT user_b FROM _j_ids)),
  0,
  'a different user cannot see someone else''s saved posts'
);

-- ============================================================
-- Phase 89: event check-in (hard-to-fake attendance signal)
-- ============================================================

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _j_ids), 'role', 'authenticated')::text, true);

DO $$
DECLARE started_id uuid; future_id uuid;
BEGIN
  INSERT INTO public.events (host_id, neighbourhood_id, title, description, event_type, starts_at, location)
    VALUES ((SELECT user_a FROM _j_ids), (SELECT nb_a FROM _j_ids), 'Started Event', 'desc', 'meetup', now() - interval '1 hour', 'Park')
    RETURNING id INTO started_id;
  INSERT INTO public.events (host_id, neighbourhood_id, title, description, event_type, starts_at, location)
    VALUES ((SELECT user_a FROM _j_ids), (SELECT nb_a FROM _j_ids), 'Future Event', 'desc', 'meetup', now() + interval '1 hour', 'Park')
    RETURNING id INTO future_id;
  CREATE TEMP TABLE _j_events AS SELECT started_id, future_id;
END $$;
GRANT SELECT ON _j_events TO authenticated;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _j_ids), 'role', 'authenticated')::text, true);
INSERT INTO public.event_rsvps (event_id, user_id, status) VALUES ((SELECT started_id FROM _j_events), (SELECT user_b FROM _j_ids), 'going');
INSERT INTO public.event_rsvps (event_id, user_id, status) VALUES ((SELECT future_id FROM _j_events), (SELECT user_b FROM _j_ids), 'going');

-- 6) a non-host cannot check anyone in.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.check_in_attendee((SELECT started_id FROM _j_events), (SELECT user_b FROM _j_ids));
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'not_event_host' THEN blocked := true; END IF;
  END;
  CREATE TEMP TABLE _j_checkin_nonhost_blocked AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _j_checkin_nonhost_blocked), 'a non-host cannot check an attendee in');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _j_ids), 'role', 'authenticated')::text, true);

-- 7) the host cannot check someone in before the event has started.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.check_in_attendee((SELECT future_id FROM _j_events), (SELECT user_b FROM _j_ids));
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'event_not_started' THEN blocked := true; END IF;
  END;
  CREATE TEMP TABLE _j_checkin_early_blocked AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _j_checkin_early_blocked), 'the host cannot check an attendee in before the event starts');

-- 8) the host checks the attendee in for the already-started event — succeeds and awards points.
SELECT lives_ok(
  $$ SELECT public.check_in_attendee((SELECT started_id FROM _j_events), (SELECT user_b FROM _j_ids)) $$,
  'the host can check an attendee in once the event has started'
);
-- point_events_select_own only lets a user see their OWN ledger rows, so
-- switch to B (the attendee) to check the row that was written about them.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _j_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.point_events WHERE user_id = (SELECT user_b FROM _j_ids) AND source = 'event_attended'),
  1,
  'checking in awards the attendee an event_attended point event'
);

-- ============================================================
-- Phase 89 / edgecase.md §10.1: points can never be self-granted.
-- ============================================================

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_c::text FROM _j_ids), 'role', 'authenticated')::text, true);

-- 9) a client cannot insert its own point_events row directly (no GRANT at all).
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.point_events (user_id, source, points) VALUES ((SELECT user_c FROM _j_ids), 'event_attended', 999999);
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  CREATE TEMP TABLE _j_points_selfgrant_blocked AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _j_points_selfgrant_blocked), 'a client cannot self-grant points by inserting into point_events directly');

-- ============================================================
-- edgecase.md §10.2: Safety Star requires a real validation signal.
-- ============================================================

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _j_ids), 'role', 'authenticated')::text, true);

DO $$
DECLARE new_post_id uuid;
BEGIN
  INSERT INTO public.posts (author_id, neighbourhood_id, category, caption)
    VALUES ((SELECT user_a FROM _j_ids), (SELECT nb_a FROM _j_ids), 'alert', 'Suspicious van outside gate 2')
    RETURNING id INTO new_post_id;
  CREATE TEMP TABLE _j_alert_post AS SELECT new_post_id AS post_id;
END $$;
GRANT SELECT ON _j_alert_post TO authenticated;

-- 10) the alert's own author cannot confirm it themselves.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.post_alert_confirmations (post_id, confirmer_id) VALUES ((SELECT post_id FROM _j_alert_post), (SELECT user_a FROM _j_ids));
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'cannot_confirm_own_alert' THEN blocked := true; END IF;
  END;
  CREATE TEMP TABLE _j_self_confirm_blocked AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _j_self_confirm_blocked), 'an alert post author cannot confirm their own alert');

-- 11) confirming a non-'alert' post is rejected.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.post_alert_confirmations (post_id, confirmer_id) VALUES ((SELECT post_id FROM _j_general_post), (SELECT user_a FROM _j_ids));
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'not_an_alert_post' THEN blocked := true; END IF;
  END;
  CREATE TEMP TABLE _j_nonalert_blocked AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _j_nonalert_blocked), 'confirming a non-alert post is rejected');

-- 12) one distinct confirmer alone does not validate the alert or award points yet.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _j_ids), 'role', 'authenticated')::text, true);
INSERT INTO public.post_alert_confirmations (post_id, confirmer_id) VALUES ((SELECT post_id FROM _j_alert_post), (SELECT user_b FROM _j_ids));
SELECT is(
  (SELECT safety_validated FROM public.posts WHERE id = (SELECT post_id FROM _j_alert_post)),
  false,
  'a single confirmer does not yet validate the alert'
);

-- 13) that same confirmer cannot insert a second confirmation row (primary key blocks it) —
-- proves one account can never reach the threshold alone.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.post_alert_confirmations (post_id, confirmer_id) VALUES ((SELECT post_id FROM _j_alert_post), (SELECT user_b FROM _j_ids));
  EXCEPTION WHEN unique_violation THEN
    blocked := true;
  END;
  CREATE TEMP TABLE _j_dupe_confirm_blocked AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _j_dupe_confirm_blocked), 'the same confirmer cannot confirm the same alert twice');

-- 14) a second, DISTINCT confirmer crosses the threshold — validates the alert and awards the author points.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_c::text FROM _j_ids), 'role', 'authenticated')::text, true);
INSERT INTO public.post_alert_confirmations (post_id, confirmer_id) VALUES ((SELECT post_id FROM _j_alert_post), (SELECT user_c FROM _j_ids));
SELECT is(
  (SELECT safety_validated FROM public.posts WHERE id = (SELECT post_id FROM _j_alert_post)),
  true,
  'two distinct confirmers validate the alert'
);
-- Switch to A (the alert author) to check the point_events row written about them.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _j_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.point_events WHERE user_id = (SELECT user_a FROM _j_ids) AND source = 'safety_alert_validated'),
  1,
  'validating the alert awards the author a safety_alert_validated point event'
);

-- ============================================================
-- Phase 80/89 integration: a completed donation awards points.
-- ============================================================

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_c::text FROM _j_ids), 'role', 'authenticated')::text, true);
DO $$
DECLARE ngo_id uuid;
BEGIN
  INSERT INTO public.pages (owner_id, neighbourhood_id, page_type, name, darpan_id)
    VALUES ((SELECT user_c FROM _j_ids), (SELECT nb_a FROM _j_ids), 'ngo', 'Care Trust', 'DARPAN999')
    RETURNING id INTO ngo_id;
  CREATE TEMP TABLE _j_ngo AS SELECT ngo_id AS page_id;
END $$;
GRANT SELECT ON _j_ngo TO authenticated;

RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
UPDATE public.pages SET ngo_approval_status = 'approved' WHERE id = (SELECT page_id FROM _j_ngo);
SELECT set_config('request.jwt.claims', '', true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _j_ids), 'role', 'authenticated')::text, true);
DO $$
DECLARE new_donation_id uuid;
BEGIN
  INSERT INTO public.donations (ngo_page_id, donor_id, amount) VALUES ((SELECT page_id FROM _j_ngo), (SELECT user_a FROM _j_ids), 250)
    RETURNING id INTO new_donation_id;
  CREATE TEMP TABLE _j_donation AS SELECT new_donation_id AS donation_id;
END $$;
GRANT SELECT ON _j_donation TO authenticated;

RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
UPDATE public.donations SET payment_status = 'succeeded' WHERE id = (SELECT donation_id FROM _j_donation);
SELECT set_config('request.jwt.claims', '', true);

-- 15) the donor's payment succeeding awards a donation_completed point event.
SELECT is(
  (SELECT count(*)::int FROM public.point_events WHERE user_id = (SELECT user_a FROM _j_ids) AND source = 'donation_completed'),
  1,
  'a donation succeeding awards the donor a donation_completed point event'
);

-- ============================================================
-- Phase 89: get_achievements() — totals, badges, and a rank NUMBER only
-- (edgecase.md §10.2 — no named leaderboard of other users).
-- ============================================================

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _j_ids), 'role', 'authenticated')::text, true);

-- 16) A has 30 points total (10 donation + 20 alert validated) and no badges
-- yet (each badge needs 3+ / 5+ occurrences).
SELECT is(
  (SELECT total_points FROM public.get_achievements()),
  30::bigint,
  'get_achievements totals A''s points correctly (10 donation + 20 alert validated)'
);
SELECT is(
  (SELECT (safety_star, helping_hand) FROM public.get_achievements()),
  (false, false),
  'A has not yet crossed either badge threshold (needs 3+ of a signal, has 1 each)'
);

-- 17) A (30 pts) outranks B (15 pts) in the same city — rank is a NUMBER,
-- not a named list of other users.
SELECT is(
  (SELECT city_rank FROM public.get_achievements()),
  1::bigint,
  'A (highest points in city) is ranked #1'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _j_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT city_rank FROM public.get_achievements()),
  2::bigint,
  'B (fewer points than A) is ranked #2'
);

-- ============================================================
-- Phase 93: circle-connection notification ("+ Circle back" source data)
-- ============================================================

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _j_ids), 'role', 'authenticated')::text, true);
INSERT INTO public.circle_connections (user_id, connected_user_id) VALUES ((SELECT user_b FROM _j_ids), (SELECT user_c FROM _j_ids));

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_c::text FROM _j_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.notifications WHERE user_id = (SELECT user_c FROM _j_ids) AND type = 'circle_connection' AND related_id = (SELECT user_b FROM _j_ids)),
  1,
  'being added to someone''s Circle creates a notification naming the adder, for "+ Circle back"'
);

-- ============================================================
-- Phase 88: self-service account deletion is self-scoped only.
-- ============================================================

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_c::text FROM _j_ids), 'role', 'authenticated')::text, true);
SELECT lives_ok(
  $$ SELECT public.request_account_deletion() $$,
  'a user can request deletion of their own account without hitting the vibes_min_three constraint'
);
SELECT is(
  (SELECT name FROM public.profiles WHERE id = (SELECT user_c FROM _j_ids)),
  'Deleted user',
  'account deletion anonymizes the profile row'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
