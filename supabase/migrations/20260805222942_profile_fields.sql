-- Phase 19/20 (implementationplan.md Group B): ProfileSetup fields —
-- name/bio/avatar plus the Vibes picker's selections (min 3, enforced
-- client-side per prototype's MIN_VIBES; a check constraint here backstops
-- that server-side too, since RLS lets a user update their own row directly).
alter table public.profiles
  add column name text,
  add column bio text,
  add column avatar_url text,
  add column vibes text[] not null default '{}',
  add constraint vibes_min_three check (array_length(vibes, 1) is null or array_length(vibes, 1) >= 3);
