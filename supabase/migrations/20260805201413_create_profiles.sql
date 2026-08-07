-- Phase 10/11 (implementationplan.md Group B): minimal profiles table.
--
-- Needed now (not deferred to Phase 13/19) because RootNavigator must
-- distinguish "no session" from "session but hasn't finished the
-- verification gauntlet" — per architecture.md's routing note: signup runs
-- the full Address→ProfileSetup gauntlet, login (a returning, already-
-- onboarded user) drops straight into Main. Without this table every signed-
-- in user looks the same and RootNavigator can't tell them apart.
--
-- Phase 13 extends this with society_memberships; Phase 19 adds
-- name/bio/avatar_url here via ProfileSetup.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user may only ever read/update their own profile row.
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

grant select, update on public.profiles to authenticated;

-- Auto-create a profile row the moment a new auth.users row appears, so the
-- client never has to (and never could, under RLS) insert its own profile row.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
