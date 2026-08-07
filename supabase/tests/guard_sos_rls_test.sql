-- Group E: RLS test for SOS dispatch log visibility (the trickiest part —
-- an event owner sees everything, an alerted neighbour sees only the row
-- naming them, an unrelated user sees nothing), the trusted-contact 5-limit
-- trigger, and safety_alerts neighbourhood scoping.
BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email, aud, role) VALUES
  (gen_random_uuid(), 'sos-a@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'sos-b@x.local', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'sos-c@x.local', 'authenticated', 'authenticated');

CREATE TEMP TABLE _s_users AS SELECT id, email FROM auth.users WHERE email LIKE 'sos-%@x.local';
GRANT SELECT ON _s_users TO authenticated;

DO $$
DECLARE
  nb uuid;
  user_a uuid;
  user_b uuid;
  event_id uuid;
BEGIN
  SELECT id INTO nb FROM public.neighbourhoods WHERE name = 'HSR Layout';
  SELECT id INTO user_a FROM _s_users WHERE email = 'sos-a@x.local';
  SELECT id INTO user_b FROM _s_users WHERE email = 'sos-b@x.local';

  INSERT INTO public.society_memberships (user_id, neighbourhood_id, society, flat, lat, lng, verification_status)
    VALUES (user_a, nb, 'S', 'A1', 12.91, 77.64, 'verified');

  INSERT INTO public.sos_events (user_id, lat, lng) VALUES (user_a, 12.91, 77.64) RETURNING id INTO event_id;
  -- Backend-style dispatch rows (as service_role would write): one to a
  -- trusted contact (phone-based), one to user B as a nearby neighbour.
  INSERT INTO public.sos_dispatch_log (sos_event_id, channel, recipient_phone, delivery_status)
    VALUES (event_id, 'trusted_contact', '+919876500000', 'sent');
  INSERT INTO public.sos_dispatch_log (sos_event_id, channel, recipient_user_id, delivery_status)
    VALUES (event_id, 'nearby_neighbour', user_b, 'sent');

  CREATE TEMP TABLE _s_ids AS SELECT event_id, user_a, user_b;
END $$;

GRANT SELECT ON _s_ids TO authenticated;
GRANT SELECT, INSERT ON public.sos_events TO authenticated;
GRANT SELECT, INSERT ON public.sos_dispatch_log TO authenticated;
GRANT SELECT, INSERT ON public.trusted_contacts TO authenticated;
GRANT SELECT ON public.safety_alerts TO authenticated;

-- 1) Event owner (A) sees BOTH dispatch rows.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _s_ids), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.sos_dispatch_log WHERE sos_event_id = (SELECT event_id FROM _s_ids)), 2, 'event owner sees both dispatch log rows');

-- 2) Alerted neighbour (B) sees ONLY the row naming them, not the trusted-contact row.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_b::text FROM _s_ids), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.sos_dispatch_log WHERE sos_event_id = (SELECT event_id FROM _s_ids)), 1, 'alerted neighbour B sees only their own dispatch row');
SELECT is((SELECT recipient_user_id FROM public.sos_dispatch_log WHERE sos_event_id = (SELECT event_id FROM _s_ids) LIMIT 1), (SELECT user_b FROM _s_ids), 'the row B sees is the one naming them');

-- 3) Unrelated user (C) sees nothing.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id::text FROM _s_users WHERE email = 'sos-c@x.local'), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.sos_dispatch_log WHERE sos_event_id = (SELECT event_id FROM _s_ids)), 0, 'unrelated user C sees no dispatch rows');
SELECT is((SELECT count(*)::int FROM public.sos_events WHERE id = (SELECT event_id FROM _s_ids)), 0, 'unrelated user C cannot see the sos_event itself');

-- 4) Safety alerts: C is not verified in any neighbourhood, sees no alerts
-- even though one exists for HSR Layout.
RESET ROLE;
INSERT INTO public.safety_alerts (neighbourhood_id, severity, source, title)
  VALUES ((SELECT id FROM public.neighbourhoods WHERE name = 'HSR Layout'), 'warning', 'society', 'Water cut tomorrow 9-12');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT id::text FROM _s_users WHERE email = 'sos-c@x.local'), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.safety_alerts), 0, 'unverified user C sees no safety alerts');

-- 5) Verified user A DOES see the alert for their neighbourhood.
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_a::text FROM _s_ids), 'role', 'authenticated')::text, true);
SELECT is((SELECT count(*)::int FROM public.safety_alerts), 1, 'verified user A sees the safety alert for their neighbourhood');

-- 6) Trusted contact 5-limit: 5 succeed, 6th raises.
DO $$
DECLARE
  user_a uuid;
  i int;
  raised boolean := false;
BEGIN
  SELECT id INTO user_a FROM _s_users WHERE email = 'sos-a@x.local';
  FOR i IN 1..5 LOOP
    INSERT INTO public.trusted_contacts (user_id, name, phone) VALUES (user_a, 'Contact ' || i, '+91900000000' || i);
  END LOOP;
  BEGIN
    INSERT INTO public.trusted_contacts (user_id, name, phone) VALUES (user_a, 'Contact 6', '+919000000006');
  EXCEPTION WHEN OTHERS THEN
    raised := true;
  END;
  CREATE TEMP TABLE _s_limit_result AS SELECT raised;
END $$;
SELECT ok((SELECT raised FROM _s_limit_result), 'the 6th trusted contact raises (5-contact limit enforced)');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
