-- Phase 41 (edgecase.md §5.2): flag group members whose verification has
-- lapsed. Modeled as a SECURITY DEFINER function returning "for this group,
-- which of your fellow members no longer has any verified neighbourhood
-- membership"; group admins call this to see who to review/remove. Not a
-- push notification (out of scope — no push infra yet), but the data
-- signal is captured so a real notification job can consume it later.
--
-- The join walks: chat_members (of the given group) → each member's
-- society_memberships → collapse to "does this user have ANY row with
-- verified status". If not, they've lapsed and appear in the result.
create function public.lapsed_group_members(p_chat_id uuid)
returns table (user_id uuid, name text)
language sql
security definer
set search_path = public
stable
as $$
  select cm.user_id, p.name
  from public.chat_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.chat_id = p_chat_id
    and public.is_chat_member(p_chat_id) -- caller must also be a member
    and not exists (
      select 1 from public.society_memberships sm
      where sm.user_id = cm.user_id
        and sm.verification_status = 'verified'
    );
$$;

grant execute on function public.lapsed_group_members to authenticated;
