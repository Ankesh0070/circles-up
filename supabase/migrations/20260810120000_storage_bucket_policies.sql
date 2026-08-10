-- Storage RLS for the media buckets (avatars, post-media, chat-media).
--
-- The buckets themselves come from supabase/config.toml, which the local CLI
-- applies but which has no effect on a hosted project — and `storage.objects`
-- ships with RLS on and no policies, so every upload failed with "new row
-- violates row-level security policy". That silently broke profile photos,
-- post/listing/story images, and chat photos + voice notes: the pickers
-- opened, the compression ran, and the upload was rejected at the last step.
--
-- Write access is owner-scoped in all three buckets. The awkward part is that
-- the paths don't share one shape, so each bucket needs its own predicate
-- rather than a single reusable one:
--   avatars     "<uid>-<ts>.jpg"            uid is a filename prefix, not a folder
--   post-media  "<uid>/<ts>.jpg", and
--               "bazaar/<uid>/…", "stories/<uid>/…"   uid sits one level deeper
--   chat-media  "<uid>/<ts>.<ext>"
--
-- Read access mirrors the buckets' own public/private split (see the reasoning
-- already recorded in config.toml): avatars and post-media are public, so
-- their reads are open. chat-media is private and served through short-lived
-- signed URLs, which means the client needs SELECT to mint one — so this
-- grants it to authenticated users generally. That is deliberately the same
-- path-obscurity tradeoff config.toml already documents for post-media, not
-- true per-chat access control: a signed-in user who somehow learned an exact
-- object path could sign it. Tightening this to actual chat membership needs
-- the chat id in the object path (it isn't there today) — worth doing before a
-- real launch, alongside the post-media revisit that comment already flags.

-- ---------------------------------------------------------------- avatars --
create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name like auth.uid()::text || '-%');

create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name like auth.uid()::text || '-%');

create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and name like auth.uid()::text || '-%');

-- ------------------------------------------------------------- post-media --
-- Accepts both the flat "<uid>/…" layout and the "bazaar/<uid>/…" and
-- "stories/<uid>/…" layouts, so listing and story uploads aren't rejected.
create policy "post_media_select_public"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "post_media_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] in ('bazaar', 'stories')
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "post_media_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] in ('bazaar', 'stories')
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

-- ------------------------------------------------------------- chat-media --
create policy "chat_media_select_authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'chat-media');

create policy "chat_media_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "chat_media_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- verification-photos intentionally gets no client policy: the selfie is sent
-- to the verification service as base64 and written server-side under the
-- service role, so no signed-in user should be able to read or write that
-- bucket directly (edgecase.md §1, §3.13).
