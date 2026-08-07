-- Phase 13/15 (implementationplan.md Group B): geofence check used by the
-- Verification Orchestrator service. Tolerance defaults to 500m around the
-- neighbourhood boundary polygon — edgecase.md §1.1 flags that an exact
-- boundary match is too strict (verifying from a nearby office/gate should
-- still pass), while an unbounded tolerance would defeat the point.
create function public.is_within_neighbourhood(
  p_neighbourhood_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_tolerance_m double precision default 500
)
returns boolean
language sql
stable
as $$
  select ST_DWithin(
    geo_boundary,
    ST_MakePoint(p_lng, p_lat)::geography,
    p_tolerance_m
  )
  from public.neighbourhoods
  where id = p_neighbourhood_id;
$$;

grant execute on function public.is_within_neighbourhood to service_role;
