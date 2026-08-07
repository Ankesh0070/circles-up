-- Group E (implementationplan.md, phases 42–56): Circle Guard / SOS.
-- Highest-stakes group per edgecase.md §12 — every table here backs a
-- safety-critical flow, so RLS gets the same "prove both directions"
-- treatment as Groups B–D, plus this group's own specific requirement:
-- SOS dispatch data must be auditable (who was notified, when, how) even
-- though the primary users (police/emergency contacts) aren't app users.

-- ---------------------------------------------------------------------------
-- Trusted Contacts (Phase 50)
-- ---------------------------------------------------------------------------
create table public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  relation text,
  created_at timestamptz not null default now(),
  -- edgecase.md §3.7: staleness prompt every ~3 months. Updated by the
  -- client whenever the user re-confirms a contact is still current.
  last_confirmed_at timestamptz not null default now()
);

-- Max 5 trusted contacts per user (architecture.md's TrustedContactsScreen).
create or replace function public.enforce_trusted_contact_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.trusted_contacts where user_id = new.user_id) >= 5 then
    raise exception 'trusted_contact_limit_exceeded' using hint = 'You can save up to 5 trusted contacts.';
  end if;
  return new;
end;
$$;

create trigger trusted_contacts_limit
  before insert on public.trusted_contacts
  for each row execute function public.enforce_trusted_contact_limit();

alter table public.trusted_contacts enable row level security;
create policy trusted_contacts_own on public.trusted_contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.trusted_contacts to authenticated;

-- ---------------------------------------------------------------------------
-- SOS Events + Dispatch Log (Phase 47)
-- ---------------------------------------------------------------------------
create table public.sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  triggered_via text not null default 'button' check (triggered_via in ('button', 'silent_phrase')),
  status text not null default 'active' check (status in ('active', 'resolved', 'cancelled')),
  lat double precision,
  lng double precision,
  accuracy double precision,
  -- edgecase.md §3.8: location may be approximate/unavailable — dispatch
  -- must proceed regardless. NULL lat/lng is valid, not an error state.
  started_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index sos_events_user_idx on public.sos_events (user_id, started_at desc);

alter table public.sos_events enable row level security;
create policy sos_events_own on public.sos_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.sos_events to authenticated;

-- Every dispatch attempt — police/emergency/helpline (client-dialed via
-- native tel:/sms:, self-reported here for the audit trail) and trusted
-- contacts/nearby neighbours (backend-dispatched via the SOS service).
-- edgecase.md §3.9/§3.13 (🔴): this table IS the audit trail proving
-- dispatch was attempted and what happened — required before any claim
-- about SOS reliability can be made, and likely subject to a longer
-- retention policy than ordinary app data (see Phase 56).
create table public.sos_dispatch_log (
  id uuid primary key default gen_random_uuid(),
  sos_event_id uuid not null references public.sos_events(id) on delete cascade,
  channel text not null check (channel in ('police', 'emergency112', 'women_helpline', 'trusted_contact', 'nearby_neighbour')),
  -- SMS/tel channels populate recipient_phone; the in-app neighbour channel
  -- populates recipient_user_id instead — never both.
  recipient_phone text,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  recipient_name text,
  delivery_status text not null check (delivery_status in ('dialed', 'sent', 'failed')),
  delivery_detail text,
  sent_at timestamptz not null default now()
);

create index sos_dispatch_log_event_idx on public.sos_dispatch_log (sos_event_id);
create index sos_dispatch_log_recipient_idx on public.sos_dispatch_log (recipient_user_id);

create function public.owns_sos_event(p_sos_event_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.sos_events where id = p_sos_event_id and user_id = auth.uid());
$$;

alter table public.sos_dispatch_log enable row level security;
-- The event owner sees their own full dispatch log; a nearby neighbour who
-- was alerted sees just the rows naming them (so they know they were
-- notified and why — required for the "am I actually being alerted"
-- trust the whole neighbour-fan-out feature depends on).
create policy sos_dispatch_log_select on public.sos_dispatch_log
  for select using (public.owns_sos_event(sos_event_id) or auth.uid() = recipient_user_id);
-- Client self-reports its own tel:/sms: dial attempts (police/emergency/
-- helpline); the SOS Dispatch backend service uses service_role for the
-- trusted-contact/neighbour rows, bypassing this policy entirely.
create policy sos_dispatch_log_insert_own_event on public.sos_dispatch_log
  for insert with check (public.owns_sos_event(sos_event_id));
grant select, insert on public.sos_dispatch_log to authenticated;

alter publication supabase_realtime add table public.sos_dispatch_log;

-- ---------------------------------------------------------------------------
-- Accidental-Trigger Monitoring (Phase 49)
-- ---------------------------------------------------------------------------
-- edgecase.md §3.3: log every countdown-cancel so repeated false triggers
-- can be detected and a sensitivity-adjustment prompt surfaced — real
-- emergency responders get desensitized by false alarms, so this matters.
create table public.sos_cancels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cancelled_at timestamptz not null default now()
);

alter table public.sos_cancels enable row level security;
create policy sos_cancels_own on public.sos_cancels
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert on public.sos_cancels to authenticated;

-- ---------------------------------------------------------------------------
-- Live Location Sharing (Phase 51)
-- ---------------------------------------------------------------------------
create table public.location_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  -- edgecase.md §3.12 (🟡): hard-enforced auto-stop, not just a UI
  -- suggestion — expires_at is set once at creation from a fixed duration
  -- (15/30/60/120 min) and never extended.
  expires_at timestamptz not null,
  stopped_at timestamptz,
  last_lat double precision,
  last_lng double precision,
  last_updated_at timestamptz
);

create table public.location_share_recipients (
  location_share_id uuid not null references public.location_shares(id) on delete cascade,
  trusted_contact_id uuid not null references public.trusted_contacts(id) on delete cascade,
  primary key (location_share_id, trusted_contact_id)
);

alter table public.location_shares enable row level security;
alter table public.location_share_recipients enable row level security;

create policy location_shares_own on public.location_shares
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.location_shares to authenticated;

create function public.owns_location_share(p_location_share_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.location_shares where id = p_location_share_id and user_id = auth.uid());
$$;

create policy location_share_recipients_own on public.location_share_recipients
  for all using (public.owns_location_share(location_share_id)) with check (public.owns_location_share(location_share_id));
grant select, insert, delete on public.location_share_recipients to authenticated;

-- ---------------------------------------------------------------------------
-- Safety Alerts Feed (Phase 55)
-- ---------------------------------------------------------------------------
create table public.safety_alerts (
  id uuid primary key default gen_random_uuid(),
  neighbourhood_id uuid not null references public.neighbourhoods(id),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  source text not null check (source in ('society', 'police')),
  title text not null,
  body text,
  created_at timestamptz not null default now()
);

alter table public.safety_alerts enable row level security;
create policy safety_alerts_select on public.safety_alerts
  for select using (public.is_verified_in_neighbourhood(neighbourhood_id));
grant select on public.safety_alerts to authenticated;
-- No client insert policy — alerts are society/police-sourced, written by
-- an admin/service_role path (no admin UI built in this group's scope,
-- matching Phase 18's precedent of backend-only moderation tooling).

alter publication supabase_realtime add table public.safety_alerts;
