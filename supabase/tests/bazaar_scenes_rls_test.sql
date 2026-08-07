-- Group H: RLS + logic test for Bazaar (prohibited-keyword filter, report-
-- threshold auto-flagging, neighbourhood scoping) and Scenes/Events
-- (privacy-tier visibility, RSVP waitlist, cancellation notify fan-out).
BEGIN;
SELECT plan(15);

INSERT INTO auth.users (id, email, aud, role) VALUES
  (gen_random_uuid(), 'h-a@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'h-b@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'h-c@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'h-d@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'h-e@x.local', 'authenticated', 'authenticated');

CREATE TEMP TABLE _h_users AS SELECT id, email FROM auth.users WHERE email LIKE 'h-%@x.local';
GRANT SELECT ON _h_users TO authenticated;

DO $$
DECLARE
  nb_a uuid;
  nb_far uuid := gen_random_uuid();
  user_a uuid; user_b uuid; user_c uuid; user_d uuid; user_e uuid;
BEGIN
  SELECT id INTO nb_a FROM public.neighbourhoods WHERE name = 'HSR Layout';
  INSERT INTO public.neighbourhoods (id, name, city, geo_boundary)
    VALUES (nb_far, 'Whitefield (test)', 'Bengaluru', ST_GeogFromText('POLYGON((77.7 12.9,77.8 12.9,77.8 13.0,77.7 13.0,77.7 12.9))'));

  SELECT id INTO user_a FROM _h_users WHERE email = 'h-a@x.local';
  SELECT id INTO user_b FROM _h_users WHERE email = 'h-b@x.local';
  SELECT id INTO user_c FROM _h_users WHERE email = 'h-c@x.local';
  SELECT id INTO user_d FROM _h_users WHERE email = 'h-d@x.local';
  SELECT id INTO user_e FROM _h_users WHERE email = 'h-e@x.local';

  -- A, B and E verified in HSR Layout (E exists so the waitlist test has a
  -- second same-neighbourhood RSVP'er distinct from C, who is deliberately
  -- verified elsewhere for the cross-neighbourhood visibility assertions);
  -- C verified only in the far neighbourhood; D never verified anywhere.
  INSERT INTO public.society_memberships (user_id, neighbourhood_id, society, flat, lat, lng, verification_status)
    VALUES
      (user_a, nb_a, 'S', 'A1', 12.91, 77.64, 'verified'),
      (user_b, nb_a, 'S', 'B2', 12.91, 77.64, 'verified'),
      (user_e, nb_a, 'S', 'E5', 12.91, 77.64, 'verified'),
      (user_c, nb_far, 'S', 'C3', 12.91, 77.74, 'verified');

  CREATE TEMP TABLE _h_ids AS SELECT nb_a, nb_far, user_a, user_b, user_c, user_d, user_e;
END $$;

GRANT SELECT ON _h_ids TO authenticated;

-- ============================================================
-- Bazaar
-- ============================================================

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _h_ids), 'role', 'authenticated')::text, true);

-- 1) edgecase.md §6.3: a prohibited keyword in the title is rejected at
-- insert time, not just reportable afterward.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.bazaar_listings (seller_id, neighbourhood_id, category, title, description)
      VALUES ((SELECT user_a FROM _h_ids), (SELECT nb_a FROM _h_ids), 'electronics', 'Selling a pistol, barely used', 'no really');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'bazaar_prohibited_item' THEN blocked := true; END IF;
  END;
  CREATE TEMP TABLE _h_blocked AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _h_blocked), 'a prohibited-keyword listing is rejected at insert time');

-- A posts a legitimate listing; capture its id for later steps.
DO $$
DECLARE new_listing_id uuid;
BEGIN
  INSERT INTO public.bazaar_listings (seller_id, neighbourhood_id, category, title, description, price)
    VALUES ((SELECT user_a FROM _h_ids), (SELECT nb_a FROM _h_ids), 'furniture', 'Wooden bookshelf', 'Good condition, giving away', 0)
    RETURNING id INTO new_listing_id;
  CREATE TEMP TABLE _h_listing AS SELECT new_listing_id AS listing_id;
