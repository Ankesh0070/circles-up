-- Group I: RLS + logic test for ad_campaigns (self-approval blocking,
-- ownership) and the serve_ad_for_user function (edgecase.md §8.3's hard
-- serve-time budget check, targeting match, §8.7's concurrent cap).
BEGIN;
SELECT plan(15);

INSERT INTO auth.users (id, email, aud, role) VALUES
  (gen_random_uuid(), 'ad-a@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'ad-b@x.local', 'authenticated', 'authenticated');

CREATE TEMP TABLE _ad_users AS SELECT id, email FROM auth.users WHERE email LIKE 'ad-%@x.local';
GRANT SELECT ON _ad_users TO authenticated;

DO $$
DECLARE
  nb_a uuid;
  nb_other uuid := gen_random_uuid();
  user_a uuid; user_b uuid;
  page_id uuid;
BEGIN
  SELECT id INTO nb_a FROM public.neighbourhoods WHERE name = 'HSR Layout';
  INSERT INTO public.neighbourhoods (id, name, city, geo_boundary)
    VALUES (nb_other, 'Untargeted (test)', 'Bengaluru', ST_GeogFromText('POLYGON((77.7 12.9,77.8 12.9,77.8 13.0,77.7 13.0,77.7 12.9))'));

  SELECT id INTO user_a FROM _ad_users WHERE email = 'ad-a@x.local';
  SELECT id INTO user_b FROM _ad_users WHERE email = 'ad-b@x.local';

  INSERT INTO public.society_memberships (user_id, neighbourhood_id, society, flat, lat, lng, verification_status)
    VALUES
      (user_a, nb_a, 'S', 'A1', 12.91, 77.64, 'verified'),
      (user_b, nb_a, 'S', 'B2', 12.91, 77.64, 'verified');

  INSERT INTO public.pages (owner_id, neighbourhood_id, page_type, name, gst_number)
    VALUES (user_a, nb_a, 'business', 'A''s Store', '29ABCDE1234F1Z5')
    RETURNING id INTO page_id;

  CREATE TEMP TABLE _ad_ids AS SELECT nb_a, nb_other, user_a, user_b, page_id;
END $$;

GRANT SELECT ON _ad_ids TO authenticated;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _ad_ids), 'role', 'authenticated')::text, true);

-- 1) A creates a draft campaign targeting nb_a with a small budget (4
-- impressions' worth at 0.50 each).
DO $$
DECLARE new_campaign_id uuid;
BEGIN
  INSERT INTO public.ad_campaigns (page_id, objective, target, headline, body, budget_total)
    VALUES (
      (SELECT page_id FROM _ad_ids), 'awareness',
      jsonb_build_object('mode', 'neighbourhoods', 'neighbourhood_ids', jsonb_build_array((SELECT nb_a::text FROM _ad_ids))),
      'Grand Opening', 'Come visit our store!', 2.00
    )
    RETURNING id INTO new_campaign_id;
  CREATE TEMP TABLE _ad_campaign AS SELECT new_campaign_id AS campaign_id;
END $$;
GRANT SELECT ON _ad_campaign TO authenticated;
SELECT is((SELECT status FROM public.ad_campaigns WHERE id = (SELECT campaign_id FROM _ad_campaign)), 'draft', 'a new campaign starts as draft');

-- 2) An advertiser cannot bypass review entirely by INSERTing a campaign
-- with status='active' directly, skipping the draft/pending_review steps.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.ad_campaigns (page_id, objective, target, headline, body, budget_total, status)
      VALUES ((SELECT page_id FROM _ad_ids), 'awareness', '{}'::jsonb, 'Sneaky', 'Sneaky body', 1.00, 'active');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'ad_campaign_status_transition_requires_review' THEN blocked := true; END IF;
  END;
  CREATE TEMP TABLE _ad_insert_active_blocked AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _ad_insert_active_blocked), 'an advertiser cannot insert a campaign pre-set to active, bypassing review');

-- 3) A cannot jump straight from draft to active.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.ad_campaigns SET status = 'active' WHERE id = (SELECT campaign_id FROM _ad_campaign);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'ad_campaign_status_transition_requires_review' THEN blocked := true; END IF;
  END;
  CREATE TEMP TABLE _ad_self_activate_blocked AS SELECT blocked;
END $$;
SELECT ok((SELECT blocked FROM _ad_self_activate_blocked), 'an advertiser cannot self-activate a draft campaign');

