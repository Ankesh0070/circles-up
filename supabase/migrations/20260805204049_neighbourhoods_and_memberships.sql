-- Phases 13/15/17/18 (implementationplan.md Group B): the core identity-
-- verification schema — architecture.md §5's `neighbourhoods` and
-- `society_memberships` tables. Backend services (verification) talk to this
-- using the service_role key, which bypasses RLS entirely — RLS here exists
-- only to protect direct client (anon/authenticated) access.

create table public.neighbourhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  geo_boundary geography(Polygon, 4326) not null
);

alter table public.neighbourhoods enable row level security;
create policy neighbourhoods_select_all on public.neighbourhoods for select using (true);
grant select on public.neighbourhoods to authenticated;

create type public.membership_status as enum ('pending', 'verified', 'rejected');

create table public.society_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  neighbourhood_id uuid not null references public.neighbourhoods(id),
  society text not null,
  tower text,
  flat text not null,
  verification_status public.membership_status not null default 'pending',
  -- Phase 18: why a submission landed in manual review, e.g. 'gps_mocked',
  -- 'liveness_failed', 'gallery_source', 'outside_geofence'.
  review_reason text,
  gate_photo_url text,
  lat double precision not null,
  lng double precision not null,
  gps_accuracy double precision,
  gps_mocked boolean not null default false,
  photo_source text not null default 'camera' check (photo_source in ('camera', 'gallery')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.society_memberships enable row level security;

create policy memberships_select_own on public.society_memberships
  for select using (auth.uid() = user_id);

create policy memberships_insert_own on public.society_memberships
  for insert with check (auth.uid() = user_id);

-- Phase 17 (household model): an existing *verified* member of a flat can
-- see other membership rows (pending or verified) for that same flat — this
-- is what lets the app notify them "someone new claimed your flat".
--
-- This check has to run as a SECURITY DEFINER function rather than an inline
-- subquery on society_memberships itself: an inline subquery against the
-- same RLS-protected table re-triggers this very policy on every row it
-- scans, causing infinite recursion (caught by
-- supabase/tests/society_memberships_rls_test.sql). A SECURITY DEFINER
-- function owned by the migration role (which has BYPASSRLS) sidesteps that.
create function public.is_verified_member_of_flat(p_neighbourhood_id uuid, p_society text, p_tower text, p_flat text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.society_memberships
    where user_id = auth.uid()
      and verification_status = 'verified'
      and neighbourhood_id = p_neighbourhood_id
      and society = p_society
      and coalesce(tower, '') = coalesce(p_tower, '')
      and flat = p_flat
  );
$$;

create policy memberships_select_same_flat on public.society_memberships
  for select using (
    public.is_verified_member_of_flat(neighbourhood_id, society, tower, flat)
  );

grant select, insert on public.society_memberships to authenticated;

-- Seed a real neighbourhood so geofencing (Phase 13/15) is testable against
-- real coordinates — HSR Layout, Bengaluru, matching problemstatement.md's
-- worked example. Rough boundary polygon around the layout.
insert into public.neighbourhoods (name, city, geo_boundary) values (
  'HSR Layout',
  'Bengaluru',
  ST_GeogFromText('POLYGON((
    77.615 12.900,
    77.660 12.900,
    77.660 12.930,
    77.615 12.930,
    77.615 12.900
  ))')
);
