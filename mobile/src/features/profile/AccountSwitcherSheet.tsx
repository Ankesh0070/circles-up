import { useCallback, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { User, Briefcase, Check } from 'lucide-react-native';
import Avatar from '../../shared/components/Avatar';
import { supabase } from '../../shared/api/supabase';
import type { RootStackParamList } from '../../navigation/types';

type BusinessPage = { id: string; name: string; avatar_url: string | null };

// Phase 91 — multi-account switching (personal + business). This app has
// no real multi-session/multi-identity model (one auth.users row per
// person, matching architecture.md's single-account design) — "switching"
// here honestly means switching WHICH surface you're viewing/managing:
// Personal takes you to your own Profile tab, a business page takes you to
// that page's PageDetailScreen (Group I) to manage it. It's real
// navigation to real screens, not a fabricated re-authentication.
export default function AccountSwitcherSheet() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [personalName, setPersonalName] = useState<string | null>(null);
  const [pages, setPages] = useState<BusinessPage[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const [{ data: profile }, { data: pageRows }] = await Promise.all([
          supabase.from('profiles').select('name').eq('id', user.id).single(),
          supabase.from('pages').select('id, name, avatar_url').eq('owner_id', user.id).eq('page_type', 'business'),
        ]);
        if (cancelled) return;
        setPersonalName(profile?.name ?? 'You');
        setPages(pageRows ?? []);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (pages === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2196D6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white pt-2">
      <FlatList
        data={pages}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <Pressable onPress={() => navigation.goBack()} className="flex-row items-center gap-3 px-5 py-3.5 border-b border-gray-100">
            <View className="w-10 h-10 rounded-full bg-[#EBF6FD] items-center justify-center">
              <User size={18} color="#2196D6" />
            </View>
            <Text className="flex-1 text-[14px] font-semibold text-[#1F1B17]">{personalName} (Personal)</Text>
            <Check size={16} color="#10B981" />
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.replace('PageDetail', { pageId: item.id })}
            className="flex-row items-center gap-3 px-5 py-3.5 border-b border-gray-100"
          >
            <View className="w-10 h-10 rounded-full bg-[#FEF3C7] items-center justify-center">
              <Briefcase size={18} color="#F59E0B" />
            </View>
            <Text className="flex-1 text-[14px] font-semibold text-[#1F1B17]">{item.name} (Business)</Text>
          </Pressable>
        )}
        ListFooterComponent={
          pages.length === 0 ? (
            <Text className="text-center text-gray-400 text-[13px] mt-6 px-5">
              No business pages yet — create one from My Pages to switch into it here.
            </Text>
          ) : null
        }
      />
    </View>
  );
}
