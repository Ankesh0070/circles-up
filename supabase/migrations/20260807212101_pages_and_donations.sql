-- Group I (implementationplan.md, phases 76-80): Pages + NGO donations.
--
-- Reuses `is_within_neighbourhood` (Group B) for page address geocoding
-- (edgecase.md §8.5) and `is_verified_anywhere`/`owns_page`-style helpers
-- (Group H's pattern) for cross-table RLS checks.

create type public.page_type as enum ('personal', 'business', 'ngo');

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  neighbourhood_id uuid not null references public.neighbourhoods(id),
  page_type public.page_type not null,
  name text not null,
  bio text,
  avatar_url text,
  -- Type-specific compliance fields (edgecase.md §8.1 🟠): all
  -- self-declared, never verified against a government registry in this
  -- build — the UI must label them "self-declared, verification pending",
  -- not government-verified. No format check beyond non-empty is enforced
  -- here on purpose: a real GSTIN/Darpan-ID format+registry check is a
  -- compliance-integration decision explicitly deferred, same as
  -- architecture.md §9's open decision on this.
  profession text,
  gst_number text,
  darpan_id text,
  address text,
  lat double precision,
  lng double precision,
  -- edgecase.md §8.5: a claimed address gets the same geocoding check as
  -- user addresses (Phase 15/16's is_within_neighbourhood), soft (flagged,
  -- not blocking) rather than a hard gate — a business page isn't a safety
  -- feature the way resident verification is.
  geocode_status text not null default 'unvalidated' check (geocode_status in ('unvalidated', 'validated', 'mismatch')),
  -- edgecase.md §8.2 (🔴): defaults to 'pending' for ngo pages at insert
  -- time (via trigger below, not client-settable) and can only ever be
  -- flipped to 'approved'/'rejected' by the review service (service_role) —
  -- see prevent_page_status_self_edit below. No self-service enablement.
  ngo_approval_status text not null default 'not_applicable' check (ngo_approval_status in ('not_applicable', 'pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create function public.compute_geocode_status(p_neighbourhood_id uuid, p_lat double precision, p_lng double precision)
returns text
language sql
stable
as $$
  select case
    when p_lat is null or p_lng is null then 'unvalidated'
    -- Wider tolerance than resident verification's 500m (geofence_check_
    -- function.sql) — a business/NGO's registered address plausibly sits
    -- anywhere within the neighbourhood's commercial radius, not just
    -- inside one specific residential polygon.
    when public.is_within_neighbourhood(p_neighbourhood_id, p_lat, p_lng, 2000) then 'validated'
    else 'mismatch'
  end;
$$;

create function public.set_page_compliance_defaults()
returns trigger
language plpgsql
as $$
begin
  new.ngo_approval_status := case when new.page_type = 'ngo' then 'pending' else 'not_applicable' end;
  new.geocode_status := public.compute_geocode_status(new.neighbourhood_id, new.lat, new.lng);
  return new;
end;
$$;

create trigger pages_set_compliance_defaults
  before insert on public.pages
  for each row execute function public.set_page_compliance_defaults();

-- edgecase.md §8.2: only the review service (running as service_role, via
-- services/compliance's NGO review endpoints) may change ngo_approval_status
-- — a page owner updating their own bio/avatar must never be able to also
-- slip an 'approved' through in the same request. Also keeps geocode_status
-- in sync if the owner edits their address later.
create function public.prevent_page_status_self_edit()
returns trigger
language plpgsql
as $$
begin
  if new.ngo_approval_status is distinct from old.ngo_approval_status and auth.role() <> 'service_role' then
    raise exception 'cannot_self_approve_ngo_status'
      using hint = 'NGO approval status can only be changed by the review process.';
  end if;
  if new.lat is distinct from old.lat or new.lng is distinct from old.lng or new.neighbourhood_id is distinct from old.neighbourhood_id then
    new.geocode_status := public.compute_geocode_status(new.neighbourhood_id, new.lat, new.lng);
  end if;
  return new;
end;
$$;

create trigger pages_prevent_status_self_edit
  before update on public.pages
  for each row execute function public.prevent_page_status_self_edit();

alter table public.pages enable row level security;

-- Business/NGO pages are discoverable app-wide once verified-anywhere
-- (they're meant to be found, e.g. for donations from outside the
-- immediate neighbourhood); personal pages stay neighbourhood-scoped like
-- everything else in Group C/D. `is_verified_anywhere` is Group H's
-- helper, reused as-is.
create policy pages_select_visibility on public.pages
  for select using (
    auth.uid() = owner_id
    or (page_type in ('business', 'ngo') and public.is_verified_anywhere())
    or (page_type = 'personal' and public.is_verified_in_neighbourhood(neighbourhood_id))
  );

create policy pages_insert_own on public.pages
  for insert with check (auth.uid() = owner_id and public.is_verified_in_neighbourhood(neighbourhood_id));

create policy pages_update_own on public.pages
  for update using (auth.uid() = owner_id);

grant select, insert, update on public.pages to authenticated;
grant select, update on public.pages to service_role;

-- SECURITY DEFINER: reused by donations' visibility policy and (in the
-- ads migration) ad_campaigns' ownership checks — same nested-RLS-avoidance
-- pattern as can_view_post/can_view_event.
create function public.owns_page(p_page_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.pages where id = p_page_id and owner_id = auth.uid());
$$;

-- ============================================================
-- Donations (phases 79-80)
-- ============================================================

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  ngo_page_id uuid not null references public.pages(id),
  donor_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  razorpay_order_id text,
  razorpay_payment_id text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'succeeded', 'failed')),
  -- edgecase.md §8.6 (🟠): receipt generation is decoupled from payment
  -- success and independently retryable — see services/compliance's
  -- receipts module. receipt_attempts lets the reconcile job distinguish
  -- "never tried" from "tried and failed N times".
  receipt_status text not null default 'pending' check (receipt_status in ('pending', 'generated', 'failed')),
  receipt_url text,
  receipt_attempts int not null default 0,
  created_at timestamptz not null default now()
);

-- edgecase.md §8.2 (🔴): the core requirement — a donation can never be
-- created against an NGO page that isn't page_type='ngo' AND
-- ngo_approval_status='approved'. Enforced here, not just in app code,
-- because this is the one check that must never be bypassable by a client
-- that skips a "can this NGO accept donations" UI check.
create function public.enforce_ngo_approved_for_donation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  page_type_val public.page_type;
  approval_val text;
begin
  select page_type, ngo_approval_status into page_type_val, approval_val
  from public.pages where id = new.ngo_page_id;

  if page_type_val is distinct from 'ngo' or approval_val is distinct from 'approved' then
    raise exception 'ngo_not_approved_for_donations'
      using hint = 'This NGO page has not been approved to accept donations yet.';
  end if;
  return new;
end;
$$;

create trigger donations_enforce_ngo_approved
  before insert on public.donations
  for each row execute function public.enforce_ngo_approved_for_donation();

alter table public.donations enable row level security;

create policy donations_select_own_or_ngo_owner on public.donations
  for select using (auth.uid() = donor_id or public.owns_page(ngo_page_id));

create policy donations_insert_own on public.donations
  for insert with check (auth.uid() = donor_id);

grant select, insert on public.donations to authenticated;
grant select, insert, update on public.donations to service_role;
