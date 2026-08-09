import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

const MAX_DIMENSION = 1600; // px — matches typical feed-image sizing, well under Storage's 20MiB post-media limit
const JPEG_QUALITY = 0.8;

// Phase 33: client-side compression before upload. Server-side validation
// (max size, allowed MIME types) is already enforced by the `post-media`
// Storage bucket config (supabase/config.toml) — this is the client half of
// that pipeline, not a substitute for it.
export async function uploadPostMedia(localUri: string, userId: string): Promise<string> {
  return uploadToPostMediaBucket(localUri, `${userId}/${Date.now()}.jpg`);
}

// Bazaar listings (Group H) reuse the same public `post-media` bucket
// rather than provisioning a dedicated one — no config.toml/RLS reason to
// keep listing photos separate from post photos, both are public,
// same-shape images.
export async function uploadBazaarListingMedia(localUri: string, userId: string): Promise<string> {
  return uploadToPostMediaBucket(localUri, `bazaar/${userId}/${Date.now()}.jpg`);
}

// Phase 92 (Group J) — Profile Menu Sheet's "Story" option is this app's
// first real story-creation path (Phase 24/25 only ever built story
// *viewing*; StoriesBar's "Your Story" ring had no onPress until now).
export async function uploadStoryMedia(localUri: string, userId: string): Promise<string> {
  return uploadToPostMediaBucket(localUri, `stories/${userId}/${Date.now()}.jpg`);
}

async function uploadToPostMediaBucket(localUri: string, path: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  const response = await fetch(manipulated.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from('post-media').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;

  return supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
}
