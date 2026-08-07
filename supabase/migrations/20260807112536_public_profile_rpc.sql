-- Phase 60: UserProfileScreen needs to work for BOTH discovery tiers.
-- "Circle nearby" profiles are directly readable via
-- profiles_select_same_neighbourhood (Group C), but "From your city"
-- profiles are NOT — that policy requires a SHARED verified neighbourhood,
-- which by definition doesn't hold for the city-wide tier (that's the
-- whole point of it being a wider, lower-trust radius). A screen that did
-- a plain `.from('profiles').select()` would silently return nothing for
-- city-wide people. This RPC is the consistent path for both cases.
--
-- Also enforces the block list here (edgecase.md §9.2/Phase 62) — viewing
-- a blocked user's profile page should fail the same way discovery already
-- does, not leave a gap where profiles are reachable by direct link even
-- though they're filtered out of every list.
create function public.get_public_profile(p_target_user_id uuid)
returns table (
  user_id uuid,
  name text,
  bio text,
  avatar_url text,
  vibes text[],
  neighbourhood_name text,
  tower text,
  flat text,
  is_same_neighbourhood boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.name, p.bio, p.avatar_url, p.vibes, n.name,
    case when sm.neighbourhood_id = my.active_neighbourhood_id then sm.tower else null end,
    case when sm.neighbourhood_id = my.active_neighbourhood_id then sm.flat else null end,
    (sm.neighbourhood_id = my.active_neighbourhood_id)
  from public.profiles p
  join public.society_memberships sm on sm.user_id = p.id and sm.verification_status = 'verified'
  join public.neighbourhoods n on n.id = sm.neighbourhood_id
  cross join (select active_neighbourhood_id from public.profiles where id = auth.uid()) my
  where p.id = p_target_user_id
    and not public.is_blocked_between(auth.uid(), p_target_user_id)
  order by (sm.neighbourhood_id = my.active_neighbourhood_id) desc -- prefer the shared-neighbourhood row when one exists
  limit 1;
$$;

grant execute on function public.get_public_profile to authenticated;
