-- Group J (implementationplan.md, phases 85-93): Profile, Settings &
-- Retention.
--
-- Three sub-areas in this one migration: (1) profile fields Edit Profile
-- needs (username/pronouns/link are public — folded into get_public_profile
-- below; phone stays private, deliberately never added to that function's
-- output), (2) a hard-to-fake points ledger for Phase 89 built directly on
-- top of Group H/I's own tables (event check-in, donation success, alert
-- validation) rather than raw counts, and (3) small "first real writer"
-- pieces — saved posts, circle-connection notifications — that Phase 93's
-- Notifications screen needs to have real data to render.

-- ============================================================
-- Profile fields (Phase 86)
-- ============================================================

alter table public.profiles
  add column username text unique,
  add column pronouns text,
  add column link text,
  -- Private: intentionally never surfaced by get_public_profile below.
  -- profiles_select_same_neighbourhood (Group C fix) exposes the whole row
  -- to same-neighbourhood verified members via a direct table select, so
  -- "private" here means "no code path ever selects it for anyone but the
  -- owner" rather than a column-level grant (Postgres RLS has no such
  -- thing) — the discipline is: nothing but `profiles_select_own`-gated
  -- code (Edit Profile, viewing your OWN row) may read this column.
  add column phone text,
  add column notification_prefs jsonb not null default '{"safety": true, "social": true, "community": true}'::jsonb,
  add column deleted_at timestamptz,
  add constraint username_format check (username is null or username ~ '^[a-z0-9_]{3,20}$');

-- Phase 60's get_public_profile needs username/pronouns/link added to its
-- output now that they exist — CREATE OR REPLACE can't change a function's
-- return type, so this drops and recreates it (same body otherwise).
drop function if exists public.get_public_profile(uuid);

create function public.get_public_profile(p_target_user_id uuid)
returns table (
  user_id uuid,
  name text,
  username text,
  pronouns text,
  link text,
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
  select p.id, p.name, p.username, p.pronouns, p.link, p.bio, p.avatar_url, p.vibes, n.name,
    case when sm.neighbourhood_id = my.active_neighbourhood_id then sm.tower else null end,
    case when sm.neighbourhood_id = my.active_neighbourhood_id then sm.flat else null end,
    (sm.neighbourhood_id = my.active_neighbourhood_id)
  from public.profiles p
  join public.society_memberships sm on sm.user_id = p.id and sm.verification_status = 'verified'
  join public.neighbourhoods n on n.id = sm.neighbourhood_id
  cross join (select active_neighbourhood_id from public.profiles where id = auth.uid()) my
  where p.id = p_target_user_id
    and not public.is_blocked_between(auth.uid(), p_target_user_id)
  order by (sm.neighbourhood_id = my.active_neighbourhood_id) desc
  limit 1;
$$;

grant execute on function public.get_public_profile to authenticated;

-- Phase 88 "Delete" — self-service account deletion. Anonymizes the profile
-- row and stamps deleted_at rather than deleting auth.users: this Docker-
-- free local stack's auth shim (and honestly, a real production system too)
-- shouldn't hard-delete an auth identity synchronously from a client-
-- triggered RPC — that's normally a queued/reviewed job. Scoped to auth.uid()
-- only by construction (no target-user parameter), so there's no privilege
-- check to get wrong. `vibes = '{}'` still passes Group B's vibes_min_three
-- check constraint since array_length of an empty array is NULL, not 0.
create function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set
    name = 'Deleted user',
    username = null,
    pronouns = null,
    link = null,
    bio = null,
    phone = null,
    avatar_url = null,
    vibes = '{}',
    deleted_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.request_account_deletion to authenticated;

-- ============================================================
-- Saved posts (Phase 88 "Saved")
-- ============================================================

create table public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.saved_posts enable row level security;

create policy saved_posts_own on public.saved_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id and public.can_view_post(post_id));

grant select, insert, delete on public.saved_posts to authenticated;

