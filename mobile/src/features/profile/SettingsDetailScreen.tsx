import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, TextInput, Switch } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShieldCheck } from 'lucide-react-native';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SettingsDetail'>;

// Phase 88 — one generic renderer for every named settings leaf section
// (Verification/Neighbourhood/Saved/Blocked/Close friends/Language/Terms/
// Privacy/Help/Delete), plus Notification preferences (the Settings
// screen's own "Notifications" group). Each section either shows real,
// live data (Verification/Saved/Blocked/Close friends/Notifications) or an
// honest static block (Language/Terms/Privacy/Help) — same "don't fake it"
// discipline as Group H's prohibited-items list and Phase 56's legal-review
// note, rather than shipping placeholder legal text as if it were final.
export default function SettingsDetailScreen({ route }: Props) {
  const { section } = route.params;
  switch (section) {
    case 'verification':
      return <VerificationSection />;
    case 'neighbourhood':
      return <NeighbourhoodSection />;
    case 'saved':
      return <SavedSection />;
    case 'blocked':
      return <BlockedSection />;
    case 'close_friends':
      return <CloseFriendsSection />;
    case 'notifications':
      return <NotificationPrefsSection />;
    case 'language':
      return <StaticSection title="Language" body="English is the only language supported right now. More languages are coming soon." />;
    case 'terms':
      return (
        <StaticSection
          title="Terms of service"
          body="This is a development build. A real Terms of Service, reviewed by counsel, has not been drafted yet — this screen exists so the navigation entry isn't a dead link, not as a substitute for one."
        />
      );
    case 'privacy':
      return (
        <StaticSection
          title="Privacy policy"
          body="This is a development build. A real Privacy Policy, reviewed by counsel, has not been drafted yet — see the retention-policy note from Circle Guard's legal review for the same honest gap applied to safety data specifically."
        />
      );
    case 'help':
      return (
        <StaticSection
          title="Help & support"
          body="No support ticketing system is wired up yet. For now, safety-critical issues should use Circle Guard's SOS flow; everything else has no live channel in this build."
        />
      );
    case 'delete':
      return <DeleteAccountSection />;
    default:
      return (
        <View className="flex-1 items-center justify-center bg-white px-8">
          <Text className="text-[13px] text-gray-400 text-center">Unknown section.</Text>
        </View>
      );
  }
}

function StaticSection({ title, body }: { title: string; body: string }) {
  return (
    <View className="flex-1 bg-white px-5 pt-5">
      <Text className="text-[16px] font-bold text-[#1F1B17] mb-2">{title}</Text>
      <Text className="text-[13px] text-gray-600 leading-5">{body}</Text>
    </View>
  );
}

function VerificationSection() {
  const [rows, setRows] = useState<
    { neighbourhood_id: string; society: string; tower: string | null; flat: string; verification_status: string; verified_at: string | null; neighbourhood: { name: string } | null }[] | null
  >(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('society_memberships')
          .select('neighbourhood_id, society, tower, flat, verification_status, verified_at, neighbourhood:neighbourhoods(name)')
          .eq('user_id', user.id);
        if (!cancelled) {
          setRows(
            (data ?? []).map((r) => ({ ...r, neighbourhood: Array.isArray(r.neighbourhood) ? r.neighbourhood[0] : r.neighbourhood }))
          );
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (!rows) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-white"
      data={rows}
      keyExtractor={(r) => r.neighbourhood_id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={({ item }) => (
        <View className="flex-row items-center gap-3 bg-[#FAFAFA] rounded-xl p-3.5">
          <ShieldCheck size={18} color={item.verification_status === 'verified' ? '#10B981' : '#F59E0B'} />
          <View className="flex-1">
            <Text className="text-[13px] font-semibold text-[#1F1B17]">{item.neighbourhood?.name ?? 'Unknown'}</Text>
            <Text className="text-[11px] text-gray-500">
              {item.society}
              {item.tower ? ` · ${item.tower}` : ''} · {item.flat}
            </Text>
          </View>
          <Text
            className="text-[10px] font-bold uppercase"
            style={{ color: item.verification_status === 'verified' ? '#10B981' : item.verification_status === 'rejected' ? '#DC2626' : '#F59E0B' }}
          >
            {item.verification_status}
          </Text>
        </View>
      )}
      ListEmptyComponent={<Text className="text-center text-gray-400 text-[13px] mt-8">No membership submissions yet.</Text>}
    />
  );
}

function NeighbourhoodSection() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View className="flex-1 bg-white px-5 pt-5">
      <Text className="text-[13px] text-gray-600 leading-5 mb-4">
        Switch which verified neighbourhood your posts, alerts, and events go to, or verify a new one.
      </Text>
      <Pressable onPress={() => navigation.navigate('NeighbourhoodSheet')} className="py-3 rounded-xl bg-[#2196D6] items-center">
        <Text className="text-[13px] font-bold text-white">Manage neighbourhoods</Text>
      </Pressable>
    </View>
  );
}

