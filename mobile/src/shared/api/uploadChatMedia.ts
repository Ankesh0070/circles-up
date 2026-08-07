import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

// chat-media bucket is PRIVATE (see supabase/config.toml) — unlike
// post-media, chat images are only visible to chat members. We store the
// object path and hand out short-lived signed URLs at render time
// (Phase 37 — see ChatDetailScreen's `signUrl` cache).
async function uploadToChatMedia(localUri: string, userId: string, extension: string, contentType: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const path = `${userId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('chat-media').upload(path, blob, { contentType });
  if (error) throw error;
  return path;
}

export async function uploadChatImage(localUri: string, userId: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
  return uploadToChatMedia(manipulated.uri, userId, 'jpg', 'image/jpeg');
}

export async function uploadChatVoiceNote(localUri: string, userId: string): Promise<string> {
  // Voice notes come out of expo-audio as .m4a on iOS and .m4a/aac on
  // Android — both work under this content type.
  return uploadToChatMedia(localUri, userId, 'm4a', 'audio/m4a');
}

const SIGN_URL_TTL_SECONDS = 60 * 60; // 1h — well within typical session length

export async function getChatMediaSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('chat-media').createSignedUrl(path, SIGN_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}
