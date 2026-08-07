-- Phase 44 (implementationplan.md Group E): "5 nearest neighbours" lookup
-- for SOS fan-out (architecture.md §6.2). Scoped to the SAME neighbourhood
-- as the triggering user — alerting people in the same verified community,
-- not just anyone within a radius who might be across a city. Distance is
-- plain Euclidean-on-lat/lng (society_memberships stores lat/lng as
-- double precision, not geography) — adequate at neighbourhood scale
-- (a few km), not appropriate for anything larger.
--
-- service_role only — this is a backend-dispatch primitive, not something
-- the mobile client calls directly.
create function public.nearby_verified_neighbours(
  p_user_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_limit int default 5
)
returns table (user_id uuid, name text, lat double precision, lng double precision)
language sql
security definer
set search_path = public
stable
as $$
  select sm.user_id, p.name, sm.lat, sm.lng
  from public.society_memberships sm
  join public.profiles p on p.id = sm.user_id
  where sm.verification_status = 'verified'
    and sm.user_id <> p_user_id
    and sm.neighbourhood_id = (
      select neighbourhood_id from public.society_memberships
      where user_id = p_user_id and verification_status = 'verified'
      limit 1
    )
  order by point(sm.lng, sm.lat) <-> point(p_lng, p_lat)
  limit p_limit;
$$;

grant execute on function public.nearby_verified_neighbours to service_role;
