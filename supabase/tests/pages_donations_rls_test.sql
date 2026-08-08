-- Group I: RLS + logic test for Pages (compliance-field defaults, geocode
-- validation, self-approval blocking) and Donations (the core edgecase.md
-- §8.2 requirement — no donations against an unapproved NGO page).
BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email, aud, role) VALUES
  (gen_random_uuid(), 'i-a@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'i-b@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'i-c@x.local', 'authenticated', 'authenticated');

CREATE TEMP TABLE _i_users AS SELECT id, email FROM auth.users WHERE email LIKE 'i-%@x.local';
GRANT SELECT ON _i_users TO authenticated;

DO $$
DECLARE
  nb_a uuid;
  nb_far uuid := gen_random_uuid();
  user_a uuid; user_b uuid; user_c uuid;
BEGIN
  SELECT id INTO nb_a FROM public.neighbourhoods WHERE name = 'HSR Layout';
  INSERT INTO public.neighbourhoods (id, name, city, geo_boundary)
    VALUES (nb_far, 'Whitefield (test)', 'Bengaluru', ST_GeogFromText('POLYGON((77.7 12.9,77.8 12.9,77.8 13.0,77.7 13.0,77.7 12.9))'));

  SELECT id INTO user_a FROM _i_users WHERE email = 'i-a@x.local';
  SELECT id INTO user_b FROM _i_users WHERE email = 'i-b@x.local';
  SELECT id INTO user_c FROM _i_users WHERE email = 'i-c@x.local';

  -- A and B verified in HSR Layout; C verified only in the far neighbourhood.
  INSERT INTO public.society_memberships (user_id, neighbourhood_id, society, flat, lat, lng, verification_status)
    VALUES
      (user_a, nb_a, 'S', 'A1', 12.91, 77.64, 'verified'),
      (user_b, nb_a, 'S', 'B2', 12.91, 77.64, 'verified'),
      (user_c, nb_far, 'S', 'C3', 12.91, 77.74, 'verified');

  CREATE TEMP TABLE _i_ids AS SELECT nb_a, nb_far, user_a, user_b, user_c;
END $$;

GRANT SELECT ON _i_ids TO authenticated;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _i_ids), 'role', 'authenticated')::text, true);

-- 1) A tries to insert an NGO page pre-set to 'approved' — the trigger
-- overrides it to 'pending' regardless of what the client sent.
DO $$
DECLARE new_page_id uuid;
BEGIN
  INSERT INTO public.pages (owner_id, neighbourhood_id, page_type, name, darpan_id, ngo_approval_status)
    VALUES ((SELECT user_a FROM _i_ids), (SELECT nb_a FROM _i_ids), 'ngo', 'Helping Hands', 'DARPAN123', 'approved')
    RETURNING id INTO new_page_id;
  CREATE TEMP TABLE _i_ngo AS SELECT new_page_id AS page_id;
END $$;
GRANT SELECT ON _i_ngo TO authenticated;
SELECT is(
  (SELECT ngo_approval_status FROM public.pages WHERE id = (SELECT page_id FROM _i_ngo)),
  'pending',
  'a client-supplied ngo_approval_status of approved is overridden to pending at insert'
);

-- 2) A business page defaults to not_applicable, not pending.
DO $$
DECLARE new_page_id uuid;
BEGIN
  INSERT INTO public.pages (owner_id, neighbourhood_id, page_type, name, gst_number)
    VALUES ((SELECT user_a FROM _i_ids), (SELECT nb_a FROM _i_ids), 'business', 'A''s Store', '29ABCDE1234F1Z5')
    RETURNING id INTO new_page_id;
  CREATE TEMP TABLE _i_biz AS SELECT new_page_id AS page_id;
END $$;
GRANT SELECT ON _i_biz TO authenticated;
SELECT is(
  (SELECT ngo_approval_status FROM public.pages WHERE id = (SELECT page_id FROM _i_biz)),
  'not_applicable',
  'a business page defaults ngo_approval_status to not_applicable'
);

-- 3) Owner cannot self-approve their own NGO page.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.pages SET ngo_approval_status = 'approved' WHERE id = (SELECT page_id FROM _i_ngo);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'cannot_self_approve_ngo_status' THEN blocked := true; END IF;
  END;
  CREATE TEMP TABLE _i_self_approve_blocked AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _i_self_approve_blocked), 'a page owner cannot self-approve their own NGO status');

