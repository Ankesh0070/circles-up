-- Demo-only shortcut through the address/selfie gate.
--
-- The real gate needs a live camera selfie plus a GPS fix inside the
-- neighbourhood's boundary. On the hosted WEB build that hardware path is
-- unreliable (expo-camera + view-shot on web) and the geofence assumes the
-- person is physically in HSR Layout — so anyone trying the deployed demo
-- signs up and then can't get past onboarding at all.
--
-- This creates a VERIFIED membership using the neighbourhood's own centroid as
-- the location, so the existing "set active neighbourhood on first
-- verification" trigger fires and the feed/create-post context works. It is
-- explicitly a demo bypass: it skips the liveness and geofence checks the real
-- flow enforces, which is why it's SECURITY DEFINER, granted only to
-- service_role, and reached solely through a clearly-labelled "skip for demo"
-- action in the web build. Not a path any normal client can call, and not a
-- substitute for the real verification before a genuine launch.
create or replace function public.demo_complete_verification(
  p_user_id uuid,
  p_neighbourhood_id uuid,
  p_society text,
  p_flat text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_lat double precision;
  v_lng double precision;
begin
  -- Centroid of the neighbourhood boundary — guarantees the recorded location
  -- sits inside the area, consistent with a genuine in-area verification.
  select ST_Y(ST_Centroid(geo_boundary)::geometry),
         ST_X(ST_Centroid(geo_boundary)::geometry)
    into v_lat, v_lng
  from public.neighbourhoods
  where id = p_neighbourhood_id;

  if v_lat is null then
    raise exception 'neighbourhood % not found', p_neighbourhood_id;
  end if;

  -- One membership per user+neighbourhood: reuse an existing row so repeated
  -- demo taps don't stack duplicates.
  select id into v_id
  from public.society_memberships
  where user_id = p_user_id and neighbourhood_id = p_neighbourhood_id
  limit 1;

  if v_id is not null then
    update public.society_memberships
    set society = coalesce(nullif(trim(p_society), ''), society),
        flat = coalesce(nullif(trim(p_flat), ''), flat),
        verification_status = 'verified',
        review_reason = null,
        verified_at = now()
    where id = v_id;
  else
    insert into public.society_memberships (
      user_id, neighbourhood_id, society, flat,
      lat, lng, photo_source, verification_status, verified_at
    )
    values (
      p_user_id, p_neighbourhood_id,
      coalesce(nullif(trim(p_society), ''), 'Demo'),
      coalesce(nullif(trim(p_flat), ''), '1'),
      v_lat, v_lng, 'camera', 'verified', now()
    )
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.demo_complete_verification(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.demo_complete_verification(uuid, uuid, text, text) to service_role;
