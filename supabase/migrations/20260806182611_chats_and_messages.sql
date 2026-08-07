-- Phases 34–37, 40 (implementationplan.md Group D): chats, chat_members,
-- messages, dm_blocks.
--
-- SECURITY DEFINER helpers follow the pattern already established in Groups
-- B & C (is_verified_member_of_flat, is_verified_in_neighbourhood,
-- can_view_post) — every "is this row visible to me" check that touches an
-- RLS-protected table needs to bypass RLS internally to avoid recursion or
-- nested-block issues. Building them in from the start this time.

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  -- Group chats have a name/emoji; DMs derive display from the other member.
  name text,
  emoji text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create table public.chat_members (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_admin boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

create index chat_members_user_idx on public.chat_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  -- Phase 36 = 'text'; Phase 37 adds 'image' and 'voice'.
  kind text not null default 'text' check (kind in ('text', 'image', 'voice')),
  text text, -- text-kind: the message body
  media_url text, -- image/voice-kind: the storage URL
  media_duration_ms int, -- voice-kind: playback length hint
  created_at timestamptz not null default now()
);

create index messages_chat_created_idx on public.messages (chat_id, created_at desc);

-- Phase 40: DM blocks. Modeled as one row per blocker→blocked direction so
-- SECURITY DEFINER helpers can do fast either-way lookups without an OR.
create table public.dm_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- Phase 40: report a chat message. Separate from `reports` (Group C's post
-- reports) so DM report reasons can diverge — same edgecase §2.3 spirit
-- (fast-track certain categories), different context (DM harassment vs
-- public feed abuse).
create table public.dm_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  reason text not null,
  is_harassment boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER helpers
-- ---------------------------------------------------------------------------

create function public.is_chat_member(p_chat_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.chat_members
    where chat_id = p_chat_id and user_id = auth.uid()
  );
$$;

-- edgecase §5.3: block must be bidirectionally invisible. If A blocks B, B
-- also stops seeing A — otherwise B could still infer "A blocked me" from
-- the asymmetry. Returns true if EITHER direction of block exists.
create function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.dm_blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.dm_blocks enable row level security;
alter table public.dm_reports enable row level security;

-- Chats: visible if you're a member.
create policy chats_select_member on public.chats
  for select using (public.is_chat_member(id));
-- Creator inserts the chat, then adds themselves as a member in the same
-- transaction (client is expected to do both).
create policy chats_insert_own on public.chats
  for insert with check (auth.uid() = created_by);

-- chat_members visible to any member of the same chat (so the client can
-- see who else is in a group). Insert-own = you can add yourself when you
-- create a chat, or (for DMs) add the other party in the same flow. Real
-- group-invite flows would need a stricter policy — noted for later.
create policy chat_members_select on public.chat_members
  for select using (public.is_chat_member(chat_id));
create policy chat_members_insert on public.chat_members
  for insert with check (auth.uid() = user_id or public.is_chat_member(chat_id));
create policy chat_members_delete_own on public.chat_members
  for delete using (auth.uid() = user_id);

-- Messages: visible to members of the chat, unless the author has a
-- bidirectional block with the viewer. For groups, block hides individual
-- authors' messages from the blocker (and vice versa); for DMs it
-- effectively hides the whole thread.
create policy messages_select on public.messages
  for select using (
    public.is_chat_member(chat_id)
    and not public.is_blocked_between(auth.uid(), author_id)
  );
create policy messages_insert on public.messages
  for insert with check (
    auth.uid() = author_id and public.is_chat_member(chat_id)
  );

-- dm_blocks: fully client-owned by the blocker.
create policy dm_blocks_own on public.dm_blocks
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

create policy dm_reports_insert_own on public.dm_reports
  for insert with check (auth.uid() = reporter_id);
create policy dm_reports_select_own on public.dm_reports
  for select using (auth.uid() = reporter_id);

grant select, insert on public.chats to authenticated;
grant select, insert, delete on public.chat_members to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, delete, update on public.dm_blocks to authenticated; -- update needed for upsert
grant select, insert on public.dm_reports to authenticated;

-- Realtime for the messages table so Phase 36's chat detail screen can
-- subscribe to new messages instead of polling.
alter publication supabase_realtime add table public.messages;
