import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

const MAX_DIMENSION = 1600; // px — matches typical feed-image sizing, well under Storage's 20MiB post-media limit
const JPEG_QUALITY = 0.8;

// Phase 33: client-side compression before upload. Server-side validation
// (max size, allowed MIME types) is already enforced by the `post-media`
// Storage bucket config (supabase/config.toml) — this is the client half of
// that pipeline, not a substitute for it.
export async function uploadPostMedia(localUri: string, userId: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  const response = await fetch(manipulated.uri);
  const blob = await response.blob();
  const path = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage.from('post-media').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;

  return supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
}
