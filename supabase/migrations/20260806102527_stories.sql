-- Phase 24/25 (implementationplan.md Group C): Stories.
--
-- `is_verified_in_neighbourhood` is a reusable SECURITY DEFINER helper (same
-- pattern/reason as `is_verified_member_of_flat` from Group B — a subquery
-- against an RLS-protected table needs to bypass RLS internally to avoid
-- recursion). Every future per-neighbourhood table in Group C (posts,
-- reactions, comments) reuses this instead of repeating the subquery.
create function public.is_verified_in_neighbourhood(p_neighbourhood_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.society_memberships
    where user_id = auth.uid()
      and neighbourhood_id = p_neighbourhood_id
      and verification_status = 'verified'
  );
$$;

-- author_id references public.profiles (not auth.users directly) so
-- PostgREST can auto-embed author name/avatar in one query
-- (`stories.select('*, author:profiles(name, avatar_url)')`) — every
-- author-type column in Group C's new tables follows this same pattern.
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  neighbourhood_id uuid not null references public.neighbourhoods(id),
  media_url text not null,
  caption text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

alter table public.stories enable row level security;

create policy stories_select_same_neighbourhood on public.stories
  for select using (public.is_verified_in_neighbourhood(neighbourhood_id) and expires_at > now());

create policy stories_insert_own on public.stories
  for insert with check (auth.uid() = author_id and public.is_verified_in_neighbourhood(neighbourhood_id));

grant select, insert on public.stories to authenticated;

create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

alter table public.story_views enable row level security;

create policy story_views_own on public.story_views
  for all using (auth.uid() = viewer_id) with check (auth.uid() = viewer_id);

grant select, insert on public.story_views to authenticated;