-- ============================================================
-- Event check-in (Phase 89's "actually attended" signal)
-- ============================================================

alter table public.event_rsvps add column checked_in_at timestamptz;

-- Only the host can check someone in, and only once the event has actually
-- started — this is the hard-to-fake signal edgecase.md §10.1 asks for
-- ("RSVP'd events actually attended if checked in") instead of trusting a
-- raw "going" RSVP, which costs nothing to fake.
create function public.check_in_attendee(p_event_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_host boolean;
  event_starts_at timestamptz;
  attendee_status public.rsvp_status;
  already_checked_in boolean;
begin
  select (host_id = auth.uid()), starts_at into is_host, event_starts_at
  from public.events where id = p_event_id;

  if not found or not is_host then
    raise exception 'not_event_host';
  end if;

  if now() < event_starts_at then
    raise exception 'event_not_started';
  end if;

  select status, (checked_in_at is not null) into attendee_status, already_checked_in
  from public.event_rsvps where event_id = p_event_id and user_id = p_user_id;

  if not found or attendee_status <> 'going' then
    raise exception 'attendee_not_going';
  end if;

  if already_checked_in then
    return;
  end if;

  update public.event_rsvps set checked_in_at = now()
  where event_id = p_event_id and user_id = p_user_id;

  insert into public.point_events (user_id, source, points, related_id)
  values (p_user_id, 'event_attended', 15, p_event_id);

  insert into public.notifications (user_id, type, title, body, related_id)
  values (p_user_id, 'points_awarded', 'Checked in!', 'You earned 15 points for attending an event.', p_event_id);
end;
$$;

-- ============================================================
-- Alert validation (Phase 89 / edgecase.md §10.2 — "Safety Star" must
-- require a validation signal, not raw alert-post count)
-- ============================================================

alter table public.posts add column safety_validated boolean not null default false;

create table public.post_alert_confirmations (
  post_id uuid not null references public.posts(id) on delete cascade,
  confirmer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, confirmer_id)
);

alter table public.post_alert_confirmations enable row level security;

create policy post_alert_confirmations_select on public.post_alert_confirmations
  for select using (public.can_view_post(post_id));

-- Must be a real 'alert'-category post, and never the post's own author —
-- otherwise a single user could "validate" their own fake alert.
create function public.check_alert_confirmation_eligible()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_category text;
  post_author uuid;
begin
  select category, author_id into post_category, post_author
  from public.posts where id = new.post_id;

  if post_category is distinct from 'alert' then
    raise exception 'not_an_alert_post';
  end if;
  if post_author = new.confirmer_id then
    raise exception 'cannot_confirm_own_alert';
  end if;
  return new;
end;
$$;

create trigger post_alert_confirmations_check_eligible
  before insert on public.post_alert_confirmations
  for each row execute function public.check_alert_confirmation_eligible();

create policy post_alert_confirmations_insert on public.post_alert_confirmations
  for insert with check (auth.uid() = confirmer_id and public.can_view_post(post_id));

grant select, insert on public.post_alert_confirmations to authenticated;

-- Auto-flag threshold mirrors Group H's check_bazaar_report_threshold
-- pattern (>=2 distinct confirmers) — high enough that the primary key on
-- (post_id, confirmer_id) makes it impossible for one account to reach
-- alone, low enough to award promptly once real neighbours agree.
create function public.check_alert_validation_threshold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  confirmer_count int;
  post_author uuid;
  is_validated boolean;
begin
  select author_id, safety_validated into post_author, is_validated
  from public.posts where id = new.post_id;

  if is_validated then
    return new;
  end if;

  select count(*) into confirmer_count
  from public.post_alert_confirmations where post_id = new.post_id;

  if confirmer_count >= 2 then
    update public.posts set safety_validated = true where id = new.post_id;

    insert into public.point_events (user_id, source, points, related_id)
    values (post_author, 'safety_alert_validated', 20, new.post_id);

    insert into public.notifications (user_id, type, title, body, related_id)
    values (post_author, 'points_awarded', 'Alert confirmed', 'Neighbours confirmed your safety alert as accurate. +20 points.', new.post_id);
  end if;
  return new;
end;
$$;

create trigger post_alert_confirmations_threshold_check
  after insert on public.post_alert_confirmations
  for each row execute function public.check_alert_validation_threshold();

-- ============================================================
-- Points ledger + donation trigger (Phase 89)
-- ============================================================

-- Append-only. edgecase.md §10.1 (🟡): "weight achievement triggers toward
-- harder-to-fake signals... rather than raw post/comment counts" — enforced
-- structurally here, not just by convention: there is NO insert/update/
-- delete policy for `authenticated` at all, so every row can only come from
-- one of the three SECURITY DEFINER triggers/functions above and below,
-- each gated on a real external event (a service-role-confirmed payment,
-- the event HOST's own check-in action, or 2+ distinct neighbours
-- validating an alert) — never a client's own say-so.
create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('donation_completed', 'event_attended', 'safety_alert_validated')),
  points int not null check (points > 0),
  related_id uuid,
  created_at timestamptz not null default now()
);