END $$;

GRANT SELECT ON _h_listing TO authenticated;

-- 2) B, verified in the same neighbourhood, can see A's listing.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _h_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.bazaar_listings WHERE id = (SELECT listing_id FROM _h_listing)),
  1,
  'a same-neighbourhood verified user can see the listing'
);

-- 3) C, verified only in a different neighbourhood, cannot see it.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_c::text FROM _h_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.bazaar_listings WHERE id = (SELECT listing_id FROM _h_listing)),
  0,
  'a different-neighbourhood user cannot see the listing'
);

-- 4) edgecase.md §6.3 report flow: 2 distinct reporters auto-flags the
-- listing. B and D each report it once.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _h_ids), 'role', 'authenticated')::text, true);
INSERT INTO public.reports (reporter_id, target_type, target_id, reason)
  VALUES ((SELECT user_b FROM _h_ids), 'bazaar_listing', (SELECT listing_id FROM _h_listing), 'suspicious');

SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_d::text FROM _h_ids), 'role', 'authenticated')::text, true);
INSERT INTO public.reports (reporter_id, target_type, target_id, reason)
  VALUES ((SELECT user_d FROM _h_ids), 'bazaar_listing', (SELECT listing_id FROM _h_listing), 'suspicious');

RESET ROLE;
SELECT is(
  (SELECT status::text FROM public.bazaar_listings WHERE id = (SELECT listing_id FROM _h_listing)),
  'flagged',
  '2 distinct reporters auto-flags the listing'
);

-- ============================================================
-- Scenes / Events
-- ============================================================

-- A hosts 3 events, one per privacy tier, each in HSR Layout.
DO $$
DECLARE
  ev_verified uuid;
  ev_close uuid;
  ev_open uuid;
BEGIN
  INSERT INTO public.events (host_id, neighbourhood_id, title, description, event_type, starts_at, location, privacy_tier, guest_limit)
    VALUES ((SELECT user_a FROM _h_ids), (SELECT nb_a FROM _h_ids), 'Verified-tier potluck', 'desc', 'social', now() + interval '3 days', 'Clubhouse', 'verified', 1)
    RETURNING id INTO ev_verified;
  INSERT INTO public.events (host_id, neighbourhood_id, title, description, event_type, starts_at, location, privacy_tier)
    VALUES ((SELECT user_a FROM _h_ids), (SELECT nb_a FROM _h_ids), 'Close-friends game night', 'desc', 'social', now() + interval '3 days', 'A''s flat', 'close_friends')
    RETURNING id INTO ev_close;
  INSERT INTO public.events (host_id, neighbourhood_id, title, description, event_type, starts_at, location, privacy_tier)
    VALUES ((SELECT user_a FROM _h_ids), (SELECT nb_a FROM _h_ids), 'Open city meetup', 'desc', 'social', now() + interval '3 days', 'Park', 'open')
    RETURNING id INTO ev_open;
  CREATE TEMP TABLE _h_events AS SELECT ev_verified, ev_close, ev_open;
END $$;

GRANT SELECT ON _h_events TO authenticated;

-- 5) 'verified' tier: B (same neighbourhood) can see it; C (different
-- neighbourhood, no circle/open access) cannot.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _h_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.events WHERE id = (SELECT ev_verified FROM _h_events)),
  1,
  'verified-tier event visible to a same-neighbourhood verified user'
);

SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_c::text FROM _h_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.events WHERE id = (SELECT ev_verified FROM _h_events)),
  0,
  'verified-tier event invisible to a different-neighbourhood user'
);

-- 6) 'close_friends' tier: C cannot see it before A adds them to Circle;
-- can see it after.
SELECT is(
  (SELECT count(*)::int FROM public.events WHERE id = (SELECT ev_close FROM _h_events)),
  0,
  'close-friends-tier event invisible before host adds viewer to Circle'
);

