-- Phase 35 (implementationplan.md Group D): idempotent "open a DM with X"
-- entry point. If a 1:1 chat between the caller and target already exists,
-- returns it; otherwise creates it + both member rows in one transaction.
--
-- SECURITY DEFINER lets this function do the two-step (chat insert + two
-- member inserts) atomically without needing to run under the caller's RLS
-- for the intermediate state — the client would otherwise briefly own a
-- chat with only themselves as a member, which violates the "DMs have
-- exactly 2 members" invariant if a concurrent open-DM call races.
--
-- Enforces: caller must be authenticated; caller cannot open a DM with
-- themselves; caller and target must share a verified neighbourhood
-- (matches the profiles visibility policy from Group C — you can only
-- start a chat with someone your feed also lets you see).
create function public.get_or_create_dm(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing uuid;
  new_chat_id uuid;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  if me = p_other_user_id then
    raise exception 'cannot_dm_self';
  end if;
  if not public.shares_verified_neighbourhood(p_other_user_id) then
    raise exception 'not_in_your_circle';
  end if;

  -- Find any existing 1:1 chat that has BOTH users and exactly 2 members.
  select c.id into existing
  from public.chats c
  where c.is_group = false
    and (select count(*) from public.chat_members cm where cm.chat_id = c.id) = 2
    and exists (select 1 from public.chat_members cm where cm.chat_id = c.id and cm.user_id = me)
    and exists (select 1 from public.chat_members cm where cm.chat_id = c.id and cm.user_id = p_other_user_id)
  limit 1;

  if existing is not null then
    return existing;
  end if;

  insert into public.chats (is_group, created_by) values (false, me)
    returning id into new_chat_id;
  insert into public.chat_members (chat_id, user_id) values (new_chat_id, me), (new_chat_id, p_other_user_id);
  return new_chat_id;
end;
$$;

grant execute on function public.get_or_create_dm to authenticated;
