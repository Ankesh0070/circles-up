-- Fixes the same class of bug as 20260805221812_service_role_grants.sql
-- (Group B): service_role bypasses RLS but not plain table GRANTs. The
-- Guard/SOS migration granted `authenticated` throughout but missed
-- `service_role`, which the sos Dispatch Service actually connects as.
-- Caught immediately on first real dispatch-endpoint test rather than
-- discovered later — the earlier occurrence made this the first thing to
-- check when a "works in RLS tests, fails from the backend service" bug
-- shows up.
grant select on public.profiles to service_role;
grant select on public.trusted_contacts to service_role;
grant insert, select on public.sos_dispatch_log to service_role;