-- 4) A donation against the still-pending NGO page is rejected.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.donations (ngo_page_id, donor_id, amount) VALUES ((SELECT page_id FROM _i_ngo), (SELECT user_a FROM _i_ids), 100);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'ngo_not_approved_for_donations' THEN blocked := true; END IF;
  END;
  CREATE TEMP TABLE _i_donation_blocked AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _i_donation_blocked), 'a donation against a not-yet-approved NGO page is rejected');

RESET ROLE;

-- 5) service_role (the review process) approves the NGO page.
SELECT set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
UPDATE public.pages SET ngo_approval_status = 'approved' WHERE id = (SELECT page_id FROM _i_ngo);
SELECT is(
  (SELECT ngo_approval_status FROM public.pages WHERE id = (SELECT page_id FROM _i_ngo)),
  'approved',
  'service_role (the review process) can approve an NGO page'
);
SELECT set_config('request.jwt.claims', '', true);

-- 6) Now a donation against the approved NGO succeeds.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _i_ids), 'role', 'authenticated')::text, true);
DO $$
DECLARE new_donation_id uuid;
BEGIN
  INSERT INTO public.donations (ngo_page_id, donor_id, amount) VALUES ((SELECT page_id FROM _i_ngo), (SELECT user_b FROM _i_ids), 500)
    RETURNING id INTO new_donation_id;
  CREATE TEMP TABLE _i_donation AS SELECT new_donation_id AS donation_id;
END $$;
GRANT SELECT ON _i_donation TO authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.donations WHERE id = (SELECT donation_id FROM _i_donation)),
  1,
  'a donation against an approved NGO page succeeds'
);

-- 7) The donor (B) sees their own donation.
SELECT is(
  (SELECT count(*)::int FROM public.donations WHERE id = (SELECT donation_id FROM _i_donation)),
  1,
  'the donor sees their own donation'
);

-- 8) A different, unrelated user (C) does not see B's donation.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_c::text FROM _i_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.donations WHERE id = (SELECT donation_id FROM _i_donation)),
  0,
  'an unrelated user does not see someone else''s donation'
);

-- 9) A (the NGO page owner) sees the donation made to their page.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _i_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.donations WHERE id = (SELECT donation_id FROM _i_donation)),
  1,
  'the NGO page owner sees a donation made to their page'
);

-- 10) Business/NGO pages are visible to a verified-elsewhere user (C);
-- personal pages are not.
DO $$
DECLARE new_page_id uuid;
BEGIN
  INSERT INTO public.pages (owner_id, neighbourhood_id, page_type, name, profession)
    VALUES ((SELECT user_a FROM _i_ids), (SELECT nb_a FROM _i_ids), 'personal', 'A''s Page', 'Photographer')
    RETURNING id INTO new_page_id;
  CREATE TEMP TABLE _i_personal AS SELECT new_page_id AS page_id;
END $$;
GRANT SELECT ON _i_personal TO authenticated;

SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_c::text FROM _i_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.pages WHERE id = (SELECT page_id FROM _i_biz)),
  1,
  'a business page is visible to a verified-elsewhere user'
);
SELECT is(
  (SELECT count(*)::int FROM public.pages WHERE id = (SELECT page_id FROM _i_personal)),
  0,
  'a personal page is invisible to a different-neighbourhood user'
);

-- 11) geocode_status: a lat/lng far outside the neighbourhood is flagged
-- 'mismatch' (edgecase.md §8.5), not silently accepted.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _i_ids), 'role', 'authenticated')::text, true);
DO $$
DECLARE new_page_id uuid;
BEGIN
  INSERT INTO public.pages (owner_id, neighbourhood_id, page_type, name, gst_number, lat, lng)
    VALUES ((SELECT user_a FROM _i_ids), (SELECT nb_a FROM _i_ids), 'business', 'Far Away Store', '29ABCDE1234F1Z5', 28.6139, 77.2090)
    RETURNING id INTO new_page_id;
  CREATE TEMP TABLE _i_mismatch AS SELECT new_page_id AS page_id;
END $$;
GRANT SELECT ON _i_mismatch TO authenticated;
SELECT is(
  (SELECT geocode_status FROM public.pages WHERE id = (SELECT page_id FROM _i_mismatch)),
  'mismatch',
  'a page address far outside its claimed neighbourhood is flagged mismatch'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
