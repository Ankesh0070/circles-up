-- Phase 31 (implementationplan.md Group C): Report/Mute/Hide moderation.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'user')),
  target_id uuid not null,
  reason text not null,
  -- edgecase.md §2.3 (🔴): doxxing/harassment reports need a fast-track
  -- path distinct from general moderation — this flag is what a real
  -- moderation queue would filter/prioritize on. No queue UI built in
  -- Group C scope (that's an internal-tool concern like Phase 18's review
  -- queue); this just ensures the signal is captured at report time.
  is_doxxing boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy reports_insert_own on public.reports
  for insert with check (auth.uid() = reporter_id);

create policy reports_select_own on public.reports
  for select using (auth.uid() = reporter_id);

grant select, insert on public.reports to authenticated;

create table public.hidden_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.hidden_posts enable row level security;

create policy hidden_posts_own on public.hidden_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, delete on public.hidden_posts to authenticated;

create table public.muted_users (
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_user_id)
);

alter table public.muted_users enable row level security;

create policy muted_users_own on public.muted_users
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, delete on public.muted_users to authenticated;

-- Phase 32: Alert-category rate limiting (edgecase.md §2.1) — max 3 Alert
-- posts per author per rolling 24h. SECURITY DEFINER so the trigger's own
-- count query isn't gated by posts' RLS (it needs to see ALL of this
-- author's alert posts to count them, not just neighbourhood-visible ones —
-- though for this author they're the same neighbourhood anyway, using
-- DEFINER avoids relying on that coincidence).
create function public.enforce_alert_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  if new.category = 'alert' then
    select count(*) into recent_count
    from public.posts
    where author_id = new.author_id
      and category = 'alert'
      and created_at > now() - interval '24 hours';
    if recent_count >= 3 then
      raise exception 'alert_rate_limit_exceeded'
        using hint = 'You can post up to 3 Alert posts per 24 hours.';
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_alert_rate_limit
  before insert on public.posts
  for each row execute function public.enforce_alert_rate_limit();

-- Phase 32: new-account flagging needs no schema change — profiles.created_at
-- (from Group B) is what PostCard/HomeFeed compare against "< 7 days ago" to
-- show a "new neighbour" badge on Alert posts (edgecase.md §2.2).
