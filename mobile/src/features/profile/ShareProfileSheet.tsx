import { useCallback, useState } from 'react';
import { View, Text, Pressable, Share, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Check, Share2 } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import { supabase } from '../../shared/api/supabase';

// Phase 90 — QR-style profile share, copy link, social share row. No real
// deep-link server exists in this build, so the "link" is an honest
// app-scheme URI (circleup://profile/<id>) rather than a fake https URL
// that would 404 for anyone who opened it — same honesty discipline as
// Group I's mock payment gateway labeling.
export default function ShareProfileSheet() {
  const [profile, setProfile] = useState<{ id: string; name: string; username: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('profiles').select('id, name, username').eq('id', user.id).single();
        if (data && !cancelled) setProfile(data);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#006290" />
      </View>
    );
  }

  const link = `circleup://profile/${profile.id}`;

  const copyLink = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareLink = async () => {
    try {
      await Share.share({ message: `Check out ${profile.name} on Circle Up: ${link}` });
    } catch {
      // Share.share() rejects outright on browsers without navigator.share
      // (most desktop browsers) rather than failing silently — fall back to
      // copying the link so the button still does something useful instead
      // of looking broken.
      await copyLink();
    }
  };

  return (
    <View className="flex-1 bg-white items-center px-6 pt-8">
      <View className="items-center bg-[#F6F9FF] rounded-3xl p-8 w-full">
        {/* QR-style placeholder: a real QR renderer needs a native/canvas
            dependency this build doesn't include yet — this grid honestly
            represents "a QR code goes here" rather than faking a scannable
            one, matching the "self-declared, not verified" honesty pattern
            used elsewhere for unimplemented externals. */}
        <View className="w-40 h-40 rounded-2xl bg-white items-center justify-center border border-outline-variant">
          <View className="flex-row flex-wrap w-28 h-28">
            {Array.from({ length: 64 }).map((_, i) => (
              <View
                key={i}
                style={{ width: '12.5%', height: '12.5%', backgroundColor: (i * 7 + profile.id.charCodeAt(0)) % 3 === 0 ? '#181C20' : 'transparent' }}
              />
            ))}
          </View>
        </View>
        <Avatar name={profile.name} size={56} />
        <Text className="text-[16px] font-bold text-[#181C20] mt-2">{profile.name}</Text>
        {profile.username && <Text className="text-[12px] text-ink-muted">@{profile.username}</Text>}
      </View>

      <View className="flex-row items-center gap-2 bg-[#EBEEF4] rounded-xl px-3.5 py-3 mt-6 w-full">
        <Text className="flex-1 text-[12px] text-ink-muted" numberOfLines={1}>
          {link}
        </Text>
        <Pressable onPress={copyLink} hitSlop={8}>
          {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} color="#181C20" />}
        </Pressable>
      </View>

      <Pressable onPress={shareLink} className="flex-row items-center justify-center gap-2 mt-4 py-3 rounded-2xl bg-[#006290] w-full">
        <Share2 size={16} color="#fff" />
        <Text className="text-[14px] font-bold text-white">Share profile</Text>
      </Pressable>
    </View>
  );
}
