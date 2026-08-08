-- Group I (implementationplan.md, phases 81-84): Ads.
--
-- `target` shape: {"mode": "neighbourhoods" | "radius", "neighbourhood_ids":
-- uuid[], "radius_km": number, "vibes": text[]}. Radius mode measures
-- distance from the advertiser's own page location (lat/lng) — no separate
-- "advertiser location" input needed. Concurrent-cap enforcement (§8.7)
-- only applies to 'neighbourhoods' mode (documented simplification below).

create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id),
  objective text not null check (objective in ('awareness', 'traffic', 'engagement')),
  target jsonb not null default '{}',
  headline text not null,
  body text not null,
  image_url text,
  cta_text text not null default 'Learn more',
  budget_total numeric(10, 2) not null check (budget_total > 0),
  budget_spent numeric(10, 2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'active', 'paused', 'rejected', 'completed')),
  created_at timestamptz not null default now()
);

-- edgecase.md §8.4 (🟠): a campaign can only ever reach 'active'/'rejected'
-- via the ad review service (service_role) — never self-service. The
-- advertiser CAN submit for review (draft -> pending_review, or insert
-- directly as pending_review) and pause/resume their own already-approved
-- campaign (active <-> paused) without going through review again, since
-- those don't grant new reach.
--
-- Guards BOTH insert and update: an insert-time-only check would miss the
-- obvious bypass of a client simply INSERTing a row with status='active'
-- directly instead of going through the draft -> pending_review -> active
-- path — the same self-approval hole this trigger exists to close, just
-- reached one step earlier. Caught during development, before this ever
-- shipped, by re-reading the migration rather than by a failing test.
create function public.enforce_ad_campaign_status_transition()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending_review') then
      raise exception 'ad_campaign_status_transition_requires_review'
        using hint = 'New campaigns must start as draft or pending_review.';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status = 'pending_review') or
      (old.status = 'active' and new.status = 'paused') or
      (old.status = 'paused' and new.status = 'active')
    ) then
      raise exception 'ad_campaign_status_transition_requires_review'
        using hint = 'Only the ad review process can approve or reject a campaign.';
    end if;
  end if;
  return new;
end;
$$;

create trigger ad_campaigns_enforce_status_transition
  before insert or update on public.ad_campaigns
  for each row execute function public.enforce_ad_campaign_status_transition();

alter table public.ad_campaigns enable row level security;

create policy ad_campaigns_select_own on public.ad_campaigns
  for select using (public.owns_page(page_id));

create policy ad_campaigns_insert_own on public.ad_campaigns
  for insert with check (public.owns_page(page_id));

create policy ad_campaigns_update_own on public.ad_campaigns
  for update using (public.owns_page(page_id));

grant select, insert, update on public.ad_campaigns to authenticated;
grant select, update on public.ad_campaigns to service_role;

create table public.ad_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'click')),
  user_id uuid references public.profiles(id),
  cost numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ad_events enable row level security;

create policy ad_events_select_via_page_owner on public.ad_events
  for select using (exists (select 1 from public.ad_campaigns c where c.id = campaign_id and public.owns_page(c.page_id)));

grant select on public.ad_events to authenticated;
grant select, insert on public.ad_events to service_role;

-- edgecase.md §8.7 (🟡): cap is scaled by neighbourhood size — smaller
-- societies get fewer total concurrent ad slots, not a flat global ratio.
-- One active campaign per ~50 verified members, minimum 1.
create function public.neighbourhood_ad_cap(p_neighbourhood_id uuid)
returns int
language sql
stable
as $$
  select greatest(1, (count(*) / 50)::int)
  from public.society_memberships
  where neighbourhood_id = p_neighbourhood_id and verification_status = 'verified';
$$;

create function public.count_active_campaigns_for_neighbourhood(p_neighbourhood_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.ad_campaigns
  where status = 'active'
    and target->>'mode' = 'neighbourhoods'
    and target->'neighbourhood_ids' ? p_neighbourhood_id::text;
$$;

-- Fixed platform-wide cost per impression for this mock ad system — a
-- real auction/bidding model is explicitly out of scope per
-- architecture.md §8 ("naive round-robin... needs a real auction/pacing
-- algorithm once advertiser density increases").
create function public.serve_ad_for_user(p_user_id uuid, p_neighbourhood_id uuid)
returns table (campaign_id uuid, headline text, body text, image_url text, cta_text text)
language plpgsql
security definer
-- `extensions` (not just `public`) is required here: this function calls
-- is_within_neighbourhood, which casts to ::geography (postgis lives in
-- the extensions schema per Phase 1) — when inlined into this restricted
-- search_path, the bare `public` scope alone made that type lookup fail.
set search_path = public, extensions
as $$
declare
  cost_per_impression constant numeric(10, 2) := 0.50;
  picked record;
begin
  -- edgecase.md §8.3 (🟡): the budget check happens INSIDE the same
  -- transaction as the spend, under `for update` row lock, so a campaign
  -- can never be served past its budget due to caching/reconciliation lag
  -- — this is the hard serve-time check, not a periodic background job.
  select c.id, c.headline, c.body, c.image_url, c.cta_text
  into picked
  from public.ad_campaigns c
  where c.status = 'active'
    and c.budget_spent < c.budget_total
    and (
      (c.target->>'mode' = 'neighbourhoods' and c.target->'neighbourhood_ids' ? p_neighbourhood_id::text)
      or (
        c.target->>'mode' = 'radius'
        and exists (
          select 1 from public.pages pg
          where pg.id = c.page_id
            and pg.lat is not null and pg.lng is not null
            and public.is_within_neighbourhood(p_neighbourhood_id, pg.lat, pg.lng, (c.target->>'radius_km')::double precision * 1000)
        )
      )
    )
  order by (c.budget_spent / c.budget_total) asc, c.created_at asc
  limit 1
  for update of c;

  if picked.id is null then
    return;
  end if;

  update public.ad_campaigns set budget_spent = budget_spent + cost_per_impression where id = picked.id;
  insert into public.ad_events (campaign_id, event_type, user_id, cost) values (picked.id, 'impression', p_user_id, cost_per_impression);

  return query select picked.id, picked.headline, picked.body, picked.image_url, picked.cta_text;
end;
$$;

grant execute on function public.serve_ad_for_user to authenticated;

create function public.record_ad_click(p_campaign_id uuid, p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ad_events (campaign_id, event_type, user_id, cost) values (p_campaign_id, 'click', p_user_id, 0);
$$;

grant execute on function public.record_ad_click to authenticated;