function SavedSection() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [rows, setRows] = useState<{ post_id: string; caption: string; category: string }[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from('saved_posts')
      .select('post_id, post:posts(caption, category)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRows(
      (data ?? []).map((r) => {
        const post = Array.isArray(r.post) ? r.post[0] : r.post;
        return { post_id: r.post_id, caption: post?.caption ?? '', category: post?.category ?? 'general' };
      })
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const unsave = async (postId: string) => {
    if (!userId) return;
    await supabase.from('saved_posts').delete().eq('user_id', userId).eq('post_id', postId);
    load();
  };

  if (!rows) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-white"
      data={rows}
      keyExtractor={(r) => r.post_id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate('PostDetail', { postId: item.post_id })}
          className="flex-row items-center justify-between bg-[#FAFAFA] rounded-xl p-3.5"
        >
          <Text className="flex-1 text-[13px] text-[#1F1B17] mr-3" numberOfLines={2}>
            {item.caption}
          </Text>
          <Pressable onPress={() => unsave(item.post_id)} hitSlop={8}>
            <Text className="text-[11px] font-semibold text-red-500">Unsave</Text>
          </Pressable>
        </Pressable>
      )}
      ListEmptyComponent={<Text className="text-center text-gray-400 text-[13px] mt-8">Nothing saved yet.</Text>}
    />
  );
}

