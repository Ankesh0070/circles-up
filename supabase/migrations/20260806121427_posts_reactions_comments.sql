-- Phases 26–30 (implementationplan.md Group C): posts, five-finger
-- reactions, comments, comment likes.
--
-- `can_view_post` follows the same SECURITY DEFINER pattern established for
-- stories/profiles — reactions/comments need to check "can this user see the
-- post this row belongs to", and an inline EXISTS against RLS-protected
-- `posts` would hit the same nested-RLS trap already found and fixed twice
-- this session. Building it in from the start this time instead of
-- discovering it via a failing test again.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  neighbourhood_id uuid not null references public.neighbourhoods(id),
  category text not null check (category in ('alert', 'buy_sell', 'recommend', 'event', 'lost_found', 'general')),
  caption text not null,
  media_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy posts_select_same_neighbourhood on public.posts
  for select using (public.is_verified_in_neighbourhood(neighbourhood_id));

create policy posts_insert_own on public.posts
  for insert with check (auth.uid() = author_id and public.is_verified_in_neighbourhood(neighbourhood_id));

grant select, insert on public.posts to authenticated;

create function public.can_view_post(p_post_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_verified_in_neighbourhood(neighbourhood_id) from public.posts where id = p_post_id;
$$;

-- Five-finger reactions (architecture.md §2 REACTIONS: like/notice/diss/engaged/out).
create type public.reaction_type as enum ('like', 'notice', 'diss', 'engaged', 'out');

create table public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.reaction_type not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.reactions enable row level security;

create policy reactions_select on public.reactions
  for select using (public.can_view_post(post_id));

-- One row per (post, user) — reacting again with a different type just
-- upserts over the previous reaction, matching a typical "one reaction per
-- person" model. `for all` covers insert/update/delete for own rows.
create policy reactions_own on public.reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id and public.can_view_post(post_id));

grant select, insert, update, delete on public.reactions to authenticated;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy comments_select on public.comments
  for select using (public.can_view_post(post_id));

create policy comments_insert_own on public.comments
  for insert with check (auth.uid() = author_id and public.can_view_post(post_id));

grant select, insert on public.comments to authenticated;

create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_likes enable row level security;

create function public.can_view_comment(p_comment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.can_view_post(post_id) from public.comments where id = p_comment_id;
$$;

create policy comment_likes_select on public.comment_likes
  for select using (public.can_view_comment(comment_id));

create policy comment_likes_own on public.comment_likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id and public.can_view_comment(comment_id));

grant select, insert, delete on public.comment_likes to authenticated;
