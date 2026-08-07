-- Group F (implementationplan.md, phases 57–64): Explore / Discovery.
--
-- Two structural fixes ride along with this migration because they're
-- prerequisites for Phase 59/63 to be correct, not separate features:
--
-- 1. `profiles.active_neighbourhood_id` — edgecase.md §9.1 (🟠): a post (and
--    now the feed/discovery context) must be scoped to ONE explicit
--    neighbourhood based on active context, never an arbitrary
--    `.limit(1)` pick across a user's memberships. CreatePostSheet.tsx
--    currently does exactly that arbitrary pick — Phase 63 fixes the
--    client to read this column instead.
-- 2. `circle_connections` — the "Add to Circle" relationship the prototype's
--    CircleCard implies but no earlier phase created a table for.

alter table public.profiles
  add column active_neighbourhood_id uuid references public.neighbourhoods(id);

-- Auto-set active_neighbourhood_id the first time a user gets verified
-- anywhere, so a fresh signup has a working feed/create-post context
-- without any extra client action. Later verifications (Phase 61 — adding
-- a second neighbourhood) do NOT change this; switching is an explicit
-- user action via NeighbourhoodSheet.
create function public.set_active_neighbourhood_on_first_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status = 'verified' then
    update public.profiles
    set active_neighbourhood_id = new.neighbourhood_id
    where id = new.user_id and active_neighbourhood_id is null;
  end if;
  return new;
end;
$$;

create trigger memberships_set_active_neighbourhood
  after insert or update on public.society_memberships
  for each row execute function public.set_active_neighbourhood_on_first_verification();

-- ---------------------------------------------------------------------------
-- Circle Connections ("Add to Circle")
-- ---------------------------------------------------------------------------
create table public.circle_connections (
  user_id uuid not null references public.profiles(id) on delete cascade,
  connected_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, connected_user_id),
  constraint no_self_connection check (user_id <> connected_user_id)
);

alter table public.circle_connections enable row level security;

-- Same pattern as posts/reactions: you can only add someone you're allowed
-- to see (shares_verified_neighbourhood, from Group C's profiles-visibility
-- fix), and you can only manage your own outgoing connections.
create policy circle_connections_own on public.circle_connections
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.shares_verified_neighbourhood(connected_user_id));

grant select, insert, delete on public.circle_connections to authenticated;

-- Phase 60 (mutual-circle chips): who's in MY circle that's ALSO in
-- target's circle. SECURITY DEFINER so this can read target's connections
-- (which circle_connections_own wouldn't otherwise let me do) without
-- opening broad read access to everyone's connection lists.
create function public.mutual_circle(p_target_user_id uuid)
returns table (user_id uuid, name text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.name
  from public.circle_connections mine
  join public.circle_connections theirs
    on theirs.connected_user_id = mine.connected_user_id
    and theirs.user_id = p_target_user_id
  join public.profiles p on p.id = mine.connected_user_id
  where mine.user_id = auth.uid()
  limit 8;
$$;

grant execute on function public.mutual_circle to authenticated;

-- ---------------------------------------------------------------------------
-- Two-tier discovery (Phase 59)
-- ---------------------------------------------------------------------------
-- "Circle nearby" — verified members of the SAME neighbourhood, ranked by
-- physical distance. SECURITY DEFINER: profiles_select_same_neighbourhood
-- already permits this data for same-neighbourhood members via direct
-- table access, but doing it as an RPC keeps the distance-ranking logic
-- and the block-filtering in one place rather than duplicated per screen.
create function public.discover_circle_nearby(
  p_neighbourhood_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_limit int default 20
)
returns table (user_id uuid, name text, avatar_url text, tower text, flat text, distance_km double precision)
language sql
security definer
set search_path = public
stable
as $$
  select sm.user_id, p.name, p.avatar_url, sm.tower, sm.flat,
    (point(sm.lng, sm.lat) <-> point(p_lng, p_lat)) * 111.0 as distance_km -- ~111km per degree, adequate at neighbourhood scale
  from public.society_memberships sm
  join public.profiles p on p.id = sm.user_id
  where sm.verification_status = 'verified'
    and sm.neighbourhood_id = p_neighbourhood_id
    and sm.user_id <> auth.uid()
    and not public.is_blocked_between(auth.uid(), sm.user_id) -- Phase 62
  order by distance_km
  limit p_limit;
$$;

grant execute on function public.discover_circle_nearby to authenticated;

-- "From your city" — verified members elsewhere in the same city, ranked
-- by shared vibes (interest overlap). Different trust tier from "Circle
-- nearby" (problemstatement.md's "concentric trust radius" — same city,
-- not same verified building), so this deliberately does NOT expose
-- tower/flat, only what a stranger-with-shared-interests should see.
create function public.discover_city_wide(
  p_city text,
  p_exclude_neighbourhood_id uuid,
  p_limit int default 20
)
returns table (user_id uuid, name text, avatar_url text, neighbourhood_name text, vibes text[], shared_vibes_count int)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.name, p.avatar_url, n.name, p.vibes,
    (select count(*)::int from unnest(p.vibes) v where v = any(my.vibes)) as shared_vibes_count
  from public.society_memberships sm
  join public.profiles p on p.id = sm.user_id
  join public.neighbourhoods n on n.id = sm.neighbourhood_id
  cross join (select vibes from public.profiles where id = auth.uid()) my
  where sm.verification_status = 'verified'
    and n.city = p_city
    and sm.neighbourhood_id <> p_exclude_neighbourhood_id
    and sm.user_id <> auth.uid()
    and not public.is_blocked_between(auth.uid(), sm.user_id) -- Phase 62
  order by shared_vibes_count desc, p.name
  limit p_limit;
$$;

grant execute on function public.discover_city_wide to authenticated;