function BlockedSection() {
  const [rows, setRows] = useState<{ blocked_id: string; name: string | null }[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from('dm_blocks')
      .select('blocked_id, blocked:profiles!dm_blocks_blocked_id_fkey(name)')
      .eq('blocker_id', user.id);
    setRows(
      (data ?? []).map((r) => {
        const p = Array.isArray(r.blocked) ? r.blocked[0] : r.blocked;
        return { blocked_id: r.blocked_id, name: p?.name ?? null };
      })
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const unblock = async (blockedId: string) => {
    if (!userId) return;
    await supabase.from('dm_blocks').delete().eq('blocker_id', userId).eq('blocked_id', blockedId);
    load();
  };

  if (!rows) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-white"
      data={rows}
      keyExtractor={(r) => r.blocked_id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={({ item }) => (
        <View className="flex-row items-center justify-between bg-[#FAFAFA] rounded-xl p-3.5">
          <Text className="text-[13px] font-semibold text-[#1F1B17]">{item.name ?? 'Neighbour'}</Text>
          <Pressable onPress={() => unblock(item.blocked_id)}>
            <Text className="text-[12px] font-semibold text-[#2196D6]">Unblock</Text>
          </Pressable>
        </View>
      )}
      ListEmptyComponent={<Text className="text-center text-gray-400 text-[13px] mt-8">No one blocked.</Text>}
    />
  );
}

function CloseFriendsSection() {
  const [rows, setRows] = useState<{ connected_user_id: string; name: string | null }[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from('circle_connections')
      .select('connected_user_id, connected:profiles!circle_connections_connected_user_id_fkey(name)')
      .eq('user_id', user.id);
    setRows(
      (data ?? []).map((r) => {
        const p = Array.isArray(r.connected) ? r.connected[0] : r.connected;
        return { connected_user_id: r.connected_user_id, name: p?.name ?? null };
      })
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const remove = async (connectedUserId: string) => {
    if (!userId) return;
    await supabase.from('circle_connections').delete().eq('user_id', userId).eq('connected_user_id', connectedUserId);
    load();
  };

  if (!rows) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-white"
      data={rows}
      keyExtractor={(r) => r.connected_user_id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={({ item }) => (
        <View className="flex-row items-center justify-between bg-[#FAFAFA] rounded-xl p-3.5">
          <Text className="text-[13px] font-semibold text-[#1F1B17]">{item.name ?? 'Neighbour'}</Text>
          <Pressable onPress={() => remove(item.connected_user_id)}>
            <Text className="text-[12px] font-semibold text-red-500">Remove</Text>
          </Pressable>
        </View>
      )}
      ListEmptyComponent={<Text className="text-center text-gray-400 text-[13px] mt-8">No Circle connections yet.</Text>}
    />
  );
}

function NotificationPrefsSection() {
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<{ safety: boolean; social: boolean; community: boolean } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        const { data } = await supabase.from('profiles').select('notification_prefs').eq('id', user.id).single();
        if (!cancelled) setPrefs(data?.notification_prefs ?? { safety: true, social: true, community: true });
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const toggle = async (key: 'safety' | 'social' | 'community') => {
    if (!prefs || !userId) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await supabase.from('profiles').update({ notification_prefs: next }).eq('id', userId);
  };

  if (!prefs) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  const rows: { key: 'safety' | 'social' | 'community'; label: string; desc: string }[] = [
    { key: 'safety', label: 'Safety alerts', desc: 'SOS, safety alerts, event cancellations' },
    { key: 'social', label: 'Social', desc: 'Circle connections, reactions, comments' },
    { key: 'community', label: 'Community', desc: 'Points awarded, achievements' },
  ];

  return (
    <View className="flex-1 bg-white px-5 pt-5">
      {rows.map((r) => (
        <View key={r.key} className="flex-row items-center justify-between py-3 border-b border-gray-100">
          <View className="flex-1 mr-3">
            <Text className="text-[14px] font-semibold text-[#1F1B17]">{r.label}</Text>
            <Text className="text-[11px] text-gray-400 mt-0.5">{r.desc}</Text>
          </View>
          <Switch value={prefs[r.key]} onValueChange={() => toggle(r.key)} trackColor={{ true: '#2196D6' }} />
        </View>
      ))}
    </View>
  );
}

function DeleteAccountSection() {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    await supabase.rpc('request_account_deletion');
    // Signing out flips RootNavigator's session listener back to the Auth
    // stack automatically — no manual navigation needed from a screen this
    // deep in the modal stack.
    await supabase.auth.signOut();
  };

  return (
    <View className="flex-1 bg-white px-5 pt-5">
      <Text className="text-[15px] font-bold text-[#1F1B17] mb-2">Delete your account</Text>
      <Text className="text-[13px] text-gray-600 leading-5 mb-4">
        This anonymizes your profile (name, bio, avatar, vibes, contact info) immediately and signs you out. Your posts and other
        activity stay attributed to "Deleted user" rather than being purged instantly — this is a self-service request, not a
        same-second data purge.
      </Text>
      <Text className="text-[12px] text-gray-500 mb-1.5">Type DELETE to confirm</Text>
      <TextInput
        value={confirmText}
        onChangeText={setConfirmText}
        autoCapitalize="characters"
        placeholder="DELETE"
        className="bg-[#F3F4F6] rounded-xl px-3.5 py-2.5 text-[14px] text-[#1F1B17] mb-4"
      />
      <Pressable
        onPress={confirmDelete}
        disabled={confirmText !== 'DELETE' || deleting}
        className="py-3 rounded-xl items-center"
        style={{ backgroundColor: confirmText === 'DELETE' ? '#DC2626' : '#FCA5A5' }}
      >
        {deleting ? <ActivityIndicator color="#fff" /> : <Text className="text-[13px] font-bold text-white">Delete my account</Text>}
      </Pressable>
    </View>
  );
}