-- 3) A can submit it for review (draft -> pending_review).
UPDATE public.ad_campaigns SET status = 'pending_review' WHERE id = (SELECT campaign_id FROM _ad_campaign);
SELECT is((SELECT status FROM public.ad_campaigns WHERE id = (SELECT campaign_id FROM _ad_campaign)), 'pending_review', 'an advertiser can submit their own campaign for review');

RESET ROLE;

-- 4) service_role (the ad review process) approves it.
SELECT set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
UPDATE public.ad_campaigns SET status = 'active' WHERE id = (SELECT campaign_id FROM _ad_campaign);
SELECT is((SELECT status FROM public.ad_campaigns WHERE id = (SELECT campaign_id FROM _ad_campaign)), 'active', 'service_role (ad review) can activate a pending campaign');
SELECT set_config('request.jwt.claims', '', true);

-- 5) edgecase.md §8.7: exactly 1 active campaign now targets nb_a, and the
-- cap for a 2-verified-member neighbourhood is max(1, floor(2/50)) = 1 —
-- so this neighbourhood is now at capacity.
SELECT is((SELECT public.count_active_campaigns_for_neighbourhood((SELECT nb_a FROM _ad_ids))), 1, 'count_active_campaigns_for_neighbourhood counts the newly-active campaign');
SELECT is((SELECT public.neighbourhood_ad_cap((SELECT nb_a FROM _ad_ids))), 1, 'a 2-verified-member neighbourhood has an ad cap of 1');

-- 6) edgecase.md §8.3: serve_ad_for_user finds the active campaign for a
-- user in the targeted neighbourhood, and records a real impression +
-- budget spend (not a no-op read).
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _ad_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT campaign_id FROM public.serve_ad_for_user((SELECT user_b FROM _ad_ids), (SELECT nb_a FROM _ad_ids))),
  (SELECT campaign_id FROM _ad_campaign),
  'serve_ad_for_user returns the active campaign targeting the user''s neighbourhood'
);
RESET ROLE;
SELECT is((SELECT budget_spent FROM public.ad_campaigns WHERE id = (SELECT campaign_id FROM _ad_campaign)), 0.50::numeric, 'serving an impression deducts cost_per_impression from budget_spent');
SELECT is((SELECT count(*)::int FROM public.ad_events WHERE campaign_id = (SELECT campaign_id FROM _ad_campaign) AND event_type = 'impression'), 1, 'serving an impression records a real ad_events row');

-- 7) A neighbourhood NOT in the campaign's target gets nothing.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _ad_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.serve_ad_for_user((SELECT user_b FROM _ad_ids), (SELECT nb_other FROM _ad_ids))),
  0,
  'serve_ad_for_user returns nothing for a neighbourhood outside the campaign''s target'
);

-- 8) edgecase.md §8.3 hard check: exhaust the remaining budget (3 more
-- impressions of 0.50 = 1.50, bringing spend to 2.00 = budget_total), then
-- confirm the NEXT serve call returns nothing even though targeting still
-- matches — the check is at serve time, not periodic reconciliation.
SELECT public.serve_ad_for_user((SELECT user_b FROM _ad_ids), (SELECT nb_a FROM _ad_ids));
SELECT public.serve_ad_for_user((SELECT user_b FROM _ad_ids), (SELECT nb_a FROM _ad_ids));
SELECT public.serve_ad_for_user((SELECT user_b FROM _ad_ids), (SELECT nb_a FROM _ad_ids));
RESET ROLE;
SELECT is((SELECT budget_spent FROM public.ad_campaigns WHERE id = (SELECT campaign_id FROM _ad_campaign)), 2.00::numeric, 'budget_spent reaches budget_total after 4 total impressions');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _ad_ids), 'role', 'authenticated')::text, true);
SELECT is(
  (SELECT count(*)::int FROM public.serve_ad_for_user((SELECT user_b FROM _ad_ids), (SELECT nb_a FROM _ad_ids))),
  0,
  'serve_ad_for_user stops serving a campaign the instant its budget is exhausted'
);

-- 9) record_ad_click records a real click event.
SELECT public.record_ad_click((SELECT campaign_id FROM _ad_campaign), (SELECT user_b FROM _ad_ids));
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.ad_events WHERE campaign_id = (SELECT campaign_id FROM _ad_campaign) AND event_type = 'click'), 1, 'record_ad_click records a real click event');

-- 10) A different user (B) cannot see A's ad_campaigns row directly (only
-- the page owner can — B isn't a page owner at all here).
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _ad_ids), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.ad_campaigns WHERE id = (SELECT campaign_id FROM _ad_campaign)), 0, 'a non-owner cannot see another advertiser''s campaign row');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
