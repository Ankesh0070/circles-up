-- Fixes a real bug caught while wiring the Verification Orchestrator
-- (Phase 13): `service_role` bypasses RLS (it has the BYPASSRLS role
-- attribute), but RLS-bypass is not the same thing as SQL table privilege —
-- Postgres still enforces plain GRANTs independently of RLS. The earlier
-- migration only granted `authenticated`; backend services connecting as
-- service_role had no SELECT/INSERT/UPDATE at all.
grant select on public.neighbourhoods to service_role;
grant select, insert, update on public.society_memberships to service_role;
grant execute on function public.is_within_neighbourhood to authenticated;