alter table public.point_events enable row level security;

create policy point_events_select_own on public.point_events
  for select using (auth.uid() = user_id);

grant select on public.point_events to authenticated;

create function public.award_donation_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status = 'succeeded' and old.payment_status is distinct from 'succeeded' then
    insert into public.point_events (user_id, source, points, related_id)
    values (new.donor_id, 'donation_completed', 10, new.id);

    insert into public.notifications (user_id, type, title, body, related_id)
    values (new.donor_id, 'points_awarded', 'Thanks for donating', 'You earned 10 points for a completed donation.', new.id);
  end if;
  return new;
end;
$$;

create trigger donations_award_points
  after update of payment_status on public.donations
  for each row execute function public.award_donation_points();

-- ============================================================
-- Achievements (Phase 89) — points, badges, city rank
-- ============================================================

-- edgecase.md §10.2 (🟠): deliberately does NOT return a named leaderboard
-- of other users — "a public city-wide leaderboard incentivizes posting
-- behaviour that doesn't match community-safety intent". Only a rank NUMBER
-- ("#4 in Bengaluru") and an anonymous member count are exposed; no other
-- user's identity or point total is ever returned by this function.
create function public.get_achievements()
returns table (
  total_points bigint,
  donations_count bigint,
  events_attended_count bigint,
  validated_alerts_count bigint,
  city_rank bigint,
  city_member_count bigint,
  safety_star boolean,
  helping_hand boolean,
  scene_regular boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with my_city as (
    select n.city
    from public.profiles p
    join public.society_memberships sm
      on sm.user_id = p.id and sm.verification_status = 'verified' and sm.neighbourhood_id = p.active_neighbourhood_id
    join public.neighbourhoods n on n.id = sm.neighbourhood_id
    where p.id = auth.uid()
    limit 1
  ),
  city_users as (
    select distinct p.id as user_id
    from public.profiles p
    join public.society_memberships sm on sm.user_id = p.id and sm.verification_status = 'verified'
    join public.neighbourhoods n on n.id = sm.neighbourhood_id
    where n.city = (select city from my_city)
  ),
  point_totals as (
    select user_id, sum(points) as total from public.point_events group by user_id
  ),
  ranked as (
    select cu.user_id,
      coalesce(pt.total, 0) as total,
      rank() over (order by coalesce(pt.total, 0) desc) as rnk,
      count(*) over () as member_count
    from city_users cu
    left join point_totals pt on pt.user_id = cu.user_id
  ),
  mine as (
    select
      coalesce(sum(points), 0) as total_points,
      count(*) filter (where source = 'donation_completed') as donations_count,
      count(*) filter (where source = 'event_attended') as events_attended_count,
      count(*) filter (where source = 'safety_alert_validated') as validated_alerts_count
    from public.point_events where user_id = auth.uid()
  )
  select
    mine.total_points,
    mine.donations_count,
    mine.events_attended_count,
    mine.validated_alerts_count,
    coalesce((select rnk from ranked where user_id = auth.uid()), 1)::bigint,
    coalesce((select member_count from ranked limit 1), 1)::bigint,
    mine.validated_alerts_count >= 3,
    mine.donations_count >= 3,
    mine.events_attended_count >= 5
  from mine;
$$;

grant execute on function public.get_achievements to authenticated;

-- ============================================================
-- Circle-connection notifications (Phase 93's "+ Circle back")
-- ============================================================

-- SECURITY DEFINER: writing a notification row for someone OTHER than the
-- inserter needs to bypass notifications_select_own-style ownership, same
-- justification as Group H's cancel_event_and_notify. related_id carries
-- the ADDER's user_id so the Notifications screen's "+ Circle back" button
-- knows who to connect back to.
create function public.notify_circle_connection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  adder_name text;
begin
  select name into adder_name from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, type, title, body, related_id)
  values (new.connected_user_id, 'circle_connection', 'New Circle connection', coalesce(adder_name, 'Someone') || ' added you to their Circle.', new.user_id);
  return new;
end;
$$;

create trigger circle_connections_notify
  after insert on public.circle_connections
  for each row execute function public.notify_circle_connection();
