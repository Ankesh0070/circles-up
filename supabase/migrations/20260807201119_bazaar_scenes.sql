-- Group H (implementationplan.md, phases 70-75): Bazaar & Scenes.
--
-- Both features reuse `is_verified_in_neighbourhood` (Group C) for their
-- select policies rather than inventing a new membership check.

-- ============================================================
-- Bazaar (phases 70-71)
-- ============================================================

create type public.bazaar_category as enum ('furniture', 'electronics', 'books', 'clothing', 'free');
create type public.bazaar_status as enum ('active', 'sold', 'flagged');

create table public.bazaar_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  neighbourhood_id uuid not null references public.neighbourhoods(id),
  category public.bazaar_category not null,
  title text not null,
  description text not null,
  -- null/0 is normal for the 'free' category; not enforced by a check
  -- constraint since a seller could genuinely list a free item under
  -- another category too (e.g. giving away old electronics).
  price numeric(10, 2),
  image_urls text[] not null default '{}',
  status public.bazaar_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bazaar_listings enable row level security;

create policy bazaar_listings_select_same_neighbourhood on public.bazaar_listings
  for select using (public.is_verified_in_neighbourhood(neighbourhood_id));

create policy bazaar_listings_insert_own on public.bazaar_listings
  for insert with check (auth.uid() = seller_id and public.is_verified_in_neighbourhood(neighbourhood_id));

create policy bazaar_listings_update_own on public.bazaar_listings
  for update using (auth.uid() = seller_id);

create policy bazaar_listings_delete_own on public.bazaar_listings
  for delete using (auth.uid() = seller_id);

grant select, insert, update, delete on public.bazaar_listings to authenticated;

-- edgecase.md §6.3 (🔴): prohibited items (weapons/drugs/counterfeit) must
-- be blocked at post-time, not just reportable afterward. This starter
-- list is NOT a substitute for the legal-reviewed banned-items list the
-- Group H Definition of Done calls for — same honest gap as Phase 56's
-- legal review, flagged here rather than silently shipped as if it were
-- final. A real list swaps in via `update`/`insert` on this table, no
-- code change needed.
create table public.bazaar_prohibited_keywords (
  keyword text primary key
);

insert into public.bazaar_prohibited_keywords (keyword) values
  ('gun'), ('pistol'), ('rifle'), ('firearm'), ('ammunition'),
  ('cocaine'), ('heroin'), ('mdma'), ('narcotic'),
  ('counterfeit'), ('fake branded'), ('replica branded');

create function public.check_bazaar_prohibited_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched text;
begin
  select keyword into matched
  from public.bazaar_prohibited_keywords
  where (new.title || ' ' || new.description) ~* ('\m' || keyword || '\M')
  limit 1;

  if matched is not null then
    raise exception 'bazaar_prohibited_item'
      using hint = format('Listings can''t mention "%s" — see Bazaar guidelines.', matched);
  end if;
  return new;
end;
$$;

create trigger bazaar_prohibited_content_check
  before insert or update of title, description on public.bazaar_listings
  for each row execute function public.check_bazaar_prohibited_content();

-- edgecase.md §6.3 also calls for a report flow alongside keyword
-- filtering (for whatever slips through). Reuses the `reports` table
-- (Phase 31, Group C) rather than a parallel bazaar-only table.
alter table public.reports drop constraint reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('post', 'comment', 'user', 'bazaar_listing'));

-- Auto-flag after 2 distinct reporters — high enough to resist a single
-- bad-faith report, low enough to act before many buyers waste time
-- messaging about something already reported.
create function public.check_bazaar_report_threshold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reporter_count int;
begin
  if new.target_type = 'bazaar_listing' then
    select count(distinct reporter_id) into reporter_count
    from public.reports
    where target_type = 'bazaar_listing' and target_id = new.target_id;

    if reporter_count >= 2 then
      update public.bazaar_listings set status = 'flagged' where id = new.target_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger bazaar_report_threshold_check
  after insert on public.reports
  for each row execute function public.check_bazaar_report_threshold();

-- ============================================================
-- Scenes / Events (phases 72-75)
-- ============================================================

create type public.event_privacy as enum ('verified', 'close_friends', 'open');
create type public.rsvp_status as enum ('going', 'maybe', 'waitlisted');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  neighbourhood_id uuid not null references public.neighbourhoods(id),
  title text not null,
  description text not null,
  event_type text not null,
  starts_at timestamptz not null,
  location text not null,
  privacy_tier public.event_privacy not null default 'verified',
  guest_limit int,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

-- edgecase.md §7.2 (🟠) treats the 3 privacy tiers as structurally
-- different reach, not decorative labels: 'verified' = same-neighbourhood
-- verified members (like posts); 'close_friends' = people the host has
-- added via Circle (Group F's `circle_connections` — one-directional, so
-- this checks the host's outgoing connections specifically); 'open' =
-- any verified-somewhere user in the app, deliberately NOT unauthenticated/
-- public. The host always sees their own event regardless of tier.
create function public.is_verified_anywhere()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.society_memberships
    where user_id = auth.uid() and verification_status = 'verified'
  );
