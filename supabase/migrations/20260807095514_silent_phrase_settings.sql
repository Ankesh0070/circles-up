-- Phase 54: per-user Silent Phrase preference. A small addition to
-- `profiles` rather than a new table — this is a single-row-per-user
-- setting, not something that needs its own relation.
alter table public.profiles
  add column silent_phrase text not null default 'circle up help me',
  add column silent_phrase_enabled boolean not null default false;
