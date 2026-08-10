-- Lets a neighbourhood be created from a point, so the app works outside the
-- handful of places someone thought to seed.
--
-- Until now `neighbourhoods` was read-only to clients and shipped with a
-- single row (HSR Layout), which quietly made the whole app single-city:
-- anyone elsewhere searched, found nothing, and had no way forward — the
-- address gate is mandatory, so they could create an account but never enter.
--
-- The boundary is a circle around the caller's own GPS fix rather than a real
-- surveyed outline, because there is no boundary source to draw from here.
-- That is a deliberate approximation, and it does mean the person who creates
-- a neighbourhood is trivially inside it — their geofence check can't fail.
-- The check keeps its teeth for everyone who joins afterwards, which is where
-- it actually matters: a stranger claiming to live there still has to be
-- physically within the circle. Worth replacing with real boundary data
-- (or admin-curated areas) before this is a real launch.
--
-- SECURITY DEFINER + execute granted only to service_role: creation goes
-- through the backend, never straight from a client, so the RLS on
-- `neighbourhoods` (select-only for authenticated) stays as it was.
create or replace function public.create_neighbourhood_at(
  p_name text,
  p_city text,
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision default 1000
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_point geography;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_city), '') = '' then
    raise exception 'name and city are required';
  end if;

  v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;

  -- Two people in the same area adding "Koramangala" should land in the SAME
  -- neighbourhood, not two disconnected copies that split the feed in half.
  -- Same name within the radius counts as the same place.
  select id into v_id
  from public.neighbourhoods
  where lower(name) = lower(trim(p_name))
    and ST_DWithin(geo_boundary, v_point, p_radius_m)
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.neighbourhoods (name, city, geo_boundary)
  values (
    trim(p_name),
    trim(p_city),
    ST_Buffer(v_point, p_radius_m)::geography(Polygon, 4326)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_neighbourhood_at(text, text, double precision, double precision, double precision) from public, anon, authenticated;
grant execute on function public.create_neighbourhood_at(text, text, double precision, double precision, double precision) to service_role;