$$;

-- SECURITY DEFINER: `circle_connections` has its own RLS (only the ROW
-- OWNER, i.e. the person who added someone, can see that row — see Group
-- F's `circle_connections_own` policy). An inline EXISTS against it from
-- within another table's policy would be evaluated as the *viewer*, not
-- the host, so it would filter out the very row this check needs to see
-- (the host's own "I added them" row) — the same nested-RLS trap
-- documented repeatedly elsewhere in this project.
create function public.is_close_friend_of(p_host_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.circle_connections
    where user_id = p_host_id and connected_user_id = auth.uid()
  );
$$;

create policy events_select_by_privacy on public.events
  for select using (
    auth.uid() = host_id
    or (privacy_tier = 'verified' and public.is_verified_in_neighbourhood(neighbourhood_id))
    or (privacy_tier = 'close_friends' and public.is_close_friend_of(host_id))
    or (privacy_tier = 'open' and public.is_verified_anywhere())
  );

-- edgecase.md §7.2: the *inviter* (host) must be verified regardless of
-- which privacy_tier they pick for guests — 'open' widens who can see the
-- event, never who's allowed to host one.
create policy events_insert_own on public.events
  for insert with check (auth.uid() = host_id and public.is_verified_in_neighbourhood(neighbourhood_id));

create policy events_update_own on public.events
  for update using (auth.uid() = host_id);

grant select, insert, update on public.events to authenticated;

create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.rsvp_status not null default 'going',
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_rsvps enable row level security;

-- SECURITY DEFINER: an RSVP row needs to be visible to the event's host
-- (to see who's coming) as well as to the RSVP'ing user themselves — an
-- inline EXISTS against `events` would hit the same nested-RLS trap
-- documented throughout this project, so it's wrapped the same way
-- `can_view_post` wraps `posts`.
create function public.can_view_event(p_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and (
        auth.uid() = e.host_id
        or (e.privacy_tier = 'verified' and public.is_verified_in_neighbourhood(e.neighbourhood_id))
        or (e.privacy_tier = 'close_friends' and public.is_close_friend_of(e.host_id))
        or (e.privacy_tier = 'open' and public.is_verified_anywhere())
      )
  );
$$;

create policy event_rsvps_select_visible on public.event_rsvps
  for select using (public.can_view_event(event_id));

create policy event_rsvps_insert_own on public.event_rsvps
  for insert with check (auth.uid() = user_id and public.can_view_event(event_id));

create policy event_rsvps_update_own on public.event_rsvps
  for update using (auth.uid() = user_id);

create policy event_rsvps_delete_own on public.event_rsvps
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.event_rsvps to authenticated;

-- edgecase.md §7.1 (🟡): once `guest_limit` is hit, further "going" RSVPs
-- become "waitlisted" rather than silently over-booking or being blocked
-- outright. Runs BEFORE INSERT so it can rewrite NEW.status directly.
create function public.enforce_event_waitlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_count int;
  going_count int;
begin
  if new.status = 'going' then
    select guest_limit into limit_count from public.events where id = new.event_id;
    if limit_count is not null then
      select count(*) into going_count from public.event_rsvps
        where event_id = new.event_id and status = 'going';
      if going_count >= limit_count then
        new.status := 'waitlisted';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger event_waitlist_check
  before insert on public.event_rsvps
  for each row execute function public.enforce_event_waitlist();

-- Generic per-user notification inbox. Phase 93 (Group J) builds the real
-- browsing UI for this; Phase 75 is this table's first writer.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  related_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select using (auth.uid() = user_id);

create policy notifications_update_own on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, update on public.notifications to authenticated;

-- edgecase.md §7.3 (🟡): cancellation must notify every RSVP'd user (going,
-- maybe, AND waitlisted — anyone who RSVP'd made a plan around this
-- event), not just silently disappear. SECURITY DEFINER because inserting
-- a notification row for someone other than the caller would otherwise be
-- blocked by `notifications_select_own`-style ownership (there's no
-- insert policy for authenticated at all — only this function, running as
-- table owner, can write notification rows).
create function public.cancel_event_and_notify(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_title text;
  is_host boolean;
begin
  select (host_id = auth.uid()), title into is_host, event_title
  from public.events where id = p_event_id;

  if not found or not is_host then
    raise exception 'not_event_host';
  end if;

  update public.events set status = 'cancelled', cancelled_at = now() where id = p_event_id;

  insert into public.notifications (user_id, type, title, body, related_id)
  select user_id, 'event_cancelled', 'Event cancelled', event_title || ' has been cancelled by the host.', p_event_id
  from public.event_rsvps
  where event_id = p_event_id and user_id <> auth.uid();
end;
$$;

grant execute on function public.cancel_event_and_notify to authenticated;