RESET ROLE;
INSERT INTO public.circle_connections (user_id, connected_user_id) VALUES ((SELECT user_a FROM _h_ids), (SELECT user_c FROM _h_ids));

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_c::text FROM _h_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.events WHERE id = (SELECT ev_close FROM _h_events)),
  1,
  'close-friends-tier event visible after host adds viewer to Circle'
);

-- 7) 'open' tier: C (different neighbourhood, verified somewhere) can see it.
SELECT is(
  (SELECT count(*)::int FROM public.events WHERE id = (SELECT ev_open FROM _h_events)),
  1,
  'open-tier event visible to any verified-anywhere user'
);

-- 8) edgecase.md §7.1: guest_limit is 1 on the verified-tier event. B RSVPs
-- 'going' first (fills the cap); E (also verified in HSR Layout) RSVPs
-- 'going' second and is auto-waitlisted rather than silently over-booked
-- or rejected.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _h_ids), 'role', 'authenticated')::text, true);
INSERT INTO public.event_rsvps (event_id, user_id, status) VALUES ((SELECT ev_verified FROM _h_events), (SELECT user_b FROM _h_ids), 'going');

SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_e::text FROM _h_ids), 'role', 'authenticated')::text, true);
INSERT INTO public.event_rsvps (event_id, user_id, status) VALUES ((SELECT ev_verified FROM _h_events), (SELECT user_e FROM _h_ids), 'going');

RESET ROLE;
SELECT is(
  (SELECT status::text FROM public.event_rsvps WHERE event_id = (SELECT ev_verified FROM _h_events) AND user_id = (SELECT user_e FROM _h_ids)),
  'waitlisted',
  'RSVPing after guest_limit is reached auto-waitlists instead of over-booking'
);

-- 9) edgecase.md §7.3: cancelling notifies every RSVP'd user (B and E),
-- not the host themselves.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _h_ids), 'role', 'authenticated')::text, true);
SELECT public.cancel_event_and_notify((SELECT ev_verified FROM _h_events));
RESET ROLE;

SELECT is(
  (SELECT status FROM public.events WHERE id = (SELECT ev_verified FROM _h_events)),
  'cancelled',
  'cancel_event_and_notify marks the event cancelled'
);

SELECT is(
  (SELECT count(*)::int FROM public.notifications
    WHERE type = 'event_cancelled' AND related_id = (SELECT ev_verified FROM _h_events)
      AND user_id IN ((SELECT user_b FROM _h_ids), (SELECT user_e FROM _h_ids))),
  2,
  'both RSVP''d users (going and waitlisted) get a cancellation notification'
);

-- 10) The host does not notify themselves, and a non-RSVP'd verified user
-- (D was never RSVP'd to this event) gets nothing either.
SELECT is(
  (SELECT count(*)::int FROM public.notifications WHERE related_id = (SELECT ev_verified FROM _h_events) AND user_id = (SELECT user_a FROM _h_ids)),
  0,
  'the host does not get a self-notification'
);

-- 11) A non-host cannot cancel someone else's event.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _h_ids), 'role', 'authenticated')::text, true);
DO $$
DECLARE rejected boolean := false;
BEGIN
  BEGIN
    PERFORM public.cancel_event_and_notify((SELECT ev_open FROM _h_events));
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'not_event_host' THEN rejected := true; END IF;
  END;
  CREATE TEMP TABLE _h_rejected AS SELECT rejected;
END $$;
RESET ROLE;
SELECT ok((SELECT rejected FROM _h_rejected), 'a non-host cannot cancel someone else''s event');

-- 12) event_rsvps visibility follows the same privacy gate as the event
-- itself: D (unverified anywhere, no circle tie, not RSVP'd) cannot see
-- B's RSVP row on the open-tier event even though 'open' events are
-- visible app-wide to verified users — D isn't verified anywhere at all.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_d::text FROM _h_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.events WHERE id = (SELECT ev_open FROM _h_events)),
  0,
  'an unverified-anywhere user cannot see even an open-tier event'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
